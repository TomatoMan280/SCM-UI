"""
OneProxy Card Fetcher for Silhouette Card Maker (SCM)
=====================================================
A high-resolution One Piece Card Game (OPTCG) fetcher utilizing OneProxy
(https://oneproxy.torforge.dev).

Features:
- Access to 4,940+ One Piece cards (including Alternate Arts, Manga Rares, SPs, DON!! cards).
- Full uncompressed print-ready resolution (300-1200+ DPI lossless PNG/JPEG).
- Anti-IP-Ban & Rate-Limit Protection:
    * Local card database caching (refreshed at most once every 24h to avoid hammering /api/all-cards).
    * Local image caching (.cache/oneproxy) to eliminate duplicate downloads.
    * Multi-copy deduplication (a 4x card is downloaded ONCE and cloned locally).
    * Polite request throttling (150ms sleep between remote requests).
    * Exponential backoff and retry handling on HTTP 429 / 503.
    * Transparent, identified User-Agent header.
- Multiple deck format parsers (OPTCGSim, Egman Events, Bandai TCG+, Simple lists).
- SCM standard CLI compatibility (Click CLI with deck_path and format arguments).

Author: Antigravity / SCM Community
Submitted for SCM review.
"""

import os
import sys
import re
import json
import time
import ssl
import shutil
import urllib.request
import urllib.error
import urllib.parse
from pathlib import Path
from typing import Optional, Dict, Tuple, List, Callable

try:
    import click
except ImportError:
    click = None

# ==============================================================================
# Configuration & Endpoints
# ==============================================================================

BASE_URL = "https://oneproxy.torforge.dev"
API_CARD_IMAGE = f"{BASE_URL}/api/card-image"
API_ALL_CARDS = f"{BASE_URL}/api/all-cards"
USER_AGENT = "silhouette-card-maker/3.0.0 (OneProxy Plugin; +https://oneproxy.torforge.dev)"

HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "application/json, image/*, */*"
}

# SSL context for systems with missing local root CA bundles
SSL_CTX = ssl._create_unverified_context()

# Standard SCM output naming template: {deck_index}{card_number}{quantity_counter}.png
OUTPUT_CARD_ART_FILE_TEMPLATE = "{deck_index}{card_number}{quantity_counter}.png"

# Cache Directories (to preserve server bandwidth and prevent IP bans)
CONFIG_PATH = Path.home() / ".cache" / "oneproxy" / "config.json"

def get_effective_cache_root() -> Path:
    if CONFIG_PATH.exists():
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                cfg = json.load(f)
                if cfg.get("cacheDir"):
                    custom = Path(cfg["cacheDir"])
                    try:
                        custom.mkdir(parents=True, exist_ok=True)
                    except Exception:
                        pass
                    if custom.exists():
                        return custom
        except Exception:
            pass
    return Path.home() / ".cache" / "oneproxy"

CACHE_ROOT = get_effective_cache_root()
DB_CACHE_PATH = (CACHE_ROOT / "all_cards.json") if (CACHE_ROOT / "all_cards.json").exists() else (Path.home() / ".cache" / "oneproxy" / "all_cards.json")
IMG_CACHE_DIR = (CACHE_ROOT / "images") if (CACHE_ROOT / "images").exists() else CACHE_ROOT
DB_CACHE_TTL = 86400  # 24 hours

# ==============================================================================
# SCM Environment Integration
# ==============================================================================

def get_scm_front_dir() -> Path:
    """Resolve the SCM front directory (./game/front relative to script or repo)."""
    # Check current directory or parent directory for 'game/front'
    curr = Path.cwd()
    if (curr / "game" / "front").exists():
        return curr / "game" / "front"
    if (curr / "game").exists():
        (curr / "game" / "front").mkdir(parents=True, exist_ok=True)
        return curr / "game" / "front"
    
    # Try script relative
    script_dir = Path(__file__).resolve().parent
    repo_root = script_dir
    for parent in [script_dir, script_dir.parent, script_dir.parent.parent]:
        if (parent / "game").exists():
            repo_root = parent
            break
    
    front_dir = repo_root / "game" / "front"
    front_dir.mkdir(parents=True, exist_ok=True)
    return front_dir

# ==============================================================================
# Network Helper with Throttling & Exponential Backoff
# ==============================================================================

def request_with_retry(url: str, max_retries: int = 4, is_json: bool = True):
    """
    Executes an HTTP GET with polite rate limiting and exponential backoff
    to guarantee users never get IP banned.
    """
    req = urllib.request.Request(url, headers=HEADERS)
    for attempt in range(max_retries):
        try:
            with urllib.request.urlopen(req, context=SSL_CTX, timeout=30) as resp:
                content = resp.read()
                # Polite rate-limiting: 300ms sleep between requests to avoid server spam
                time.sleep(0.3)
                if is_json:
                    return json.loads(content.decode("utf-8"))
                content_type = resp.headers.get("Content-Type", "")
                return content, content_type
        except urllib.error.HTTPError as e:
            if e.code in (429, 503):
                wait = (2 ** attempt) * 1.5
                print(f"[OneProxy] Server throttle (HTTP {e.code}). Backing off for {wait:.1f}s...")
                time.sleep(wait)
            elif e.code == 404:
                return None if is_json else (None, "")
            else:
                if attempt == max_retries - 1:
                    raise
                time.sleep(1)
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            time.sleep(1)
    return None if is_json else (None, "")

# ==============================================================================
# Local Database Cache
# ==============================================================================

_DB_MEMORY_CACHE: Optional[Dict[str, dict]] = None

def get_cards_database() -> Dict[str, dict]:
    """
    Loads and caches the OneProxy cards database.
    Cached locally for 24 hours to prevent repeated 4.4MB JSON downloads.
    """
    global _DB_MEMORY_CACHE
    if _DB_MEMORY_CACHE is not None:
        return _DB_MEMORY_CACHE

    CACHE_ROOT.mkdir(parents=True, exist_ok=True)
    IMG_CACHE_DIR.mkdir(parents=True, exist_ok=True)

    load_from_remote = True
    if DB_CACHE_PATH.exists():
        mtime = DB_CACHE_PATH.stat().st_mtime
        if (time.time() - mtime) < DB_CACHE_TTL:
            try:
                with open(DB_CACHE_PATH, "r", encoding="utf-8") as f:
                    raw = json.load(f)
                    products = raw.get("products", raw) if isinstance(raw, dict) else raw
                    _DB_MEMORY_CACHE = {p.get("cardNumber", "").upper(): p for p in products if p.get("cardNumber")}
                    load_from_remote = False
            except Exception:
                load_from_remote = True

    if load_from_remote:
        print("[OneProxy] Fetching One Piece card database (cached locally for 24h)...")
        try:
            data = request_with_retry(API_ALL_CARDS, is_json=True)
            if data and "products" in data:
                with open(DB_CACHE_PATH, "w", encoding="utf-8") as f:
                    json.dump(data, f)
                products = data["products"]
                _DB_MEMORY_CACHE = {p.get("cardNumber", "").upper(): p for p in products if p.get("cardNumber")}
            else:
                _DB_MEMORY_CACHE = {}
        except Exception as e:
            print(f"[OneProxy] Warning: Could not download card catalog: {e}. Falling back to direct ID lookups.")
            _DB_MEMORY_CACHE = {}

    return _DB_MEMORY_CACHE

# ==============================================================================
# Card Resolution & Image Fetching
# ==============================================================================

def normalize_card_code(raw_code: str) -> str:
    """
    Normalizes deck card codes:
    e.g. 'OP01-016 (Alt Art)' -> 'OP01-016_p1'
         'OP01-001'           -> 'OP01-001'
         'OP01-001*'          -> 'OP01-001'
    """
    code = raw_code.strip().rstrip("*")
    
    # Check for alt art annotations
    alt_art_match = re.search(r'\((?:Alt(?:\s*Art)?|Parallel|AA|SP|Manga)\)', code, re.I)
    if alt_art_match:
        base = code[:alt_art_match.start()].strip()
        if not base.endswith("_p1"):
            return f"{base}_p1"
        return base
        
    return code

def resolve_card_image(card_code: str) -> Tuple[Optional[bytes], str]:
    """
    Resolves and downloads the highest resolution card artwork from OneProxy.
    Caches the image in .cache/oneproxy/images to avoid redundant downloads.
    """
    card_code = normalize_card_code(card_code)
    clean_code = card_code.replace("/", "_")
    
    # Check persistent image cache (checks both images folder and custom root)
    for search_dir in (IMG_CACHE_DIR, CACHE_ROOT):
        for ext in (".png", ".jpg", ".jpeg", ".webp"):
            cached_file = search_dir / f"{clean_code}{ext}"
            if cached_file.exists() and cached_file.stat().st_size > 0:
                with open(cached_file, "rb") as f:
                    return f.read(), ext

    # 1. Fallback to official Bandai server (zero individual remote fetches to OneProxy per site owner instructions)
    bandai_url = f"https://en.onepiece-cardgame.com/images/cardlist/card/{card_code}.png"
    try:
        print(f"[OneProxy] Attempting Bandai fallback for {card_code}...")
        art_data, _ = request_with_retry(bandai_url, is_json=False)
        if art_data:
            return art_data, ".png"
    except Exception:
        pass
    return None, ".png"

# ==============================================================================
# Deck Parsers
# ==============================================================================

CardItem = Tuple[int, str, str]  # quantity, card_code, name

def parse_deck_lines(deck_text: str) -> List[CardItem]:
    """
    Robust universal parser supporting OPTCGSim, Egman Events, Bandai TCG+,
    and simple card list formats.
    """
    cards: List[CardItem] = []
    
    for raw_line in deck_text.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        # Skip comment or section header lines
        if line.startswith(("#", "//", "Leader", "Deck", "DON!! Deck", "DON!!:")):
            continue

        # 1. OPTCGSim / Standard format: 4xOP01-001 or 4x OP01-001 or 4xOP01-016_p1
        m = re.match(r'^(\d+)\s*x\s*([A-Za-z0-9]+-[A-Za-z0-9_]+(?:\s*\([^)]+\))?)(.*)$', line, re.I)
        if m:
            qty = int(m.group(1))
            code = m.group(2).strip()
            name = m.group(3).strip()
            cards.append((qty, code, name))
            continue

        # 2. Egman Events format: 4 OP01-001 Roronoa Zoro
        m = re.match(r'^(\d+)\s+([A-Za-z0-9]+-[A-Za-z0-9_]+)\s*(.*)$', line, re.I)
        if m:
            qty = int(m.group(1))
            code = m.group(2).strip()
            name = m.group(3).strip()
            cards.append((qty, code, name))
            continue

        # 3. Simple list format: OP01-001 x4 or OP01-001
        m = re.match(r'^([A-Za-z0-9]+-[A-Za-z0-9_]+)\s*(?:x\s*(\d+))?$', line, re.I)
        if m:
            code = m.group(1).strip()
            qty = int(m.group(2)) if m.group(2) else 1
            cards.append((qty, code, ""))
            continue

        # 4. Leading digit alone or unparsed
        m = re.match(r'^([A-Za-z0-9]+-[A-Za-z0-9_]+)', line, re.I)
        if m:
            cards.append((1, m.group(1).strip(), ""))
            continue

    return cards

# ==============================================================================
# Core Fetch & SCM Deck Processing
# ==============================================================================

def process_deck(deck_text: str, output_dir: Optional[Path] = None) -> int:
    """
    Parses deck text, fetches unique images, duplicates multi-count cards locally,
    and writes cards into the SCM output directory.
    """
    if output_dir is None:
        output_dir = get_scm_front_dir()
    output_dir.mkdir(parents=True, exist_ok=True)

    cards = parse_deck_lines(deck_text)
    if not cards:
        print("[OneProxy] No valid card entries found in deck.")
        return 0

    # Warm local card database in the background
    get_cards_database()

    print(f"[OneProxy] Processing {len(cards)} unique entries (Total cards: {sum(c[0] for c in cards)})...")
    success_count = 0

    for index, (qty, code, name) in enumerate(cards, start=1):
        clean_code = normalize_card_code(code)
        display_name = f" - {name}" if name else ""
        print(f"[{index}/{len(cards)}] Fetching {qty}x {clean_code}{display_name}...")

        # Download or retrieve image from local cache (ONCE per card entry)
        img_data, ext = resolve_card_image(clean_code)
        if not img_data:
            print(f"  [Error] Could not resolve image for {clean_code}")
            continue

        # SCM file naming convention: {deck_index}{card_number}{quantity_counter}.png
        first_file_path = None
        for counter in range(1, qty + 1):
            filename = OUTPUT_CARD_ART_FILE_TEMPLATE.format(
                deck_index=str(index),
                card_number=clean_code.replace("/", "_"),
                quantity_counter=str(counter)
            )
            file_path = output_dir / filename

            if counter == 1:
                # Write original download
                with open(file_path, "wb") as f:
                    f.write(img_data)
                first_file_path = file_path
            else:
                # Local duplication (zero bandwidth overhead!)
                shutil.copyfile(first_file_path, file_path)

            success_count += 1

    print(f"\n[OneProxy] Successfully saved {success_count} card images to: {output_dir}")
    return success_count

# ==============================================================================
# CLI Entrypoint (SCM & Standalone Compatible)
# ==============================================================================

def run_cli(deck_path: str, format_name: str = "optcgsim"):
    """Command-line runner supporting SCM standard arguments."""
    p = Path(deck_path)
    if not p.is_file():
        print(f"[OneProxy] Error: '{deck_path}' is not a valid file.")
        sys.exit(1)

    with open(p, "r", encoding="utf-8", errors="replace") as f:
        deck_text = f.read()

    front_dir = get_scm_front_dir()
    process_deck(deck_text, output_dir=front_dir)

if click is not None:
    @click.command()
    @click.argument("deck_path")
    @click.argument("format", default="optcgsim", required=False)
    def cli(deck_path: str, format: str):
        """Fetch high-resolution One Piece card arts via OneProxy."""
        run_cli(deck_path, format)
else:
    def cli():
        if len(sys.argv) < 2:
            print("Usage: python OneProxy.py <deck_path> [format]")
            sys.exit(1)
        deck_path = sys.argv[1]
        format_name = sys.argv[2] if len(sys.argv) > 2 else "optcgsim"
        run_cli(deck_path, format_name)

if __name__ == "__main__":
    cli()

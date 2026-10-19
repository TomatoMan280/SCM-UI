import os
import shutil
import urllib.parse
from os import path
from pathlib import Path
from time import sleep
from requests import Response, Session

CARD_ART_URL_TEMPLATE = 'https://en.onepiece-cardgame.com/images/cardlist/card/{card_number}.png'
OUTPUT_CARD_ART_FILE_TEMPLATE = '{deck_index}{card_number}{quantity_counter}.png'

session = Session()

import json

CONFIG_PATH = Path.home() / ".cache" / "oneproxy" / "config.json"

def get_effective_cache_dir() -> Path:
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
                    if (custom / "images").exists():
                        return custom / "images"
                    return custom
        except Exception:
            pass
    return Path.home() / ".cache" / "oneproxy" / "images"

# Persistent cache directory to protect user IP and server bandwidth
CACHE_DIR = get_effective_cache_dir()
CACHE_DIR.mkdir(parents=True, exist_ok=True)

HEADERS = {
    'User-Agent': 'silhouette-card-maker/3.0.0 (OneProxy Plugin; +https://oneproxy.torforge.dev)',
    'Accept': 'application/json, image/*, */*'
}

def request_bandai(query: str) -> Response:
    """Fallback fetcher for official Bandai card art."""
    r = session.get(query, headers={'user-agent': 'silhouette-card-maker/0.1', 'accept': '*/*'}, timeout=30)
    r.raise_for_status()
    sleep(0.075)
    return r

def resolve_card_art(card_number: str) -> bytes:
    """
    Resolves card art prioritizing local disk cache (zero network calls).
    If uncached, fetches from OneProxy with polite rate limiting and caches locally.
    Falls back to official Bandai if not found.
    """
    card_clean = card_number.strip().replace('/', '_')

    # 1. Local disk cache (Zero network traffic)
    search_dirs = [CACHE_DIR]
    if CACHE_DIR.name == "images":
        search_dirs.append(CACHE_DIR.parent)
    elif (CACHE_DIR / "images").exists():
        search_dirs.append(CACHE_DIR / "images")

    for sdir in search_dirs:
        for ext in ('.png', '.jpg', '.jpeg', '.webp'):
            cached_file = sdir / f"{card_clean}{ext}"
            if cached_file.exists() and cached_file.stat().st_size > 0:
                with open(cached_file, 'rb') as f:
                    return f.read()

    # 2. Fallback to official Bandai (zero individual remote fetches to OneProxy per site owner instructions)
    try:
        bandai_url = CARD_ART_URL_TEMPLATE.format(card_number=card_number)
        resp = request_bandai(bandai_url)
        if resp.status_code == 200 and len(resp.content) > 0:
            return resp.content
    except Exception as e:
        print(f"[OnePiece] Bandai fetch failed for {card_number}: {e}")

    return None

def fetch_card(
    index: int,
    quantity: int,
    card_number: str,
    front_img_dir: str,
):
    card_art = resolve_card_art(card_number)

    if card_art is not None:
        # Write first image
        first_img_path = path.join(front_img_dir, OUTPUT_CARD_ART_FILE_TEMPLATE.format(deck_index=str(index), card_number=card_number, quantity_counter='1'))
        with open(first_img_path, 'wb') as f:
            f.write(card_art)

        # For additional copies, copy locally to avoid duplicate download & preserve bandwidth
        for counter in range(1, quantity):
            next_img_path = path.join(front_img_dir, OUTPUT_CARD_ART_FILE_TEMPLATE.format(deck_index=str(index), card_number=card_number, quantity_counter=str(counter+1)))
            shutil.copyfile(first_img_path, next_img_path)

def get_handle_card(
    front_img_dir: str,
):
    def configured_fetch_card(index: int, card_number: str, quantity: int = 1):
        fetch_card(
            index,
            quantity,
            card_number,
            front_img_dir
        )

    return configured_fetch_card


# Changelog

All notable changes to **SCMUI (Silhouette Card Maker UI)** are documented in this file.

---

## [3.0.12] - 2026-10-26

### 🧭 Streamlined Card Art Stepper & Queue Navigation
- **Unified Stepper Header**: Combined card stepper and queue indicators into a clean top-left bar `< #/total > Skip "Card Name" QTY: #` for intuitive browsing through queued decklist cards.
- **Enhanced Keyboard Navigation**: Rapidly navigate through cards using `ArrowLeft` / `ArrowRight` (or `A` / `D`), skip cards with `S` or `Enter`, and select printings directly via `1-9` number keys.
- **Dual-Art & Multi-Copy Allocation**: Added dedicated "All (Nx)" and "+1 copy" selection buttons for multi-quantity cards, displaying live copy completion (e.g. `QTY: 4 (1/4 done)`) and auto-advancing once all copies are allocated.

### 📐 Rock-Solid Zero-Shift Grid Layout Stability
- **Non-Intrusive Floating Search Indicator**: Converted the search status pill into an absolute overlay (`absolute top-2 left-1/2 -translate-x-1/2`) taking 0px in document flow, eliminating vertical jumping and layout bouncing while cycling through card arts.
- **Floating Toast Notification System**: Replaced in-toolbar status banners with an anchored floating toast (`fixed bottom-6`), preventing layout shifts across the toolbar and scroll view.
- **Fixed-Height Modal & Single-Line Header**: Locked the modal container to `h-[90vh]` and header to `min-h-[57px] flex-nowrap`, guaranteeing consistent geometry regardless of card title length.

### 🖼️ Enlarged Art Lightbox Gallery Cycling
- **Full Art Carousel**: Enlarging any card in the Card Art Selector modal now supports seamless cycling through all available prints and alternate arts using left/right arrows and arrow keys directly inside the lightbox preview.

### 🃏 Multi-Game Decklist Parser & Fast In-Memory Scryfall Cache
- **Robust Multi-TCG Decklist Parser**: Integrated comprehensive decklist parsing supporting MTG, Pokémon, One Piece, Yu-Gi-Oh!, Digimon, and Lorcana formats with automatic quantity extraction, collector numbers, set codes, and sideboards.
- **Sub-Millisecond Search Response**: Implemented in-memory TTL caching on `/api/scryfall/search` delivering instant 0ms responses on repeated card queries.

---

## [3.0.11] - 2026-10-22

### 🧹 Clean Asset Ingestion & DPI Metadata Stripping
- **DPI Suffix Stripping**: Ingested card assets automatically strip technical metadata suffixes (such as `(MPC 800 DPI)`, `(1200 DPI)`, etc.) so downloaded files and workspace entries maintain clean, canonical card names.
- **Smart Query Sanitization**: Scryfall and MPCFill query resolution now automatically normalize search strings containing parenthetical suffixes, guaranteeing reliable card art discovery even with technical tags in card titles.
- **Header & Modal Badge Sanitization**: Art picker target titles and card replacement headers display cleaned names without technical DPI clutter.

### 🎨 Asset Library & Plugin UI Streamlining
- **Back Patterns Cleanup**: Removed the redundant "Import Backs" header button and the dashed "Import MPC Back" placeholder button tile from the Plugins view mode for a consistent and clean gallery experience.
- **Context Menu Filtering**: Removed "Set Back" actions when right-clicking assets within the Back Patterns section to prevent accidental self-referential assignments.
- **Banner Cleanliness**: Removed redundant "Back Selector" button adjacent to the primary "Card Selector" in the Game Plugins banner.

---

## [3.0.10] - 2026-10-21

### ⚡ Universal Low-Resolution Thumbnails & 60 FPS Performance
- **Universal 280px Cached Thumbnails**: All card search plugins (Scryfall, MPCFill, Limitless, OneProxy, and custom plugins) now serve lightweight 280px thumbnails (~15–30 KB) down from multi-megabyte raw images.
- **Persistent Disk Caching (`/api/thumbnail`)**: Remote art from all card search plugins is cached to disk with immutable HTTP headers (`Cache-Control: public, max-age=604800, immutable`), reducing network payload by ~95% and eliminating lag during rapid scrolling.
- **Asynchronous Rendering**: Added `loading="lazy"` and `decoding="async"` across all asset and card search grids for instantaneous grid populating.

### 🔍 MPCFill Alternative & Custom Art Integration
- **Direct MPC Search**: Integrated MPCFill community art search directly inside the Card Selector modal alongside Scryfall and Limitless.
- **Filter Controls**: Search by card name with custom filtering by front/back, DPI resolution, face type, language, and sorting order.
- **One-Click Asset Assignment**: Ingest custom proxy card art directly to Front, Back, or Double-Sided project slots with automatic filename formatting.

### 🌐 Manual Language Selection in Card Selector
- **Multi-Language Search**: Added an intuitive language filter dropdown to the manual card search dialog.
- **Global Print Discovery**: Search printings in any official language (Japanese, German, French, Spanish, Italian, Simplified/Traditional Chinese, Korean, etc.) or across all languages simultaneously without English-only restrictions.

### 🖼️ High-Resolution Enlargement & Lossless Downloads
- **Pristine Lightbox Previews**: Enlarging card art in the search modal or asset library now strictly loads the uncompressed master image (up to 1600×1600+ on MPC and high-DPI Scryfall/local assets).
- **Lossless Ingestion**: Card downloads prioritize full-fidelity master images (`imageUrl` / lossless PNGs) into project and library folders.
- **Isolated Print & PDF Workflows**: Silhouette Card Maker and PDF sheet compilation continue to strictly use 300+ DPI master files from asset directories.

### 🛡️ Upscaling Guardrails
- **Master Image Protection**: Enforced an explicit directory and path exclusion filter in `/api/upscale` (`filter(p => !p.includes('thumbnails') && !p.includes('_thumb.') && !p.includes('temp_'))`).
- Upscayl AI models only ever process original master card images, completely ignoring thumbnail caches.

---

## [3.0.9] - 2026-10-20

### 🏴‍☠️ OneProxy Catalog & Asset Enhancements
- **Live Set Name Integration**: Integrated live `setName` metadata into the downloader grid and card selector set filter.
- **Visual Status Styling**: Styled completed download tiles with an emerald glow and removed the bulky Done badge to maximize room for card titles.
- **Default Format Alignment**: Ensured OneProxy remains the permanent default format and card provider whenever One Piece is selected.

### 🔄 Update Policy Refinements
- **Scrapped Mandatory Update Enforcement**: Prevented forced update blocking dialogs and self-updating loops by enforcing strict target version comparison in update policy guards.

---

## [3.0.8] - 2026-10-20

### 🐧 Full Linux Desktop Support
- **Cross-Platform Linux Builds**: Integrated automated Linux desktop packaging for both portable **`AppImage`** and Debian/Ubuntu **`.deb`** formats.
- **GitHub Actions Linux Pipeline**: Added `ubuntu-latest` to `.github/workflows/release.yml` matrix to automatically compile, verify, and publish Linux desktop binaries alongside Windows and macOS releases.
- **Universal Linux Folder Browser**: Implemented adaptive multi-desktop directory selection across GNOME (`zenity`), KDE Plasma (`kdialog`), and universal Python Tkinter fallback for linking local card asset folders.
- **Seamless AppImage Self-Updating**: Automated background update pipeline now detects `.AppImage` packages, applies executable permissions (`chmod +x`), and launches new releases smoothly in the background.
- **Robust Linux Python & Upscayl Discovery**: Enhanced automatic detection of Linux system Python (`python3`/`python`) and expanded Upscayl AI model search paths across `/usr/share`, `/opt`, Flatpak, and user local directories.

### 🏴‍☠️ OneProxy Downloader Refinements
- **Cleaned Progress UI**: Removed the redundant `"1 worker"` and `"· 1 Worker"` status labels from the download progress bar, status text, and initial connection prompts, keeping the interface minimal and focused.
- **Sequential Stability**: Preserved reliable sequential download queueing with automatic `.part` file resumption and bandwidth compliance.

### 📦 Version 3.0.8 Alignment
- Synchronized version **3.0.8** across `package.json`, `version-policy.json`, server API endpoints, client headers (`X-SCMUI-Version`), and UI display badges.

---

## [3.0.7] - 2026-10-20

### 📱 Pokémon Pocket & Complete `.webp` Integration
- **Full `.webp` Ecosystem**: Native end-to-end support for `.webp` images across asset scanning, disk caching, plugin fetch staging, PDF generation preflight, and high-res art downloads.
- **Pokémon Pocket Ingestion**: Direct integration with Pokémon Pocket via Limitless (`pocket.limitlesstcg.com`) with instant search and download of native high-res `.webp` card artwork.
- **Parallel Omni-Search**: Searching with "All Formats & Eras" automatically queries both physical Limitless TCG and Pokémon Pocket simultaneously, returning standard cards and Pocket cards side-by-side.
- **Visual `WEBP` Indicator Badges**: Cards formatted as `.webp` now feature a vibrant green `WEBP` badge in the Card Selector grid.
- **Pocket Era & Set Filters**: Dedicated **"Pokémon Pocket (WebP)"** format filter and set options for all Pocket releases (`A1`, `A1a`, `A2`, `A2a`, `B1`, `B2b`, `B3a`, `B4b`, `P-A`, `P-B`).
- **MIME & Magic Bytes Auto-Detection**: Downloader inspects response headers and binary magic bytes (`RIFF...WEBP`) to save `.webp` cards with proper extensions while cleaning up any stale duplicate formats.

### 🔍 Limitless Pokémon Card Selector & Vintage Fixes
- **Pre-HGSS Image Fix (Vintage Eras)**: Resolved broken card images for pre-2010 sets (Diamond & Pearl, Platinum, EX Series, WotC Base/Neo) by routing requests through the full `LIMITLESS_TO_POKEMONTCG_SET_ID` map to `pokemontcg.io` with fallback to Limitless DO CDN.
- **Comprehensive Metadata Filters**:
  - **Card Type**: Pokémon, Trainer, Supporter, Item, Tool, Stadium, Energy (Basic), Special Energy.
  - **Energy / Element**: Grass 🌿, Fire 🔥, Water 💧, Lightning ⚡, Psychic 👁️, Fighting 🥊, Darkness 🌑, Metal ⚙️, Colorless ⭐, Dragon 🐉.
  - **Stage / Mechanic**: Basic Pokémon, Stage 1, Stage 2, Pokémon ex, Pokémon V / VMAX / VSTAR, Radiant Pokémon, ACE SPEC.
  - **Rarity**: Common (C), Uncommon (U), Rare (R), Double Rare (RR), Ultra Rare (UR), Illustration Rare (IR), Special Illustration Rare (SIR), Secret / Hyper Rare (Gold).
  - **Format / Era**: Standard, Expanded, Scarlet & Violet, Sword & Shield, Sun & Moon, XY, Black & White, HeartGold & SoulSilver, Diamond & Pearl / Platinum, EX, and Classic / WotC.
  - **Sort By**: Set & Number, Card Name (A-Z), Card Type, Pokédex Number, Rarity.
  - **Set Filter**: Filter by any specific set across modern, Pocket, and classic eras.
- **Image Fallback Resilience**: Added `onError` event handling to automatically cascade through fallback URLs if a primary CDN thumbnail fails to load.

### 🏴‍☠️ OneProxy Plugin & Offline Asset Management
- **Dedicated OneProxy Integration**: Full native support for [OneProxy](https://oneproxy.torforge.dev) with direct upstream card catalog synchronization (`5,035+ cards`).
- **Strictly Local-Only Card Selection**: Respects OneProxy server bandwidth policy by ensuring **zero individual remote fetches**. The Card Selector indexes and displays only cards available locally on disk in the OneProxy assets library.
- **Streamlined Two-Choice Setup Workflow**:
  - **Option A (Download Assets)**: Downloads the full high-resolution asset pack with an integrated live progress bar in the Game Plugins area, custom directory path support (defaults to `C:\Users\<user>\OneProxy` or `~/OneProxy`), and dynamic remaining disk space validation.
  - **Option B (Link Existing Assets)**: Instant linking for users who already have the OneProxy assets folder saved locally.
- **Dynamic File Sizing & Calibration**: Replaced hardcoded sizes with dynamic disk calibration based on actual downloaded card dimensions and live catalog counts, automatically updating whenever OneProxy releases new cards.
- **Context-Aware Visibility**: OneProxy controls and card selector options appear strictly when OneProxy is selected as the active format.

### 📐 Precise Physical Print DPI & Performance Refinements
- **Game-Accurate Physical Print DPI**: Computed true image print resolution based on official card dimensions across each plugin (e.g. 63x88mm at 300 DPI baseline = 744x1039px; 744x1039px = 300 DPI, 1488x2078px = 600 DPI, 2976x4156px = 1200 DPI).
- **Lag Elimination in Card Selector**: Implemented cached thumbnail generation and removed CPU-heavy on-the-fly image header decodes from grid renders, providing a smooth 60fps scrolling experience.
- **De-Cluttered Grid Thumbnails**: Removed redundant DPI pill badges from card selector thumbnail overlays for a cleaner, modern look.

### ✂️ SCM-Extras: Physical Cutting Templates & Presets
- **Game-Accurate Physical Corner Specifications**:
  - `standard_mtg`: Official Magic: The Gathering corner radius (**2.5mm**).
  - `standard_sorcery`: Official Sorcery: Contested Realm corner radius (**4.5mm**).
  - Fully mapped across all paper formats (Letter, Tabloid, A4, A3, Arch B).
- **16 Pre-Aligned Silhouette Cutting Templates (`.studio3`)**:
  - Added all 16 cut files for Letter, Tabloid, A4, A3, and Arch B formats in both standard and borderless cut variations.
  - Added new backend template distribution endpoint (`/api/download-template/:filename`).
- **Subtle Visual Indicator & Dropdown Refinements**:
  - Added a clean `✦ SCM-EXTRAS` badge next to the `CARD SIZE` label when an extra is selected.
  - Removed verbose "SCM-EXTRAS ACTIVE" description boxes.
  - Preserved neutral dropdown border and background styling without tinting or color-shifting.
  - Cleaned all dimension text clutter from dropdown options (removed parenthetical numbers like `(Generic 63x88mm)`).
  - Removed the `✦ Use SCM-Extras Specs` button from the Game Plugins header for a clean interface.

### 🎯 Card Selector Modal & UI Streamlining
- **Card Selector Renaming**: Renamed the direct ingestion area to **"Card Selector"** across the Game Plugins interface.
- **Removed Hardcoded MPCFill / Scryfall Prompts**: Removed the generic empty-state text *"Search MPCFill for 1200 DPI custom arts or Scryfall for all official printings"* and cleaned modal header text so every card selector plugin is clean and plugin-neutral.
- **OneProxy Local Provider Tab**: Dedicated tab labelled **`OneProxy (Local)`** with custom search placeholder and clear local-only status feedback.

### 🚀 Hands-Free Background Updates (`Download > Install > Restart`)
- **Zero-Disruption Architecture**: Replaced the full-screen "CRITICAL UPDATE REQUIRED" blocking overlay and warning popups with a seamless, non-intrusive background updater that keeps users working uninterrupted.
- **Fully Automated Pipeline (`Download > Install > Restart`)**: When an update is detected, SCMUI autonomously downloads the release package in the background, triggers installation upon completion, and relaunches the application without requiring any user clicks, confirmations, or manual interaction.
- **Docked Floating Status Pill**: Replaced intrusive modal dialogs with a sleek bottom-right floating indicator that displays real-time progress (`Downloading vX.X.X (XX%)...`, `Installing update & restarting...`), providing transparent status while remaining completely out of the way.
- **Automated Installer Hand-off & Relaunch**: Server automatically executes the downloaded OS installer (`start ""`, `open`, or `xdg-open`) and gracefully terminates the running host process to allow clean installation and relaunching.
- **Unrestricted Outbound Connectivity**: Removed overly strict outbound network blocks, ensuring community APIs, asset downloads, and GitHub releases stream seamlessly.
- **Startup-Only Update Detection**: Eliminated aggressive background polling timers in favor of clean checks on application startup.

### 🎴 Game Plugin Enhancements (Bushiroad & One Piece)
- **Bushiroad Expansion**: Added Japanese DeckLog (`decklog.bushiroad.com`) fallback support alongside English DeckLog (`decklog-en.bushiroad.com`), expanding coverage for Cardfight!! Vanguard, Weiß Schwarz, Shadowverse: Evolve, Godzilla, and hololive.
- **One Piece Multi-Tier Resolution**: Checks local disk cache first (zero bandwidth), falls back to official Bandai without making individual requests to OneProxy.
- **Deck Parsing Flexibility**: Added support for both `optcgsim` and `egman` deck formats with alt-art codes.

### 🛠️ Server & Runtime Stability
- **ESM `child_process` Fix**: Resolved an unhandled CommonJS `require('child_process')` error inside `server.ts` during GPU acceleration detection, ensuring smooth server startup.

---

## [3.0.6] - 2026-10-15

### 🎨 Multi-Card Art Operations & Batch Assignment
- Universal multi-selection for card art actions (Set Art, Set Front, Set Back).
- Dynamic context menu badges, target counts, and batch indicator headers in the Art Picker modal.
- Multi-file atomic writes and replacements in `/api/scryfall/download` and `/api/upload`.

### 🧹 Card Art Submenu Streamlining & Deprecation Cleanup
- Removed legacy Watermark / Sample Remover tools from the Card Art flyout submenu.
- Restored workspace cleanup handlers in settings modal.

---

## [3.0.5] - 2026-10-14
- Direct card ingestion support across plugins and isolated card selectors.
- Restrict card selector tabs so Limitless is hidden for MTG and Scryfall/MPC is hidden for Pokemon.

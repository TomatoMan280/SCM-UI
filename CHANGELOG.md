# Changelog

All notable changes to **SCMUI (Silhouette Card Maker UI)** are documented in this file.

---

## [3.0.7] - 2026-10-18

### 🏴‍☠️ OneProxy Plugin & Offline Asset Management
- **Dedicated OneProxy Integration**: Full native support for [OneProxy](https://oneproxy.torforge.dev) with direct upstream card catalog synchronization (`5,035+ cards`).
- **Strictly Local-Only Card Selection**: Respects OneProxy server bandwidth policy by ensuring **zero individual remote fetches**. The Card Selector indexes and displays only cards available locally on disk in the OneProxy assets library.
- **Streamlined Two-Choice Setup Workflow**:
  - **Option A (Download Assets)**: Downloads the full high-resolution asset pack with an integrated live progress bar in the Game Plugins area, custom directory path support (defaults to `C:\Users\<user>\OneProxy` or `~/OneProxy`), and dynamic remaining disk space validation.
  - **Option B (Link Existing Assets)**: Instant linking for users who already have the OneProxy assets folder saved locally.
- **Dynamic File Sizing & Calibration**: Replaced hardcoded sizes with dynamic disk calibration based on actual downloaded card dimensions and live catalog counts, automatically updating whenever OneProxy releases new cards.
- **Context-Aware Visibility**: OneProxy controls and card selector options appear strictly when OneProxy is selected as the active format.

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

### ⚡ Startup-Only Update Checks
- **Removed Periodic Update Timer**: Eliminated the background interval timer that repeatedly checked GitHub for software updates.
- SCMUI now checks for updates cleanly once upon application startup.

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

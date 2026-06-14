# Silhouette Card Maker UI (SCM-UI)

A high-performance modern web-based and Electron-supported desktop user interface wrapper for the [Silhouette Card Maker](https://github.com/Alan-Cha/silhouette-card-maker) engine. This tool empowers tabletop game designers, custom card creators, and playtesters to generate perfectly aligned front-and-back print-ready card PDFs with Silhouette cutting registration marks.

## Key Features

- **Multi-Game Plugin Support**: Streamlined card and decklist retrieval for Magic: The Gathering, Pokémon, Lorcana, One Piece, Yu-Gi-Oh!, Digimon, Flesh and Blood, Final Fantasy, Netrunner, Lorcana, Grand Archive, and more.
- **Auto-Persistent Settings & Library**: Preferences, shortcut layouts, scale adjustments, and command builder configurations are stored securely across app restarts.
- **Uninstallation Safeguard**: Supports smart uninstall prompts to optionally preserve or back up your custom card imagery, staging directories, and configurations when removing or reinstalling.
- **Calibrated Multi-Axis Offsets**: Direct interface adjustments for printer alignments (X/Y margins and rotational skew) using custom grid sheets.
- **Desktop/Electron & Server Ready**: Compiles cleanly into single-executable Electron bundles or fully responsive full-stack server containers.

## Installation

For installation instructions and executable downloads, please visit the [Releases section](https://github.com/TomatoMan280/SCM-UI/releases) of the GitHub repository.

### Development

Run the full-stack development server with live preview:

```bash
npm run dev
```

### Production Build

Bundle both client-side assets and backend routing engines:

```bash
npm run build
```

The resulting assets compile into `dist/` and server assets under CJS targets (`dist/server.cjs`), ready for direct execution or Electron bundling.

## System Contributions

Contributions are welcome. Please refer to `CONTRIBUTING.md` in the submodules or open an issue on the repository page.

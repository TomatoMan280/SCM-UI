# OneProxy Plugin

This plugin reads One Piece Card Game (OPTCG) decklists, automatically retrieves high-resolution print-ready card art from [OneProxy](https://oneproxy.torforge.dev), and puts them in the proper `game/front/` directory.

This plugin supports uncompressed, lossless card art (300 to 1200+ DPI) including Alternate Arts, Manga Rares, Special (SP) cards, and DON!! cards with built-in fallback to Bandai official card art. To learn more, see [here](#formats).

## Basic Instructions

Navigate to the [root directory](../..) as plugins are not meant to be run in the [plugin directory](.).

If you're on macOS or Linux, open **Terminal**. If you're on Windows, open **PowerShell**.

Create and start your virtual Python environment and install Python dependencies if you have not done so already. See [here](../../README.md#basic-usage) for more information.

Put your decklist into a text file in [game/decklist](../game/decklist/). In this example, the filename is `deck.txt` and the decklist format is OPTCG Simulator / OneProxy (`oneproxy` or `optcgsim`).

Run the script.

```sh
python plugins/oneproxy/fetch.py game/decklist/deck.txt oneproxy
```

Now you can create the PDF using [`create_pdf.py`](../../README.md#create_pdfpy).

## CLI Options

```
Usage: fetch.py [OPTIONS] DECK_PATH {oneproxy|optcgsim|egman}

Options:
  --help  Show this message and exit.
```

## Formats

### `oneproxy` / `optcgsim`

OPTCG Simulator format (`{quantity}x{card number}`):

```
1xOP01-001
4xOP01-004
2xOP01-016_p1
10xDON-001
```

### `egman`

Egman Events format (`{quantity} {card number} {card name}`):

```
4 OP01-016 Nami
4 OP03-008 Buggy
2 OP06-018 Gum-Gum King Kong Gatling
```

## Features

- **Full Print-Ready Fidelity**: Fetches uncompressed original card art (`size=full`).
- **Anti-IP-Ban Protection**:
  * 24-hour local database cache in `~/.cache/oneproxy/`.
  * Persistent image cache to avoid redundant downloads.
  * Multi-copy deduplication (a 4x card downloads once and duplicates locally).
  * Polite request throttling and exponential backoff.

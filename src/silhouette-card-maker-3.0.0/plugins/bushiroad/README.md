# Bushiroad Plugin

This plugin reads deck URLs and codes, automatically retrieves the decklist and fetches card art from Bushiroad, and puts them in the proper `game/` directories.

This plugin supports decklist exports from [Bushiroad Deck Log](https://decklog-en.bushiroad.com/) (and Japanese Deck Log) for official Bushiroad card games:
- Cardfight!! Vanguard (`VG`)
- Weiβ Schwarz (`WS`)
- Shadowverse: Evolve (`SVE`)
- GODZILLA CARD GAME (`GCG`)
- hololive OFFICIAL CARD GAME (`hOCG`)

To learn more, see [here](#formats).

## Basic Instructions

Navigate to the [root directory](../..) as plugins are not meant to be run in the [plugin directory](.).

If you're on macOS or Linux, open **Terminal**. If you're on Windows, open **PowerShell**.

Create and start your virtual Python environment and install Python dependencies if you have not done so already. See [here](../../README.md#basic-usage) for more information.

Put your decklist into a text file in [game/decklist](../game/decklist/). In this example, the filename is `deck.txt` and the decklist format is Bushiroad Deck Log (`bushiroad_url` or `bushiroad`).

Run the script.

```sh
python plugins/bushiroad/fetch.py game/decklist/deck.txt bushiroad_url
```

Now you can create the PDF using [`create_pdf.py`](../../README.md#create_pdfpy).

## CLI Options

```
Usage: fetch.py [OPTIONS] DECK_PATH {bushiroad,bushiroad_url}

Options:
  --help  Show this message and exit.
```

## Formats

### `bushiroad_url` / `bushiroad`

Bushiroad Deck Log URL format:

```
https://decklog-en.bushiroad.com/view/1HF6L
```

Or Japanese Deck Log:

```
https://decklog.bushiroad.com/view/10398
```

You can also use a Bushiroad Deck Log URL directly in the command line:

```sh
python plugins/bushiroad/fetch.py https://decklog-en.bushiroad.com/view/5ZJ74 bushiroad_url
```
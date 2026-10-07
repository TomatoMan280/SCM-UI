import sys
import os
import json
import urllib.request
from urllib.error import HTTPError

API_URL = "https://waifucards.app/v2/search"
IMG_URL_TEMPLATE = "https://waifucards.app/img/cards/{set}/{rarity}-{number}.webp"

def map_identifier(cardidentifier):
    # Check if the identifier is purely numeric (internal database ID)
    if cardidentifier.isdigit():
        url = f"{API_URL}?search_type=search&items=30&page=1&number={cardidentifier}"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        try:
            response = urllib.request.urlopen(req)
            data = json.loads(response.read().decode('utf-8'))
            
            cards = data.get('data', [])
            for c in cards:
                if str(c.get('id')) == cardidentifier:
                    return c.get('set'), c.get('rarity'), c.get('number')
            
            if cards:
                c = cards[0]
                return c.get('set'), c.get('rarity'), c.get('number')
            
            return None, None, None
        except Exception as e:
            print(f"Failed to query API for identifier {cardidentifier}: {e}")
            return None, None, None
    elif '/' in cardidentifier and '-' in cardidentifier:
        # e.g., NS-01/SSR-001
        try:
            set_id, rest = cardidentifier.split('/')
            rarity, number = rest.split('-')
            return set_id, rarity, number
        except ValueError:
            pass
    return None, None, None

def download_image(set_id, rarity, number, dest_path):
    url = IMG_URL_TEMPLATE.format(set=set_id, rarity=rarity, number=number)
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    try:
        response = urllib.request.urlopen(req)
        with open(dest_path, 'wb') as f:
            f.write(response.read())
        return True
    except HTTPError as e:
        print(f"HTTP Error {e.code} while downloading {url}")
        return False
    except Exception as e:
        print(f"Error downloading {url}: {e}")
        return False

def main():
    if len(sys.argv) < 2:
        print("Usage: python waifucards.py <decklist_file_path>")
        sys.exit(1)

    deck_path = sys.argv[1]
    if not os.path.isfile(deck_path):
        print(f"{deck_path} is not a valid file.")
        sys.exit(1)

    # Ensure output directory exists based on SCMUI's structure
    # SCMUI executes plugins with the project root as CWD
    front_dir = os.path.join('game', 'front')
    os.makedirs(front_dir, exist_ok=True)

    with open(deck_path, 'r', encoding='utf-8') as f:
        lines = [line.strip() for line in f if line.strip()]

    print(f"Parsed {len(lines)} unique card(s) from decklist.")

    for index, line in enumerate(lines):
        parts = line.split(maxsplit=1)
        if len(parts) != 2:
            print(f"Skipping invalid line: {line}")
            continue

        try:
            quantity = int(parts[0])
        except ValueError:
            print(f"Invalid quantity on line: {line}")
            continue
            
        cardidentifier = parts[1]
        print(f"Fetching card: {cardidentifier} (Quantity: {quantity})")

        set_id, rarity, number = map_identifier(cardidentifier)
        if not set_id or not rarity or not number:
            print(f"Error: Could not map identifier '{cardidentifier}' to a valid WaifuCards image.")
            continue

        for q in range(quantity):
            dest_path = os.path.join(front_dir, f"{index}{set_id}_{rarity}_{number}{q+1}.webp")
            success = download_image(set_id, rarity, number, dest_path)
            if not success:
                print(f"Error: Could not download front image for '{cardidentifier}'. Check if the identifier is correct.")
                break

    print("Done.")

if __name__ == '__main__':
    main()

import os
import re
import requests
import time
from io import BytesIO

from PIL import Image

session = requests.Session()

def request_lorcast(
    query: str,
) -> requests.Response:
    r = session.get(query, headers = {'user-agent': 'silhouette-card-maker/0.1', 'accept': '*/*'})

    # Check for 2XX response code
    r.raise_for_status()

    # Sleep for 75 ms, greater than the 50 ms requested by Lorcast API documentation
    # See rate limits: https://lorcast.com/docs/api
    time.sleep(0.075)

    return r

def format_lorcast_query(name: str, enchanted: bool) -> str:
    return re.sub(r'[^\w]', '+', name) + "+" + enchanted*"rarity:enchanted"

def remove_nonalphanumeric(s: str) -> str:
    return re.sub(r'[^\w]', '', s)

def fetch_card(
    index: int,
    quantity: int,
    name: str,
    enchanted: bool,
    front_img_dir: str,
):
    # Filter out symbols from card names
    clean_card_name = remove_nonalphanumeric(name)
    card_query = format_lorcast_query(name, enchanted)

    card_info_query = f'https://api.lorcast.com/v0/cards/search?q={card_query}'

    # Query for card info
    card_json = request_lorcast(card_info_query).json()['results'][0]

    image_uris = card_json['image_uris']['digital']
    
    card_front_image_url = ''
    if 'large' in image_uris:
        card_front_image_url = image_uris['large']
    elif 'medium' in image_uris:
        card_front_image_url = image_uris['medium']
    elif 'small' in image_uris:
        card_front_image_url = image_uris['small']
    else:
        raise Exception(f'No images available for "{name}"')

    card_art = Image.open(BytesIO(request_lorcast(card_front_image_url).content))

    if card_art is not None:
        # Save image based on quantity
        for counter in range(quantity):
            image_path = os.path.join(front_img_dir, f'{str(index)}{clean_card_name}{str(counter + 1)}.png')

            card_art.save(image_path, format="PNG")

def get_handle_card(
    front_img_dir: str,
):
    def configured_fetch_card(index: int, name: str, enchanted: bool, quantity: int = 1):
        fetch_card(
            index,
            quantity,
            name,
            enchanted,
            front_img_dir,
        )

    return configured_fetch_card
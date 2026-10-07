from re import compile
from enum import Enum
from typing import Callable, Tuple

card_data_tuple = Tuple[str, int, str]  # Card Number, Quantity, Name

def parse_deck_helper(deck_text: str, handle_card: Callable, is_card_line: Callable[[str], bool], extract_card_data: Callable[[str], card_data_tuple]) -> None:
    error_lines = []

    index = 0
    for line in deck_text.strip().split('\n'):
        if is_card_line(line):
            index = index + 1

            card_number, quantity, name = extract_card_data(line)

            parts = [f'Index: {index}', f'quantity: {quantity}']
            if card_number: parts.append(f'card number: {card_number}')
            if name: parts.append(f'name: {name}')
            print(', '.join(parts))
            try:
                handle_card(index, card_number, quantity)
            except Exception as e:
                print(f'Error: {e}')
                error_lines.append((line, e))

        else:
            print(f'Skipping: "{line}"')

    if len(error_lines) > 0:
        print(f'Errors: {error_lines}')

def parse_deckplanet(deck_text: str, handle_card: Callable) -> None:
    pattern = compile(r'^(\d+)\s+(.+)\s+\[(.+)\]$')  # '{Quantity} {Name} [{Card Number}]'

    def is_deckplanet_line(line) -> bool:
        return bool(pattern.match(line))
    
    def extract_deckplanet_card_data(line) -> card_data_tuple:
        match = pattern.match(line)
        if match:
            card_number = match.group(3).strip()
            quantity = int(match.group(1).strip())
            name = match.group(2).strip()
            return (card_number, quantity, name)
        
    parse_deck_helper(deck_text, handle_card, is_deckplanet_line, extract_deckplanet_card_data)

def parse_limitless(deck_text: str, handle_card: Callable) -> None:
    pattern = compile(r'^(\d+)\s+(.+)\s+([A-Z0-9]+-\d+)$')  # '{Quantity} {Name} {Card Number}'

    def is_limitless_line(line) -> bool:
        return bool(pattern.match(line))
    
    def extract_limitless_card_data(line) -> card_data_tuple:
        match = pattern.match(line)
        if match:
            card_number = match.group(3).strip()
            quantity = int(match.group(1).strip())
            name = match.group(2).strip()
            return (card_number, quantity, name)
        
    parse_deck_helper(deck_text, handle_card, is_limitless_line, extract_limitless_card_data)

def parse_egman(deck_text: str, handle_card: Callable) -> None:
    pattern = compile(r'^(\d+)\s+([A-Z0-9]+-\d+)\s+([^|]+)')  # '{Quantity} {Card Number} {Name}'

    def is_egman_line(line) -> bool:
        return bool(pattern.match(line))
    
    def extract_egman_card_data(line) -> card_data_tuple:
        match = pattern.match(line)
        if match:
            card_number = match.group(2).strip()
            quantity = int(match.group(1).strip())
            name = match.group(3).strip()
            return (card_number, quantity, name)
        
    parse_deck_helper(deck_text, handle_card, is_egman_line, extract_egman_card_data)

def parse_exburst(deck_text: str, handle_card: Callable) -> None:
    pattern = compile(r'^(\d+)\s+x\s+([A-Z0-9]+-\d+).*$') # '{Quantity} x {Card Number}'

    def is_exburst_line(line) -> bool:
        return bool(pattern.match(line))
    
    def extract_exburst_card_data(line) -> card_data_tuple:
        match = pattern.match(line)
        if match:
            card_number = match.group(2).strip()
            quantity = int(match.group(1).strip())
            return (card_number, quantity, '')
        
    parse_deck_helper(deck_text, handle_card, is_exburst_line, extract_exburst_card_data)

class DeckFormat(str, Enum):
    DECKPLANET = 'deckplanet'
    EGMANEVENTS = 'egman'
    EXBURST = 'exburst'
    LIMITLESSTCG = 'limitless'

def parse_deck(deck_text: str, format: DeckFormat, handle_card: Callable) -> None:
    if format == DeckFormat.DECKPLANET:
        return parse_deckplanet(deck_text, handle_card)
    elif format == DeckFormat.LIMITLESSTCG:
        return parse_limitless(deck_text, handle_card)
    elif format == DeckFormat.EGMANEVENTS:
        return parse_egman(deck_text, handle_card)
    elif format == DeckFormat.EXBURST:
        return parse_exburst(deck_text, handle_card)
    else:
        raise ValueError('Unrecognized deck format.')

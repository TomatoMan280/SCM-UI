from re import compile, I
from enum import Enum
from typing import Callable, Tuple

card_data_tuple = Tuple[str, int, str] # card number, quantity, name

def parse_deck_helper(deck_text: str, handle_card: Callable, is_card_line: Callable[[str], bool], extract_card_data: Callable[[str], card_data_tuple]) -> None:
    error_lines = []

    index = 0
    for line in deck_text.strip().split('\n'):
        line_clean = line.strip()
        if not line_clean or line_clean.startswith('//') or line_clean.startswith('#'):
            continue
        if is_card_line(line_clean):
            index = index + 1

            card_code, quantity, name = extract_card_data(line_clean)

            parts = [f'Index: {index}', f'quantity: {quantity}']
            if card_code: parts.append(f'card code: {card_code}')
            if name: parts.append(f'name: {name}')
            print(', '.join(parts))
            try:
                handle_card(index, card_code, quantity)
            except Exception as e:
                print(f'Error: {e}')
                error_lines.append((line, e))

        else:
            print(f'Skipping: "{line}"')

    if len(error_lines) > 0:
        print(f'Errors: {error_lines}')

def parse_optcgsim(deck_text: str, handle_card: Callable) -> None:
    # Supports '1xOP01-001', '10xDON-001', '4x OP01-016_p1', '1xOP01-016 (Alt Art)'
    pattern = compile(r'^\s*(\d+)x?\s*([A-Za-z0-9]+-[A-Za-z0-9_]+(?:\s*\([^)]+\))?)\s*$', I)

    def is_optcgsim_line(line) -> bool:
        return bool(pattern.match(line))

    def extract_optcgsim_card_data(line) -> card_data_tuple:
        match = pattern.match(line)
        if match:
            quantity = int(match.group(1).strip())
            card_code = match.group(2).strip()

            return (card_code, quantity, '')
        return ('', 0, '')

    parse_deck_helper(deck_text, handle_card, is_optcgsim_line, extract_optcgsim_card_data)

def parse_egman(deck_text: str, handle_card: Callable) -> None:
    # Supports '4 OP01-016 Nami' or '4 OP01-016_p1 Nami (Alt Art)'
    pattern = compile(r'^\s*(\d+)\s+([A-Za-z0-9]+-[A-Za-z0-9_]+)\s+(.+?)\s*$', I)

    def is_egman_line(line) -> bool:
        return bool(pattern.match(line))

    def extract_egman_card_data(line) -> card_data_tuple:
        match = pattern.match(line)
        if match:
            quantity = int(match.group(1).strip())
            card_code = match.group(2).strip()
            name = match.group(3).strip()

            return (card_code, quantity, name)
        return ('', 0, '')

    parse_deck_helper(deck_text, handle_card, is_egman_line, extract_egman_card_data)

class DeckFormat(str, Enum):
    EGMANEVENTS = 'egman'
    OPTCGSIMULATOR = 'optcgsim'
    ONEPROXY = 'oneproxy'

def parse_deck(deck_text: str, format: DeckFormat, handle_card: Callable) -> None:
    fmt = format.value if isinstance(format, DeckFormat) else str(format).lower()
    if fmt in ('optcgsim', 'oneproxy'):
        return parse_optcgsim(deck_text, handle_card)
    elif fmt == 'egman':
        return parse_egman(deck_text, handle_card)
    else:
        raise ValueError(f'Unrecognized deck format: {format}')


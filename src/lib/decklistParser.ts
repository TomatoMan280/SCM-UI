/**
 * Decklist Parser for SCMUI
 * Supports standard text decklists (MTG, Pokemon, Lorcana, etc.)
 * as well as online deck URLs (Moxfield, Archidekt).
 */

export interface ParsedDeckCard {
  name: string;
  quantity: number;
  set?: string;
  collectorNumber?: string;
  foil?: boolean;
}

export function parseDecklistLines(text: string): ParsedDeckCard[] {
  const lines = text.split(/\r?\n/);
  const cards: ParsedDeckCard[] = [];

  for (const rawLine of lines) {
    let line = rawLine.trim();
    if (!line) continue;

    // Ignore headers / comments e.g. "// Commander", "# Deck", "Sideboard:"
    if (
      line.startsWith('//') ||
      line.startsWith('#') ||
      line.startsWith('!') ||
      line.startsWith(';') ||
      line.toLowerCase().endsWith(':') ||
      /^(deck|mainboard|sideboard|commander|maybeboard|tokens|companion)/i.test(line)
    ) {
      continue;
    }

    // Strip foil markers e.g. *F*, *E*
    line = line.replace(/\*[FEfe]\*/g, '').trim();

    // Match leading count (e.g. "4", "4x", "4X")
    const countMatch = line.match(/^(\d+)[xX]?\s+(.*)$/);
    let quantity = 1;
    let rest = line;

    if (countMatch && countMatch[1] && countMatch[2]) {
      quantity = parseInt(countMatch[1], 10);
      rest = countMatch[2].trim();
    }

    // Match set tag and collector number in parentheses or brackets e.g. "(LEA) 161" or "[MID] 47" or "(NEO:284)"
    const setMatch = rest.match(/^(.*?)\s*[\(\[]([a-zA-Z0-9_-]+)(?::|\s+)?([a-zA-Z0-9_#-]+)?[\)\]](.*)$/);
    let name = rest;
    let set: string | undefined = undefined;
    let cn: string | undefined = undefined;

    if (setMatch) {
      name = setMatch[1].trim();
      set = setMatch[2].trim();
      cn = (setMatch[3] || setMatch[4] || '').replace(/^[#\s]+/, '').trim() || undefined;
    } else {
      // Check trailing set code if not in parens, e.g. "Lightning Bolt LEA 161"
      const trailingMatch = rest.match(/^(.*?)\s+([a-zA-Z0-9]{3,4})\s+(\d+[a-zA-Z]?)$/);
      if (trailingMatch) {
        name = trailingMatch[1].trim();
        set = trailingMatch[2].trim();
        cn = trailingMatch[3].trim();
      }
    }

    // Strip any trailing price or tags e.g. "$1.50"
    name = name.replace(/\s*\$[\d\.]+/g, '').trim();

    if (name) {
      cards.push({
        name,
        quantity: Math.max(1, quantity),
        set: set || undefined,
        collectorNumber: cn || undefined
      });
    }
  }

  return cards;
}

export async function parseDecklistInput(input: string): Promise<ParsedDeckCard[]> {
  const trimmed = (input || '').trim();
  if (!trimmed) return [];

  // Check if input is a Moxfield URL
  const moxfieldMatch = trimmed.match(/moxfield\.com\/decks\/([a-zA-Z0-9_-]+)/i);
  if (moxfieldMatch && moxfieldMatch[1]) {
    const deckId = moxfieldMatch[1];
    try {
      const res = await fetch(`/api/moxfield-proxy?deckId=${encodeURIComponent(deckId)}`);
      if (res.ok) {
        const data = await res.json();
        const cards: ParsedDeckCard[] = [];

        // Commanders
        if (data.commanders) {
          Object.entries(data.commanders).forEach(([_, item]: any) => {
            if (item.card?.name) {
              cards.push({
                name: item.card.name,
                quantity: item.quantity || 1,
                set: item.card.set,
                collectorNumber: item.card.cn
              });
            }
          });
        }

        // Mainboard
        if (data.mainboard) {
          Object.entries(data.mainboard).forEach(([_, item]: any) => {
            if (item.card?.name) {
              cards.push({
                name: item.card.name,
                quantity: item.quantity || 1,
                set: item.card.set,
                collectorNumber: item.card.cn
              });
            }
          });
        }

        // Companions
        if (data.companions) {
          Object.entries(data.companions).forEach(([_, item]: any) => {
            if (item.card?.name) {
              cards.push({
                name: item.card.name,
                quantity: item.quantity || 1,
                set: item.card.set,
                collectorNumber: item.card.cn
              });
            }
          });
        }

        // Sideboard
        if (data.sideboard) {
          Object.entries(data.sideboard).forEach(([_, item]: any) => {
            if (item.card?.name) {
              cards.push({
                name: item.card.name,
                quantity: item.quantity || 1,
                set: item.card.set,
                collectorNumber: item.card.cn
              });
            }
          });
        }

        if (cards.length > 0) return cards;
      }
    } catch (e) {
      console.warn('[DecklistParser] Moxfield proxy fetch failed, falling back to text parsing', e);
    }
  }

  // Check if input is an Archidekt URL
  const archidektMatch = trimmed.match(/archidekt\.com\/decks\/(\d+)/i);
  if (archidektMatch && archidektMatch[1]) {
    const deckId = archidektMatch[1];
    try {
      const res = await fetch(`https://archidekt.com/api/decks/${encodeURIComponent(deckId)}/`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.cards)) {
          const cards: ParsedDeckCard[] = [];
          data.cards.forEach((entry: any) => {
            const cardName = entry.card?.oracleCard?.name || entry.card?.name;
            if (cardName) {
              cards.push({
                name: cardName,
                quantity: entry.quantity || 1,
                set: entry.card?.edition?.editioncode,
                collectorNumber: entry.card?.collectorNumber
              });
            }
          });
          if (cards.length > 0) return cards;
        }
      }
    } catch (e) {
      console.warn('[DecklistParser] Archidekt fetch failed, falling back to text parsing', e);
    }
  }

  // Fallback: parse as standard text lines
  return parseDecklistLines(trimmed);
}

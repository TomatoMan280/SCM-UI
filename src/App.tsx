import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Loader2,
  Terminal,
  Settings,
  Book,
  ShieldCheck,
  Download,
  RefreshCw,
  Play,
  FolderOpen,
  Info,
  ExternalLink,
  MessageSquare,
  Package,
  Layers,
  ChevronRight,
  ChevronLeft,
  Menu,
  Database,
  Image as ImageIcon,
  CheckSquare,
  CheckCircle,
  ChevronDown,
  Eye,
  Trash2,
  FileText,
  Copy,
  X,
  RotateCcw,
  PlusCircle,
  AlertCircle,
  Sliders,
  LayoutGrid,
  Upload,
  Settings2,
  Check,
  Search,
  Zap,
  Maximize2,
  SlidersHorizontal,
  ZoomIn,
  ZoomOut,
  FolderInput,
  FolderOutput,
  Cpu,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { Theme, setTheme, getTheme } from './lib/theme';
import PresetManager from './components/PresetManager';
import ProjectManager from './components/ProjectManager';
import MtgSetCodeTooltip from './components/MtgSetCodeTooltip';

export interface GpuVramInfo {
  detected: boolean;
  name: string;
  totalVramMB: number;
  freeVramMB: number;
  source?: string;
}

export interface UpscaleConfig {
  scaleFactor: 2 | 3 | 4;
  model: 'high-fidelity-4x' | 'digital-art-4x' | 'ultrasharp-4x' | 'remacri-4x' | 'ultramix-balanced-4x' | 'upscayl-standard-4x' | 'upscayl-lite-4x';
  tta: boolean;
  scope: 'all' | 'front' | 'back' | 'double_sided' | 'selected';
  maxDimension: number;
  workers: number;
  tileSize: number;
}

export interface ReleaseAsset {
  name: string;
  size: number;
  downloadUrl: string;
  isInstaller: boolean;
  isPreferred: boolean;
}

export interface ReleaseInfo {
  id: number;
  tag: string;
  name: string;
  publishedAt: string;
  isPrerelease: boolean;
  isCurrent: boolean;
  isNewer: boolean;
  notes: string;
  htmlUrl: string;
  primaryAsset: ReleaseAsset | null;
  assets: ReleaseAsset[];
}

export interface UpdateCheckResponse {
  currentVersion: string;
  hasUpdate: boolean;
  latestVersion: string;
  latestRelease: ReleaseInfo | null;
  releases: ReleaseInfo[];
}

export const defaultUpscaleConfig: UpscaleConfig = {
  scaleFactor: 2,
  model: 'high-fidelity-4x',
  tta: false,
  scope: 'all',
  maxDimension: 4096,
  workers: 1,
  tileSize: 0
};

export const getModelShortName = (modelKey: string): string => {
  const map: Record<string, string> = {
    'high-fidelity-4x': 'High Fidelity',
    'digital-art-4x': 'Digital Art',
    'ultrasharp-4x': 'UltraSharp',
    'remacri-4x': 'Remacri',
    'ultramix-balanced-4x': 'UltraMix',
    'upscayl-standard-4x': 'Standard',
    'upscayl-lite-4x': 'Lite'
  };
  return map[modelKey] || modelKey.replace('-4x', '').replace(/-/g, ' ');
};

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[UI Crash Prevented by ErrorBoundary]:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 m-4 bg-red-950/40 border border-red-500/30 rounded-2xl text-red-200 text-sm flex flex-col items-center gap-3">
          <p className="font-bold">An unexpected interface error occurred, but the app was prevented from crashing.</p>
          <p className="text-xs text-red-300/80 font-mono">{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-xl text-xs font-bold text-red-100 transition-colors cursor-pointer"
          >
            Dismiss & Recover
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const stripExt = (filename?: string | null) => {
  if (!filename || typeof filename !== 'string') return '';
  const lastDot = filename.lastIndexOf('.');
  return lastDot === -1 ? filename : filename.substring(0, lastDot);
};

const cleanCardName = (filename?: string | null): string => {
  if (!filename) return '';
  let clean = stripExt(filename);
  // Strip duplicate tags like _copy, _copy2, (1), etc.
  clean = clean.replace(/_copy\d*$/i, '').replace(/\s*\(\d+\)$/, '');
  // Strip parenthetical set and collector number info e.g. " (SLD 243)" or " [LEA 12]"
  clean = clean.replace(/\s*\([a-zA-Z0-9]+\s+[a-zA-Z0-9]+\)$/i, '');
  clean = clean.replace(/\s*\[[a-zA-Z0-9]+(?:\s+[a-zA-Z0-9]+)?\]$/i, '');
  // Strip quantity prefixes e.g. "1x ", "4x ", "1 "
  clean = clean.replace(/^[0-9]+x?\s+/, '');
  // Handle SCM's squished format e.g. "1blacklotus1" -> strip leading digits and trailing digits
  if (/^\d+[a-zA-Z]/.test(clean)) {
    clean = clean.replace(/^\d+/, '');
  }
  if (/[a-zA-Z]\d+$/.test(clean)) {
    clean = clean.replace(/\d+$/, '');
  }
  // Replace underscores and dashes with spaces
  clean = clean.replace(/[_-]+/g, ' ');
  return clean.trim();
};

export const normalizeDimension = (
  val: string | number | undefined | null,
  defaultUnit: 'mm' | 'in' = 'mm'
): string => {
  if (val === undefined || val === null) return '';
  const trimmed = val.toString().trim();
  if (!trimmed || trimmed === '0') return trimmed;

  // Fraction support: e.g. "1/8", "1/8\"", "1/8 in", "1/16 in", "1/4\""
  const fracMatch = trimmed.match(/^(\d+)\s*\/\s*(\d+)\s*(["'']|in(?:ch(?:es)?)?|mm)?$/i);
  if (fracMatch) {
    const num = parseFloat(fracMatch[1]);
    const den = parseFloat(fracMatch[2]);
    if (den !== 0) {
      const dec = parseFloat((num / den).toFixed(4));
      const unit = fracMatch[3] && fracMatch[3].toLowerCase().startsWith('m') ? 'mm' : 'in';
      return `${dec}${unit}`;
    }
  }

  // Inch variants: "0.125\"", "0.125''", "0.125 in", "0.125inch", "0.125 inches", "0.125in", "0.125 in."
  const inchMatch = trimmed.match(/^(\d+(?:\.\d+)?|\.\d+)\s*(?:["'']|in(?:ch(?:es)?)?|\.)$/i);
  if (inchMatch) {
    return `${inchMatch[1]}in`;
  }

  // Millimeter variants: "3mm", "3 mm", "3 millimeter", "3 millimeters", "3mm."
  const mmMatch = trimmed.match(/^(\d+(?:\.\d+)?|\.\d+)\s*(?:mm|millimeter(?:s)?|\.)$/i);
  if (mmMatch) {
    return `${mmMatch[1]}mm`;
  }

  // Plain number without unit: e.g. "10", "3.5", ".125"
  if (/^(\d+(\.\d+)?|\.\d+)$/.test(trimmed)) {
    return `${trimmed}${defaultUnit}`;
  }

  return trimmed;
};

export const getDimensionUnit = (val: string | number | undefined | null, fallback = 'mm'): 'mm' | 'in' | '' => {
  if (!val) return (fallback as 'mm' | 'in' | '');
  const str = val.toString().trim().toLowerCase();
  if (str.endsWith('in') || str.endsWith('"') || str.endsWith("''") || str.includes('inch')) return 'in';
  if (str.endsWith('mm')) return 'mm';
  return (fallback as 'mm' | 'in' | '');
};

export const convertDimensionUnit = (currentStr: string, targetUnit: 'mm' | 'in'): string => {
  const norm = normalizeDimension(currentStr, targetUnit);
  if (!norm || norm === '0') return '';

  const mmMatch = norm.match(/^(\d+(?:\.\d+)?|\.\d+)mm$/);
  const inMatch = norm.match(/^(\d+(?:\.\d+)?|\.\d+)in$/);

  if (targetUnit === 'in') {
    if (inMatch) return norm;
    if (mmMatch) {
      const mmVal = parseFloat(mmMatch[1]);
      const inVal = parseFloat((mmVal / 25.4).toFixed(3));
      return `${inVal}in`;
    }
    return `${norm}in`;
  } else {
    if (mmMatch) return norm;
    if (inMatch) {
      const inVal = parseFloat(inMatch[1]);
      const mmVal = parseFloat((inVal * 25.4).toFixed(2));
      return `${mmVal}mm`;
    }
    return `${norm}mm`;
  }
};

export const parseDimensionParts = (
  val: string | number | undefined | null,
  fallbackUnit: 'mm' | 'in' = 'mm'
): { num: string; unit: 'mm' | 'in' } => {
  if (val === undefined || val === null) return { num: '', unit: fallbackUnit };
  const str = val.toString().trim();
  if (!str || str === '0') return { num: '', unit: fallbackUnit };

  // Check fraction: e.g. 1/8", 1/8 in, 1/8
  const fracMatch = str.match(/^(\d+)\s*\/\s*(\d+)\s*(["'']|in(?:ch(?:es)?)?|mm)?$/i);
  if (fracMatch) {
    const num = parseFloat(fracMatch[1]);
    const den = parseFloat(fracMatch[2]);
    if (den !== 0) {
      const dec = parseFloat((num / den).toFixed(4)).toString();
      const unit = fracMatch[3] && fracMatch[3].toLowerCase().startsWith('m') ? 'mm' : 'in';
      return { num: dec, unit };
    }
  }

  // Check inches: "0.125in", "0.125 in", "0.125\"", "0.125 inch"
  if (str.endsWith('in') || str.endsWith('"') || str.endsWith("''") || str.toLowerCase().includes('inch')) {
    const numMatch = str.match(/^(\d+(?:\.\d+)?|\.\d+)/);
    return { num: numMatch ? numMatch[1] : '', unit: 'in' };
  }

  // Check mm: "10mm", "10 mm", "10 millimeter"
  if (str.toLowerCase().includes('mm') || str.toLowerCase().includes('milli')) {
    const numMatch = str.match(/^(\d+(?:\.\d+)?|\.\d+)/);
    return { num: numMatch ? numMatch[1] : '', unit: 'mm' };
  }

  // Plain number without unit:
  if (/^(\d+(\.\d+)?|\.\d+)$/.test(str)) {
    return { num: str, unit: fallbackUnit };
  }

  return { num: str, unit: fallbackUnit };
};

// Types
type Tab = 'dashboard' | 'console' | 'assets' | 'builder' | 'plugins';

interface AssetData {
  fronts: string[];
  backs: string[];
  double_sided?: string[];
}

const FORMAT_HINTS: Record<string, string> = {
  // MTG
  simple: "List Just the card names, one per line. Example: Lightning Bolt",
  mtga: "MTG Arena format. Example: 4 Shock (M19) 156",
  mtgo: "Magic Online format. Example: 1 Abzan Battle Priest",
  archidekt: "Archidekt format. Example: 1x Ashnod's Altar (ema) 218 *F*",
  cubecobra_csv: "CubeCobra CSV formatted decklist.",
  deckstats: "Deckstats format. Example: 1 [2XM#310] Ash Barrens",
  moxfield: "Moxfield format. Example: 1 Abzan Battle Priest (IMA) 2",
  scryfall_json: "Export as JSON from Scryfall.",
  mpcfill_xml: "MPCFill XML file content.",
  url: "Deck URL. Example: https://www.moxfield.com/decks/...",

  // Pokemon
  limitless: "Limitless TCG format. Example: 4 Pikachu PAR 18",

  // One Piece
  egman: "Egman Events format. Example: 4 OP01-016 Nami",
  optcgsim: "OPTCG Sim format. Example: 1xOP12-001",

  // Lorcana
  dreamborn: "Dreamborn.ink text format.",

  // SWU
  melee: "Melee.gg decklist format.",
  picklist: "A simple picklist format for SWU.",
  swudb_json: "SWUDB exported JSON format.",

  // Sorcery
  curiosa_url: "Curiosa URL format uses the full URL of a deck from Curiosa. Example: https://curiosa.io/decks/cme5x329q00k9jo04ouuycsek",

  // Riftbound
  piltover_archive: "Piltover Archive exported text format.",
  pixelborn: "Pixelborn deck code.",
  tts: "Tabletop Simulator json format.",

  // Digimon
  digimoncard_dev: "Digimoncard.dev text output.",
  digimoncard_app: "Digimoncard.app formatted text.",

  // YGO
  ydk: "YDK format. Example: #main...",
  ydke: "YDKE deck string format.",

  // Netrunner
  bbcode: "bbCode format. Example: 3x [url=...]Cohort Guidance Program[/url]",
  jinteki: "Jinteki format. Example: 3 Fujii Asset Retrieval",
  markdown: "Markdown (Reddit) format. Example: * 3x [Fujii Asset Retrieval](...)",
  plain_text: "Plain text format. Example: 3x Cohort Guidance Program",
  text: "Standard text format. Example: 1x Longevity Serum (System Gateway)",

  // Altered
  ajordat: "Ajordat format.",

  // Ashes Reborn
  ashes_share_url: "Ashes format. Example: https://ashes.live/decks/share/.../",
  ashesdb_share_url: "Ashes DB format. Example: https://ashesdb.plaidhatgames.com/decks/share/.../",

  // Bushiroad
  bushiroad_url: "Bushiroad Deck Log URL format. Example: https://decklog-en.bushiroad.com/view/1HF6L",

  // Digimon
  digimoncardapp: "digimoncard.app format.",
  digimoncarddev: "digimoncard.dev format.",
  digimoncardio: "digimoncard.io format.",
  digimonmeta: "DigimonMeta format.",
  untap: "Untap format.",

  // Echoes of Astra
  astrabuilder_url: "AstraBuilder URL format uses the full URL of a deck from AstraBuilder. Example: https://www.astra-builder.com/en/create?deck=122",

  // Elestrals
  elestrals: "The format for Elestrals Play Network. Example: 6883b784bd9cf7315d565843",

  // Final Fantasy
  octgn_xml: "OCTGN XML format.",

  // Flesh and Blood
  fabrary: "Fabrary format.",

  // Grand Archive
  omnideck: "Omnideck format.",

  // Gundam
  deckplanet: "DeckPlanet format.",
  exburst: "ExBurst format."
};

interface PluginConfig {
  id: string;
  name: string;
  formats: string[];
  options: { label: string; flag: string; type: 'toggle' | 'select' | 'text'; choices?: string[] }[];
  websites?: { name: string; url: string; }[];
}

const PLUGINS: PluginConfig[] = [
  {
    id: 'mtg',
    name: 'Magic: The Gathering',
    formats: ['simple', 'mtga', 'mtgo', 'archidekt', 'cubecobra_csv', 'deckstats', 'moxfield', 'scryfall_json', 'mpcfill_xml', 'url'],
    options: [
      { label: 'Ignore Set/Collector #', flag: '--ignore_set_and_collector_number', type: 'toggle' },
      { label: 'Prefer Older Sets', flag: '--prefer_older_sets', type: 'toggle' },
      { label: 'Prefer Showcase', flag: '--prefer_showcase', type: 'toggle' },
      { label: 'Prefer Extra Art', flag: '--prefer_extra_art', type: 'toggle' },
      { label: 'Prefer Universe Beyond', flag: '--prefer_ub', type: 'toggle' },
      { label: 'Ignore Universe Beyond', flag: '--ignore_ub', type: 'toggle' },
      { label: 'Fetch Tokens', flag: '--tokens', type: 'toggle' },
      { label: 'Prefer Sets (comma separated)', flag: '-s', type: 'text' },
      { label: 'Ignore Sets (comma separated)', flag: '--ignore_set', type: 'text' },
      { label: 'Language', flag: '--prefer_lang', type: 'select', choices: ['en', 'sp', 'fr', 'de', 'it', 'pt', 'jp', 'kr', 'ru', 'cs', 'ct', 'ag', 'ph'] }
    ],
    websites: [
      { name: 'Moxfield', url: 'https://moxfield.com' },
      { name: 'Archidekt', url: 'https://archidekt.com' },
      { name: 'Scryfall', url: 'https://scryfall.com' },
      { name: 'Deckstats', url: 'https://deckstats.net' },
      { name: 'CubeCobra', url: 'https://cubecobra.com' },
      { name: 'MTGGoldfish', url: 'https://mtggoldfish.com' },
      { name: 'TappedOut', url: 'https://tappedout.net' },
      { name: 'TCGPlayer', url: 'https://tcgplayer.com' },
      { name: 'Aetherhub', url: 'https://aetherhub.com' }
    ]
  },
  {
    id: 'pokemon',
    name: 'Pokemon',
    formats: ['limitless'],
    options: [],
    websites: [{ name: 'Limitless', url: 'https://my.limitlesstcg.com/builder' }]
  },
  {
    id: 'one_piece',
    name: 'One Piece',
    formats: ['optcgsim', 'oneproxy', 'egman'],
    options: [],
    websites: [
      { name: 'OneProxy', url: 'https://oneproxy.torforge.dev' },
      { name: 'Limitless OPTCG', url: 'https://onepiece.limitlesstcg.com' },
      { name: 'Egman Events', url: 'https://egmanevents.com/' },
      { name: 'OPTCG Sim', url: 'https://optcgsim.com/' }
    ]
  },
  {
    id: 'lorcana',
    name: 'Lorcana',
    formats: ['dreamborn'],
    options: [],
    websites: [{ name: 'Dreamborn', url: 'https://dreamborn.ink/' }]
  },
  {
    id: 'star_wars_unlimited',
    name: 'Star Wars Unlimited',
    formats: ['melee', 'picklist', 'swudb_json'],
    options: [],
    websites: [
      { name: 'SWUDB', url: 'https://swudb.com/' },
      { name: 'Melee', url: 'https://melee.gg/' }
    ]
  },
  {
    id: 'sorcery_contested_realm',
    name: 'Sorcery: Contested Realm',
    formats: ['curiosa_url'],
    options: [],
    websites: [{ name: 'Curiosa', url: 'https://curiosa.io/' }]
  },
  {
    id: 'riftbound',
    name: 'Riftbound',
    formats: ['piltover_archive', 'pixelborn', 'tts'],
    options: [
      { label: 'Image Source', flag: '--source', type: 'select', choices: ['piltover_archive', 'riftmana'] }
    ],
    websites: [
      { name: 'Piltover Archive', url: 'https://piltoverarchive.com/' },
      { name: 'Pixelborn', url: 'https://pixelborn.com/' }
    ]
  },
  {
    id: 'netrunner',
    name: 'Netrunner',
    formats: ['bbcode', 'jinteki', 'markdown', 'plain_text', 'text'],
    options: [],
    websites: [
      { name: 'NetrunnerDB', url: 'https://netrunnerdb.com/' },
      { name: 'Jinteki', url: 'https://jinteki.net/' }
    ]
  },
  {
    id: 'gundam',
    name: 'Gundam',
    formats: ['deckplanet', 'egman', 'exburst', 'limitless'],
    options: [],
    websites: [
      { name: 'DeckPlanet', url: 'https://www.deckplanet.com/' },
      { name: 'Egman Events', url: 'https://egmanevents.com/' },
      { name: 'ExBurst', url: 'https://www.exburst.com/' },
      { name: 'Limitless', url: 'https://my.limitlesstcg.com/builder' }
    ]
  },
  {
    id: 'grand_archive',
    name: 'Grand Archive',
    formats: ['omnideck'],
    options: [],
    websites: [{ name: 'Omnideck', url: 'https://omnideck.org' }]
  },
  {
    id: 'flesh_and_blood',
    name: 'Flesh and Blood',
    formats: ['fabrary'],
    options: [],
    websites: [{ name: 'Fabrary', url: 'https://fabrary.net' }]
  },
  {
    id: 'final_fantasy',
    name: 'Final Fantasy',
    formats: ['octgn_xml', 'tts', 'untap'],
    options: [],
    websites: [{ name: 'FF Decks', url: 'https://ffdecks.com/' }]
  },
  {
    id: 'elestrals',
    name: 'Elestrals',
    formats: ['elestrals'],
    options: [],
    websites: [{ name: 'Elestrals', url: 'https://elestrals.com/' }]
  },
  {
    id: 'echoes_of_astra',
    name: 'Echoes of Astra',
    formats: ['astrabuilder_url'],
    options: [],
    websites: [{ name: 'Astra Builder', url: 'https://astrabuilder.com/' }]
  },
  {
    id: 'digimon',
    name: 'Digimon',
    formats: ['digimoncardapp', 'digimoncarddev', 'digimoncardio', 'digimonmeta', 'tts', 'untap'],
    options: [],
    websites: [
      { name: 'Digimoncard.dev', url: 'https://digimoncard.dev/' },
      { name: 'Digimoncard.app', url: 'https://digimoncard.app/' }
    ]
  },
  {
    id: 'ashes_reborn',
    name: 'Ashes Reborn',
    formats: ['ashes_share_url', 'ashesdb_share_url'],
    options: [
      { label: 'Image Source', flag: '--source', type: 'select', choices: ['ashes', 'ashesdb'] }
    ],
    websites: [{ name: 'Ashes.live', url: 'https://ashes.live/' }]
  },
  {
    id: 'altered',
    name: 'Altered',
    formats: ['ajordat'],
    options: [],
    websites: [{ name: 'Altered', url: 'https://altered.gg/' }]
  },
  {
    id: 'bushiroad',
    name: 'Bushiroad',
    formats: ['bushiroad_url'],
    options: [],
    websites: [{ name: 'Deck Log', url: 'https://decklog.bushiroad.com/' }]
  },
  {
    id: 'yugioh',
    name: 'Yu-Gi-Oh!',
    formats: ['ydke', 'ydk'],
    options: [],
    websites: [{ name: 'YGOProDeck', url: 'https://ygoprodeck.com/' }]
  },
  {
    id: 'lotr_lcg',
    name: 'The Lord of the Rings: The Card Game',
    formats: ['ringsdb_url', 'ringsdb_decklist', 'hallofbeorn_url'],
    options: [
      { label: 'Scenario Mode', flag: '--scenario_mode', type: 'select', choices: ['normal', 'easy', 'nightmare'] }
    ],
    websites: [
      { name: 'RingsDB', url: 'https://ringsdb.com/' },
      { name: 'Hall of Beorn', url: 'https://hallofbeorn.com/' }
    ]
  },
  {
    id: 'keyforge',
    name: 'KeyForge',
    formats: ['master_vault_url', 'decks_of_keyforge_url', 'csv'],
    options: [],
    websites: [
      { name: 'Master Vault', url: 'https://mastervault.com/' },
      { name: 'Decks of KeyForge', url: 'https://decksofkeyforge.com/' }
    ]
  },
  {
    id: 'arkham_horror_lcg',
    name: 'Arkham Horror: The Card Game',
    formats: ['arkhamdb_url', 'arkhamdb_decklist'],
    options: [],
    websites: [
      { name: 'ArkhamDB', url: 'https://arkhamdb.com/' }
    ]
  },
  {
    id: 'custom_script_upload',
    name: 'Custom Python Script',
    formats: ['script'],
    options: [
      { label: 'Script Arguments (space separated)', flag: '--args', type: 'text' }
    ]
  }
];

interface PluginCardProviderInfo {
  id: string;
  providerName: string;
  defaultQuery: string;
  tabLabel: string;
  hasBacks?: boolean;
}

export const INGESTION_SUPPORTED_PLUGINS = new Set<string>([
  'mtg',
  'pokemon',
  'yugioh',
  'lorcana',
  'one_piece',
  'star_wars_unlimited',
  'sorcery_contested_realm',
  'digimon',
  'netrunner',
  'final_fantasy',
  'arkham_horror_lcg',
  'lotr_lcg',
  'ashes_reborn',
  'echoes_of_astra',
  'keyforge',
  'grand_archive',
  'flesh_and_blood',
  'gundam'
]);

export const pluginSupportsCardIngestion = (pluginId?: string): boolean => {
  if (!pluginId) return false;
  return INGESTION_SUPPORTED_PLUGINS.has(pluginId.toLowerCase());
};

const PLUGIN_CARD_PROVIDERS: Record<string, PluginCardProviderInfo> = {
  mtg: {
    id: 'mtg',
    providerName: 'Scryfall / MPC',
    defaultQuery: 'Sol Ring',
    tabLabel: 'Scryfall',
    hasBacks: true
  },
  pokemon: {
    id: 'pokemon',
    providerName: 'Limitless TCG',
    defaultQuery: 'Pikachu',
    tabLabel: 'Limitless TCG'
  },
  yugioh: {
    id: 'yugioh',
    providerName: 'YGOPRODeck',
    defaultQuery: 'Dark Magician',
    tabLabel: 'YGOPRODeck'
  },
  lorcana: {
    id: 'lorcana',
    providerName: 'Lorcast',
    defaultQuery: 'Mickey Mouse',
    tabLabel: 'Lorcast'
  },
  one_piece: {
    id: 'one_piece',
    providerName: 'Limitless OPTCG',
    defaultQuery: 'Monkey.D.Luffy',
    tabLabel: 'Limitless OPTCG'
  },
  oneproxy: {
    id: 'oneproxy',
    providerName: 'OneProxy (Local Assets)',
    defaultQuery: '',
    tabLabel: 'OneProxy (Local)'
  },
  star_wars_unlimited: {
    id: 'star_wars_unlimited',
    providerName: 'SWUDB',
    defaultQuery: 'Luke Skywalker',
    tabLabel: 'SWUDB'
  },
  digimon: {
    id: 'digimon',
    providerName: 'Digimoncard',
    defaultQuery: 'Agumon',
    tabLabel: 'Digimoncard'
  },
  netrunner: {
    id: 'netrunner',
    providerName: 'NetrunnerDB',
    defaultQuery: 'Sure Gamble',
    tabLabel: 'NetrunnerDB'
  },
  final_fantasy: {
    id: 'final_fantasy',
    providerName: 'FFTCG',
    defaultQuery: 'Cloud',
    tabLabel: 'FFTCG'
  },
  arkham_horror_lcg: {
    id: 'arkham_horror_lcg',
    providerName: 'ArkhamDB',
    defaultQuery: 'Machete',
    tabLabel: 'ArkhamDB'
  },
  lotr_lcg: {
    id: 'lotr_lcg',
    providerName: 'RingsDB',
    defaultQuery: 'Gandalf',
    tabLabel: 'RingsDB'
  },
  ashes_reborn: {
    id: 'ashes_reborn',
    providerName: 'Ashes.live',
    defaultQuery: 'Chant',
    tabLabel: 'Ashes.live'
  },
  keyforge: {
    id: 'keyforge',
    providerName: 'Archon Arcana',
    defaultQuery: 'Bad Penny',
    tabLabel: 'Archon Arcana'
  },
  grand_archive: {
    id: 'grand_archive',
    providerName: 'GATCG',
    defaultQuery: 'Lorraine',
    tabLabel: 'GATCG'
  },
  flesh_and_blood: {
    id: 'flesh_and_blood',
    providerName: 'FAB Cube (LSS)',
    defaultQuery: 'Command and Conquer',
    tabLabel: 'FAB Cube'
  },
  gundam: {
    id: 'gundam',
    providerName: 'Bandai Official',
    defaultQuery: 'ST01-001',
    tabLabel: 'Bandai Official'
  },
  sorcery_contested_realm: {
    id: 'sorcery_contested_realm',
    providerName: 'Curiosa',
    defaultQuery: 'Pudge Butcher',
    tabLabel: 'Curiosa'
  },
  echoes_of_astra: {
    id: 'echoes_of_astra',
    providerName: 'Astra Builder',
    defaultQuery: 'Cadaver Supplier',
    tabLabel: 'Astra Builder'
  }
};

const getPluginCardProvider = (pluginId?: string, format?: string): PluginCardProviderInfo => {
  if (pluginId === 'one_piece' && format === 'oneproxy') {
    return PLUGIN_CARD_PROVIDERS.oneproxy;
  }
  if (pluginId && PLUGIN_CARD_PROVIDERS[pluginId]) {
    return PLUGIN_CARD_PROVIDERS[pluginId];
  }
  return PLUGIN_CARD_PROVIDERS.mtg;
};

interface AppStatus {
  installed: boolean;
  version: string;
  rootDir: string;
  pythonFound: boolean;
  dependenciesOk: boolean;
  assets?: AssetData;
  library?: AssetData;
  plugins?: AssetData;
  savedProjects?: string[];
  integrityOk?: boolean;
  isElectron?: boolean;
  libraryPath?: string;
  userDataPath?: string;
}

const LightboxGallery = ({
  initialImage,
  onClose,
  onUpscaleSingle,
  disableUpscale = false
}: {
  initialImage: string;
  onClose: () => void;
  onUpscaleSingle?: (src: string) => Promise<void>;
  disableUpscale?: boolean;
}) => {
  const [currentImage, setCurrentImage] = useState(initialImage);
  const [allImages, setAllImages] = useState<string[]>([]);
  const [isFlipped, setIsFlipped] = useState(false);
  const [backSrc, setBackSrc] = useState<string | null>(null);

  // Zoom & Pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const hasPannedRef = useRef(false);
  const zoomContentRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Before / After Comparison state
  const [hasOriginal, setHasOriginal] = useState(false);
  const [originalSrc, setOriginalSrc] = useState<string | null>(null);
  const [isComparing, setIsComparing] = useState(true);
  const [sliderPos, setSliderPos] = useState(50); // percentage 0 to 100
  const [isDragging, setIsDragging] = useState(false);
  const [imageStats, setImageStats] = useState<{ origSize?: number; currentSize?: number } | null>(null);
  const [isUpscalingSingle, setIsUpscalingSingle] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Clamp pan boundaries to ensure card never detaches or flies off-screen
  const clampPan = useCallback((rawX: number, rawY: number, targetZoom: number) => {
    if (targetZoom <= 1.02 || !zoomContentRef.current) {
      return { x: 0, y: 0 };
    }
    const rect = zoomContentRef.current.getBoundingClientRect();
    const unscaledW = rect.width / (targetZoom > 1 ? targetZoom : 1);
    const unscaledH = rect.height / (targetZoom > 1 ? targetZoom : 1);
    const maxPanX = Math.max(0, (unscaledW * (targetZoom - 1)) / 2);
    const maxPanY = Math.max(0, (unscaledH * (targetZoom - 1)) / 2);
    return {
      x: Math.max(-maxPanX, Math.min(maxPanX, rawX)),
      y: Math.max(-maxPanY, Math.min(maxPanY, rawY))
    };
  }, []);

  // Wheel zoom listener with passive: false to reliably zoom towards mouse cursor
  useEffect(() => {
    const modalEl = modalRef.current;
    if (!modalEl) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const factor = e.deltaY < 0 ? 1.15 : 0.87;

      setZoom(prevZoom => {
        let nextZoom = prevZoom * factor;
        if (nextZoom <= 1.02) {
          setPan({ x: 0, y: 0 });
          return 1;
        }
        if (nextZoom > 8) {
          nextZoom = 8;
        }

        // Adjust pan so the position under the mouse cursor remains stationary
        if (zoomContentRef.current) {
          const rect = zoomContentRef.current.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const mouseOffsetX = e.clientX - centerX;
          const mouseOffsetY = e.clientY - centerY;

          const zoomRatio = nextZoom / prevZoom;
          setPan(p => {
            const rawX = p.x - mouseOffsetX * (zoomRatio - 1);
            const rawY = p.y - mouseOffsetY * (zoomRatio - 1);
            return clampPan(rawX, rawY, nextZoom);
          });
        }

        return nextZoom;
      });
    };

    modalEl.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      modalEl.removeEventListener('wheel', onWheel);
    };
  }, [clampPan]);

  // Mouse drag panning - ONLY allowed when zoomed in (zoom > 1.02); card remains locked/centered at 100%
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1.02) return;
    if (e.button === 0) {
      e.stopPropagation();
      setIsPanning(true);
      hasPannedRef.current = false;
      panStartRef.current = {
        x: e.clientX - pan.x,
        y: e.clientY - pan.y
      };
    }
  };

  useEffect(() => {
    if (!isPanning) return;

    const onMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      const rawX = e.clientX - panStartRef.current.x;
      const rawY = e.clientY - panStartRef.current.y;
      if (Math.abs(rawX - pan.x) > 3 || Math.abs(rawY - pan.y) > 3) {
        hasPannedRef.current = true;
      }
      setPan(clampPan(rawX, rawY, zoom));
    };

    const onMouseUp = () => {
      setIsPanning(false);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isPanning, pan.x, pan.y, zoom, clampPan]);

  const handleTouchStartOnZoom = (e: React.TouchEvent) => {
    if (zoom <= 1.02) return;
    if (e.touches.length === 1) {
      setIsPanning(true);
      hasPannedRef.current = false;
      panStartRef.current = {
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y
      };
    }
  };

  const handleTouchMoveOnZoom = (e: React.TouchEvent) => {
    if (isPanning && e.touches.length === 1) {
      const rawX = e.touches[0].clientX - panStartRef.current.x;
      const rawY = e.touches[0].clientY - panStartRef.current.y;
      if (Math.abs(rawX - pan.x) > 3 || Math.abs(rawY - pan.y) > 3) {
        hasPannedRef.current = true;
      }
      setPan(clampPan(rawX, rawY, zoom));
    }
  };

  const handleTouchEndOnZoom = () => {
    setIsPanning(false);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (zoom > 1.02) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    } else {
      setZoom(2.5);
    }
  };

  useEffect(() => {
    const allElements = Array.from(document.querySelectorAll<HTMLElement>('.lightbox-trigger'));
    const initialEl = allElements.find(el => el.getAttribute('data-enlarge-src') === initialImage);
    const group = initialEl?.getAttribute('data-lightbox-group');

    let filteredElements = allElements;
    if (group) {
      filteredElements = allElements.filter(el => el.getAttribute('data-lightbox-group') === group);
    }

    setAllImages(filteredElements
      .map(el => el.getAttribute('data-enlarge-src') as string)
      .filter(Boolean));

    const bSrc = initialEl?.getAttribute('data-back-src');
    setBackSrc(bSrc || null);
    setIsFlipped(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [initialImage]);

  // When currentImage changes, update backSrc
  useEffect(() => {
    const allElements = Array.from(document.querySelectorAll<HTMLElement>('.lightbox-trigger'));
    const matchEl = allElements.find(el => el.getAttribute('data-enlarge-src') === currentImage);
    const bSrc = matchEl?.getAttribute('data-back-src');
    setBackSrc(bSrc || null);
    setIsFlipped(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [currentImage]);

  const displaySrc = isFlipped && backSrc ? backSrc : currentImage;

  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    setDimensions(null);
  }, [displaySrc]);

  const originalCache = useRef<Record<string, { hasOriginal: boolean; originalUrl?: string; originalSize?: number; currentSize?: number }>>({});

  // Check if original backup exists for active image
  const checkOriginal = useCallback(async (targetSrc: string, forceFresh = false) => {
    if (disableUpscale || !targetSrc || targetSrc.startsWith('http') || targetSrc.startsWith('data:') || targetSrc.startsWith('blob:')) {
      setHasOriginal(false);
      setOriginalSrc(null);
      setImageStats(null);
      return;
    }

    if (!forceFresh && originalCache.current[targetSrc]) {
      const data = originalCache.current[targetSrc];
      if (data.hasOriginal) {
        setHasOriginal(true);
        setOriginalSrc(`${data.originalUrl}&t=${Date.now()}`);
        setImageStats({ origSize: data.originalSize, currentSize: data.currentSize });
        setIsComparing(true);
      } else {
        setHasOriginal(false);
        setOriginalSrc(null);
        setImageStats(null);
      }
      return;
    }

    try {
      const res = await fetch(`/api/asset/has-original?url=${encodeURIComponent(targetSrc)}`);
      const data = await res.json();
      originalCache.current[targetSrc] = data;
      if (data.hasOriginal) {
        setHasOriginal(true);
        setOriginalSrc(`${data.originalUrl}&t=${Date.now()}`);
        setImageStats({ origSize: data.originalSize, currentSize: data.currentSize });
        setIsComparing(true);
      } else {
        setHasOriginal(false);
        setOriginalSrc(null);
        setImageStats(null);
      }
    } catch {
      setHasOriginal(false);
      setOriginalSrc(null);
      setImageStats(null);
    }
  }, [disableUpscale]);

  useEffect(() => {
    checkOriginal(displaySrc);
  }, [displaySrc, checkOriginal]);

  const updateSliderFromClientX = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const offset = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (offset / rect.width) * 100));
    setSliderPos(pct);
  }, []);

  const handleStartDrag = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    updateSliderFromClientX(clientX);
  };

  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      updateSliderFromClientX(e.clientX);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches && e.touches.length > 0) {
        updateSliderFromClientX(e.touches[0].clientX);
      }
    };

    const onStopDrag = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onStopDrag);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onStopDrag);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onStopDrag);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onStopDrag);
    };
  }, [isDragging, updateSliderFromClientX]);

  const goPrev = useCallback((e?: React.MouseEvent | KeyboardEvent) => {
    e?.stopPropagation();
    const idx = allImages.indexOf(currentImage);
    if (idx > 0) {
      setCurrentImage(allImages[idx - 1]);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [currentImage, allImages]);

  const goNext = useCallback((e?: React.MouseEvent | KeyboardEvent) => {
    e?.stopPropagation();
    const idx = allImages.indexOf(currentImage);
    if (idx !== -1 && idx < allImages.length - 1) {
      setCurrentImage(allImages[idx + 1]);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [currentImage, allImages]);

  const toggleFlip = useCallback((e?: React.MouseEvent | KeyboardEvent) => {
    e?.stopPropagation();
    if (backSrc) {
      setIsFlipped(f => !f);
      setPan({ x: 0, y: 0 });
    }
  }, [backSrc]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev(e);
      if (e.key === 'ArrowRight') goNext(e);
      if (e.key === 'Escape') onClose();
      if ((e.key === 'f' || e.key === 'F' || e.key === ' ') && backSrc) {
        e.preventDefault();
        toggleFlip(e);
      }
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setZoom(z => Math.min(8, z * 1.25));
      }
      if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setZoom(z => {
          const next = Math.max(1, z / 1.25);
          if (next <= 1.02) {
            setPan({ x: 0, y: 0 });
            return 1;
          }
          return next;
        });
      }
      if (e.key === '0') {
        e.preventDefault();
        setZoom(1);
        setPan({ x: 0, y: 0 });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goPrev, goNext, onClose, toggleFlip, backSrc]);

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    if (zoom > 1) return;
    if (hasOriginal && isComparing) return;
    setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (zoom > 1) return;
    if (hasOriginal && isComparing) return;
    if (touchStart === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    if (diff > 50) goNext();
    if (diff < -50) goPrev();
    setTouchStart(null);
  };

  const currentIndex = allImages.indexOf(currentImage);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex !== -1 && currentIndex < allImages.length - 1;

  const handleUpscaleCurrent = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disableUpscale || isUpscalingSingle || displaySrc.startsWith('http') || displaySrc.startsWith('data:') || displaySrc.startsWith('blob:')) return;
    setIsUpscalingSingle(true);
    try {
      if (onUpscaleSingle) {
        await onUpscaleSingle(displaySrc);
        const cleanBase = displaySrc.split('?')[0];
        const newSrc = `${cleanBase}?t=${Date.now()}`;
        if (isFlipped && backSrc) setBackSrc(newSrc);
        else setCurrentImage(newSrc);
        await checkOriginal(newSrc, true);
      }
    } finally {
      setIsUpscalingSingle(false);
    }
  };


  const handleRestoreCurrent = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disableUpscale || displaySrc.startsWith('http') || displaySrc.startsWith('data:') || displaySrc.startsWith('blob:')) return;
    if (!confirm('Revert this card to its original un-upscaled baseline?')) return;
    try {
      const res = await fetch('/api/asset/restore-original', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: displaySrc })
      });
      const data = await res.json();
      if (data.success) {
        const cleanBase = displaySrc.split('?')[0];
        const newSrc = `${cleanBase}?t=${Date.now()}`;
        if (isFlipped && backSrc) setBackSrc(newSrc);
        else setCurrentImage(newSrc);
        await checkOriginal(newSrc, true);
      }
    } catch { }
  };

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-black/95 backdrop-blur-md p-4 md:p-8 select-none overflow-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget && !hasPannedRef.current) {
          onClose();
        }
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Top Controls Bar */}
      <div className="absolute top-6 right-6 flex items-center gap-3 z-30">
        {/* Zoom Controls Pill */}
        <div className="flex items-center bg-white/10 backdrop-blur-md rounded-xl p-1 border border-white/15 text-xs text-white shadow-lg">
          <button
            type="button"
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/15 active:scale-95 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition-all"
            disabled={zoom <= 1}
            onClick={(e) => {
              e.stopPropagation();
              setZoom(z => {
                const next = Math.max(1, z / 1.25);
                if (next <= 1.02) {
                  setPan({ x: 0, y: 0 });
                  return 1;
                }
                return next;
              });
            }}
            title="Zoom Out (Scroll Down / Key: -)"
          >
            <ZoomOut size={14} />
          </button>
          <button
            type="button"
            className="px-2 h-7 font-mono font-bold text-[11px] hover:bg-white/15 rounded-lg transition-all cursor-pointer flex items-center gap-1"
            onClick={(e) => {
              e.stopPropagation();
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            title="Reset Zoom (100% / Key: 0 / Double-click image)"
          >
            <span>{Math.round(zoom * 100)}%</span>
            {zoom > 1 && <span className="text-[9px] opacity-70 text-primary-300">Reset</span>}
          </button>
          <button
            type="button"
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/15 active:scale-95 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition-all"
            disabled={zoom >= 8}
            onClick={(e) => {
              e.stopPropagation();
              setZoom(z => Math.min(8, z * 1.25));
            }}
            title="Zoom In (Scroll Up / Key: +)"
          >
            <ZoomIn size={14} />
          </button>
        </div>

        {!disableUpscale && hasOriginal && (
          <button
            type="button"
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border cursor-pointer active:scale-95",
              isComparing
                ? "bg-primary-600 border-primary-400 text-white shadow-lg shadow-primary-600/30"
                : "bg-white/10 border-white/20 text-white/70 hover:text-white hover:bg-white/15"
            )}
            onClick={(e) => {
              e.stopPropagation();
              setIsComparing(c => !c);
            }}
            title="Toggle interactive Before/After comparison slider"
          >
            <SlidersHorizontal size={14} />
            <span className="hidden sm:inline">{isComparing ? 'Split Slider Active' : 'Enable Split Slider'}</span>
          </button>
        )}

        {!disableUpscale && hasOriginal && (
          <button
            type="button"
            className="px-3 py-2 bg-white/10 hover:bg-white/15 text-white/70 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-white/10 active:scale-95 cursor-pointer"
            onClick={handleRestoreCurrent}
            title="Revert this card to original un-upscaled image"
          >
            <RotateCcw size={13} />
            <span className="hidden sm:inline">Revert to Orig</span>
          </button>
        )}

        {!disableUpscale && !hasOriginal && onUpscaleSingle && !displaySrc.startsWith('http') && !displaySrc.startsWith('data:') && !displaySrc.startsWith('blob:') && (
          <button
            type="button"
            className="px-3.5 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-primary-600/30 active:scale-95 cursor-pointer disabled:opacity-50"
            disabled={isUpscalingSingle}
            onClick={handleUpscaleCurrent}
            title="Upscale this card now with Upscayl AI"
          >
            {isUpscalingSingle ? <Loader2 size={14} className="animate-spin" /> : <Maximize2 size={14} />}
            <span>{isUpscalingSingle ? 'Upscaling Card...' : 'Upscale Card (HD)'}</span>
          </button>
        )}


        {backSrc && (
          <button
            type="button"
            className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 border border-white/20 active:scale-95 cursor-pointer"
            onClick={toggleFlip}
            title="Flip card (or press F / Space)"
          >
            <RotateCcw size={15} className={cn("transition-transform duration-300", isFlipped && "-rotate-180")} />
            <span>Flip ({isFlipped ? 'Back' : 'Front'})</span>
          </button>
        )}

        <button
          type="button"
          className="p-2 text-white/50 hover:text-white transition-colors bg-white/5 rounded-full hover:bg-white/10 cursor-pointer"
          onClick={onClose}
          title="Close (Esc)"
        >
          <X size={24} />
        </button>
      </div>

      {/* Prev Navigation Button */}
      <button
        type="button"
        className={`absolute left-2 md:left-6 p-2 transition-colors z-20 ${hasPrev ? 'text-white/30 hover:text-white cursor-pointer' : 'text-white/10 cursor-not-allowed'}`}
        onClick={goPrev}
        disabled={!hasPrev}
        title="Previous card (Left Arrow)"
      >
        <ChevronLeft size={48} strokeWidth={1.5} />
      </button>

      {/* Main Image Container */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1, rotateY: isFlipped ? 180 : 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 200 }}
        className="relative max-h-full max-w-full outline-none flex flex-col items-center justify-center perspective-1000"
      >
        <div
          ref={zoomContentRef}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStartOnZoom}
          onTouchMove={handleTouchMoveOnZoom}
          onTouchEnd={handleTouchEndOnZoom}
          onDoubleClick={handleDoubleClick}
          className={cn(
            "relative select-none flex items-center justify-center max-h-[82vh] max-w-full",
            !isPanning && "transition-transform duration-100",
            zoom > 1.02 ? (isPanning ? "cursor-grabbing" : "cursor-grab") : "cursor-default"
          )}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center'
          }}
        >
          {!disableUpscale && hasOriginal && isComparing && originalSrc ? (
            /* INTERACTIVE REAL-TIME BEFORE / AFTER COMPARISON SLIDER */
            <div
              ref={containerRef}
              onMouseDown={(e) => {
                if (zoom <= 1.02) {
                  handleStartDrag(e);
                }
              }}
              onTouchStart={(e) => {
                if (zoom <= 1.02) {
                  handleStartDrag(e);
                }
              }}
              className={cn(
                "relative max-h-[82vh] max-w-full select-none group/compare overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/15",
                zoom <= 1.02 ? "cursor-ew-resize" : ""
              )}
            >
              {/* Base Layer: After (Upscaled HD) */}
              <img
                src={displaySrc}
                alt="Upscaled asset"
                onLoad={(e) => {
                  const img = e.currentTarget;
                  if (img.naturalWidth && img.naturalHeight) {
                    setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
                  }
                }}
                className={cn(
                  "max-h-[82vh] max-w-full object-contain block pointer-events-none select-none",
                  isFlipped && "[transform:scaleX(-1)]"
                )}
                draggable={false}
              />

              {/* Overlaid Layer: Before (Original Pre-Upscale) clipped in real-time */}
              <div
                className="absolute inset-0 overflow-hidden pointer-events-none select-none"
                style={{
                  clipPath: `inset(0 ${(100 - sliderPos).toFixed(2)}% 0 0)`
                }}
              >
                <img
                  src={originalSrc}
                  alt="Original asset"
                  className={cn(
                    "w-full h-full object-contain pointer-events-none select-none",
                    isFlipped && "[transform:scaleX(-1)]"
                  )}
                  draggable={false}
                />
              </div>

              {/* Draggable Divider Bar */}
              <div
                className="absolute top-0 bottom-0 pointer-events-none z-20"
                style={{ left: `${sliderPos.toFixed(2)}%` }}
              >
                <div className="absolute top-0 bottom-0 -left-[1.5px] w-[3px] bg-white shadow-[0_0_12px_rgba(0,0,0,0.85)] pointer-events-none" />
                {/* Dedicated Interactive Hit Area for the Divider Line */}
                <div
                  className="absolute top-0 bottom-0 -left-3 w-6 pointer-events-auto cursor-ew-resize"
                  onMouseDown={handleStartDrag}
                  onTouchStart={handleStartDrag}
                  title="Drag left/right to compare Before and After"
                />
                <div
                  className={cn(
                    "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-primary-600 text-white shadow-2xl flex items-center justify-center border-2 border-white pointer-events-auto cursor-ew-resize transition-transform duration-100",
                    isDragging ? "scale-115 shadow-primary-500/50 ring-4 ring-primary-500/40" : "hover:scale-110"
                  )}
                  onMouseDown={handleStartDrag}
                  onTouchStart={handleStartDrag}
                  title="Drag left/right to compare Before (Original) and After (Upscayl AI)"
                >
                  <div className="flex items-center gap-0.5">
                    <ChevronLeft size={14} className="stroke-[3] -mr-1" />
                    <ChevronRight size={14} className="stroke-[3] -ml-1" />
                  </div>
                </div>
              </div>

              {/* Before (Original) Floating Badge */}
              <div
                className={cn(
                  "absolute top-4 left-4 z-20 px-3 py-1.5 rounded-full bg-black/80 backdrop-blur-md border border-white/20 text-white flex items-center gap-1.5 shadow-xl transition-opacity pointer-events-none",
                  sliderPos < 15 ? "opacity-20" : "opacity-95"
                )}
              >
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-wider">Before (Original)</span>
              </div>

              {/* After (Upscayl AI) Floating Badge */}
              <div
                className={cn(
                  "absolute top-4 right-4 z-20 px-3 py-1.5 rounded-full bg-primary-600/95 backdrop-blur-md border border-primary-400 text-white flex items-center gap-1.5 shadow-xl shadow-primary-600/30 transition-opacity pointer-events-none",
                  sliderPos > 85 ? "opacity-20" : "opacity-100"
                )}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-[10px] font-black uppercase tracking-wider">After (Upscayl AI HD)</span>
              </div>
            </div>
          ) : (
            /* STANDARD ENLARGED IMAGE */
            <img
              src={displaySrc}
              alt="Enlarged asset"
              onLoad={(e) => {
                const img = e.currentTarget;
                if (img.naturalWidth && img.naturalHeight) {
                  setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
                }
              }}
              className={cn(
                "max-h-[82vh] max-w-full object-contain rounded-2xl shadow-2xl pointer-events-auto transition-transform duration-300",
                isFlipped && "[transform:scaleX(-1)]"
              )}
              onClick={(e) => {
                e.stopPropagation();
                if (hasPannedRef.current) return;
                if (backSrc) toggleFlip(e);
              }}
            />
          )}
        </div>

        {/* Resolution & File Size Stats Badge - Outside card frame so it NEVER blocks card image */}
        {Boolean(dimensions || (!disableUpscale && imageStats?.origSize && imageStats?.currentSize)) && (
          <div className="mt-3.5 px-4 py-1.5 rounded-full bg-[#121318]/90 backdrop-blur-md border border-white/15 text-white/90 text-xs font-mono pointer-events-none flex items-center gap-2.5 shadow-2xl z-30 select-none">
            {dimensions && (
              <span className="text-white font-semibold">{dimensions.width} × {dimensions.height} px</span>
            )}
            {dimensions && Boolean(!disableUpscale && imageStats?.origSize && imageStats?.currentSize && imageStats.origSize > 0) && (
              <span className="text-white/20">•</span>
            )}
            {Boolean(!disableUpscale && imageStats?.origSize && imageStats?.currentSize && imageStats.origSize > 0) && (
              <>
                <span className="text-white/60">Orig: <strong className="text-white font-semibold">{((imageStats?.origSize || 0) / 1024).toFixed(0)} KB</strong></span>
                <span className="text-white/20">•</span>
                <span className="text-primary-400 font-bold">Upscaled HD: {((imageStats?.currentSize || 0) / 1024).toFixed(0)} KB ({(((imageStats?.currentSize || 0) / (imageStats?.origSize || 1))).toFixed(1)}x detail)</span>
              </>
            )}
            {zoom > 1 && (
              <>
                <span className="text-white/20">•</span>
                <span className="text-primary-400 font-bold">Zoom: {Math.round(zoom * 100)}%</span>
              </>
            )}
          </div>
        )}
      </motion.div>

      {/* Next Navigation Button */}
      <button
        type="button"
        className={`absolute right-2 md:right-6 p-2 transition-colors z-20 ${hasNext ? 'text-white/30 hover:text-white cursor-pointer' : 'text-white/10 cursor-not-allowed'}`}
        onClick={goNext}
        disabled={!hasNext}
        title="Next card (Right Arrow)"
      >
        <ChevronRight size={48} strokeWidth={1.5} />
      </button>
    </div>
  );
};



export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [assetViewMode, setAssetViewMode] = useState<'project' | 'library' | 'plugins'>('project');
  const [status, setStatus] = useState<AppStatus | null>(null);
  const [logs, setLogs] = useState<string[]>(["[System] Initializing Silhouette Master Virtual Bridge..."]);
  const [isPdfPresetsOpen, setIsPdfPresetsOpen] = useState(false);
  const [isOffsetPresetsOpen, setIsOffsetPresetsOpen] = useState(false);
  const [isPluginPresetsOpen, setIsPluginPresetsOpen] = useState(false);
  const [isProjectPresetsOpen, setIsProjectPresetsOpen] = useState(false);

  const [appIcon, setAppIcon] = useState<string | null>(null);

  useEffect(() => {
    fetch('/icon.png', { method: 'HEAD' })
      .then(res => {
        if (res.ok) {
          setAppIcon('/icon.png');
        }
      })
      .catch(() => { });
  }, []);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('scm_sidebar_collapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('scm_sidebar_collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  const [fileUndoStack, setFileUndoStack] = useState<any[]>([]);

  // History State for Undo/Redo
  const [historyState, setHistoryState] = useState<{
    items: { cmdOptions: any, pluginState: any }[],
    index: number
  }>({
    items: [],
    index: -1
  });
  const isInternalUpdate = useRef(false);

  const saveToHistory = useCallback((options: any, pState: any) => {
    setHistoryState(prev => {
      const { items, index } = prev;
      const nextItems = items.slice(0, index + 1);
      const snapshot = JSON.parse(JSON.stringify({ cmdOptions: options, pluginState: pState }));

      if (nextItems.length > 0) {
        const last = nextItems[nextItems.length - 1];
        if (JSON.stringify(last.cmdOptions) === JSON.stringify(snapshot.cmdOptions) &&
          JSON.stringify(last.pluginState) === JSON.stringify(snapshot.pluginState)) {
          return prev;
        }
      }

      nextItems.push(snapshot);
      if (nextItems.length > 100) nextItems.shift();
      return {
        items: nextItems,
        index: nextItems.length - 1
      };
    });
  }, []);

  const handleUndo = useCallback(async () => {
    if (activeTab === 'assets') {
      if (fileUndoStack.length === 0) return;
      const lastAction = fileUndoStack[fileUndoStack.length - 1];
      setFileUndoStack(prev => prev.slice(0, prev.length - 1));

      try {
        if (lastAction.action === 'delete') {
          await fetch('/api/restore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: lastAction.items, assetViewMode: lastAction.assetViewMode })
          });
          addLog(`[System] Undid delete of ${lastAction.items.length} item(s).`);
        } else if (lastAction.action === 'duplicate' || lastAction.action === 'import') {
          // Both are "create" actions, so we delete them
          const identities = lastAction.items;
          const viewMode = lastAction.action === 'duplicate' ? lastAction.assetViewMode : lastAction.destination;
          await fetch('/api/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identity: identities, assetViewMode: viewMode })
          });
          addLog(`[System] Undid ${lastAction.action} of ${identities.length} item(s).`);
        }
        await fetchStatus();
      } catch (err) {
        addLog(`[Error] File undo failed: ${err}`);
      }
    } else {
      setHistoryState(prev => {
        if (prev.index > 0) {
          const prevIdx = prev.index - 1;
          const prevState = prev.items[prevIdx];
          isInternalUpdate.current = true;
          setCmdOptions(prevState.cmdOptions);
          isInternalUpdate.current = true;
          setPluginState(prevState.pluginState);
          addLog("[System] Undo performed.");
          return { ...prev, index: prevIdx };
        }
        return prev;
      });
    }
  }, [activeTab, fileUndoStack]);

  const handleRedo = useCallback(() => {
    if (activeTab === 'assets') {
      // Redo for assets not supported yet
      return;
    }
    setHistoryState(prev => {
      if (prev.index < prev.items.length - 1) {
        const nextIdx = prev.index + 1;
        const nextState = prev.items[nextIdx];
        isInternalUpdate.current = true;
        setCmdOptions(nextState.cmdOptions);
        isInternalUpdate.current = true;
        setPluginState(nextState.pluginState);
        addLog("[System] Redo performed.");
        return { ...prev, index: nextIdx };
      }
      return prev;
    });
  }, [activeTab]);

  // Computed state
  const getCurrentAssets = () => {
    if (assetViewMode === 'project') return status?.assets;
    if (assetViewMode === 'library') return status?.library;
    if (assetViewMode === 'plugins') return status?.plugins;
    return undefined;
  };
  const [assetSearch, setAssetSearch] = useState("");
  const [assetFilter, setAssetFilter] = useState<'all' | 'front' | 'back' | 'double_sided'>('all');
  const [pluginSearch, setPluginSearch] = useState("");
  const [verifyResult, setVerifyResult] = useState<{ missing: number, restored: number, check: string } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, name: string, type?: string } | null>(null);
  const [isCardArtSubmenuOpen, setIsCardArtSubmenuOpen] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [isDragSelecting, setIsDragSelecting] = useState(false);

  const dragState = useRef({
    isSelecting: false,
    startCard: null as string | null,
    initialSelection: new Set<string>(),
    scrollAnimationId: 0,
    scrollSpeed: 0,
    lastClientX: 0,
    lastClientY: 0
  });

  const handleDragStart = (name: string) => {
    setIsDragSelecting(true);
    dragState.current.startCard = name;
    dragState.current.initialSelection = new Set(selectedAssets);
    // Include the first card in the initial selection to guarantee it's highlighted immediately
    dragState.current.initialSelection.add(name);
    setSelectedAssets(new Set(dragState.current.initialSelection));
  };

  useEffect(() => {
    dragState.current.isSelecting = isDragSelecting;
    if (!isDragSelecting) {
      cancelAnimationFrame(dragState.current.scrollAnimationId);
      dragState.current.scrollSpeed = 0;
    } else {
      const checkSelection = (clientX: number, clientY: number) => {
        if (clientX === 0 && clientY === 0) return;
        const el = document.elementFromPoint(clientX, clientY);
        const assetEl = el?.closest('[data-asset-name]');
        if (assetEl && dragState.current.startCard) {
          const name = assetEl.getAttribute('data-asset-name');
          if (name) {
            const cards = Array.from(document.querySelectorAll('[data-asset-name]')).map(el => el.getAttribute('data-asset-name')!);
            const startIndex = cards.indexOf(dragState.current.startCard);
            const currentIndex = cards.indexOf(name);

            if (startIndex !== -1 && currentIndex !== -1) {
              const min = Math.min(startIndex, currentIndex);
              const max = Math.max(startIndex, currentIndex);
              const rangeNames = cards.slice(min, max + 1);

              setSelectedAssets(() => {
                const next = new Set(dragState.current.initialSelection);
                rangeNames.forEach(n => next.add(n));
                return next;
              });
            }
          }
        }
      };

      const scrollStep = () => {
        if (dragState.current.isSelecting && dragState.current.scrollSpeed !== 0) {
          const container = document.getElementById('main-scroll-container');
          if (container) {
            container.scrollTop += dragState.current.scrollSpeed;
          } else {
            window.scrollBy(0, dragState.current.scrollSpeed);
          }
          checkSelection(dragState.current.lastClientX, dragState.current.lastClientY);
        }
        if (dragState.current.isSelecting) {
          dragState.current.scrollAnimationId = requestAnimationFrame(scrollStep);
        }
      };
      dragState.current.scrollAnimationId = requestAnimationFrame(scrollStep);
    }
  }, [isDragSelecting]);

  useEffect(() => {
    const checkSelection = (clientX: number, clientY: number) => {
      if (clientX === 0 && clientY === 0) return;
      const el = document.elementFromPoint(clientX, clientY);
      const assetEl = el?.closest('[data-asset-name]');
      if (assetEl && dragState.current.startCard) {
        const name = assetEl.getAttribute('data-asset-name');
        if (name) {
          const cards = Array.from(document.querySelectorAll('[data-asset-name]')).map(el => el.getAttribute('data-asset-name')!);
          const startIndex = cards.indexOf(dragState.current.startCard);
          const currentIndex = cards.indexOf(name);

          if (startIndex !== -1 && currentIndex !== -1) {
            const min = Math.min(startIndex, currentIndex);
            const max = Math.max(startIndex, currentIndex);
            const rangeNames = cards.slice(min, max + 1);

            setSelectedAssets(() => {
              const next = new Set(dragState.current.initialSelection);
              rangeNames.forEach(n => next.add(n));
              return next;
            });
          }
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!dragState.current.isSelecting) return;
      e.preventDefault();
      const touch = e.touches[0];
      dragState.current.lastClientX = touch.clientX;
      dragState.current.lastClientY = touch.clientY;

      const EDGE_THRESHOLD = 200;
      const MAX_SPEED = 30;

      if (touch.clientY < EDGE_THRESHOLD) {
        dragState.current.scrollSpeed = -MAX_SPEED * (1 - touch.clientY / EDGE_THRESHOLD);
      } else if (window.innerHeight - touch.clientY < EDGE_THRESHOLD) {
        dragState.current.scrollSpeed = MAX_SPEED * (1 - (window.innerHeight - touch.clientY) / EDGE_THRESHOLD);
      } else {
        dragState.current.scrollSpeed = 0;
      }

      checkSelection(touch.clientX, touch.clientY);
    };

    const handleTouchEnd = () => {
      if (dragState.current.isSelecting) {
        setIsDragSelecting(false);
      }
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchEnd);
    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, []);
  const [flippedAssets, setFlippedAssets] = useState<Set<string>>(new Set());
  const [uploadedImages, setUploadedImages] = useState<Record<string, string>>({});
  const [cacheBusts, setCacheBusts] = useState<Record<string, number>>({});
  const [globalCacheBust, setGlobalCacheBust] = useState<number>(0);
  const [localAssets, setLocalAssets] = useState<Array<{ name: string, type: 'front' | 'back' | 'double_sided', view: 'project' | 'library' | 'plugins' }>>([]);
  const [isReplaceBackDialogOpen, setIsReplaceBackDialogOpen] = useState(false);
  const [pendingBackFile, setPendingBackFile] = useState<File | null>(null);
  const [manualFrontUploadTarget, setManualFrontUploadTarget] = useState<{
    name: string;
    type: 'front' | 'back' | 'double_sided';
    targets?: { name: string; type: 'front' | 'back' | 'double_sided' }[];
  } | null>(null);
  const manualFrontUploadInputRef = useRef<HTMLInputElement>(null);
  const [copiedBuffer, setCopiedBuffer] = useState<string[]>([]);
  const [lastSelected, setLastSelected] = useState<string | null>(null);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [pendingUploadItems, setPendingUploadItems] = useState<string[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [loadedProject, setLoadedProject] = useState<string | null>(null);
  const [pluginBoxCollapsed, setPluginBoxCollapsed] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showPluginSaveModal, setShowPluginSaveModal] = useState(false);
  const [showPluginLoadModal, setShowPluginLoadModal] = useState(false);
  const [pluginReadme, setPluginReadme] = useState<{ id: string, name: string, content: string } | null>(null);
  const [showPluginReadmeModal, setShowPluginReadmeModal] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  const fetchReadme = async (plugin: PluginConfig) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/plugin/${plugin.id}/readme`);
      if (res.ok) {
        const data = await res.json();
        setPluginReadme({ id: plugin.id, name: plugin.name, content: data.content });
        setShowPluginReadmeModal(true);
      } else {
        addLog(`[Error] Failed to load README for ${plugin.name}.`);
      }
    } catch (err) {
      addLog(`[Error] Failed to fetch README: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const [pluginSaveName, setPluginSaveName] = useState("");
  const [pluginConfigs, setPluginConfigs] = useState<Record<string, any>>({});
  const [showThemeSettings, setShowThemeSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'theme' | 'shortcuts' | 'system'>('theme');
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResponse | null>(null);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState<boolean>(false);
  const [hasUserCheckedUpdates, setHasUserCheckedUpdates] = useState<boolean>(false);
  const [isVersionPickerOpen, setIsVersionPickerOpen] = useState<boolean>(false);
  const [updateSettings, setUpdateSettings] = useState<{ autoCheck: boolean; includePrereleases: boolean; channel: string }>({
    autoCheck: true,
    includePrereleases: true,
    channel: 'all'
  });
  const [versionFilter, setVersionFilter] = useState<'all' | 'stable' | 'beta'>('all');
  const [expandedReleaseNotes, setExpandedReleaseNotes] = useState<Set<string>>(new Set());
  const [downloadState, setDownloadState] = useState<{
    isDownloading: boolean;
    tag: string;
    assetName: string;
    progress: number;
    downloadedBytes: number;
    totalBytes: number;
    status: 'idle' | 'downloading' | 'completed' | 'error';
    error: string | null;
  }>({
    isDownloading: false,
    tag: '',
    assetName: '',
    progress: 0,
    downloadedBytes: 0,
    totalBytes: 0,
    status: 'idle',
    error: null
  });
  const [updateStatusToast, setUpdateStatusToast] = useState<string | null>(null);

  const fetchUpdateSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/updates/settings');
      if (res.ok) {
        const data = await res.json();
        setUpdateSettings(data);
      }
    } catch (e) {}
  }, []);

  const handleSaveUpdateSetting = async (key: 'autoCheck' | 'includePrereleases', value: boolean) => {
    const next = { ...updateSettings, [key]: value };
    setUpdateSettings(next);
    try {
      await fetch('/api/updates/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next)
      });
    } catch (e) {}
  };

  const checkForUpdates = useCallback(async (manual = false, force = false) => {
    if (isCheckingUpdates) return;
    setIsCheckingUpdates(true);
    try {
      const res = await fetch(`/api/updates/check${force ? '?force=true' : ''}`);
      if (res.ok) {
        const data: UpdateCheckResponse = await res.json();
        setUpdateInfo(data);
        setHasUserCheckedUpdates(true);
        if (data.hasUpdate) {
          setUpdateStatusToast(`New update available: ${data.latestVersion}!`);
          setTimeout(() => setUpdateStatusToast(null), 6000);
        } else if (manual) {
          setUpdateStatusToast(`You are on the latest version (${data.currentVersion})!`);
          setTimeout(() => setUpdateStatusToast(null), 4000);
        }
      } else if (manual) {
        setHasUserCheckedUpdates(true);
        setUpdateStatusToast('Could not reach update server. Check internet connection.');
        setTimeout(() => setUpdateStatusToast(null), 4000);
      }
    } catch (e: any) {
      if (manual) {
        setHasUserCheckedUpdates(true);
        setUpdateStatusToast(`Update check failed: ${e?.message || 'Network error'}`);
        setTimeout(() => setUpdateStatusToast(null), 4000);
      }
    } finally {
      setIsCheckingUpdates(false);
    }
  }, [isCheckingUpdates]);

  useEffect(() => {
    fetchUpdateSettings();
    checkForUpdates(false);
    fetchOneProxyStatus();
  }, []);

  // OneProxy cache state and handlers
  const [oneProxyStatus, setOneProxyStatus] = useState<any>(null);
  const [oneProxyView, setOneProxyView] = useState<'options' | 'download_prompt' | 'downloading' | 'link_prompt' | 'ready'>('options');
  const [oneProxyDownloadPath, setOneProxyDownloadPath] = useState('');
  const [oneProxyBulkProgress, setOneProxyBulkProgress] = useState<any>(null);
  const [isStartingBulkDownload, setIsStartingBulkDownload] = useState(false);
  const [isCancellingBulkDownload, setIsCancellingBulkDownload] = useState(false);
  const [isSyncingOneProxy, setIsSyncingOneProxy] = useState(false);
  const [customCacheInput, setCustomCacheInput] = useState('');
  const [isEditingCachePath, setIsEditingCachePath] = useState(false);
  const [isSavingCachePath, setIsSavingCachePath] = useState(false);
  const [isBrowsingCachePath, setIsBrowsingCachePath] = useState(false);
  const [isBrowsingDownloadPath, setIsBrowsingDownloadPath] = useState(false);
  const [cacheConfigMsg, setCacheConfigMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const formatSize = (bytes: number): string => {
    if (!bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const fetchOneProxyStatus = async () => {
    try {
      const resp = await fetch('/api/oneproxy/status');
      if (resp.ok) {
        const data = await resp.json();
        setOneProxyStatus(data);
        if (data.cacheDir && !customCacheInput) {
          setCustomCacheInput(data.cacheDir);
        }
        if (data.defaultUserDir && !oneProxyDownloadPath) {
          setOneProxyDownloadPath(data.defaultUserDir);
        }
        if (data.bulkDownloadState?.isActive) {
          setOneProxyBulkProgress(data.bulkDownloadState);
          setOneProxyView('downloading');
        } else if (data.isBulkDownloaded || (data.hasCustomFolderConfigured && data.cachedImagesCount > 50)) {
          setOneProxyView(prev => (prev === 'options' ? 'ready' : prev));
        }
      }
    } catch (_) {}
  };

  useEffect(() => {
    if (oneProxyView !== 'downloading' && !oneProxyBulkProgress?.isActive) return;

    const interval = setInterval(async () => {
      try {
        const resp = await fetch('/api/oneproxy/download-progress');
        if (resp.ok) {
          const prog = await resp.json();
          setOneProxyBulkProgress(prog);
          if (prog.isCompleted) {
            fetchOneProxyStatus();
            setOneProxyView('ready');
            addLog(`[OneProxy] Download complete! ${prog.downloadedCards} cards downloaded.`);
          } else if (!prog.isActive && prog.statusText?.includes('cancelled')) {
            fetchOneProxyStatus();
            setOneProxyView('download_prompt');
            addLog(`[OneProxy] Download cancelled.`);
          }
        }
      } catch (_) {}
    }, 500);

    return () => clearInterval(interval);
  }, [oneProxyView, oneProxyBulkProgress?.isActive]);

  const handleStartBulkDownload = async () => {
    if (isStartingBulkDownload) return;
    setIsStartingBulkDownload(true);
    setCacheConfigMsg(null);
    try {
      const target = (oneProxyDownloadPath || oneProxyStatus?.defaultUserDir || '').trim();
      addLog(`[OneProxy] Starting asset library download to: ${target}...`);
      const resp = await fetch('/api/oneproxy/download-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetDir: target })
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        setOneProxyView('downloading');
        setOneProxyBulkProgress({
          isActive: true,
          percent: 0,
          processedCards: 0,
          totalCards: data.totalCards || oneProxyStatus?.cardCount || 5035,
          currentCardNumber: '',
          currentCardName: 'Initializing download...',
          statusText: 'Connecting to OneProxy...'
        });
      } else {
        setCacheConfigMsg({ type: 'error', text: data.error || 'Failed to start download' });
      }
    } catch (e: any) {
      setCacheConfigMsg({ type: 'error', text: e.message || 'Network error' });
    } finally {
      setIsStartingBulkDownload(false);
    }
  };

  const handleCancelBulkDownload = async () => {
    if (isCancellingBulkDownload) return;
    setIsCancellingBulkDownload(true);
    try {
      await fetch('/api/oneproxy/download-cancel', { method: 'POST' });
      setOneProxyView('download_prompt');
      fetchOneProxyStatus();
    } catch (_) {}
    finally {
      setIsCancellingBulkDownload(false);
    }
  };

  const handleBrowseDownloadDir = async () => {
    if (isBrowsingDownloadPath) return;
    setIsBrowsingDownloadPath(true);
    try {
      const resp = await fetch('/api/oneproxy/browse', { method: 'POST' });
      const data = await resp.json();
      const chosen = data.selectedPath || data.path;
      if (resp.ok && data.success && chosen) {
        setOneProxyDownloadPath(chosen);
      }
    } catch (_) {}
    finally {
      setIsBrowsingDownloadPath(false);
    }
  };

  const handleBrowseCacheDir = async () => {
    if (isBrowsingCachePath) return;
    setIsBrowsingCachePath(true);
    setCacheConfigMsg(null);
    try {
      const resp = await fetch('/api/oneproxy/browse', { method: 'POST' });
      const data = await resp.json();
      const chosen = data.selectedPath || data.path;
      if (resp.ok && data.success && chosen) {
        setCustomCacheInput(chosen);
        handleSaveCacheDir(chosen);
      }
    } catch (e: any) {
      setCacheConfigMsg({ type: 'error', text: e.message || 'Folder browse failed' });
    } finally {
      setIsBrowsingCachePath(false);
    }
  };

  const handleSaveCacheDir = async (pathOverride?: string) => {
    const targetPath = (pathOverride !== undefined ? pathOverride : customCacheInput).trim();
    setIsSavingCachePath(true);
    setCacheConfigMsg(null);
    try {
      const resp = await fetch('/api/oneproxy/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cacheDir: targetPath })
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        setCacheConfigMsg({ type: 'success', text: data.message });
        setCustomCacheInput(data.cacheDir);
        fetchOneProxyStatus();
        setOneProxyView('ready');
        addLog(`[OneProxy] Cache directory updated: ${data.cacheDir}`);
      } else {
        setCacheConfigMsg({ type: 'error', text: data.error || 'Failed to update cache directory' });
        addLog(`[OneProxy] Error: ${data.error}`);
      }
    } catch (e: any) {
      setCacheConfigMsg({ type: 'error', text: e.message || 'Network error' });
      addLog(`[OneProxy] Error: ${e.message}`);
    } finally {
      setIsSavingCachePath(false);
    }
  };

  const handleSyncOneProxy = async () => {
    if (isSyncingOneProxy) return;
    setIsSyncingOneProxy(true);
    addLog("[OneProxy] Checking for card database updates...");
    try {
      const resp = await fetch('/api/oneproxy/sync', { method: 'POST' });
      const data = await resp.json();
      if (resp.ok && data.success) {
        if (data.status) {
          setOneProxyStatus(data.status);
        }
        addLog(`[OneProxy] Success: Synchronized ${data.cardCount} cards into local offline cache.`);
      } else {
        addLog(`[OneProxy] ${data.error || 'Update check failed'}`);
      }
      fetchOneProxyStatus();
    } catch (err: any) {
      addLog(`[OneProxy] Network error: ${err.message}`);
    } finally {
      setIsSyncingOneProxy(false);
    }
  };

  useEffect(() => {
    if (!downloadState.isDownloading) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/updates/download-progress');
        if (res.ok) {
          const state = await res.json();
          setDownloadState(state);
        }
      } catch (e) {}
    }, 600);
    return () => clearInterval(interval);
  }, [downloadState.isDownloading]);

  const handleStartDownloadVersion = async (release: ReleaseInfo, asset: ReleaseAsset) => {
    setDownloadState({
      isDownloading: true,
      tag: release.tag,
      assetName: asset.name,
      progress: 0,
      downloadedBytes: 0,
      totalBytes: asset.size || 0,
      status: 'downloading',
      error: null
    });

    try {
      const res = await fetch('/api/updates/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tag: release.tag,
          assetUrl: asset.downloadUrl,
          assetName: asset.name
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error || 'Failed to initiate download');
      }
    } catch (e: any) {
      setDownloadState(prev => ({
        ...prev,
        isDownloading: false,
        status: 'error',
        error: e?.message || 'Download initiation failed'
      }));
    }
  };

  const handleLaunchInstaller = async (assetName: string) => {
    try {
      const res = await fetch('/api/updates/launch-installer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetName })
      });
      if (res.ok) {
        setUpdateStatusToast('Installer launched! Follow the prompts to finish installing.');
        setTimeout(() => setUpdateStatusToast(null), 5000);
      }
    } catch (e: any) {
      setUpdateStatusToast(`Failed to launch installer: ${e?.message}`);
      setTimeout(() => setUpdateStatusToast(null), 4000);
    }
  };
  const [copiedPath, setCopiedPath] = useState(false);
  const [shortcuts, setShortcuts] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('scm_shortcuts');
    return saved ? JSON.parse(saved) : {
      toggleConsole: 'Ctrl+`',
      saveProject: 'Ctrl+S',
      deleteSelected: 'Delete',
      selectAll: 'Ctrl+A',
      tabDashboard: 'Alt+1',
      tabWorkspace: 'Alt+2',
      tabLibrary: 'Alt+3',
      tabPlugins: 'Alt+4',
      copySelected: 'Ctrl+C',
      pasteSelected: 'Ctrl+V',
      undo: 'Ctrl+Z',
      redo: 'Ctrl+Y'
    };
  });

  const [tunnelUrl, setTunnelUrl] = useState<string | null>(null);
  const [isTunnelStarting, setIsTunnelStarting] = useState(false);

  useEffect(() => {
    const fetchTunnel = () => {
      fetch(`/api/tunnel`)
        .then(res => res.json())
        .then(data => {
          if (data.url) setTunnelUrl(data.url);
          if (data.starting !== undefined) setIsTunnelStarting(data.starting);
        })
        .catch(() => { });
    };
    fetchTunnel();
    const interval = setInterval(fetchTunnel, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem('scm_shortcuts', JSON.stringify(shortcuts));
  }, [shortcuts]);

  const [cardDimming, setCardDimming] = useState<'none' | 'tint' | 'dark'>(() => {
    return (localStorage.getItem('scm_card_dimming') as any) || 'tint';
  });

  useEffect(() => {
    localStorage.setItem('scm_card_dimming', cardDimming);
  }, [cardDimming]);

  const [playDingSound, setPlayDingSound] = useState(() => {
    return localStorage.getItem('scm_play_ding_sound') !== 'false';
  });

  useEffect(() => {
    localStorage.setItem('scm_play_ding_sound', String(playDingSound));
  }, [playDingSound]);
  const [cardWidth, setCardWidth] = useState<number>(() => {
    const stored = localStorage.getItem('scm_card_width');
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed) && parsed >= 80 && parsed <= 320) {
        return parsed;
      }
    }
    return window.innerWidth < 640 ? 110 : 180;
  });

  const fetchPluginConfigs = async () => {
    try {
      const res = await fetch('/api/library/load-decklists');
      const data = await res.json();
      if (data.configs) {
        setPluginConfigs(data.configs);
      }
    } catch (err) { }
  };

  useEffect(() => {
    if (showPluginLoadModal) fetchPluginConfigs();
  }, [showPluginLoadModal]);
  const [activeTaskController, setActiveTaskController] = useState<AbortController | null>(null);

  const getColorMode = () => {
    return localStorage.getItem('scm_color_mode') || 'dark';
  };
  const [colorMode, setColorMode] = useState<'light' | 'dark'>(getColorMode() as any);

  useEffect(() => {
    localStorage.setItem('scm_color_mode', colorMode);
    document.documentElement.setAttribute('data-mode', colorMode);
  }, [colorMode]);

  const [currentTheme, setCurrentTheme] = useState<Theme>('indigo');
  const [pdfReady, setPdfReady] = useState(false);
  const [pdfReadyToastOpen, setPdfReadyToastOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState(() => {
    const saved = localStorage.getItem('scm_collapsed_sections');
    return saved ? JSON.parse(saved) : { fronts: false, backs: false, doubleSided: false };
  });

  useEffect(() => {
    localStorage.setItem('scm_collapsed_sections', JSON.stringify(collapsedSections));
  }, [collapsedSections]);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [taskProgress, setTaskProgress] = useState<{
    current: number;
    total: number;
    message: string;
    percent?: number;
    isComplete?: boolean;
    totalUnknown?: boolean;
    activeWorkers?: Record<string | number, { cardName: string; status: 'upscaling' | 'completed' }>;
  } | null>(null);
  const [importConflictData, setImportConflictData] = useState<{ items: string[], destination: 'project' | 'library', source: 'library' | 'project' | 'plugins', collisions: string[], backResolution?: 'check' | 'keep' | 'replace' } | null>(null);
  const [backConflictData, setBackConflictData] = useState<{ items: string[], destination: 'project' | 'library', source: 'library' | 'project' | 'plugins', conflictResolution?: 'check' | 'keep' | 'replace' | 'keep_both' } | null>(null);
  const [fetchConflictData, setFetchConflictData] = useState<{ tempDirId: string, collisions: string[], resolutions: Record<string, 'replace' | 'skip'> } | null>(null);

  const [upscaylStatus, setUpscaylStatus] = useState<{ available: boolean; binPath: string; models: string[]; gpu?: GpuVramInfo } | null>(null);

  const [upscaleConfig, setUpscaleConfig] = useState<UpscaleConfig>(() => {
    try {
      const saved = localStorage.getItem('scm_upscale_config');
      if (saved) return { ...defaultUpscaleConfig, ...JSON.parse(saved) };
    } catch (e) { }
    return defaultUpscaleConfig;
  });

  const [upscaleSectionExpanded, setUpscaleSectionExpanded] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('scm_upscale_expanded');
      return saved === 'true';
    } catch (e) {
      return false;
    }
  });

  const toggleUpscaleSectionExpanded = (val: boolean) => {
    setUpscaleSectionExpanded(val);
    try { localStorage.setItem('scm_upscale_expanded', String(val)); } catch (e) { }
  };

  const updateUpscaleConfig = (updates: Partial<UpscaleConfig>) => {
    setUpscaleConfig(prev => {
      const next = { ...prev, ...updates };
      try { localStorage.setItem('scm_upscale_config', JSON.stringify(next)); } catch (e) { }
      return next;
    });
  };

  const handleUpscale = async (identities?: string[], allInView = false, customConfig?: Partial<UpscaleConfig>) => {
    const abortController = new AbortController();
    setActiveTaskController(abortController);

    try {
      const cfg = { ...upscaleConfig, ...(customConfig || {}) };
      const label = allInView ? 'all deck / view cards' : `${identities?.length || 1} card${(identities?.length || 1) === 1 ? '' : 's'}`;
      const estimatedTotal = identities ? identities.length : 1;
      setTaskProgress({ current: 0, total: estimatedTotal, message: `Starting Upscayl AI (${cfg.scaleFactor}x HD) for ${label}...` });
      addLog(`[Action: Upscayl AI] Initiating ${cfg.scaleFactor}x super-resolution upscaling (Model: ${cfg.model}${cfg.tta ? ', TTA Mode' : ''}) for ${label}...`);

      const res = await fetch('/api/upscale', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({
          stream: true,
          identities,
          allInView,
          assetViewMode,
          scaleFactor: cfg.scaleFactor,
          model: cfg.model,
          tta: cfg.tta,
          scope: allInView ? 'all' : (identities ? 'selected' : 'all'),
          maxDimension: cfg.maxDimension,
          workers: cfg.workers || 1,
          tileSize: cfg.tileSize !== undefined ? cfg.tileSize : 0
        }),
        signal: abortController.signal
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      let data: any = null;
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let pending = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          pending += decoder.decode(value, { stream: true });
          const parts = pending.split('\n\n');
          pending = parts.pop() || '';

          for (const part of parts) {
            const lines = part.split('\n');
            let eventType = '';
            let eventData: any = null;
            for (const line of lines) {
              if (line.startsWith('event: ')) {
                eventType = line.substring(7).trim();
              } else if (line.startsWith('data: ')) {
                try { eventData = JSON.parse(line.substring(6)); } catch (_) { }
              }
            }

            if (eventType === 'start' && eventData) {
              setTaskProgress({
                current: 0,
                total: eventData.total || 1,
                message: `Preparing ${eventData.total} card image(s) for Upscayl AI...`
              });
            } else if (eventType === 'progress' && eventData) {
              setTaskProgress({
                current: eventData.current,
                total: eventData.total,
                message: eventData.message || `Upscaling ${eventData.cardName || ''}...`,
                activeWorkers: eventData.activeWorkers
              });
              if (eventData.status === 'completed') {
                addLog(`[Action: Upscayl AI] Finished ${eventData.cardName} (${eventData.current}/${eventData.total})`);
              }
            } else if (eventType === 'done' && eventData) {
              data = eventData;
            } else if (eventType === 'error' && eventData) {
              throw new Error(eventData.message || eventData.error || 'Upscale failed');
            }
          }
        }
      } else {
        data = await res.json();
      }

      if (data && data.success) {
        addLog(`[Action: Upscayl AI] Successfully upscaled ${data.count} card image(s) to ${cfg.scaleFactor}x high resolution.`);
        setTaskProgress({ current: data.count, total: data.total || data.count, message: `Upscaled ${data.count} card image(s) with Upscayl (${cfg.scaleFactor}x HD)!` });

        // Invalidate image cache and clear in-memory uploaded blobs so that freshly upscaled images load immediately in the UI
        const now = Date.now();
        setUploadedImages({});
        setGlobalCacheBust(now);

        const newBusts: Record<string, number> = {};
        const cur = getCurrentAssets();
        cur?.fronts?.forEach(f => { newBusts[f] = now; });
        cur?.backs?.forEach(b => { newBusts[b] = now; });
        cur?.double_sided?.forEach(d => { newBusts[d] = now; });
        if (identities) {
          identities.forEach(item => {
            const name = item.includes(':') ? item.split(':')[1] : item;
            newBusts[name] = now;
          });
        }
        setCacheBusts(newBusts);

        await fetchStatus();

        if (enlargedImage) {
          const clean = enlargedImage.split('?')[0];
          setEnlargedImage(`${clean}?t=${now}`);
        }
      } else if (data) {
        addLog(`[Error: Upscayl AI] ${data.message || data.error || 'Failed to upscale card images.'}`);
        setTaskProgress({ current: 0, total: 1, message: `Upscale failed.` });
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        addLog(`[Action: Upscayl AI] Upscale canceled by user.`);
        setTaskProgress({ current: 0, total: 1, message: 'Upscale canceled.' });
      } else {
        addLog(`[Error: Upscayl AI] ${err?.message || err}`);
        setTaskProgress({ current: 0, total: 1, message: `Upscale error: ${err?.message || err}` });
      }
    } finally {
      setActiveTaskController(null);
      setTimeout(() => setTaskProgress(null), 2500);
    }
  };


  useEffect(() => {
    setCurrentTheme(getTheme());
    fetch('/api/upscayl/status')
      .then(res => res.json())
      .then(data => setUpscaylStatus(data))
      .catch(() => { });
    const handleGlobalClick = () => {
      setContextMenu(null);
      setIsCardArtSubmenuOpen(false);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  useEffect(() => {
    if (upscaleSectionExpanded) {
      fetch('/api/upscayl/status')
        .then(res => res.json())
        .then(data => setUpscaylStatus(data))
        .catch(() => { });
    }
  }, [upscaleSectionExpanded]);

  const handleKeyDown = (e: KeyboardEvent) => {
    const isInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;

    const getShortcutString = (ev: KeyboardEvent) => {
      const parts = [];
      if (ev.ctrlKey || ev.metaKey) parts.push('ctrl');
      if (ev.altKey) parts.push('alt');
      if (ev.shiftKey) parts.push('shift');
      let k = ev.key;
      if (k === ' ') k = 'space';
      if (!['Control', 'Alt', 'Shift', 'Meta'].includes(k)) {
        parts.push(k.toLowerCase());
      } else {
        return "";
      }
      return parts.join('+').toLowerCase();
    };

    const pressed = getShortcutString(e);
    if (!pressed) return;
    const normalize = (s: string) => (s || '').toLowerCase().replace(/\s+/g, '');
    const match = (action: string) => shortcuts[action] && normalize(shortcuts[action]) === pressed;

    // Global Hotkeys (Work outside of assets tab, if not in an input)
    if (!isInput) {
      if (match('toggleConsole')) {
        e.preventDefault();
        setActiveTab(p => p === 'console' ? 'dashboard' : 'console');
        return;
      }
      if (match('tabDashboard')) { e.preventDefault(); setActiveTab('dashboard'); return; }
      if (match('tabWorkspace')) { e.preventDefault(); setActiveTab('assets'); setAssetViewMode('project'); return; }
      if (match('tabLibrary')) { e.preventDefault(); setActiveTab('assets'); setAssetViewMode('library'); return; }
      if (match('tabPlugins')) {
        e.preventDefault();
        setActiveTab('assets');
        setAssetViewMode('plugins');
        if (assetFilter === 'back') setAssetFilter('all');
        return;
      }
      if (match('saveProject') && activeTab === 'assets' && assetViewMode === 'project') {
        e.preventDefault();
        setIsProjectPresetsOpen(true);
        return;
      }
    }

    if (activeTab !== 'assets') return;

    // Undo/Redo
    if (match('undo')) {
      if (isInput) return;
      e.preventDefault();
      handleUndo();
    }
    if (match('redo')) {
      if (isInput) return;
      e.preventDefault();
      handleRedo();
    }

    // Select All
    if (match('selectAll')) {
      if (isInput) return;

      e.preventDefault();
      const currentAssets = getCurrentAssets();
      if (!currentAssets) return;

      const toSelect = new Set<string>();
      if (assetFilter === 'all' || assetFilter === 'front') {
        currentAssets.fronts.forEach(f => toSelect.add(`front:${f}`));
      }
      setSelectedAssets(toSelect);
      addLog(`[System] Selected all visible ${assetViewMode} assets.`);
    }

    // Copy
    if (match('copySelected')) {
      if (isInput) return;
      if (selectedAssets.size > 0) {
        const filtered = Array.from(selectedAssets).filter((s: string) => !s.startsWith('back:'));
        const names = filtered.map((s: string) => s.split(':')[1]);
        setCopiedBuffer(filtered);
        navigator.clipboard.writeText(names.join(', '));
        addLog(`[System] Copied ${filtered.length} front assets to internal buffer and clipboard.`);
      }
    }

    // Paste
    if (match('pasteSelected')) {
      if (isInput) return;
      if (assetViewMode === 'plugins') return;
      if (copiedBuffer.length > 0) {
        addLog(`[Library] Duplicating ${copiedBuffer.length} assets from buffer...`);
        (async () => {
          try {
            let allResults: any[] = [];
            for (let i = 0; i < copiedBuffer.length; i++) {
              setTaskProgress({ current: i + 1, total: copiedBuffer.length, message: `Duplicating ${copiedBuffer[i].split(':')[1]}...` });
              try {
                const res = await fetch('/api/duplicate', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ identity: copiedBuffer[i], assetViewMode })
                });
                const data = await res.json();
                if (data.newName) {
                  addLog(`[Action: Duplicate] ${copiedBuffer[i]} -> ${data.newName} (Success)`);
                  allResults.push(`${copiedBuffer[i].split(':')[0]}:${data.newName}`);
                }
              } catch (e) { }
            }
            if (allResults.length > 0) {
              setFileUndoStack(prev => [...prev, { action: 'duplicate', items: allResults, assetViewMode }]);
            }
            setTaskProgress({ current: copiedBuffer.length, total: copiedBuffer.length, message: `${copiedBuffer.length} card${copiedBuffer.length === 1 ? '' : 's'} duplicated` });
            await fetchStatus();
          } finally {
            setTimeout(() => setTaskProgress(null), 1500);
          }
        })();
      } else {
        addLog(`[System] Paste failed: Internal buffer is empty.`);
      }
    }

    // Escape to Deselect (Hardcoded mostly because Escape is standard)
    if (e.key === 'Escape') {
      if (selectedAssets.size > 0) {
        setSelectedAssets(new Set());
        addLog("[System] Selection cleared.");
      }
    }

    // Delete
    if (match('deleteSelected')) {
      if (selectedAssets.size > 0 && !isInput) {
        e.preventDefault();
        addLog(`[System] Deleting ${selectedAssets.size} selected items...`);

        // Use API to delete instead of clear_up.py directly
        (async () => {
          try {
            const arr = Array.from(selectedAssets) as string[];
            let allResults: any[] = [];
            for (let i = 0; i < arr.length; i++) {
              setTaskProgress({ current: i + 1, total: arr.length, message: `Deleting ${arr[i].split(':')[1]}...` });
              const res = await fetch('/api/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identity: [arr[i]], assetViewMode })
              });
              const data = await res.json();
              if (data.results) {
                data.results.forEach((r: any) => addLog(`[Action: Delete] ${r.from} (Success)`));
                allResults = allResults.concat(data.results);
              }
            }
            if (allResults.length > 0) {
              setFileUndoStack(prev => [...prev, { action: 'delete', items: allResults, assetViewMode }]);
            }
            setTaskProgress({ current: arr.length, total: arr.length, message: `${arr.length} card${arr.length === 1 ? '' : 's'} deleted` });
            await fetchStatus();
          } catch (err) {
            addLog(`[Error] Delete failed: ${err}`);
          } finally {
            setTimeout(() => setTaskProgress(null), 1500);
          }
        })();

        setSelectedAssets(new Set());
      }
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, status, selectedAssets, copiedBuffer]);

  // Command Builder State
  const [cmdOptions, setCmdOptions] = useState(() => {
    const saved = localStorage.getItem('scm_cmd_options');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.extend_corners === 0) parsed.extend_corners = "";
        if (parsed.crop) parsed.crop = normalizeDimension(parsed.crop);
        if (parsed.crop_backs) parsed.crop_backs = normalizeDimension(parsed.crop_backs);
        if (parsed.extend_bleed) parsed.extend_bleed = normalizeDimension(parsed.extend_bleed);
        if (parsed.extend_bleed_backs) parsed.extend_bleed_backs = normalizeDimension(parsed.extend_bleed_backs);
        if (parsed.extend_corners) parsed.extend_corners = normalizeDimension(parsed.extend_corners);
        if (parsed.extend_corners_backs) parsed.extend_corners_backs = normalizeDimension(parsed.extend_corners_backs);
        if (parsed.extend_edges) parsed.extend_edges = normalizeDimension(parsed.extend_edges);
        if (parsed.extend_edges_backs) parsed.extend_edges_backs = normalizeDimension(parsed.extend_edges_backs);
        return parsed;
      } catch (e) {}
    }
    return {
      specialty: 'none',
      card_size: 'standard',
      paper_size: 'letter',
      registration: '3',
      registration_orientation: 'default',
      borderless: false,
      only_fronts: false,
      fit: 'stretch',
      extend_corners: "",
      extend_corners_backs: "",
      extend_bleed: "",
      extend_bleed_backs: "",
      extend_edges: "",
      extend_edges_backs: "",
      ppi: 1200,
      quality: 100,
      load_offset: true,
      skip: "",
      show_outline: false,
      crop: "",
      crop_backs: "",
      label: "",
      output_images: false,
      output_path: "",
      doubleSided: false, // UI convenience
    };
  });

  useEffect(() => {
    localStorage.setItem('scm_cmd_options', JSON.stringify(cmdOptions));
  }, [cmdOptions]);

  const [pythonPath, setPythonPath] = useState(() => {
    return localStorage.getItem('scm_python_path') || "";
  });

  useEffect(() => {
    if (pythonPath) localStorage.setItem('scm_python_path', pythonPath);
    else localStorage.removeItem('scm_python_path');
  }, [pythonPath]);

  const [calibration, setCalibration] = useState(() => {
    const saved = localStorage.getItem('scm_calibration');
    return saved ? JSON.parse(saved) : {
      x: 0,
      y: 0,
      angle: 0.0,
      sheet: 'letter-calibration.pdf'
    };
  });

  useEffect(() => {
    localStorage.setItem('scm_calibration', JSON.stringify(calibration));
  }, [calibration]);

  const [isCalibrationCollapsed, setIsCalibrationCollapsed] = useState(() => {
    return localStorage.getItem('scm_calibration_collapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('scm_calibration_collapsed', String(isCalibrationCollapsed));
  }, [isCalibrationCollapsed]);

  const [isAdvancedCollapsed, setIsAdvancedCollapsed] = useState(() => {
    return localStorage.getItem('scm_advanced_collapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('scm_advanced_collapsed', String(isAdvancedCollapsed));
  }, [isAdvancedCollapsed]);

  const [isPdfGeneratorCollapsed, setIsPdfGeneratorCollapsed] = useState(() => {
    return localStorage.getItem('scm_pdf_generator_collapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('scm_pdf_generator_collapsed', String(isPdfGeneratorCollapsed));
  }, [isPdfGeneratorCollapsed]);

  const [isLiveCommandCollapsed, setIsLiveCommandCollapsed] = useState(() => {
    return localStorage.getItem('scm_live_command_collapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('scm_live_command_collapsed', String(isLiveCommandCollapsed));
  }, [isLiveCommandCollapsed]);

  const [commandCopied, setCommandCopied] = useState(false);

  const [dimensionUnitPref, setDimensionUnitPref] = useState<'mm' | 'in'>(() => {
    return (localStorage.getItem('scm_dimension_unit_pref') as 'mm' | 'in') || 'mm';
  });

  const handleSwitchAllUnits = (target: 'mm' | 'in') => {
    setDimensionUnitPref(target);
    localStorage.setItem('scm_dimension_unit_pref', target);
    setCmdOptions(prev => ({
      ...prev,
      crop: convertDimensionUnit(prev.crop, target),
      crop_backs: convertDimensionUnit(prev.crop_backs, target),
      extend_bleed: convertDimensionUnit(prev.extend_bleed, target),
      extend_bleed_backs: convertDimensionUnit(prev.extend_bleed_backs, target),
      extend_edges: convertDimensionUnit(prev.extend_edges, target),
      extend_edges_backs: convertDimensionUnit(prev.extend_edges_backs, target),
      extend_corners: convertDimensionUnit(prev.extend_corners, target),
      extend_corners_backs: convertDimensionUnit(prev.extend_corners_backs, target),
    }));
  };

  const CALIBRATION_SHEETS = [
    { label: 'Letter', value: 'letter-calibration.pdf' },
    { label: 'A3', value: 'a3-calibration.pdf' },
    { label: 'A4', value: 'a4-calibration.pdf' },
    { label: 'Arch B', value: 'arch_b-calibration.pdf' },
    { label: 'Tabloid', value: 'tabloid-calibration.pdf' }
  ];

  // Scryfall / Custom Art Picker State
  const [artTargetCard, setArtTargetCard] = useState<{
    name: string;
    type: 'front' | 'back' | 'double_sided';
    targetMode?: 'front' | 'double_sided' | 'back';
    targets?: { name: string; type: 'front' | 'back' | 'double_sided' }[];
  } | null>(null);
  const [artSourceTab, setArtSourceTab] = useState<string>('scryfall');
  const [artCardSize, setArtCardSize] = useState(() => {
    return parseInt(localStorage.getItem('scm_art_card_size') || '150');
  });
  useEffect(() => {
    localStorage.setItem('scm_art_card_size', artCardSize.toString());
  }, [artCardSize]);

  const [mtgSets, setMtgSets] = useState<{ code: string; name: string; type?: string; released?: string; card_count?: number }[]>(() => {
    try {
      const saved = localStorage.getItem('scm_mtg_sets');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });
  useEffect(() => {
    const loadSets = async () => {
      try {
        const res = await fetch('/api/mtg/sets');
        const data = await res.json();
        if (data.data && data.data.length > 0) {
          setMtgSets(data.data);
          localStorage.setItem('scm_mtg_sets', JSON.stringify(data.data));
          return;
        }
      } catch (e) {}
      fetch('https://api.scryfall.com/sets')
        .then(res => res.json())
        .then(data => {
          if (data.data) {
            const mapped = data.data.map((s: any) => ({
              code: s.code.toUpperCase(),
              name: s.name,
              type: s.set_type,
              released: s.released_at ? s.released_at.substring(0, 4) : ''
            }));
            setMtgSets(mapped);
            localStorage.setItem('scm_mtg_sets', JSON.stringify(mapped));
          }
        })
        .catch(err => console.error("Failed to load MTG sets", err));
    };
    loadSets();
  }, []);
  const [isBacksOnlyModal, setIsBacksOnlyModal] = useState(false);
  const [setBackSearchCategory, setSetBackSearchCategory] = useState<'cards' | 'backs'>('cards');

  // Scryfall Filters
  const [scryfallFilters, setScryfallFilters] = useState({
    frame: 'all',
    type: 'all',
    color: 'all',
    rarity: 'all',
    order: 'released',
    set: ''
  });

  // MPC Filters
  const [mpcFilters, setMpcFilters] = useState({
    dpi: 'all',
    tag: 'all',
    set: ''
  });

  const [isArtPickerOpen, setIsArtPickerOpen] = useState(false);
  const [artQuery, setArtQuery] = useState('');
  const [artResults, setArtResults] = useState<any[]>([]);
  const [isSearchingArt, setIsSearchingArt] = useState(false);
  const [artDownloadMsg, setArtDownloadMsg] = useState<string | null>(null);

  const handleSearchArt = async (name: string, customFilters?: any, sourceOverride?: string) => {
    const currentPluginId = pluginState.selectedPlugin?.id || 'mtg';
    const activeSource = sourceOverride || artSourceTab;
    const queryTerm = (name || '').trim();
    setIsSearchingArt(true);
    setArtDownloadMsg(null);
    try {
      if (activeSource === 'limitless' || (currentPluginId === 'pokemon' && activeSource !== 'mpcfill')) {
        const res = await fetch(`/api/limitless/search?q=${encodeURIComponent(queryTerm)}`);
        const data = await res.json();
        if (data.data && Array.isArray(data.data)) {
          setArtResults(data.data);
          if (data.data.length === 0) {
            setArtDownloadMsg(`No matching Pokémon cards found for "${queryTerm}" on Limitless.`);
          }
        } else {
          setArtResults([]);
          setArtDownloadMsg(data.error || "No matching Pokémon cards found on Limitless.");
        }
      } else if (activeSource === 'mpcfill') {
        const mp = customFilters || mpcFilters;
        const params = new URLSearchParams({
          q: queryTerm,
          isBack: isBacksOnlyModal ? 'true' : 'false',
          dpi: mp.dpi || 'all',
          set: mp.set || ''
        });
        const res = await fetch(`/api/mpc/search?${params.toString()}`);
        const data = await res.json();
        if (data.data && Array.isArray(data.data)) {
          setArtResults(data.data);
          if (data.data.length === 0) {
            setArtDownloadMsg("No matching cards found in MPCFill.");
          }
        } else {
          setArtResults([]);
          setArtDownloadMsg("No matching cards found in MPCFill.");
        }
      } else if (activeSource === 'scryfall' && currentPluginId === 'mtg') {
        const sf = customFilters || scryfallFilters;
        const params = new URLSearchParams({
          q: queryTerm || '',
          frame: sf.frame,
          type: sf.type,
          color: sf.color,
          rarity: sf.rarity,
          order: sf.order,
          set: sf.set || ''
        });
        const res = await fetch(`/api/scryfall/search?${params.toString()}`);
        const data = await res.json();
        if (data.data && Array.isArray(data.data)) {
          setArtResults(data.data);
        } else {
          setArtResults([]);
          setArtDownloadMsg(data.details || "No matching card printings found.");
        }
      } else {
        const targetPlugin = activeSource in PLUGIN_CARD_PROVIDERS ? activeSource : currentPluginId;
        const prov = getPluginCardProvider(targetPlugin);
        const res = await fetch(`/api/plugin/cards/search?plugin=${encodeURIComponent(targetPlugin)}&q=${encodeURIComponent(queryTerm)}`);
        const data = await res.json();
        if (data.data && Array.isArray(data.data)) {
          setArtResults(data.data);
          if (data.data.length === 0) {
            if (targetPlugin === 'oneproxy') {
              setArtDownloadMsg(
                oneProxyStatus?.cachedImagesCount === 0
                  ? "No local OneProxy cards found. Card selection is local only — please download or link your OneProxy assets in Game Plugins."
                  : (queryTerm ? `No local cards matching "${queryTerm}" found in your OneProxy directory.` : "No cards found in your OneProxy directory.")
              );
            } else {
              setArtDownloadMsg(`No matching cards found for "${queryTerm}" on ${prov.providerName}.`);
            }
          }
        } else {
          setArtResults([]);
          setArtDownloadMsg(data.error || `Search failed on ${prov.providerName}.`);
        }
      }
    } catch (e: any) {
      setArtDownloadMsg(`Search failed: ${e.message}`);
    } finally {
      setIsSearchingArt(false);
    }
  };

  const handleDownloadCardArt = async (
    card: any,
    target: 'project' | 'library' | 'plugins',
    type: 'front' | 'back' | 'double_sided' = 'front',
    replaceOriginalFilename?: string | string[]
  ) => {
    try {
      const imgUrl = card.imageUrl || card.image_uris?.png || card.image_uris?.large || card.card_faces?.[0]?.image_uris?.png || card.card_faces?.[0]?.image_uris?.large;
      if (!imgUrl) {
        alert("No valid image URL found for this card.");
        return;
      }
      const cleanTitle = (card.name || 'Card').replace(/[/\\?%*:|"<>]/g, '-').trim();
      const setTag = (card.set || 'custom').toUpperCase();
      const numTag = card.collector_number || '1';

      const fileList: string[] = Array.isArray(replaceOriginalFilename)
        ? replaceOriginalFilename
        : (replaceOriginalFilename ? [replaceOriginalFilename] : []);

      const safeName = fileList.length > 0 ? fileList[0] : (type === 'back' ? `${cleanTitle}.png` : `${cleanTitle} (${setTag} ${numTag}).png`);

      setArtDownloadMsg(fileList.length > 1 ? `Downloading art for ${fileList.length} cards...` : `Downloading ${card.name || safeName}...`);

      const res = await fetch('/api/scryfall/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: imgUrl,
          filename: safeName,
          filenames: fileList.length > 0 ? fileList : undefined,
          target,
          type
        })
      });
      const data = await res.json();
      if (data.success) {
        const affectedFiles: string[] = data.filenames || (data.filename ? [data.filename] : [safeName]);
        const msg = affectedFiles.length > 1
          ? `✓ Applied art to ${affectedFiles.length} selected cards!`
          : `✓ Applied "${safeName}" as ${type === 'double_sided' ? 'reverse back' : type} to ${target}!`;
        setArtDownloadMsg(msg);
        addLog(`[Card Art] ${msg}`);

        const now = Date.now();
        const busts: Record<string, number> = {};
        affectedFiles.forEach(f => { busts[f] = now; });
        fileList.forEach(f => { busts[f] = now; });
        setCacheBusts(prev => ({ ...prev, ...busts }));

        setLocalAssets(prev => [
          ...affectedFiles.map(f => ({ name: f, type, view: target })),
          ...prev.filter(p => !affectedFiles.includes(p.name))
        ]);

        await fetchStatus();
      } else {
        setArtDownloadMsg(`Error: ${data.error}`);
      }
    } catch (e: any) {
      setArtDownloadMsg(`Download failed: ${e.message}`);
    }
  };

  const openArtPickerForCard = (
    cardFilename: string,
    type: 'front' | 'back' | 'double_sided' = 'front',
    targetMode: 'front' | 'double_sided' | 'back' = 'front',
    preferredSource?: string,
    targets?: { name: string; type: 'front' | 'back' | 'double_sided' }[]
  ) => {
    const currentPluginId = pluginState.selectedPlugin?.id || 'mtg';
    if (!pluginSupportsCardIngestion(currentPluginId)) return;
    const isBack = type === 'back' && targetMode !== 'double_sided';
    setIsBacksOnlyModal(isBack);
    if (isBack) {
      setArtSourceTab('mpcfill');
      setArtTargetCard({ name: cardFilename, type: 'back', targetMode: 'back', targets });
      setArtQuery('');
      setIsArtPickerOpen(true);
    } else if (targetMode === 'double_sided') {
      const cleaned = cleanCardName(cardFilename);
      const isOneProxy = currentPluginId === 'one_piece' && pluginState.format === 'oneproxy';
      const defaultSource = preferredSource || (currentPluginId === 'mtg' ? 'scryfall' : (currentPluginId === 'pokemon' ? 'limitless' : (isOneProxy ? 'oneproxy' : currentPluginId)));
      setArtSourceTab(defaultSource);
      setArtTargetCard({ name: cardFilename, type: 'double_sided', targetMode: 'double_sided', targets });
      setArtQuery(cleaned);
      setIsArtPickerOpen(true);
      if (cleaned) {
        handleSearchArt(cleaned, undefined, defaultSource);
      }
    } else {
      const cleaned = cleanCardName(cardFilename);
      const isOneProxy = currentPluginId === 'one_piece' && pluginState.format === 'oneproxy';
      const defaultSource = preferredSource || (currentPluginId === 'mtg' ? 'scryfall' : (currentPluginId === 'pokemon' ? 'limitless' : (isOneProxy ? 'oneproxy' : currentPluginId)));
      setArtSourceTab(defaultSource);
      setArtTargetCard({ name: cardFilename, type, targetMode: 'front', targets });
      setArtQuery(cleaned);
      setIsArtPickerOpen(true);
      if (cleaned) {
        handleSearchArt(cleaned, undefined, defaultSource);
      }
    }
  };

  const openAddCardPicker = (source?: string, type: 'front' | 'back' = 'front') => {
    const currentPluginId = pluginState.selectedPlugin?.id || 'mtg';
    if (!pluginSupportsCardIngestion(currentPluginId)) return;
    const isOneProxy = currentPluginId === 'one_piece' && pluginState.format === 'oneproxy';
    const provider = getPluginCardProvider(isOneProxy ? 'oneproxy' : currentPluginId, pluginState.format);
    const defaultSource = source || (currentPluginId === 'mtg' ? 'scryfall' : (currentPluginId === 'pokemon' ? 'limitless' : (isOneProxy ? 'oneproxy' : currentPluginId)));
    setIsBacksOnlyModal(type === 'back');
    setArtSourceTab(defaultSource);
    setArtTargetCard(null);
    const initialQuery = provider.defaultQuery;
    setArtQuery(initialQuery);
    setArtResults([]);
    setArtDownloadMsg(null);
    setIsArtPickerOpen(true);
    handleSearchArt(initialQuery, undefined, defaultSource);
  };

  const [pluginState, setPluginState] = useState(() => {
    const saved = localStorage.getItem('scm_plugin_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const foundPlugin = PLUGINS.find(p => p.id === parsed.selectedPluginId);
        if (foundPlugin) {
          return {
            selectedPlugin: foundPlugin,
            decklist: parsed.decklist || "",
            format: parsed.format || foundPlugin.formats[0],
            options: parsed.options || {}
          };
        }
      } catch (e) { }
    }
    return {
      selectedPlugin: PLUGINS[0],
      decklist: "",
      format: PLUGINS[0].formats[0],
      options: {} as Record<string, any>
    };
  });

  useEffect(() => {
    const currentPluginId = pluginState.selectedPlugin?.id || 'mtg';
    if (currentPluginId === 'mtg') {
      if (artSourceTab !== 'scryfall' && artSourceTab !== 'mpcfill') {
        setArtSourceTab('scryfall');
      }
    } else {
      const isOneProxy = currentPluginId === 'one_piece' && pluginState.format === 'oneproxy';
      const targetSource = currentPluginId === 'pokemon' ? 'limitless' : (isOneProxy ? 'oneproxy' : currentPluginId);
      if (artSourceTab !== targetSource) {
        setArtSourceTab(targetSource);
      }
    }
  }, [pluginState.selectedPlugin?.id, pluginState.format]);

  useEffect(() => {
    if (pluginState.selectedPlugin?.id === 'one_piece' && pluginState.format === 'oneproxy') {
      fetchOneProxyStatus();
    }
  }, [pluginState.selectedPlugin?.id, pluginState.format]);

  const [pluginFile, setPluginFile] = useState<File | null>(null);
  const [customScripts, setCustomScripts] = useState<string[]>([]);

  const fetchCustomScripts = async () => {
    try {
      const res = await fetch('/api/custom-scripts');
      const data = await res.json();
      setCustomScripts(data.scripts || []);
    } catch (e) { }
  };

  useEffect(() => {
    fetchCustomScripts();
  }, []);

  useEffect(() => {
    const stateToSave = {
      selectedPluginId: pluginState.selectedPlugin.id,
      decklist: pluginState.decklist,
      format: pluginState.format,
      options: pluginState.options
    };
    localStorage.setItem('scm_plugin_state', JSON.stringify(stateToSave));
  }, [pluginState]);

  const consoleEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    const timeout = setTimeout(() => {
      saveToHistory(cmdOptions, pluginState);
    }, 1000);
    return () => clearTimeout(timeout);
  }, [cmdOptions, pluginState, saveToHistory]);

  const [isSettingUpPython, setIsSettingUpPython] = useState(false);
  const [pythonSetupProgress, setPythonSetupProgress] = useState<{ step: string, detail: string, percent?: number }>({ step: 'Initializing setup...', detail: '', percent: 10 });
  const [setupLogs, setSetupLogs] = useState<string[]>([]);
  const setupLogEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (setupLogEndRef.current) {
      setupLogEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [setupLogs]);

  const startPythonSetup = () => {
    setIsSettingUpPython(true);
    setSetupLogs([]);
    setPythonSetupProgress({ step: 'Initializing background process', detail: 'Please wait...', percent: 10 });

    const eventSource = new EventSource('/api/setup-python-stream');

    eventSource.addEventListener('progress', (e: Event) => {
      const data = JSON.parse((e as MessageEvent).data);
      setPythonSetupProgress(data);
    });

    eventSource.addEventListener('stdout', (e: Event) => {
      const data = JSON.parse((e as MessageEvent).data);
      addLog(`[System Setup] ${data}`);
      setSetupLogs(prev => [...prev, data]);
    });

    eventSource.addEventListener('error', (e: Event) => {
      const err = JSON.parse((e as MessageEvent).data);
      addLog(`[Setup Error] ${err}`);
      setSetupLogs(prev => [...prev, `[ERROR] ${err}`]);
      setPythonSetupProgress({ step: 'Setup Failed', detail: err });
    });

    eventSource.addEventListener('done', (e: Event) => {
      const data = JSON.parse((e as MessageEvent).data);
      eventSource.close();
      if (data.success) {
        setTimeout(() => {
          setIsSettingUpPython(false);
          fetchStatus();
        }, 1500);
      }
    });

    eventSource.onerror = (e) => {
      eventSource.close();
    };
  };

  const [pythonStatus, setPythonStatus] = useState<{ found: boolean, version: string, type: string } | null>(null);

  const fetchPythonStatus = async () => {
    try {
      const overridePath = localStorage.getItem('scm_python_path');
      const url = overridePath ? `/api/python-status?path=${encodeURIComponent(overridePath)}` : '/api/python-status';
      const res = await fetch(url);
      const data = await res.json();
      setPythonStatus(data);
    } catch (e) { }
  };

  useEffect(() => {
    fetchPythonStatus();
  }, [pythonPath]);

  const fetchStatus = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/status?_=' + new Date().getTime());
      const data = await res.json();
      setStatus(data);

      fetchPythonStatus();

      if (data && data.pythonFound === false) {
        if (!isSettingUpPython && (!localStorage.getItem('scm_python_path') || data.isElectron)) {
          startPythonSetup();
        }
      }

      if (data.assets) {
        setLocalAssets(prev => prev.filter(a => {
          const targetSet = a.view === 'project' ? data.assets : (a.view === 'library' ? data.library : data.plugins);
          if (!targetSet) return true;
          if (a.type === 'front' && targetSet.fronts?.includes(a.name)) return false;
          if (a.type === 'back' && targetSet.backs?.includes(a.name)) return false;
          if (a.type === 'double_sided' && targetSet.double_sided?.includes(a.name)) return false;
          return true;
        }));
      }
      return data;
    } catch (err) {
      console.error("Failed to fetch status:", err);
      return null;
    } finally {
      setIsRefreshing(false);
    }
  };

  const [clearCacheStatus, setClearCacheStatus] = useState<'idle' | 'clearing' | 'success' | 'error'>('idle');

  const handleClearCache = async () => {
    if (clearCacheStatus === 'clearing') return;
    setClearCacheStatus('clearing');
    try {
      const res = await fetch('/api/clear-cache', { method: 'POST' });
      const data = await res.json();

      // Reset cache bust tokens and bump global cache bust to force fresh reloads
      const now = Date.now();
      setGlobalCacheBust(now);
      setCacheBusts({});

      // Clear browser CacheStorage if available
      if (typeof window !== 'undefined' && 'caches' in window) {
        try {
          const cacheKeys = await caches.keys();
          await Promise.all(cacheKeys.map(k => caches.delete(k)));
        } catch (_) {}
      }

      // Re-fetch application status and assets
      await fetchStatus();

      setClearCacheStatus('success');
      setLogs(prev => [
        ...prev,
        `[System] Application cache cleared (${data.clearedCount ?? 0} temporary items purged).`
      ]);

      setTimeout(() => {
        setClearCacheStatus('idle');
      }, 3000);
    } catch (err: any) {
      console.error("Failed to clear cache:", err);
      setClearCacheStatus('error');
      setLogs(prev => [
        ...prev,
        `[System Error] Failed to clear application cache: ${err?.message || 'Unknown error'}`
      ]);
      setTimeout(() => {
        setClearCacheStatus('idle');
      }, 3000);
    }
  };

  const getAllAssets = (type: 'front' | 'back' | 'double_sided') => {
    let serverAssets: string[] = [];
    const current = getCurrentAssets();
    if (type === 'front') {
      const fronts = current?.fronts || [];
      const doubleSided = current?.double_sided || [];
      serverAssets = fronts.filter(f => !doubleSided.some(d => stripExt(d).toLowerCase() === stripExt(f).toLowerCase()));
    } else if (type === 'back') {
      serverAssets = current?.backs || [];
    } else if (type === 'double_sided') {
      serverAssets = current?.double_sided || [];
    }

    const local = localAssets.filter(a => {
      if (a.view !== assetViewMode) return false;
      if (a.type !== type) return false;
      if (serverAssets.includes(a.name)) return false;
      if (type === 'front' && localAssets.some(other => stripExt(other.name).toLowerCase() === stripExt(a.name).toLowerCase() && other.type === 'double_sided' && other.view === assetViewMode)) {
        return false;
      }
      return true;
    }).map(a => a.name);

    return [...serverAssets, ...local];
  };


  const addLog = (newLogs: string | string[]) => {
    const logArray = (Array.isArray(newLogs) ? newLogs : [newLogs])
      .filter(l => l !== null && l !== undefined && typeof l === 'string')
      .filter(l => l.trim().length > 0);

    if (logArray.length === 0) return;
    setLogs(prev => [...prev, ...logArray]);
  };

  const savePluginConfig = async () => {
    if (!pluginSaveName) return;

    setTaskProgress({ current: 1, total: 1, message: `Saving config...` });
    try {
      await fetch('/api/library/save-decklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pluginId: pluginState.selectedPlugin.id,
          saveName: pluginSaveName.replace(/[^a-zA-Z0-9_]/g, ''),
          decklist: pluginState.decklist,
          format: pluginState.format,
          options: pluginState.options
        })
      });
      addLog(`[Plugins] Saved configuration '${pluginSaveName}' for ${pluginState.selectedPlugin.name}.`);
      setTaskProgress(prev => prev ? { ...prev, message: `Saved ${pluginSaveName} successfully.` } : null);
    } catch (e) {
      addLog(`[Error] Failed to save config: ${e}`);
    } finally {
      setPluginSaveName("");
      setShowPluginSaveModal(false);
      setTimeout(() => setTaskProgress(null), 1500);
    }
  };

  const loadPluginConfig = (name: string) => {
    const config = pluginConfigs[name];
    if (!config) return;

    const plugin = PLUGINS.find(p => p.id === config.pluginId);
    if (plugin) {
      setPluginState({
        selectedPlugin: plugin,
        format: config.format || plugin.formats[0],
        options: config.options || {},
        decklist: config.decklist || ""
      });
      addLog(`[Plugins] Loaded configuration '${name}' for ${plugin.name}.`);
      setShowPluginLoadModal(false);
    }
  };

  const deletePluginConfig = async (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    const config = pluginConfigs[name];
    if (!config) return;
    try {
      const res = await fetch('/api/library/delete-decklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, pluginId: config.pluginId })
      });
      if (res.ok) {
        addLog(`[Plugins] Deleted configuration '${name}'.`);
        await fetchPluginConfigs();
      }
    } catch (err) {
      addLog(`[Error] Failed to delete config: ${err}`);
    }
  };

  const exportPluginConfig = () => {
    const config = {
      pluginId: pluginState.selectedPlugin.id,
      format: pluginState.format,
      options: pluginState.options,
      decklist: pluginState.decklist
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `scm_plugin_${pluginState.selectedPlugin.id}_config.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    addLog("[Plugins] Exported configuration to JSON file.");
  };

  const runCommand = async (command: string, args?: string[], options?: { isPluginFetch?: boolean, startMessage?: string, hideProgressOnComplete?: boolean, tempDirId?: string, uploadedPluginFilePath?: string, crop?: string, calibration?: { x: number | string, y: number | string, angle: number | string }, upscaleOptions?: UpscaleConfig }) => {
    setTaskProgress({ current: 0, total: 1, message: options?.startMessage || `Running task...` });
    addLog(`[Console] Executing: ${command} ${args?.join(' ') || ''}`);
    const abortController = new AbortController();
    setActiveTaskController(abortController);
    try {
      const res = await fetch('/api/run-command-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command,
          args,
          isPluginFetch: options?.isPluginFetch,
          tempDirId: options?.tempDirId,
          uploadedPluginFilePath: options?.uploadedPluginFilePath,
          pythonPath,
          crop: options?.crop,
          calibration: options?.calibration,
          upscaleOptions: options?.upscaleOptions || upscaleConfig
        }),
        signal: abortController.signal
      });
      if (!res.ok) {
        addLog(`[Error] Request failed with status ${res.status}`);
        setTaskProgress(prev => prev ? { ...prev, message: 'Failed.' } : null);
        setTimeout(() => setTaskProgress(null), 1500);
        return null;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let output: string[] = [];
      let fetchedFiles: Record<string, string[]> = { fronts: [], backs: [], double_sided: [] };
      let pendingData = "";
      let success = true;

      let totalCards = 0;
      let currentCard = 0;

      if (options?.startMessage === 'Generating PDF...') {
        const assets = getCurrentAssets();
        totalCards = (assets?.fronts?.length || 0) + (assets?.double_sided?.length || 0);
        setTaskProgress({ current: 0, total: totalCards, message: 'Starting PDF generation...' });
      }

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        pendingData += decoder.decode(value, { stream: true });
        const events = pendingData.split('\n\n');
        pendingData = events.pop() || '';

        for (const event of events) {
          const lines = event.split('\n');
          let eventType = 'stdout';
          let eventData = null;
          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventType = line.substring(7);
            } else if (line.startsWith('data: ')) {
              try { eventData = JSON.parse(line.substring(6)); } catch (e) { }
            }
          }
          if (eventData !== null) {
            if (eventType === 'stdout') {
              const text = String(eventData);
              output.push(text);
              addLog(`[Console] ${text}`);

              // Detect total card count reported in output
              const totalMatch = text.match(/(?:Parsed|Found|Total(?:\s+cards)?[:\s]+)\s*(\d+)\s*(?:cards|unique entries)?/i);
              if (totalMatch) {
                const parsedTotal = parseInt(totalMatch[1]);
                if (parsedTotal > 0) totalCards = parsedTotal;
              }

              // Detect current progress indices and card names
              let matchedIndex = false;
              let cardName = '';

              // Extract card title if present anywhere on this line
              // e.g. "Index: 1, quantity: 1, set code: m10, collector number: 123, name: Black Lotus"
              const nameParamMatch = text.match(/name:\s*(.+?)(?:,\s*(?:quantity|set code|collector number|Index):|$)/i) || text.match(/name:\s*(.*)$/i);
              if (nameParamMatch && nameParamMatch[1]) {
                const cand = cleanCardName(nameParamMatch[1].trim());
                if (cand && !/^card\s*\d*$/i.test(cand)) {
                  cardName = cand;
                }
              }

              // e.g. "Slot 1: Black Lotus" or "Image 1: Black Lotus.png"
              if (!cardName) {
                const slotColonMatch = text.match(/(?:Slot|Image)\s*#?\d+:\s*(.*)$/i);
                if (slotColonMatch && slotColonMatch[1]) {
                  const cand = cleanCardName(slotColonMatch[1].trim());
                  if (cand && !/^card\s*\d*$/i.test(cand)) {
                    cardName = cand;
                  }
                }
              }

              // e.g. "Downloading Black Lotus..." or "Fetching Black Lotus..."
              if (!cardName) {
                const downloadMatch = text.match(/(?:Downloading|Fetching)\s+([^.\r\n]+?)(?:\.\.\.|$)/i);
                if (downloadMatch && downloadMatch[1]) {
                  const cand = cleanCardName(downloadMatch[1].trim());
                  if (cand && !/^card\s*\d*$/i.test(cand)) {
                    cardName = cand;
                  }
                }
              }

              // 1. Check for "Image 1 of 50: CardName", "Card 1/50 - CardName", etc.
              const idxOfTotalMatch = text.match(/(?:Image|Card|Processing|Downloading|Fetching)\s*#?(\d+)\s*(?:of|\/)\s*(\d+)(?:[:\s-]+(.*))?/i) || text.match(/^(\d+)\s*\/\s*(\d+)(?:[:\s-]+(.*))?/);
              if (idxOfTotalMatch) {
                currentCard = parseInt(idxOfTotalMatch[1]);
                const parsedTotal = parseInt(idxOfTotalMatch[2]);
                if (parsedTotal > 0) totalCards = parsedTotal;
                matchedIndex = true;
                if (!cardName && idxOfTotalMatch[3]) {
                  const cleaned = cleanCardName(idxOfTotalMatch[3].trim());
                  if (cleaned && !/^card\s*\d*$/i.test(cleaned)) {
                    cardName = cleaned;
                  }
                }
              }

              // 2. Check for single index matches: "Index: 46", "Index 46", "Slot 1:", "Image 1:"
              if (!matchedIndex) {
                const singleIdxMatch = text.match(/(?:Image|Slot|Card|Index)[:\s]+#?(\d+)/i) || text.match(/(?:Image|Slot|Card|Index)\s*#?(\d+)/i);
                if (singleIdxMatch) {
                  const val = singleIdxMatch[1];
                  if (val) {
                    currentCard = parseInt(val);
                    matchedIndex = true;
                  }
                }
              }

              // 3. Check for finalizing/compiling state e.g. "Finalizing and compiling PDF file..."
              const isCompilingMatch = text.includes('Compiling PDF') || text.includes('Finalizing and compiling') || text.includes('Generated PDF');
              if (isCompilingMatch) {
                const finalTotal = totalCards > 0 ? totalCards : Math.max(currentCard, 1);
                setTaskProgress({
                  current: finalTotal,
                  total: finalTotal,
                  percent: 98,
                  message: 'Compiling PDF document...'
                });
              } else if (matchedIndex || cardName) {
                const hasKnownTotal = totalCards > 0;
                const dispTotal = hasKnownTotal ? totalCards : 0;
                const msg = cardName || (hasKnownTotal && totalCards > 1 ? `Fetching Cards...` : `Fetching Card...`);
                // Calculate in-progress percentage only if total is known!
                const inProgressPercent = hasKnownTotal
                  ? Math.min(95, Math.max(5, Math.round(((currentCard - 0.5) / totalCards) * 100)))
                  : undefined;
                setTaskProgress(prev => ({
                  current: currentCard > 0 ? currentCard : (prev?.current ?? 0),
                  total: dispTotal,
                  totalUnknown: !hasKnownTotal,
                  percent: inProgressPercent,
                  message: msg
                }));
              }
            } else if (eventType === 'stderr') {
              output.push(`[Error] ${eventData}`);
              addLog(`[Console Error] ${eventData}`);
            } else if (eventType === 'error') {
              output.push(eventData as string);
              addLog(`[Console Error] ${eventData}`);
            } else if (eventType === 'fetched_files') {
              fetchedFiles = eventData as any;
            } else if (eventType === 'exit') {
              const exitData = eventData as any;
              success = exitData.code === 0 && !exitData.hasError;
            }
          }
        }
      }

      setActiveTaskController(null);
      const assets = await fetchStatus();

      if (!options?.hideProgressOnComplete) {
        setTaskProgress({ current: 1, total: 1, percent: 100, isComplete: true, message: 'Complete.' });
        setTimeout(() => setTaskProgress(null), 1500);
      }

      return { output, assets, fetchedFiles, success };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        addLog(`[System] Task canceled by user.`);
        setTaskProgress(prev => prev ? { ...prev, message: 'Canceled.' } : null);
      } else {
        addLog(`[Error] Execution failed: ${err}`);
        setTaskProgress(prev => prev ? { ...prev, message: 'Failed.' } : null);
      }
      setActiveTaskController(null);
      setTimeout(() => setTaskProgress(null), 1500);
      return null;
    }
  };

  const downloadFile = async (url: string, filename: string) => {
    try {
      addLog(`[System] Initiating download for ${filename}...`);

      // Verify endpoint exists without buffering the entire file into memory
      const response = await fetch(url, { method: 'HEAD' });
      if (!response.ok) {
        throw new Error(`Server returned status: ${response.status}`);
      }

      // Trigger actual download via the browser to bypass RAM limits and iframe popup limits
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      addLog(`[System] Download started for ${filename}. Check your browser downloads.`);
    } catch (e: any) {
      console.error(e);
      addLog(`[Error] Failed to trigger download for ${filename}: ${e.message}`);
    }
  };

  const playDing = () => {
    if (!playDingSound) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5);
      gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) { }
  };

  const generatePDF = async () => {
    const currentAssets = getCurrentAssets();
    const hasFronts = (currentAssets?.fronts?.length || 0) > 0;
    const hasDoubleSided = (currentAssets?.double_sided?.length || 0) > 0;

    if (!hasFronts && !hasDoubleSided) {
      addLog("[Error] Cannot generate PDF: No card fronts found in project.");
      return;
    }

    addLog("[System] Launching PDF Generator...");
    setPdfReady(false);
    const args: string[] = [];
    if (cmdOptions.specialty && cmdOptions.specialty !== 'none') {
      args.push('--specialty', cmdOptions.specialty.toString());
    } else {
      args.push(
        '--card_size', cmdOptions.card_size.toString(),
        '--paper_size', cmdOptions.paper_size.toString(),
        '--registration', cmdOptions.registration.toString()
      );
    }
    args.push(
      '--fit', cmdOptions.fit.toString(),
      '--ppi', cmdOptions.ppi.toString(),
      '--quality', cmdOptions.quality.toString()
    );
    if (cmdOptions.load_offset) args.push('--load_offset');
    if (cmdOptions.show_outline) args.push('--show_outline');
    if (cmdOptions.borderless) args.push('--borderless');
    if (cmdOptions.only_fronts) args.push('--only_fronts');
    if (cmdOptions.output_images) args.push('--output_images');
    if (cmdOptions.registration_orientation && cmdOptions.registration_orientation !== 'default') {
      args.push('--registration_orientation');
      args.push(cmdOptions.registration_orientation);
    }
    const cropVal = normalizeDimension(cmdOptions.crop, dimensionUnitPref);
    const cropBacksVal = normalizeDimension(cmdOptions.crop_backs, dimensionUnitPref);
    const extendBleedVal = normalizeDimension(cmdOptions.extend_bleed, dimensionUnitPref);
    const extendBleedBacksVal = normalizeDimension(cmdOptions.extend_bleed_backs, dimensionUnitPref);
    const extendCornersVal = normalizeDimension(cmdOptions.extend_corners, dimensionUnitPref);
    const extendCornersBacksVal = normalizeDimension(cmdOptions.extend_corners_backs, dimensionUnitPref);
    const extendEdgesVal = normalizeDimension(cmdOptions.extend_edges, dimensionUnitPref);
    const extendEdgesBacksVal = normalizeDimension(cmdOptions.extend_edges_backs, dimensionUnitPref);

    if (cropVal && cropVal !== '0') { args.push('--crop', cropVal); }
    if (cropBacksVal && cropBacksVal !== '0') { args.push('--crop_backs', cropBacksVal); }
    if (extendBleedVal && extendBleedVal !== '0') { args.push('--extend_bleed', extendBleedVal); }
    if (extendBleedBacksVal && extendBleedBacksVal !== '0') { args.push('--extend_bleed_backs', extendBleedBacksVal); }
    if (extendCornersVal && extendCornersVal !== '0') { args.push('--extend_corners', extendCornersVal); }
    if (extendCornersBacksVal && extendCornersBacksVal !== '0') { args.push('--extend_corners_backs', extendCornersBacksVal); }
    if (extendEdgesVal && extendEdgesVal !== '0') { args.push('--extend_edges', extendEdgesVal); }
    if (extendEdgesBacksVal && extendEdgesBacksVal !== '0') { args.push('--extend_edges_backs', extendEdgesBacksVal); }
    if (cmdOptions.label) { args.push('--label', cmdOptions.label); }
    if (cmdOptions.skip) { args.push('--skip', cmdOptions.skip); }

    // Sync normalized dimensions back to UI state if any were normalized
    setCmdOptions(prev => ({
      ...prev,
      crop: cropVal,
      crop_backs: cropBacksVal,
      extend_bleed: extendBleedVal,
      extend_bleed_backs: extendBleedBacksVal,
      extend_corners: extendCornersVal,
      extend_corners_backs: extendCornersBacksVal,
      extend_edges: extendEdgesVal,
      extend_edges_backs: extendEdgesBacksVal,
    }));

    const result = await runCommand('create_pdf.py', args, {
      startMessage: 'Generating PDF...',
      crop: cropVal,
      calibration: { x: calibration.x, y: calibration.y, angle: calibration.angle }
    });
    if (result?.success && result?.output && result.output.some((line: string) => line.includes('PDF generated successfully') || line.includes('PDF successfully moved') || line.includes('Generated PDF') || line.includes('Generated images') || line.includes('Output images generated successfully'))) {
      setPdfReady(true);
      setPdfReadyToastOpen(true);
      playDing();
      setTimeout(() => setPdfReadyToastOpen(false), 5000);
    } else {
      addLog("[Error] PDF Generation failed. Check console for details.");
    }
  };

  const handleToggleFlip = (identity: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFlippedAssets(prev => {
      const next = new Set(prev);
      const isCurrentlyFlipped = next.has(identity);

      if (selectedAssets.size > 1 && selectedAssets.has(identity)) {
        // Toggle all selected assets based on the state of the clicked one
        selectedAssets.forEach(item => {
          if (item.startsWith('front:') || item.startsWith('double_sided:')) {
            if (isCurrentlyFlipped) {
              next.delete(item);
            } else {
              next.add(item);
            }
          }
        });
      } else {
        // Just toggle this one
        if (isCurrentlyFlipped) next.delete(identity);
        else next.add(identity);
      }
      return next;
    });
  };

  const handleAssetSelect = (identity: string, e?: React.MouseEvent | React.TouchEvent) => {
    const isMultiSelect = e?.ctrlKey || e?.metaKey;
    const isRangeSelect = e?.shiftKey;
    const isBack = identity.startsWith('back:');

    setSelectedAssets(prev => {
      const next = new Set(prev);

      // Enforce single selection for backs
      if (isBack) {
        // Clear all other backs first
        Array.from(next).forEach((item: string) => {
          if (item.startsWith('back:')) next.delete(item);
        });
        next.add(identity);
        setLastSelected(identity);
        return next;
      }

      const currentAssets = getCurrentAssets();
      const allOrderedAssets = [
        ...(currentAssets?.fronts.map(n => `front:${n}`) || []),
        ...(currentAssets?.backs.map(n => `back:${n}`) || []),
        ...(currentAssets?.double_sided?.map(n => `double_sided:${n}`) || [])
      ];

      if (isRangeSelect && lastSelected) {
        // Find indices in the appropriate list
        const startIdx = allOrderedAssets.indexOf(lastSelected);
        const endIdx = allOrderedAssets.indexOf(identity);
        if (startIdx !== -1 && endIdx !== -1) {
          const range = allOrderedAssets.slice(
            Math.min(startIdx, endIdx),
            Math.max(startIdx, endIdx) + 1
          );
          range.forEach((item: string) => {
            if (!item.startsWith('back:')) {
              next.add(item);
            }
          });
        }
      } else if (isMultiSelect) {
        if (next.has(identity)) next.delete(identity);
        else next.add(identity);
      } else {
        // Single select
        next.clear();
        next.add(identity);
      }
      return next;
    });

    setLastSelected(identity);
  };

  const uploadToProject = async (forceReplaceBack = false, skipBack = false) => {
    try {
      if (selectedAssets.size === 0 && pendingUploadItems.length === 0) {
        addLog("[System] No assets selected for upload.");
        return;
      }

      let itemsToUpload = pendingUploadItems.length > 0 ? [...pendingUploadItems] : Array.from(selectedAssets);

      // Check for back card conflict
      const backItems = itemsToUpload.filter(item => item.startsWith('back:'));
      if (backItems.length > 1) {
        addLog("[System] Error: Cannot stage multiple back cards at once.");
        // We cannot use alert, we are logging it. Wait, the rule says NO alert!
        addLog("[System] Only one back pattern card can be selected for staging at a time.");
        return;
      }
      const hasBackSelected = backItems.length > 0;
      const projectHasBack = (status?.assets?.backs.length || 0) > 0;

      if (hasBackSelected && projectHasBack && !forceReplaceBack && !skipBack && !showConflictModal) {
        setPendingUploadItems(itemsToUpload);
        setShowConflictModal(true);
        return;
      }

      if (skipBack) {
        itemsToUpload = itemsToUpload.filter(item => !item.startsWith('back:'));
      }

      if (itemsToUpload.length === 0) {
        setShowConflictModal(false);
        setPendingUploadItems([]);
        setSelectedAssets(new Set());
        return;
      }

      const source = (assetViewMode === 'plugins' || assetViewMode === 'project') ? assetViewMode : 'library';
      addLog(`[Project] Uploading ${itemsToUpload.length} selected ${source} assets to project...`);
      await performMoveOrCopy(itemsToUpload, 'project', source as 'library' | 'plugins');
    } catch (err) {
      addLog(`[Error] Upload failed: ${err}`);
    }
  };

  const uploadToLibrary = async () => {
    try {
      if (selectedAssets.size === 0) {
        addLog("[System] No assets selected for upload.");
        return;
      }

      let itemsToUpload = Array.from(selectedAssets);

      const source = (assetViewMode === 'plugins' || assetViewMode === 'project') ? assetViewMode : 'library';
      addLog(`[Library] Uploading ${itemsToUpload.length} selected ${source} assets to library...`);
      await performMoveOrCopy(itemsToUpload, 'library', source as 'library' | 'plugins');
    } catch (err) {
      addLog(`[Error] Upload to library failed: ${err}`);
    }
  };

  const cleanUpOutputs = async () => {
    setTaskProgress({ current: 1, total: 1, message: `Cleaning up workspace...` });
    addLog("[Project] Cleaning up workspace...");
    try {
      const res = await fetch('/api/project/clean-up', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        addLog(`[Project] Success: ${data.message}`);
        setTaskProgress(prev => prev ? { ...prev, message: 'Cleaned successfully.' } : null);
        await fetchStatus();
      }
    } catch (err) {
      addLog(`[Error] Cleanup failed: ${err}`);
      setTaskProgress(prev => prev ? { ...prev, message: 'Failed.' } : null);
    }
    setTimeout(() => setTaskProgress(null), 1500);
  };

  const clearProject = async () => {
    setTaskProgress({ current: 1, total: 1, message: `Clearing project...` });
    addLog("[Project] Clearing project assets...");
    try {
      const res = await fetch('/api/project/clear', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        addLog(`[Project] Success: ${data.message}`);
        setTaskProgress(prev => prev ? { ...prev, message: 'Cleared successfully.' } : null);
        await fetchStatus();
        setLocalAssets(prev => prev.filter(a => a.view !== 'project'));
        setSelectedAssets(new Set());
        setLoadedProject(null);
      }
    } catch (err) {
      addLog(`[Error] Clear failed: ${err}`);
    } finally {
      setTimeout(() => setTaskProgress(null), 1500);
    }
  };

  const handleUpload = async (file: File, type: 'front' | 'back' | 'double_sided', isLibrary: boolean = false) => {
    if (type === 'back' && assetViewMode === 'project' && status?.assets?.backs && status.assets.backs.length > 0) {
      setPendingBackFile(file);
      setIsReplaceBackDialogOpen(true);
      return;
    }

    await performUpload(file, type, isLibrary);
  };

  const performUpload = async (file: File, type: 'front' | 'back' | 'double_sided', isLibrary: boolean) => {
    try {
      let replaceBack = false;
      if (type === 'back' && !isLibrary) {
        if (status?.assets?.backs && status.assets.backs.length > 0) {
          replaceBack = true;
        }
      }

      const url = URL.createObjectURL(file);
      const name = file.name;
      setUploadedImages(prev => ({ ...prev, [`${type}_${name}`]: url }));

      // Optimistically add to localAssets regardless of library state
      // (Since we fetchStatus 1s later anyway)
      setLocalAssets(prev => {
        if (!isLibrary && type === 'back' && replaceBack) {
          return prev.filter(asset => asset.type !== 'back').concat({ name, type, view: isLibrary ? 'library' : 'project' });
        }
        return [...prev, { name, type, view: isLibrary ? 'library' : 'project' }];
      });

      addLog(`[Uploader] Uploading ${type} asset: ${file.name}`);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      if (isLibrary) formData.append('library', 'true');
      if (replaceBack) formData.append('replaceBack', 'true');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      addLog(`[Uploader] Successfully uploaded ${name} to ${data.targetPath || 'unknown'}`);
      await fetchStatus();
    } catch (err) {
      addLog(`[Error] File upload failed: ${err}`);
      return;
    }
  };

  const handleManualCardUploadTrigger = (
    cardName: string,
    type: 'front' | 'back' | 'double_sided' = 'front',
    targets?: { name: string; type: 'front' | 'back' | 'double_sided' }[]
  ) => {
    setManualFrontUploadTarget({
      name: cardName,
      type,
      targets: targets && targets.length > 0 ? targets : undefined
    });
    if (manualFrontUploadInputRef.current) {
      manualFrontUploadInputRef.current.value = '';
      manualFrontUploadInputRef.current.click();
    }
  };
  const handleManualFrontUploadTrigger = handleManualCardUploadTrigger;

  const handleManualFrontUploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !manualFrontUploadTarget) return;

    const targetCard = manualFrontUploadTarget;
    const targetCards = (targetCard.targets && targetCard.targets.length > 0)
      ? targetCard.targets
      : [{ name: targetCard.name, type: targetCard.type }];
    const count = targetCards.length;
    const targetMode = assetViewMode === 'plugins' ? 'plugins' : (assetViewMode === 'library' ? 'library' : 'project');

    try {
      const isBack = targetCard.type === 'back' || targetCard.type === 'double_sided';
      const label = isBack ? 'backing art' : 'front art';
      setTaskProgress({ current: 0, total: count, message: `Uploading ${label} for ${count > 1 ? `${count} cards` : targetCard.name}...` });
      addLog(`[Uploader] Uploading replacement ${label} for ${count > 1 ? `${count} selected cards` : targetCard.name} (${file.name})...`);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', targetCard.type);
      formData.append('target', targetMode);
      if (targetMode === 'library') formData.append('library', 'true');
      formData.append('replaceOriginalFilename', targetCard.name);
      formData.append('replaceOriginalFilenames', JSON.stringify(targetCards.map(c => c.name)));

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Upload failed with status ${res.status}`);
      }

      const data = await res.json();
      const affectedFiles: string[] = data.files || [data.file || targetCard.name];
      const now = Date.now();

      const busts: Record<string, number> = {};
      affectedFiles.forEach(f => { busts[f] = now; });
      targetCards.forEach(c => { busts[c.name] = now; });
      setCacheBusts(prev => ({
        ...prev,
        ...busts
      }));

      const url = URL.createObjectURL(file);
      const newUploaded: Record<string, string> = {};
      affectedFiles.forEach(f => {
        newUploaded[`${targetCard.type}_${f}`] = url;
      });
      targetCards.forEach(c => {
        newUploaded[`${c.type}_${c.name}`] = url;
      });
      setUploadedImages(prev => ({
        ...prev,
        ...newUploaded
      }));

      addLog(`[Uploader] Successfully updated ${label} for ${count > 1 ? `${count} cards` : targetCard.name}`);
      setTaskProgress({ current: count, total: count, message: `${isBack ? 'Back' : 'Front'} art updated for ${count} card${count === 1 ? '' : 's'}!` });
      await fetchStatus();
    } catch (err: any) {
      addLog(`[Error] Failed to upload replacement art: ${err?.message || err}`);
      setTaskProgress({ current: 0, total: 1, message: 'Upload failed.' });
    } finally {
      setManualFrontUploadTarget(null);
      if (manualFrontUploadInputRef.current) {
        manualFrontUploadInputRef.current.value = '';
      }
      setTimeout(() => setTaskProgress(null), 1500);
    }
  };

  const handleFetchLimitlessDeckPrompt = async () => {
    console.log('Import Limitless Deck button clicked');
    const url = window.prompt("Enter Limitless TCG Deck URL or Tournament Deck ID (e.g. https://limitlesstcg.com/decks/list/29678 or 29678):");
    if (!url || !url.trim()) return;

    try {
      setTaskProgress({ current: 0, total: 1, message: "Importing deck from Limitless TCG..." });
      addLog(`[Limitless] Ingesting decklist from: ${url.trim()}...`);
      const res = await fetch(`/api/limitless/deck?url=${encodeURIComponent(url.trim())}`);
      console.log('Limitless fetch response status:', res.status);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch Limitless deck");
      }

      setPluginState(prev => ({
        ...prev,
        decklist: data.decklist
      }));

      addLog(`[Limitless] Successfully imported "${data.title}" (${data.cardCount} cards) into decklist.`);
      setTaskProgress({ current: 1, total: 1, message: `Imported ${data.title}!` });
    } catch (err: any) {
      addLog(`[Error] Limitless deck ingestion failed: ${err.message || err}`);
      setTaskProgress({ current: 0, total: 1, message: "Deck import failed." });
    } finally {
      setTimeout(() => setTaskProgress(null), 2000);
    }
  };

  const handleFetchCuriosaDeckPrompt = async () => {
    const url = window.prompt("Enter Curiosa / Sorcery Deck URL or ID (e.g. https://curiosa.io/decks/cme5x329q00k9jo04ouuycsek):");
    if (!url || !url.trim()) return;

    try {
      setTaskProgress({ current: 0, total: 1, message: "Importing deck from Curiosa..." });
      addLog(`[Curiosa] Ingesting decklist from: ${url.trim()}...`);
      const res = await fetch(`/api/curiosa/deck?url=${encodeURIComponent(url.trim())}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch Curiosa deck");
      }

      setPluginState(prev => ({
        ...prev,
        decklist: data.decklist
      }));

      addLog(`[Curiosa] Successfully imported "${data.title}" (${data.cardCount} cards) into decklist.`);
      setTaskProgress({ current: 1, total: 1, message: `Imported ${data.title}!` });
    } catch (err: any) {
      addLog(`[Error] Curiosa deck ingestion failed: ${err.message || err}`);
      setTaskProgress({ current: 0, total: 1, message: "Deck import failed." });
    } finally {
      setTimeout(() => setTaskProgress(null), 2000);
    }
  };

  const performMoveOrCopy = async (items: string[], destination: 'project' | 'library', source: 'library' | 'project' | 'plugins', conflictResolution: 'check' | 'keep' | 'replace' | 'keep_both' = 'check', backResolution: 'check' | 'keep' | 'replace' = 'check') => {
    let finalItems = [...items];
    const targetObj = destination === 'project' ? status?.assets : (destination === 'library' ? status?.library : undefined);

    // 1. Back image check (workspace only)
    if (destination === 'project' && backResolution === 'check') {
      if (targetObj && targetObj.backs.length > 0) {
        const hasBack = items.some(item => item.startsWith('back:'));
        if (hasBack) {
          setBackConflictData({ items, destination, source, conflictResolution });
          return; // pause for back check
        }
      }
    }

    if (backResolution === 'keep') {
      // Remove back items from the transfer
      finalItems = finalItems.filter(item => !item.startsWith('back:'));
      if (finalItems.length === 0) return;
    }

    // 2. Name collision check
    if (conflictResolution === 'check') {
      if (targetObj) {
        const collisions = finalItems.filter(item => {
          const [type, name] = item.split(':');
          if (type === 'front' && targetObj.fronts.includes(name)) return true;
          if (type === 'back' && targetObj.backs.includes(name)) return true;
          if (type === 'double_sided' && targetObj.double_sided?.includes(name)) return true;
          return false;
        });
        if (collisions.length > 0) {
          setImportConflictData({ items: finalItems, destination, source, collisions, backResolution });
          return; // pause for user name collision check
        }
      }
    } else if (conflictResolution === 'keep') {
      if (targetObj) {
        finalItems = finalItems.filter(item => {
          const [type, name] = item.split(':');
          if (type === 'front' && targetObj.fronts.includes(name)) return false;
          if (type === 'back' && targetObj.backs.includes(name)) return false;
          if (type === 'double_sided' && targetObj.double_sided?.includes(name)) return false;
          return true;
        });
      }
    }

    if (finalItems.length === 0) return;

    let clearBackFirst = backResolution === 'replace';

    let allResults: any[] = [];
    for (let i = 0; i < finalItems.length; i++) {
      setTaskProgress({ current: i + 1, total: finalItems.length, message: `Processing ${finalItems[i].split(':')[1]}...` });
      try {
        // Pass clearBackFirst only on the first item to avoid doing it multiple times
        const res = await fetch('/api/plugin/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identity: finalItems[i],
            destination,
            source,
            clearBackFirst: clearBackFirst && i === 0,
            keepBoth: conflictResolution === 'keep_both'
          })
        });
        const data = await res.json();
        if (data.results) {
          data.results.forEach((r: any) => {
            addLog(`[Action: Move/Copy] ${r.from} -> ${r.to} (Success)`);
          });
          allResults = allResults.concat(data.results.map((r: any) => `${finalItems[i].split(':')[0]}:${r.name}`));
        }
      } catch (e) { }
    }

    if (allResults.length > 0) {
      setFileUndoStack(prev => [...prev, { action: 'import', items: allResults, destination }]);

      if (conflictResolution === 'replace') {
        const newBusts = { ...cacheBusts };
        items.forEach(item => {
          const name = item.split(':')[1];
          newBusts[name] = Date.now();
        });
        setCacheBusts(newBusts);
      }
    }

    const actionStr = destination === 'project' ? 'added' : 'copied';
    setTaskProgress({ current: finalItems.length, total: finalItems.length, message: `${finalItems.length} card${finalItems.length === 1 ? '' : 's'} ${actionStr}` });
    await fetchStatus();
    setSelectedAssets(new Set());
    setContextMenu(null);
    setTimeout(() => setTaskProgress(null), 1500);
    addLog(`[System] Moved ${finalItems.length} cards to ${destination}.`);
  };

  const saveProject = async (customName?: string) => {
    const nameToUse = (typeof customName === 'string' && customName.trim()) ? customName.trim() : saveName.trim();
    if (!nameToUse) return;
    setTaskProgress({ current: 1, total: 1, message: `Saving project '${nameToUse}'...` });
    addLog(`[Project] Saving current assets as '${nameToUse}'...`);
    try {
      const res = await fetch('/api/project/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameToUse })
      });
      const data = await res.json();
      if (data.success) {
        addLog(`[Project] Success: ${data.message}`);
        setLoadedProject(nameToUse);
        setSaveName("");
        setShowSaveModal(false);
        setTaskProgress(prev => prev ? { ...prev, message: 'Saved successfully.' } : null);
        await fetchStatus();
      }
    } catch (err) {
      addLog(`[Error] Save failed: ${err}`);
    } finally {
      setTimeout(() => setTaskProgress(null), 1500);
    }
  };

  const loadProject = async (name: string) => {
    setTaskProgress({ current: 1, total: 1, message: `Loading project '${name}'...` });
    addLog(`[Project] Loading project '${name}'...`);
    try {
      const res = await fetch('/api/project/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      const data = await res.json();
      if (data.success) {
        addLog(`[Project] Success: ${data.message}`);
        setShowLoadModal(false);
        setLoadedProject(name);
        setTaskProgress(prev => prev ? { ...prev, message: 'Loaded successfully.' } : null);
        await fetchStatus();
        setSelectedAssets(new Set());
      }
    } catch (err) {
      addLog(`[Error] Load failed: ${err}`);
    } finally {
      setTimeout(() => setTaskProgress(null), 1500);
    }
  };

  const deleteProject = async (e: any | null, name: string) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch('/api/project/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      if (res.ok) {
        addLog(`[Project] Deleted project '${name}'.`);
        await fetchStatus();
      }
    } catch (err) {
      addLog(`[Error] Failed to delete project: ${err}`);
    }
  };

  const renameProject = async (oldName: string, newName: string) => {
    try {
      const res = await fetch('/api/project/rename', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldName, newName })
      });
      if (res.ok) {
        addLog(`[Project] Renamed project from '${oldName}' to '${newName}'.`);
        await fetchStatus();
      } else {
        addLog(`[Error] Failed to rename project.`);
      }
    } catch (err) {
      addLog(`[Error] Failed to rename project: ${err}`);
    }
  };

  const exportProject = () => {
    addLog("[Project] Exporting project to file...");
    window.open('/api/project/export', '_blank');
  };

  const handleDownloadTemplate = async (format: string) => {
    try {
      const filename = `${cmdOptions.paper_size}-${cmdOptions.card_size}.${format}`;
      addLog(`[System] Exporting template: ${filename}...`);
      const response = await fetch(`/api/download-template/${filename}?borderless=${cmdOptions.borderless}`);
      if (!response.ok) {
        throw new Error(`Template file not found or server error (status ${response.status})`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      addLog(`[System] Template ${filename} downloaded successfully.`);
    } catch (error: any) {
      addLog(`[Error] Failed to download template: ${error.message}`);
    }
  };

  const importProjectRef = useRef<HTMLInputElement>(null);
  const handleImportProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        const itemsToUpload = [
          ...(data.fronts || []).map((f: string) => `front:${f}`),
          ...(data.backs || []).map((b: string) => `back:${b}`),
          ...(data.double_sided || []).map((d: string) => `double_sided:${d}`)
        ];

        const hasImages = data.images && typeof data.images === 'object' && Object.keys(data.images).length > 0;
        if (itemsToUpload.length === 0 && !hasImages) {
          addLog(`[Error] Imported JSON contains no items or images.`);
          return;
        }

        const presetName = data.name || file.name.replace(/_export\.json$/i, '').replace(/\.json$/i, '');
        setTaskProgress({ current: 1, total: 1, message: "Importing preset assets & images..." });

        const res = await fetch('/api/project/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: itemsToUpload,
            images: data.images || {},
            decklists: data.decklists || {},
            name: presetName,
            saveAsPreset: true
          })
        });
        const result = await res.json();

        if (result.success) {
          addLog(`[Project] Successfully imported preset '${presetName}' (${result.message}).`);
          setLoadedProject(presetName);
          await fetchStatus();
        } else {
          addLog(`[Error] Failed to import: ${result.error}`);
        }
      } catch (err: any) {
        addLog(`[Error] Invalid JSON format uploaded: ${err?.message || err}`);
      } finally {
        setTimeout(() => setTaskProgress(null), 1500);
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  const handleRepair = async () => {
    setIsProcessing(true);
    setTaskProgress({ current: 0, total: 1, message: 'Repairing local files...' });
    addLog("[Admin] Initiating script repair from app bundle...");
    try {
      const res = await fetch('/api/admin/repair-scripts', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        addLog(`[Admin] Success: ${data.message}`);
        setTaskProgress({ current: 1, total: 1, message: 'Repair Complete' });
        await fetchStatus();
        playDing();
      } else {
        throw new Error(data.error || "Repair failed");
      }
    } catch (err: any) {
      addLog(`[Error] Repair failed: ${err.message}`);
      setTaskProgress({ current: 1, total: 1, message: 'Repair Failed' });
    } finally {
      setIsProcessing(false);
      setTimeout(() => setTaskProgress(null), 2000);
    }
  };

  return (
    <div className={cn("flex h-screen bg-[#0a0a0c] text-[#e1e1e6] font-sans selection:bg-primary-500/30 overflow-hidden", isDragSelecting && "touch-none")}>
      <ErrorBanner logs={logs} />
      <AnimatePresence>
        {isSettingUpPython && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1001] flex items-center justify-center bg-black/80 backdrop-blur-md pointer-events-auto"
          >
            <div className={cn("flex flex-col items-center gap-6 p-10 bg-[#0f0f13] rounded-3xl border shadow-[0_0_60px_-15px_rgba(16,185,129,0.3)] max-w-xl w-full text-center", pythonSetupProgress.step === 'Failed' ? 'border-rose-500/50 shadow-[0_0_60px_-15px_rgba(244,63,94,0.3)]' : 'border-primary-500/20')}>

              {pythonSetupProgress.step === 'Ready' && (
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/50 mb-2">
                  <Check className="w-8 h-8 text-emerald-400" />
                </div>
              )}

              {pythonSetupProgress.step === 'Failed' && (
                <div className="w-16 h-16 rounded-full bg-rose-500/20 flex items-center justify-center border border-rose-500/50 mb-2">
                  <AlertCircle className="w-8 h-8 text-rose-400" />
                </div>
              )}

              {pythonSetupProgress.step !== 'Ready' && pythonSetupProgress.step !== 'Failed' && (
                <Loader2 className="w-12 h-12 text-primary-500 animate-spin mb-2" />
              )}

              <div className="space-y-2">
                <h3 className={cn("text-lg font-bold tracking-wide", pythonSetupProgress.step === 'Failed' ? 'text-rose-400' : 'text-white')}>{pythonSetupProgress.step}</h3>
                {pythonSetupProgress.detail && (
                  <p className="text-sm font-medium text-white/50">{pythonSetupProgress.detail}</p>
                )}
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mt-2">
                <div
                  className={cn("h-full rounded-full transition-all duration-500 ease-in-out", pythonSetupProgress.step === 'Failed' ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 'bg-primary-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]')}
                  style={{ width: `${pythonSetupProgress.percent || 10}%` }}
                ></div>
              </div>
              <div className="w-full h-48 bg-black/50 border border-white/10 rounded-xl mt-4 overflow-y-auto text-left p-3 font-mono text-xs text-white/70">
                {setupLogs.map((log, i) => (
                  <div key={i} className={cn(log.includes('[ERROR]') || log.includes('Failed') ? 'text-rose-400' : '')}>{log}</div>
                ))}
                <div ref={setupLogEndRef} />
              </div>

              {(!status?.isElectron || pythonSetupProgress.step === 'Failed') && (
                <button
                  onClick={() => {
                    setIsSettingUpPython(false);
                    if (!status?.isElectron) {
                      localStorage.setItem('scm_python_path', 'preview_bypass');
                    }
                  }}
                  className="mt-4 px-8 py-3 bg-white/5 hover:bg-white/10 text-white font-bold tracking-widest text-xs uppercase rounded-xl transition-colors border border-white/10"
                >
                  {!status?.isElectron ? "Skip Setup (Preview Mode)" : "Dismiss & Continue in Local Mode"}
                </button>
              )}
            </div>
          </motion.div>
        )}

        {isProcessing && !isSettingUpPython && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-auto"
          >
            <div className="flex flex-col items-center gap-4 p-8 bg-[#0f0f13] rounded-2xl border border-white/10 shadow-2xl">
              <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
              <span className="text-white/80 font-medium tracking-wide">Processing...</span>
            </div>
          </motion.div>
        )}

        {taskProgress && (() => {
          const isComplete = !!taskProgress.isComplete || 
            taskProgress.message.toLowerCase().startsWith('complete') ||
            taskProgress.message.toLowerCase().includes('finished') ||
            taskProgress.message.toLowerCase().includes('successfully') ||
            taskProgress.message.toLowerCase().includes('saved') ||
            taskProgress.message.toLowerCase().includes('cleaned') ||
            taskProgress.message.toLowerCase().startsWith('imported');

          const isUnknownTotal = !!taskProgress.totalUnknown || taskProgress.total <= 0;

          const displayPercent = taskProgress.percent !== undefined
            ? Math.min(100, Math.max(0, taskProgress.percent))
            : isComplete
              ? 100
              : !isUnknownTotal
                ? Math.min(95, Math.max(5, Math.round(((Math.max(1, taskProgress.current) - 0.5) / taskProgress.total) * 100)))
                : 0;

          let displayTitle = taskProgress.message || '';
          if (isComplete) {
            displayTitle = taskProgress.message || 'Complete.';
          } else {
            let clean = displayTitle
              .replace(/\s*\(\s*\d+\s*(?:of|\/)\s*\d+\s*\)\s*\.{0,3}/gi, '')
              .replace(/(?:Card|Image|Slot|Index)\s*#?\d+\s*(?:of|\/)\s*\d+\s*\.{0,3}/gi, '')
              .replace(/(?:Card|Image|Slot|Index)\s*#?\d+\s*\.{0,3}/gi, '')
              .replace(/^\s*\d+\s*(?:of|\/)\s*\d+\s*:?\s*/gi, '')
              .replace(/\.{2,}$/, '')
              .trim();

            if (!clean || /^card\s*\d*$/i.test(clean) || /^image\s*\d*$/i.test(clean)) {
              displayTitle = (!isUnknownTotal && taskProgress.total > 1) ? 'Fetching Cards...' : 'Fetching Card...';
            } else {
              displayTitle = clean;
            }
          }

          return (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              className="fixed bottom-6 right-6 z-[1000] flex items-center gap-4 p-4 bg-[#0f0f13] rounded-2xl border border-primary-500/30 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)] min-w-[300px]"
            >
              {(isUnknownTotal || (taskProgress.total <= 1 && taskProgress.current === 0)) && !isComplete ? (
                <Loader2 className="w-10 h-10 text-primary-500 animate-spin flex-none" />
              ) : (
                <div className="relative">
                  <svg className="w-10 h-10 transform -rotate-90">
                    <circle cx="20" cy="20" r="18" className="stroke-white/10 flex-none" strokeWidth="4" fill="none" />
                    <circle
                      cx="20"
                      cy="20"
                      r="18"
                      className="stroke-primary-500 transition-all duration-300"
                      strokeWidth="4"
                      fill="none"
                      strokeDasharray={113}
                      strokeDashoffset={113 - (113 * (displayPercent / 100))}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
                    {displayPercent}%
                  </span>
                </div>
              )}
              <div className="flex flex-col flex-1 pl-2 min-w-0">
                {taskProgress.activeWorkers && Object.keys(taskProgress.activeWorkers).length > 1 ? (
                  <div className="space-y-1.5 py-0.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-primary-400 gap-4">
                      <span>Active Workers ({Object.keys(taskProgress.activeWorkers).length})</span>
                      {taskProgress.total > 1 && (
                        <span className="text-white/60 font-mono">
                          Card {taskProgress.current} of {taskProgress.total}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-w-[460px]">
                      {Object.entries(taskProgress.activeWorkers).map(([wid, w]) => (
                        <div
                          key={wid}
                          className={cn(
                            "flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] border transition-all truncate",
                            w.status === 'upscaling'
                              ? "bg-white/[0.06] border-primary-500/30 text-white shadow-sm"
                              : "bg-white/[0.02] border-white/5 text-white/50"
                          )}
                        >
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full shrink-0",
                            w.status === 'upscaling' ? "bg-emerald-400 animate-pulse" : "bg-white/30"
                          )} />
                          <span className="font-mono text-primary-400 font-bold shrink-0">W{wid}:</span>
                          <span className="truncate" title={w.cardName}>{w.cardName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="text-sm font-bold text-white/90 truncate" title={displayTitle}>
                      {displayTitle}
                    </span>
                    {taskProgress.current > 0 && !isComplete && (
                      <span className="text-[11px] font-semibold text-primary-400">
                        {!isUnknownTotal && taskProgress.total > 1
                          ? `Card ${taskProgress.current} of ${taskProgress.total}`
                          : `Card ${taskProgress.current}`}
                      </span>
                    )}
                  </>
                )}
              </div>
              {activeTaskController && !isComplete && (
                <button
                  onClick={() => activeTaskController.abort()}
                  className="px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg text-xs font-bold transition-colors shrink-0"
                >
                  Cancel
                </button>
              )}
            </motion.div>
          );
        })()}

        {pdfReadyToastOpen && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[1000] flex items-center justify-between gap-6 p-4 pl-5 bg-[#0f0f13] rounded-2xl border border-emerald-500/30 shadow-[0_8px_32px_-8px_rgba(16,185,129,0.3)] min-w-[340px]"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-full">
                <CheckCircle size={24} />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white">PDF Generation Complete</span>
                <span className="text-xs text-white/60 mt-0.5">Your document is ready to download.</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="/api/project/download-pdf"
                download="game.pdf"
                onClick={() => setPdfReadyToastOpen(false)}
                className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg text-xs font-bold transition-colors"
              >
                Download
              </a>
              <button onClick={() => setPdfReadyToastOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white">
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Sidebar */}
      <aside className={cn(
        "hidden md:flex flex-col border-r border-white/5 bg-[#0f0f13] transition-all duration-300 relative",
        isSidebarCollapsed ? "w-20" : "w-64"
      )}>
        <div className={cn("p-6 pb-2", isSidebarCollapsed && "px-4")}>
          <div className="flex items-center justify-between mb-8 group relative">
            <div
              className={cn("flex items-center gap-3 cursor-pointer", isSidebarCollapsed && "w-full justify-center")}
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              <div className="w-10 h-10 bg-primary-600 rounded-xl shadow-lg shadow-primary-600/30 shrink-0 select-none flex items-center justify-center">
                {appIcon ? (
                  <img src={appIcon} className="w-5 h-5 object-contain" referrerPolicy="no-referrer" alt="Logo" />
                ) : (
                  <Layers className="w-5 h-5 text-white" />
                )}
              </div>
              {!isSidebarCollapsed && (
                <motion.h1
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="font-extrabold text-base tracking-tighter whitespace-nowrap text-white select-none"
                >
                  SCMUI
                </motion.h1>
              )}
            </div>
          </div>

          <nav className="space-y-1">
            <SidebarItem
              icon={<Settings size={18} />}
              label="Dashboard"
              active={activeTab === 'dashboard'}
              onClick={() => setActiveTab('dashboard')}
              collapsed={isSidebarCollapsed}
            />
            <SidebarItem
              icon={<Layers size={18} />}
              label="PDF Builder"
              active={activeTab === 'builder'}
              onClick={() => setActiveTab('builder')}
              collapsed={isSidebarCollapsed}
            />
            <SidebarItem
              icon={<ImageIcon size={18} />}
              label="Asset Library"
              active={activeTab === 'assets'}
              onClick={() => {
                setActiveTab('assets');
                setAssetViewMode('library'); // Or project, depending on what they were viewing, but library is fine
              }}
              collapsed={isSidebarCollapsed}
            />
            <SidebarItem
              icon={<Terminal size={18} />}
              label="System Console"
              active={activeTab === 'console'}
              onClick={() => setActiveTab('console')}
              collapsed={isSidebarCollapsed}
            />
          </nav>
        </div>

        {!isSidebarCollapsed ? (
          <div className="mt-auto p-6 space-y-4">
            <div className="p-4 rounded-xl bg-primary-600/10 border border-primary-500/20 space-y-2">
              <p className="text-[10px] font-semibold text-primary-400 uppercase tracking-widest">Status</p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-white/40 text-[10px]">Python</span>
                  {pythonStatus === null ? (
                    <span className="text-white/40 font-mono text-[10px]">Checking...</span>
                  ) : pythonStatus.found ? (
                    <span className="text-emerald-400 font-mono text-[10px] flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> {pythonStatus.version} ({pythonStatus.type})</span>
                  ) : (
                    <span className="text-rose-400 font-mono text-[10px] flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Python Not Found</span>
                  )}
                </div>
                <div
                  className="flex justify-between items-center cursor-pointer group/ver p-1 -m-1 rounded-lg hover:bg-white/5 transition-all"
                  onClick={() => {
                    setShowThemeSettings(true);
                    setSettingsTab('system');
                  }}
                  title="Click to check updates or switch versions"
                >
                  <span className="text-white/40 text-[10px] group-hover/ver:text-white/70 transition-colors flex items-center gap-1">
                    Version
                    <ExternalLink size={9} className="opacity-0 group-hover/ver:opacity-100 transition-opacity" />
                  </span>
                  <div className="flex items-center gap-1.5">
                    {updateInfo?.hasUpdate && (
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
                      </span>
                    )}
                    <span className={cn(
                      "font-mono text-[10px] transition-colors",
                      updateInfo?.hasUpdate ? "text-primary-400 font-bold" : "text-white/80 group-hover/ver:text-white"
                    )}>
                      {updateInfo?.currentVersion ? (updateInfo.currentVersion.startsWith('v') || updateInfo.currentVersion.startsWith('V') ? updateInfo.currentVersion : `v${updateInfo.currentVersion}`) : 'v3.0.7'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 px-2 pt-2 border-t border-white/5">
              <p className="text-[10px] font-semibold text-white/20 uppercase tracking-widest">Support the Creators</p>
              <div className="space-y-3">
                <a
                  href="https://www.paypal.com/donate/?hosted_button_id=ZH2XCSLXERBW8"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex flex-col group transition-all text-left"
                >
                  <div className="flex items-center justify-between text-xs text-white/40 group-hover:text-primary-400 transition-colors">
                    <span className="font-semibold">Donate to Alan Cha</span>
                    <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <span className="text-[10px] text-white/20 mt-0.5">SCM Creator</span>
                </a>
                <a
                  href="https://www.paypal.com/donate/?business=YB3JBRNMXGUWG&no_recurring=0&item_name=Thanks+for+supporting+SCMUI%21&currency_code=USD"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex flex-col group transition-all text-left"
                >
                  <div className="flex items-center justify-between text-xs text-white/40 group-hover:text-primary-400 transition-colors">
                    <span className="font-semibold">Donate to Cecil Carnes</span>
                    <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <span className="text-[10px] text-white/20 mt-0.5">SCM UI Creator</span>
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-auto p-4 flex flex-col items-center gap-4 py-8 invisible">
            <div className={cn("w-2 h-2 rounded-full", status?.installed ? "bg-emerald-500" : "bg-amber-500")} />
            <button className="text-white/20 hover:text-white transition-colors">
              <MessageSquare size={18} />
            </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <ErrorBoundary>
        <main className="flex-1 flex flex-col relative overflow-hidden pb-16 md:pb-0">
          {/* Header */}
          <header className="h-16 border-b border-white/5 px-4 md:px-8 flex items-center justify-between bg-[#0f0f13]/50 backdrop-blur-sm z-10 font-mono">
            <div className="flex items-center gap-4">
              {loadedProject && (
                <div className="hidden sm:flex items-center gap-2">
                  <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Project</span>
                  <ChevronRight size={12} className="text-white/10" />
                  <span className="text-sm font-semibold text-white/60">{loadedProject}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 md:gap-4 ml-auto">
              {pdfReady && (
                <div className="flex items-center gap-1.5 md:gap-2">
                  {cmdOptions.output_images ? (
                    <button
                      onClick={async () => {
                        try {
                          const response = await fetch('/api/download-output-images');
                          if (!response.ok) {
                            const errorData = await response.json().catch(() => ({}));
                            addLog(`[Error] ${errorData.message || "Failed to zip images."}`);
                            return;
                          }
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.setAttribute('download', 'output_images.zip');
                          document.body.appendChild(link);
                          link.click();
                          link.remove();
                          window.URL.revokeObjectURL(url);
                        } catch (err: any) {
                          addLog(`[Error] Network error occurred during download: ${err.message}`);
                        }
                      }}
                      className="flex items-center gap-2 px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-semibold transition-all active:scale-95"
                      title="Download Images"
                    >
                      <Download size={14} />
                      <span className="hidden md:inline">Download Images</span>
                    </button>
                  ) : (
                    <a
                      href="/api/project/download-pdf"
                      download="game.pdf"
                      className="flex items-center gap-2 px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-semibold transition-all active:scale-95"
                      title="Download PDF"
                    >
                      <Download size={14} />
                      <span className="hidden md:inline">Download PDF</span>
                    </a>
                  )}
                </div>
              )}
              <button
                onClick={generatePDF}
                className="flex items-center gap-2 px-3 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-xs font-semibold transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:shadow-none"
              >
                <Play size={14} className="fill-current" />
                <span className="hidden sm:inline">Generate</span>
              </button>
              <div className="h-4 w-px bg-white/10 mx-1 md:mx-2" />
              <button onClick={() => setShowThemeSettings(true)} className="text-white/40 hover:text-white transition-colors p-1">
                <Settings size={18} />
              </button>
            </div>
          </header>

          {/* Tab Content */}
          <div id="main-scroll-container" className="flex-1 overflow-y-auto p-4 md:p-8 relative min-h-0">
            <AnimatePresence mode="wait">
              {activeTab === 'dashboard' && (
                <div className="flex flex-col gap-6">
                  {status?.isElectron && status?.integrityOk === false && (
                    <motion.div
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6"
                    >
                      <div className="flex items-start gap-4 text-left">
                        <div className="p-3 bg-rose-500/20 rounded-xl border border-rose-500/40">
                          <ShieldCheck className="text-rose-400" size={24} />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white mb-1">Local Scripts Missing</h3>
                          <p className="text-sm text-white/60 max-w-xl">
                            The core Python scripts aren't present in your local app data directory. This usually happens if initialization failed during first run.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleRepair}
                        className="px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap"
                      >
                        <RefreshCw size={18} className={isProcessing ? "animate-spin" : ""} />
                        {isProcessing ? 'Restoring...' : 'Repair Scripts'}
                      </button>
                    </motion.div>
                  )}

                  <motion.div
                    key="dashboard"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="max-w-4xl space-y-6"
                  >
                    <section className="p-8 rounded-2xl bg-[#0f0f13] border border-white/5 relative overflow-hidden group">
                      <h2 className="text-2xl font-bold mb-2">Silhouette Master Studio</h2>
                      <p className="text-white/60 max-w-xl leading-relaxed mb-6">
                        High-performance card generation engine. Build custom PDFs with precision blade offset calibration.
                      </p>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setActiveTab('builder')}
                          className="px-6 py-2.5 bg-primary-600 hover:bg-primary-500 rounded-xl font-semibold transition-all flex items-center gap-2 shadow-lg shadow-primary-600/20"
                        >
                          <Layers size={18} />
                          Launch PDF Builder
                        </button>
                        <a
                          href="https://alan-cha.github.io/silhouette-card-maker/tutorial/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-6 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl font-semibold border border-white/10 transition-all flex items-center gap-2 text-white/80"
                        >
                          <Book size={18} />
                          Tutorial Guide
                        </a>
                      </div>
                    </section>
                  </motion.div>
                </div>
              )}

              {activeTab === 'builder' && (
                <motion.div
                  key="builder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8"
                >
                  <div className="col-span-1 lg:col-span-3 space-y-8">
                    <div className="space-y-4">
                      <div className="flex justify-between items-start select-none">
                        <div>
                          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                            PDF Generator
                          </h2>
                          <p className="text-white/40 leading-relaxed mt-2">Configure the layout engine with precise CLI arguments. Every change here updates the underlying command string.</p>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setIsPdfPresetsOpen(true); }} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors text-xs font-bold flex items-center gap-2 shrink-0 cursor-pointer" title="CLI Print Options Presets">
                          <Settings2 size={16} /> Presets
                        </button>
                      </div>
                    </div>

                    <div className="space-y-8 pt-4">
                      <div className="flex flex-col gap-4">
                        <div
                          className="flex items-center gap-2 cursor-pointer select-none group w-fit"
                          onClick={() => setIsPdfGeneratorCollapsed(!isPdfGeneratorCollapsed)}
                        >
                          <h4 className="text-xs font-bold uppercase tracking-widest text-primary-400 group-hover:text-primary-300 transition-colors">General Settings & Rendering</h4>
                          <ChevronDown size={14} className={cn("text-primary-400 transition-transform duration-300", !isPdfGeneratorCollapsed && "rotate-180")} />
                        </div>

                        <AnimatePresence>
                          {!isPdfGeneratorCollapsed && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* General Settings */}
                                <div className="space-y-4">
                                  <SelectGroup
                                    label="Specialty Layout"
                                    value={cmdOptions.specialty || 'none'}
                                    onChange={(v) => setCmdOptions(p => ({ ...p, specialty: v }))}
                                    options={['none', 'letter-commander', 'a4-commander']}
                                  />
                                  {cmdOptions.specialty && cmdOptions.specialty !== 'none' && (
                                    <p className="text-[10px] text-primary-300 bg-primary-500/10 border border-primary-500/20 rounded-lg p-2 leading-relaxed">
                                      Specialty layout active: 100-card Commander micro-deck on a single sheet. Overrides Card Size, Paper Size, and Registration.
                                    </p>
                                  )}
                                  <SelectGroup
                                    label="Card Size"
                                    value={cmdOptions.card_size}
                                    onChange={(v) => setCmdOptions(p => ({ ...p, card_size: v }))}
                                    badge={
                                      (cmdOptions.card_size === 'standard_mtg' || cmdOptions.card_size === 'standard_sorcery') ? (
                                        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shadow-sm">
                                          <Sparkles size={9} />
                                          SCM-Extras
                                        </span>
                                      ) : undefined
                                    }
                                    options={['standard', 'standard_mtg', 'standard_sorcery', 'poker', 'bridge', 'american_mini', 'bridge_square', 'business', 'catan', 'credit', 'domino', 'domino_square', 'euro_business', 'euro_mini', 'japanese', 'jumbo', 'micro', 'mini', 'standard_double', 'tarot', '70mm_square']}
                                  />
                                  <SelectGroup
                                    label="Paper Size"
                                    value={cmdOptions.paper_size}
                                    onChange={(v) => setCmdOptions(p => ({ ...p, paper_size: v }))}
                                    options={['letter', 'legal', 'tabloid', 'a4', 'a3', 'arch_b']}
                                  />
                                  <SelectGroup
                                    label="Registration"
                                    value={cmdOptions.registration}
                                    onChange={(v) => setCmdOptions(p => ({ ...p, registration: v }))}
                                    options={['3', '4']}
                                  />
                                  <SelectGroup
                                    label="Reg. Mark Orientation"
                                    value={cmdOptions.registration_orientation || 'default'}
                                    onChange={(v) => setCmdOptions(p => ({ ...p, registration_orientation: v }))}
                                    options={['default', 'portrait', 'landscape']}
                                  />
                                </div>

                                {/* Rendering Settings */}
                                <div className="space-y-4">
                                  <SelectGroup
                                    label="Fit Strategy"
                                    value={cmdOptions.fit}
                                    onChange={(v) => setCmdOptions(p => ({ ...p, fit: v }))}
                                    options={['stretch', 'crop']}
                                  />
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5 flex-1">
                                      <label className="text-[10px] font-bold uppercase tracking-widest text-white/30">PPI</label>
                                      <input
                                        type="number"
                                        value={cmdOptions.ppi}
                                        onChange={(e) => setCmdOptions(p => ({ ...p, ppi: parseInt(e.target.value) || 1200 }))}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs focus:border-primary-500 transition-all font-mono"
                                      />
                                    </div>
                                    <div className="space-y-1.5 flex-1">
                                      <label className="text-[10px] font-bold uppercase tracking-widest text-white/30">Quality</label>
                                      <input
                                        type="number"
                                        value={cmdOptions.quality}
                                        onChange={(e) => setCmdOptions(p => ({ ...p, quality: parseInt(e.target.value) || 100 }))}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs focus:border-primary-500 transition-all font-mono"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Advanced Options */}
                      <div className="flex flex-col gap-4 md:col-span-2 pt-2">
                        <div className="flex items-center justify-between">
                          <div
                            className="flex items-center gap-2 cursor-pointer select-none group w-fit"
                            onClick={() => setIsAdvancedCollapsed(!isAdvancedCollapsed)}
                          >
                            <h4 className="text-xs font-bold uppercase tracking-widest text-primary-400 group-hover:text-primary-300 transition-colors">Advanced</h4>
                            <ChevronDown size={14} className={cn("text-primary-400 transition-transform duration-300", !isAdvancedCollapsed && "rotate-180")} />
                          </div>

                          {/* Simple top-right mm | in toggle switch */}
                          <div className="flex items-center bg-black/40 rounded-lg p-0.5 border border-white/10">
                            <button
                              type="button"
                              onClick={() => handleSwitchAllUnits('mm')}
                              className={cn(
                                "px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer",
                                dimensionUnitPref === 'mm' ? "bg-primary-500 text-white shadow" : "text-white/40 hover:text-white/80"
                              )}
                            >
                              mm
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSwitchAllUnits('in')}
                              className={cn(
                                "px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer",
                                dimensionUnitPref === 'in' ? "bg-primary-500 text-white shadow" : "text-white/40 hover:text-white/80"
                              )}
                            >
                              in
                            </button>
                          </div>
                        </div>

                        <AnimatePresence>
                          {!isAdvancedCollapsed && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="space-y-4 pb-2 px-1 text-left">
                                {/* Crop Group */}
                                <div className="bg-white/[0.02] border border-white/10 rounded-xl p-3.5 space-y-3">
                                  <label className="text-[11px] font-bold uppercase tracking-wider text-primary-400 block">Crop</label>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <DimensionField
                                      label="Crop Fronts"
                                      value={cmdOptions.crop}
                                      onChange={(val) => setCmdOptions(p => ({ ...p, crop: val }))}
                                      unit={dimensionUnitPref}
                                    />
                                    <DimensionField
                                      label="Crop Backs"
                                      value={cmdOptions.crop_backs}
                                      onChange={(val) => setCmdOptions(p => ({ ...p, crop_backs: val }))}
                                      unit={dimensionUnitPref}
                                    />
                                  </div>
                                </div>

                                {/* Bleed Group */}
                                <div className="bg-white/[0.02] border border-white/10 rounded-xl p-3.5 space-y-3">
                                  <label className="text-[11px] font-bold uppercase tracking-wider text-primary-400 block">Bleed</label>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <DimensionField
                                      label="Outer Bleed Fronts"
                                      value={cmdOptions.extend_bleed}
                                      onChange={(val) => setCmdOptions(p => ({ ...p, extend_bleed: val }))}
                                      unit={dimensionUnitPref}
                                    />
                                    <DimensionField
                                      label="Outer Bleed Backs"
                                      value={cmdOptions.extend_bleed_backs}
                                      onChange={(val) => setCmdOptions(p => ({ ...p, extend_bleed_backs: val }))}
                                      unit={dimensionUnitPref}
                                    />
                                  </div>
                                </div>

                                {/* Extend Group */}
                                <div className="bg-white/[0.02] border border-white/10 rounded-xl p-3.5 space-y-3">
                                  <label className="text-[11px] font-bold uppercase tracking-wider text-primary-400 block">Extend</label>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                                    <DimensionField
                                      label="Extend Edges Fronts"
                                      value={cmdOptions.extend_edges}
                                      onChange={(val) => setCmdOptions(p => ({ ...p, extend_edges: val }))}
                                      unit={dimensionUnitPref}
                                    />
                                    <DimensionField
                                      label="Extend Edges Backs"
                                      value={cmdOptions.extend_edges_backs}
                                      onChange={(val) => setCmdOptions(p => ({ ...p, extend_edges_backs: val }))}
                                      unit={dimensionUnitPref}
                                    />
                                    <DimensionField
                                      label="Extend Corners Fronts"
                                      value={cmdOptions.extend_corners || ''}
                                      onChange={(val) => setCmdOptions(p => ({ ...p, extend_corners: val }))}
                                      unit={dimensionUnitPref}
                                    />
                                    <DimensionField
                                      label="Extend Corners Backs"
                                      value={cmdOptions.extend_corners_backs}
                                      onChange={(val) => setCmdOptions(p => ({ ...p, extend_corners_backs: val }))}
                                      unit={dimensionUnitPref}
                                    />
                                  </div>
                                </div>

                                {/* Skip Group (On its own, above Page Margin Label) */}
                                <div className="bg-white/[0.02] border border-white/10 rounded-xl p-3.5 space-y-2">
                                  <label className="text-[11px] font-bold uppercase tracking-wider text-primary-400 block">Skip</label>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-white/60 block">Skip Card Number</label>
                                    <input
                                      type="text"
                                      placeholder="e.g. 0, 4"
                                      value={cmdOptions.skip}
                                      onChange={(e) => setCmdOptions(p => ({ ...p, skip: e.target.value }))}
                                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs focus:border-primary-500 font-mono"
                                    />
                                  </div>
                                </div>

                                {/* Label Group */}
                                <div className="bg-white/[0.02] border border-white/10 rounded-xl p-3.5 space-y-2">
                                  <label className="text-[11px] font-bold uppercase tracking-wider text-primary-400 block">Page Margin Label</label>
                                  <input
                                    type="text"
                                    placeholder="e.g. My Custom Proxy Set - Print 1"
                                    value={cmdOptions.label}
                                    onChange={(e) => setCmdOptions(p => ({ ...p, label: e.target.value }))}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs focus:border-primary-500 font-mono"
                                  />
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    <div className={cn("bg-[#0f0f13] border border-white/5 rounded-2xl p-6 transition-all duration-300", isCalibrationCollapsed ? "space-y-0" : "space-y-6")}>
                      <div
                        className="flex justify-between items-start pb-2 cursor-pointer select-none"
                        onClick={() => setIsCalibrationCollapsed(!isCalibrationCollapsed)}
                      >
                        <div className="space-y-1">
                          <h4 className="font-bold text-primary-400 flex items-center gap-2 text-xl tracking-tight">
                            <Layers size={20} />
                            Calibration
                          </h4>
                          <a
                            href="https://alan-cha.github.io/silhouette-card-maker/docs/offset/"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-white/40 hover:text-primary-400 transition-colors underline underline-offset-4 decoration-white/10 hover:decoration-primary-400 block pt-1"
                          >
                            Adjust for printer misalignment
                          </a>
                        </div>
                        <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => setIsOffsetPresetsOpen(true)} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors text-xs font-bold flex items-center gap-2 shrink-0 whitespace-nowrap">
                            <Settings2 size={16} /> Presets
                          </button>
                          <button
                            onClick={() => setIsCalibrationCollapsed(!isCalibrationCollapsed)}
                            className="p-2 hover:bg-white/5 rounded-xl text-white/40 hover:text-white transition-all transform shrink-0"
                          >
                            <ChevronDown size={18} className={cn("transition-transform duration-300", !isCalibrationCollapsed && "rotate-180")} />
                          </button>
                        </div>
                      </div>

                      {!isCalibrationCollapsed && (
                        <div className="space-y-6 pt-4 border-t border-white/5">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Step 1 */}
                            <div className="space-y-4">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-primary-600/20 border border-primary-500/30 flex items-center justify-center text-[10px] font-bold text-primary-300">1</div>
                                <h5 className="text-xs font-bold text-white/60">Initial Print</h5>
                              </div>
                              <div className="space-y-1.5 w-full">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-white/30">Paper Size</label>
                                <div className="relative group">
                                  <select
                                    value={calibration.sheet}
                                    onChange={(e) => setCalibration(p => ({ ...p, sheet: e.target.value }))}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 h-[34px] text-xs focus:outline-none focus:border-primary-500 transition-all text-white/80 appearance-none cursor-pointer hover:bg-white/10"
                                  >
                                    {CALIBRATION_SHEETS.map((opt, i) => <option key={`${opt.value}-${i}`} value={opt.value} className="bg-[#1a1a20]">{opt.label}</option>)}
                                  </select>
                                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none group-hover:text-primary-400 transition-colors" />
                                </div>
                              </div>
                              <div className="space-y-1.5 w-full">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-transparent px-1 select-none pointer-events-none hidden md:block">Spacer</label>
                                <button
                                  onClick={() => {
                                    addLog(`[System] Opening calibration sheet: ${calibration.sheet}`);
                                    window.open(`/api/project/export?file=calibration/${calibration.sheet}`, '_blank');
                                  }}
                                  className="w-full h-[34px] py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold transition-all text-white/80"
                                >
                                  Print Calibration Sheet
                                </button>
                              </div>
                            </div>

                            {/* Step 2 */}
                            <div className="space-y-4">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-primary-600/20 border border-primary-500/30 flex items-center justify-center text-[10px] font-bold text-primary-300">2</div>
                                <h5 className="text-xs font-bold text-white/60">Adjust Offsets</h5>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5 w-full">
                                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/20 px-1">X (MM)</label>
                                  <input
                                    type="number"
                                    value={calibration.x}
                                    onChange={(e) => setCalibration(p => ({ ...p, x: e.target.value }))}
                                    className="w-full h-[34px] bg-white/[0.03] border border-white/5 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-primary-500/50 focus:bg-white/[0.05] transition-all text-white/80 font-mono shadow-inner"
                                  />
                                </div>
                                <div className="space-y-1.5 w-full">
                                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/20 px-1">Y (MM)</label>
                                  <input
                                    type="number"
                                    value={calibration.y}
                                    onChange={(e) => setCalibration(p => ({ ...p, y: e.target.value }))}
                                    className="w-full h-[34px] bg-white/[0.03] border border-white/5 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-primary-500/50 focus:bg-white/[0.05] transition-all text-white/80 font-mono shadow-inner"
                                  />
                                </div>
                              </div>

                              <div className="space-y-1.5 w-full">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-white/20 px-1">Angle (Deg)</label>
                                <input
                                  type="number"
                                  step="0.1"
                                  value={calibration.angle}
                                  onChange={(e) => setCalibration(p => ({ ...p, angle: e.target.value }))}
                                  className="w-full h-[34px] bg-white/[0.03] border border-white/5 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-primary-500/50 focus:bg-white/[0.05] transition-all text-white/80 font-mono shadow-inner"
                                />
                              </div>
                            </div>

                            {/* Step 3 */}
                            <div className="space-y-4">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-primary-600/20 border border-primary-500/30 flex items-center justify-center text-[10px] font-bold text-primary-300">3</div>
                                <h5 className="text-xs font-bold text-white/60">Verify & Save</h5>
                              </div>

                              <div className="space-y-1.5 w-full">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-transparent px-1 select-none pointer-events-none hidden md:block">Spacer</label>
                                <button
                                  onClick={() => runCommand('offset_pdf.py', [
                                    '--x_offset', calibration.x.toString(),
                                    '--y_offset', calibration.y.toString(),
                                    '--angle', calibration.angle.toString(),
                                    '--save'
                                  ], {
                                    startMessage: 'Saving offset...',
                                    calibration: { x: calibration.x, y: calibration.y, angle: calibration.angle }
                                  })}
                                  className="w-full h-[34px] flex items-center justify-center bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl text-xs font-bold transition-all text-emerald-400"
                                >
                                  Save Offset
                                </button>
                              </div>

                              <div className="space-y-1.5 w-full">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-transparent px-1 select-none pointer-events-none hidden md:block">Spacer</label>
                                <button
                                  onClick={() => runCommand('offset_pdf.py', [
                                    '--pdf_path', `calibration/${calibration.sheet}`,
                                    '--x_offset', calibration.x.toString(),
                                    '--y_offset', calibration.y.toString(),
                                    '--angle', calibration.angle.toString()
                                  ], {
                                    startMessage: 'Generating offset sheet...',
                                    calibration: { x: calibration.x, y: calibration.y, angle: calibration.angle }
                                  })}
                                  className="w-full h-[34px] flex items-center justify-center bg-primary-600/10 hover:bg-primary-600/20 border border-primary-500/20 rounded-xl text-xs font-bold transition-all text-primary-400"
                                >
                                  Generate Offset Sheet
                                </button>
                              </div>

                              <div className="space-y-1.5 w-full">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-transparent px-1 select-none pointer-events-none hidden md:block">Spacer</label>
                                <button
                                  onClick={() => {
                                    addLog(`[System] Opening verification PDF: ${calibration.sheet.replace('.pdf', '_offset.pdf')}`);
                                    window.open(`/api/project/export?file=calibration/${calibration.sheet.replace('.pdf', '_offset.pdf')}`, '_blank');
                                  }}
                                  className="w-full h-[34px] flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold transition-all text-white/80"
                                >
                                  Print Offset Sheet
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="col-span-1 lg:col-span-2 space-y-6">
                    <div className="p-6 rounded-2xl bg-[#0f0f13] border border-white/5 sticky top-8">
                      <div
                        className="flex items-center justify-between mb-6 cursor-pointer group"
                        onClick={() => setIsLiveCommandCollapsed(!isLiveCommandCollapsed)}
                      >
                        <h3 className="font-bold flex items-center gap-2 text-primary-400 group-hover:text-primary-300 transition-colors">
                          <Terminal size={18} />
                          Live Command Build
                        </h3>
                        <ChevronDown size={14} className={cn("text-primary-400 transition-transform duration-300", !isLiveCommandCollapsed && "rotate-180")} />
                      </div>

                      <AnimatePresence>
                        {!isLiveCommandCollapsed && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden mb-6"
                          >
                            <div className="p-4 bg-primary-950/20 rounded-xl font-mono text-[11px] text-primary-300 leading-relaxed border border-primary-500/10 mb-4">
                              python create_pdf.py <br />
                              --card_size {cmdOptions.card_size} <br />
                              --paper_size {cmdOptions.paper_size} <br />
                              --registration {cmdOptions.registration} <br />
                              --fit {cmdOptions.fit} <br />
                              --ppi {cmdOptions.ppi} <br />
                              --quality {cmdOptions.quality} <br />
                              {cmdOptions.load_offset && "--load_offset"} <br />
                              {cmdOptions.show_outline && "--show_outline"} <br />
                              {normalizeDimension(cmdOptions.crop, dimensionUnitPref) && `--crop ${normalizeDimension(cmdOptions.crop, dimensionUnitPref)}`} <br />
                              {normalizeDimension(cmdOptions.crop_backs, dimensionUnitPref) && `--crop_backs ${normalizeDimension(cmdOptions.crop_backs, dimensionUnitPref)}`} <br />
                              {normalizeDimension(cmdOptions.extend_bleed, dimensionUnitPref) && `--extend_bleed ${normalizeDimension(cmdOptions.extend_bleed, dimensionUnitPref)}`} <br />
                              {normalizeDimension(cmdOptions.extend_bleed_backs, dimensionUnitPref) && `--extend_bleed_backs ${normalizeDimension(cmdOptions.extend_bleed_backs, dimensionUnitPref)}`} <br />
                              {normalizeDimension(cmdOptions.extend_corners, dimensionUnitPref) && normalizeDimension(cmdOptions.extend_corners, dimensionUnitPref) !== '0' && `--extend_corners ${normalizeDimension(cmdOptions.extend_corners, dimensionUnitPref)}`} <br />
                              {normalizeDimension(cmdOptions.extend_corners_backs, dimensionUnitPref) && `--extend_corners_backs ${normalizeDimension(cmdOptions.extend_corners_backs, dimensionUnitPref)}`} <br />
                              {normalizeDimension(cmdOptions.extend_edges, dimensionUnitPref) && `--extend_edges ${normalizeDimension(cmdOptions.extend_edges, dimensionUnitPref)}`} <br />
                              {normalizeDimension(cmdOptions.extend_edges_backs, dimensionUnitPref) && `--extend_edges_backs ${normalizeDimension(cmdOptions.extend_edges_backs, dimensionUnitPref)}`} <br />
                              {cmdOptions.label && `--label "${cmdOptions.label}"`} <br />
                              {cmdOptions.skip && `--skip ${cmdOptions.skip}`} <br />
                              {cmdOptions.output_images && "--output_images"}
                            </div>

                            <div className="relative">
                              <div className="flex justify-between items-center mb-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-primary-400/80">Raw Command</label>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const rawCmd = `python create_pdf.py ${cmdOptions.specialty && cmdOptions.specialty !== 'none' ? `--specialty ${cmdOptions.specialty}` : `--card_size ${cmdOptions.card_size} --paper_size ${cmdOptions.paper_size} --registration ${cmdOptions.registration}`} --fit ${cmdOptions.fit} --ppi ${cmdOptions.ppi} --quality ${cmdOptions.quality}${cmdOptions.load_offset ? ' --load_offset' : ''}${cmdOptions.show_outline ? ' --show_outline' : ''}${cmdOptions.borderless ? ' --borderless' : ''}${cmdOptions.only_fronts ? ' --only_fronts' : ''}${cmdOptions.output_images ? ' --output_images' : ''}${cmdOptions.registration_orientation && cmdOptions.registration_orientation !== 'default' ? ` --registration_orientation ${cmdOptions.registration_orientation}` : ''}${normalizeDimension(cmdOptions.crop, dimensionUnitPref) ? ` --crop ${normalizeDimension(cmdOptions.crop, dimensionUnitPref)}` : ''}${normalizeDimension(cmdOptions.crop_backs, dimensionUnitPref) ? ` --crop_backs ${normalizeDimension(cmdOptions.crop_backs, dimensionUnitPref)}` : ''}${normalizeDimension(cmdOptions.extend_bleed, dimensionUnitPref) ? ` --extend_bleed ${normalizeDimension(cmdOptions.extend_bleed, dimensionUnitPref)}` : ''}${normalizeDimension(cmdOptions.extend_bleed_backs, dimensionUnitPref) ? ` --extend_bleed_backs ${normalizeDimension(cmdOptions.extend_bleed_backs, dimensionUnitPref)}` : ''}${normalizeDimension(cmdOptions.extend_corners, dimensionUnitPref) && normalizeDimension(cmdOptions.extend_corners, dimensionUnitPref) !== '0' ? ` --extend_corners ${normalizeDimension(cmdOptions.extend_corners, dimensionUnitPref)}` : ''}${normalizeDimension(cmdOptions.extend_corners_backs, dimensionUnitPref) ? ` --extend_corners_backs ${normalizeDimension(cmdOptions.extend_corners_backs, dimensionUnitPref)}` : ''}${normalizeDimension(cmdOptions.extend_edges, dimensionUnitPref) ? ` --extend_edges ${normalizeDimension(cmdOptions.extend_edges, dimensionUnitPref)}` : ''}${normalizeDimension(cmdOptions.extend_edges_backs, dimensionUnitPref) ? ` --extend_edges_backs ${normalizeDimension(cmdOptions.extend_edges_backs, dimensionUnitPref)}` : ''}${cmdOptions.label ? ` --label "${cmdOptions.label}"` : ''}${cmdOptions.skip ? ` --skip ${cmdOptions.skip}` : ''}`;
                                    navigator.clipboard.writeText(rawCmd);
                                    setCommandCopied(true);
                                    setTimeout(() => setCommandCopied(false), 2000);
                                  }}
                                  className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-primary-400/60 hover:text-primary-300 transition-colors"
                                >
                                  {commandCopied ? <CheckCircle size={12} className="text-green-400" /> : <Copy size={12} />}
                                  {commandCopied ? <span className="text-green-400">Copied!</span> : <span>Copy</span>}
                                </button>
                              </div>
                              <textarea
                                readOnly
                                value={`python create_pdf.py ${cmdOptions.specialty && cmdOptions.specialty !== 'none' ? `--specialty ${cmdOptions.specialty}` : `--card_size ${cmdOptions.card_size} --paper_size ${cmdOptions.paper_size} --registration ${cmdOptions.registration}`} --fit ${cmdOptions.fit} --ppi ${cmdOptions.ppi} --quality ${cmdOptions.quality}${cmdOptions.load_offset ? ' --load_offset' : ''}${cmdOptions.show_outline ? ' --show_outline' : ''}${cmdOptions.borderless ? ' --borderless' : ''}${cmdOptions.only_fronts ? ' --only_fronts' : ''}${cmdOptions.output_images ? ' --output_images' : ''}${cmdOptions.registration_orientation && cmdOptions.registration_orientation !== 'default' ? ` --registration_orientation ${cmdOptions.registration_orientation}` : ''}${normalizeDimension(cmdOptions.crop, dimensionUnitPref) ? ` --crop ${normalizeDimension(cmdOptions.crop, dimensionUnitPref)}` : ''}${normalizeDimension(cmdOptions.crop_backs, dimensionUnitPref) ? ` --crop_backs ${normalizeDimension(cmdOptions.crop_backs, dimensionUnitPref)}` : ''}${normalizeDimension(cmdOptions.extend_bleed, dimensionUnitPref) ? ` --extend_bleed ${normalizeDimension(cmdOptions.extend_bleed, dimensionUnitPref)}` : ''}${normalizeDimension(cmdOptions.extend_bleed_backs, dimensionUnitPref) ? ` --extend_bleed_backs ${normalizeDimension(cmdOptions.extend_bleed_backs, dimensionUnitPref)}` : ''}${normalizeDimension(cmdOptions.extend_corners, dimensionUnitPref) && normalizeDimension(cmdOptions.extend_corners, dimensionUnitPref) !== '0' ? ` --extend_corners ${normalizeDimension(cmdOptions.extend_corners, dimensionUnitPref)}` : ''}${normalizeDimension(cmdOptions.extend_corners_backs, dimensionUnitPref) ? ` --extend_corners_backs ${normalizeDimension(cmdOptions.extend_corners_backs, dimensionUnitPref)}` : ''}${normalizeDimension(cmdOptions.extend_edges, dimensionUnitPref) ? ` --extend_edges ${normalizeDimension(cmdOptions.extend_edges, dimensionUnitPref)}` : ''}${normalizeDimension(cmdOptions.extend_edges_backs, dimensionUnitPref) ? ` --extend_edges_backs ${normalizeDimension(cmdOptions.extend_edges_backs, dimensionUnitPref)}` : ''}${cmdOptions.label ? ` --label "${cmdOptions.label}"` : ''}${cmdOptions.skip ? ` --skip ${cmdOptions.skip}` : ''}`}
                                className="w-full bg-primary-950/10 border border-primary-500/20 rounded-xl px-3 py-2 text-[10px] text-primary-300/80 font-mono resize-none focus:outline-none focus:border-primary-500/50 transition-colors selection:bg-primary-500/30"
                                rows={4}
                                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="space-y-4 mb-8">
                        <ToggleItem label="Apply Saved Offsets" checked={cmdOptions.load_offset} onChange={(v) => setCmdOptions(p => ({ ...p, load_offset: v }))} />
                        <ToggleItem label="Show Cut Outline" checked={cmdOptions.show_outline} onChange={(v) => setCmdOptions(p => ({ ...p, show_outline: v }))} />
                        <ToggleItem label="Borderless" checked={cmdOptions.borderless} onChange={(v) => setCmdOptions(p => ({ ...p, borderless: v }))} />
                        <ToggleItem label="Only Fronts" checked={cmdOptions.only_fronts} onChange={(v) => setCmdOptions(p => ({ ...p, only_fronts: v }))} />
                        <ToggleItem label="Output Images" checked={cmdOptions.output_images} onChange={(v) => setCmdOptions(p => ({ ...p, output_images: v }))} />
                      </div>

                      {pdfReady && (
                        <div className="flex gap-2 mb-4">
                          {cmdOptions.output_images ? (
                            <button
                              onClick={async () => {
                                try {
                                  const response = await fetch('/api/download-output-images');
                                  if (!response.ok) {
                                    const errorData = await response.json().catch(() => ({}));
                                    addLog(`[Error] ${errorData.message || "Failed to zip images."}`);
                                    return;
                                  }
                                  const blob = await response.blob();
                                  const url = window.URL.createObjectURL(blob);
                                  const link = document.createElement('a');
                                  link.href = url;
                                  link.setAttribute('download', 'output_images.zip');
                                  document.body.appendChild(link);
                                  link.click();
                                  link.remove();
                                  window.URL.revokeObjectURL(url);
                                } catch (err: any) {
                                  addLog(`[Error] Network error occurred during download: ${err.message}`);
                                }
                              }}
                              className="flex-1 py-4 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/20 text-emerald-400 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all active:scale-95 cursor-pointer"
                            >
                              <Download size={20} />
                              Download Images
                            </button>
                          ) : (
                            <a
                              href="/api/project/download-pdf"
                              download="game.pdf"
                              className="flex-1 py-4 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/20 text-emerald-400 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all active:scale-95 cursor-pointer"
                            >
                              <Download size={20} />
                              Download PDF
                            </a>
                          )}
                        </div>
                      )}
                      <button
                        onClick={generatePDF}
                        className="w-full py-4 bg-primary-600 hover:bg-primary-500 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-md transition-all active:scale-95"
                      >
                        <Play size={20} fill="currentColor" />
                        Generate
                      </button>

                      <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-white/80">Cutting Templates</h4>
                          {(cmdOptions.card_size === 'standard_mtg' || cmdOptions.card_size === 'standard_sorcery') && (
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              SCM-Extras Template
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-white/40 pb-2">
                          Templates matching your selected paper ({cmdOptions.paper_size}) and card size ({cmdOptions.card_size}{cmdOptions.borderless ? ' - borderless' : ''}).
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDownloadTemplate('studio3')}
                            className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold transition-all text-center text-white/60 hover:text-white cursor-pointer"
                          >
                            Download .studio3 {cmdOptions.card_size === 'standard_mtg' ? '(MTG 2.5mm)' : cmdOptions.card_size === 'standard_sorcery' ? '(Sorcery 4.5mm)' : ''}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'console' && (
                <motion.div
                  key="console"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex flex-col"
                >
                  <div className="flex-1 bg-black/40 rounded-2xl border border-white/5 p-6 font-mono text-sm overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                    {logs.map((log, i) => (
                      <div key={`log-${i}`} className={cn(
                        "mb-1 break-all",
                        log.startsWith('[Error]') ? "text-rose-400" :
                          log.startsWith('[System]') ? "text-primary-400" :
                            log.startsWith('$') ? "text-emerald-400" : "text-white/60"
                      )}>
                        {log}
                      </div>
                    ))}
                    <div ref={consoleEndRef} />
                  </div>
                  <div className="mt-4 flex gap-4">
                    <input
                      type="text"
                      placeholder="Enter command (e.g. build --fast)..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500/50 transition-all font-mono"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const val = e.currentTarget.value;
                          if (val) {
                            runCommand(val.split(' ')[0], val.split(' ').slice(1), { startMessage: `Running ${val.split(' ')[0]}...` });
                            e.currentTarget.value = '';
                          }
                        }
                      }}
                    />
                    <button onClick={() => setLogs([])} className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-mono text-xs text-white/40 hover:text-white transition-all uppercase tracking-widest">
                      Clear Logs
                    </button>
                  </div>
                </motion.div>
              )}



              {activeTab === 'assets' && (
                <motion.div
                  key="assets"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-8"
                >
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <h2 className="text-3xl font-bold tracking-tight">
                          {assetViewMode === 'project' ? 'Project Workspace' : assetViewMode === 'library' ? 'Library' : 'Plugin Staging'}
                        </h2>
                        <p className="text-white/40">
                          {assetViewMode === 'project'
                            ? 'Managing card assets currently staged for PDF generation.'
                            : assetViewMode === 'library'
                              ? 'Source gallery of your card templates.'
                              : 'Manage and sync cards from community database integrations.'}
                        </p>
                      </div>
                      {assetViewMode === 'project' && (
                        <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
                          <button
                            onClick={() => setIsProjectPresetsOpen(true)}
                            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors text-xs font-bold flex items-center gap-2 shrink-0 text-white/70"
                            title="Project Presets"
                          >
                            <Settings2 size={14} /> Presets
                          </button>
                          <input
                            type="file"
                            accept=".json"
                            className="hidden"
                            ref={importProjectRef}
                            onChange={handleImportProject}
                          />
                          {(status?.assets?.fronts?.length > 0 || status?.assets?.backs?.length > 0) && (
                            <button
                              onClick={clearProject}
                              className="flex items-center gap-2 px-3 py-2 bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/20 rounded-lg text-xs font-bold transition-all text-rose-500 active:scale-95"
                              title="Clear Project Assets"
                            >
      
                              Clear
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Primary Tab Switcher */}
                    <div className="flex justify-center md:justify-end w-full">
                      <div className="flex bg-[#07070a] p-1 border border-white/5 rounded-xl gap-1 w-full md:w-[380px] shadow-inner">
                        <button
                          onClick={() => {
                            setActiveTab('assets');
                            setAssetViewMode('project');
                            setSelectedAssets(new Set());
                          }}
                          className={cn(
                            "flex-1 py-2 px-3 rounded-lg text-[10px] uppercase font-bold tracking-widest transition-all text-center",
                            assetViewMode === 'project'
                              ? "bg-primary-600 text-white shadow-lg shadow-primary-600/20"
                              : "text-white/40 hover:text-white hover:bg-white/5"
                          )}
                        >
                          Workspace
                        </button>
                        <button
                          onClick={() => {
                            setActiveTab('assets');
                            setAssetViewMode('library');
                            setSelectedAssets(new Set());
                          }}
                          className={cn(
                            "flex-1 py-1 px-3 rounded-lg text-[10px] uppercase font-bold tracking-widest transition-all text-center",
                            assetViewMode === 'library'
                              ? "bg-primary-600 text-white shadow-lg shadow-primary-600/20"
                              : "text-white/40 hover:text-white hover:bg-white/5"
                          )}
                        >
                          Library
                        </button>
                        <button
                          onClick={() => {
                            setActiveTab('assets');
                            setAssetViewMode('plugins');
                            setSelectedAssets(new Set());
                            if (assetFilter === 'back') setAssetFilter('all');
                          }}
                          className={cn(
                            "flex-1 py-2 px-3 rounded-lg text-[10px] uppercase font-bold tracking-widest transition-all text-center",
                            assetViewMode === 'plugins'
                              ? "bg-primary-600 text-white shadow-lg shadow-primary-600/20"
                              : "text-white/40 hover:text-white hover:bg-white/5"
                          )}
                        >
                          Plugins
                        </button>
                      </div>
                    </div>

                    {/* Consistent Toolbar */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-[#0f0f13] border border-white/5 rounded-2xl shadow-xl shadow-black/20">

                      {/* Search bar */}
                      <div className="relative w-full md:max-w-md flex-1">
                        <Terminal size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                        <input
                          type="text"
                          placeholder="Search assets..."
                          value={assetSearch}
                          onChange={(e) => setAssetSearch(e.target.value)}
                          className="w-full bg-black/40 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary-500/50 transition-all font-mono placeholder:text-white/10"
                        />
                      </div>

                      {/* Right side controls: Action buttons, Refresh, Filters, Slider */}
                      <div className="flex flex-wrap items-center justify-start md:justify-end gap-3 w-full md:w-auto">
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          {assetViewMode === 'plugins' && selectedAssets.size > 0 && (
                            <>
                              <button
                                onClick={async () => {
                                  await performMoveOrCopy(Array.from(selectedAssets), 'project', 'plugins');
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-primary-600/20 hover:bg-primary-600/40 text-primary-400 border border-primary-500/20 rounded-lg text-xs font-bold transition-all active:scale-95"
                              >
                                <FolderOpen size={14} />
                                Add to Workspace
                              </button>
                              <button
                                onClick={async () => {
                                  await performMoveOrCopy(Array.from(selectedAssets), 'library', 'plugins');
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-bold transition-all active:scale-95"
                              >
                                <FolderOpen size={14} />
                                Add to Library
                              </button>
                            </>
                          )}

                          {assetViewMode === 'library' && selectedAssets.size > 0 && (
                            <button
                              onClick={async () => {
                                await performMoveOrCopy(Array.from(selectedAssets), 'project', 'library');
                              }}
                              className="flex items-center gap-2 px-4 py-2 bg-primary-600/20 hover:bg-primary-600/40 text-primary-400 border border-primary-500/20 rounded-lg text-xs font-bold transition-all active:scale-95"
                            >
                              <FolderOpen size={14} />
                              Add to Workspace
                            </button>
                          )}

                          {assetViewMode === 'project' && selectedAssets.size > 0 && (
                            <button
                              onClick={async () => {
                                await performMoveOrCopy(Array.from(selectedAssets), 'library', 'project');
                              }}
                              className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-bold transition-all active:scale-95"
                            >
                              <FolderOpen size={14} />
                              Add to Library
                            </button>
                          )}
                        </div>

                        {assetViewMode === 'project' && (
                          <button
                            onClick={() => setIsProjectPresetsOpen(true)}
                            className="px-3.5 py-2 bg-primary-600/20 hover:bg-primary-600/30 text-primary-300 border border-primary-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                            title="Manage Saved Decks (Save, Load, Overwrite, Export, Import)"
                          >
                            <Package size={14} />
                            <span>Saved Decks</span>
                          </button>
                        )}

                        <button
                          onClick={fetchStatus}
                          className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/40 hover:text-white transition-all shadow-inner shrink-0 cursor-pointer"
                          title="Refresh Assets"
                        >
                          <RefreshCw size={16} className={cn(isRefreshing && "animate-spin")} />
                        </button>

                        <div className="flex items-center bg-black/40 border border-white/5 rounded-xl p-1 shrink-0">
                          <button
                            onClick={() => setAssetFilter('all')}
                            className={cn(
                              "px-4 py-1.5 rounded-lg text-[10px] uppercase font-bold tracking-widest transition-all",
                              assetFilter === 'all' ? "bg-white/10 text-white" : "text-white/40 hover:text-white"
                            )}
                          >
                            All
                          </button>
                          <button
                            onClick={() => setAssetFilter('front')}
                            className={cn(
                              "px-4 py-1.5 rounded-lg text-[10px] uppercase font-bold tracking-widest transition-all",
                              assetFilter === 'front' ? "bg-white/10 text-white" : "text-white/40 hover:text-white"
                            )}
                          >
                            Fronts
                          </button>
                          {assetViewMode !== 'plugins' && (
                            <button
                              onClick={() => setAssetFilter('back')}
                              className={cn(
                                "px-4 py-1.5 rounded-lg text-[10px] uppercase font-bold tracking-widest transition-all",
                                assetFilter === 'back' ? "bg-white/10 text-white" : "text-white/40 hover:text-white"
                              )}
                            >
                              Backs
                            </button>
                          )}
                        </div>

                        <div className="hidden sm:block h-6 w-px bg-white/5" />

                        {/* Card Size Selector Slider */}
                        <div className="flex items-center justify-center gap-3 bg-[#0a0a0d] border border-white/5 rounded-xl px-3 sm:px-4 py-1.5 shrink-0 select-none mx-auto md:mx-0">
                          <LayoutGrid size={13} className="text-white/40" />
                          <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-widest text-white/40">Card Size</span>
                          <input
                            type="range"
                            min="80"
                            max="320"
                            step="10"
                            value={cardWidth}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              setCardWidth(val);
                              localStorage.setItem('scm_card_width', val.toString());
                            }}
                            className="w-24 accent-primary-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer focus:outline-none"
                          />
                          <span className="text-[10px] font-mono text-white/50 w-8 text-right font-semibold">{cardWidth}px</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {assetViewMode === 'plugins' && (
                    <div className="bg-[#0f0f13] border border-white/5 rounded-2xl p-6 relative overflow-hidden group">
                      <div className="relative z-10 space-y-4">
                        <div className="flex items-center justify-between cursor-pointer group" onClick={() => setPluginBoxCollapsed(!pluginBoxCollapsed)}>
                          <div className="flex items-center gap-4">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                              <Package size={20} className="text-primary-400" /> Game Plugins
                            </h3>
                          </div>
                          <ChevronDown size={20} className={cn("text-white/40 group-hover:text-white transition-all duration-300", pluginBoxCollapsed && "rotate-180")} />
                        </div>

                        {!pluginBoxCollapsed && (
                          <div className="flex flex-col md:flex-row gap-6 items-stretch border-t border-white/5 pt-4">
                            <div className="w-full md:w-1/3 space-y-4">
                              <p className="text-white/40 text-sm leading-relaxed">
                                Fetch card data directly from community database APIs.
                              </p>

                              <div className="space-y-4 pt-2">
                                <div>
                                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 block mb-2">Game</label>
                                  <div className="relative">
                                    <select
                                      value={pluginState.selectedPlugin.id}
                                      onChange={(e) => {
                                        const val = (e.target.value || '').trim();
                                        const p = PLUGINS.find(pl => pl.id === val || pl.name.toLowerCase() === val.toLowerCase()) || PLUGINS[0];
                                        if (p) {
                                          setPluginState({ ...pluginState, selectedPlugin: p, format: p.formats?.[0] || '', options: {} });
                                        }
                                      }}
                                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white/80 appearance-none focus:outline-none focus:border-primary-500"
                                    >
                                      {PLUGINS.map((p, i) => <option key={`${p.id}-${i}`} value={p.id} className="bg-[#1a1a20]">{p.name}</option>)}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
                                  </div>

                                  <div className="mt-2 flex flex-wrap gap-3 items-center">
                                    <button onClick={() => fetchReadme(pluginState.selectedPlugin)} className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors">
                                      <Book size={12} /> Readme
                                    </button>
                                    {pluginState.selectedPlugin.websites?.map((site, idx) => (
                                      <a key={idx} href={site.url} target="_blank" rel="noopener noreferrer" className="text-xs text-white/50 hover:text-white/80 flex items-center gap-1 transition-colors">
                                        <ExternalLink size={12} /> {site.name}
                                      </a>
                                    ))}
                                  </div>
                                </div>

                                <div>
                                  {pluginState.selectedPlugin.id === 'custom_script_upload' ? (
                                    <div className="space-y-4">
                                      {customScripts.length > 0 && (
                                        <div>
                                          <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 block mb-2">Saved Scripts</label>
                                          <div className="flex items-center gap-2">
                                            <div className="relative flex-1">
                                              <select
                                                value={pluginState.format === 'script' && customScripts.length > 0 ? customScripts[0] : pluginState.format}
                                                onChange={(e) => setPluginState(prev => ({ ...prev, format: e.target.value }))}
                                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white/80 appearance-none focus:outline-none focus:border-primary-500"
                                              >
                                                {customScripts.map(s => <option key={s} value={s} className="bg-[#1a1a20]">{s}</option>)}
                                              </select>
                                              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
                                            </div>
                                            <button
                                              onClick={async () => {
                                                const currentVal = pluginState.format === 'script' && customScripts.length > 0 ? customScripts[0] : pluginState.format;
                                                if (!currentVal || currentVal === 'script') return;
                                                try {
                                                  await fetch('/api/custom-scripts/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename: currentVal }) });
                                                  await fetchCustomScripts();
                                                  const remaining = customScripts.filter(s => s !== currentVal);
                                                  const newFormat = remaining.length > 0 ? remaining[0] : 'script';
                                                  setPluginState(prev => ({ ...prev, format: newFormat }));
                                                } catch (e) { }
                                              }}
                                              className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors border border-red-500/20"
                                              title="Delete Script"
                                            >
                                              <Trash2 size={16} />
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                      <div>
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 block mb-2">
                                          New Script (.py)
                                        </label>
                                        <div className="relative">
                                          <input
                                            id="custom-script-upload"
                                            type="file"
                                            accept=".py"
                                            onChange={async (e) => {
                                              const file = e.target.files?.[0];
                                              if (file) {
                                                setTaskProgress({ current: 0, total: 1, message: `Uploading ${file.name}...` });
                                                const fd = new FormData();
                                                fd.append('file', file);
                                                try {
                                                  const res = await fetch('/api/custom-scripts/upload', { method: 'POST', body: fd });
                                                  const data = await res.json();
                                                  if (data.success) {
                                                    await fetchCustomScripts();
                                                    setPluginState(prev => ({ ...prev, format: data.filename }));
                                                    addLog(`[System] Uploaded ${data.filename}`);
                                                  }
                                                } catch (err) {
                                                  addLog(`[Error] Failed to upload script: ${err}`);
                                                }
                                                setTaskProgress(null);
                                              }
                                              const input = document.getElementById('custom-script-upload') as HTMLInputElement;
                                              if (input) { input.value = ''; }
                                            }}
                                            className="hidden"
                                          />
                                          <label htmlFor="custom-script-upload" className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 border-dashed hover:border-primary-500/50 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all text-xs font-semibold text-white/70 hover:text-white group">
                                            <Upload size={16} className="text-white/40 group-hover:text-primary-400 transition-colors" />
                                            Select a .py file to upload
                                          </label>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <SelectGroup
                                      label="Format"
                                      value={pluginState.format}
                                      onChange={(v) => setPluginState(prev => ({ ...prev, format: v }))}
                                      options={pluginState.selectedPlugin.formats}
                                    />
                                  )}

                                  {/* OneProxy Polite Offline Cache & Asset Manager (Visible ONLY when OneProxy format is selected) */}
                                  {pluginState.selectedPlugin.id === 'one_piece' && pluginState.format === 'oneproxy' && (
                                    <div className="mt-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
                                      {/* State 1: Two Initial Options */}
                                      {oneProxyView === 'options' && (
                                        <div className="space-y-2.5">
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                              <div className="w-2 h-2 rounded-full bg-primary-400" />
                                              <span className="text-xs font-bold text-white/90">OneProxy Asset Setup</span>
                                            </div>
                                            {oneProxyStatus?.cachedImagesCount > 0 && (
                                              <button
                                                type="button"
                                                onClick={() => setOneProxyView('ready')}
                                                className="text-[11px] text-primary-400 hover:text-primary-300 transition-colors underline cursor-pointer"
                                              >
                                                View Active Cache ({oneProxyStatus.cachedImagesCount} cards) →
                                              </button>
                                            )}
                                          </div>

                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            {/* Option A: Download OneProxy Assets */}
                                            <button
                                              type="button"
                                              onClick={() => setOneProxyView('download_prompt')}
                                              className="group relative text-left p-3.5 rounded-xl bg-gradient-to-br from-primary-500/10 via-primary-600/5 to-transparent border border-primary-500/30 hover:border-primary-400 hover:from-primary-500/20 transition-all cursor-pointer shadow-sm active:scale-[0.99] flex flex-col justify-between"
                                            >
                                              <div>
                                                <div className="flex items-center gap-2 mb-1.5">
                                                  <div className="w-7 h-7 rounded-lg bg-primary-500/20 flex items-center justify-center text-primary-400 group-hover:bg-primary-500 group-hover:text-white transition-all shrink-0">
                                                    <Download size={14} />
                                                  </div>
                                                  <span className="text-xs font-bold text-white group-hover:text-primary-200">
                                                    Download OneProxy Assets
                                                  </span>
                                                </div>
                                                <p className="text-[11px] text-white/60 leading-relaxed">
                                                  Download high-res card art (~{oneProxyStatus?.cachedImagesCount > 0 && oneProxyStatus?.estimatedRemainingSizeFormatted ? `${oneProxyStatus.estimatedRemainingSizeFormatted} remaining` : (oneProxyStatus?.estimatedFullSizeFormatted || "3.6 GB")}) locally for instant offline deck rendering with zero rate limits.
                                                </p>
                                              </div>
                                              <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-primary-400 group-hover:text-primary-300">
                                                <span>Select Folder & Download</span>
                                                <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                                              </div>
                                            </button>

                                            {/* Option B: I Already Have Assets */}
                                            <button
                                              type="button"
                                              onClick={() => setOneProxyView('link_prompt')}
                                              className="group relative text-left p-3.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 hover:bg-white/[0.06] transition-all cursor-pointer shadow-sm active:scale-[0.99] flex flex-col justify-between"
                                            >
                                              <div>
                                                <div className="flex items-center gap-2 mb-1.5">
                                                  <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white/80 group-hover:bg-white/20 group-hover:text-white transition-all shrink-0">
                                                    <FolderOpen size={14} />
                                                  </div>
                                                  <span className="text-xs font-bold text-white">
                                                    I Already Have Assets
                                                  </span>
                                                </div>
                                                <p className="text-[11px] text-white/60 leading-relaxed">
                                                  Already have the OneProxy cards downloaded? Link your existing folder to use your saved library immediately.
                                                </p>
                                              </div>
                                              <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-white/70 group-hover:text-white">
                                                <span>Link Existing Folder</span>
                                                <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                                              </div>
                                            </button>
                                          </div>
                                        </div>
                                      )}

                                      {/* State 2: Download Prompt (Space Requirement & Path Setup) */}
                                      {oneProxyView === 'download_prompt' && (
                                        <div className="space-y-3">
                                          <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                                            <button
                                              type="button"
                                              onClick={() => setOneProxyView('options')}
                                              className="flex items-center gap-1 text-xs text-white/60 hover:text-white transition-colors cursor-pointer"
                                            >
                                              <ChevronLeft size={13} />
                                              <span>Back to Options</span>
                                            </button>
                                            <span className="text-xs font-bold text-white">Download OneProxy Assets</span>
                                          </div>

                                          {/* Space Requirement Notice */}
                                          <div className="p-3 rounded-lg bg-primary-950/40 border border-primary-500/25 space-y-1.5">
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-1.5 text-primary-300 font-semibold text-xs">
                                                <Info size={13} />
                                                <span>Storage & Space Requirement</span>
                                              </div>
                                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary-500/20 text-primary-200 border border-primary-500/30 font-bold">
                                                ~{oneProxyStatus?.cachedImagesCount > 0 && oneProxyStatus?.estimatedRemainingSizeFormatted ? `${oneProxyStatus.estimatedRemainingSizeFormatted} Remaining` : `${oneProxyStatus?.estimatedFullSizeFormatted || "3.6 GB"} Required`}
                                              </span>
                                            </div>
                                            <p className="text-[11px] text-white/70 leading-relaxed">
                                              {oneProxyStatus?.cachedImagesCount > 0 && oneProxyStatus?.remainingCardsCount !== undefined ? (
                                                <>This will download {oneProxyStatus.remainingCardsCount.toLocaleString()} remaining high-resolution card artworks ({oneProxyStatus.cachedImagesCount.toLocaleString()} already saved of {oneProxyStatus.cardCount ? oneProxyStatus.cardCount.toLocaleString() : 'all'}).</>
                                              ) : (
                                                <>This will download ~{oneProxyStatus?.cardCount ? oneProxyStatus.cardCount.toLocaleString() : '5,000+'} high-resolution print card artworks.</>
                                              )}
                                              {oneProxyStatus?.freeDiskSpaceFormatted && (
                                                <span className="text-emerald-400 font-medium"> ({oneProxyStatus.freeDiskSpaceFormatted} free on drive)</span>
                                              )}
                                            </p>
                                          </div>

                                          {/* Destination Folder Selector */}
                                          <div className="space-y-1.5">
                                            <div className="flex items-center justify-between text-[11px]">
                                              <label className="text-white/80 font-medium">Download Destination Folder</label>
                                              <span className="text-[10px] text-white/40 font-mono">
                                                Default: {oneProxyStatus?.defaultUserDir || 'C:\\Users\\OneProxy'}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <input
                                                type="text"
                                                value={oneProxyDownloadPath || oneProxyStatus?.defaultUserDir || ''}
                                                onChange={(e) => setOneProxyDownloadPath(e.target.value)}
                                                placeholder={oneProxyStatus?.defaultUserDir || "C:\\Users\\<Username>\\OneProxy"}
                                                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/90 placeholder:text-white/20 focus:outline-none focus:border-primary-500 font-mono"
                                              />
                                              <button
                                                type="button"
                                                onClick={handleBrowseDownloadDir}
                                                disabled={isBrowsingDownloadPath}
                                                className="px-2.5 py-1.5 bg-white/10 hover:bg-white/15 text-white/80 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                                              >
                                                {isBrowsingDownloadPath ? <Loader2 size={12} className="animate-spin" /> : <FolderOpen size={12} />}
                                                <span>Browse</span>
                                              </button>
                                            </div>
                                            <p className="text-[10px] text-white/40">
                                              If no path is selected, files will download to <code className="text-primary-300 font-mono">{oneProxyStatus?.defaultUserDir || 'C:\\Users\\OneProxy'}</code>.
                                            </p>
                                          </div>

                                          {/* Start Download Button */}
                                          <button
                                            type="button"
                                            onClick={handleStartBulkDownload}
                                            disabled={isStartingBulkDownload}
                                            className="w-full py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-[0.99] disabled:opacity-50"
                                          >
                                            {isStartingBulkDownload ? (
                                              <>
                                                <Loader2 size={13} className="animate-spin" />
                                                <span>Starting Download...</span>
                                              </>
                                            ) : (
                                              <>
                                                <Download size={13} />
                                                <span>Start Downloading Assets (~{oneProxyStatus?.cachedImagesCount > 0 && oneProxyStatus?.estimatedRemainingSizeFormatted ? oneProxyStatus.estimatedRemainingSizeFormatted : (oneProxyStatus?.estimatedFullSizeFormatted || "3.6 GB")})</span>
                                              </>
                                            )}
                                          </button>
                                        </div>
                                      )}

                                      {/* State 3: Downloading Progress Bar */}
                                      {oneProxyView === 'downloading' && (
                                        <div className="space-y-2.5 py-1">
                                          {/* Progress Header */}
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                              <div className="w-2.5 h-2.5 rounded-full bg-primary-400 animate-ping" />
                                              <span className="text-xs font-bold text-white">Downloading OneProxy Assets</span>
                                              <span className="text-[10px] bg-primary-500/20 text-primary-300 border border-primary-500/30 px-2 py-0.5 rounded-full font-bold">
                                                {oneProxyBulkProgress?.percent ?? 0}%
                                              </span>
                                            </div>
                                            <button
                                              type="button"
                                              onClick={handleCancelBulkDownload}
                                              disabled={isCancellingBulkDownload}
                                              className="text-[10px] text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                                            >
                                              {isCancellingBulkDownload ? "Cancelling..." : "Cancel Download"}
                                            </button>
                                          </div>

                                          {/* Progress Bar Track */}
                                          <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden p-0.5 border border-white/10 relative">
                                            <div
                                              className="h-full rounded-full bg-gradient-to-r from-primary-500 via-indigo-500 to-emerald-400 transition-all duration-300 ease-out"
                                              style={{ width: `${Math.max(2, oneProxyBulkProgress?.percent ?? 0)}%` }}
                                            />
                                          </div>

                                          {/* Progress Status Details */}
                                          <div className="flex items-center justify-between text-[11px] text-white/60">
                                            <span className="truncate max-w-[260px] text-white/80 font-medium">
                                              {oneProxyBulkProgress?.currentCardNumber ? (
                                                <>Card {oneProxyBulkProgress.currentCardNumber}: <span className="text-white/60">{oneProxyBulkProgress.currentCardName}</span></>
                                              ) : (
                                                oneProxyBulkProgress?.statusText || "Downloading cards..."
                                              )}
                                            </span>
                                            <span className="font-mono text-white/70 shrink-0">
                                              {oneProxyBulkProgress?.processedCards ?? 0} / {oneProxyBulkProgress?.totalCards || oneProxyStatus?.cardCount || 5035} cards
                                            </span>
                                          </div>

                                          {/* Downloaded stats */}
                                          <div className="flex items-center justify-between text-[10px] text-white/40 pt-1 border-t border-white/5 font-mono">
                                            <span className="truncate max-w-[240px]">Destination: {oneProxyBulkProgress?.targetDir || oneProxyDownloadPath || oneProxyStatus?.defaultUserDir}</span>
                                            <span>{formatSize(oneProxyBulkProgress?.totalBytesDownloaded ?? 0)} downloaded</span>
                                          </div>
                                        </div>
                                      )}

                                      {/* State 4: Link Existing Folder */}
                                      {oneProxyView === 'link_prompt' && (
                                        <div className="space-y-3">
                                          <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                                            <button
                                              type="button"
                                              onClick={() => setOneProxyView('options')}
                                              className="flex items-center gap-1 text-xs text-white/60 hover:text-white transition-colors cursor-pointer"
                                            >
                                              <ChevronLeft size={13} />
                                              <span>Back to Options</span>
                                            </button>
                                            <span className="text-xs font-bold text-white">Link Existing OneProxy Folder</span>
                                          </div>

                                          <div className="space-y-1.5">
                                            <label className="text-[11px] text-white/80 font-medium block">Folder Location on Your PC</label>
                                            <div className="flex items-center gap-2">
                                              <input
                                                type="text"
                                                value={customCacheInput}
                                                onChange={(e) => setCustomCacheInput(e.target.value)}
                                                placeholder="Folder path..."
                                                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/90 placeholder:text-white/20 focus:outline-none focus:border-primary-500 font-mono"
                                              />
                                              <button
                                                type="button"
                                                onClick={handleBrowseCacheDir}
                                                disabled={isBrowsingCachePath}
                                                className="px-2.5 py-1.5 bg-white/10 hover:bg-white/15 text-white/80 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                                              >
                                                {isBrowsingCachePath ? <Loader2 size={12} className="animate-spin" /> : <FolderOpen size={12} />}
                                                <span>Browse</span>
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleSaveCacheDir()}
                                                disabled={isSavingCachePath}
                                                className="px-2.5 py-1 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                                              >
                                                {isSavingCachePath ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                                <span>Link Folder</span>
                                              </button>
                                            </div>
                                            {cacheConfigMsg && (
                                              <div className={cn(
                                                "text-[10px] p-1.5 rounded-md flex items-center gap-1.5",
                                                cacheConfigMsg.type === 'success' ? "text-emerald-300 bg-emerald-500/10" : "text-rose-300 bg-rose-500/10"
                                              )}>
                                                {cacheConfigMsg.type === 'success' ? <CheckCircle size={11} /> : <AlertCircle size={11} />}
                                                <span>{cacheConfigMsg.text}</span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}

                                      {/* State 5: Ready / Configured Cache View */}
                                      {oneProxyView === 'ready' && (
                                        <div className="space-y-2.5">
                                          {/* Header row with count, storage, and action buttons */}
                                          <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                              <span className="text-xs font-bold text-white/90">OneProxy Cache</span>
                                              <span className="text-[10px] bg-white/5 text-white/50 border border-white/10 px-2 py-0.5 rounded-md">
                                                {oneProxyStatus?.cachedImagesCount ?? 0} cards ({oneProxyStatus?.totalSizeFormatted || '0 B'})
                                              </span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                              <button
                                                type="button"
                                                onClick={() => setOneProxyView('options')}
                                                className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors cursor-pointer py-1 px-2 rounded-md hover:bg-white/5"
                                                title="Change cache folder or link existing library"
                                              >
                                                <FolderOpen size={12} />
                                                <span>Change Folder</span>
                                              </button>

                                              <button
                                                type="button"
                                                onClick={handleSyncOneProxy}
                                                disabled={isSyncingOneProxy}
                                                className="px-2.5 py-1 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                                                title="Check for newly released One Piece cards"
                                              >
                                                {isSyncingOneProxy ? (
                                                  <>
                                                    <Loader2 size={11} className="animate-spin text-primary-400" />
                                                    <span>Checking...</span>
                                                  </>
                                                ) : (
                                                  <>
                                                    <RefreshCw size={11} />
                                                    <span>Check Updates</span>
                                                  </>
                                                )}
                                              </button>
                                            </div>
                                          </div>

                                          {/* Folder Location Footnote (Clean with NO bottom right text!) */}
                                          <div className="flex items-center text-[10px] text-white/40 pt-1 border-t border-white/5">
                                            <span className="truncate max-w-full font-mono text-white/50" title={oneProxyStatus?.cacheDir}>
                                              📁 {oneProxyStatus?.cacheDir || '~/.cache/oneproxy'}
                                            </span>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {pluginState.selectedPlugin.options.length > 0 && (
                                  <div className="pt-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 block mb-2">Options</label>
                                    <div className="space-y-2">
                                      {pluginState.selectedPlugin.options.map((opt, i) => (
                                        <div key={`${opt.flag}-${i}`}>
                                          {opt.type === 'toggle' ? (
                                            <ToggleItem
                                              label={opt.label}
                                              checked={!!pluginState.options[opt.flag]}
                                              onChange={(v) => setPluginState(prev => ({
                                                ...prev,
                                                options: { ...prev.options, [opt.flag]: v }
                                              }))}
                                            />
                                          ) : opt.type === 'text' ? (
                                            <div className="space-y-1.5 relative">
                                              <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 block">{opt.label}</span>
                                              <input
                                                type="text"
                                                value={(pluginState.options[opt.flag] as string) || ''}
                                                onChange={(e) => setPluginState(prev => ({
                                                  ...prev,
                                                  options: { ...prev.options, [opt.flag]: e.target.value }
                                                }))}
                                                placeholder="e.g. eld, woe"
                                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white/80 placeholder:text-white/20 focus:outline-none focus:border-primary-500 font-mono transition-colors"
                                              />
                                            </div>
                                          ) : (
                                            <div className="relative">
                                              <select
                                                value={pluginState.options[opt.flag] || opt.choices?.[0]}
                                                onChange={(e) => setPluginState(prev => ({
                                                  ...prev,
                                                  options: { ...prev.options, [opt.flag]: e.target.value }
                                                }))}
                                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white/80 appearance-none focus:outline-none focus:border-primary-500"
                                              >
                                                {opt.choices?.map((c, idx) => <option key={`${c}-${idx}`} value={c} className="bg-[#1a1a20]">{c}</option>)}
                                              </select>
                                              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="hidden md:block w-px bg-white/5" />

                            <div className="w-full md:w-2/3 flex flex-col mt-4 md:mt-0">
                              <div className="flex items-center justify-between mb-4">
                                <label className="text-xs font-semibold text-white/40">Decklist Content</label>
                                <div className="flex items-center gap-2">
                                  {pluginState.selectedPlugin?.id === 'pokemon' && (
                                    <button
                                      type="button"
                                      onClick={handleFetchLimitlessDeckPrompt}
                                      className="px-3 py-1.5 bg-primary-600/20 border border-primary-500/30 rounded-lg hover:bg-primary-600/30 text-primary-300 transition-colors text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
                                      title="Import decklist directly from a Limitless URL or Tournament Deck ID"
                                    >
                                      <Download size={13} />
                                      <span>Import Limitless Deck</span>
                                    </button>
                                  )}
                                  {pluginState.selectedPlugin?.id === 'sorcery_contested_realm' && (
                                    <button
                                      type="button"
                                      onClick={handleFetchCuriosaDeckPrompt}
                                      className="px-3 py-1.5 bg-primary-600/20 border border-primary-500/30 rounded-lg hover:bg-primary-600/30 text-primary-300 transition-colors text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
                                      title="Import decklist directly from a Curiosa / Sorcery deck URL"
                                    >
                                      <Download size={13} />
                                      <span>Import Curiosa Deck</span>
                                    </button>
                                  )}
                                  <button onClick={(e) => { e.stopPropagation(); setIsPluginPresetsOpen(true); }} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors text-xs font-bold flex items-center gap-2 shrink-0 text-white/70">
                                    <Settings2 size={14} /> Presets
                                  </button>
                                </div>
                              </div>
                              <div
                                className={`relative flex-1 flex flex-col mb-4 bg-black/40 border-2 border-dashed ${pluginFile ? 'border-primary-500' : 'border-white/10 hover:border-white/30'} rounded-xl transition-all shadow-inner group min-h-[160px]`}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                                    setPluginFile(e.dataTransfer.files[0]);
                                    setPluginState(prev => ({ ...prev, decklist: "" }));
                                  }
                                }}
                              >
                                {pluginFile ? (
                                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                                    <div className="p-4 bg-primary-500/10 rounded-full mb-3 text-primary-400">
                                      <FileText size={32} />
                                    </div>
                                    <span className="font-mono text-sm font-bold text-white/80 mb-1">{pluginFile.name}</span>
                                    <span className="text-xs text-white/40">{(pluginFile.size / 1024).toFixed(1)} KB</span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPluginFile(null);
                                      }}
                                      className="mt-4 px-3 py-1.5 bg-red-500/20 text-red-500 hover:bg-red-500/30 rounded-lg text-xs font-bold transition-colors"
                                    >
                                      Remove File
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <textarea
                                      value={pluginState.decklist}
                                      onChange={(e) => setPluginState(prev => ({ ...prev, decklist: e.target.value }))}
                                      placeholder=""
                                      className="absolute inset-0 w-full h-full bg-transparent p-4 text-sm font-mono focus:outline-none transition-all resize-none placeholder-white/20"
                                    />
                                    <div className="absolute right-4 bottom-4 pointer-events-none opacity-20 group-hover:opacity-40 transition-opacity">
                                      <Upload size={24} />
                                    </div>
                                  </>
                                )}
                                <div className="absolute top-4 right-4 z-10 flex gap-2">
                                  {/* Hidden file input */}
                                  <input
                                    type="file"
                                    className="hidden"
                                    id="plugin-file-upload"
                                    onChange={(e) => {
                                      if (e.target.files && e.target.files.length > 0) {
                                        setPluginFile(e.target.files[0]);
                                        setPluginState(prev => ({ ...prev, decklist: "" }));
                                      }
                                    }}
                                  />
                                  {!pluginFile && (
                                    <button
                                      onClick={() => document.getElementById('plugin-file-upload')?.click()}
                                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 backdrop-blur-md"
                                    >
                                      <Upload size={14} /> Upload File
                                    </button>
                                  )}
                                </div>
                              </div>

                              {FORMAT_HINTS[pluginState.format] && (
                                <div className="mb-4 text-xs text-white/50 bg-white/[0.02] border border-white/5 rounded-xl p-3 flex items-start gap-2.5">
                                  <AlertCircle size={14} className="text-primary-400 mt-0.5 shrink-0" />
                                  <div className="space-y-1">
                                    <span className="font-bold text-white/70 block uppercase tracking-wider text-[10px]">Format Guideline</span>
                                    <p className="leading-relaxed">{FORMAT_HINTS[pluginState.format]}</p>
                                  </div>
                                </div>
                              )}

                              {/* Card Selector */}
                              {pluginSupportsCardIngestion(pluginState.selectedPlugin?.id) && (
                                <div className="bg-gradient-to-r from-primary-600/15 via-primary-500/10 to-white/[0.02] border border-primary-500/30 rounded-2xl p-4 mb-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                                  <div className="space-y-0.5 flex-1">
                                    <div className="flex items-center gap-2">
                                      <PlusCircle size={16} className="text-primary-400" />
                                      <span className="font-bold text-xs uppercase tracking-wider text-white">Card Selector</span>
                                    </div>
                                    <p className="text-[11px] text-white/50">
                                      Search any card or backing by name and add directly into your project workspace without needing a decklist.
                                    </p>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                                    <button
                                      type="button"
                                      onClick={() => openAddCardPicker()}
                                      className="flex-1 sm:flex-initial px-4 py-2.5 bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-600/20 active:scale-95 shrink-0 cursor-pointer"
                                    >
                                      <PlusCircle size={15} /> Card Selector
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* UPSCAYL AI Super-Resolution Engine Subsection */}
                              <div className="mb-4 bg-white/[0.03] border border-white/10 hover:border-primary-500/30 rounded-2xl overflow-hidden transition-all shadow-lg">
                                {/* Subsection Header */}
                                <div
                                  onClick={() => toggleUpscaleSectionExpanded(!upscaleSectionExpanded)}
                                  className="p-4 flex items-center justify-between cursor-pointer select-none group"
                                >
                                  <div>
                                    <span className="text-xs font-bold text-white block">Upscayl AI Engine</span>
                                    <span className="text-[11px] text-white/50 block">
                                      GPU-accelerated super-resolution using native Upscayl AI neural models
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <ChevronDown
                                      size={18}
                                      className={cn("text-white/40 group-hover:text-white transition-transform duration-300", upscaleSectionExpanded && "rotate-180")}
                                    />
                                  </div>
                                </div>

                                {/* Subsection Expanded Body */}
                                {upscaleSectionExpanded && (() => {
                                  const baseVramPerWorker = upscaleConfig.tileSize === 256 ? 650 : upscaleConfig.tileSize === 512 ? 1000 : upscaleConfig.tileSize === 1024 ? 1500 : 2000;
                                  const ttaMultiplier = upscaleConfig.tta ? 1.25 : 1;
                                  const estimatedVramMB = Math.round((upscaleConfig.workers || 1) * baseVramPerWorker * ttaMultiplier);
                                  const detectedGpu = upscaylStatus?.gpu;
                                  const totalVramMB = detectedGpu?.totalVramMB || 8192;
                                  const freeVramMB = detectedGpu?.freeVramMB || 4096;
                                  const isVramCritical = !!detectedGpu?.detected && (estimatedVramMB > totalVramMB);
                                  const isVramWarning = !!detectedGpu?.detected && !isVramCritical && (estimatedVramMB > freeVramMB);

                                  return (
                                    <div className="p-4 border-t border-white/5 bg-black/25 space-y-3.5">
                                      {/* Hardware Status Banner */}
                                      {detectedGpu?.detected && (
                                        <div className="p-3 bg-[#121318] border border-white/10 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-sm">
                                          <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-8 h-8 rounded-lg bg-primary-500/10 border border-primary-500/30 flex items-center justify-center text-primary-400 shrink-0">
                                              <Cpu size={16} />
                                            </div>
                                            <div className="min-w-0">
                                              <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-white truncate">{detectedGpu.name}</span>
                                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold uppercase tracking-wider shrink-0">
                                                  Vulkan GPU
                                                </span>
                                              </div>
                                              <span className="text-[10px] text-white/50 block">
                                                {((detectedGpu.totalVramMB || 0) / 1024).toFixed(1)} GB Total VRAM · {((detectedGpu.freeVramMB || 0) / 1024).toFixed(1)} GB Currently Free
                                              </span>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2 shrink-0">
                                            <div className="w-24 sm:w-28 bg-white/5 h-2 rounded-full overflow-hidden border border-white/10">
                                              <div
                                                className="bg-gradient-to-r from-emerald-500 to-primary-500 h-full rounded-full transition-all"
                                                style={{
                                                  width: `${Math.min(100, Math.max(5, ((detectedGpu.freeVramMB || 1) / (detectedGpu.totalVramMB || 1)) * 100))}%`
                                                }}
                                              />
                                            </div>
                                            <span className="text-[10px] font-mono text-white/70 font-bold shrink-0">
                                              {Math.round(((detectedGpu.freeVramMB || 1) / (detectedGpu.totalVramMB || 1)) * 100)}% Free
                                            </span>
                                          </div>
                                        </div>
                                      )}

                                      {/* Row 1: Scale & Model Architecture */}
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                        {/* Output Scale */}
                                        <div>
                                          <div className="flex items-center justify-between mb-1.5">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-white/50">
                                              Output Scale Multiplier
                                            </label>
                                            <span className="text-[10px] font-mono text-primary-400 font-bold">
                                              {upscaleConfig.scaleFactor === 2 ? '2x HD' : upscaleConfig.scaleFactor === 3 ? '3x Quad HD' : '4x Ultra HD'}
                                            </span>
                                          </div>
                                          <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#121318] border border-white/10 rounded-xl">
                                            {([2, 3, 4]).map(scale => (
                                              <button
                                                key={scale}
                                                type="button"
                                                onClick={() => updateUpscaleConfig({ scaleFactor: scale as 2 | 3 | 4 })}
                                                className={cn(
                                                  "py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer select-none",
                                                  upscaleConfig.scaleFactor === scale
                                                    ? "bg-primary-600 text-white shadow-md shadow-primary-600/30"
                                                    : "text-white/60 hover:text-white hover:bg-white/5"
                                                )}
                                              >
                                                <span>{scale}x AI Scale</span>
                                              </button>
                                            ))}
                                          </div>
                                        </div>

                                        {/* Neural Model */}
                                        <div>
                                          <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 block mb-1.5">
                                            Neural Model Architecture
                                          </label>
                                          <div className="relative">
                                            <select
                                              value={upscaleConfig.model}
                                              onChange={(e) => updateUpscaleConfig({ model: e.target.value as any })}
                                              className="w-full bg-[#121318] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white/90 appearance-none focus:outline-none focus:border-primary-500 transition-colors cursor-pointer"
                                            >
                                              <option value="high-fidelity-4x" className="bg-[#14151b]">High Fidelity 4x (Cards, Text & Borders)</option>
                                              <option value="digital-art-4x" className="bg-[#14151b]">Digital Art 4x (Anime & Illustrations)</option>
                                              <option value="ultrasharp-4x" className="bg-[#14151b]">UltraSharp 4x (Maximum Crispness)</option>
                                              <option value="remacri-4x" className="bg-[#14151b]">Remacri 4x (Photoreal Textures)</option>
                                              <option value="ultramix-balanced-4x" className="bg-[#14151b]">UltraMix Balanced 4x (Smooth Blend)</option>
                                              <option value="upscayl-standard-4x" className="bg-[#14151b]">Upscayl Standard 4x (General AI)</option>
                                              <option value="upscayl-lite-4x" className="bg-[#14151b]">Upscayl Lite 4x (Fast Inference)</option>
                                            </select>
                                            <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                                          </div>
                                        </div>
                                      </div>

                                      {/* Row 2: Concurrency & VRAM Management */}
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                        {/* Concurrency / Parallel Workers */}
                                        <div>
                                          <div className="flex items-center justify-between mb-1.5">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-white/50">
                                              Parallel Workers
                                            </label>
                                            <span className="text-[10px] font-mono text-primary-400 font-bold">
                                              {upscaleConfig.workers || 1} Card{(upscaleConfig.workers || 1) === 1 ? '' : 's'} at once
                                            </span>
                                          </div>
                                          <div className="grid grid-cols-4 gap-1.5 p-1 bg-[#121318] border border-white/10 rounded-xl">
                                            {[1, 2, 3, 4].map(w => (
                                              <button
                                                key={w}
                                                type="button"
                                                onClick={() => updateUpscaleConfig({ workers: w })}
                                                className={cn(
                                                  "py-1.5 px-1 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center cursor-pointer select-none",
                                                  (upscaleConfig.workers || 1) === w
                                                    ? "bg-primary-600 text-white shadow-md shadow-primary-600/30"
                                                    : "text-white/60 hover:text-white hover:bg-white/5"
                                                )}
                                              >
                                                <span>{w} Card{w === 1 ? '' : 's'}</span>
                                                <span className="text-[9px] opacity-70 font-mono">~{w * 2}GB</span>
                                              </button>
                                            ))}
                                          </div>
                                        </div>

                                        {/* Tile Size (VRAM Memory Footprint) */}
                                        <div>
                                          <div className="flex items-center justify-between mb-1.5">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-white/50">
                                              Tile Size (VRAM Ceiling)
                                            </label>
                                            <span className="text-[10px] font-mono text-primary-400 font-bold">
                                              {upscaleConfig.tileSize === 0 ? 'Auto / Full Card' : `${upscaleConfig.tileSize}px Tiles`}
                                            </span>
                                          </div>
                                          <div className="relative">
                                            <select
                                              value={upscaleConfig.tileSize || 0}
                                              onChange={(e) => updateUpscaleConfig({ tileSize: Number(e.target.value) })}
                                              className="w-full bg-[#121318] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white/90 appearance-none focus:outline-none focus:border-primary-500 transition-colors cursor-pointer"
                                            >
                                              <option value={0} className="bg-[#14151b]">Auto (Best Quality & Speed · ~2 GB/card)</option>
                                              <option value={1024} className="bg-[#14151b]">1024px Tiles (Balanced Memory · ~1.5 GB/card)</option>
                                              <option value={512} className="bg-[#14151b]">512px Tiles (Low VRAM Mode · ~1.0 GB/card)</option>
                                              <option value={256} className="bg-[#14151b]">256px Tiles (Minimal VRAM Mode · ~600 MB/card)</option>
                                            </select>
                                            <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                                          </div>
                                        </div>
                                      </div>

                                      {/* Row 3: Neural Parameters (TTA & Dimension Clamp) */}
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                        {/* TTA Mode */}
                                        <div
                                          onClick={() => updateUpscaleConfig({ tta: !upscaleConfig.tta })}
                                          className={cn(
                                            "p-2.5 rounded-xl border flex items-center justify-between cursor-pointer select-none transition-all",
                                            upscaleConfig.tta ? "bg-primary-500/10 border-primary-500/30 text-white" : "bg-[#121318] border-white/10 text-white/60 hover:border-white/20"
                                          )}
                                          title="8x rotational passes to eliminate AI artifacts"
                                        >
                                          <div className="min-w-0 pr-1">
                                            <span className="text-xs font-semibold block truncate">TTA Quality (Rotational Passes)</span>
                                            <span className="text-[9px] opacity-60 block truncate">8x anti-artifact passes (+25% VRAM)</span>
                                          </div>
                                          <div className={cn("w-4 h-4 rounded-md border flex items-center justify-center shrink-0", upscaleConfig.tta ? "bg-primary-600 border-primary-500 text-white" : "border-white/20")}>
                                            {upscaleConfig.tta && <Check size={12} />}
                                          </div>
                                        </div>

                                        {/* Max Resolution Cap */}
                                        <div
                                          onClick={() => updateUpscaleConfig({ maxDimension: upscaleConfig.maxDimension === 4096 ? 8192 : 4096 })}
                                          className={cn(
                                            "p-2.5 rounded-xl border flex items-center justify-between cursor-pointer select-none transition-all",
                                            upscaleConfig.maxDimension === 4096 ? "bg-primary-500/10 border-primary-500/30 text-white" : "bg-[#121318] border-white/10 text-white/60 hover:border-white/20"
                                          )}
                                          title="Caps output dimension to 4K (4096px) or allows up to 8K (8192px)"
                                        >
                                          <div className="min-w-0 pr-1">
                                            <span className="text-xs font-semibold block truncate">Max Resolution Cap</span>
                                            <span className="text-[9px] opacity-60 block truncate">{upscaleConfig.maxDimension === 4096 ? '4096px (4K Cap)' : '8192px (8K Cap)'}</span>
                                          </div>
                                          <div className={cn("w-4 h-4 rounded-md border flex items-center justify-center shrink-0", upscaleConfig.maxDimension === 4096 ? "bg-primary-600 border-primary-500 text-white" : "border-white/20")}>
                                            {upscaleConfig.maxDimension === 4096 && <Check size={12} />}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Dynamic VRAM Advisory Banner */}
                                      {isVramCritical ? (
                                        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5">
                                          <AlertTriangle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                                          <div className="min-w-0 text-[11px] leading-relaxed">
                                            <span className="font-bold text-rose-300 block">Critical: Estimated VRAM Exceeds Total Capacity</span>
                                            <span className="text-rose-200/80">
                                              Selected settings estimate <strong>~{(estimatedVramMB / 1024).toFixed(1)} GB VRAM</strong>, which exceeds your GPU's total capacity ({(totalVramMB / 1024).toFixed(1)} GB). Reduce parallel workers or select a smaller tile size to avoid GPU driver crashes.
                                            </span>
                                          </div>
                                        </div>
                                      ) : isVramWarning ? (
                                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5">
                                          <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                                          <div className="min-w-0 text-[11px] leading-relaxed">
                                            <span className="font-bold text-amber-300 block">Caution: High VRAM Pressure</span>
                                            <span className="text-amber-200/80">
                                              Selected settings estimate <strong>~{(estimatedVramMB / 1024).toFixed(1)} GB VRAM</strong>, while only <strong>{(freeVramMB / 1024).toFixed(1)} GB</strong> is currently free. Close background GPU apps or reduce workers if you experience stuttering.
                                            </span>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-[11px]">
                                          <div className="flex items-center gap-2">
                                            <CheckCircle size={14} className="text-emerald-400 shrink-0" />
                                            <span className="text-emerald-200/80">
                                              Hardware Check: Estimated <strong>~{(estimatedVramMB / 1024).toFixed(1)} GB VRAM</strong> fits comfortably within <strong>{(freeVramMB / 1024).toFixed(1)} GB free VRAM</strong>.
                                            </span>
                                          </div>
                                          <span className="text-[10px] text-emerald-400/80 font-mono font-bold shrink-0">Optimal</span>
                                        </div>
                                      )}
                                    
                                      {/* Direct Trigger Buttons - Balanced 50/50 layout */}
                                      <div className="pt-2.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 border-t border-white/5">
                                        <button
                                          type="button"
                                          onClick={() => handleUpscale(undefined, true)}
                                          className="flex-1 py-3 px-4 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center shadow-lg shadow-primary-600/25 active:scale-[0.98] cursor-pointer whitespace-nowrap min-w-0"
                                        >
                                          <span className="truncate">Upscale All Cards Now</span>
                                        </button>
                                        <button
                                          type="button"
                                          disabled={selectedAssets.size === 0}
                                          onClick={() => handleUpscale(Array.from(selectedAssets), false)}
                                          className={cn(
                                            "flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border whitespace-nowrap min-w-0",
                                            selectedAssets.size > 0
                                              ? "bg-white/10 hover:bg-white/15 text-white border-white/20 active:scale-[0.98] cursor-pointer"
                                              : "bg-white/[0.02] text-white/30 border-white/5 cursor-not-allowed"
                                          )}
                                        >
                                          <CheckSquare size={15} className="shrink-0" />
                                          <span className="truncate">Upscayl Selected ({selectedAssets.size})</span>
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>

                              <button
                                onClick={async () => {
                                  if (pluginState.selectedPlugin.id === 'custom_script_upload' && (!pluginState.format || pluginState.format === 'script')) {
                                    addLog(`[Error] Please upload or select a .py script file in the Format section first.`);
                                    setTaskProgress(null);
                                    return;
                                  }

                                  const isUrlFormat = pluginState.format === 'url' || pluginState.format.includes('url');
                                  const isDirectInput = isUrlFormat || pluginState.format === 'elestrals' || pluginState.format === 'ydke';

                                  let targetInput = '';
                                  let uploadedPluginFilePath: string | undefined = undefined;

                                  // If URL format is selected, ignore any previously staged pluginFile
                                  const effectivePluginFile = isUrlFormat ? null : pluginFile;

                                  if (effectivePluginFile) {
                                    addLog(`[System] Uploading plugin file ${effectivePluginFile.name}...`);
                                    const fd = new FormData();
                                    fd.append('file', effectivePluginFile);
                                    try {
                                      const uploadRes = await fetch('/api/plugin/upload-file', {
                                        method: 'POST',
                                        body: fd
                                      });
                                      const uploadData = await uploadRes.json();
                                      if (uploadData.success) {
                                        targetInput = uploadData.path;
                                        uploadedPluginFilePath = uploadData.path;
                                      } else {
                                        addLog(`[Error] Failed to upload plugin file: ${uploadData.error}`);
                                        return;
                                      }
                                    } catch (e) {
                                      addLog(`[Error] Failed to upload plugin file: ${e}`);
                                      return;
                                    }
                                  } else {
                                    const rawInput = (pluginState.decklist || '').trim();

                                    // Validate URL format input before executing
                                    if (isUrlFormat) {
                                      if (!rawInput) {
                                        addLog(`[Error] Please enter a valid decklist URL (e.g. Moxfield, Archidekt, Scryfall) in the input area first.`);
                                        setTaskProgress({ current: 0, total: 1, message: 'Please enter a URL first.' });
                                        setTimeout(() => setTaskProgress(null), 2500);
                                        return;
                                      }
                                      // Extract clean first line URL without quotes or whitespace
                                      const cleanUrl = rawInput.split(/[\r\n]+/)[0].trim().replace(/^["']|["']$/g, '');
                                      targetInput = cleanUrl;
                                    } else {
                                      // 1. Save decklist
                                      addLog(`[System] Staging decklist for ${pluginState.selectedPlugin.name}...`);
                                      try {
                                        await fetch('/api/project/save-decklist', {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ content: pluginState.decklist })
                                        });
                                      } catch (err) {
                                        addLog(`[Error] Failed to stage decklist: ${err}`);
                                        return;
                                      }

                                      targetInput = isDirectInput ? rawInput : `game/decklist/current.txt`;
                                    }
                                  }

                                  // 2. Build and run command
                                  let args: string[] = [];
                                  let targetCommand = `plugins/${pluginState.selectedPlugin.id}/fetch.py`;

                                  if (pluginState.selectedPlugin.id === 'custom_script_upload') {
                                    targetCommand = `__CUSTOM_SCRIPT__:${pluginState.format}`;
                                    const userArgsStr = pluginState.options['--args'] as string || '';
                                    const userArgs = userArgsStr.split(' ').filter(a => a.trim() !== '');
                                    args = [...userArgs, targetInput];
                                  } else {
                                    args = [targetInput, pluginState.format];
                                    Object.entries(pluginState.options).forEach(([flag, val]) => {
                                      if (val === true) {
                                        args.push(flag);
                                      } else if (typeof val === 'string' && val.trim() !== "") {
                                        if ((flag === '-s' || flag === '--ignore_set') && val.includes(',')) {
                                          val.split(',').forEach(item => {
                                            const trimmed = item.trim();
                                            if (trimmed) {
                                              args.push(flag);
                                              args.push(trimmed);
                                            }
                                          });
                                        } else {
                                          args.push(flag);
                                          args.push(val.trim());
                                        }
                                      }
                                    });
                                  }

                                  const tempDirId = crypto.randomUUID();
                                  const result = await runCommand(targetCommand, args, {
                                    isPluginFetch: pluginState.selectedPlugin.id === 'custom_script_upload',
                                    startMessage: `Fetching artwork for ${pluginState.selectedPlugin.name}...`,
                                    hideProgressOnComplete: true,
                                    tempDirId,
                                    uploadedPluginFilePath,
                                    upscaleOptions: upscaleConfig
                                  });

                                  if (result && result.fetchedFiles) {
                                    const collisions: string[] = [];
                                    const fronts = Array.isArray(result.fetchedFiles.fronts) ? result.fetchedFiles.fronts : [];
                                    const backs = Array.isArray(result.fetchedFiles.backs) ? result.fetchedFiles.backs : [];
                                    const double_sided = Array.isArray(result.fetchedFiles.double_sided) ? result.fetchedFiles.double_sided : [];
                                    const totalFetched = fronts.length + backs.length + double_sided.length;

                                    if (totalFetched === 0) {
                                      addLog(`[Warning] No cards were found or fetched. Please verify that the deck/URL is public and valid.`);
                                      setTaskProgress({ current: 0, total: 1, message: 'No cards found.' });
                                      setTimeout(() => setTaskProgress(null), 2500);
                                      return;
                                    }

                                    const targetFronts = status?.plugins?.fronts || [];
                                    const targetBacks = status?.plugins?.backs || [];
                                    const targetDob = status?.plugins?.double_sided || [];

                                    fronts.forEach(f => { if (targetFronts.includes(f)) collisions.push(`front:${f}`); });
                                    backs.forEach(f => { if (targetBacks.includes(f)) collisions.push(`back:${f}`); });
                                    double_sided.forEach(f => { if (targetDob.includes(f)) collisions.push(`double_sided:${f}`); });

                                    if (collisions.length > 0) {
                                      setTaskProgress(null);
                                      setFetchConflictData({ tempDirId, collisions, resolutions: {} });
                                    } else {
                                      setTaskProgress({ current: totalFetched, total: totalFetched, percent: 98, message: `Committing ${totalFetched} card(s)...` });
                                      await fetch('/api/plugin/fetch-commit', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ tempDirId, resolutions: {}, upscaleOptions: upscaleConfig })
                                      });
                                      await fetchStatus();
                                      addLog(`[System] Successfully imported ${totalFetched} card image(s).`);
                                      setTaskProgress({ current: totalFetched, total: totalFetched, percent: 100, isComplete: true, message: `Imported ${totalFetched} card(s)!` });
                                      setTimeout(() => setTaskProgress(null), 1500);
                                    }
                                  } else {
                                    setTaskProgress(null);
                                  }
                                }}
                                className="w-full py-4 bg-primary-600 hover:bg-primary-500 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary-600/20 transition-all active:scale-95 text-lg"
                              >
                                <Download size={20} />
                                {pluginState.selectedPlugin.id === 'custom_script_upload' ? "Run Script" : "Fetch Images"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="space-y-16">
                    {/* Back Patterns Section */}
                    {(assetFilter === 'all' || assetFilter === 'back') && assetViewMode !== 'plugins' && (
                      <section className="space-y-6">
                        <DropZone
                          label="Drag and drop area for backs"
                          isLibrary={assetViewMode === 'library'}
                          disabled={false}
                          onDrop={async (files, isLibrary) => {
                            const filesToUpload = isLibrary ? Array.from(files) : [files[0]];
                            addLog(`[Uploader] Dropped ${filesToUpload.length} back patterns. Starting upload...`);
                            for (const file of filesToUpload) {
                              await handleUpload(file, 'back', isLibrary);
                            }
                            await fetchStatus();
                          }}
                        >
                          <div className="flex items-center justify-between border-b border-white/5 pb-4 px-2">
                            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCollapsedSections(s => ({ ...s, backs: !s.backs }))}>
                              <div className="p-2 bg-primary-600/20 rounded-lg text-primary-400 shadow-inner">
                                <ImageIcon size={18} />
                              </div>
                              <h3 className="text-sm font-bold uppercase tracking-widest text-white/60 flex items-center gap-2 select-none">
                                Back Patterns
                                <span className="text-white/20 font-normal">
                                  ({getAllAssets('back')?.length || 0})
                                </span>
                              </h3>
                            </div>
                            <div className="flex items-center gap-2">

                              <button onClick={() => setCollapsedSections(s => ({ ...s, backs: !s.backs }))} className="p-1 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-colors">
                                <ChevronDown size={18} className={cn("transition-transform", collapsedSections.backs && "-rotate-90")} />
                              </button>
                            </div>
                          </div>

                          {!collapsedSections.backs && (
                            <div
                              className="grid gap-4 sm:gap-6 p-4 sm:p-6 bg-white/[0.02] border border-white/5 rounded-2xl sm:rounded-[40px] mt-6"
                              style={{ gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${cardWidth}px), 1fr))` }}
                            >
                              <TemplateCard
                                type="back"
                                multiple={assetViewMode === 'library'}
                                onUpload={async (files) => {
                                  for (let i = 0; i < files.length; i++) {
                                    setTaskProgress({ current: i + 1, total: files.length, message: `Uploading ${files[i].name}...` });
                                    await handleUpload(files[i], 'back', assetViewMode === 'library');
                                  }
                                  setTaskProgress(prev => prev ? { ...prev, message: 'Upload complete.' } : null);
                                  setTimeout(() => setTaskProgress(null), 1500);
                                }}
                              />
                              {getAllAssets('back')
                                .filter(img => img.toLowerCase().includes(assetSearch.toLowerCase()))
                                .map((img: string, i: number) => (
                                  <AssetItem
                                    key={`back_${img}`}
                                    cacheBustToken={cacheBusts[img] || globalCacheBust}
                                    name={img}
                                    type="back"
                                    allAssets={getCurrentAssets()}
                                    selected={selectedAssets.has(`back:${img}`)}
                                    onContextMenu={(x, y) => setContextMenu({ x, y, name: img, type: 'back' })}
                                    onSelect={(e) => handleAssetSelect(`back:${img}`, e)}
                                    onDragSelectStart={() => handleDragStart(`back:${img}`)}
                                    onEnlarge={(src) => setEnlargedImage(src)}
                                    uploadedImages={uploadedImages}
                                    assetViewMode={assetViewMode}
                                    cardDimming={cardDimming}
                                  />
                                ))}
                            </div>
                          )}
                        </DropZone>
                      </section>
                    )}

                    {/* Front Faces Section */}
                    {(assetFilter === 'all' || assetFilter === 'front') && (
                      <section className="space-y-6">
                        <DropZone
                          label="Drag and drop area for fronts"
                          isLibrary={assetViewMode === 'library'}
                          disabled={assetViewMode === 'plugins'}
                          onDrop={async (files, isLibrary) => {
                            addLog(`[Uploader] Dropped ${files.length} front faces. Starting upload...`);
                            for (const file of Array.from(files)) {
                              await handleUpload(file, 'front', isLibrary);
                            }
                            await fetchStatus();
                          }}
                        >
                          <div className="flex items-center justify-between border-b border-white/5 pb-4 px-2">
                            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCollapsedSections(s => ({ ...s, fronts: !s.fronts }))}>
                              <div className="p-2 bg-primary-600/20 rounded-lg text-primary-400 shadow-inner">
                                <Eye size={18} />
                              </div>
                              <h3 className="text-sm font-bold uppercase tracking-widest text-white/60 flex items-center gap-2 select-none">
                                Front Faces
                                <span className="text-white/20 font-normal">
                                  {getAllAssets('front')?.length || 0}
                                </span>
                              </h3>
                            </div>
                              <div className="flex items-center gap-2">
                                <button onClick={() => setCollapsedSections(s => ({ ...s, fronts: !s.fronts }))} className="p-1 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-colors">
                                  <ChevronDown size={18} className={cn("transition-transform", collapsedSections.fronts && "-rotate-90")} />
                                </button>
                              </div>
                          </div>

                          {!collapsedSections.fronts && (
                            <div
                              className="grid gap-4 sm:gap-6 p-4 sm:p-6 bg-white/[0.02] border border-white/5 rounded-2xl sm:rounded-[40px] mt-6"
                              style={{ gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${cardWidth}px), 1fr))` }}
                            >
                              {assetViewMode !== 'plugins' && (
                                <TemplateCard
                                  type="front"
                                  multiple={true}
                                  onUpload={async (files) => {
                                    for (let i = 0; i < files.length; i++) {
                                      setTaskProgress({ current: i + 1, total: files.length, message: `Uploading ${files[i].name}...` });
                                      await handleUpload(files[i], 'front', assetViewMode === 'library');
                                    }
                                    setTaskProgress(prev => prev ? { ...prev, message: 'Upload complete.' } : null);
                                    setTimeout(() => setTaskProgress(null), 1500);
                                  }}
                                />
                              )}
                              {getAllAssets('front')
                                .filter(img => img.toLowerCase().includes(assetSearch.toLowerCase()))
                                .map((img: string, i: number) => (
                                  <AssetItem
                                    key={`front_${img}`}
                                    cacheBustToken={cacheBusts[img] || globalCacheBust}
                                    name={img}
                                    type="front"
                                    allAssets={getCurrentAssets()}
                                    selected={selectedAssets.has(`front:${img}`)}
                                    onContextMenu={(x, y) => setContextMenu({ x, y, name: img, type: 'front' })}
                                    onSelect={(e) => handleAssetSelect(`front:${img}`, e)}
                                    onDragSelectStart={() => handleDragStart(`front:${img}`)}
                                    onEnlarge={(src) => setEnlargedImage(src)}
                                    isFlipped={flippedAssets.has(`front:${img}`)}
                                    onToggleFlip={(e) => handleToggleFlip(`front:${img}`, e)}
                                    uploadedImages={uploadedImages}
                                    assetViewMode={assetViewMode}
                                    cardDimming={cardDimming}
                                  />
                                ))}
                            </div>
                          )}
                        </DropZone>
                      </section>
                    )}

                    {/* Double-Sided Section */}
                    {(assetFilter === 'all' || assetFilter === 'double_sided') && (
                      <section className="space-y-6">
                        <DropZone
                          label="Drag and drop area for double-sided"
                          isLibrary={assetViewMode === 'library'}
                          disabled={assetViewMode === 'plugins'}
                          onDrop={async (files, isLibrary) => {
                            addLog(`[Uploader] Dropped ${files.length} double-sided faces. Starting upload...`);
                            for (const file of Array.from(files)) {
                              await handleUpload(file, 'double_sided', isLibrary);
                            }
                            await fetchStatus();
                          }}
                        >
                          <div className="flex items-center justify-between border-b border-white/5 pb-4 px-2">
                            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCollapsedSections(s => ({ ...s, doubleSided: !s.doubleSided }))}>
                              <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400 shadow-inner">
                                <Book size={18} />
                              </div>
                              <h3 className="text-sm font-bold uppercase tracking-widest text-white/60 flex items-center gap-2 select-none">
                                Double-Sided
                                <span className="text-white/20 font-normal">
                                  {getAllAssets('double_sided')?.length || 0}
                                </span>
                              </h3>
                            </div>
                            <button onClick={() => setCollapsedSections(s => ({ ...s, doubleSided: !s.doubleSided }))} className="p-1 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-colors">
                              <ChevronDown size={18} className={cn("transition-transform", collapsedSections.doubleSided && "-rotate-90")} />
                            </button>
                          </div>

                          {!collapsedSections.doubleSided && (
                            <div
                              className="grid gap-4 sm:gap-6 p-4 sm:p-6 bg-white/[0.02] border border-white/5 rounded-2xl sm:rounded-[40px] mt-6"
                              style={{ gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${cardWidth}px), 1fr))` }}
                            >
                              {assetViewMode !== 'plugins' && (
                                <TemplateCard
                                  type="double_sided"
                                  multiple={true}
                                  onUpload={async (files) => {
                                    for (let i = 0; i < files.length; i++) {
                                      setTaskProgress({ current: i + 1, total: files.length, message: `Uploading ${files[i].name}...` });
                                      await handleUpload(files[i], 'double_sided', assetViewMode === 'library');
                                    }
                                    setTaskProgress(prev => prev ? { ...prev, message: 'Upload complete.' } : null);
                                    setTimeout(() => setTaskProgress(null), 1500);
                                  }}
                                />
                              )}
                              {getAllAssets('double_sided')
                                .filter(img => img.toLowerCase().includes(assetSearch.toLowerCase()))
                                .map((img: string, i: number) => (
                                  <AssetItem
                                    key={`double_sided_${img}`}
                                    cacheBustToken={cacheBusts[img] || globalCacheBust}
                                    name={img}
                                    type="double_sided"
                                    allAssets={getCurrentAssets()}
                                    selected={selectedAssets.has(`double_sided:${img}`)}
                                    onContextMenu={(x, y) => setContextMenu({ x, y, name: img, type: 'double_sided' })}
                                    onSelect={(e) => handleAssetSelect(`double_sided:${img}`, e)}
                                    onDragSelectStart={() => handleDragStart(`double_sided:${img}`)}
                                    onEnlarge={(src) => setEnlargedImage(src)}
                                    isFlipped={flippedAssets.has(`double_sided:${img}`)}
                                    onToggleFlip={(e) => handleToggleFlip(`double_sided:${img}`, e)}
                                    uploadedImages={uploadedImages}
                                    assetViewMode={assetViewMode}
                                    cardDimming={cardDimming}
                                  />
                                ))}
                            </div>
                          )}
                        </DropZone>
                      </section>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </ErrorBoundary>

      <AnimatePresence>
        {importConflictData && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0f0f13] rounded-2xl w-full max-w-md border border-white/10 shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-white/5 bg-primary-500/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-500/20 rounded-lg">
                    <ShieldCheck size={24} className="text-primary-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Item Exists</h2>
                    <p className="text-primary-500 text-sm">
                      {importConflictData.collisions.length} item(s) already exist in {importConflictData.destination}.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="bg-black/40 border border-white/5 rounded-xl p-4 font-mono text-xs text-white/60 max-h-32 overflow-y-auto">
                  <ul className="space-y-1">
                    {importConflictData.collisions.map((c, i) => (
                      <li key={`${c}-${i}`} className="truncate">• {c.split(':')[1]}</li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={async () => {
                      const { items, destination, source, backResolution = 'check' } = importConflictData;
                      setImportConflictData(null);
                      await performMoveOrCopy(items, destination, source, 'keep', backResolution);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all"
                  >
                    Keep Existing (Skip Duplicates)
                  </button>

                  <button
                    onClick={async () => {
                      const { items, destination, source, backResolution = 'check' } = importConflictData;
                      setImportConflictData(null);
                      await performMoveOrCopy(items, destination, source, 'replace', backResolution);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-primary-500 hover:bg-primary-400 text-white rounded-xl font-bold transition-all"
                  >
                    Replace Existing
                  </button>

                  <button
                    onClick={async () => {
                      const { items, destination, source, backResolution = 'check' } = importConflictData;
                      setImportConflictData(null);
                      await performMoveOrCopy(items, destination, source, 'keep_both', backResolution);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-secondary-500/20 hover:bg-secondary-500/30 text-white rounded-xl font-bold transition-all border border-secondary-500/30"
                  >
                    Keep Both
                  </button>

                  <button
                    onClick={() => setImportConflictData(null)}
                    className="w-full flex items-center justify-center gap-2 py-2 text-white/40 hover:text-white transition-colors text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {backConflictData && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0f0f13] rounded-2xl w-full max-w-md border border-white/10 shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-white/5 bg-primary-500/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-500/20 rounded-lg">
                    <ShieldCheck size={24} className="text-primary-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Back Image Exists</h2>
                    <p className="text-primary-500 text-sm">
                      A card back already exists in your workspace.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <p className="text-white/70 text-sm">Do you want to replace the current workspace card back, or keep the existing one and skip adding this new back image?</p>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={async () => {
                      const { items, destination, source, conflictResolution = 'check' } = backConflictData;
                      setBackConflictData(null);
                      await performMoveOrCopy(items, destination, source, conflictResolution, 'keep');
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all"
                  >
                    Keep Existing
                  </button>

                  <button
                    onClick={async () => {
                      const { items, destination, source, conflictResolution = 'check' } = backConflictData;
                      setBackConflictData(null);
                      await performMoveOrCopy(items, destination, source, conflictResolution, 'replace');
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-primary-500 hover:bg-primary-400 text-white rounded-xl font-bold transition-all"
                  >
                    Replace
                  </button>

                  <button
                    onClick={() => setBackConflictData(null)}
                    className="w-full flex items-center justify-center gap-2 py-2 text-white/40 hover:text-white transition-colors text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {fetchConflictData && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-6 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0f0f13] rounded-2xl w-full max-w-4xl border border-white/10 shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-white/5 bg-primary-500/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-500/20 rounded-lg">
                    <ShieldCheck size={24} className="text-primary-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Item Exists</h2>
                    <p className="text-primary-500 text-sm">
                      {fetchConflictData.collisions.length} fetched item(s) already exist in plugin gallery.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="bg-black/40 border border-white/5 rounded-xl p-4 max-h-[50vh] overflow-y-auto space-y-8">
                  {fetchConflictData.collisions.map((c, i) => {
                    const type = c?.includes(':') ? c.split(':')[0] : 'front';
                    const name = c?.includes(':') ? c.split(':')[1] : (c || '');
                    const dotIndex = name.lastIndexOf('.');
                    const ext = dotIndex !== -1 ? name.substring(dotIndex) : '.png';
                    const baseName = dotIndex !== -1 ? name.substring(0, dotIndex) : name;

                    const existingList = type === 'back'
                      ? status?.plugins?.backs
                      : (type === 'double_sided' ? status?.plugins?.double_sided : status?.plugins?.fronts);

                    const variants = (existingList || []).filter(f => f === name || (f.startsWith(`${baseName}_`) && f.endsWith(ext)));

                    return (
                      <div key={`${c}-${i}`} className="space-y-4 border-b border-white/10 pb-6 last:border-0 last:pb-0">
                        <div className="text-white font-bold truncate text-sm px-2 text-center md:text-left">{name}</div>

                        <div className="flex flex-col md:flex-row gap-6">
                          <div className="w-full md:w-1/3 flex flex-col gap-3">
                            <div className="text-[10px] uppercase tracking-widest text-primary-400 font-bold px-2 text-center md:text-left">Incoming Card</div>
                            <div className="aspect-[2.5/3.5] bg-[#0f0f13] border border-primary-500/50 rounded-xl overflow-hidden shadow-lg relative max-w-[200px] mx-auto md:mx-0 w-full">
                              <img src={`/library/Temp_Fetch_${fetchConflictData.tempDirId}/game/${type}/${encodeURIComponent(name)}`} className="absolute inset-0 w-full h-full object-cover" />
                            </div>
                          </div>

                          <div className="w-full md:w-2/3 flex flex-col gap-3">
                            <div className="text-[10px] uppercase tracking-widest text-secondary-400 font-bold px-2 text-center md:text-left">Existing Cards to Replace ({variants.length})</div>
                            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-1">
                              {variants.map(v => (
                                <div key={v} className="aspect-[2.5/3.5] bg-[#0f0f13] border border-white/10 w-full rounded-xl overflow-hidden relative opacity-70 hover:opacity-100 transition-opacity">
                                  <img src={`/plugins_staging/${type}/${encodeURIComponent(v)}?t=${cacheBusts[v] || Date.now()}`} className="absolute inset-0 w-full h-full object-cover" />
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-col md:flex-row gap-3">
                  <button
                    onClick={async () => {
                      const { tempDirId, collisions } = fetchConflictData;
                      setFetchConflictData(null);
                      setTaskProgress({ current: 1, total: 1, percent: 98, message: 'Committing fetch...' });

                      const resolutions: Record<string, 'skip'> = {};
                      collisions.forEach(c => resolutions[c] = 'skip');

                      await fetch('/api/plugin/fetch-commit', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ tempDirId, resolutions })
                      });
                      await fetchStatus();
                      setTaskProgress({ current: 1, total: 1, percent: 100, isComplete: true, message: 'Committed.' });
                      setTimeout(() => setTaskProgress(null), 1200);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all"
                  >
                    Keep All Existing (Skip Duplicates)
                  </button>

                  <button
                    onClick={async () => {
                      const { tempDirId, collisions } = fetchConflictData;
                      setFetchConflictData(null);
                      setTaskProgress({ current: 1, total: 1, percent: 98, message: 'Committing fetch...' });
                      await fetch('/api/plugin/fetch-commit', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ tempDirId, resolutions: {} })
                      });

                      const newBusts = { ...cacheBusts };
                      collisions.forEach(c => {
                        const name = c?.includes(':') ? c.split(':')[1] : c;
                        if (name) newBusts[name] = Date.now();
                      });
                      setCacheBusts(newBusts);

                      await fetchStatus();
                      setTaskProgress({ current: 1, total: 1, percent: 100, isComplete: true, message: 'Committed.' });
                      setTimeout(() => setTaskProgress(null), 1200);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-primary-500 hover:bg-primary-400 text-white rounded-xl font-bold transition-all"
                  >
                    Replace All Existing
                  </button>

                  <button
                    onClick={async () => {
                      const { tempDirId, collisions } = fetchConflictData;
                      setFetchConflictData(null);
                      setTaskProgress({ current: 1, total: 1, percent: 98, message: 'Committing fetch...' });

                      const resolutions: Record<string, 'keep_both'> = {};
                      collisions.forEach(c => resolutions[c] = 'keep_both');

                      await fetch('/api/plugin/fetch-commit', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ tempDirId, resolutions })
                      });

                      await fetchStatus();
                      setTaskProgress({ current: 1, total: 1, percent: 100, isComplete: true, message: 'Committed.' });
                      setTimeout(() => setTaskProgress(null), 1200);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-secondary-500/20 hover:bg-secondary-500/30 text-white rounded-xl font-bold transition-all border border-secondary-500/30"
                  >
                    Keep Both for All
                  </button>

                  <button
                    onClick={async () => {
                      const { tempDirId } = fetchConflictData;
                      setFetchConflictData(null);
                      await fetch('/api/plugin/fetch-commit', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ tempDirId, abort: true })
                      });
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 text-white/40 hover:text-white transition-colors text-sm"
                  >
                    Cancel Fetch Entirely
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showConflictModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-[#0f0f13] border border-white/10 rounded-3xl p-8 shadow-2xl space-y-6"
            >
              <div className="flex items-center gap-4 text-primary-500">
                <div className="p-3 bg-primary-500/10 rounded-2xl">
                  <Info size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Project already contains a Back</h3>
                  <p className="text-sm text-white/40">Projects can only have one default back card.</p>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => uploadToProject(true, false)}
                  className="w-full py-4 bg-primary-600 hover:bg-primary-500 text-white rounded-2xl font-bold transition-all active:scale-95"
                >
                  Replace
                </button>
                <button
                  onClick={() => uploadToProject(false, true)}
                  className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold border border-white/10 transition-all active:scale-95"
                >
                  Keep
                </button>
                <button
                  onClick={() => {
                    setShowConflictModal(false);
                    setPendingUploadItems([]);
                  }}
                  className="w-full py-4 text-white/40 hover:text-white transition-all font-bold"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
      </AnimatePresence>

      <AnimatePresence>
      </AnimatePresence>





      <AnimatePresence>
        {isReplaceBackDialogOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-[#0f0f13] border border-white/10 rounded-3xl p-8 shadow-2xl space-y-6"
            >
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-white">Replace Back Pattern?</h3>
                <p className="text-sm text-white/40">Only one back pattern card is allowed. Replacing it will remove the existing one.</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setIsReplaceBackDialogOpen(false)}
                  className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (pendingBackFile) {
                      await performUpload(pendingBackFile, 'back', false);
                    }
                    setIsReplaceBackDialogOpen(false);
                    setPendingBackFile(null);
                  }}
                  className="flex-1 px-4 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl transition font-medium"
                >
                  Replace
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showThemeSettings && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={cn(
                "w-full bg-[#0f0f13] border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col max-h-[90vh] transition-all duration-300",
                settingsTab === 'system' ? "max-w-2xl" : "max-w-sm"
              )}
            >
              <div className="space-y-1 shrink-0 mb-6">
                <h3 className="text-xl font-bold text-white">Settings</h3>
                <p className="text-sm text-white/40">Customize your workspace and shortcuts.</p>
              </div>

              <div className="flex bg-black/40 rounded-lg p-1 gap-1 mb-6 shrink-0">
                <button
                  onClick={() => setSettingsTab('theme')}
                  className={cn("flex-1 py-1.5 text-xs font-semibold rounded-md transition-all", settingsTab === 'theme' ? "bg-white/10 text-white" : "text-white/40 hover:text-white")}
                >
                  Theme
                </button>
                <button
                  onClick={() => setSettingsTab('shortcuts')}
                  className={cn("flex-1 py-1.5 text-xs font-semibold rounded-md transition-all", settingsTab === 'shortcuts' ? "bg-white/10 text-white" : "text-white/40 hover:text-white")}
                >
                  Shortcuts
                </button>
                <button
                  onClick={() => setSettingsTab('system')}
                  className={cn(
                    "flex-1 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 relative",
                    settingsTab === 'system' ? "bg-white/10 text-white" : "text-white/40 hover:text-white"
                  )}
                >
                  <span>System</span>
                  {updateInfo?.hasUpdate && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse" />
                  )}
                </button>
              </div>

              {settingsTab === 'theme' && (
                <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1 mb-6">
                  <div className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-sm font-medium text-white block">Completion Sound</span>
                      <span className="text-xs text-white/40 block">Play a sound when PDF generation is done.</span>
                    </div>
                    <ToggleItem
                      label=""
                      checked={playDingSound}
                      onChange={setPlayDingSound}
                    />
                  </div>

                  <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-4">
                    <span className="text-sm font-medium text-white block">Primary Color</span>
                    <div className="flex items-center gap-3">
                      {(['indigo', 'emerald', 'rose', 'amber'] as Theme[]).map((t, i) => (
                        <button
                          key={`${t}-${i}`}
                          onClick={() => {
                            setCurrentTheme(t);
                            setTheme(t);
                          }}
                          className={cn(
                            "w-8 h-8 rounded-full border transition-all",
                            currentTheme === t ? "border-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.3)]" : "border-white/20 hover:scale-105",
                            t === 'indigo' && "bg-[#6366f1]",
                            t === 'emerald' && "bg-[#10b981]",
                            t === 'rose' && "bg-[#f43f5e]",
                            t === 'amber' && "bg-[#f59e0b]"
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between opacity-50 cursor-not-allowed hidden">
                    <span className="text-sm font-medium text-white">Background</span>
                    <span className="text-xs font-mono text-white/40">DARK/BLUR</span>
                  </div>

                  <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-4">
                    <span className="text-sm font-medium text-white block">Appearance</span>
                    <div className="flex bg-black/40 rounded-lg p-1.5 gap-1.5 focus-within:ring-2 ring-primary-500/50">
                      <button
                        onClick={() => setColorMode('dark')}
                        className={cn(
                          "flex-1 capitalize text-xs font-semibold py-2 rounded-md transition-all outline-none",
                          colorMode === 'dark' ? "bg-primary-600 text-white shadow-md shadow-primary-600/30" : "text-white/40 hover:text-white hover:bg-white/5"
                        )}
                      >
                        Dark Mode
                      </button>
                      <button
                        onClick={() => setColorMode('light')}
                        className={cn(
                          "flex-1 capitalize text-xs font-semibold py-2 rounded-md transition-all outline-none",
                          colorMode === 'light' ? "bg-primary-600 text-white shadow-md shadow-primary-600/30" : "text-white/40 hover:text-white hover:bg-white/5"
                        )}
                      >
                        Light Mode
                      </button>
                    </div>
                  </div>

                  <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-4">
                    <span className="text-sm font-medium text-white block">Card Dimming</span>
                    <div className="flex bg-black/40 rounded-lg p-1.5 gap-1.5 focus-within:ring-2 ring-primary-500/50">
                      {(['none', 'tint', 'dark'] as const).map((option, i) => (
                        <button
                          key={`${option}-${i}`}
                          onClick={() => setCardDimming(option)}
                          className={cn(
                            "flex-1 capitalize text-xs font-semibold py-2 rounded-md transition-all outline-none",
                            cardDimming === option
                              ? "bg-primary-600 text-white shadow-md shadow-primary-600/30"
                              : "text-white/40 hover:text-white hover:bg-white/5"
                          )}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-sm font-medium text-white block">Workspace Cleanup</span>
                      <span className="text-xs text-white/40 block">Delete all images from card image directories.</span>
                    </div>
                    <button
                      onClick={() => {
                        setShowThemeSettings(false);
                        cleanUpOutputs();
                      }}
                      className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 active:scale-95"
                    >
                      <Trash2 size={14} />
                      Run Cleanup
                    </button>
                  </div>

                  <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-3">
                    <div className="space-y-1">
                      <span className="text-sm font-medium text-white block">Library Folder Location</span>
                      <span className="text-xs text-white/40 block">
                        Your custom card images and settings are stored here. Restoring or updating the app retains this directory cleanly.
                      </span>
                    </div>
                    {status?.libraryPath ? (
                      <div className="space-y-2">
                        <div className="p-3 bg-black/40 border border-white/5 rounded-xl font-mono text-[10px] text-white/60 select-all whitespace-pre-wrap break-all">
                          {status.libraryPath}
                        </div>
                        <button
                          onClick={() => {
                            if (status?.libraryPath) {
                              navigator.clipboard.writeText(status.libraryPath);
                              setCopiedPath(true);
                              setTimeout(() => setCopiedPath(false), 2000);
                            }
                          }}
                          className={cn(
                            "w-full py-2 border rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-2",
                            copiedPath
                              ? "bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20 hover:bg-[#10b981]/20"
                              : "bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border-white/10"
                          )}
                        >
                          <Copy size={12} />
                          {copiedPath ? "Copied Folder Path!" : "Copy Folder Path"}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs font-mono text-white/20 italic block">Loading library path...</span>
                    )}
                  </div>

                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <div className="px-4 pb-1">
                      <p className="text-[10px] font-semibold text-white/20 uppercase tracking-widest">Open Source Repositories</p>
                    </div>
                    <a
                      href="https://github.com/Alan-Cha/silhouette-card-maker"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex justify-between items-center w-full px-4 py-3 rounded-xl hover:bg-white/5 transition-colors group"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm text-white/60 group-hover:text-primary-400 font-medium transition-colors">Original SCM Engine</span>
                        <span className="text-[10px] text-white/40">Python Backend Logic</span>
                      </div>
                      <ExternalLink size={16} className="text-white/40 group-hover:text-primary-400 transition-colors" />
                    </a>
                    <a
                      href="https://github.com/TomatoMan280/SCM-UI"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex justify-between items-center w-full px-4 py-3 rounded-xl hover:bg-white/5 transition-colors group"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm text-white/60 group-hover:text-primary-400 font-medium transition-colors">SCMUI Wrapper</span>
                        <span className="text-[10px] text-white/40">React UI Frontend</span>
                      </div>
                      <ExternalLink size={16} className="text-white/40 group-hover:text-primary-400 transition-colors" />
                    </a>
                  </div>
                </div>
              )}

              {settingsTab === 'shortcuts' && (
                <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1 mb-6">
                  {Object.keys(shortcuts).map(action => (
                    <div key={action} className="p-3 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-2">
                      <span className="text-xs font-medium text-white/80 capitalize px-1">{action.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <input
                        type="text"
                        value={shortcuts[action]}
                        onChange={(e) => setShortcuts(prev => ({ ...prev, [action]: e.target.value }))}
                        onKeyDown={(e) => {
                          const getShortcutString = (ev: any) => {
                            const parts = [];
                            if (ev.ctrlKey || ev.metaKey) parts.push('Ctrl');
                            if (ev.altKey) parts.push('Alt');
                            if (ev.shiftKey) parts.push('Shift');
                            let k = ev.key;
                            if (k === ' ') k = 'Space';
                            if (!['Control', 'Alt', 'Shift', 'Meta'].includes(k)) {
                              parts.push(k.length === 1 ? k.toUpperCase() : k);
                            } else {
                              return "";
                            }
                            return parts.join('+');
                          };
                          const pressed = getShortcutString(e);
                          if (pressed) {
                            e.preventDefault();
                            setShortcuts(prev => ({ ...prev, [action]: pressed }));
                          }
                        }}
                        className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm font-mono text-center text-white focus:outline-none focus:border-primary-500 transition-colors"
                        placeholder="Press keys..."
                      />
                    </div>
                  ))}
                  <div className="pt-4 flex justify-center">
                    <button
                      onClick={() => setShortcuts({
                        toggleConsole: 'Ctrl+`',
                        saveProject: 'Ctrl+S',
                        deleteSelected: 'Delete',
                        selectAll: 'Ctrl+A',
                        tabDashboard: 'Alt+1',
                        tabWorkspace: 'Alt+2',
                        tabLibrary: 'Alt+3',
                        tabPlugins: 'Alt+4',
                        copySelected: 'Ctrl+C',
                        pasteSelected: 'Ctrl+V',
                        undo: 'Ctrl+Z',
                        redo: 'Ctrl+Y'
                      })}
                      className="px-4 py-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-bold rounded-lg transition-colors flex items-center gap-2"
                    >
                      <RotateCcw size={14} /> Reset to Defaults
                    </button>
                  </div>
                </div>
              )}

              {settingsTab === 'system' && (
                <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1 mb-6">
                  {/* Status & Quick Action Card */}
                  <div className={cn(
                    "p-5 rounded-2xl border transition-all space-y-4",
                    updateInfo?.hasUpdate
                      ? "bg-gradient-to-br from-primary-950/40 via-primary-900/20 to-black/40 border-primary-500/40 shadow-xl shadow-primary-900/20"
                      : "bg-white/5 border-white/5"
                  )}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold uppercase tracking-wider text-white/50">Current Version</span>
                          <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-white/10 text-white font-bold">
                            {updateInfo?.currentVersion ? (updateInfo.currentVersion.startsWith('v') || updateInfo.currentVersion.startsWith('V') ? updateInfo.currentVersion : `v${updateInfo.currentVersion}`) : 'v3.0.7'}
                          </span>
                        </div>
                        {updateInfo?.hasUpdate ? (
                          <div className="flex items-center gap-2 pt-1">
                            <span className="flex h-2.5 w-2.5 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary-500"></span>
                            </span>
                            <span className="text-sm font-bold text-primary-300">
                              Update Available: {updateInfo.latestVersion}
                            </span>
                          </div>
                        ) : hasUserCheckedUpdates ? (
                          <div className="flex items-center gap-1.5 pt-1 text-emerald-400 text-xs font-semibold">
                            <CheckCircle size={14} /> SCMUI is up to date
                          </div>
                        ) : (
                          <div className="text-xs text-white/40 pt-1">
                            Click Check Updates to scan GitHub for new releases.
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => checkForUpdates(true, true)}
                          disabled={isCheckingUpdates}
                          className="px-3.5 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
                          title="Check GitHub for newer releases"
                        >
                          <RefreshCw size={13} className={isCheckingUpdates ? "animate-spin" : ""} />
                          {isCheckingUpdates ? 'Checking...' : 'Check Updates'}
                        </button>

                        {updateInfo?.hasUpdate && updateInfo.latestRelease?.primaryAsset && (
                          <button
                            onClick={() => handleStartDownloadVersion(updateInfo.latestRelease!, updateInfo.latestRelease!.primaryAsset!)}
                            disabled={downloadState.isDownloading}
                            className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-primary-600/30 active:scale-95"
                          >
                            <Download size={13} />
                            Update Now
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Active Download Progress Card */}
                    {downloadState.isDownloading && (
                      <div className="p-3.5 bg-black/50 border border-primary-500/30 rounded-xl space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-primary-300 truncate max-w-[200px]">
                            Downloading {downloadState.assetName}...
                          </span>
                          <span className="font-mono text-white/70">
                            {downloadState.progress}%
                          </span>
                        </div>
                        <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-primary-500 h-full rounded-full transition-all duration-300 shadow-sm"
                            style={{ width: `${downloadState.progress}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-white/40 font-mono">
                          <span>{((downloadState.downloadedBytes || 0) / (1024 * 1024)).toFixed(1)} MB</span>
                          <span>{((downloadState.totalBytes || 0) / (1024 * 1024)).toFixed(1)} MB</span>
                        </div>
                      </div>
                    )}

                    {downloadState.status === 'completed' && (
                      <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                            <CheckCircle size={14} /> Download Ready!
                          </p>
                          <p className="text-[10px] text-white/40">
                            {downloadState.assetName} is downloaded.
                          </p>
                        </div>
                        <button
                          onClick={() => handleLaunchInstaller(downloadState.assetName)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/30 active:scale-95 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Play size={12} fill="currentColor" /> Install Now
                        </button>
                      </div>
                    )}

                    {downloadState.status === 'error' && (
                      <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                        <AlertCircle size={14} className="shrink-0" />
                        <span>Download failed: {downloadState.error}</span>
                      </div>
                    )}

                    {updateStatusToast && (
                      <div className="p-2.5 bg-primary-600/20 border border-primary-500/30 rounded-xl text-xs text-primary-200 text-center font-medium">
                        {updateStatusToast}
                      </div>
                    )}

                    {/* Preferences toggles */}
                    <div className="pt-2 border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <label className="flex items-center gap-2.5 cursor-pointer text-white/70 hover:text-white transition-colors">
                        <input
                          type="checkbox"
                          checked={updateSettings.autoCheck}
                          onChange={(e) => handleSaveUpdateSetting('autoCheck', e.target.checked)}
                          className="rounded border-white/20 bg-black/40 text-primary-600 focus:ring-0 cursor-pointer"
                        />
                        <span>Check for updates automatically</span>
                      </label>
                      <label className="flex items-center gap-2.5 cursor-pointer text-white/70 hover:text-white transition-colors">
                        <input
                          type="checkbox"
                          checked={updateSettings.includePrereleases}
                          onChange={(e) => handleSaveUpdateSetting('includePrereleases', e.target.checked)}
                          className="rounded border-white/20 bg-black/40 text-primary-600 focus:ring-0 cursor-pointer"
                        />
                        <span>Include Beta / Pre-releases</span>
                      </label>
                    </div>
                  </div>

                  {/* Pick a Version Accordion (Collapsed by Default) */}
                  <div className="space-y-3 pt-1 border-t border-white/5">
                    <button
                      type="button"
                      onClick={() => setIsVersionPickerOpen(v => !v)}
                      className="w-full flex items-center justify-between p-3.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all cursor-pointer group text-left active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-primary-600/20 text-primary-400 group-hover:scale-105 transition-transform">
                          <Package size={16} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white flex items-center gap-2">
                            Pick Versions / Release History
                          </h4>
                          <p className="text-xs text-white/40">Select and install past releases or roll back</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-white/40 group-hover:text-white transition-colors">
                        <span className="text-[11px] font-mono bg-white/10 px-2 py-0.5 rounded-md text-white/70">
                          {updateInfo?.releases?.length || 0} versions
                        </span>
                        <ChevronDown size={16} className={cn("transition-transform duration-200", isVersionPickerOpen && "rotate-180")} />
                      </div>
                    </button>

                    {isVersionPickerOpen && (
                      <div className="space-y-3 p-1">
                        {/* Filter tabs */}
                        <div className="flex items-center justify-between gap-2 px-1">
                          <span className="text-xs text-white/40">Filter releases:</span>
                          <div className="flex bg-black/40 p-1 border border-white/5 rounded-xl gap-1">
                            <button
                              onClick={() => setVersionFilter('all')}
                              className={cn(
                                "px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg transition-all",
                                versionFilter === 'all' ? "bg-primary-600 text-white" : "text-white/40 hover:text-white"
                              )}
                            >
                              All ({updateInfo?.releases?.length || 0})
                            </button>
                            <button
                              onClick={() => setVersionFilter('stable')}
                              className={cn(
                                "px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg transition-all",
                                versionFilter === 'stable' ? "bg-primary-600 text-white" : "text-white/40 hover:text-white"
                              )}
                            >
                              Stable ({updateInfo?.releases?.filter(r => !r.isPrerelease).length || 0})
                            </button>
                            <button
                              onClick={() => setVersionFilter('beta')}
                              className={cn(
                                "px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg transition-all",
                                versionFilter === 'beta' ? "bg-primary-600 text-white" : "text-white/40 hover:text-white"
                              )}
                            >
                              Beta ({updateInfo?.releases?.filter(r => r.isPrerelease).length || 0})
                            </button>
                          </div>
                        </div>

                        {/* Releases list */}
                        <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
                          {(!updateInfo?.releases || updateInfo.releases.length === 0) ? (
                            <div className="p-8 text-center text-white/30 text-xs border border-white/5 rounded-2xl bg-white/[0.02]">
                              {isCheckingUpdates ? (
                                <div className="flex flex-col items-center gap-2">
                                  <RefreshCw size={20} className="animate-spin text-primary-400" />
                                  <span>Fetching available versions from GitHub...</span>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <p>No versions loaded yet.</p>
                                  <button
                                    onClick={() => checkForUpdates(true, true)}
                                    className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-bold"
                                  >
                                    Fetch Releases
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            updateInfo.releases
                              .filter(r => {
                                if (versionFilter === 'stable') return !r.isPrerelease;
                                if (versionFilter === 'beta') return r.isPrerelease;
                                if (!updateSettings.includePrereleases && r.isPrerelease && !r.isCurrent) return false;
                                return true;
                              })
                              .map(release => {
                                const isExpanded = expandedReleaseNotes.has(release.tag);
                                const isThisDownloading = downloadState.isDownloading && downloadState.tag === release.tag;
                                const isThisDownloaded = downloadState.status === 'completed' && downloadState.tag === release.tag;
                                const asset = release.primaryAsset;

                                return (
                                  <div
                                    key={release.tag}
                                    className={cn(
                                      "p-4 rounded-2xl border transition-all space-y-3",
                                      release.isCurrent
                                        ? "bg-emerald-950/20 border-emerald-500/30"
                                        : release.isNewer
                                          ? "bg-primary-950/20 border-primary-500/30 hover:border-primary-500/50"
                                          : "bg-white/[0.02] border-white/5 hover:border-white/15"
                                    )}
                                  >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                      <div className="space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="font-mono text-sm font-bold text-white">
                                            {release.tag}
                                          </span>
                                          {release.isCurrent && (
                                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-bold uppercase tracking-wider">
                                              Current
                                            </span>
                                          )}
                                          {release.isNewer && (
                                            <span className="px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-300 border border-primary-500/30 text-[9px] font-bold uppercase tracking-wider">
                                              Newer
                                            </span>
                                          )}
                                          {release.isPrerelease ? (
                                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold uppercase tracking-wider">
                                              Beta
                                            </span>
                                          ) : (
                                            <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/70 border border-white/15 text-[9px] font-bold uppercase tracking-wider">
                                              Stable
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-3 text-[11px] text-white/40">
                                          <span>{release.name}</span>
                                          <span>•</span>
                                          <span>{new Date(release.publishedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2 shrink-0">
                                        {release.isCurrent ? (
                                          <span className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-bold flex items-center gap-1.5">
                                            <Check size={12} /> Installed
                                          </span>
                                        ) : isThisDownloaded ? (
                                          <button
                                            onClick={() => handleLaunchInstaller(downloadState.assetName)}
                                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                                          >
                                            <Play size={12} fill="currentColor" /> Install Now
                                          </button>
                                        ) : isThisDownloading ? (
                                          <span className="px-3.5 py-1.5 bg-primary-600/30 text-primary-300 border border-primary-500/30 rounded-xl text-xs font-mono font-bold">
                                            {downloadState.progress}%
                                          </span>
                                        ) : asset ? (
                                          <button
                                            onClick={() => handleStartDownloadVersion(release, asset)}
                                            disabled={downloadState.isDownloading}
                                            className={cn(
                                              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95",
                                              release.isNewer
                                                ? "bg-primary-600 hover:bg-primary-500 text-white shadow-primary-600/20"
                                                : "bg-white/10 hover:bg-white/20 text-white/80 hover:text-white"
                                            )}
                                            title={release.isNewer ? `Update to ${release.tag}` : `Rollback to ${release.tag}`}
                                          >
                                            <Download size={12} />
                                            {release.isNewer ? 'Update' : 'Switch'}
                                          </button>
                                        ) : (
                                          <a
                                            href={release.htmlUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1"
                                          >
                                            View <ExternalLink size={11} />
                                          </a>
                                        )}

                                        <a
                                          href={release.htmlUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="p-1.5 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-xl transition-colors"
                                          title="Open release in browser"
                                        >
                                          <ExternalLink size={13} />
                                        </a>
                                      </div>
                                    </div>

                                    {release.notes && (
                                      <div className="pt-2 border-t border-white/5">
                                        <button
                                          onClick={() => {
                                            const next = new Set(expandedReleaseNotes);
                                            if (next.has(release.tag)) next.delete(release.tag);
                                            else next.add(release.tag);
                                            setExpandedReleaseNotes(next);
                                          }}
                                          className="text-[11px] font-semibold text-primary-400 hover:text-primary-300 flex items-center gap-1 cursor-pointer transition-colors"
                                        >
                                          <ChevronDown size={13} className={cn("transition-transform duration-200", isExpanded && "rotate-180")} />
                                          {isExpanded ? 'Hide Release Notes' : 'View Release Notes'}
                                        </button>

                                        {isExpanded && (
                                          <div className="mt-2.5 p-3.5 bg-black/40 border border-white/5 rounded-xl text-xs text-white/70 space-y-2 overflow-x-auto max-h-48 overflow-y-auto custom-scrollbar leading-relaxed">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                              {release.notes}
                                            </ReactMarkdown>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-4">
                    <div className="space-y-1">
                      <span className="text-sm font-medium text-white block">Mobile App Connection URL</span>
                      <span className="text-xs text-white/40 block leading-relaxed">
                        Enter this URL into your browser to connect to this desktop backend.
                      </span>
                    </div>
                    <div>
                      {tunnelUrl ? (
                        <div className="w-full bg-black/40 border border-emerald-500/30 rounded-lg p-2 text-sm font-mono text-emerald-400 flex items-center justify-between">
                          <span>{tunnelUrl}</span>
                          <button onClick={() => navigator.clipboard.writeText(tunnelUrl)} className="text-emerald-500/50 hover:text-emerald-400 font-bold transition-colors">Copy</button>
                        </div>
                      ) : isTunnelStarting ? (
                        <div className="w-full bg-black/40 border border-white/10 rounded-lg p-3 flex items-center justify-center gap-2">
                          <RefreshCw size={16} className="text-white/40 animate-spin" />
                          <span className="text-xs text-white/50 font-medium">Starting server broadcast...</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setIsTunnelStarting(true);
                            fetch('/api/tunnel/start', { method: 'POST' });
                          }}
                          className="w-full px-4 py-3 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg font-bold transition-all border border-emerald-500/30"
                        >
                          Start Server Broadcast
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-4">
                    <div className="space-y-1">
                      <span className="text-sm font-medium text-white block">Python Path Override</span>
                      <span className="text-xs text-white/40 block leading-relaxed">
                        Specify absolute path to your python executable if it cannot be found in PATH.
                        Leave empty for auto-detection.
                      </span>
                    </div>
                    <div>
                      <input
                        title="Python Executable Path"
                        type="text"
                        value={pythonPath}
                        onChange={(e) => setPythonPath(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm font-mono text-white focus:outline-none focus:border-primary-500 transition-colors"
                        placeholder="C:\Python310\python.exe or /usr/bin/python3"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-4">
                    <div className="space-y-1">
                      <span className="text-sm font-medium text-white block">Environment Recovery</span>
                      <span className="text-xs text-white/40 block leading-relaxed">
                        If Python scripts are missing or failed to install correctly, try running the setup background process again. This will create the virtual environment and install pip dependencies.
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setShowThemeSettings(false);
                        startPythonSetup();
                      }}
                      className="px-6 py-2.5 bg-primary-500/20 hover:bg-primary-500/30 text-primary-300 rounded-xl font-bold transition-all border border-primary-500/30 flex items-center gap-2"
                    >
                      <RefreshCw size={16} /> Re-run Setup Process
                    </button>
                  </div>

                  <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-4">
                    <div className="space-y-1">
                      <span className="text-sm font-medium text-white block">Application Cache</span>
                      <span className="text-xs text-white/40 block leading-relaxed">
                        Clear temporary image renders, upload buffers, and cached card previews to free up disk space and force reload fresh assets.
                      </span>
                    </div>
                    <button
                      onClick={handleClearCache}
                      disabled={clearCacheStatus === 'clearing'}
                      className={cn(
                        "px-6 py-2.5 rounded-xl font-bold transition-all border flex items-center gap-2 text-sm",
                        clearCacheStatus === 'clearing' && "bg-white/10 text-white/50 border-white/10 cursor-not-allowed",
                        clearCacheStatus === 'success' && "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
                        clearCacheStatus === 'error' && "bg-rose-500/20 text-rose-300 border-rose-500/30",
                        clearCacheStatus === 'idle' && "bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/20 hover:border-rose-500/40"
                      )}
                    >
                      {clearCacheStatus === 'clearing' ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" /> Clearing Cache...
                        </>
                      ) : clearCacheStatus === 'success' ? (
                        <>
                          <Check size={16} /> Cache Cleared!
                        </>
                      ) : clearCacheStatus === 'error' ? (
                        <>
                          <AlertCircle size={16} /> Failed to Clear
                        </>
                      ) : (
                        <>
                          <Trash2 size={16} /> Clear Cache
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-2.5 shrink-0">
                <button
                  onClick={handleClearCache}
                  disabled={clearCacheStatus === 'clearing'}
                  title="Clear temporary image cache and render buffers"
                  className={cn(
                    "px-4 py-4 rounded-2xl font-bold transition-all border flex items-center justify-center gap-2 text-xs",
                    clearCacheStatus === 'clearing' && "bg-white/10 text-white/50 border-white/10 cursor-not-allowed",
                    clearCacheStatus === 'success' && "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
                    clearCacheStatus === 'error' && "bg-rose-500/20 text-rose-300 border-rose-500/30",
                    clearCacheStatus === 'idle' && "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border-white/10"
                  )}
                >
                  {clearCacheStatus === 'clearing' ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" /> Clearing...
                    </>
                  ) : clearCacheStatus === 'success' ? (
                    <>
                      <Check size={14} /> Cleared!
                    </>
                  ) : (
                    <>
                      <Trash2 size={14} /> Clear Cache
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowThemeSettings(false)}
                  className="flex-1 py-4 text-white bg-white/5 hover:bg-white/10 transition-all font-bold rounded-2xl"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>



      <AnimatePresence>
        {showPluginReadmeModal && pluginReadme && (
          <div className="fixed inset-0 z-[250] flex flex-col items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-4xl max-h-full bg-[#0f0f13] border border-white/10 rounded-3xl flex flex-col overflow-hidden shadow-2xl"
            >
              <div className="flex items-center justify-between p-6 border-b border-white/5 bg-[#1a1a20]">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Book className="text-primary-400" size={24} />
                  Readme: {pluginReadme.name}
                </h3>
                <button
                  onClick={() => setShowPluginReadmeModal(false)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all shadow border border-white/5"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 md:p-8 overflow-y-auto flex-1 custom-scrollbar markdown-body relative bg-[#0f0f13]">
                <div className="max-w-none text-white/80 prose prose-invert prose-pre:bg-[#1a1a20] prose-pre:border prose-pre:border-white/10">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {pluginReadme.content}
                  </ReactMarkdown>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
      </AnimatePresence>

      <ErrorBoundary>
        <AnimatePresence>
          {contextMenu && (() => {
            const identity = contextMenu.type ? `${contextMenu.type}:${contextMenu.name}` : contextMenu.name;
            const isMultiSelected = selectedAssets.size > 1 && selectedAssets.has(identity);
            const targets = selectedAssets.size > 0 && selectedAssets.has(identity) ? Array.from(selectedAssets) : [identity];
            const targetCards = targets.map(target => {
              const [itemType, itemName] = target.includes(':') ? target.split(':') : [(contextMenu.type || 'front'), target];
              return { name: itemName, type: itemType as 'front' | 'back' | 'double_sided' };
            });
            const modelLabel = getModelShortName(upscaleConfig.model);
            const multiplier = upscaleConfig.scaleFactor;
            const itemBaseCls = "w-full h-8.5 px-2.5 rounded-lg flex items-center gap-2.5 transition-all active:scale-[0.98] text-xs font-medium cursor-pointer";
            const submenuOpensLeft = typeof window !== 'undefined' && (contextMenu.x + 275 + 245 > window.innerWidth);

            return (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                transition={{ duration: 0.12 }}
                style={{
                  top: typeof window !== 'undefined' ? Math.max(10, Math.min(window.innerHeight - 520, contextMenu.y)) : 0,
                  left: typeof window !== 'undefined' ? Math.max(10, Math.min(window.innerWidth - 275, contextMenu.x)) : 0,
                }}
                className="fixed z-[100] pointer-events-auto flex flex-col items-stretch p-1.5 bg-[#14151b]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_24px_50px_-10px_rgba(0,0,0,0.7)] w-64 max-w-[275px] select-none"
              >
                {/* Card Title Header */}
                <div className="px-2.5 py-1.5 border-b border-white/5 mb-1 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-white/90 truncate block max-w-[190px]" title={contextMenu.name}>
                    {contextMenu.name}
                  </span>
                  <span className="text-[9px] font-mono uppercase tracking-wider text-white/35 px-1.5 py-0.5 rounded bg-white/5">
                    {contextMenu.type === 'double_sided' ? 'Double' : contextMenu.type === 'back' ? 'Back' : 'Front'}
                  </span>
                </div>

                {/* 1. Upscayl AI Section (At Top) */}
                <div className="space-y-0.5">
                  <div className="px-2.5 pt-1 pb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-primary-400">
                    <span className="flex items-center gap-1.5">
                      <Sparkles size={11} className="text-primary-400" />
                      <span>Upscayl AI</span>
                    </span>
                    <span className="font-mono text-[9px] text-primary-400/75 lowercase bg-primary-500/10 px-1.5 py-0.5 rounded border border-primary-500/20">
                      {modelLabel} • {multiplier}x
                    </span>
                  </div>

                  {/* Single Upscale */}
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      setContextMenu(null);
                      setIsCardArtSubmenuOpen(false);
                      await handleUpscale([identity], false);
                    }}
                    className={cn(itemBaseCls, "text-primary-300 hover:text-white hover:bg-primary-500/20 group")}
                    title={`Upscayl ${contextMenu.name} using ${modelLabel} at ${multiplier}x HD`}
                  >
                    <Maximize2 size={14} className="text-primary-400 group-hover:text-primary-300 shrink-0" />
                    <span className="truncate">Upscayl Card ({modelLabel}, {multiplier}x)</span>
                  </button>

                  {/* Batch Upscale Selected */}
                  {isMultiSelected && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        setContextMenu(null);
                        setIsCardArtSubmenuOpen(false);
                        await handleUpscale(targets, false);
                      }}
                      className={cn(itemBaseCls, "text-primary-300 hover:text-white hover:bg-primary-500/20 group")}
                      title={`Batch upscayl all ${targets.length} selected cards using ${modelLabel} at ${multiplier}x HD`}
                    >
                      <Layers size={14} className="text-primary-400 group-hover:text-primary-300 shrink-0" />
                      <span className="truncate">Batch Upscayl ({targets.length} Cards) ({modelLabel}, {multiplier}x)</span>
                    </button>
                  )}
                </div>

                {/* 2. Card Art Section */}
                <div className="h-[1px] w-full bg-white/5 my-1" />
                <div className="space-y-0.5">
                  {/* CARD ART Hover Submenu */}
                  <div
                    className="relative group/art"
                    onMouseEnter={() => setIsCardArtSubmenuOpen(true)}
                    onMouseLeave={() => setIsCardArtSubmenuOpen(false)}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsCardArtSubmenuOpen(prev => !prev);
                      }}
                      className={cn(
                        itemBaseCls,
                        "justify-between text-white/90 hover:text-white group-hover/art:bg-white/10 group-hover/art:text-white group",
                        isCardArtSubmenuOpen && "bg-white/10 text-white"
                      )}
                      title="Card Art options"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <ImageIcon size={14} className="text-primary-400 group-hover:text-primary-300 shrink-0" />
                        <span className="truncate font-semibold tracking-wide">Card Art</span>
                      </div>
                      <ChevronRight size={13} className="text-white/40 group-hover:text-white group-hover/art:text-white shrink-0 transition-transform group-hover/art:translate-x-0.5" />
                    </button>

                    {/* Flyout Submenu */}
                    <div
                      className={cn(
                        "absolute top-0 w-60 p-1.5 bg-[#14151b]/98 backdrop-blur-2xl border border-white/15 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] z-[120] flex-col gap-0.5 text-white select-none",
                        submenuOpensLeft 
                          ? "right-full mr-1.5 before:content-[''] before:absolute before:inset-y-0 before:-right-2 before:w-3" 
                          : "left-full ml-1.5 before:content-[''] before:absolute before:inset-y-0 before:-left-2 before:w-3",
                        isCardArtSubmenuOpen ? "flex" : "hidden group-hover/art:flex"
                      )}
                    >
                      {/* Set Art (Card Ingestion) */}
                      {pluginSupportsCardIngestion(pluginState.selectedPlugin?.id) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openArtPickerForCard(
                              contextMenu.name,
                              (contextMenu.type as any) || 'front',
                              'front',
                              undefined,
                              isMultiSelected ? targetCards : undefined
                            );
                            setContextMenu(null);
                            setIsCardArtSubmenuOpen(false);
                          }}
                          className={cn(itemBaseCls, "text-white/85 hover:text-white hover:bg-white/10 group")}
                          title={isMultiSelected ? `Search and set front card artwork for all ${targets.length} selected cards via card ingestion` : "Search and set front card artwork via card ingestion"}
                        >
                          <ImageIcon size={14} className="text-primary-400 group-hover:text-primary-300 shrink-0" />
                          <span className="truncate font-medium">Set Art (Card Ingestion){isMultiSelected ? ` (${targets.length})` : ''}</span>
                        </button>
                      )}

                      {/* Set Art (Manual Upload) */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleManualFrontUploadTrigger(
                            contextMenu.name,
                            (contextMenu.type as any) || 'front',
                            isMultiSelected ? targetCards : undefined
                          );
                          setContextMenu(null);
                          setIsCardArtSubmenuOpen(false);
                        }}
                        className={cn(itemBaseCls, "text-white/85 hover:text-white hover:bg-white/10 group")}
                        title={isMultiSelected ? `Upload front artwork file to apply to all ${targets.length} selected cards` : "Upload front artwork file from your computer"}
                      >
                        <Upload size={14} className="text-white/40 group-hover:text-white shrink-0" />
                        <span className="truncate font-medium">Set Art (Manual Upload){isMultiSelected ? ` (${targets.length})` : ''}</span>
                      </button>

                      {/* Set Back (Card Ingestion) */}
                      {pluginSupportsCardIngestion(pluginState.selectedPlugin?.id) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const backTargetMode = contextMenu.type === 'back' ? 'back' : 'double_sided';
                            const backType = contextMenu.type === 'back' ? 'back' : ((contextMenu.type as any) || 'front');
                            openArtPickerForCard(
                              contextMenu.name,
                              backType,
                              backTargetMode,
                              undefined,
                              isMultiSelected ? targetCards : undefined
                            );
                            setContextMenu(null);
                            setIsCardArtSubmenuOpen(false);
                          }}
                          className={cn(itemBaseCls, "text-white/85 hover:text-white hover:bg-white/10 group")}
                          title={isMultiSelected ? `Search and set card back pattern for all ${targets.length} selected cards via card ingestion` : "Search and set card back pattern via card ingestion"}
                        >
                          <Layers size={14} className="text-primary-400 group-hover:text-primary-300 shrink-0" />
                          <span className="truncate font-medium">Set Back (Card Ingestion){isMultiSelected ? ` (${targets.length})` : ''}</span>
                        </button>
                      )}

                      {/* Set Back (Manual Upload) */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const backType = contextMenu.type === 'back' ? 'back' : 'double_sided';
                          handleManualCardUploadTrigger(
                            contextMenu.name,
                            backType,
                            isMultiSelected ? targetCards : undefined
                          );
                          setContextMenu(null);
                          setIsCardArtSubmenuOpen(false);
                        }}
                        className={cn(itemBaseCls, "text-white/85 hover:text-white hover:bg-white/10 group")}
                        title={isMultiSelected ? `Upload card back pattern to apply to all ${targets.length} selected cards` : "Upload card back pattern from your computer"}
                      >
                        <Upload size={14} className="text-white/40 group-hover:text-white shrink-0" />
                        <span className="truncate font-medium">Set Back (Manual Upload){isMultiSelected ? ` (${targets.length})` : ''}</span>
                      </button>

                    </div>
                  </div>
                </div>

                {/* 3. Actions Section */}
                <div className="h-[1px] w-full bg-white/5 my-1" />
                <div className="space-y-0.5">
                  {/* Move Section */}
                  {assetViewMode !== 'plugins' && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        setContextMenu(null);
                        setIsCardArtSubmenuOpen(false);
                        const targetSection = contextMenu.type === 'back' ? 'front' : 'back';
                        setTaskProgress({ current: 0, total: targets.length, message: `Moving to ${targetSection}s section...` });
                        try {
                          const res = await fetch('/api/card/move-section', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ identities: targets, targetSection, assetViewMode })
                          });
                          const data = await res.json();
                          if (data.success) {
                            addLog(`[Action: Move] Moved ${data.moved?.length || targets.length} card(s) to ${targetSection} section.`);
                            setTaskProgress({ current: targets.length, total: targets.length, message: `Moved to ${targetSection}s!` });
                            await fetchStatus();
                            setSelectedAssets(new Set());
                          }
                        } catch (err: any) {
                          addLog(`[Error] Failed to move card(s): ${err}`);
                          setTaskProgress({ current: 0, total: 1, message: 'Move failed.' });
                        }
                        setTimeout(() => setTaskProgress(null), 1500);
                      }}
                      className={cn(itemBaseCls, "text-white/80 hover:text-white hover:bg-white/10 group")}
                      title={contextMenu.type === 'back' ? "Move this back pattern into the Front Face cards section" : "Move this card into the Back Patterns section"}
                    >
                      {contextMenu.type === 'back' ? (
                        <FolderOutput size={14} className="text-white/40 group-hover:text-white shrink-0" />
                      ) : (
                        <FolderInput size={14} className="text-white/40 group-hover:text-white shrink-0" />
                      )}
                      <span className="truncate">
                        {isMultiSelected 
                          ? `Move ${targets.length} to ${contextMenu.type === 'back' ? 'Fronts' : 'Backs'}` 
                          : `Move to ${contextMenu.type === 'back' ? 'Fronts' : 'Backs'}`}
                      </span>
                    </button>
                  )}
                  {/* Download Image or ZIP */}
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      setContextMenu(null);
                      const basePath = assetViewMode === 'library' ? '/library' : assetViewMode === 'plugins' ? '/plugins_staging' : '/game';
                      if (targets.length <= 1) {
                        const target = targets[0];
                        const [t, n] = target.includes(':') ? target.split(':') : [contextMenu.type || 'front', target];
                        const url = `${basePath}/${t}/${encodeURIComponent(n)}`;
                        await downloadFile(url, n);
                      } else {
                        setTaskProgress({ current: 0, total: targets.length, message: `Archiving ${targets.length} cards into ZIP...` });
                        try {
                          const res = await fetch('/api/cards/download-zip', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Accept': 'text/event-stream'
                            },
                            body: JSON.stringify({ identities: targets, assetViewMode, stream: true })
                          });
                          if (!res.ok) throw new Error(`Server returned status ${res.status}`);

                          let downloadUrl = '';
                          const reader = res.body?.getReader();
                          const decoder = new TextDecoder();
                          let pending = "";

                          if (reader) {
                            while (true) {
                              const { done, value } = await reader.read();
                              if (done) break;

                              pending += decoder.decode(value, { stream: true });
                              const parts = pending.split('\n\n');
                              pending = parts.pop() || '';

                              for (const part of parts) {
                                const lines = part.split('\n');
                                let eventType = '';
                                let eventData: any = null;
                                for (const line of lines) {
                                  if (line.startsWith('event: ')) {
                                    eventType = line.substring(7).trim();
                                  } else if (line.startsWith('data: ')) {
                                    try { eventData = JSON.parse(line.substring(6)); } catch (_) { }
                                  }
                                }

                                if (eventType === 'progress' && eventData) {
                                  setTaskProgress({
                                    current: eventData.current,
                                    total: eventData.total || targets.length,
                                    message: eventData.message || `Archiving card ${eventData.current} of ${targets.length}...`
                                  });
                                } else if (eventType === 'done' && eventData) {
                                  downloadUrl = eventData.downloadUrl;
                                } else if (eventType === 'error' && eventData) {
                                  throw new Error(eventData.error || eventData.message || 'Failed to create ZIP');
                                }
                              }
                            }
                          }

                          if (downloadUrl) {
                            setTaskProgress({ current: targets.length, total: targets.length, message: `Downloading ZIP archive...` });
                            const a = document.createElement('a');
                            a.href = downloadUrl;
                            a.download = `SCMUI_Cards_${targets.length}_Images.zip`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            addLog(`[System] Downloaded ${targets.length} cards as a single ZIP archive.`);
                            setTaskProgress({ current: targets.length, total: targets.length, message: `Downloaded ${targets.length} cards ZIP!` });
                          } else {
                            throw new Error('Failed to obtain download URL from server');
                          }
                        } catch (err: any) {
                          addLog(`[Error] Failed to download ZIP: ${err.message}`);
                          setTaskProgress({ current: 0, total: targets.length, message: `ZIP failed: ${err.message}` });
                        } finally {
                          setTimeout(() => setTaskProgress(null), 2500);
                        }
                      }
                    }}
                    className={cn(itemBaseCls, "text-white/80 hover:text-white hover:bg-white/10 group")}
                    title={isMultiSelected ? "Download all selected cards packed into a single ZIP file" : "Download card image directly to your computer"}
                  >
                    <Download size={14} className="text-white/40 group-hover:text-white shrink-0" />
                    <span className="truncate">
                      {isMultiSelected ? `Download ZIP (${targets.length} Images)` : 'Download Image'}
                    </span>
                  </button>

                  {/* Duplicate */}
                  {(!contextMenu.type || contextMenu.type !== 'back') && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        let allResults: any[] = [];
                        for (let i = 0; i < targets.length; i++) {
                          setTaskProgress({ current: i + 1, total: targets.length, message: `Duplicating ${targets[i].split(':')[1] || targets[i]}...` });
                          try {
                            const res = await fetch('/api/duplicate', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ identity: targets[i], assetViewMode })
                            });
                            const data = await res.json();
                            if (data.newName) {
                              addLog(`[Action: Duplicate] ${targets[i]} -> ${data.newName} (Success)`);
                              allResults.push(`${targets[i].split(':')[0]}:${data.newName}`);
                            }
                          } catch (err) {
                            addLog(`[Error] Failed to duplicate: ${err}`);
                          }
                        }
                        if (allResults.length > 0) {
                          setFileUndoStack(prev => [...prev, { action: 'duplicate', items: allResults, assetViewMode }]);
                        }
                        setTaskProgress({ current: targets.length, total: targets.length, message: `${targets.length} card${targets.length === 1 ? '' : 's'} duplicated` });
                        await fetchStatus();
                        setTimeout(() => setTaskProgress(null), 1500);
                        setContextMenu(null);
                      }}
                      className={cn(itemBaseCls, "text-white/80 hover:text-white hover:bg-white/10 group")}
                    >
                      <Copy size={14} className="text-white/40 group-hover:text-white shrink-0" />
                      <span className="truncate">Duplicate</span>
                    </button>
                  )}

                  {/* Transfer to Project / Library */}
                  {assetViewMode === 'library' && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        setContextMenu(null);
                        await performMoveOrCopy(targets, 'project', 'library');
                      }}
                      className={cn(itemBaseCls, "text-white/80 hover:text-white hover:bg-white/10 group")}
                    >
                      <PlusCircle size={14} className="text-white/40 group-hover:text-white shrink-0" />
                      <span className="truncate">Add to Project</span>
                    </button>
                  )}

                  {assetViewMode === 'project' && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        setContextMenu(null);
                        await performMoveOrCopy(targets, 'library', 'project');
                      }}
                      className={cn(itemBaseCls, "text-white/80 hover:text-white hover:bg-white/10 group")}
                    >
                      <Book size={14} className="text-white/40 group-hover:text-white shrink-0" />
                      <span className="truncate">Add to Library</span>
                    </button>
                  )}

                  {assetViewMode === 'plugins' && (
                    <>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          setContextMenu(null);
                          await performMoveOrCopy(targets, 'project', 'plugins');
                        }}
                        className={cn(itemBaseCls, "text-white/80 hover:text-white hover:bg-white/10 group")}
                      >
                        <PlusCircle size={14} className="text-white/40 group-hover:text-white shrink-0" />
                        <span className="truncate">Add to Project</span>
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          setContextMenu(null);
                          await performMoveOrCopy(targets, 'library', 'plugins');
                        }}
                        className={cn(itemBaseCls, "text-white/80 hover:text-white hover:bg-white/10 group")}
                      >
                        <Book size={14} className="text-white/40 group-hover:text-white shrink-0" />
                        <span className="truncate">Add to Library</span>
                      </button>
                    </>
                  )}

                  {/* Select All */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const currentAssets = getCurrentAssets();
                      const toSelect = new Set<string>();
                      if (currentAssets?.fronts) {
                        currentAssets.fronts.forEach(f => toSelect.add(`front:${f}`));
                      }
                      if (currentAssets?.backs) {
                        currentAssets.backs.forEach(b => toSelect.add(`back:${b}`));
                      }
                      if (currentAssets?.double_sided) {
                        currentAssets.double_sided.forEach(d => toSelect.add(`double_sided:${d}`));
                      }
                      setSelectedAssets(toSelect);
                      setContextMenu(null);
                      addLog(`[System] Selected all ${toSelect.size} ${assetViewMode} assets.`);
                    }}
                    className={cn(itemBaseCls, "text-white/80 hover:text-white hover:bg-white/10 group")}
                  >
                    <CheckSquare size={14} className="text-white/40 group-hover:text-white shrink-0" />
                    <span className="truncate">Select All</span>
                  </button>
                </div>

                {/* 4. Danger Section */}
                <div className="h-[1px] w-full bg-white/5 my-1" />
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    let allResults: any[] = [];
                    for (let i = 0; i < targets.length; i++) {
                      setTaskProgress({ current: i + 1, total: targets.length, message: `Deleting ${targets[i].split(':')[1] || targets[i]}...` });
                      try {
                        const res = await fetch('/api/delete', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ identity: [targets[i]], assetViewMode })
                        });
                        const data = await res.json();
                        if (data.results) {
                          data.results.forEach((r: any) => addLog(`[Action: Delete] ${r.from} (Success)`));
                          allResults = allResults.concat(data.results);
                        }
                      } catch (err) {
                        addLog(`[Error] Failed to delete: ${err}`);
                      }
                    }
                    if (allResults.length > 0) {
                      setFileUndoStack(prev => [...prev, { action: 'delete', items: allResults, assetViewMode }]);
                    }

                    setTaskProgress({ current: targets.length, total: targets.length, message: `${targets.length} card${targets.length === 1 ? '' : 's'} deleted` });
                    await fetchStatus();
                    setTimeout(() => setTaskProgress(null), 1500);
                    setContextMenu(null);
                    setSelectedAssets(new Set());
                  }}
                  className={cn(itemBaseCls, "text-rose-400 hover:text-rose-200 hover:bg-rose-500/15 group")}
                >
                  <Trash2 size={14} className="text-rose-400/50 group-hover:text-rose-400 shrink-0" />
                  <span className="truncate">
                    {isMultiSelected ? `Delete (${targets.length})` : 'Delete'}
                  </span>
                </button>
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </ErrorBoundary>
      <input
        type="file"
        ref={manualFrontUploadInputRef}
        className="hidden"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        onChange={handleManualFrontUploadChange}
      />
      {activeTab === 'assets' && (assetViewMode === 'library' || assetViewMode === 'plugins') && selectedAssets.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 md:bottom-6 md:left-auto md:right-6 md:translate-x-0 w-[90%] md:w-auto z-[100] flex justify-center gap-3 pointer-events-none"
        >
          {assetViewMode === 'plugins' && (
            <button
              onClick={() => uploadToLibrary()}
              className="pointer-events-auto flex items-center gap-2 px-4 py-3 md:px-6 md:py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs md:text-sm font-bold transition-all shadow-xl shadow-primary-600/30 active:scale-95 flex-1 md:flex-none justify-center"
            >
              <Book size={16} />
              Add to Library ({selectedAssets.size})
            </button>
          )}
          <button
            onClick={() => uploadToProject()}
            className="pointer-events-auto flex items-center gap-2 px-4 py-3 md:px-6 md:py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs md:text-sm font-bold transition-all shadow-xl shadow-primary-600/30 active:scale-95 flex-1 md:flex-none justify-center"
          >
            <Download size={16} />
            Add to Project ({selectedAssets.size})
          </button>
        </motion.div>
      )}

      <AnimatePresence>
        {enlargedImage && (
          <ErrorBoundary>
            <LightboxGallery
              initialImage={enlargedImage}
              onClose={() => setEnlargedImage(null)}
              disableUpscale={isArtPickerOpen || Boolean(enlargedImage?.startsWith('http') || enlargedImage?.startsWith('data:') || enlargedImage?.startsWith('blob:'))}
              onUpscaleSingle={(!isArtPickerOpen && !enlargedImage?.startsWith('http') && !enlargedImage?.startsWith('data:') && !enlargedImage?.startsWith('blob:')) ? async (src: string) => {
                try {
                  const cleanUrl = src.split('?')[0].split('#')[0];
                  const decoded = decodeURIComponent(cleanUrl);
                  let type = 'front';
                  if (decoded.includes('/back/')) type = 'back';
                  else if (decoded.includes('/double_sided/')) type = 'double_sided';
                  const filename = decoded.split('/').pop() || '';
                  if (filename) {
                    await handleUpscale([`${type}:${filename}`], false);
                  }
                } catch (e) {
                  console.error('Failed single card upscale:', e);
                }
              } : undefined}
            />
          </ErrorBoundary>
        )}
      </AnimatePresence>

      {/* Bottom Nav on Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0f0f13] border-t border-white/5 flex items-center justify-around z-40 px-4">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={cn("flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-colors", activeTab === 'dashboard' ? "text-primary-500" : "text-white/40")}
        >
          <Settings size={20} />
          <span className="text-[9px] font-medium font-sans">Dashboard</span>
        </button>
        <button
          onClick={() => setActiveTab('builder')}
          className={cn("flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-colors", activeTab === 'builder' ? "text-primary-500" : "text-white/40")}
        >
          <Layers size={20} />
          <span className="text-[9px] font-medium font-sans">PDF Builder</span>
        </button>
        <button
          onClick={() => {
            setActiveTab('assets');
            setAssetViewMode('library');
            setSelectedAssets(new Set());
          }}
          className={cn("flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-colors", activeTab === 'assets' ? "text-primary-500" : "text-white/40")}
        >
          <ImageIcon size={20} />
          <span className="text-[9px] font-medium font-sans">Assets</span>
        </button>
        <button
          onClick={() => setActiveTab('console')}
          className={cn("flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-colors", activeTab === 'console' ? "text-primary-500" : "text-white/40")}
        >
          <Terminal size={20} />
          <span className="text-[9px] font-medium font-sans">Console</span>
        </button>
      </nav>

      <PresetManager
        category="pdf"
        currentData={cmdOptions}
        isOpen={isPdfPresetsOpen}
        onClose={() => setIsPdfPresetsOpen(false)}
        onLoad={(d) => setCmdOptions(prev => ({ ...prev, ...d }))}
        setGlobalTaskProgress={setTaskProgress}
      />
      <PresetManager
        category="offset"
        currentData={calibration}
        isOpen={isOffsetPresetsOpen}
        onClose={() => setIsOffsetPresetsOpen(false)}
        onLoad={(d) => setCalibration(prev => ({ ...prev, ...d }))}
        setGlobalTaskProgress={setTaskProgress}
      />
      <PresetManager
        category="plugin"
        currentData={{ decklist: pluginState.decklist, format: pluginState.format, options: pluginState.options, selectedPluginId: pluginState.selectedPlugin.id }}
        isOpen={isPluginPresetsOpen}
        onClose={() => setIsPluginPresetsOpen(false)}
        onLoad={(d) => {
          let selectedPlugin = pluginState.selectedPlugin;
          if (d.selectedPluginId) {
            const found = PLUGINS.find(p => p.id === d.selectedPluginId);
            if (found) selectedPlugin = found;
          }
          setPluginState(prev => ({ ...prev, ...d, selectedPlugin }));
        }}
        setGlobalTaskProgress={setTaskProgress}
      />
      <ProjectManager
        isOpen={isProjectPresetsOpen}
        onClose={() => setIsProjectPresetsOpen(false)}
        status={status}
        saveProject={async (name) => {
          try {
            const res = await fetch('/api/project/save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name })
            });
            const data = await res.json();
            if (data.success) {
              addLog(`[Project] Success: ${data.message}`);
              setLoadedProject(name);
              await fetchStatus();
            }
          } catch (err) {
            addLog(`[Error] Save failed: ${err}`);
          }
        }}
        loadProject={async (name) => {
          try {
            const res = await fetch('/api/project/load', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name })
            });
            const data = await res.json();
            if (data.success) {
              addLog(`[Project] Success: Loaded '${name}'`);
              setLoadedProject(name);
              await fetchStatus();
            }
          } catch (err) {
            addLog(`[Error] Load failed: ${err}`);
          }
        }}
        deleteProject={deleteProject}
        renameProject={renameProject}
        triggerImport={() => importProjectRef.current?.click()}
      />

      {/* Proxxied-Style Artwork & Cardbacks Selector Modal */}
      <AnimatePresence>
        {isArtPickerOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#12131a] border border-white/10 rounded-3xl w-[95vw] max-w-[1600px] max-h-[95vh] flex flex-col shadow-2xl overflow-hidden text-left"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary-600/20 text-primary-400 flex items-center justify-center border border-primary-500/30 shadow-inner">
                    <ImageIcon size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-white">
                        {artTargetCard?.targetMode === 'double_sided'
                          ? `Set Back for: ${cleanCardName(artTargetCard.name)}`
                          : isBacksOnlyModal
                            ? "Add Card Backing"
                            : "Select Cards"}
                      </h3>
                      {artTargetCard && (
                        <span className="px-2 py-0.5 rounded-full bg-primary-600/30 text-primary-300 text-[10px] font-mono border border-primary-500/30">
                          {artTargetCard.targets && artTargetCard.targets.length > 1
                            ? `${artTargetCard.targets.length} Cards Selected (${artTargetCard.targetMode === 'double_sided' ? 'Set Back' : artTargetCard.type})`
                            : `${artTargetCard.name} (${artTargetCard.targetMode === 'double_sided' ? 'Set Back' : artTargetCard.type})`}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/50">
                      {artTargetCard?.targetMode === 'double_sided'
                        ? `Choose any card (e.g. Sol Ring, token) or back pattern to assign as the reverse face of ${cleanCardName(artTargetCard.name)}.`
                        : isBacksOnlyModal
                          ? "Search and add high-resolution card back patterns from MPC or Scryfall into your workspace."
                          : "Browse alternative prints, showcase frames, and custom art (Proxxied style) with DPI sorting."}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {artSourceTab === 'mpcfill' ? (
                    <a href="https://mpcfill.com" target="_blank" rel="noopener noreferrer" className="p-2 text-white/40 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer" title="Open MPCFill.com">
                      <ExternalLink size={16} />
                    </a>
                  ) : (
                    <a href="https://scryfall.com" target="_blank" rel="noopener noreferrer" className="p-2 text-white/40 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer" title="Open Scryfall.com">
                      <ExternalLink size={16} />
                    </a>
                  )}
                  <button
                    onClick={() => setIsArtPickerOpen(false)}
                    className="p-2 text-white/40 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Source Tabs & Search Bar (Visible in ALL modes including Add Back and Set Back) */}
              <div className="p-5 border-b border-white/10 bg-white/[0.01] space-y-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  {/* Category toggle if in Set Back mode (Fronts vs Backs) */}
                  {artTargetCard?.targetMode === 'double_sided' ? (
                    <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSetBackSearchCategory('cards');
                          setIsBacksOnlyModal(false);
                          if (artQuery) handleSearchArt(artQuery, undefined, artSourceTab);
                        }}
                        className={cn(
                          "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                          setBackSearchCategory === 'cards' ? "bg-primary-600 text-white shadow-lg" : "text-white/50 hover:text-white"
                        )}
                      >
                        <Layers size={13} /> Search Cards
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSetBackSearchCategory('backs');
                          setIsBacksOnlyModal(true);
                          handleSearchArt(artQuery, undefined, 'mpcfill');
                        }}
                        className={cn(
                          "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                          setBackSearchCategory === 'backs' ? "bg-primary-600 text-white shadow-lg" : "text-white/50 hover:text-white"
                        )}
                      >
                        <ImageIcon size={13} /> Search Backs
                      </button>
                    </div>
                  ) : (
                    /* Provider Tabs */
                    <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 gap-1">
                      {pluginState.selectedPlugin?.id === 'mtg' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setArtSourceTab('scryfall');
                              handleSearchArt(artQuery || (isBacksOnlyModal ? 'Cardback' : 'Sol Ring'), undefined, 'scryfall');
                            }}
                            className={cn(
                              "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer",
                              artSourceTab === 'scryfall' ? "bg-primary-600 text-white shadow-lg shadow-primary-600/30" : "text-white/50 hover:text-white"
                            )}
                          >
                            Scryfall
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setArtSourceTab('mpcfill');
                              handleSearchArt(artQuery || (isBacksOnlyModal ? 'Cardback' : 'Sol Ring'), undefined, 'mpcfill');
                            }}
                            className={cn(
                              "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer",
                              artSourceTab === 'mpcfill' ? "bg-primary-600 text-white shadow-lg shadow-primary-600/30" : "text-white/50 hover:text-white"
                            )}
                          >
                            MPC
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            const isOneProxy = pluginState.selectedPlugin?.id === 'one_piece' && pluginState.format === 'oneproxy';
                            const provKey = pluginState.selectedPlugin?.id === 'pokemon' ? 'limitless' : (isOneProxy ? 'oneproxy' : (pluginState.selectedPlugin?.id || 'pokemon'));
                            setArtSourceTab(provKey);
                            handleSearchArt(artQuery || getPluginCardProvider(provKey, pluginState.format).defaultQuery, undefined, provKey);
                          }}
                          className={cn(
                            "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer",
                            "bg-primary-600 text-white shadow-lg shadow-primary-600/30"
                          )}
                        >
                          {getPluginCardProvider(pluginState.selectedPlugin?.id === 'one_piece' && pluginState.format === 'oneproxy' ? 'oneproxy' : pluginState.selectedPlugin?.id, pluginState.format).tabLabel}
                        </button>
                      )}
                    </div>
                  )}

                  {artTargetCard && (
                    <span className="text-xs text-white/40 font-mono">
                      Target: <span className="text-primary-300 font-bold">{artTargetCard.targets && artTargetCard.targets.length > 1 ? `${artTargetCard.targets.length} Selected Cards` : artTargetCard.name}</span>
                    </span>
                  )}
                </div>

                {/* Unified Search Input */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSearchArt(artQuery);
                  }}
                  className="flex gap-3"
                >
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                    <input
                      type="text"
                      value={artQuery}
                      onChange={(e) => setArtQuery(e.target.value)}
                      placeholder={
                        isBacksOnlyModal 
                          ? "Search back patterns (e.g. Lotus, Retro, Japanese, Dark, Classic)..." 
                          : (artSourceTab === 'oneproxy'
                              ? "Search local OneProxy card assets (e.g. OP01-001 or card name)..."
                              : `Search ${getPluginCardProvider(pluginState.selectedPlugin?.id === 'one_piece' && pluginState.format === 'oneproxy' ? 'oneproxy' : pluginState.selectedPlugin?.id, pluginState.format).providerName} cards...`)
                      }
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary-500"
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSearchingArt}
                    className="px-6 py-2.5 bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-lg shadow-primary-600/25"
                  >
                    {isSearchingArt ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                    Search
                  </button>
                </form>

                {/* Filters Toolbar with DPI Sorting */}
                {artSourceTab === 'scryfall' && !isBacksOnlyModal ? (
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-1">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-white/40 block">Frame Style</label>
                      <select
                        value={scryfallFilters.frame}
                        onChange={(e) => {
                          const updated = { ...scryfallFilters, frame: e.target.value };
                          setScryfallFilters(updated);
                          handleSearchArt(artQuery, updated, 'scryfall');
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/80 focus:outline-none focus:border-primary-500"
                      >
                        <option value="all" className="bg-[#1a1a20]">All Frames</option>
                        <option value="borderless" className="bg-[#1a1a20]">Borderless</option>
                        <option value="showcase" className="bg-[#1a1a20]">Showcase</option>
                        <option value="retro" className="bg-[#1a1a20]">Retro / Old Border</option>
                        <option value="extendedart" className="bg-[#1a1a20]">Extended Art</option>
                        <option value="fullart" className="bg-[#1a1a20]">Full Art</option>
                        <option value="etched" className="bg-[#1a1a20]">Etched Foil</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-white/40 block">Card Type</label>
                      <select
                        value={scryfallFilters.type}
                        onChange={(e) => {
                          const updated = { ...scryfallFilters, type: e.target.value };
                          setScryfallFilters(updated);
                          handleSearchArt(artQuery, updated, 'scryfall');
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/80 focus:outline-none focus:border-primary-500"
                      >
                        <option value="all" className="bg-[#1a1a20]">All Types</option>
                        <option value="creature" className="bg-[#1a1a20]">Creature</option>
                        <option value="instant" className="bg-[#1a1a20]">Instant</option>
                        <option value="sorcery" className="bg-[#1a1a20]">Sorcery</option>
                        <option value="enchantment" className="bg-[#1a1a20]">Enchantment</option>
                        <option value="artifact" className="bg-[#1a1a20]">Artifact</option>
                        <option value="planeswalker" className="bg-[#1a1a20]">Planeswalker</option>
                        <option value="land" className="bg-[#1a1a20]">Land</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-white/40 block">Color</label>
                      <select
                        value={scryfallFilters.color}
                        onChange={(e) => {
                          const updated = { ...scryfallFilters, color: e.target.value };
                          setScryfallFilters(updated);
                          handleSearchArt(artQuery, updated, 'scryfall');
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/80 focus:outline-none focus:border-primary-500"
                      >
                        <option value="all" className="bg-[#1a1a20]">All Colors</option>
                        <option value="w" className="bg-[#1a1a20]">White (W)</option>
                        <option value="u" className="bg-[#1a1a20]">Blue (U)</option>
                        <option value="b" className="bg-[#1a1a20]">Black (B)</option>
                        <option value="r" className="bg-[#1a1a20]">Red (R)</option>
                        <option value="g" className="bg-[#1a1a20]">Green (G)</option>
                        <option value="c" className="bg-[#1a1a20]">Colorless (C)</option>
                        <option value="m" className="bg-[#1a1a20]">Multicolor (M)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-white/40 block">Rarity</label>
                      <select
                        value={scryfallFilters.rarity}
                        onChange={(e) => {
                          const updated = { ...scryfallFilters, rarity: e.target.value };
                          setScryfallFilters(updated);
                          handleSearchArt(artQuery, updated, 'scryfall');
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/80 focus:outline-none focus:border-primary-500"
                      >
                        <option value="all" className="bg-[#1a1a20]">All Rarities</option>
                        <option value="mythic" className="bg-[#1a1a20]">Mythic Rare</option>
                        <option value="rare" className="bg-[#1a1a20]">Rare</option>
                        <option value="uncommon" className="bg-[#1a1a20]">Uncommon</option>
                        <option value="common" className="bg-[#1a1a20]">Common</option>
                      </select>
                    </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-white/40 block">Sort By (DPI / Date)</label>
                        <select
                          value={scryfallFilters.order}
                          onChange={(e) => {
                            const updated = { ...scryfallFilters, order: e.target.value };
                            setScryfallFilters(updated);
                            handleSearchArt(artQuery, updated, 'scryfall');
                          }}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/80 focus:outline-none focus:border-primary-500 font-medium"
                        >
                          <option value="released" className="bg-[#1a1a20]">Release Date (Newest)</option>
                          <option value="dpi_desc" className="bg-[#1a1a20]">Highest DPI / Resolution</option>
                          <option value="dpi_asc" className="bg-[#1a1a20]">Lowest DPI</option>
                          <option value="name" className="bg-[#1a1a20]">Card Name (A-Z)</option>
                          <option value="set" className="bg-[#1a1a20]">Set Code</option>
                          <option value="edhrec" className="bg-[#1a1a20]">EDHREC Popularity</option>
                          <option value="usd" className="bg-[#1a1a20]">USD Value</option>
                        </select>
                      </div>

                      <div className="space-y-1 relative">
                        <div className="flex items-center justify-between">
                          <label className="text-[9px] font-bold uppercase tracking-wider text-white/40 block">Set Code</label>
                          <MtgSetCodeTooltip
                            mtgSets={mtgSets}
                            onSelectSet={(code) => {
                              const updated = { ...scryfallFilters, set: code };
                              setScryfallFilters(updated);
                              handleSearchArt(artQuery, updated, 'scryfall');
                            }}
                            align="right"
                          />
                        </div>
                        <input
                          type="text"
                          placeholder="e.g. MH3, UNH"
                          title="Enter MTG set code (e.g. MH3, UNH). Hover 'Set Codes' above to view all MTG sets."
                          value={scryfallFilters.set}
                          onChange={(e) => {
                            const updated = { ...scryfallFilters, set: e.target.value.toUpperCase() };
                            setScryfallFilters(updated);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSearchArt(artQuery, scryfallFilters, 'scryfall');
                            }
                          }}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/80 focus:outline-none focus:border-primary-500 font-mono placeholder:text-white/20 uppercase"
                        />
                      </div>
                    </div>
                  ) : artSourceTab === 'mpcfill' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-white/40 block">DPI Filter</label>
                        <select
                          value={mpcFilters.dpi}
                          onChange={(e) => {
                            const updated = { ...mpcFilters, dpi: e.target.value };
                            setMpcFilters(updated);
                            handleSearchArt(artQuery, updated, 'mpcfill');
                          }}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/80 focus:outline-none focus:border-primary-500 font-medium"
                        >
                          <option value="all" className="bg-[#1a1a20]">Any DPI</option>
                          <option value="1210" className="bg-[#1a1a20]">1210 DPI (Ultra Proxxied / MPC)</option>
                          <option value="1200" className="bg-[#1a1a20]">1200+ DPI (Ultra Res)</option>
                          <option value="1000" className="bg-[#1a1a20]">1000+ DPI</option>
                          <option value="800" className="bg-[#1a1a20]">800+ DPI (High Res)</option>
                          <option value="600" className="bg-[#1a1a20]">600+ DPI</option>
                          <option value="300" className="bg-[#1a1a20]">300+ DPI</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-white/40 block">Sort By</label>
                        <select
                          value={scryfallFilters.order}
                          onChange={(e) => {
                            const updated = { ...scryfallFilters, order: e.target.value };
                            setScryfallFilters(updated);
                          }}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/80 focus:outline-none focus:border-primary-500 font-medium"
                        >
                          <option value="dpi_desc" className="bg-[#1a1a20]">DPI: High to Low</option>
                          <option value="dpi_asc" className="bg-[#1a1a20]">DPI: Low to High</option>
                          <option value="name" className="bg-[#1a1a20]">Name (A-Z)</option>
                        </select>
                      </div>

                      <div className="space-y-1 relative">
                        <div className="flex items-center justify-between">
                          <label className="text-[9px] font-bold uppercase tracking-wider text-white/40 block">Set Filter</label>
                          {pluginState.selectedPlugin?.id === 'mtg' && (
                            <MtgSetCodeTooltip
                              mtgSets={mtgSets}
                              onSelectSet={(code) => {
                                const updated = { ...mpcFilters, set: code };
                                setMpcFilters(updated);
                                handleSearchArt(artQuery, updated, 'mpcfill');
                              }}
                              align="right"
                            />
                          )}
                        </div>
                        <input
                          type="text"
                          placeholder="e.g. MH3, LTR"
                          title="Enter MTG set code (e.g. MH3, LTR). Hover 'Set Codes' above to view all MTG sets."
                          value={mpcFilters.set}
                          onChange={(e) => {
                            const updated = { ...mpcFilters, set: e.target.value.toUpperCase() };
                            setMpcFilters(updated);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSearchArt(artQuery, mpcFilters, 'mpcfill');
                            }
                          }}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/80 focus:outline-none focus:border-primary-500 font-mono placeholder:text-white/20 uppercase"
                        />
                      </div>
                    </div>
                  ) : null}

                {artDownloadMsg && (
                  <div className="text-xs px-3.5 py-2 rounded-xl bg-primary-600/15 border border-primary-500/30 text-primary-300 font-medium">
                    {artDownloadMsg}
                  </div>
                )}

                <div className="flex justify-between items-center pt-2">
                  {pluginState.selectedPlugin?.id === 'mtg' ? (
                    <button
                      onClick={() => {
                        setScryfallFilters({ frame: 'all', type: 'all', color: 'all', rarity: 'all', order: 'released', set: '' });
                        setMpcFilters({ dpi: 'all', tag: 'all', set: '' });
                        handleSearchArt(artQuery, { frame: 'all', type: 'all', color: 'all', rarity: 'all', order: 'released', set: '' }, artSourceTab);
                      }}
                      className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-xs font-bold transition-colors"
                    >
                      Clear Filters
                    </button>
                  ) : <div />}

                  <div className="flex items-center gap-3">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Card Size</label>
                    <input
                      type="range"
                      min="100"
                      max="300"
                      value={artCardSize}
                      onChange={(e) => setArtCardSize(parseInt(e.target.value))}
                      className="w-24 accent-primary-500"
                    />
                  </div>
                </div>

              </div>

              {/* Modal Body: Results Grid */}
              <div className="flex-1 overflow-y-auto p-5">
                {isSearchingArt ? (
                  <div className="h-72 flex flex-col items-center justify-center gap-3 text-white/40">
                    <Loader2 size={36} className="animate-spin text-primary-400" />
                    <span className="text-xs">Fetching cards & printings from {artSourceTab === 'limitless' ? 'Limitless TCG' : artSourceTab === 'scryfall' ? 'Scryfall API' : artSourceTab === 'mpcfill' ? 'MPCFill' : (artSourceTab === 'oneproxy' ? 'OneProxy Local Library' : getPluginCardProvider(artSourceTab in PLUGIN_CARD_PROVIDERS ? artSourceTab : pluginState.selectedPlugin?.id).providerName)}...</span>
                  </div>
                ) : artResults.length > 0 ? (
                  <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${artCardSize}px, 1fr))` }}>
                    {artResults
                      .slice()
                      .sort((a, b) => {
                        const dpiA = a.dpi || (a.image_uris?.png ? 300 : a.highres_image ? 300 : 250);
                        const dpiB = b.dpi || (b.image_uris?.png ? 300 : b.highres_image ? 300 : 250);
                        if (scryfallFilters.order === 'dpi_desc') return dpiB - dpiA;
                        if (scryfallFilters.order === 'dpi_asc') return dpiA - dpiB;
                        return 0;
                      })
                      .map((card) => {
                        const img = card.imageUrl || card.image_uris?.normal || card.image_uris?.large || card.card_faces?.[0]?.image_uris?.normal;
                        const frameEffects = card.frame_effects?.join(', ') || card.tags?.join(', ');
                        const cardDpi = card.dpi || (card.image_uris?.png ? 300 : card.highres_image ? 300 : 250);

                        return (
                          <div key={card.id} className="bg-white/[0.03] border border-white/10 hover:border-primary-500/40 rounded-2xl p-2.5 flex flex-col justify-between transition-all group">
                            <div>
                              <div
                                onClick={() => img && setEnlargedImage(img)}
                                className="relative aspect-[5/7] rounded-xl overflow-hidden bg-black/40 mb-2 cursor-pointer group/img"
                                title="Click to enlarge"
                              >
                                {img ? (
                                  <img src={img} alt={card.name} className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-xs text-white/30">No Image</div>
                                )}
                                <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-[9px] font-mono font-bold text-primary-300 border border-white/10 pointer-events-none">
                                  {String(card.set || '').toUpperCase()} #{card.collector_number}
                                </span>
                                <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-primary-600/80 backdrop-blur-md text-[8px] font-mono font-bold text-white border border-white/10 pointer-events-none">
                                  {cardDpi} DPI
                                </span>
                              </div>
                              <h4 className="text-xs font-bold text-white truncate" title={card.name}>{card.name}</h4>
                              <p className="text-[10px] text-white/40 truncate" title={card.set_name || card.source}>
                                {card.set_name || card.source || 'Community'} {card.released_at ? `(${card.released_at.slice(0, 4)})` : ''}
                              </p>
                              {frameEffects && (
                                <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-white/5 text-[9px] text-primary-300/80 capitalize truncate max-w-full">
                                  {frameEffects}
                                </span>
                              )}
                            </div>

                            <div className="space-y-1.5 mt-3 pt-2 border-t border-white/5">
                              {/* Primary Action Button: Replaces old Project & Library buttons */}
                              {artTargetCard?.targetMode === 'double_sided' ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const targetMode = assetViewMode === 'plugins' ? 'plugins' : (assetViewMode === 'library' ? 'library' : 'project');
                                    const names = artTargetCard.targets && artTargetCard.targets.length > 0
                                      ? artTargetCard.targets.map(t => t.name)
                                      : [artTargetCard.name];
                                    handleDownloadCardArt(card, targetMode, 'double_sided', names);
                                  }}
                                  className="w-full py-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-[10px] font-bold transition-colors text-center cursor-pointer shadow-sm flex items-center justify-center gap-1"
                                  title={artTargetCard.targets && artTargetCard.targets.length > 1
                                    ? `Pair this art as the reverse back of all ${artTargetCard.targets.length} selected cards`
                                    : `Pair this art as the reverse back of ${artTargetCard.name}`}
                                >
                                  <Layers size={12} />
                                  <span>{artTargetCard.targets && artTargetCard.targets.length > 1 ? `Set Back (${artTargetCard.targets.length} Cards)` : 'Set Back'}</span>
                                </button>
                              ) : artTargetCard?.type === 'back' ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const targetMode = assetViewMode === 'plugins' ? 'plugins' : (assetViewMode === 'library' ? 'library' : 'project');
                                    const names = artTargetCard.targets && artTargetCard.targets.length > 0
                                      ? artTargetCard.targets.map(t => t.name)
                                      : [artTargetCard.name];
                                    handleDownloadCardArt(card, targetMode, 'back', names);
                                  }}
                                  className="w-full py-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-[10px] font-bold transition-colors text-center cursor-pointer shadow-sm"
                                  title={artTargetCard.targets && artTargetCard.targets.length > 1
                                    ? `Replace all ${artTargetCard.targets.length} selected card backs with this back`
                                    : `Replace ${artTargetCard.name} with this back`}
                                >
                                  {artTargetCard.targets && artTargetCard.targets.length > 1 ? `Replace Back (${artTargetCard.targets.length} Cards)` : 'Replace This Back'}
                                </button>
                              ) : artTargetCard?.targetMode === 'front' ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const targetMode = assetViewMode === 'plugins' ? 'plugins' : (assetViewMode === 'library' ? 'library' : 'project');
                                    const names = artTargetCard.targets && artTargetCard.targets.length > 0
                                      ? artTargetCard.targets.map(t => t.name)
                                      : [artTargetCard.name];
                                    handleDownloadCardArt(card, targetMode, 'front', names);
                                  }}
                                  className="w-full py-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-[10px] font-bold transition-colors text-center cursor-pointer shadow-sm"
                                  title={artTargetCard.targets && artTargetCard.targets.length > 1
                                    ? `Replace front art for all ${artTargetCard.targets.length} selected cards with this art`
                                    : `Replace ${artTargetCard.name} with this art`}
                                >
                                  {artTargetCard.targets && artTargetCard.targets.length > 1 ? `Replace Front Art (${artTargetCard.targets.length} Cards)` : 'Replace Front Art'}
                                </button>
                              ) : isBacksOnlyModal ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const targetMode = assetViewMode === 'plugins' ? 'plugins' : (assetViewMode === 'library' ? 'library' : 'project');
                                    handleDownloadCardArt(card, targetMode, 'back');
                                  }}
                                  className="w-full py-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-[10px] font-bold transition-colors text-center cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                                  title="Add this card backing to workspace"
                                >
                                  <PlusCircle size={12} />
                                  <span>Add Back</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const targetMode = assetViewMode === 'plugins' ? 'plugins' : (assetViewMode === 'library' ? 'library' : 'project');
                                    handleDownloadCardArt(card, targetMode, 'front');
                                  }}
                                  className="w-full py-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-[10px] font-bold transition-colors text-center cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                                  title="Add this card to your active workspace"
                                >
                                  <PlusCircle size={12} />
                                  <span>Add Card</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="h-72 flex flex-col items-center justify-center gap-2 text-white/30 text-center px-4">
                    <ImageIcon size={32} className="opacity-40 text-primary-400" />
                    <p className="text-sm font-semibold text-white/60">
                      {isBacksOnlyModal ? "Type a search term above to find card back patterns." : "Type a card name above to browse printings."}
                    </p>
                    <p className="text-xs text-white/30 max-w-md">
                      {isBacksOnlyModal ? "Search through community 800 and 1200 DPI card backs or official releases." : "Search MPCFill for 1200 DPI custom arts or Scryfall for all official printings."}
                    </p>
                  </div>
                )}

                {/* Proxxied Bottom Action Bar */}
                <div className="mt-4 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setArtQuery('');
                      setArtTargetCard(null);
                      setIsBacksOnlyModal(false);
                      setArtResults([]);
                    }}
                    className="w-full py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95"
                  >
                    <Search size={14} />
                    <span>Search for a different card or back...</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Subcomponents
function DimensionField({
  label,
  value,
  onChange,
  unit = 'mm',
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  unit?: 'mm' | 'in';
}) {
  const parts = parseDimensionParts(value, unit);
  const [inputValue, setInputValue] = useState<string>(parts.num);

  useEffect(() => {
    const p = parseDimensionParts(value, unit);
    setInputValue(p.num);
  }, [value, unit]);

  const handleTextChange = (raw: string) => {
    setInputValue(raw);
    const trimmed = raw.trim();
    if (!trimmed || trimmed === '0') {
      onChange('');
      return;
    }

    // Check if user typed or pasted unit in the text field (e.g. "0.125in" or "3mm")
    if (trimmed.endsWith('in') || trimmed.endsWith('"') || trimmed.includes('inch')) {
      const match = trimmed.match(/^(\d+(?:\.\d+)?|\.\d+)/);
      if (match) {
        onChange(`${match[1]}in`);
        return;
      }
    }
    if (trimmed.endsWith('mm')) {
      const match = trimmed.match(/^(\d+(?:\.\d+)?|\.\d+)/);
      if (match) {
        onChange(`${match[1]}mm`);
        return;
      }
    }

    // Bare number: ALWAYS automatically append the active unit of measurement!
    if (/^(\d+(\.\d+)?|\.\d+)$/.test(trimmed)) {
      onChange(`${trimmed}${unit}`);
    } else {
      onChange(trimmed);
    }
  };

  const handleBlur = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || trimmed === '0') {
      setInputValue('');
      onChange('');
      return;
    }

    const normalized = normalizeDimension(trimmed, unit);
    if (normalized) {
      const p = parseDimensionParts(normalized, unit);
      setInputValue(p.num);
      onChange(normalized);
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold uppercase tracking-wider text-white/60 block">{label}</label>
      </div>
      <div className="relative flex items-center">
        <input
          type="text"
          placeholder={unit === 'in' ? 'e.g. 0.125' : 'e.g. 3'}
          value={inputValue}
          onChange={(e) => handleTextChange(e.target.value)}
          onBlur={handleBlur}
          className="w-full bg-white/5 border border-white/10 rounded-lg pl-3 pr-10 py-2 text-xs focus:border-primary-500 font-mono text-white placeholder-white/20"
        />
        <span className="absolute right-3 text-xs font-mono font-medium text-white/40 pointer-events-none select-none">
          {unit}
        </span>
      </div>
    </div>
  );
}

function TemplateCard({ type, onUpload, multiple = false }: { type: 'front' | 'back' | 'double_sided', onUpload: (files: File[]) => void, multiple?: boolean }) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      onClick={() => fileInputRef.current?.click()}
      className="group aspect-[2.5/3.5] bg-black/40 border-2 border-dashed border-white/5 hover:border-primary-500/50 rounded-2xl flex flex-col items-center justify-center gap-4 transition-all cursor-pointer relative overflow-hidden"
    >
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        multiple={multiple}
        onChange={(e) => {
          if (e.target.files?.length) {
            onUpload(Array.from(e.target.files));
          }
          e.target.value = '';
        }}
      />
      <div className="absolute inset-0 bg-primary-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="shrink-0 p-4 bg-white/5 rounded-2xl text-white/10 group-hover:bg-primary-600 group-hover:text-white transition-all shadow-inner">
        <Download size={24} strokeWidth={1.5} />
      </div>
    </div>
  );
}

function DropZone({ children, onDrop, label, isLibrary, disabled = false }: { children: React.ReactNode, onDrop: (files: FileList, isLibrary: boolean) => void, label: string, isLibrary: boolean, disabled?: boolean }) {
  const [isOver, setIsOver] = useState(false);

  if (disabled) {
    return <>{children}</>;
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsOver(false);
        if (e.dataTransfer.files) onDrop(e.dataTransfer.files, isLibrary);
      }}
      className={cn(
        "relative rounded-[40px] transition-all duration-300",
        isOver ? "bg-primary-600/10 ring-2 ring-primary-500 ring-dashed" : ""
      )}
    >
      {children}
      {isOver && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center pointer-events-none rounded-[40px] overflow-hidden bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-primary-600 text-white px-8 py-4 rounded-3xl shadow-2xl font-bold uppercase tracking-widest text-xs flex items-center gap-3"
          >
            <Download size={18} className="animate-bounce" />
            Drop to upload assets
          </motion.div>
        </div>
      )}
      <div className="hidden md:block mt-4 px-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary-400/40">
          {label}
        </p>
      </div>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick, collapsed }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void, collapsed?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm overflow-hidden",
        active
          ? "bg-primary-600 text-white shadow-lg shadow-primary-600/20"
          : "text-white/40 hover:bg-white/5 hover:text-white",
        collapsed && "px-0 justify-center"
      )}
    >
      <div className="shrink-0">{icon}</div>
      {!collapsed && <span className={cn("whitespace-nowrap transition-all", active ? "opacity-100" : "opacity-70")}>{label}</span>}
    </button>
  );
}

function CommandItem({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all group"
    >
      <div className="p-2 bg-black/40 rounded-lg group-hover:text-primary-400 transition-colors">
        {icon}
      </div>
      <span className="text-sm font-medium text-white/60 group-hover:text-white">{label}</span>
      <ChevronRight size={14} className="ml-auto text-white/10 group-hover:text-primary-400 transition-colors" />
    </button>
  );
}

function CheckItem({ label, checked }: { label: string, checked?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn(
        "w-5 h-5 rounded-md border flex items-center justify-center transition-colors",
        checked ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-500" : "bg-white/5 border-white/10 text-white/20"
      )}>
        {checked && <ShieldCheck size={14} />}
      </div>
      <span className={cn("text-sm", checked ? "text-white/80" : "text-white/40")}>{label}</span>
    </div>
  );
}

function DocsCmd({ name, desc }: { name: string, desc: string }) {
  return (
    <div className="p-4 bg-black/40 rounded-xl border border-white/5 flex items-start gap-4">
      <code className="text-emerald-400 text-xs px-2 py-1 bg-white/5 rounded border border-white/10 font-bold">
        {name}
      </code>
      <p className="text-sm text-white/60">{desc}</p>
    </div>
  );
}

const ErrorBanner: React.FC<{ logs: string[] }> = ({ logs }) => {
  const [visible, setVisible] = useState(false);
  const lastError = [...logs].reverse().find(l => l.startsWith('[Error]'));

  useEffect(() => {
    if (lastError) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [lastError]);

  if (!lastError || !visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="fixed bottom-8 right-8 z-[100] max-w-sm w-full bg-[#1a1a20]/90 backdrop-blur-xl border border-rose-500/30 rounded-2xl p-5 shadow-2xl flex items-start gap-4 ring-1 ring-white/5"
    >
      <div className="p-2.5 bg-rose-500/20 rounded-xl shrink-0 border border-rose-500/40">
        <AlertCircle size={20} className="text-rose-400" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
          System Error
        </h4>
        <p className="text-[11px] text-white/70 font-mono leading-relaxed break-words">{lastError.replace('[Error] ', '')}</p>
      </div>
      <button
        onClick={() => setVisible(false)}
        className="text-white/20 hover:text-white transition-colors"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
};

function SelectGroup({ label, value, options, onChange, badge }: { 
  label: string; 
  value: string; 
  options: (string | { label: string; value: string })[]; 
  onChange: (v: string) => void; 
  badge?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5 flex-1">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold uppercase tracking-widest text-white/30">{label}</label>
        {badge}
      </div>
      <div className="relative group">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary-500 transition-all text-white/80 appearance-none cursor-pointer hover:bg-white/10"
        >
          {options.map((opt, i) => {
            const optVal = typeof opt === 'string' ? opt : opt.value;
            const optLabel = typeof opt === 'string' ? opt : opt.label;
            return <option key={`${optVal}-${i}`} value={optVal} className="bg-[#1a1a20] text-white">{optLabel}</option>;
          })}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none group-hover:text-primary-400 transition-colors" />
      </div>
    </div>
  );
}

function ToggleItem({ label, checked, onChange }: { label: string, checked: boolean, onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-all group"
    >
      <span className="text-xs text-white/60 group-hover:text-white/80">{label}</span>
      <div className={cn(
        "w-8 h-4 rounded-full relative transition-all duration-300",
        checked ? "bg-primary-600" : "bg-white/10"
      )}>
        <div className={cn(
          "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all duration-300",
          checked ? "left-4.5" : "left-0.5"
        )} />
      </div>
    </button>
  );
}

interface AssetItemProps {
  name: string;
  type: 'front' | 'back' | 'double_sided';
  allAssets?: AssetData | null;
  onContextMenu?: (x: number, y: number) => void;
  selected?: boolean;
  onSelect?: (e: React.MouseEvent | React.TouchEvent) => void;
  onDragSelectStart?: (name: string) => void;
  onEnlarge?: (src: string) => void;
  isFlipped?: boolean;
  onToggleFlip?: (e: React.MouseEvent) => void;
  uploadedImages?: Record<string, string>;
  addLog?: (log: string) => void;
  assetViewMode: 'library' | 'project' | 'plugins';
  cardDimming?: 'none' | 'tint' | 'dark';
  cacheBustToken?: number;
}

const _AssetItem: React.FC<AssetItemProps> = ({
  name,
  type,
  allAssets,
  onContextMenu,
  selected,
  onSelect,
  onDragSelectStart,
  onEnlarge,
  isFlipped,
  onToggleFlip,
  uploadedImages,
  addLog,
  assetViewMode,
  cardDimming = 'tint',
  cacheBustToken
}) => {
  const cleanName = useMemo(() => stripExt(name).toLowerCase(), [name]);

  const isDoubleSided = useMemo(() => {
    if (type === 'double_sided') return true;
    if (!Array.isArray(allAssets?.double_sided)) return false;
    return allAssets.double_sided.some((d: string) => stripExt(d).toLowerCase() === cleanName);
  }, [type, allAssets?.double_sided, cleanName]);

  const baseUrl = useMemo(() => {
    if (assetViewMode === 'library') return '/library';
    if (assetViewMode === 'plugins') return '/plugins_staging';
    return '/game';
  }, [assetViewMode]);

  const appendBust = useCallback((url: string) => {
    return (cacheBustToken && cacheBustToken > 0) ? `${url}?t=${cacheBustToken}` : url;
  }, [cacheBustToken]);

  const imgSrc = useMemo(() => {
    const logicalType = type === 'double_sided' ? 'front' : type;

    if (uploadedImages?.[`${logicalType}_${name}`]) {
      addLog?.(`AssetItem Debug: ${name} FOUND in uploadedImages for ${logicalType}.`);
      return uploadedImages[`${logicalType}_${name}`];
    }

    if ((type === 'front' || type === 'double_sided') && uploadedImages?.[`front_${name}`]) {
      return uploadedImages[`front_${name}`];
    }

    if (type === 'back') {
      return appendBust(`${baseUrl}/back/${encodeURIComponent(name)}`);
    }

    if (isDoubleSided) {
      const exactFront = allAssets?.fronts?.find(f => stripExt(f).toLowerCase() === cleanName);
      if (exactFront) {
        return appendBust(`${baseUrl}/front/${encodeURIComponent(exactFront)}`);
      } else {
        return appendBust(`${baseUrl}/front/${encodeURIComponent(name)}`);
      }
    }

    return appendBust(`${baseUrl}/front/${encodeURIComponent(name)}`);
  }, [type, name, uploadedImages, addLog, baseUrl, appendBust, isDoubleSided, allAssets?.fronts, cleanName]);

  const backFace = useMemo(() => {
    if (type === 'back') return null;

    if (isDoubleSided) {
      const exactDoubleSided = allAssets?.double_sided?.find(d => stripExt(d).toLowerCase() === cleanName);
      const hasDoubleSidedOnDisk = !!exactDoubleSided || type === 'double_sided';
      if (hasDoubleSidedOnDisk && (allAssets?.fronts?.some(f => stripExt(f).toLowerCase() === cleanName) || type === 'double_sided' || assetViewMode === 'library' || assetViewMode === 'plugins')) {
        return { name: exactDoubleSided || name, folder: 'double_sided' };
      }
      if (allAssets?.backs && allAssets.backs.length > 0) {
        return { name: allAssets.backs[allAssets.backs.length - 1], folder: 'back' };
      }
    }

    if (assetViewMode === 'library' || assetViewMode === 'plugins') return null;

    if (allAssets?.backs && allAssets.backs.length > 0) {
      return { name: allAssets.backs[allAssets.backs.length - 1], folder: 'back' };
    }

    return null;
  }, [type, isDoubleSided, allAssets?.double_sided, allAssets?.fronts, allAssets?.backs, cleanName, name, assetViewMode]);

  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const { clientX, clientY } = touch;
    timerRef.current = setTimeout(() => {
      if (onContextMenu) {
        onContextMenu(clientX, clientY);
        if (navigator.vibrate) navigator.vibrate(50);
      }
    }, 500);
  };

  const cancelTouch = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const backFaceSrc = useMemo(() => {
    if (!backFace) return '';
    if (uploadedImages?.[`${backFace.folder}_${backFace.name}`]) {
      return uploadedImages[`${backFace.folder}_${backFace.name}`];
    }
    return appendBust(`${baseUrl}/${backFace.folder}/${encodeURIComponent(backFace.name)}`);
  }, [backFace, uploadedImages, appendBust, baseUrl]);

  const enlargeSrc = useMemo(() => {
    if (isFlipped && backFace) {
      return backFaceSrc;
    }
    return imgSrc;
  }, [isFlipped, backFace, backFaceSrc, imgSrc]);

  // Thumbnail URLs for ultra-fast, lightweight grid rendering
  const thumbSrc = useMemo(() => {
    if (!imgSrc || imgSrc.startsWith('blob:') || imgSrc.startsWith('data:')) return imgSrc;
    return `/api/thumbnail?src=${encodeURIComponent(imgSrc)}`;
  }, [imgSrc]);

  const backFaceThumbSrc = useMemo(() => {
    if (!backFaceSrc || backFaceSrc.startsWith('blob:') || backFaceSrc.startsWith('data:')) return backFaceSrc;
    return `/api/thumbnail?src=${encodeURIComponent(backFaceSrc)}`;
  }, [backFaceSrc]);

  return (
    <div
      className="group space-y-3 asset-card"
      data-asset-name={`${type}:${name}`}
      onContextMenu={(e) => {
        e.preventDefault();
        if (onContextMenu) {
          onContextMenu(e.clientX, e.clientY);
        }
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={cancelTouch}
      onTouchEnd={cancelTouch}
      onTouchCancel={cancelTouch}
    >
      <div
        className={cn(
          "aspect-[2.5/3.5] relative perspective-1000",
          "cursor-pointer lightbox-trigger"
        )}
        data-enlarge-src={enlargeSrc}
        data-front-src={imgSrc}
        data-back-src={backFaceSrc}
        data-lightbox-group={type}
        onClick={(e) => {
          if (e.shiftKey || e.ctrlKey || e.metaKey) {
            onSelect?.(e);
          } else {
            onEnlarge?.(enlargeSrc);
          }
        }}
      >
        {(type === 'front' || type === 'double_sided') && backFace && (
          <button
            onClick={(e) => {
              if (onToggleFlip) {
                onToggleFlip(e);
              }
            }}
            className={cn(
              "absolute top-2 right-2 z-30 w-7 h-7 rounded-full border text-white flex items-center justify-center transition-all shadow-md active:scale-95 group/flip cursor-pointer",
              isDoubleSided
                ? "bg-primary-600 border-primary-400 opacity-95 hover:opacity-100 shadow-lg shadow-primary-600/30 ring-1 ring-primary-400/50"
                : "bg-black/60 border-white/20 opacity-0 group-hover:opacity-100 hover:bg-primary-600 hover:border-primary-400"
            )}
            title="Flip Card (Inspect Front / Back)"
          >
            <RotateCcw size={14} className="group-hover/flip:-rotate-180 transition-transform duration-500" />
          </button>
        )}

        <motion.div
          className="w-full h-full preserve-3d relative"
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ type: 'tween', duration: 0.25, ease: 'easeInOut' }}
        >
          {/* Front Face / Static Back Pattern */}
          <div className={cn(
            "absolute inset-0 backface-hidden bg-[#0f0f13] border rounded-xl overflow-hidden shadow-lg shadow-black/20 transition-all duration-300",
            selected ? "border-primary-500 ring-2 ring-primary-500/50" : "border-white/5",
            !selected && "group-hover:border-primary-500/50"
          )}>
            <div className={cn("absolute inset-0 flex items-center justify-center", cardDimming !== 'none' && "bg-black/20")}>
              <img
                src={thumbSrc}
                alt={name}
                loading="lazy"
                decoding="async"
                className={cn(
                  "w-full h-full object-cover transition-opacity duration-300",
                  cardDimming === 'dark'
                    ? "opacity-50 group-hover:opacity-100"
                    : cardDimming === 'tint'
                      ? "opacity-75 group-hover:opacity-100"
                      : "opacity-100"
                )}
                onError={(e) => {
                  const imgEl = e.currentTarget;
                  if (imgEl.src !== imgSrc) {
                    imgEl.src = imgSrc;
                  }
                }}
              />
              {cardDimming !== 'none' && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 pointer-events-none" />
              )}
            </div>

            {type === 'back' && selected && (
              <div className="absolute top-2 right-2 z-20 px-2 py-0.5 bg-primary-600 rounded-full shadow-lg border border-primary-500">
                <span className="text-[8px] font-bold text-white uppercase tracking-tighter">Default Back</span>
              </div>
            )}

            {(type === 'front' || type === 'double_sided') && isDoubleSided && (
              <div className="absolute top-2 left-2 z-20 px-2 py-0.5 bg-primary-600/90 rounded-full shadow-lg border border-primary-400 flex items-center gap-1 backdrop-blur-md">
                <RotateCcw size={10} className="text-white" />
                <span className="text-[8px] font-bold text-white uppercase tracking-wider">Custom Back</span>
              </div>
            )}

            {isDoubleSided && (
              <div className="absolute bottom-2 left-2 z-20 px-2 py-0.5 bg-primary-600/90 text-white rounded-md text-[9px] font-bold shadow-md flex items-center gap-1 border border-primary-400/40">
                <Layers size={10} />
                <span>Double Sided</span>
              </div>
            )}

            {(type === 'front' || type === 'double_sided') && !selected && assetViewMode !== 'library' && (
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-3 text-center select-none">
                <Eye size={18} className="text-white animate-pulse" />
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">Click to Enlarge</span>
              </div>
            )}
          </div>

          {/* Back Face (only if front or double-sided) */}
          {(type === 'front' || type === 'double_sided') && (
            <div
              className="absolute inset-0 backface-hidden bg-[#0f0f13] border border-white/5 rounded-xl overflow-hidden shadow-lg shadow-black/20"
              style={{ transform: 'rotateY(180deg)' }}
            >
              <div className={cn("absolute inset-0 flex items-center justify-center", cardDimming !== 'none' && "bg-black/20")}>
                {backFace ? (
                  <img
                    src={backFaceThumbSrc}
                    alt={backFace.name}
                    loading="lazy"
                    decoding="async"
                    className={cn(
                      "w-full h-full object-cover transition-opacity duration-300",
                      cardDimming === 'dark'
                        ? "opacity-50 group-hover:opacity-100"
                        : cardDimming === 'tint'
                          ? "opacity-75 group-hover:opacity-100"
                          : "opacity-100"
                    )}
                    onError={(e) => {
                      const imgEl = e.currentTarget;
                      if (imgEl.src !== backFaceSrc) {
                        imgEl.src = backFaceSrc;
                      }
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 opacity-20">
                    <RefreshCw size={48} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">No Back Defined</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>

        {/* Selection Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.(e);
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
            onSelect?.(e);
            if (onDragSelectStart) onDragSelectStart(name);
          }}
          className={cn(
            "absolute top-2 left-2 z-30 w-6 h-6 rounded-full border flex items-center justify-center transition-all shadow-md active:scale-95",
            selected
              ? "bg-primary-600 border-primary-400 text-white"
              : "bg-black/40 border-white/10 text-white/0 group-hover:text-white/40 group-hover:border-white/40 hover:bg-black/60 hover:text-white/80"
          )}
        >
          <CheckSquare size={12} />
        </button>
      </div>
      <div className="px-1">
        <p className="text-xs font-medium text-white/60 truncate">{name}</p>
        <p className="text-[10px] text-white/20 font-mono">
          {(type === 'front' || type === 'double_sided') ? (isFlipped ? (backFace?.folder === 'double_sided' ? 'Double-Sided' : 'Standard Back') : 'Front Face') : 'Back Pattern'}
        </p>
      </div>
    </div>
  );
};

const AssetItem = React.memo<AssetItemProps>(_AssetItem, (prev, next) => {
  return (
    prev.name === next.name &&
    prev.type === next.type &&
    prev.selected === next.selected &&
    prev.isFlipped === next.isFlipped &&
    prev.cacheBustToken === next.cacheBustToken &&
    prev.cardDimming === next.cardDimming &&
    prev.assetViewMode === next.assetViewMode &&
    prev.allAssets === next.allAssets &&
    prev.uploadedImages === next.uploadedImages
  );
});

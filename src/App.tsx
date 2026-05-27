import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { Theme, setTheme, getTheme } from './lib/theme';

// Types
type Tab = 'dashboard' | 'console' | 'assets' | 'builder' | 'plugins';

interface AssetData {
  fronts: string[];
  backs: string[];
  double_sided?: string[];
}

const FORMAT_HINTS: Record<string, string> = {
  // MTG
  simple: "List just the card names, one per line. Example: 4 Lightning Bolt",
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
    formats: ['egman', 'optcgsim'],
    options: [],
    websites: [
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
  }
];

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

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [assetViewMode, setAssetViewMode] = useState<'project' | 'library' | 'plugins'>('project');
  const [status, setStatus] = useState<AppStatus | null>(null);
  const [logs, setLogs] = useState<string[]>(["[System] Initializing Silhouette Master Virtual Bridge..."]);

  const [appIcon, setAppIcon] = useState<string | null>(null);

  useEffect(() => {
    fetch('/icon.png', { method: 'HEAD' })
      .then(res => {
        if (res.ok) {
          setAppIcon('/icon.png');
        }
      })
      .catch(() => {});
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
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [flippedAssets, setFlippedAssets] = useState<Set<string>>(new Set());
  const [uploadedImages, setUploadedImages] = useState<Record<string, string>>({});
  const [localAssets, setLocalAssets] = useState<Array<{name: string, type: 'front' | 'back' | 'double_sided', view: 'project' | 'library' | 'plugins'}>>([]);
  const [isReplaceBackDialogOpen, setIsReplaceBackDialogOpen] = useState(false);
  const [pendingBackFile, setPendingBackFile] = useState<File | null>(null);
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
  const [settingsTab, setSettingsTab] = useState<'theme' | 'shortcuts'>('theme');
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
      if (!isNaN(parsed) && parsed >= 120 && parsed <= 320) {
        return parsed;
      }
    }
    return 180;
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
  const [taskProgress, setTaskProgress] = useState<{current: number, total: number, message: string} | null>(null);
  const [importConflictData, setImportConflictData] = useState<{items: string[], destination: 'project' | 'library', source: 'library' | 'project' | 'plugins', collisions: string[], backResolution?: 'check'|'keep'|'replace'} | null>(null);
  const [backConflictData, setBackConflictData] = useState<{items: string[], destination: 'project' | 'library', source: 'library' | 'project' | 'plugins', conflictResolution?: 'check'|'keep'|'replace'} | null>(null);
  const [fetchConflictData, setFetchConflictData] = useState<{tempDirId: string, collisions: string[], resolutions: Record<string, 'replace' | 'skip'>} | null>(null);

  useEffect(() => {
    setCurrentTheme(getTheme());
    const handleGlobalClick = () => setContextMenu(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

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
        setShowSaveModal(true);
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
              } catch(e) {}
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
          } catch(err) {
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
    return saved ? JSON.parse(saved) : {
      card_size: 'standard',
      paper_size: 'letter',
      registration: '3',
      only_fronts: false,
      fit: 'stretch',
      extend_corners: 0,
      ppi: 300,
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

  const CALIBRATION_SHEETS = [
    { label: 'Letter', value: 'letter-calibration.pdf' },
    { label: 'A3', value: 'a3-calibration.pdf' },
    { label: 'A4', value: 'a4-calibration.pdf' },
    { label: 'Arch B', value: 'arch_b-calibration.pdf' },
    { label: 'Tabloid', value: 'tabloid-calibration.pdf' }
  ];

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
      } catch (e) {}
    }
    return {
      selectedPlugin: PLUGINS[0],
      decklist: "",
      format: PLUGINS[0].formats[0],
      options: {} as Record<string, any>
    };
  });

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

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/status?_=' + new Date().getTime());
      const data = await res.json();
      setStatus(data);
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
    }
  };

  const getAllAssets = (type: 'front' | 'back' | 'double_sided') => {
    let serverAssets: string[] = [];
    const current = getCurrentAssets();
    if (type === 'front') {
      const fronts = current?.fronts || [];
      const doubleSided = current?.double_sided || [];
      serverAssets = fronts.filter(f => !doubleSided.includes(f));
    } else if (type === 'back') {
      serverAssets = current?.backs || [];
    } else if (type === 'double_sided') {
      serverAssets = current?.double_sided || [];
    }
      
    const local = localAssets.filter(a => {
      if (a.view !== assetViewMode) return false;
      if (a.type !== type) return false;
      if (serverAssets.includes(a.name)) return false;
      if (type === 'front' && localAssets.some(other => other.name === a.name && other.type === 'double_sided' && other.view === assetViewMode)) {
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
    } catch(e) {
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
    } catch(err) {
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

  const runCommand = async (command: string, args?: string[], options?: { startMessage?: string, hideProgressOnComplete?: boolean, tempDirId?: string }) => {
    setTaskProgress({ current: 0, total: 1, message: options?.startMessage || `Running task...` });
    addLog(`[Console] Executing: ${command} ${args?.join(' ') || ''}`);
    const abortController = new AbortController();
    setActiveTaskController(abortController);
    try {
      const res = await fetch('/api/run-command-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, args, tempDirId: options?.tempDirId }),
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
               try { eventData = JSON.parse(line.substring(6)); } catch(e) {}
            }
          }
          if (eventData !== null) {
             if (eventType === 'stdout') {
                 output.push(eventData as string);
                 addLog(`[Console] ${eventData}`);
                 const match = (eventData as string).match(/^Image (\d+):/);
                 if (match) {
                     currentCard = parseInt(match[1]);
                     setTaskProgress({ current: currentCard, total: totalCards > 0 ? totalCards : currentCard + 1, message: `Processing card ${currentCard}${totalCards > 0 ? ` of ${totalCards}` : ''}...` });
                 }
             } else if (eventType === 'stderr') {
                 output.push(`[Error] ${eventData}`);
                 addLog(`[Console Error] ${eventData}`);
             } else if (eventType === 'error') {
                 output.push(eventData as string);
                 addLog(`[Console Error] ${eventData}`);
             } else if (eventType === 'fetched_files') {
                 fetchedFiles = eventData as any;
             }
          }
        }
      }
      
      setActiveTaskController(null);
      const assets = await fetchStatus();
      
      if (!options?.hideProgressOnComplete) {
         setTaskProgress({ current: 1, total: 1, message: 'Complete.' });
         setTimeout(() => setTaskProgress(null), 1500);
      }
      
      return { output, assets, fetchedFiles };
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
    } catch(e: any) {
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
    } catch(e) {}
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
    const args = [
      '--card_size', cmdOptions.card_size.toString(),
      '--paper_size', cmdOptions.paper_size.toString(),
      '--registration', cmdOptions.registration.toString(),
      '--fit', cmdOptions.fit.toString(),
      '--ppi', cmdOptions.ppi.toString(),
      '--quality', cmdOptions.quality.toString()
    ];
    if (cmdOptions.load_offset) args.push('--load_offset');
    if (cmdOptions.show_outline) args.push('--show_outline');
    if (cmdOptions.only_fronts) args.push('--only_fronts');
    if (cmdOptions.output_images) args.push('--output_images');
    if (cmdOptions.crop) { args.push('--crop'); args.push(cmdOptions.crop); }
    if (cmdOptions.crop_backs) { args.push('--crop_backs'); args.push(cmdOptions.crop_backs); }
    if (cmdOptions.label) { args.push('--label'); args.push(cmdOptions.label); }
    if (cmdOptions.extend_corners > 0) { args.push('--extend_corners'); args.push(cmdOptions.extend_corners.toString()); }
    if (cmdOptions.skip) { args.push('--skip'); args.push(cmdOptions.skip); }
    const result = await runCommand('create_pdf.py', args, { startMessage: 'Generating PDF...' });
    if (result?.output && result.output.some((line: string) => line.includes('PDF successfully moved') || line.includes('Generated PDF') || line.includes('PDF generated successfully'))) {
      setPdfReady(true);
      setPdfReadyToastOpen(true);
      playDing();
      setTimeout(() => setPdfReadyToastOpen(false), 5000);
    } else if (result?.output && result.output.some((line: string) => line.includes('[Error]'))) {
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

  const handleAssetSelect = (identity: string, e?: React.MouseEvent) => {
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
        // prompt the user
        alert("Only one back pattern card can be selected for staging at a time.");
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
  
      addLog(`[Project] Uploading ${itemsToUpload.length} selected library assets to project...`);
      await performMoveOrCopy(itemsToUpload, 'project', 'library');
    } catch(err) {
      addLog(`[Error] Upload failed: ${err}`);
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
    } catch(err) {
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
      setUploadedImages(prev => ({ ...prev, [name]: url }));

      // Optimistically add to localAssets regardless of library state
      // (Since we fetchStatus 1s later anyway)
      setLocalAssets(prev => {
          if (!isLibrary && type === 'back' && replaceBack) {
              return prev.filter(asset => asset.type !== 'back').concat({name, type, view: isLibrary ? 'library' : 'project'});
          }
          return [...prev, {name, type, view: isLibrary ? 'library' : 'project'}];
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

  const performMoveOrCopy = async (items: string[], destination: 'project' | 'library', source: 'library' | 'project' | 'plugins', conflictResolution: 'check' | 'keep' | 'replace' = 'check', backResolution: 'check' | 'keep' | 'replace' = 'check') => {
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
                body: JSON.stringify({ identity: finalItems[i], destination, source, clearBackFirst: clearBackFirst && i === 0 })
             });
             const data = await res.json();
             if (data.results) {
                 data.results.forEach((r: any) => {
                     addLog(`[Action: Move/Copy] ${r.from} -> ${r.to} (Success)`);
                 });
                 allResults = allResults.concat(data.results.map((r: any) => `${finalItems[i].split(':')[0]}:${r.name}`));
             }
         } catch(e) { }
      }
      
      if (allResults.length > 0) {
         setFileUndoStack(prev => [...prev, { action: 'import', items: allResults, destination }]);
      }
      
      const actionStr = destination === 'project' ? 'added' : 'copied';
      setTaskProgress({ current: finalItems.length, total: finalItems.length, message: `${finalItems.length} card${finalItems.length === 1 ? '' : 's'} ${actionStr}` });
      await fetchStatus();
      setSelectedAssets(new Set());
      setContextMenu(null);
      setTimeout(() => setTaskProgress(null), 1500);
      addLog(`[System] Moved ${finalItems.length} cards to ${destination}.`);
  };

  const saveProject = async () => {
    if (!saveName) return;
    setTaskProgress({ current: 1, total: 1, message: `Saving project '${saveName}'...` });
    addLog(`[Project] Saving current assets as '${saveName}'...`);
    try {
      const res = await fetch('/api/project/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: saveName })
      });
      const data = await res.json();
      if (data.success) {
        addLog(`[Project] Success: ${data.message}`);
        setLoadedProject(saveName);
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

  const deleteProject = async (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
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
    } catch(err) {
      addLog(`[Error] Failed to delete project: ${err}`);
    }
  };

  const exportProject = () => {
    addLog("[Project] Exporting project to file...");
    window.open('/api/project/export', '_blank');
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

        if (itemsToUpload.length === 0) {
          addLog(`[Error] Imported JSON contains no items.`);
          return;
        }

        setTaskProgress({ current: 1, total: 1, message: "Importing project assets..." });
        
        const res = await fetch('/api/project/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: itemsToUpload })
        });
        const result = await res.json();
        
        if (result.success) {
          addLog(`[Project] Successfully imported project JSON (${itemsToUpload.length} items).`);
          await fetchStatus();
        } else {
          addLog(`[Error] Failed to import: ${result.error}`);
        }
      } catch (err) {
        addLog(`[Error] Invalid JSON format uploaded`);
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
    <div className="flex h-screen bg-[#0a0a0c] text-[#e1e1e6] font-sans selection:bg-primary-500/30 overflow-hidden">
      <ErrorBanner logs={logs} />
      <AnimatePresence>
        {isProcessing && (
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

        {taskProgress && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-[1000] flex items-center gap-4 p-4 bg-[#0f0f13] rounded-2xl border border-primary-500/30 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)] min-w-[300px]"
          >
              {taskProgress.total <= 1 && taskProgress.current === 0 ? (
               <Loader2 className="w-10 h-10 text-primary-500 animate-spin flex-none" />
             ) : (
               <div className="relative">
                 <svg className="w-10 h-10 transform -rotate-90">
                   <circle cx="20" cy="20" r="18" className="stroke-white/10 flex-none" strokeWidth="4" fill="none" />
                   <circle cx="20" cy="20" r="18" className="stroke-primary-500 transition-all duration-300" strokeWidth="4" fill="none" strokeDasharray={113} strokeDashoffset={113 - (113 * ((taskProgress.total - taskProgress.current === 0 ? 1 : taskProgress.current) / (taskProgress.total === 0 ? 1 : taskProgress.total)))} />
                 </svg>
                 <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
                   {taskProgress.current}/{taskProgress.total}
                 </span>
               </div>
             )}
             <div className="flex flex-col flex-1 pl-2">
               <span className="text-sm font-bold text-white/90">{taskProgress.message}</span>
             </div>
             {activeTaskController && (
               <button
                 onClick={() => activeTaskController.abort()}
                 className="px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg text-xs font-bold transition-colors shrink-0"
               >
                 Cancel
               </button>
             )}
          </motion.div>
        )}

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
                  <span className="text-emerald-400 font-mono text-[10px]">Found 3.10</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/40 text-[10px]">Version</span>
                  <span className="text-white/80 font-mono text-[10px]">v{status?.version || '1.0.5'}</span>
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
                  className="w-full flex flex-col group transition-all"
                >
                  <div className="flex items-center justify-between text-xs text-white/40 group-hover:text-amber-400 transition-colors">
                    <span className="font-semibold">Donate to Alan Cha</span>
                    <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <span className="text-[10px] text-white/20 mt-0.5">SCM Creator</span>
                </a>
                <a 
                  href="https://www.paypal.com/donate/?business=YB3JBRNMXGUWG&no_recurring=0&item_name=Thanks+for+supporting+SCMUI%21&currency_code=USD" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full flex flex-col group transition-all"
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
            {activeTab === 'assets' && assetViewMode === 'library' && (
              <div className="hidden sm:flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-white/5">
                <button 
                  onClick={handleUndo}
                  disabled={fileUndoStack.length === 0}
                  className="p-1.5 hover:bg-white/10 rounded-md transition-all text-white/40 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent"
                  title="Undo (Ctrl+Z)"
                >
                  <RotateCcw size={16} />
                </button>
                <button 
                  onClick={handleRedo}
                  disabled={true}
                  className="p-1.5 hover:bg-white/10 rounded-md transition-all text-white/40 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent"
                  title="Redo (Ctrl+Y)"
                >
                  <RotateCcw size={16} className="transform -scale-x-100" />
                </button>
              </div>
            )}
            
            {pdfReady && (
              <div className="flex items-center gap-1.5 md:gap-2">
                <a 
                  href="/api/project/download-pdf" 
                  download="game.pdf"
                  className="flex items-center gap-2 px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-semibold transition-all active:scale-95"
                  title="Download PDF"
                >
                  <Download size={14} />
                  <span className="hidden md:inline">Download PDF</span>
                </a>
                <a 
                  href="/api/project/download-zip" 
                  download="game_output.zip"
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/20 rounded-lg text-xs font-semibold transition-all active:scale-95"
                  title="Download Output (ZIP)"
                >
                  <Download size={14} />
                  <span className="hidden md:inline">ZIP</span>
                </a>
              </div>
            )}
            <button 
              onClick={generatePDF}
              className="flex items-center gap-2 px-3 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-xs font-semibold transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:shadow-none"
            >
              <Play size={14} className="fill-current" />
              <span className="hidden sm:inline">Generate PDF</span>
            </button>
            <div className="h-4 w-px bg-white/10 mx-1 md:mx-2" />
            <button onClick={() => setShowThemeSettings(true)} className="text-white/40 hover:text-white transition-colors p-1">
              <Settings size={18} />
            </button>
          </div>
        </header>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 relative min-h-0">
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
                      <button 
                        onClick={() => window.open('https://alan-cha.github.io/silhouette-card-maker/tutorial/', '_blank')}
                        className="px-6 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl font-semibold border border-white/10 transition-all flex items-center gap-2 text-white/80"
                      >
                        <Book size={18} />
                        Tutorial Guide
                      </button>
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
                    <h2 className="text-3xl font-bold tracking-tight">PDF Generator</h2>
                    <p className="text-white/40 leading-relaxed">Configure the layout engine with precise CLI arguments. Every change here updates the underlying command string.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* General Settings */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-primary-400">General Settings</h4>
                      <SelectGroup 
                        label="Card Size" 
                        value={cmdOptions.card_size} 
                        onChange={(v) => setCmdOptions(p => ({...p, card_size: v}))}
                        options={['standard', 'poker', 'bridge', 'american_mini', 'japanese', 'tarot']} 
                      />
                      <SelectGroup 
                        label="Paper Size" 
                        value={cmdOptions.paper_size} 
                        onChange={(v) => setCmdOptions(p => ({...p, paper_size: v}))}
                        options={['letter', 'tabloid', 'a4', 'a3']} 
                      />
                      <SelectGroup 
                        label="Registration" 
                        value={cmdOptions.registration} 
                        onChange={(v) => setCmdOptions(p => ({...p, registration: v}))}
                        options={['3', '4']} 
                      />
                    </div>

                    {/* Rendering Settings */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-primary-400">Rendering</h4>
                      <SelectGroup 
                        label="Fit Strategy" 
                        value={cmdOptions.fit} 
                        onChange={(v) => setCmdOptions(p => ({...p, fit: v}))}
                        options={['stretch', 'crop']} 
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5 flex-1">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-white/30">PPI</label>
                          <input 
                            type="number" 
                            value={cmdOptions.ppi} 
                            onChange={(e) => setCmdOptions(p => ({...p, ppi: parseInt(e.target.value) || 300}))}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs focus:border-primary-500 transition-all font-mono"
                          />
                        </div>
                        <div className="space-y-1.5 flex-1">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-white/30">Quality</label>
                          <input 
                            type="number" 
                            value={cmdOptions.quality} 
                            onChange={(e) => setCmdOptions(p => ({...p, quality: parseInt(e.target.value) || 100}))}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs focus:border-primary-500 transition-all font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Advanced Options */}
                    <div className="flex flex-col gap-4 md:col-span-2 pt-2">
                      <div 
                        className="flex items-center gap-2 cursor-pointer select-none group w-fit"
                        onClick={() => setIsAdvancedCollapsed(!isAdvancedCollapsed)}
                      >
                        <h4 className="text-xs font-bold uppercase tracking-widest text-primary-400 group-hover:text-primary-300 transition-colors">Advanced</h4>
                        <ChevronDown size={14} className={cn("text-primary-400 transition-transform duration-300", !isAdvancedCollapsed && "rotate-180")} />
                      </div>
                      
                      <AnimatePresence>
                        {!isAdvancedCollapsed && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                             <div className="grid grid-cols-2 md:grid-cols-8 gap-4 pb-2 px-1">
                                <div className="space-y-1.5 col-span-1 md:col-span-2">
                                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 whitespace-nowrap block">Crop Backs (mm)</label>
                                  <input 
                                    type="text" 
                                    value={cmdOptions.crop_backs} 
                                    onChange={(e) => setCmdOptions(p => ({...p, crop_backs: e.target.value}))} 
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs focus:border-primary-500 transition-all font-mono" 
                                  />
                                </div>
                                <div className="space-y-1.5 col-span-1 md:col-span-2">
                                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 whitespace-nowrap block">Extend (px)</label>
                                  <input 
                                    type="number" 
                                    value={cmdOptions.extend_corners} 
                                    onChange={(e) => setCmdOptions(p => ({...p, extend_corners: parseInt(e.target.value) || 0}))} 
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs focus:border-primary-500 transition-all font-mono" 
                                  />
                                </div>
                                <div className="space-y-1.5 col-span-1 md:col-span-1">
                                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 whitespace-nowrap block">Skip</label>
                                  <input 
                                    type="number" 
                                    value={cmdOptions.skip} 
                                    onChange={(e) => setCmdOptions(p => ({...p, skip: e.target.value}))} 
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs focus:border-primary-500 transition-all font-mono" 
                                  />
                                </div>
                                <div className="space-y-1.5 col-span-1 md:col-span-3">
                                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 whitespace-nowrap block">Label</label>
                                  <input 
                                    type="text" 
                                    value={cmdOptions.label} 
                                    onChange={(e) => setCmdOptions(p => ({...p, label: e.target.value}))} 
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs focus:border-primary-500 transition-all font-mono" 
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
                      className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2 cursor-pointer select-none"
                      onClick={() => setIsCalibrationCollapsed(!isCalibrationCollapsed)}
                    >
                      <div className="space-y-1">
                        <h4 className="font-bold text-amber-500 flex items-center gap-2 text-xl tracking-tight">
                          <Layers size={20} />
                          Calibration
                        </h4>
                        <a 
                          href="https://alan-cha.github.io/silhouette-card-maker/docs/offset/" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-white/40 hover:text-primary-400 transition-colors underline underline-offset-4 decoration-white/10 hover:decoration-primary-400 block"
                        >
                          Adjust for printer misalignment
                        </a>
                      </div>
                      <div className="flex items-center gap-4">
                        {!isCalibrationCollapsed && (
                          <div className="w-full md:w-32 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                            <label className="text-[10px] font-bold uppercase tracking-widest text-white/20 px-1">Paper Size</label>
                            <div className="relative group">
                              <select 
                                value={calibration.sheet}
                                onChange={(e) => setCalibration(p => ({ ...p, sheet: e.target.value }))}
                                className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-amber-500/50 focus:bg-white/[0.05] transition-all text-white/80 appearance-none cursor-pointer hover:bg-white/5 shadow-inner"
                              >
                                {CALIBRATION_SHEETS.map((opt, i) => <option key={`${opt.value}-${i}`} value={opt.value} className="bg-[#0f0f13]">{opt.label}</option>)}
                              </select>
                              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none group-hover:text-amber-400/50 transition-colors" />
                            </div>
                          </div>
                        )}
                        <button 
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
                            <div className="w-6 h-6 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[10px] font-bold text-amber-500">1</div>
                            <h5 className="text-xs font-bold text-white/60">Initial Print</h5>
                          </div>
                          <p className="text-[10px] text-white/30 leading-relaxed min-h-[32px]">Print the blank calibration grid to determine physical shifts.</p>
                          <button 
                            onClick={() => {
                              addLog(`[System] Opening calibration sheet: ${calibration.sheet}`);
                              window.open(`/api/project/export?file=calibration/${calibration.sheet}`, '_blank');
                            }}
                            className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold transition-all text-white/80"
                          >
                            Print Calibration Sheet
                          </button>
                        </div>

                        {/* Step 2 */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[10px] font-bold text-amber-500">2</div>
                            <h5 className="text-xs font-bold text-white/60">Adjust Offsets</h5>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[9px] uppercase font-bold text-white/30">X (mm)</label>
                              <input 
                                type="number" 
                                value={calibration.x} 
                                onChange={(e) => setCalibration(p => ({ ...p, x: parseInt(e.target.value) || 0 }))}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white/70 font-mono" 
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] uppercase font-bold text-white/30">Y (mm)</label>
                              <input 
                                type="number" 
                                value={calibration.y} 
                                onChange={(e) => setCalibration(p => ({ ...p, y: parseInt(e.target.value) || 0 }))}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white/70 font-mono" 
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase font-bold text-white/30">Angle (Deg)</label>
                            <input 
                              type="number" 
                              step="0.1"
                              value={calibration.angle} 
                              onChange={(e) => setCalibration(p => ({ ...p, angle: parseFloat(e.target.value) || 0 }))}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white/70 font-mono" 
                            />
                          </div>
                        </div>

                        {/* Step 3 */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[10px] font-bold text-amber-500">3</div>
                            <h5 className="text-xs font-bold text-white/60">Verify & Save</h5>
                          </div>
                          <div className="space-y-2">
                            <button 
                               onClick={() => runCommand('offset_pdf.py', [
                                 '--x_offset', calibration.x.toString(),
                                 '--y_offset', calibration.y.toString(),
                                 '--angle', calibration.angle.toString(),
                                 '--save'
                               ], { startMessage: 'Saving offset...' })}
                               className="w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl text-[10px] font-bold transition-all text-emerald-400"
                            >
                              Save Offset
                            </button>
                            <button 
                              onClick={() => runCommand('offset_pdf.py', [
                                '--pdf_path', `calibration/${calibration.sheet}`,
                                '--x_offset', calibration.x.toString(),
                                '--y_offset', calibration.y.toString(),
                                '--angle', calibration.angle.toString()
                              ], { startMessage: 'Generating offset sheet...' })}
                              className="w-full py-2 bg-primary-600/10 hover:bg-primary-600/20 border border-primary-500/20 rounded-xl text-[10px] font-bold transition-all text-primary-400"
                            >
                              Generate Offset Sheet
                            </button>
                            <button 
                               onClick={() => {
                                 addLog(`[System] Opening verification PDF: ${calibration.sheet.replace('.pdf', '_offset.pdf')}`);
                                 window.open(`/api/project/export?file=calibration/${calibration.sheet.replace('.pdf', '_offset.pdf')}`, '_blank');
                               }}
                               className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold transition-all"
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
                    <h3 className="font-bold mb-6 flex items-center gap-2">
                      <Terminal size={18} className="text-primary-400" />
                      Live Command Build
                    </h3>
                    <div className="p-4 bg-black/40 rounded-xl font-mono text-[11px] text-emerald-400 leading-relaxed border border-white/5 mb-8">
                       python create_pdf.py <br />
                       --card_size {cmdOptions.card_size} <br />
                       --paper_size {cmdOptions.paper_size} <br />
                       --registration {cmdOptions.registration} <br />
                       --fit {cmdOptions.fit} <br />
                       --ppi {cmdOptions.ppi} <br />
                       --quality {cmdOptions.quality} <br />
                       {cmdOptions.load_offset && "--load_offset"} <br />
                       {cmdOptions.show_outline && "--show_outline"} <br />
                       {cmdOptions.crop && `--crop ${cmdOptions.crop}`} <br />
                       {cmdOptions.crop_backs && `--crop_backs ${cmdOptions.crop_backs}`} <br />
                       {cmdOptions.label && `--label ${cmdOptions.label}`} <br />
                       {cmdOptions.skip && `--skip ${cmdOptions.skip}`} <br />
                       {cmdOptions.extend_corners > 0 && `--extend_corners ${cmdOptions.extend_corners}`} <br />
                       {cmdOptions.output_images && "--output_images"}
                    </div>

                    <div className="space-y-4 mb-8">
                      <ToggleItem label="Show Cut Outline" checked={cmdOptions.show_outline} onChange={(v) => setCmdOptions(p => ({...p, show_outline: v}))} />
                      <ToggleItem label="Only Fronts" checked={cmdOptions.only_fronts} onChange={(v) => setCmdOptions(p => ({...p, only_fronts: v}))} />
                      <ToggleItem label="Output Images" checked={cmdOptions.output_images} onChange={(v) => setCmdOptions(p => ({...p, output_images: v}))} />
                    </div>

                    {pdfReady && (
                      <div className="flex gap-2 mb-4">
                        <a 
                          href="/api/project/download-pdf" 
                          download="game.pdf"
                          className="flex-1 py-4 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/20 text-emerald-400 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all active:scale-95 cursor-pointer"
                        >
                          <Download size={20} />
                          Download PDF
                        </a>
                        <a 
                          href="/api/project/download-zip" 
                          download="game_output.zip"
                          className="flex-1 py-4 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/20 text-blue-400 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all active:scale-95 cursor-pointer"
                          title="Download ZIP of all output files"
                        >
                          <Download size={20} />
                          ZIP
                        </a>
                      </div>
                    )}
                    <button 
                      onClick={generatePDF}
                      className="w-full py-4 bg-primary-600 hover:bg-primary-500 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-md transition-all active:scale-95"
                    >
                      <Play size={20} fill="currentColor" />
                      Generate PDF
                    </button>

                    <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
                      <h4 className="text-sm font-bold text-white/80 mb-2">Cutting Templates</h4>
                      <p className="text-xs text-white/40 pb-2">Templates matching your selected paper and card size.</p>
                      <div className="flex gap-2">
                         <a 
                           href={`/api/cutting-template?paper_size=${cmdOptions.paper_size}&card_size=${cmdOptions.card_size}&format=studio3`}
                           className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold transition-all text-center text-white/60 hover:text-white"
                         >
                           Download .studio3
                         </a>
                         <a 
                           href={`/api/cutting-template?paper_size=${cmdOptions.paper_size}&card_size=${cmdOptions.card_size}&format=dxf`}
                           className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold transition-all text-center text-white/60 hover:text-white"
                         >
                           Download .dxf
                         </a>
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
                          onClick={() => setShowSaveModal(true)}
                          className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold transition-all text-white/60 hover:text-white active:scale-95"
                          title="Save Project State"
                        >
                          <Copy size={14} />
                          Save
                        </button>
                        <button 
                          onClick={() => setShowLoadModal(true)}
                          className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold transition-all text-white/60 hover:text-white active:scale-95"
                          title="Load Project State"
                        >
                          <FolderOpen size={14} />
                          Load
                        </button>
                        <input 
                           type="file" 
                           accept=".json" 
                           className="hidden" 
                           ref={importProjectRef} 
                           onChange={handleImportProject} 
                        />
                        <button 
                          onClick={() => importProjectRef.current?.click()}
                          className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold transition-all text-white/60 hover:text-white active:scale-95"
                          title="Import Project JSON"
                        >
                          <PlusCircle size={14} />
                          Import
                        </button>
                        <button 
                          onClick={exportProject}
                          className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold transition-all text-white/60 hover:text-white active:scale-95"
                          title="Export Project JSON"
                        >
                          <Download size={14} />
                          Export
                        </button>
                        {(status?.assets?.fronts?.length > 0 || status?.assets?.backs?.length > 0) && (
                          <button 
                            onClick={clearProject}
                            className="flex items-center gap-2 px-3 py-2 bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/20 rounded-lg text-xs font-bold transition-all text-rose-500 active:scale-95"
                            title="Clear Project Assets"
                          >
                            <Trash2 size={14} />
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

                      <button 
                        onClick={fetchStatus}
                        className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/40 hover:text-white transition-all shadow-inner shrink-0"
                        title="Refresh Assets"
                      >
                        <RefreshCw size={16} className={cn(isProcessing && "animate-spin")} />
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
                          min="120"
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
                            <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 block mb-2">Integration</label>
                            <div className="relative">
                              <select
                                 value={pluginState.selectedPlugin.id}
                                 onChange={(e) => {
                                   const p = PLUGINS.find(pl => pl.id === e.target.value)!;
                                   setPluginState({ ...pluginState, selectedPlugin: p, format: p.formats[0], options: {} });
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
                            <SelectGroup 
                              label="Format"
                              value={pluginState.format} 
                              onChange={(v) => setPluginState(prev => ({ ...prev, format: v }))}
                              options={pluginState.selectedPlugin.formats} 
                            />
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
                                        <div className="space-y-1.5">
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
                              <div className="flex gap-1" style={{ zoom: 0.85 }}>
                                <button onClick={() => setShowPluginSaveModal(true)} className="px-2 py-0.5 text-xs font-bold text-white/50 hover:text-white hover:bg-white/10 rounded-md transition-all">Save</button>
                                <button onClick={() => setShowPluginLoadModal(true)} className="px-2 py-0.5 text-xs font-bold text-white/50 hover:text-white hover:bg-white/10 rounded-md transition-all">Load</button>
                                <button onClick={exportPluginConfig} className="px-2 py-0.5 text-xs font-bold text-white/50 hover:text-white hover:bg-white/10 rounded-md transition-all">Export</button>
                              </div>
                            </div>
                          </div>
                          <textarea 
                            value={pluginState.decklist}
                            onChange={(e) => setPluginState(prev => ({ ...prev, decklist: e.target.value }))}
                            placeholder={pluginState.format === 'url' || pluginState.format.includes('url') || pluginState.format === 'elestrals' || pluginState.format === 'ydke' ? "Paste URL or Code here..." : "Paste decklist items here (e.g. 4x Lightning Bolt)..."}
                            className="flex-1 w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm font-mono focus:outline-none focus:border-primary-500 transition-all resize-none shadow-inner min-h-[160px] mb-4"
                          />

                          {FORMAT_HINTS[pluginState.format] && (
                            <div className="mb-4 text-xs text-white/50 bg-white/[0.02] border border-white/5 rounded-xl p-3 flex items-start gap-2.5">
                              <AlertCircle size={14} className="text-primary-400 mt-0.5 shrink-0" />
                              <div className="space-y-1">
                                <span className="font-bold text-white/70 block uppercase tracking-wider text-[10px]">Format Guideline</span>
                                <p className="leading-relaxed">{FORMAT_HINTS[pluginState.format]}</p>
                              </div>
                            </div>
                          )}

                          <button 
                            onClick={async () => {
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

                              // 2. Build and run command
                              const isDirectInput = pluginState.format === 'url' || pluginState.format.includes('url') || pluginState.format === 'elestrals' || pluginState.format === 'ydke';
                              const targetInput = isDirectInput ? pluginState.decklist.trim() : `game/decklist/current.txt`;
                              const args = [targetInput, pluginState.format];
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
                              
                              const tempDirId = crypto.randomUUID();
                              const result = await runCommand(`plugins/${pluginState.selectedPlugin.id}/fetch.py`, args, {
                                startMessage: `Fetching artwork for ${pluginState.selectedPlugin.name}...`,
                                hideProgressOnComplete: true,
                                tempDirId
                              });
                              
                              if (result && result.fetchedFiles) {
                                  const collisions = [];
                                  const { fronts, backs, double_sided } = result.fetchedFiles;
                                  
                                  const targetFronts = status?.plugins?.fronts || [];
                                  const targetBacks = status?.plugins?.backs || [];
                                  const targetDob = status?.plugins?.double_sided || [];
                                  
                                  fronts.forEach(f => { if(targetFronts.includes(f)) collisions.push(`front:${f}`); });
                                  backs.forEach(f => { if(targetBacks.includes(f)) collisions.push(`back:${f}`); });
                                  double_sided.forEach(f => { if(targetDob.includes(f)) collisions.push(`double_sided:${f}`); });
                                  
                                  if (collisions.length > 0) {
                                      setTaskProgress(null);
                                      setFetchConflictData({ tempDirId, collisions, resolutions: {} });
                                  } else {
                                      setTaskProgress({ current: 1, total: 1, message: 'Committing fetch...' });
                                      await fetch('/api/plugin/fetch-commit', {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ tempDirId, resolutions: {} })
                                      });
                                      await fetchStatus();
                                      setTaskProgress(null);
                                  }
                              } else {
                                setTaskProgress(null);
                              }
                            }}
                            className="w-full py-4 bg-primary-600 hover:bg-primary-500 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary-600/20 transition-all active:scale-95 text-lg"
                          >
                            <Download size={20} />
                            Sync Artwork
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
                        disabled={assetViewMode === 'plugins'}
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
                          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCollapsedSections(s => ({...s, backs: !s.backs}))}>
                            <div className="p-2 bg-amber-500/20 rounded-lg text-amber-500 shadow-inner">
                              <ImageIcon size={18} />
                            </div>
                            <h3 className="text-sm font-bold uppercase tracking-widest text-white/60 flex items-center gap-2 select-none">
                              Back Patterns 
                              <span className="text-white/20 font-normal">
                                ({getAllAssets('back')?.length || 0})
                              </span>
                            </h3>
                          </div>
                          <button onClick={() => setCollapsedSections(s => ({...s, backs: !s.backs}))} className="p-1 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-colors">
                              <ChevronDown size={18} className={cn("transition-transform", collapsedSections.backs && "-rotate-90")} />
                          </button>
                        </div>
                        
                        {!collapsedSections.backs && (
                          <div 
                            className="grid gap-4 sm:gap-6 p-4 sm:p-6 bg-white/[0.02] border border-white/5 rounded-2xl sm:rounded-[40px] mt-6"
                            style={{ gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${cardWidth}px), 1fr))` }}
                          >
                            {assetViewMode !== 'plugins' && (
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
                            )}
                            {getAllAssets('back')
                              .filter(img => img.toLowerCase().includes(assetSearch.toLowerCase()))
                              .map((img: string, i: number) => (
                                <AssetItem 
                                  key={`b-${img}-${i}`} 
                                  name={img} 
                                  type="back" 
                                  allAssets={getCurrentAssets()} 
                                  selected={selectedAssets.has(`back:${img}`)}
                                  onContextMenu={(x, y) => setContextMenu({ x, y, name: img, type: 'back' })}
                                  onSelect={(e) => handleAssetSelect(`back:${img}`, e)}
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
                          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCollapsedSections(s => ({...s, fronts: !s.fronts}))}>
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
                          <button onClick={() => setCollapsedSections(s => ({...s, fronts: !s.fronts}))} className="p-1 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-colors">
                              <ChevronDown size={18} className={cn("transition-transform", collapsedSections.fronts && "-rotate-90")} />
                          </button>
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
                                  key={`f-${img}-${i}`} 
                                  name={img} 
                                  type="front" 
                                  allAssets={getCurrentAssets()}
                                  selected={selectedAssets.has(`front:${img}`)}
                                  onContextMenu={(x, y) => setContextMenu({ x, y, name: img, type: 'front' })}
                                  onSelect={(e) => handleAssetSelect(`front:${img}`, e)}
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
                          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCollapsedSections(s => ({...s, doubleSided: !s.doubleSided}))}>
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
                          <button onClick={() => setCollapsedSections(s => ({...s, doubleSided: !s.doubleSided}))} className="p-1 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-colors">
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
                                  key={`d-${img}-${i}`} 
                                  name={img} 
                                  type="double_sided" 
                                  allAssets={getCurrentAssets()}
                                  selected={selectedAssets.has(`double_sided:${img}`)}
                                  onContextMenu={(x, y) => setContextMenu({ x, y, name: img, type: 'double_sided' })}
                                  onSelect={(e) => handleAssetSelect(`double_sided:${img}`, e)}
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
                      {fetchConflictData.collisions.length} fetched item(s) already exist in plugin gallery.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="bg-black/40 border border-white/5 rounded-xl p-4 font-mono text-xs text-white/60 max-h-32 overflow-y-auto">
                  <ul className="space-y-1">
                    {fetchConflictData.collisions.map((c, i) => (
                      <li key={`${c}-${i}`} className="truncate">• {c.split(':')[1]}</li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={async () => {
                      const { tempDirId, collisions } = fetchConflictData;
                      setFetchConflictData(null);
                      setTaskProgress({ current: 1, total: 1, message: 'Committing fetch...' });
                      
                      const resolutions: Record<string, 'skip'> = {};
                      collisions.forEach(c => resolutions[c] = 'skip');
                      
                      await fetch('/api/plugin/fetch-commit', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ tempDirId, resolutions })
                      });
                      await fetchStatus();
                      setTaskProgress(null);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all"
                  >
                    Keep All Existing (Skip Duplicates)
                  </button>

                  <button 
                    onClick={async () => {
                      const { tempDirId } = fetchConflictData;
                      setFetchConflictData(null);
                      setTaskProgress({ current: 1, total: 1, message: 'Committing fetch...' });
                      await fetch('/api/plugin/fetch-commit', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ tempDirId, resolutions: {} })
                      });
                      await fetchStatus();
                      setTaskProgress(null);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-primary-500 hover:bg-primary-400 text-white rounded-xl font-bold transition-all"
                  >
                    Replace All Existing
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
        {showSaveModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-[#0f0f13] border border-white/10 rounded-3xl p-8 shadow-2xl space-y-6"
            >
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-white">Save Project</h3>
                <p className="text-sm text-white/40">Enter a name to save the current asset configuration.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-white/40">Project Name</label>
                  <input 
                    autoFocus
                    type="text" 
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveProject()}
                    placeholder="My Awesome Deck..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-primary-500 transition-all font-mono"
                  />
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      setShowSaveModal(false);
                      setSaveName("");
                    }}
                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold border border-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={saveProject}
                    disabled={!saveName}
                    className="flex-1 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-2xl font-bold shadow-lg shadow-primary-600/20 transition-all disabled:opacity-50"
                  >
                    Save Project
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
      </AnimatePresence>

      <AnimatePresence>
        {showPluginSaveModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-[#0f0f13] border border-white/10 rounded-3xl p-8 shadow-2xl space-y-6"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary-600/10 rounded-2xl text-primary-400">
                  <Copy size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Save Plugin Config</h3>
                  <p className="text-sm text-white/40">Persist your decklist and options.</p>
                </div>
              </div>

              <div className="space-y-4">
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Configuration name..."
                  value={pluginSaveName}
                  onChange={(e) => setPluginSaveName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && savePluginConfig()}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500 transition-all font-mono"
                />
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowPluginSaveModal(false)}
                  className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold border border-white/10 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button 
                  onClick={savePluginConfig}
                  className="flex-1 py-4 bg-primary-600 hover:bg-primary-500 text-white rounded-2xl font-bold shadow-lg shadow-primary-600/20 transition-all active:scale-95"
                >
                  Save Global
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPluginLoadModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-[#0f0f13] border border-white/10 rounded-3xl p-8 shadow-2xl space-y-6"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary-600/10 rounded-2xl text-primary-400">
                  <FolderOpen size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Load Plugin Config</h3>
                  <p className="text-sm text-white/40">Select a previously saved configuration.</p>
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {Object.keys(pluginConfigs).length > 0 ? (
                  Object.keys(pluginConfigs).map((name, idx) => (
                    <div
                      key={`${name}-${idx}`}
                      className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-xl transition-all group gap-2"
                    >
                      <button
                        onClick={() => loadPluginConfig(name)}
                        className="flex-1 text-left flex items-center justify-between outline-none"
                      >
                        <span className="font-semibold text-white/80 group-hover:text-white break-all pr-4">{name}</span>
                        <ChevronRight size={14} className="text-white/20 group-hover:text-white/60 translate-x-0 group-hover:translate-x-1 transition-all" />
                      </button>
                      <button 
                        onClick={(e) => deletePluginConfig(e, name)}
                        className="p-2 text-white/20 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors"
                        title="Delete Configuration"
                      >
                         <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-white/20 text-xs font-bold uppercase tracking-widest">
                    No configurations found
                  </div>
                )}
              </div>

              <button 
                onClick={() => setShowPluginLoadModal(false)}
                className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold border border-white/10 transition-all active:scale-95"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
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
              className="w-full max-w-sm bg-[#0f0f13] border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col max-h-[90vh]"
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
                        <span className="text-sm text-white/60 group-hover:text-amber-400 font-medium transition-colors">Original SCM Engine</span>
                        <span className="text-[10px] text-white/40">Python Backend Logic</span>
                      </div>
                      <ExternalLink size={16} className="text-white/40 group-hover:text-amber-400 transition-colors" />
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
                </div>
              )}

              <button 
                onClick={() => setShowThemeSettings(false)}
                className="w-full py-4 text-white bg-white/5 hover:bg-white/10 transition-all font-bold rounded-2xl shrink-0"
              >
                Done
              </button>
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
        {showLoadModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-[#0f0f13] border border-white/10 rounded-3xl p-8 shadow-2xl space-y-6"
            >
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-white">Load Project</h3>
                <p className="text-sm text-white/40">Select a saved configuration to restore.</p>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {(status?.savedProjects && status.savedProjects.length > 0) ? (
                  status.savedProjects.map((name, idx) => (
                    <div
                      key={`${name}-${idx}`}
                      className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-xl transition-all group gap-2"
                    >
                      <button
                        onClick={() => loadProject(name)}
                        className="flex-1 text-left flex items-center justify-between outline-none"
                      >
                        <span className="font-bold text-white/80 group-hover:text-white break-all pr-4">{name}</span>
                        <ChevronRight size={16} className="text-white/20 group-hover:text-primary-400 group-hover:translate-x-1 transition-all" />
                      </button>
                      <button 
                        onClick={(e) => deleteProject(e, name)}
                        className="p-2 text-white/20 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors"
                        title="Delete Project"
                      >
                         <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-white/20 border-2 border-dashed border-white/5 rounded-2xl">
                    No saved projects found.
                  </div>
                )}
              </div>

              <button 
                onClick={() => setShowLoadModal(false)}
                className="w-full py-4 text-white/40 hover:text-white transition-all font-bold"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            style={{ 
              top: contextMenu.y, 
              left: contextMenu.x,
              transform: 'translate(-50%, -100%)' // Center horizontally and place above cursor
            }}
            className="fixed z-[100] pointer-events-auto flex flex-col items-stretch gap-0.5 p-1.5 bg-[#1a1b23]/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)] min-w-[180px]"
          >
            {(!contextMenu.type || contextMenu.type !== 'back') && (
              <button 
                onClick={async (e) => {
                  e.stopPropagation();
                  const identity = contextMenu.type ? `${contextMenu.type}:${contextMenu.name}` : contextMenu.name;
                  const targets = selectedAssets.size > 0 && selectedAssets.has(identity) ? Array.from(selectedAssets) : [identity];
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
                    } catch(err) {
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
                className="w-full h-9 px-3 hover:bg-white/5 text-white rounded-lg flex items-center gap-3 transition-all active:scale-95 group"
              >
                <Copy size={16} className="text-white/40 group-hover:text-white shrink-0" />
                <span className="font-bold text-xs">Duplicate</span>
              </button>
            )}

            {assetViewMode === 'library' && (
              <>
                <div className="h-[1px] w-full bg-white/10 my-1" />
                <button 
                  onClick={async (e) => {
                    e.stopPropagation();
                    const identity = contextMenu.type ? `${contextMenu.type}:${contextMenu.name}` : contextMenu.name;
                    const targets = selectedAssets.size > 0 && selectedAssets.has(identity) ? Array.from(selectedAssets) : [identity];
                    await performMoveOrCopy(targets, 'project', 'library');
                  }}
                  className="w-full h-9 px-3 hover:bg-white/5 text-white rounded-lg flex items-center gap-3 transition-all active:scale-95 group"
                >
                  <PlusCircle size={16} className="text-white/40 group-hover:text-white shrink-0" />
                  <span className="font-bold text-xs">Add to Project</span>
                </button>
              </>
            )}

            {assetViewMode === 'project' && (
              <>
                <div className="h-[1px] w-full bg-white/10 my-1" />
                <button 
                  onClick={async (e) => {
                    e.stopPropagation();
                    const identity = contextMenu.type ? `${contextMenu.type}:${contextMenu.name}` : contextMenu.name;
                    const targets = selectedAssets.size > 0 && selectedAssets.has(identity) ? Array.from(selectedAssets) : [identity];
                    await performMoveOrCopy(targets, 'library', 'project');
                  }}
                  className="w-full h-9 px-3 hover:bg-white/5 text-white rounded-lg flex items-center gap-3 transition-all active:scale-95 group"
                >
                  <ImageIcon size={16} className="text-white/40 group-hover:text-white shrink-0" />
                  <span className="font-bold text-xs">Add to Library</span>
                </button>
              </>
            )}

            {assetViewMode === 'plugins' && (
              <>
                <div className="h-[1px] w-full bg-white/10 my-1" />
                <button 
                  onClick={async (e) => {
                    e.stopPropagation();
                    const identity = contextMenu.type ? `${contextMenu.type}:${contextMenu.name}` : contextMenu.name;
                    const targets = selectedAssets.size > 0 && selectedAssets.has(identity) ? Array.from(selectedAssets) : [identity];
                    await performMoveOrCopy(targets, 'project', 'plugins');
                  }}
                  className="w-full h-9 px-3 hover:bg-white/5 text-white rounded-lg flex items-center gap-3 transition-all active:scale-95 group"
                >
                  <PlusCircle size={16} className="text-white/40 group-hover:text-white shrink-0" />
                  <span className="font-bold text-xs">Add to Project</span>
                </button>

                <div className="h-[1px] w-full bg-white/10 my-1" />
                <button 
                  onClick={async (e) => {
                    e.stopPropagation();
                    const identity = contextMenu.type ? `${contextMenu.type}:${contextMenu.name}` : contextMenu.name;
                    const targets = selectedAssets.size > 0 && selectedAssets.has(identity) ? Array.from(selectedAssets) : [identity];
                    await performMoveOrCopy(targets, 'library', 'plugins');
                  }}
                  className="w-full h-9 px-3 hover:bg-white/5 text-white rounded-lg flex items-center gap-3 transition-all active:scale-95 group"
                >
                  <ImageIcon size={16} className="text-white/40 group-hover:text-white shrink-0" />
                  <span className="font-bold text-xs">Add to Library</span>
                </button>
              </>
            )}

            {true && (
              <div className="h-[1px] w-full bg-white/10 my-1" />
            )}

            <button 
              onClick={(e) => {
                e.stopPropagation();
                const currentAssets = getCurrentAssets();
                const toSelect = new Set<string>();
                if (currentAssets?.fronts) {
                  currentAssets.fronts.forEach(f => toSelect.add(`front:${f}`));
                }
                setSelectedAssets(toSelect);
                setContextMenu(null);
                addLog(`[System] Selected all front ${assetViewMode} assets.`);
              }}
              className="w-full h-9 px-3 hover:bg-white/5 text-white rounded-lg flex items-center gap-3 transition-all active:scale-95 group"
            >
              <CheckSquare size={16} className="text-white/40 group-hover:text-white shrink-0" />
              <span className="font-bold text-xs">Select All</span>
            </button>

            {true && (
              <>
                <div className="h-[1px] w-full bg-white/10 my-1" />

                <button 
                  onClick={async (e) => {
                    e.stopPropagation();
                    const identity = contextMenu.type ? `${contextMenu.type}:${contextMenu.name}` : contextMenu.name;
                    const targets = selectedAssets.size > 0 && selectedAssets.has(identity) ? Array.from(selectedAssets) : [identity];
                    
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
                      } catch(err) {
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
                  className="w-full h-9 px-3 hover:bg-rose-500/10 text-rose-400 rounded-lg flex items-center gap-3 transition-all active:scale-95 group"
                >
                  <Trash2 size={16} className="text-rose-400/40 group-hover:text-rose-400 shrink-0" />
                  <span className="font-bold text-xs">Delete</span>
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {assetViewMode === 'library' && selectedAssets.size > 0 && (
        <motion.div
           initial={{ opacity: 0, y: 50 }}
           animate={{ opacity: 1, y: 0 }}
           exit={{ opacity: 0, y: 50 }}
           className="fixed bottom-6 right-6 z-[100]"
         >
           <button 
             onClick={() => uploadToProject()}
             className="flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-sm font-bold transition-all shadow-xl shadow-primary-600/30 active:scale-95"
           >
             <Download size={16} />
             Add to Project ({selectedAssets.size})
           </button>
         </motion.div>
       )}

      <AnimatePresence>
        {enlargedImage && (
          <div 
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 md:p-8"
            onClick={() => setEnlargedImage(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative max-h-full max-w-full outline-none"
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={enlargedImage} 
                alt="Enlarged asset" 
                className="max-h-[90vh] max-w-full object-contain rounded-lg shadow-2xl" 
              />
              <button 
                className="absolute -top-4 -right-4 p-2 bg-white text-black rounded-full shadow-lg hover:scale-110 transition-transform"
                onClick={() => setEnlargedImage(null)}
              >
                <X size={20} />
              </button>
            </motion.div>
          </div>
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
     </div>
  );
}

// Subcomponents
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

function SelectGroup({ label, value, options, onChange }: { label: string, value: string, options: string[], onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5 flex-1">
      <label className="text-[10px] font-bold uppercase tracking-widest text-white/30">{label}</label>
      <div className="relative group">
        <select 
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary-500 transition-all text-white/80 appearance-none cursor-pointer hover:bg-white/10"
        >
          {options.map((opt, i) => <option key={`${opt}-${i}`} value={opt} className="bg-[#1a1a20]">{opt}</option>)}
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
  onSelect?: (e: React.MouseEvent) => void;
  onEnlarge?: (src: string) => void;
  isFlipped?: boolean;
  onToggleFlip?: (e: React.MouseEvent) => void;
  uploadedImages?: Record<string, string>;
  addLog?: (log: string) => void;
  assetViewMode: 'library' | 'project' | 'plugins';
  cardDimming?: 'none' | 'tint' | 'dark';
}

const AssetItem: React.FC<AssetItemProps> = ({ name, type, allAssets, onContextMenu, selected, onSelect, onEnlarge, isFlipped, onToggleFlip, uploadedImages, addLog, assetViewMode, cardDimming = 'tint' }) => {

  
  const getBaseUrl = () => {
    if (assetViewMode === 'library') return '/library';
    if (assetViewMode === 'plugins') return '/plugins_staging';
    return '/game';
  };

  const getImgSrc = () => {
    // 1. If we have a blob URL from a recent upload, use it.
    if (uploadedImages?.[name]) {
      addLog?.(`AssetItem Debug: ${name} FOUND in uploadedImages.`);
      return uploadedImages[name];
    }
    
    const baseUrl = getBaseUrl();
    // 2. Determine base path based on type/double-sided status
    if (type === 'back') {
      return `${baseUrl}/back/${name}`;
    }
    
    // 3. For front faces & double-sided faces, verify where the front face image is
    const isDoubleSided = type === 'double_sided' || allAssets?.double_sided?.includes(name);
    if (isDoubleSided) {
      const hasFrontOnDisk = allAssets?.fronts?.includes(name);
      if (hasFrontOnDisk) {
        return `${baseUrl}/front/${name}`;
      } else {
        return `${baseUrl}/double_sided/${name}`;
      }
    }
    
    // 4. Default to front
    return `${baseUrl}/front/${name}`;
  };

  const imgSrc = getImgSrc();

  const getBackFace = () => {
    if (type === 'back') return null;
    
    // Check if double sided
    const isDoubleSided = type === 'double_sided' || allAssets?.double_sided?.includes(name);
    if (isDoubleSided) {
      const hasDoubleSidedOnDisk = allAssets?.double_sided?.includes(name) || type === 'double_sided';
      if (hasDoubleSidedOnDisk && allAssets?.fronts?.includes(name)) {
        return { name, folder: 'double_sided' };
      }
      // If we only have double_sided on disk and no fronts of same name, we fallback to standard backs
      if (allAssets?.backs && allAssets.backs.length > 0) {
        return { name: allAssets.backs[allAssets.backs.length - 1], folder: 'back' };
      }
    }
    
    if (assetViewMode === 'library' || assetViewMode === 'plugins') return null;
    
    // Fallback to first back pattern
    if (allAssets?.backs && allAssets.backs.length > 0) {
      // Prioritize recently uploaded backs (the last one if multiple)
      return { name: allAssets.backs[allAssets.backs.length - 1], folder: 'back' };
    }
    
    return null;
  };

  const backFace = getBackFace();

  return (
    <div 
      className="group space-y-3"
      onContextMenu={(e) => {
        e.preventDefault();
        if (onContextMenu) {
          onContextMenu(e.clientX, e.clientY);
        }
      }}
    >
      <div 
        className={cn(
          "aspect-[2.5/3.5] relative perspective-1000",
          "cursor-pointer"
        )}
        onClick={(e) => {
          if (e.shiftKey || e.ctrlKey || e.metaKey) {
            onSelect?.(e);
          } else {
            const baseUrl = getBaseUrl();
            const backFaceFolder = getBackFace()?.folder;
            
            const enlargeSrc = isFlipped && getBackFace() 
              ? (uploadedImages?.[getBackFace()!.name] || `${baseUrl}/${backFaceFolder}/${getBackFace()!.name}`) 
              : imgSrc;
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
            className="absolute top-2 right-2 z-30 w-7 h-7 rounded-full bg-black/60 border border-white/20 text-white flex items-center justify-center transition-all shadow-md active:scale-95 hover:bg-primary-600 hover:border-primary-400 group/flip opacity-0 group-hover:opacity-100"
            title="Flip Card"
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
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
               <img 
                 src={imgSrc} 
                 alt={name}
                 loading="lazy"
                  className={cn(
                    "w-full h-full object-cover transition-opacity duration-300",
                    cardDimming === 'dark' 
                      ? "opacity-50 group-hover:opacity-100" 
                      : cardDimming === 'tint'
                        ? "opacity-75 group-hover:opacity-100"
                        : "opacity-100"
                  )}
               />
               <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
            </div>
            
             {type === 'back' && selected && (
              <div className="absolute top-2 right-2 z-20 px-2 py-0.5 bg-amber-500 rounded-full shadow-lg border border-amber-400">
                <span className="text-[8px] font-bold text-black uppercase tracking-tighter">Default</span>
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
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                {backFace ? (
                  <>
                    <img 
                      src={uploadedImages?.[backFace.name] || `${getBaseUrl()}/${backFace.folder}/${backFace.name}`}
                      alt={backFace.name}
                      loading="lazy"
                      className={cn(
                        "w-full h-full object-cover",
                        backFace?.folder === 'double_sided' ? "opacity-100" : "opacity-60"
                      )}
                    />
                    {backFace?.folder !== 'double_sided' && (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                        <div className={cn(
                          "absolute inset-4 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 border-amber-500/20 bg-amber-500/5"
                        )}>
                          <span className="text-[10px] font-bold text-white/60 uppercase tracking-tighter">
                            General Back
                          </span>
                          <p className="text-[10px] text-white/80 text-center px-4 font-mono break-all line-clamp-2">
                            {backFace?.name}
                          </p>
                        </div>
                      </>
                    )}
                  </>
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

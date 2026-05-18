import React, { useState, useEffect, useRef } from 'react';
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
  PlusCircle
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
  egman: "Egman Events formatting.",
  optcgsim: "OPTCG Sim text format.",

  // Lorcana
  dreamborn: "Dreamborn.ink text format.",

  // SWU
  melee: "Melee.gg decklist format.",
  picklist: "A simple picklist format for SWU.",
  swudb_json: "SWUDB exported JSON format.",

  // Sorcery
  curiosa_url: "Curiosa.io deck URL.",

  // Riftbound
  piltover_archive: "Piltover Archive exported text format.",
  pixelborn: "Pixelborn deck code.",
  tts: "Tabletop Simulator json format.",

  // Digimon
  digimoncard_dev: "Digimoncard.dev text output.",
  digimoncard_app: "Digimoncard.app formatted text.",

  // YGO
  ydke: "YDKE deck string format."
};

interface PluginConfig {
  id: string;
  name: string;
  formats: string[];
  options: { label: string; flag: string; type: 'toggle' | 'select'; choices?: string[] }[];
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
      { label: 'Language', flag: '--prefer_lang', type: 'select', choices: ['en', 'sp', 'fr', 'de', 'it', 'pt', 'jp', 'kr', 'ru', 'cs', 'ct', 'ag', 'ph'] }
    ]
  },
  { 
    id: 'pokemon', 
    name: 'Pokemon', 
    formats: ['limitless'],
    options: []
  },
  { 
    id: 'one_piece', 
    name: 'One Piece', 
    formats: ['egman', 'optcgsim'],
    options: []
  },
  { 
    id: 'lorcana', 
    name: 'Lorcana', 
    formats: ['dreamborn'],
    options: []
  },
  { 
    id: 'star_wars_unlimited', 
    name: 'Star Wars Unlimited', 
    formats: ['melee', 'picklist', 'swudb_json'],
    options: []
  },
  { 
    id: 'sorcery_contested_realm', 
    name: 'Sorcery: Contested Realm', 
    formats: ['curiosa_url'],
    options: []
  },
  { 
    id: 'riftbound', 
    name: 'Riftbound', 
    formats: ['piltover_archive', 'pixelborn', 'tts'],
    options: [
      { label: 'Image Source', flag: '--source', type: 'select', choices: ['piltover_archive', 'riftmana'] }
    ]
  },
  { 
    id: 'netrunner', 
    name: 'Netrunner', 
    formats: ['bbcode', 'jinteki', 'markdown', 'plain_text', 'text'],
    options: []
  },
  { 
    id: 'gundam', 
    name: 'Gundam', 
    formats: ['deckplanet', 'egman', 'exburst', 'limitless'],
    options: []
  },
  { 
    id: 'grand_archive', 
    name: 'Grand Archive', 
    formats: ['omnideck'],
    options: []
  },
  { 
    id: 'flesh_and_blood', 
    name: 'Flesh and Blood', 
    formats: ['fabrary'],
    options: []
  },
  { 
    id: 'final_fantasy', 
    name: 'Final Fantasy', 
    formats: ['octgn_xml', 'tts', 'untap'],
    options: []
  },
  { 
    id: 'elestrals', 
    name: 'Elestrals', 
    formats: ['elestrals'],
    options: []
  },
  { 
    id: 'echoes_of_astra', 
    name: 'Echoes of Astra', 
    formats: ['astrabuilder_url'],
    options: []
  },
  { 
    id: 'digimon', 
    name: 'Digimon', 
    formats: ['digimoncardapp', 'digimoncarddev', 'digimoncardio', 'digimonmeta', 'tts', 'untap'],
    options: []
  },
  { 
    id: 'ashes_reborn', 
    name: 'Ashes Reborn', 
    formats: ['ashes_share_url', 'ashesdb_share_url'],
    options: [
      { label: 'Image Source', flag: '--source', type: 'select', choices: ['ashes', 'ashesdb'] }
    ]
  },
  { 
    id: 'altered', 
    name: 'Altered', 
    formats: ['ajordat'],
    options: []
  },
  { 
    id: 'yugioh', 
    name: 'Yu-Gi-Oh!', 
    formats: ['ydke', 'ydk'],
    options: []
  },
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
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [assetViewMode, setAssetViewMode] = useState<'project' | 'library' | 'plugins'>('project');
  const [status, setStatus] = useState<AppStatus | null>(null);
  const [logs, setLogs] = useState<string[]>(["[System] Initializing Silhouette Master Virtual Bridge..."]);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Computed state
  const getCurrentAssets = () => {
    if (assetViewMode === 'project') return status?.assets;
    if (assetViewMode === 'library') return status?.library;
    if (assetViewMode === 'plugins') return status?.plugins;
    return undefined;
  };
  const [assetSearch, setAssetSearch] = useState("");
  const [assetFilter, setAssetFilter] = useState<'all' | 'front' | 'back'>('all');
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
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showPluginSaveModal, setShowPluginSaveModal] = useState(false);
  const [showPluginLoadModal, setShowPluginLoadModal] = useState(false);
  const [pluginSaveName, setPluginSaveName] = useState("");
  const [showPreFetchWarning, setShowPreFetchWarning] = useState<{ matches: string[], args: any[] } | null>(null);
  const [pluginConfigs, setPluginConfigs] = useState<Record<string, any>>({});
  const [showThemeSettings, setShowThemeSettings] = useState(false);

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
  const [currentTheme, setCurrentTheme] = useState<Theme>('indigo');
  const [pdfReady, setPdfReady] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [taskProgress, setTaskProgress] = useState<{current: number, total: number, message: string} | null>(null);
  const [importConflictData, setImportConflictData] = useState<{items: string[], destination: 'project' | 'library', source: 'library' | 'project' | 'plugins', collisions: string[]} | null>(null);
  const [fetchConflictData, setFetchConflictData] = useState<{tempDirId: string, collisions: string[], resolutions: Record<string, 'replace' | 'skip'>} | null>(null);

  useEffect(() => {
    setCurrentTheme(getTheme());
    const handleGlobalClick = () => setContextMenu(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (activeTab !== 'assets') return;
    const isInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;

    // Select All
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
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
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
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
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
      if (isInput) return;
      if (assetViewMode === 'plugins') return;
      if (copiedBuffer.length > 0) {
        addLog(`[Library] Duplicating ${copiedBuffer.length} assets from buffer...`);
        (async () => {
          try {
            for (let i = 0; i < copiedBuffer.length; i++) {
              setTaskProgress({ current: i + 1, total: copiedBuffer.length, message: `Duplicating ${copiedBuffer[i].split(':')[1]}...` });
              try {
                await fetch('/api/duplicate', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ identity: copiedBuffer[i], assetViewMode })
                });
              } catch(e) {}
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

    // Escape to Deselect
    if (e.key === 'Escape') {
      if (selectedAssets.size > 0) {
        setSelectedAssets(new Set());
        addLog("[System] Selection cleared.");
      }
    }

    // Delete
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedAssets.size > 0 && !isInput) {
        addLog(`[System] Deleting ${selectedAssets.size} selected items...`);
        
        // Use API to delete instead of clear_up.py directly
        (async () => {
          try {
            const arr = Array.from(selectedAssets) as string[];
            for (let i = 0; i < arr.length; i++) {
              setTaskProgress({ current: i + 1, total: arr.length, message: `Deleting ${arr[i].split(':')[1]}...` });
              await fetch('/api/delete', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ identity: [arr[i]], assetViewMode })
              });
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
  const [cmdOptions, setCmdOptions] = useState({
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
  });

  const [calibration, setCalibration] = useState({
    x: 0,
    y: 0,
    angle: 0.0,
    sheet: 'letter_calibration.pdf'
  });

  const CALIBRATION_SHEETS = [
    { label: 'Letter', value: 'letter_calibration.pdf' },
    { label: 'A3', value: 'a3_calibration.pdf' },
    { label: 'A4', value: 'a4_calibration.pdf' },
    { label: 'Arch B', value: 'arch_b_calibration.pdf' },
    { label: 'Tabloid', value: 'tabloid_calibration.pdf' }
  ];

  const [pluginState, setPluginState] = useState({
    selectedPlugin: PLUGINS[0],
    decklist: "",
    format: PLUGINS[0].formats[0],
    options: {} as Record<string, any>
  });

  const consoleEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

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
      serverAssets = current?.fronts || [];
    } else if (type === 'back') {
      serverAssets = current?.backs || [];
    } else if (type === 'double_sided') {
      serverAssets = current?.double_sided || [];
    }
      
    const local = localAssets.filter(a => a.type === type && a.view === assetViewMode && !serverAssets.includes(a.name)).map(a => a.name);
    
    return [...serverAssets, ...local];
  };


  const addLog = (newLogs: string | string[]) => {
    const logArray = Array.isArray(newLogs) ? newLogs : [newLogs];
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
    try {
      const res = await fetch('/api/run-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, args, tempDirId: options?.tempDirId })
      });
      if (!res.ok) {
        addLog(`[Error] Request failed with status ${res.status}`);
        setTaskProgress(prev => prev ? { ...prev, message: 'Failed.' } : null);
        setTimeout(() => setTaskProgress(null), 1500);
        return null;
      }
      const data = await res.json();
      addLog(`[Console] Output: ${data.output}`);
      
      const assets = await fetchStatus();
      
      if (!options?.hideProgressOnComplete) {
         setTaskProgress({ current: 1, total: 1, message: 'Complete.' });
         setTimeout(() => setTaskProgress(null), 1500);
      }
      
      return { output: data.output, assets, fetchedFiles: data.fetchedFiles };
    } catch (err) {
      addLog(`[Error] Execution failed: ${err}`);
      setTaskProgress(prev => prev ? { ...prev, message: 'Failed.' } : null);
      setTimeout(() => setTaskProgress(null), 1500);
      return null;
    }
  };

  const generatePDF = async () => {
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
    if (result?.output && result.output.some((line: string) => line.includes('Generated PDF'))) {
      setPdfReady(true);
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

  const clearProject = async () => {
    if (!confirm("Are you sure you want to clear all project assets? This cannot be undone.")) return;
    setTaskProgress({ current: 1, total: 1, message: `Clearing project...` });
    addLog("[Project] Clearing project assets...");
    try {
      const res = await fetch('/api/project/clear', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        addLog(`[Project] Success: ${data.message}`);
        setTaskProgress(prev => prev ? { ...prev, message: 'Cleared successfully.' } : null);
        await fetchStatus();
        setSelectedAssets(new Set());
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
      addLog(`[Uploader] Successfully uploaded ${name}`);
      await fetchStatus();
    } catch (err) {
      addLog(`[Error] File upload failed: ${err}`);
      return;
    }
  };

  const performMoveOrCopy = async (items: string[], destination: 'project' | 'library', source: 'library' | 'project' | 'plugins', conflictResolution: 'check' | 'keep' | 'replace' = 'check') => {
      let finalItems = [...items];
      const targetObj = destination === 'project' ? status?.assets : (destination === 'library' ? status?.library : undefined);
      
      if (conflictResolution === 'check') {
         if (targetObj) {
            const collisions = items.filter(item => {
                const [type, name] = item.split(':');
                if (type === 'front' && targetObj.fronts.includes(name)) return true;
                if (type === 'back' && targetObj.backs.includes(name)) return true;
                if (type === 'double_sided' && targetObj.double_sided?.includes(name)) return true;
                return false;
            });
            if (collisions.length > 0) {
               setImportConflictData({ items, destination, source, collisions });
               return; // pause for user
            }
         }
      } else if (conflictResolution === 'keep') {
         if (targetObj) {
            finalItems = items.filter(item => {
                const [type, name] = item.split(':');
                if (type === 'front' && targetObj.fronts.includes(name)) return false;
                if (type === 'back' && targetObj.backs.includes(name)) return false;
                if (type === 'double_sided' && targetObj.double_sided?.includes(name)) return false;
                return true;
            });
         }
      }
      
      if (finalItems.length === 0) return;

      for (let i = 0; i < finalItems.length; i++) {
         setTaskProgress({ current: i + 1, total: finalItems.length, message: `Processing ${finalItems[i].split(':')[1]}...` });
         await fetch('/api/plugin/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identity: finalItems[i], destination, source })
         });
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

  const exportProject = () => {
    addLog("[Project] Exporting project to file...");
    window.open('/api/project/export', '_blank');
  };

  return (
    <div className="flex h-screen bg-[#0a0a0c] text-[#e1e1e6] font-sans selection:bg-primary-500/30 overflow-hidden">
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
             <div className="relative">
               <svg className="w-10 h-10 transform -rotate-90">
                 <circle cx="20" cy="20" r="18" className="stroke-white/10 flex-none" strokeWidth="4" fill="none" />
                 <circle cx="20" cy="20" r="18" className="stroke-primary-500 transition-all duration-300" strokeWidth="4" fill="none" strokeDasharray={113} strokeDashoffset={113 - (113 * (taskProgress.current / taskProgress.total))} />
               </svg>
               <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
                 {taskProgress.current}/{taskProgress.total}
               </span>
             </div>
             <div className="flex flex-col">
               <span className="text-sm font-bold text-white/90">{taskProgress.message}</span>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Sidebar */}
      <aside className={cn(
        "border-r border-white/5 flex flex-col bg-[#0f0f13] transition-all duration-300 relative",
        isSidebarCollapsed ? "w-20" : "w-64"
      )}>
        <div className={cn("p-6 pb-2", isSidebarCollapsed && "px-4")}>
          <div className="flex items-center justify-between mb-8 overflow-hidden group relative">
            <div 
              className={cn("flex items-center gap-3 overflow-hidden cursor-pointer", isSidebarCollapsed && "w-full justify-center")}
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              <div className="p-2.5 bg-primary-600 rounded-xl shadow-lg shadow-primary-600/30 shrink-0 select-none">
                <Layers className="w-5 h-5 text-white" />
              </div>
              {!isSidebarCollapsed && (
                <motion.h1 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="font-extrabold text-base tracking-tighter whitespace-nowrap text-white select-none"
                >
                  Silhouette Master
                </motion.h1>
              )}
            </div>
            
            {!isSidebarCollapsed && (
              <button 
                onClick={() => setIsSidebarCollapsed(true)}
                className="p-1.5 hover:bg-white/5 rounded-lg transition-all text-white/20 hover:text-white shrink-0 group-hover:opacity-100 opacity-20 hidden md:block"
                title="Collapse"
              >
                <ChevronRight size={16} className="rotate-180" />
              </button>
            )}
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
            <div className="p-4 rounded-xl bg-white/5 border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <div className={cn("w-2 h-2 rounded-full animate-pulse", status?.installed ? "bg-emerald-500" : "bg-amber-500")} />
                <span className="text-xs font-medium text-white/60">System Status</span>
              </div>
              <p className="text-[10px] text-white/40 leading-relaxed">
                {status?.installed ? `v${status.version} - Online` : 'Setup Required'}
              </p>
            </div>
            <a 
              href="https://github.com/Alan-Cha/silhouette-card-maker" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full flex items-center justify-between text-xs text-white/40 hover:text-white transition-colors px-2 mb-2"
            >
              <span>GitHub Repository</span>
              <ExternalLink size={14} />
            </a>
            <button 
              onClick={() => window.open('https://alan-cha.github.io/silhouette-card-maker/donate/', '_blank')}
              className="w-full flex items-center justify-between text-xs text-white/40 hover:text-white transition-colors px-2"
            >
              <span>Donate</span>
              <ExternalLink size={14} />
            </button>
            <button className="w-full flex items-center justify-between text-xs text-white/40 hover:text-white transition-colors px-2">
              <span>Feedback & Support</span>
              <MessageSquare size={14} />
            </button>
          </div>
        ) : (
          <div className="mt-auto p-4 flex flex-col items-center gap-4 py-8 border-t border-white/5">
            <div className={cn("w-2 h-2 rounded-full", status?.installed ? "bg-emerald-500" : "bg-amber-500")} />
            <button className="text-white/20 hover:text-white transition-colors">
              <MessageSquare size={18} />
            </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-white/5 px-8 flex items-center justify-between bg-[#0f0f13]/50 backdrop-blur-sm z-10 font-mono">
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Project</span>
            <ChevronRight size={12} className="text-white/10" />
            <span className="text-sm font-semibold text-white/60">{status?.rootDir || ""}</span>
          </div>
          <div className="flex items-center gap-4">
            {pdfReady && (
              <a 
                href="/game/output/game.pdf"
                download="game.pdf"
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-all shadow-[0_0_20px_var(--color-emerald-500)] active:scale-95"
              >
                <Download size={14} />
                Download PDF
              </a>
            )}
            <button 
              onClick={generatePDF}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-xs font-semibold transition-all shadow-[0_0_20px_var(--color-primary-500)] active:scale-95 disabled:opacity-50 disabled:shadow-none"
            >
              <Play size={14} className="fill-current" />
              Generate PDF
            </button>
            <div className="h-4 w-px bg-white/10 mx-2" />
            <button onClick={() => setShowThemeSettings(true)} className="text-white/40 hover:text-white transition-colors">
              <Settings size={18} />
            </button>
          </div>
        </header>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-8 relative min-h-0">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-3 gap-6"
              >
                <div className="col-span-2 space-y-6">
                  <section className="p-8 rounded-2xl bg-[#0f0f13] border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Layers size={120} />
                    </div>
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
                </div>

                <div className="space-y-6">
                  <div className="p-6 rounded-2xl bg-[#0f0f13] border border-white/5">
                    <h3 className="font-bold mb-4 flex items-center gap-2 text-white/80">
                      <RefreshCw size={16} />
                      Maintenance
                    </h3>
                    <div className="space-y-2">
                       <CommandItem icon={<Trash2 size={14}/>} label="Purge Cache" onClick={() => runCommand('clean_up.py', undefined, { startMessage: 'Purging cache...' })} />
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl bg-primary-600/10 border border-primary-500/20">
                    <p className="text-xs font-semibold text-primary-400 uppercase tracking-widest mb-2">Status</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-white/40">Python</span>
                        <span className="text-emerald-400">Found 3.10</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-white/40">Version</span>
                        <span className="text-white/80">v{status?.version || '0.0'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'builder' && (
              <motion.div 
                key="builder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-5 gap-8"
              >
                <div className="col-span-3 space-y-8">
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
                    <div className="space-y-4 md:col-span-2">
                       <h4 className="text-xs font-bold uppercase tracking-widest text-primary-400">Advanced</h4>
                       <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-white/30">Crop Backs (mm)</label>
                            <input 
                              type="text" 
                              value={cmdOptions.crop_backs} 
                              onChange={(e) => setCmdOptions(p => ({...p, crop_backs: e.target.value}))} 
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs focus:border-primary-500 transition-all font-mono" 
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-white/30">Extend Corners (px)</label>
                            <input 
                              type="number" 
                              value={cmdOptions.extend_corners} 
                              onChange={(e) => setCmdOptions(p => ({...p, extend_corners: parseInt(e.target.value) || 0}))} 
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs focus:border-primary-500 transition-all font-mono" 
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-white/30">Skip (index)</label>
                            <input 
                              type="number" 
                              value={cmdOptions.skip} 
                              onChange={(e) => setCmdOptions(p => ({...p, skip: e.target.value}))} 
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs focus:border-primary-500 transition-all font-mono" 
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-white/30">Label</label>
                            <input 
                              type="text" 
                              value={cmdOptions.label} 
                              onChange={(e) => setCmdOptions(p => ({...p, label: e.target.value}))} 
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs focus:border-primary-500 transition-all font-mono" 
                            />
                          </div>
                       </div>
                    </div>
                  </div>

                  <div className="bg-[#0f0f13] border border-white/5 rounded-2xl p-6 space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
                      <div className="space-y-1">
                        <h4 className="font-bold text-amber-500 flex items-center gap-2 text-xl tracking-tight">
                          <Layers size={20} />
                          Calibration:
                        </h4>
                        <a 
                          href="https://alan-cha.github.io/silhouette-card-maker/docs/offset/" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-white/40 hover:text-primary-400 transition-colors underline underline-offset-4 decoration-white/10 hover:decoration-primary-400 block"
                        >
                          Adjust for printer misalignment
                        </a>
                      </div>
                      <div className="w-full md:w-56 space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-white/20 px-1">Paper Size</label>
                        <div className="relative group">
                          <select 
                            value={calibration.sheet}
                            onChange={(e) => setCalibration(p => ({ ...p, sheet: e.target.value }))}
                            className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-amber-500/50 focus:bg-white/[0.05] transition-all text-white/80 appearance-none cursor-pointer hover:bg-white/5 shadow-inner"
                          >
                            {CALIBRATION_SHEETS.map(opt => <option key={opt.value} value={opt.value} className="bg-[#0f0f13]">{opt.label}</option>)}
                          </select>
                          <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none group-hover:text-amber-400/50 transition-colors" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6">
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
                               `--x_offset ${calibration.x}`,
                               `--y_offset ${calibration.y}`,
                               `--angle ${calibration.angle}`,
                               '--save'
                             ], { startMessage: 'Saving offset...' })}
                             className="w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl text-[10px] font-bold transition-all text-emerald-400"
                          >
                            Save Offset
                          </button>
                          <button 
                            onClick={() => runCommand('offset_pdf.py', [
                              `--pdf_path calibration/${calibration.sheet}`,
                              `--x_offset ${calibration.x}`,
                              `--y_offset ${calibration.y}`,
                              `--angle ${calibration.angle}`
                            ], { startMessage: 'Generating offset sheet...' })}
                            className="w-full py-2 bg-primary-600/10 hover:bg-primary-600/20 border border-primary-500/20 rounded-xl text-[10px] font-bold transition-all text-primary-400"
                          >
                            Generate Offset Sheet
                          </button>
                          <button 
                             onClick={() => {
                               addLog("[System] Opening verification PDF: game_offset.pdf");
                               window.open('/api/project/export?file=game/output/game_offset.pdf', '_blank');
                             }}
                             className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold transition-all"
                          >
                            Print Offset Sheet
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-span-2 space-y-6">
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
                      <button 
                        onClick={() => runCommand('clean_up.py', [], { startMessage: 'Cleaning up outputs...' })}
                        className="w-full py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-lg text-xs font-bold"
                      >
                        Run Clean Up
                      </button>
                    </div>

                    {pdfReady && (
                      <a 
                        href="/game/output/game.pdf"
                        download="game.pdf"
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-full py-4 mb-4 bg-emerald-600 hover:bg-emerald-500 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl shadow-emerald-600/20 transition-all active:scale-95"
                      >
                        <Download size={20} />
                        Download PDF
                      </a>
                    )}
                    <button 
                      onClick={generatePDF}
                      className="w-full py-4 bg-primary-600 hover:bg-primary-500 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl shadow-primary-600/20 transition-all active:scale-95"
                    >
                      <Play size={20} fill="currentColor" />
                      Generate PDF
                    </button>
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
                    <div key={i} className={cn(
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
                  <div className="flex items-center justify-between">
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
                      <div className="flex items-center gap-2">
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
                        <button 
                          onClick={exportProject}
                          className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold transition-all text-white/60 hover:text-white active:scale-95"
                          title="Export Project JSON"
                        >
                          <Download size={14} />
                          Export
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Consistent Toolbar */}
                  <div className="flex flex-wrap items-center gap-4 p-4 bg-[#0f0f13] border border-white/5 rounded-2xl shadow-xl shadow-black/20">
                    <div className="relative flex-1 min-w-[280px]">
                      <Terminal size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                      <input 
                        type="text" 
                        placeholder="Search assets by name..."
                        value={assetSearch}
                        onChange={(e) => setAssetSearch(e.target.value)}
                        className="w-full bg-black/40 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary-500/50 transition-all font-mono placeholder:text-white/10"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
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

                        {assetViewMode === 'project' && status?.assets && (status.assets.fronts.length > 0 || status.assets.backs.length > 0) && (
                          <button 
                            onClick={clearProject}
                            className="flex items-center gap-2 px-4 py-2 bg-rose-600/10 hover:bg-rose-600/20 text-rose-500 border border-rose-500/20 rounded-lg text-xs font-bold transition-all active:scale-95"
                          >
                            <Trash2 size={14} />
                            Clear
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

                      <div className="flex items-center bg-black/40 border border-white/5 rounded-xl p-1">
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
                        <button 
                          onClick={() => setAssetFilter('back')}
                          className={cn(
                            "px-4 py-1.5 rounded-lg text-[10px] uppercase font-bold tracking-widest transition-all",
                            assetFilter === 'back' ? "bg-white/10 text-white" : "text-white/40 hover:text-white"
                          )}
                        >
                          Backs
                        </button>
                      </div>

                      <div className="h-6 w-px bg-white/5" />

                      <div className="bg-white/5 p-1 rounded-xl flex gap-1">
                        <button 
                          onClick={() => {
                            setActiveTab('assets');
                            setAssetViewMode('project');
                            setSelectedAssets(new Set());
                          }}
                          className={cn(
                            "px-5 py-1.5 rounded-lg text-[10px] uppercase font-bold tracking-widest transition-all",
                            assetViewMode === 'project' ? "bg-primary-600 text-white shadow-lg shadow-primary-600/20" : "text-white/40 hover:text-white"
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
                            "px-5 py-1.5 rounded-lg text-[10px] uppercase font-bold tracking-widest transition-all",
                            assetViewMode === 'library' ? "bg-primary-600 text-white shadow-lg shadow-primary-600/20" : "text-white/40 hover:text-white"
                          )}
                        >
                          Library
                        </button>
                        <button 
                          onClick={() => {
                            setActiveTab('assets');
                            setAssetViewMode('plugins');
                            setSelectedAssets(new Set());
                          }}
                          className={cn(
                            "px-5 py-1.5 rounded-lg text-[10px] uppercase font-bold tracking-widest transition-all",
                            assetViewMode === 'plugins' ? "bg-primary-600 text-white shadow-lg shadow-primary-600/20" : "text-white/40 hover:text-white"
                          )}
                        >
                          Plugins
                        </button>
                      </div>

                      </div>
                    </div>
                  </div>

                {assetViewMode === 'plugins' && (
                  <div className="bg-[#0f0f13] border border-white/5 rounded-2xl p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                      <Package size={120} />
                    </div>
                    <div className="flex flex-col md:flex-row gap-6 relative z-10 items-stretch">
                      <div className="w-full md:w-1/3 space-y-4">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                          <Package size={20} className="text-primary-400" /> Game Plugins
                        </h3>
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
                                 {PLUGINS.map(p => <option key={p.id} value={p.id} className="bg-[#1a1a20]">{p.name}</option>)}
                              </select>
                              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
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
                                   <div key={i}>
                                     {opt.type === 'toggle' ? (
                                       <ToggleItem 
                                         label={opt.label} 
                                         checked={!!pluginState.options[opt.flag]} 
                                         onChange={(v) => setPluginState(prev => ({
                                           ...prev,
                                           options: { ...prev.options, [opt.flag]: v }
                                         }))} 
                                       />
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
                                           {opt.choices?.map(c => <option key={c} value={c} className="bg-[#1a1a20]">{c}</option>)}
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
                          <button 
                            onClick={async () => {
                              // Pre-flight duplicate check (Heuristic based on decklist text)
                              if (pluginState.format !== 'url' && !pluginState.format.includes('url')) {
                                  const cleanedDecklistWords = pluginState.decklist.split('\n')
                                    .map(line => line.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().replace(/^[0-9]+x?/, ''))
                                    .filter(w => w.length > 3);
                                    
                                  if (cleanedDecklistWords.length > 0) {
                                      const possibleMatches = (status?.plugins?.fronts || []).filter(name => {
                                         const lowerName = name.toLowerCase().replace(/^[0-9]+/, '');
                                         return cleanedDecklistWords.some(w => lowerName.includes(w));
                                      });
                                      
                                      if (possibleMatches.length > 0) {
                                          setShowPreFetchWarning({ matches: possibleMatches, args: [] }); // We will save the logic for 'proceed'
                                          return;
                                      }
                                  }
                              }
                              
                              const proceedWithFetch = async () => {
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
                                const args = [`game/decklist/current.txt`, pluginState.format];
                                Object.entries(pluginState.options).forEach(([flag, val]) => {
                                  if (val === true) args.push(flag);
                                  else if (typeof val === 'string' && val !== "") {
                                    args.push(flag);
                                    args.push(val);
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
                              };
                              
                              proceedWithFetch();
                            }}
                            className="w-full py-4 bg-primary-600 hover:bg-primary-500 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary-600/20 transition-all active:scale-95 text-lg"
                          >
                            <Download size={20} />
                            Sync Artwork
                          </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-16">
                  {/* Back Patterns Section */}
                  {(assetFilter === 'all' || assetFilter === 'back') && (
                    <section className="space-y-6">
                      <div className="flex items-center justify-between border-b border-white/5 pb-4 px-2">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-amber-500/20 rounded-lg text-amber-500 shadow-inner">
                            <ImageIcon size={18} />
                          </div>
                          <h3 className="text-sm font-bold uppercase tracking-widest text-white/60 flex items-center gap-2">
                            Back Patterns 
                            <span className="text-white/20 font-normal">
                              ({(assetViewMode === 'project' ? status?.assets?.backs.length : status?.library?.backs.length) || 0})
                            </span>
                          </h3>
                        </div>
                      </div>
                      
                      <DropZone 
                        label="Drag and drop area for backs"
                        isLibrary={assetViewMode === 'library'}
                        disabled={assetViewMode === 'plugins'}
                        onDrop={(files, isLibrary) => {
                          const filesToUpload = isLibrary ? Array.from(files) : [files[0]];
                          addLog(`[Uploader] Dropped ${filesToUpload.length} back patterns. Starting upload...`);
                          filesToUpload.forEach(file => handleUpload(file, 'back', isLibrary));
                        }}
                      >
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 p-6 bg-white/[0.02] border border-white/5 rounded-[40px]">
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
                                key={`b-${i}`} 
                                name={img} 
                                type="back" 
                                allAssets={getCurrentAssets()} 
                                selected={selectedAssets.has(`back:${img}`)}
                                onSelect={(e) => handleAssetSelect(`back:${img}`, e)}
                                onContextMenu={(x, y) => setContextMenu({ x, y, name: img, type: 'back' })}
                                onEnlarge={(src) => setEnlargedImage(src)}
                                uploadedImages={uploadedImages}
                                assetViewMode={assetViewMode}
                              />
                            ))}
                        </div>
                      </DropZone>
                    </section>
                  )}

                  {/* Front Faces Section */}
                  {(assetFilter === 'all' || assetFilter === 'front') && (
                    <section className="space-y-6">
                      <div className="flex items-center justify-between border-b border-white/5 pb-4 px-2">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary-600/20 rounded-lg text-primary-400 shadow-inner">
                            <Eye size={18} />
                          </div>
                          <h3 className="text-sm font-bold uppercase tracking-widest text-white/60 flex items-center gap-2">
                            Front Faces 
                            <span className="text-white/20 font-normal">
                              {(assetViewMode === 'project' ? status?.assets?.fronts.length : status?.library?.fronts.length) || 0}
                            </span>
                          </h3>
                        </div>
                      </div>

                      <DropZone 
                        label="Drag and drop area for fronts"
                        isLibrary={assetViewMode === 'library'}
                        disabled={assetViewMode === 'plugins'}
                        onDrop={(files, isLibrary) => {
                          addLog(`[Uploader] Dropped ${files.length} front faces. Starting upload...`);
                          Array.from(files).forEach(file => handleUpload(file, 'front', isLibrary));
                        }}
                      >
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 p-6 bg-white/[0.02] border border-white/5 rounded-[40px]">
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
                                key={`f-${i}`} 
                                name={img} 
                                type="front" 
                                allAssets={getCurrentAssets()}
                                selected={selectedAssets.has(`front:${img}`)}
                                onSelect={(e) => handleAssetSelect(`front:${img}`, e)}
                                onContextMenu={(x, y) => setContextMenu({ x, y, name: img, type: 'front' })}
                                onEnlarge={(src) => setEnlargedImage(src)}
                                isFlipped={flippedAssets.has(`front:${img}`)}
                                onToggleFlip={(e) => handleToggleFlip(`front:${img}`, e)}
                                uploadedImages={uploadedImages}
                                assetViewMode={assetViewMode}
                              />
                            ))}
                        </div>
                      </DropZone>
                    </section>
                  )}

                  {/* Double-Sided Section */}
                  {(assetFilter === 'all' || assetFilter === 'double_sided') && (
                    <section className="space-y-6">
                      <div className="flex items-center justify-between border-b border-white/5 pb-4 px-2">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400 shadow-inner">
                            <Book size={18} />
                          </div>
                          <h3 className="text-sm font-bold uppercase tracking-widest text-white/60 flex items-center gap-2">
                            Double-Sided 
                            <span className="text-white/20 font-normal">
                              {(assetViewMode === 'project' ? status?.assets?.double_sided?.length : status?.library?.double_sided?.length) || 0}
                            </span>
                          </h3>
                        </div>
                      </div>

                      <DropZone 
                        label="Drag and drop area for double-sided"
                        isLibrary={assetViewMode === 'library'}
                        disabled={assetViewMode === 'plugins'}
                        onDrop={(files, isLibrary) => {
                          addLog(`[Uploader] Dropped ${files.length} double-sided faces. Starting upload...`);
                          Array.from(files).forEach(file => handleUpload(file, 'double_sided', isLibrary));
                        }}
                      >
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 p-6 bg-white/[0.02] border border-white/5 rounded-[40px]">
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
                                key={`d-${i}`} 
                                name={img} 
                                type="double_sided" 
                                allAssets={getCurrentAssets()}
                                selected={selectedAssets.has(`double_sided:${img}`)}
                                onSelect={(e) => handleAssetSelect(`double_sided:${img}`, e)}
                                onContextMenu={(x, y) => setContextMenu({ x, y, name: img, type: 'double_sided' })}
                                onEnlarge={(src) => setEnlargedImage(src)}
                                isFlipped={flippedAssets.has(`double_sided:${img}`)}
                                onToggleFlip={(e) => handleToggleFlip(`double_sided:${img}`, e)}
                                uploadedImages={uploadedImages}
                                assetViewMode={assetViewMode}
                              />
                            ))}
                        </div>
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
              <div className="p-6 border-b border-white/5 bg-amber-500/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                    <ShieldCheck size={24} className="text-amber-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Item Exists</h2>
                    <p className="text-amber-500 text-sm">
                      {importConflictData.collisions.length} item(s) already exist in {importConflictData.destination}.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="bg-black/40 border border-white/5 rounded-xl p-4 font-mono text-xs text-white/60 max-h-32 overflow-y-auto">
                  <ul className="space-y-1">
                    {importConflictData.collisions.map(c => (
                      <li key={c} className="truncate">• {c.split(':')[1]}</li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={async () => {
                      const { items, destination, source } = importConflictData;
                      setImportConflictData(null);
                      await performMoveOrCopy(items, destination, source, 'keep');
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all"
                  >
                    Keep Existing (Skip Duplicates)
                  </button>

                  <button 
                    onClick={async () => {
                      const { items, destination, source } = importConflictData;
                      setImportConflictData(null);
                      await performMoveOrCopy(items, destination, source, 'replace');
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-400 text-black rounded-xl font-bold transition-all"
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

        {showPreFetchWarning && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0f0f13] rounded-2xl w-full max-w-md border border-white/10 shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-white/5 bg-amber-500/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                    <ShieldCheck size={24} className="text-amber-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Cards Might Already Exist</h2>
                    <p className="text-amber-500 text-sm">
                      We found {showPreFetchWarning.matches.length} file(s) in your plugin gallery that look suspiciously similar to cards in your decklist!
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="text-sm text-white/70 space-y-3">
                  <p>
                    If you proceed, the system will still download API data (which can take a minute) and temporarily fetch all images, then prompt you to choose whether to replace duplicates or skip them.
                  </p>
                  <p>
                    <strong>Some potential matches:</strong>
                  </p>
                  <div className="bg-black/40 border border-white/5 rounded-xl p-4 font-mono text-xs text-white/60 max-h-24 overflow-y-auto">
                    <ul className="space-y-1">
                      {showPreFetchWarning.matches.slice(0, 10).map(c => (
                        <li key={c} className="truncate">• {c.split(':')[0]}</li>
                      ))}
                      {showPreFetchWarning.matches.length > 10 && <li>...and {showPreFetchWarning.matches.length - 10} more.</li>}
                    </ul>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={async () => {
                      setShowPreFetchWarning(null);
                      // Since we can't easily re-invoke proceedWithFetch from here without refactoring, we'll
                      // just copy the identical proceed logic
                      const proceedWithFetch = async () => {
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

                        const args = [`game/decklist/current.txt`, pluginState.format];
                        Object.entries(pluginState.options).forEach(([flag, val]) => {
                          if (val === true) args.push(flag);
                          else if (typeof val === 'string' && val !== "") {
                            args.push(flag);
                            args.push(val);
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
                      };
                      proceedWithFetch();
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all"
                  >
                    Proceed with Fetch
                  </button>

                  <button 
                    onClick={() => setShowPreFetchWarning(null)}
                    className="w-full flex items-center justify-center gap-2 py-2 text-white/40 hover:text-white transition-colors text-sm"
                  >
                    Cancel Fetch
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
              <div className="p-6 border-b border-white/5 bg-amber-500/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                    <ShieldCheck size={24} className="text-amber-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Item Exists</h2>
                    <p className="text-amber-500 text-sm">
                      {fetchConflictData.collisions.length} fetched item(s) already exist in plugin gallery.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="bg-black/40 border border-white/5 rounded-xl p-4 font-mono text-xs text-white/60 max-h-32 overflow-y-auto">
                  <ul className="space-y-1">
                    {fetchConflictData.collisions.map(c => (
                      <li key={c} className="truncate">• {c.split(':')[1]}</li>
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
                    className="w-full flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-400 text-black rounded-xl font-bold transition-all"
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
              <div className="flex items-center gap-4 text-amber-500">
                <div className="p-3 bg-amber-500/10 rounded-2xl">
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
                  Object.keys(pluginConfigs).map((name) => (
                    <button
                      key={name}
                      onClick={() => loadPluginConfig(name)}
                      className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-xl text-left transition-all group"
                    >
                      <span className="font-semibold text-white/80 group-hover:text-white">{name}</span>
                      <ChevronRight size={14} className="text-white/20 group-hover:text-white/60 translate-x-0 group-hover:translate-x-1 transition-all" />
                    </button>
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
              className="w-full max-w-sm bg-[#0f0f13] border border-white/10 rounded-3xl p-8 shadow-2xl space-y-6"
            >
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-white">Theme Settings</h3>
                <p className="text-sm text-white/40">Customize your workspace appearance.</p>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-4">
                  <span className="text-sm font-medium text-white block">Primary Color</span>
                  <div className="flex items-center gap-3">
                    {(['indigo', 'emerald', 'rose', 'amber'] as Theme[]).map((t) => (
                      <button
                        key={t}
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

                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between opacity-50 cursor-not-allowed">
                  <span className="text-sm font-medium text-white">Background</span>
                  <span className="text-xs font-mono text-white/40">DARK/BLUR</span>
                </div>
              </div>

              <button 
                onClick={() => setShowThemeSettings(false)}
                className="w-full py-4 text-white hover:bg-white/5 transition-all font-bold rounded-xl"
              >
                Done
              </button>
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
                  status.savedProjects.map(name => (
                    <button
                      key={name}
                      onClick={() => loadProject(name)}
                      className="w-full text-left p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all flex items-center justify-between group"
                    >
                      <span className="font-bold text-white/80 group-hover:text-white">{name}</span>
                      <ChevronRight size={16} className="text-white/20 group-hover:text-primary-400 group-hover:translate-x-1 transition-all" />
                    </button>
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
            className="fixed z-[100] pointer-events-auto flex items-center gap-1 p-1 bg-[#1a1b23]/90 backdrop-blur-xl border border-white/10 rounded-full shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)]"
          >
            {(!contextMenu.type || contextMenu.type !== 'back') && (
              <button 
                onClick={async (e) => {
                  e.stopPropagation();
                  const identity = contextMenu.type ? `${contextMenu.type}:${contextMenu.name}` : contextMenu.name;
                  const targets = selectedAssets.size > 0 && selectedAssets.has(identity) ? Array.from(selectedAssets) : [identity];
                  for (let i = 0; i < targets.length; i++) {
                    setTaskProgress({ current: i + 1, total: targets.length, message: `Duplicating ${targets[i].split(':')[1] || targets[i]}...` });
                    try {
                      await fetch('/api/duplicate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ identity: targets[i], assetViewMode })
                      });
                    } catch(err) {
                      addLog(`[Error] Failed to duplicate: ${err}`);
                    }
                  }
                  setTaskProgress({ current: targets.length, total: targets.length, message: `${targets.length} card${targets.length === 1 ? '' : 's'} duplicated` });
                  await fetchStatus();
                  setTimeout(() => setTaskProgress(null), 1500);
                  setContextMenu(null);
                }}
                className="h-9 pl-4 pr-5 hover:bg-white/5 text-white rounded-full flex items-center gap-2 transition-all active:scale-95 group shrink-0"
              >
                <Copy size={16} className="text-white/40 group-hover:text-white" />
                <span className="font-bold text-[10px] uppercase tracking-widest">Duplicate</span>
              </button>
            )}

            {assetViewMode === 'library' && (
              <>
                <div className="w-[1px] h-4 bg-white/10" />
                <button 
                  onClick={async (e) => {
                    e.stopPropagation();
                    const identity = contextMenu.type ? `${contextMenu.type}:${contextMenu.name}` : contextMenu.name;
                    const targets = selectedAssets.size > 0 && selectedAssets.has(identity) ? Array.from(selectedAssets) : [identity];
                    await performMoveOrCopy(targets, 'project', 'library');
                  }}
                  className="h-9 pl-4 pr-5 hover:bg-white/5 text-white rounded-full flex items-center gap-2 transition-all active:scale-95 group shrink-0"
                >
                  <PlusCircle size={16} className="text-white/40 group-hover:text-white" />
                  <span className="font-bold text-[10px] uppercase tracking-widest">Add to Project</span>
                </button>
              </>
            )}

            {assetViewMode === 'project' && (
              <>
                <div className="w-[1px] h-4 bg-white/10" />
                <button 
                  onClick={async (e) => {
                    e.stopPropagation();
                    const identity = contextMenu.type ? `${contextMenu.type}:${contextMenu.name}` : contextMenu.name;
                    const targets = selectedAssets.size > 0 && selectedAssets.has(identity) ? Array.from(selectedAssets) : [identity];
                    await performMoveOrCopy(targets, 'library', 'project');
                  }}
                  className="h-9 pl-4 pr-5 hover:bg-white/5 text-white rounded-full flex items-center gap-2 transition-all active:scale-95 group shrink-0"
                >
                  <ImageIcon size={16} className="text-white/40 group-hover:text-white" />
                  <span className="font-bold text-[10px] uppercase tracking-widest">Add to Library</span>
                </button>
              </>
            )}

            {assetViewMode === 'plugins' && (
              <>
                <div className="w-[1px] h-4 bg-white/10" />
                <button 
                  onClick={async (e) => {
                    e.stopPropagation();
                    const identity = contextMenu.type ? `${contextMenu.type}:${contextMenu.name}` : contextMenu.name;
                    const targets = selectedAssets.size > 0 && selectedAssets.has(identity) ? Array.from(selectedAssets) : [identity];
                    await performMoveOrCopy(targets, 'project', 'plugins');
                  }}
                  className="h-9 pl-4 pr-5 hover:bg-white/5 text-white rounded-full flex items-center gap-2 transition-all active:scale-95 group shrink-0"
                >
                  <PlusCircle size={16} className="text-white/40 group-hover:text-white" />
                  <span className="font-bold text-[10px] uppercase tracking-widest">Add to Project</span>
                </button>

                <div className="w-[1px] h-4 bg-white/10" />
                <button 
                  onClick={async (e) => {
                    e.stopPropagation();
                    const identity = contextMenu.type ? `${contextMenu.type}:${contextMenu.name}` : contextMenu.name;
                    const targets = selectedAssets.size > 0 && selectedAssets.has(identity) ? Array.from(selectedAssets) : [identity];
                    await performMoveOrCopy(targets, 'library', 'plugins');
                  }}
                  className="h-9 pl-4 pr-5 hover:bg-white/5 text-white rounded-full flex items-center gap-2 transition-all active:scale-95 group shrink-0"
                >
                  <ImageIcon size={16} className="text-white/40 group-hover:text-white" />
                  <span className="font-bold text-[10px] uppercase tracking-widest">Add to Library</span>
                </button>
              </>
            )}

            {true && (
              <div className="w-[1px] h-4 bg-white/10" />
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
              className="h-9 pl-4 pr-5 hover:bg-white/5 text-white rounded-full flex items-center gap-2 transition-all active:scale-95 group shrink-0"
            >
              <CheckSquare size={16} className="text-white/40 group-hover:text-white" />
              <span className="font-bold text-[10px] uppercase tracking-widest">Select All</span>
            </button>

            {true && (
              <>
                <div className="w-[1px] h-4 bg-white/10" />

                <button 
                  onClick={async (e) => {
                    e.stopPropagation();
                    const identity = contextMenu.type ? `${contextMenu.type}:${contextMenu.name}` : contextMenu.name;
                    const targets = selectedAssets.size > 0 && selectedAssets.has(identity) ? Array.from(selectedAssets) : [identity];
                    
                    for (let i = 0; i < targets.length; i++) {
                      setTaskProgress({ current: i + 1, total: targets.length, message: `Deleting ${targets[i].split(':')[1] || targets[i]}...` });
                      try {
                        await fetch('/api/delete', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ identity: [targets[i]], assetViewMode })
                        });
                      } catch(err) {
                        addLog(`[Error] Failed to delete: ${err}`);
                      }
                    }
                    
                    setTaskProgress({ current: targets.length, total: targets.length, message: `${targets.length} card${targets.length === 1 ? '' : 's'} deleted` });
                    await fetchStatus();
                    setTimeout(() => setTaskProgress(null), 1500);
                    setContextMenu(null);
                    setSelectedAssets(new Set());
                  }}
                  className="h-9 pl-4 pr-5 hover:bg-rose-500/10 text-rose-400 rounded-full flex items-center gap-2 transition-all active:scale-95 group shrink-0"
                >
                  <Trash2 size={16} className="text-rose-400/40 group-hover:text-rose-400" />
                  <span className="font-bold text-[10px] uppercase tracking-widest">Delete</span>
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
      <div className="mt-4 px-6">
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
          {options.map(opt => <option key={opt} value={opt} className="bg-[#1a1a20]">{opt}</option>)}
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
}

const AssetItem: React.FC<AssetItemProps> = ({ name, type, allAssets, onContextMenu, selected, onSelect, onEnlarge, isFlipped, onToggleFlip, uploadedImages, addLog, assetViewMode }) => {
  
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
    
    addLog?.(`AssetItem Debug: ${name} NOT found in uploadedImages. available keys: ${Object.keys(uploadedImages || {}).slice(0, 5).join(', ')}...`);
    const baseUrl = getBaseUrl();
    // 2. Determine base path based on type/double-sided status
    if (type === 'back') {
      return `${baseUrl}/back/${name}`;
    }
    
    // 3. For front faces, check if it's double-sided first
    if (allAssets?.double_sided?.includes(name)) {
      return `${baseUrl}/double_sided/${name}`;
    }
    
    // 4. Default to front
    return `${baseUrl}/front/${name}`;
  };

  const imgSrc = getImgSrc();

  const getBackFace = () => {
    if (type === 'back') return null;
    
    // Check if double sided
    const isDoubleSided = allAssets?.double_sided?.includes(name);
    if (isDoubleSided) {
      return { name, folder: 'double_sided' };
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
        {type === 'front' && backFace && (
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
                    "w-full h-full object-cover transition-opacity",
                    assetViewMode === 'library' 
                      ? "opacity-50 group-hover:opacity-100" 
                      : "opacity-60 group-hover:opacity-100"
                  )}
               />
               <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
            </div>
            
             {type === 'back' && selected && (
              <div className="absolute top-2 right-2 z-20 px-2 py-0.5 bg-amber-500 rounded-full shadow-lg border border-amber-400">
                <span className="text-[8px] font-bold text-black uppercase tracking-tighter">Default</span>
              </div>
            )}

            {type === 'front' && !selected && assetViewMode !== 'library' && (
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                <Eye size={18} className="text-white" />
                <span className="text-[10px] font-bold text-white uppercase">Click to Enlarge</span>
              </div>
            )}
          </div>

          {/* Back Face (only if front) */}
          {type === 'front' && (
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
                      className="w-full h-full object-cover opacity-60"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                    <div className={cn(
                      "absolute inset-4 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2",
                      backFace?.folder === 'double_sided' ? "border-primary-500/20 bg-primary-500/5" : "border-amber-500/20 bg-amber-500/5"
                    )}>
                      <span className="text-[10px] font-bold text-white/60 uppercase tracking-tighter">
                        {backFace?.folder === 'double_sided' ? 'Double Sided Back' : 'General Back'}
                      </span>
                      <p className="text-[10px] text-white/80 text-center px-4 font-mono break-all line-clamp-2">
                        {backFace?.name}
                      </p>
                    </div>
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
          {type === 'front' ? (isFlipped ? (backFace?.folder === 'double_sided' ? 'Double-Sided' : 'Standard Back') : 'Front Face') : 'Back Pattern'}
        </p>
      </div>
    </div>
  );
};

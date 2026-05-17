import React, { useState, useEffect, useRef } from 'react';
import { 
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
  Copy
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
  savedProjects?: string[];
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [assetViewMode, setAssetViewMode] = useState<'project' | 'library'>('project');
  const [status, setStatus] = useState<AppStatus | null>(null);
  const [logs, setLogs] = useState<string[]>(["[System] Initializing Silhouette Master Virtual Bridge..."]);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [assetSearch, setAssetSearch] = useState("");
  const [assetFilter, setAssetFilter] = useState<'all' | 'front' | 'back'>('all');
  const [pluginSearch, setPluginSearch] = useState("");
  const [verifyResult, setVerifyResult] = useState<{ missing: number, restored: number, check: string } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, name: string, type?: string } | null>(null);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [uploadedImages, setUploadedImages] = useState<Record<string, string>>({});
  const [localAssets, setLocalAssets] = useState<Array<{name: string, type: 'front' | 'back'}>>([]);
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
  const [showThemeSettings, setShowThemeSettings] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<Theme>('indigo');
  const [pdfReady, setPdfReady] = useState(false);

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
      // Prevent Ctrl+A if displaying back patterns to avoid selecting multiple
      if (assetFilter === 'back') return;
      
      e.preventDefault();
      const currentAssets = assetViewMode === 'project' ? status?.assets : status?.library;
      const all = new Set([
        ...(currentAssets?.fronts.map(n => `front:${n}`) || []),
        ...(assetViewMode === 'project' ? currentAssets?.backs.map(n => `back:${n}`) : [])
      ]);
      setSelectedAssets(all);
      addLog(`[System] Selected all ${assetViewMode} assets.`);
    }

    // Copy
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
      if (isInput) return;
      if (selectedAssets.size > 0) {
        const names = Array.from(selectedAssets).map((s: string) => s.split(':')[1]);
        setCopiedBuffer(Array.from(selectedAssets));
        navigator.clipboard.writeText(names.join(', '));
        addLog(`[System] Copied ${selectedAssets.size} asset names to internal buffer and clipboard.`);
      }
    }

    // Paste
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
      if (isInput) return;
      if (copiedBuffer.length > 0) {
        addLog(`[Library] Duplicating ${copiedBuffer.length} assets from buffer...`);
        runCommand('create_pdf.py', ['--duplicate-batch', copiedBuffer.join(',')]);
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
        const args = ['--selected', Array.from(selectedAssets).join(',')];
        if (assetViewMode === 'library') args.push('--library');
        runCommand('clean_up.py', args);
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
      const res = await fetch('/api/status');
      const data = await res.json();
      setStatus(data);
      // Pre-populate uploadedImages from server assets for consistent rendering
      if (data.assets) {
        const initialImages: Record<string, string> = {};
        data.assets.fronts.forEach((name: string) => initialImages[name] = `/game/front/${name}`);
        data.assets.backs.forEach((name: string) => initialImages[name] = `/game/back/${name}`);
        data.assets.double_sided?.forEach((name: string) => initialImages[name] = `/game/double_sided/${name}`);
        setUploadedImages(prev => ({ ...initialImages, ...prev }));
        setLocalAssets(prev => prev.filter(a => !data.assets.fronts.includes(a.name) && !data.assets.backs.includes(a.name)));
      }
    } catch (err) {
      console.error("Failed to fetch status:", err);
    }
  };

  const getAllAssets = (type: 'front' | 'back') => {
    const serverAssets = (type === 'front' 
      ? (assetViewMode === 'project' ? status?.assets?.fronts : status?.library?.fronts)
      : (assetViewMode === 'project' ? status?.assets?.backs : status?.library?.backs)) || [];
      
    const local = localAssets.filter(a => a.type === type && !serverAssets.includes(a.name)).map(a => a.name);
    
    return [...serverAssets, ...local];
  };


  const addLog = (newLogs: string | string[]) => {
    const logArray = Array.isArray(newLogs) ? newLogs : [newLogs];
    setLogs(prev => [...prev, ...logArray]);
  };
  
  const savePluginConfig = () => {
    if (!pluginSaveName) return;
    const config = {
      pluginId: pluginState.selectedPlugin.id,
      format: pluginState.format,
      options: pluginState.options,
      decklist: pluginState.decklist
    };
    const saved = localStorage.getItem('scm_plugin_configs') || '{}';
    const configs = JSON.parse(saved);
    configs[pluginSaveName] = config;
    localStorage.setItem('scm_plugin_configs', JSON.stringify(configs));
    addLog(`[Plugins] Saved configuration '${pluginSaveName}' for ${pluginState.selectedPlugin.name}.`);
    setPluginSaveName("");
    setShowPluginSaveModal(false);
  };

  const loadPluginConfig = (name: string) => {
    const saved = localStorage.getItem('scm_plugin_configs') || '{}';
    const configs = JSON.parse(saved);
    
    if (!name || !configs[name]) return;
    
    const config = configs[name];
    const plugin = PLUGINS.find(p => p.id === config.pluginId);
    if (plugin) {
      setPluginState({
        selectedPlugin: plugin,
        format: config.format,
        options: config.options,
        decklist: config.decklist
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

  const runCommand = async (command: string, args?: string[]) => {
    addLog(`[Console] Executing: ${command} ${args?.join(' ') || ''}`);
    try {
      const res = await fetch('/api/run-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, args })
      });
      if (!res.ok) {
        addLog(`[Error] Request failed with status ${res.status}`);
        return null;
      }
      const data = await res.json();
      addLog(`[Console] Output: ${data.output}`);
      await fetchStatus();
      return data.output;
    } catch (err) {
      addLog(`[Error] Execution failed: ${err}`);
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
    const output = await runCommand('create_pdf.py', args);
    if (output && output.some((line: string) => line.includes('Generated PDF'))) {
      setPdfReady(true);
    }
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

      const currentAssets = assetViewMode === 'project' ? status?.assets : status?.library;
      const allOrderedAssets = [
        ...(currentAssets?.fronts.map(n => `front:${n}`) || []),
        ...(currentAssets?.backs.map(n => `back:${n}`) || [])
      ];

      if (isRangeSelect && lastSelected) {
        const startIdx = allOrderedAssets.indexOf(lastSelected);
        const endIdx = allOrderedAssets.indexOf(identity);
        if (startIdx !== -1 && endIdx !== -1) {
          const range = allOrderedAssets.slice(
            Math.min(startIdx, endIdx),
            Math.max(startIdx, endIdx) + 1
          );
          range.forEach(item => next.add(item));
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
    try {
      const res = await fetch('/api/project/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          items: itemsToUpload,
          replaceBack: forceReplaceBack
        })
      });
      const data = await res.json();
      if (data.success) {
        addLog(`[Project] Success: ${data.message}`);
        await fetchStatus();
        setSelectedAssets(new Set());
        setShowConflictModal(false);
        setPendingUploadItems([]);
      }
    } catch (err) {
      addLog(`[Error] Upload failed: ${err}`);
    }
  };

  const clearProject = async () => {
    if (!confirm("Are you sure you want to clear all project assets? This cannot be undone.")) return;
    addLog("[Project] Clearing project assets...");
    try {
      const res = await fetch('/api/project/clear', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        addLog(`[Project] Success: ${data.message}`);
        await fetchStatus();
        setSelectedAssets(new Set());
      }
    } catch (err) {
      addLog(`[Error] Clear failed: ${err}`);
    }
  };

  const handleUpload = async (file: File, type: 'front' | 'back', isLibrary: boolean = false) => {
    if (type === 'back' && assetViewMode === 'project' && status?.assets?.backs && status.assets.backs.length > 0) {
      setPendingBackFile(file);
      setIsReplaceBackDialogOpen(true);
      return;
    }
    
    await performUpload(file, type, isLibrary);
  };

  const performUpload = async (file: File, type: 'front' | 'back', isLibrary: boolean) => {
    if (type === 'back') {
      // Clear existing backs from state
      setLocalAssets(prev => prev.filter(asset => asset.type !== 'back'));
      
      // Clear existing backs from server via command
      if (assetViewMode === 'project' && status?.assets?.backs) {
        addLog("[Uploader] Replacing existing back asset...");
        for (const back of status.assets.backs) {
          await runCommand('clean_up.py', ['--selected', `back:${back}`]);
        }
      }
    }

    const url = URL.createObjectURL(file);
    const name = file.name;
    setUploadedImages(prev => ({ ...prev, [name]: url }));
    if (!isLibrary) {
      setLocalAssets(prev => [...prev, {name, type}]);
    }
    
    addLog(`[Uploader] Uploading ${type} asset: ${file.name}`);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    if (isLibrary) formData.append('library', 'true');
    
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error("Upload failed");
      addLog(`[Uploader] Successfully uploaded ${name}`);
    } catch (err) {
      addLog(`[Error] File upload failed: ${err}`);
      return;
    }
    
    const args = [`--type`, type, `--name`, name];
    if (isLibrary) args.push('--library');
    runCommand('upload_action.py', args);
    
    // Give server a moment to update before refreshing
    setTimeout(fetchStatus, 1000);
  };

  const saveProject = async () => {
    if (!saveName) return;
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
        await fetchStatus();
      }
    } catch (err) {
      addLog(`[Error] Save failed: ${err}`);
    }
  };

  const loadProject = async (name: string) => {
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
        await fetchStatus();
        setSelectedAssets(new Set());
      }
    } catch (err) {
      addLog(`[Error] Load failed: ${err}`);
    }
  };

  const exportProject = () => {
    addLog("[Project] Exporting project to file...");
    window.open('/api/project/export', '_blank');
  };

  return (
    <div className="flex h-screen bg-[#0a0a0c] text-[#e1e1e6] font-sans selection:bg-primary-500/30 overflow-hidden">
      {/* Sidebar */}
      <aside className={cn(
        "border-r border-white/5 flex flex-col bg-[#0f0f13] transition-all duration-300 relative",
        isSidebarCollapsed ? "w-20" : "w-64"
      )}>
        <div className={cn("p-6 pb-2", isSidebarCollapsed && "px-4")}>
          <div className="flex items-center justify-between mb-8 overflow-hidden group">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="p-2.5 bg-primary-600 rounded-xl shadow-lg shadow-primary-600/30 shrink-0">
                <Layers className="w-5 h-5 text-white" />
              </div>
              {!isSidebarCollapsed && (
                <motion.h1 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="font-extrabold text-base tracking-tighter whitespace-nowrap text-white"
                >
                  Silhouette Master
                </motion.h1>
              )}
            </div>
            
            {!isSidebarCollapsed && (
              <button 
                onClick={() => setIsSidebarCollapsed(true)}
                className="p-1.5 hover:bg-white/5 rounded-lg transition-all text-white/20 hover:text-white shrink-0 group-hover:opacity-100 opacity-20"
                title="Collapse"
              >
                <ChevronRight size={16} className="rotate-180" />
              </button>
            )}
            
            {isSidebarCollapsed && (
              <button 
                onClick={() => setIsSidebarCollapsed(false)}
                className="absolute inset-0 z-50 opacity-0 cursor-pointer"
                title="Expand"
              />
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
              icon={<Package size={18} />} 
              label="Plugins" 
              active={activeTab === 'plugins'} 
              onClick={() => setActiveTab('plugins')} 
              collapsed={isSidebarCollapsed}
            />
            <SidebarItem 
              icon={<ImageIcon size={18} />} 
              label="Asset Library" 
              active={activeTab === 'assets'} 
              onClick={() => setActiveTab('assets')} 
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
                      <Package size={120} />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Silhouette Master Studio</h2>
                    <p className="text-white/60 max-w-xl leading-relaxed mb-6">
                      High-performance card generation engine. Utilize pre-built plugins for major TCGs or build custom PDFs with precision blade offset calibration.
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
                       <CommandItem icon={<Trash2 size={14}/>} label="Purge Cache" onClick={() => runCommand('clean_up.py')} />
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
                             ])}
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
                            ])}
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
                        onClick={() => runCommand('clean_up.py', [])}
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
                          runCommand(val.split(' ')[0], val.split(' ').slice(1));
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

            {activeTab === 'plugins' && (
              <div 
                key="plugins"
                className="grid grid-cols-5 gap-8 items-stretch relative"
              >
                <div className="col-span-2 relative">
                  <div className="space-y-6 sticky top-0 h-[calc(100vh-8rem)] flex flex-col">
                    <div className="space-y-4 shrink-0">
                      <h2 className="text-3xl font-bold tracking-tight">Game Plugins</h2>
                      <p className="text-white/40 leading-relaxed">Streamline image acquisition by fetching card data directly from community database APIs.</p>
                    </div>
                  
                    <div className="space-y-2 flex-1 min-h-0 flex flex-col">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 shrink-0">Select Integration</label>
                      <div className="grid grid-cols-1 gap-2 flex-1 overflow-y-auto pr-2 pb-4">
                        {PLUGINS.map(p => {
                        const isSelected = pluginState.selectedPlugin.id === p.id;
                        return (
                          <button
                            key={p.id}
                            onClick={() => setPluginState({ 
                              ...pluginState, 
                              selectedPlugin: p, 
                              format: p.formats[0],
                              options: {} 
                            })}
                            className={cn(
                              "group flex items-center justify-between p-4 rounded-xl border transition-all text-left relative overflow-hidden",
                              isSelected
                                ? "bg-primary-600/10 border-primary-500/50 text-white shadow-[0_0_20px_var(--color-primary-600)]" 
                                : "bg-[#0f0f13] border-white/5 text-white/40 hover:border-white/20 hover:bg-white/[0.02]"
                            )}
                          >
                            <div className="flex items-center gap-3 z-10">
                              <div className={cn(
                                "p-2 rounded-lg transition-colors",
                                isSelected ? "bg-primary-600 text-white shadow-lg" : "bg-white/5 text-white/20 group-hover:text-white/40"
                              )}>
                                <Package size={18} />
                              </div>
                              <span className={cn("font-semibold", isSelected ? "text-white" : "group-hover:text-white/60 transition-colors")}>{p.name}</span>
                            </div>
                            {isSelected && (
                              <motion.div 
                                layoutId="active-plugin-blob"
                                className="absolute right-[-20px] top-[-20px] w-24 h-24 bg-primary-500/10 blur-3xl rounded-full"
                              />
                            )}
                            <ChevronRight size={14} className={cn(
                              "transition-all",
                              isSelected ? "text-primary-400 translate-x-1" : "text-white/10 group-hover:text-white/30"
                            )} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  </div>
                </div>

                <div className="col-span-3 space-y-6">
                  <div className="p-8 rounded-2xl bg-[#0f0f13] border border-white/5 space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h3 className="font-bold text-lg">{pluginState.selectedPlugin.name}</h3>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Integration Settings</span>
                            <div className="h-2 w-px bg-white/10" />
                            <div className="flex items-center gap-1 bg-white/[0.03] p-0.5 rounded-lg border border-white/5">
                              <button onClick={() => setShowPluginSaveModal(true)} className="px-2 py-0.5 text-[10px] font-bold text-white/50 hover:text-white hover:bg-white/10 rounded-md transition-all">Save</button>
                              <button onClick={() => setShowPluginLoadModal(true)} className="px-2 py-0.5 text-[10px] font-bold text-white/50 hover:text-white hover:bg-white/10 rounded-md transition-all">Load</button>
                              <button onClick={exportPluginConfig} className="px-2 py-0.5 text-[10px] font-bold text-white/50 hover:text-white hover:bg-white/10 rounded-md transition-all">Export</button>
                            </div>
                          </div>
                        </div>
                        <SelectGroup 
                          label="Preferred Format" 
                          value={pluginState.format} 
                          onChange={(v) => setPluginState(prev => ({ ...prev, format: v }))}
                          options={pluginState.selectedPlugin.formats} 
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-white/40">Decklist Content</label>
                          <span className="text-[10px] text-white/20 font-mono">game/decklist/current.txt</span>
                        </div>
                        <textarea 
                          value={pluginState.decklist}
                          onChange={(e) => setPluginState(prev => ({ ...prev, decklist: e.target.value }))}
                          placeholder={pluginState.format === 'url' || pluginState.format.includes('url') || pluginState.format === 'elestrals' || pluginState.format === 'ydke' ? "Paste URL or Code here..." : "Paste decklist items here (e.g. 4x Lightning Bolt)..."}
                          className="w-full h-48 bg-black/40 border border-white/10 rounded-xl p-4 text-sm font-mono focus:outline-none focus:border-primary-500 transition-all resize-none shadow-inner"
                        />
                      </div>

                      {pluginState.selectedPlugin.options.length > 0 && (
                        <div className="space-y-4 pt-4 border-t border-white/5">
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary-400">Plugin Specific Features</h4>
                          <div className="grid grid-cols-2 gap-4">
                            {pluginState.selectedPlugin.options.map((opt, i) => (
                               <div key={i} className="p-4 bg-white/[0.03] border border-white/5 rounded-xl hover:bg-white/[0.05] transition-all">
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
                                   <div className="space-y-2">
                                     <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 block">{opt.label}</label>
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
                                   </div>
                                 )}
                               </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

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
                        const args = [`game/decklist/current.txt`, pluginState.format];
                        Object.entries(pluginState.options).forEach(([flag, val]) => {
                          if (val === true) args.push(flag);
                          else if (typeof val === 'string' && val !== "") {
                            args.push(flag);
                            args.push(val);
                          }
                        });
                        
                        runCommand(`plugins/${pluginState.selectedPlugin.id}/fetch.py`, args);
                      }}
                      className="w-full py-4 bg-primary-600 hover:bg-primary-500 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl shadow-primary-600/20 transition-all active:scale-95 group"
                    >
                      <Download size={20} className="group-hover:translate-y-0.5 transition-transform" />
                      Sync Card Artwork
                    </button>
                  </div>
                </div>
              </div>
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
                      <h2 className="text-3xl font-bold tracking-tight">{assetViewMode === 'project' ? 'Project Workspace' : 'Library'}</h2>
                      <p className="text-white/40">
                        {assetViewMode === 'project' 
                          ? 'Managing card assets currently staged for PDF generation.' 
                          : 'Source gallery of your card templates.'}
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
                        <RefreshCw size={16} />
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
                      </div>

                      </div>
                    </div>
                  </div>

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
                        onDrop={(files, isLibrary) => {
                          addLog(`[Uploader] Dropped ${files.length} back patterns. Starting upload...`);
                          Array.from(files).forEach(file => handleUpload(file, 'back', isLibrary));
                        }}
                      >
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 p-6 bg-white/[0.02] border border-white/5 rounded-[40px]">
                          <TemplateCard 
                            type="back" 
                            onUpload={(file) => handleUpload(file, 'back', assetViewMode === 'library')} 
                          />
                          {getAllAssets('back')
                            .filter(img => img.toLowerCase().includes(assetSearch.toLowerCase()))
                            .map((img: string, i: number) => (
                              <AssetItem 
                                key={`b-${i}`} 
                                name={img} 
                                type="back" 
                                allAssets={assetViewMode === 'project' ? status?.assets : status?.library} 
                                selected={selectedAssets.has(`back:${img}`)}
                                onSelect={(e) => handleAssetSelect(`back:${img}`, e)}
                                onContextMenu={(x, y) => setContextMenu({ x, y, name: img, type: 'back' })}
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
                              ({(assetViewMode === 'project' ? status?.assets?.fronts.length : status?.library?.fronts.length) || 0})
                            </span>
                          </h3>
                        </div>
                      </div>

                      <DropZone 
                        label="Drag and drop area for fronts"
                        isLibrary={assetViewMode === 'library'}
                        onDrop={(files, isLibrary) => {
                          addLog(`[Uploader] Dropped ${files.length} front faces. Starting upload...`);
                          Array.from(files).forEach(file => handleUpload(file, 'front', isLibrary));
                        }}
                      >
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 p-6 bg-white/[0.02] border border-white/5 rounded-[40px]">
                          <TemplateCard 
                            type="front" 
                            onUpload={(file) => handleUpload(file, 'front', assetViewMode === 'library')} 
                          />
                          {getAllAssets('front')
                            .filter(img => img.toLowerCase().includes(assetSearch.toLowerCase()))
                            .map((img: string, i: number) => (
                              <AssetItem 
                                key={`f-${i}`} 
                                name={img} 
                                type="front" 
                                allAssets={assetViewMode === 'project' ? status?.assets : status?.library}
                                selected={selectedAssets.has(`front:${img}`)}
                                onSelect={(e) => handleAssetSelect(`front:${img}`, e)}
                                onContextMenu={(x, y) => setContextMenu({ x, y, name: img, type: 'front' })}
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
                {Object.keys(JSON.parse(localStorage.getItem('scm_plugin_configs') || '{}')).length > 0 ? (
                  Object.keys(JSON.parse(localStorage.getItem('scm_plugin_configs') || '{}')).map((name) => (
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
            <button 
              onClick={(e) => {
                e.stopPropagation();
                const identity = contextMenu.type ? `${contextMenu.type}:${contextMenu.name}` : contextMenu.name;
                runCommand('create_pdf.py', ['--duplicate', identity]);
                setContextMenu(null);
              }}
              className="h-9 pl-4 pr-5 hover:bg-white/5 text-white rounded-full flex items-center gap-2 transition-all active:scale-95 group shrink-0"
            >
              <Copy size={16} className="text-white/40 group-hover:text-white" />
              <span className="font-bold text-[10px] uppercase tracking-widest">Duplicate</span>
            </button>

            <div className="w-[1px] h-4 bg-white/10" />

            <button 
              onClick={(e) => {
                e.stopPropagation();
                const currentAssets = assetViewMode === 'project' ? status?.assets : status?.library;
                const all = new Set([
                  ...(currentAssets?.fronts.map(n => `front:${n}`) || []),
                  ...(currentAssets?.backs.map(n => `back:${n}`) || [])
                ]);
                setSelectedAssets(all);
                setContextMenu(null);
                addLog(`[System] Selected all ${assetViewMode} assets.`);
              }}
              className="h-9 pl-4 pr-5 hover:bg-white/5 text-white rounded-full flex items-center gap-2 transition-all active:scale-95 group shrink-0"
            >
              <CheckSquare size={16} className="text-white/40 group-hover:text-white" />
              <span className="font-bold text-[10px] uppercase tracking-widest">Select All</span>
            </button>

            <div className="w-[1px] h-4 bg-white/10" />

            <button 
              onClick={(e) => {
                e.stopPropagation();
                const identity = contextMenu.type ? `${contextMenu.type}:${contextMenu.name}` : contextMenu.name;
                addLog(`[System] Deleting ${contextMenu.name}...`);
                const args = ['--selected', identity];
                if (assetViewMode === 'library') args.push('--library');
                runCommand('clean_up.py', args);
                setContextMenu(null);
              }}
              className="h-9 pl-4 pr-5 hover:bg-rose-500/10 text-rose-400 rounded-full flex items-center gap-2 transition-all active:scale-95 group shrink-0"
            >
              <Trash2 size={16} className="text-rose-400/40 group-hover:text-rose-400" />
              <span className="font-bold text-[10px] uppercase tracking-widest">Delete</span>
            </button>
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
    </div>
  );
}

// Subcomponents
function TemplateCard({ type, onUpload }: { type: 'front' | 'back', onUpload: (file: File) => void }) {
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
        onChange={(e) => {
          if (e.target.files?.length) {
            onUpload(e.target.files[0]);
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

function DropZone({ children, onDrop, label, isLibrary }: { children: React.ReactNode, onDrop: (files: FileList, isLibrary: boolean) => void, label: string, isLibrary: boolean }) {
  const [isOver, setIsOver] = useState(false);
  
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
  type: 'front' | 'back';
  allAssets?: AssetData | null;
  onContextMenu?: (x: number, y: number) => void;
  selected?: boolean;
  onSelect?: (e: React.MouseEvent) => void;
  uploadedImages?: Record<string, string>;
  addLog?: (log: string) => void;
  assetViewMode: 'library' | 'project';
}

const AssetItem: React.FC<AssetItemProps> = ({ name, type, allAssets, onContextMenu, selected, onSelect, uploadedImages, addLog, assetViewMode }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  
  const getImgSrc = () => {
    // 1. If we have a blob URL from a recent upload, use it.
    if (uploadedImages?.[name]) {
      addLog?.(`AssetItem Debug: ${name} FOUND in uploadedImages.`);
      return uploadedImages[name];
    }
    
    addLog?.(`AssetItem Debug: ${name} NOT found in uploadedImages. available keys: ${Object.keys(uploadedImages || {}).slice(0, 5).join(', ')}...`);
    // 2. Determine base path based on type/double-sided status
    if (type === 'back') {
      return `/game/back/${name}`;
    }
    
    // 3. For front faces, check if it's double-sided first
    if (allAssets?.double_sided?.includes(name)) {
      return `/game/double_sided/${name}`;
    }
    
    // 4. Default to front
    return `/game/front/${name}`;
  };

  const imgSrc = getImgSrc();

  const getBackFace = () => {
    if (type === 'back') return null;
    
    // Check if double sided
    const isDoubleSided = allAssets?.double_sided?.includes(name);
    if (isDoubleSided) {
      return { name, folder: 'double_sided' };
    }
    
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
          if (e.shiftKey || e.ctrlKey || e.metaKey || selected) {
            onSelect?.(e);
          } else if (type === 'front' && !(assetViewMode === 'library')) {
            setIsFlipped(!isFlipped);
          } else {
            onSelect?.(e);
          }
        }}
      >
        <motion.div
          className="w-full h-full transition-all duration-500 preserve-3d relative"
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
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
            
            {/* Selection Button */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.(e);
              }}
              className={cn(
                "absolute top-2 left-2 z-20 w-6 h-6 rounded-full border flex items-center justify-center transition-all shadow-md active:scale-95",
                selected 
                  ? "bg-primary-600 border-primary-400 text-white" 
                  : "bg-black/40 border-white/10 text-white/0 group-hover:text-white/40 group-hover:border-white/40 hover:bg-black/60 hover:text-white/80"
              )}
            >
              <CheckSquare size={12} />
            </button>

            {type === 'back' && selected && (
              <div className="absolute top-2 right-2 z-20 px-2 py-0.5 bg-amber-500 rounded-full shadow-lg border border-amber-400">
                <span className="text-[8px] font-bold text-black uppercase tracking-tighter">Default</span>
              </div>
            )}

            {type === 'front' && !selected && assetViewMode !== 'library' && (
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                <Eye size={18} className="text-white" />
                <span className="text-[10px] font-bold text-white uppercase">Click to Flip</span>
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
                      src={uploadedImages?.[backFace.name] || `/game/${backFace.folder}/${backFace.name}`}
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

import React, { useState, useEffect } from 'react';
import { Download, Upload, Trash2, Check, RefreshCw, X, FolderOpen, Edit2, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface ProjectManagerProps {
  isOpen: boolean;
  onClose: () => void;
  status: any;
  saveProject: (name: string) => Promise<void>;
  loadProject: (name: string) => Promise<void>;
  deleteProject: (e: any, name: string) => Promise<void>;
  renameProject: (oldName: string, newName: string) => Promise<void>;
  triggerImport: () => void;
}

export default function ProjectManager({ isOpen, onClose, status, saveProject, loadProject, deleteProject, renameProject, triggerImport }: ProjectManagerProps) {
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [saveName, setSaveName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showOverwriteModal, setShowOverwriteModal] = useState(false);
  const [overwriteTargetName, setOverwriteTargetName] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState("");
  const [renameError, setRenameError] = useState("");

  const projects = status?.savedProjects || [];

  useEffect(() => {
    if (isOpen) {
      setIsSaving(false);
      setSaveName("");
    }
  }, [isOpen]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveName.trim()) return;
    
    if (projects.includes(saveName)) {
      setOverwriteTargetName(saveName);
      setShowOverwriteModal(true);
      return;
    }
    
    setLoading(true);
    await saveProject(saveName);
    setLoading(false);
    setIsSaving(false);
    setSaveName("");
  };
  
  const executeOverwrite = async () => {
    setLoading(true);
    await saveProject(overwriteTargetName);
    setLoading(false);
    setShowOverwriteModal(false);
    setOverwriteTargetName("");
    setIsSaving(false);
    setSaveName("");
  };

  const executeDelete = async (name: string) => {
    setLoading(true);
    await deleteProject(null, name);
    setLoading(false);
    setShowDeleteModal(false);
    setDeleteTarget(null);
  };
  
  const executeRename = async () => {
    if (!renameTarget) return;
    const newName = renameInput.trim();
    if (!newName || newName === renameTarget) {
      setShowRenameModal(false);
      return;
    }
    
    if (projects.includes(newName)) {
       setRenameError("A project with this name already exists.");
       return;
    }
    
    setLoading(true);
    await renameProject(renameTarget, newName);
    setLoading(false);
    setShowRenameModal(false);
  };

  const handleDeleteClick = (name: string) => {
    setDeleteTarget(name);
    setShowDeleteModal(true);
  };
  
  const handleRenameClick = (name: string) => {
    setRenameTarget(name);
    setRenameInput(name);
    setRenameError("");
    setShowRenameModal(true);
  };

  const filteredProjects = projects.filter((p: string) => p.toLowerCase().includes(search.toLowerCase()));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1002] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-[#0f0f13] border border-white/10 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden overflow-y-auto"
      >
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h2 className="text-xl font-bold text-white capitalize">Project Presets</h2>
          <button onClick={onClose} className="p-2 text-white/40 hover:text-white transition-colors bg-white/5 rounded-full hover:bg-white/10">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1 overflow-y-auto min-h-0">
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center bg-[#1a1a24] p-4 rounded-xl border border-white/5">
               {isSaving ? (
                 <form onSubmit={handleSave} className="flex flex-1 gap-2">
                   <input
                     autoFocus
                     className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500"
                     placeholder="Preset Name (e.g. My Awesome Deck)"
                     value={saveName}
                     onChange={e => setSaveName(e.target.value)}
                   />
                   <button type="submit" disabled={loading} className="bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary-400 flex items-center gap-2 disabled:opacity-50">
                     <Check size={16} /> Save
                   </button>
                   <button type="button" onClick={() => setIsSaving(false)} className="bg-white/5 text-white/70 px-4 py-2 rounded-lg text-sm font-bold hover:bg-white/10">
                     Cancel
                   </button>
                 </form>
               ) : (
                 <div className="flex flex-col sm:flex-row justify-between w-full gap-3 items-center">
                   <div className="text-sm text-white/50">
                     Save your entire current working workspace as a preset.
                   </div>
                   <div className="flex gap-2 relative">
                     <button 
                       onClick={() => setIsSaving(true)}
                       className="bg-primary-500/20 text-primary-400 border border-primary-500/30 px-4 py-2 flex items-center gap-2 rounded-lg text-sm font-bold hover:bg-primary-500/30 transition-colors whitespace-nowrap"
                     >
                       <Check size={16} /> Save Current
                     </button>
                     <button
                       onClick={triggerImport}
                       className="bg-white/5 text-white/80 border border-white/10 px-4 py-2 flex items-center gap-2 rounded-lg text-sm font-bold hover:bg-white/10 transition-colors whitespace-nowrap"
                     >
                       <Upload size={16} /> Import JSON
                     </button>
                   </div>
                 </div>
               )}
            </div>

            <div className="space-y-4">
               <input
                 className="w-full bg-[#1a1a24] border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-primary-500 placeholder-white/30"
                 placeholder="Search presets..."
                 value={search}
                 onChange={e => setSearch(e.target.value)}
               />

               {loading ? (
                 <div className="flex justify-center p-8">
                   <RefreshCw className="animate-spin text-white/20" size={24} />
                 </div>
               ) : (
                 <div className="grid gap-2">
                   {filteredProjects.length === 0 ? (
                     <div className="text-center p-8 text-white/40 text-sm border border-white/5 bg-[#1a1a24] rounded-xl border-dashed">
                       {search ? "No presets matched your search." : "No presets saved yet."}
                     </div>
                   ) : (
                     filteredProjects.map((p: string) => (
                       <div key={p} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[#1a1a24] border border-white/5 rounded-xl hover:border-white/10 transition-colors gap-4">
                         <div className="flex items-center gap-3">
                           <div className="font-bold text-white text-sm">{p}</div>
                         </div>
                         <div className="flex items-center gap-2">
                           <button 
                             onClick={() => handleRenameClick(p)}
                             className="text-xs bg-white/5 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-white/10 transition-colors"
                           >
                             <Edit2 size={14} /> Rename
                           </button>
                           <button 
                             onClick={() => {
                               loadProject(p);
                               onClose();
                             }}
                             className="text-xs bg-primary-500 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-primary-400 transition-colors"
                           >
                             <FolderOpen size={14} /> Load
                           </button>
                           <a 
                             href={`/api/project/export?project=${encodeURIComponent(p)}`}
                             download={`${p}_export.json`}
                             className="text-xs bg-white/10 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-white/20 transition-colors"
                           >
                             <Download size={14} /> Export
                           </a>
                           <button 
                             onClick={() => handleDeleteClick(p)}
                             className="p-1.5 text-rose-500/60 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors"
                           >
                             <Trash2 size={16} />
                           </button>
                         </div>
                       </div>
                     ))
                   )}
                 </div>
               )}
            </div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showOverwriteModal && (
          <div className="fixed inset-0 z-[1003] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowOverwriteModal(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-[#1a1a24] border border-rose-500/30 w-full max-w-sm rounded-2xl shadow-2xl p-6 space-y-6"
            >
              <h3 className="text-lg font-bold text-white">Overwrite Project Preset?</h3>
              <p className="text-sm text-white/70 leading-relaxed">
                A project preset named <span className="text-white font-bold">"{overwriteTargetName}"</span> already exists. Are you sure you want to overwrite it?
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  onClick={() => setShowOverwriteModal(false)}
                  className="px-4 py-2 rounded-lg text-sm font-bold text-white/70 bg-white/5 hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={executeOverwrite}
                  className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-rose-500 hover:bg-rose-400 transition-colors"
                >
                  Overwrite
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showDeleteModal && deleteTarget && (
          <div className="fixed inset-0 z-[1003] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowDeleteModal(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-[#1a1a24] border border-rose-500/30 w-full max-w-sm rounded-2xl shadow-2xl p-6 space-y-6"
            >
              <h3 className="text-lg font-bold text-white">Delete Project Preset?</h3>
              <p className="text-sm text-white/70 leading-relaxed">
                Are you sure you want to permanently delete the project preset <span className="text-white font-bold">"{deleteTarget}"</span>?
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 rounded-lg text-sm font-bold text-white/70 bg-white/5 hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => executeDelete(deleteTarget)}
                  className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-rose-500 hover:bg-rose-400 transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {showRenameModal && renameTarget && (
          <div className="fixed inset-0 z-[1003] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowRenameModal(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-[#1a1a24] border border-white/10 w-full max-w-sm rounded-2xl shadow-2xl p-6 space-y-6"
            >
              <h3 className="text-lg font-bold text-white">
                Rename project preset <span className="text-primary-400">'{renameTarget}'</span>
              </h3>
              <div className="space-y-2">
                <input
                  type="text"
                  autoFocus
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500"
                  value={renameInput}
                  onChange={e => {
                    setRenameInput(e.target.value);
                    setRenameError("");
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') executeRename();
                  }}
                />
                {renameError && (
                  <div className="text-xs text-rose-500">{renameError}</div>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  onClick={() => setShowRenameModal(false)}
                  className="px-4 py-2 rounded-lg text-sm font-bold text-white/70 bg-white/5 hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={executeRename}
                  className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-primary-500 hover:bg-primary-400 transition-colors"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>      
    </div>
  );
}

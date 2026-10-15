import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Sparkles, X, Check, BookOpen } from 'lucide-react';

export interface MtgSetItem {
  code: string;
  name: string;
  type?: string;
  released?: string;
  card_count?: number;
}

interface MtgSetCodeTooltipProps {
  mtgSets: MtgSetItem[];
  onSelectSet?: (code: string) => void;
  mode?: 'replace' | 'append';
  align?: 'left' | 'right';
  label?: string;
  compact?: boolean;
}

export const MtgSetCodeTooltip: React.FC<MtgSetCodeTooltipProps> = ({
  mtgSets,
  onSelectSet,
  mode = 'replace',
  align = 'right',
  label = 'Set Codes',
  compact = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [justSelected, setJustSelected] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<any>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    if (isPinned) return;
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 250);
  };

  const handleTogglePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const nextPinned = !isPinned;
    setIsPinned(nextPinned);
    setIsOpen(nextPinned);
    if (nextPinned) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  };

  const handleClose = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setIsPinned(false);
    setIsOpen(false);
  };

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsPinned(false);
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Clean timeout on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  // Filter sets efficiently
  const filteredSets = useMemo(() => {
    if (!mtgSets || mtgSets.length === 0) return [];

    let list = mtgSets;

    // Filter by type pill if not 'all'
    if (selectedType !== 'all') {
      if (selectedType === 'expansion') {
        list = list.filter(s => s.type === 'expansion' || s.type === 'core');
      } else if (selectedType === 'commander') {
        list = list.filter(s => s.type === 'commander');
      } else if (selectedType === 'masters') {
        list = list.filter(s => s.type === 'masters' || s.type === 'draft_innovation');
      } else if (selectedType === 'special') {
        list = list.filter(s => s.type !== 'expansion' && s.type !== 'core' && s.type !== 'commander');
      }
    }

    const q = search.trim().toLowerCase();
    if (!q) {
      return list;
    }

    return list.filter(s => {
      const codeMatch = s.code.toLowerCase().includes(q);
      const nameMatch = s.name.toLowerCase().includes(q);
      const yearMatch = s.released ? s.released.includes(q) : false;
      return codeMatch || nameMatch || yearMatch;
    });
  }, [mtgSets, search, selectedType]);

  const handleSetClick = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onSelectSet) {
      onSelectSet(code.toUpperCase());
    }
    setJustSelected(code);
    setTimeout(() => {
      setJustSelected(null);
    }, 1200);
  };

  const showTooltip = isOpen || isPinned;

  return (
    <div
      ref={containerRef}
      className="relative inline-flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Trigger Button / Badge */}
      <button
        type="button"
        onClick={handleTogglePin}
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer select-none border ${
          showTooltip
            ? 'bg-primary-500/25 text-primary-200 border-primary-500/40 shadow-sm shadow-primary-500/20'
            : 'bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 hover:text-primary-300 border-primary-500/20'
        }`}
        title="Hover to view MTG set codes (click to pin)"
      >
        <Sparkles size={11} className={showTooltip ? 'text-primary-300 animate-pulse' : 'text-primary-400'} />
        {!compact && <span>{label}</span>}
      </button>

      {/* Floating Hover Tooltip / Popover */}
      {showTooltip && (
        <div
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`absolute top-full mt-1.5 ${
            align === 'right' ? 'right-0' : 'left-0'
          } w-80 sm:w-96 max-w-[90vw] bg-[#121218]/98 backdrop-blur-2xl border border-white/15 rounded-xl shadow-2xl z-[100] p-3 flex flex-col gap-2.5 text-white animate-in fade-in zoom-in-95 duration-150`}
          style={{ boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.08)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-1.5">
              <BookOpen size={14} className="text-primary-400" />
              <span className="text-xs font-bold text-white tracking-wide">Magic: The Gathering Sets</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-primary-500/20 text-primary-300 font-semibold border border-primary-500/30">
                {mtgSets.length > 0 ? `${mtgSets.length} Sets` : 'Loading...'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Close tooltip"
            >
              <X size={13} />
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search set name or code (e.g. MH3, Bloomburrow, LEA)..."
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-7 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-primary-500 font-medium transition-colors"
              onClick={(e) => e.stopPropagation()}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar text-[10px]">
            {[
              { id: 'all', label: 'All Sets' },
              { id: 'expansion', label: 'Expansions' },
              { id: 'commander', label: 'Commander' },
              { id: 'masters', label: 'Masters' },
              { id: 'special', label: 'Special/Promo' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedType(tab.id);
                }}
                className={`px-2 py-0.5 rounded-md font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  selectedType === tab.id
                    ? 'bg-primary-600 text-white font-bold'
                    : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Set List */}
          <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {filteredSets.length === 0 ? (
              <div className="text-center py-6 text-xs text-white/40">
                {mtgSets.length === 0 ? 'Loading MTG set codes from database...' : `No set codes found matching "${search}"`}
              </div>
            ) : (
              filteredSets.slice(0, 120).map((s) => {
                const isSelected = justSelected === s.code;
                return (
                  <button
                    key={s.code}
                    type="button"
                    onClick={(e) => handleSetClick(s.code, e)}
                    className={`w-full group text-left px-2 py-1.5 rounded-lg flex items-center justify-between gap-2 transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-white/[0.03] hover:bg-white/[0.09] border-white/5 hover:border-white/15'
                    }`}
                    title={`Click to ${mode === 'append' ? 'add' : 'insert'} ${s.code}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`font-mono font-bold text-[11px] px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-500/50'
                          : 'bg-primary-500/20 group-hover:bg-primary-500/30 text-primary-300 group-hover:text-primary-200 border border-primary-500/30'
                      }`}>
                        {s.code}
                      </span>
                      <span className="text-xs text-white/85 group-hover:text-white font-medium truncate">
                        {s.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {s.released && (
                        <span className="text-[10px] text-white/40 font-mono">
                          {s.released}
                        </span>
                      )}
                      {s.type && (
                        <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-white/5 text-white/40 group-hover:text-white/60">
                          {s.type.replace('_', ' ')}
                        </span>
                      )}
                      {isSelected ? (
                        <Check size={12} className="text-emerald-400 shrink-0" />
                      ) : (
                        <span className="text-[10px] text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          {mode === 'append' ? '+Add' : 'Select'}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}

            {filteredSets.length > 120 && (
              <div className="text-center py-1.5 text-[10px] text-white/40 font-medium">
                Showing top 120 matches of {filteredSets.length}. Type in search above to narrow down.
              </div>
            )}
          </div>

          {/* Footer Instruction */}
          <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px] text-white/40">
            <span>💡 Click any set to insert into box</span>
            <span className="text-white/30">Click badge to pin open</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MtgSetCodeTooltip;

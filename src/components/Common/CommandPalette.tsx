import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  BookOpen,
  Tv,
  Film,
  BookText,
  Headphones,
  Trophy,
  Rss,
  Bookmark,
  Upload,
  Sparkles,
  Zap,
  Flame,
  X,
  CornerDownLeft
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: any) => void;
  onSearchGlobal: (query: string) => void;
  onOpenUpload: () => void;
  onOpenSample: () => void;
  onOpenUrlModal: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onSearchGlobal,
  onOpenUpload,
  onOpenSample,
  onOpenUrlModal
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Global shortcut listener for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open palette
          const openEvent = new CustomEvent('toggle-command-palette');
          window.dispatchEvent(openEvent);
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const quickActions = [
    {
      id: 'tab_browse',
      label: 'Browse Comics & Manga',
      category: 'Navigation',
      icon: BookOpen,
      action: () => {
        onNavigateTab('browse');
        onClose();
      }
    },
    {
      id: 'tab_anime',
      label: 'Stream Anime Hub',
      category: 'Navigation',
      icon: Tv,
      action: () => {
        onNavigateTab('anime');
        onClose();
      }
    },
    {
      id: 'tab_media',
      label: 'Watch Movies & TV Shows',
      category: 'Navigation',
      icon: Film,
      action: () => {
        onNavigateTab('media');
        onClose();
      }
    },
    {
      id: 'tab_audiobooks',
      label: 'Stream Audiobooks & Dramatizations',
      category: 'Navigation',
      icon: Headphones,
      action: () => {
        onNavigateTab('audiobooks');
        onClose();
      }
    },
    {
      id: 'tab_sports',
      label: 'Watch Live Sports Streaming',
      category: 'Navigation',
      icon: Trophy,
      action: () => {
        onNavigateTab('sports');
        onClose();
      }
    },
    {
      id: 'tab_rss',
      label: 'Pull Live RSS News Feeds',
      category: 'Navigation',
      icon: Rss,
      action: () => {
        onNavigateTab('rss');
        onClose();
      }
    },
    {
      id: 'act_sample',
      label: 'Launch Cyberpunk Sample Comic (Guided Panels)',
      category: 'Quick Action',
      icon: Zap,
      action: () => {
        onOpenSample();
        onClose();
      }
    },
    {
      id: 'act_upload',
      label: 'Upload Local Comic (.CBZ), E-Book (.EPUB), or Audio (.MP3)',
      category: 'Quick Action',
      icon: Upload,
      action: () => {
        onOpenUpload();
        onClose();
      }
    },
    {
      id: 'act_scrape',
      label: 'Scrape Comic Chapter from URL',
      category: 'Quick Action',
      icon: Sparkles,
      action: () => {
        onOpenUrlModal();
        onClose();
      }
    }
  ];

  const filtered = query
    ? quickActions.filter((a) => a.label.toLowerCase().includes(query.toLowerCase()))
    : quickActions;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query && filtered.length === 0) {
      onSearchGlobal(query);
      onClose();
    } else if (filtered[selectedIndex]) {
      filtered[selectedIndex].action();
    }
  };

  const handleKeyDownList = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[75vh]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDownList}
      >
        {/* Search Header */}
        <form onSubmit={handleSubmit} className="p-4 border-b border-slate-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command or search comics, anime, movies, books..."
            className="w-full bg-transparent text-sm sm:text-base text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-400">
            ESC
          </kbd>
        </form>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filtered.map((item, idx) => {
            const Icon = item.icon;
            const isSelected = idx === selectedIndex;
            return (
              <div
                key={item.id}
                onClick={item.action}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-colors ${
                  isSelected ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold">{item.label}</p>
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wider ${
                        isSelected ? 'text-blue-200' : 'text-slate-500'
                      }`}
                    >
                      {item.category}
                    </span>
                  </div>
                </div>

                <CornerDownLeft
                  className={`w-4 h-4 transition-opacity ${
                    isSelected ? 'opacity-100 text-white' : 'opacity-0'
                  }`}
                />
              </div>
            );
          })}

          {query && filtered.length === 0 && (
            <div
              onClick={() => {
                onSearchGlobal(query);
                onClose();
              }}
              className="p-4 rounded-2xl bg-blue-600/10 border border-blue-500/30 text-center cursor-pointer hover:bg-blue-600/20 transition-colors space-y-1"
            >
              <p className="text-xs font-bold text-white">
                Search global library for &quot;<strong className="text-blue-400">{query}</strong>&quot;
              </p>
              <span className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                <span>Press Enter to search all media hubs</span>
                <CornerDownLeft className="w-3 h-3" />
              </span>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 px-4">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px]">↑↓</kbd>
              <span>Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px]">↵</kbd>
              <span>Select</span>
            </span>
          </div>
          <span className="font-semibold text-blue-400">OmniStream Spotlight</span>
        </div>
      </div>
    </div>
  );
};

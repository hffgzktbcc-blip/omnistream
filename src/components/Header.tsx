import React, { useState, useEffect } from 'react';
import {
  Home,
  BookOpen,
  Search,
  Bookmark,
  Upload,
  Sparkles,
  X,
  Tv,
  Film,
  Headphones,
  Trophy,
  Rss,
  Flame,
  Command,
  Download
} from 'lucide-react';
import { statsStorage } from '../services/statsStorage';
import { useToast } from '../context/ToastContext';

interface HeaderProps {
  activeTab: 'home' | 'browse' | 'anime' | 'media' | 'audiobooks' | 'sports' | 'rss' | 'library';
  setActiveTab: (
    tab: 'home' | 'browse' | 'anime' | 'media' | 'audiobooks' | 'sports' | 'rss' | 'library'
  ) => void;
  onSearch: (query: string) => void;
  searchQuery: string;
  onOpenUpload: () => void;
  onOpenUrlModal: () => void;
  onOpenSample: () => void;
  onOpenStats: () => void;
  onOpenCommandPalette: () => void;
  onOpenAndroidTV: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onSearch,
  searchQuery,
  onOpenUpload,
  onOpenUrlModal,
  onOpenSample,
  onOpenStats,
  onOpenCommandPalette,
  onOpenAndroidTV
}) => {
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [canInstall, setCanInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const stats = statsStorage.getStats();
  const { showInfo } = useToast();

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setCanInstall(false);
      }
      setDeferredPrompt(null);
    } else {
      showInfo('To install: Use Chrome/Brave Install icon in address bar, or in Safari use File > Add to Dock.', 'Install OmniStream');
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(localSearch);
  };

  const handleClearSearch = () => {
    setLocalSearch('');
    onSearch('');
  };

  const getSearchPlaceholder = () => {
    switch (activeTab) {
      case 'anime':
        return 'Search anime (Solo Leveling, One Piece, Demon Slayer, Dandadan...)';
      case 'media':
        return 'Search movies & series (Deadpool & Wolverine, Dune, Arcane...)';
      case 'browse':
        return 'Search manga & comics (Solo Leveling, Jujutsu Kaisen, Berserk...)';
      case 'audiobooks':
        return 'Search audiobooks (Dune, Project Hail Mary, Good Omens...)';
      case 'sports':
        return 'Search sports matches (Six Nations Rugby, Premier League, NBA, UFC...)';
      case 'rss':
        return 'Search news feeds...';
      default:
        return 'Search movies, anime, manga, sports, audiobooks...';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0B0F17]/95 backdrop-blur-md border-b border-slate-800/80 px-3 lg:px-6 py-3 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand Logo */}
        <div
          className="flex items-center gap-2 sm:gap-2.5 cursor-pointer flex-shrink-0"
          onClick={() => {
            setActiveTab('home');
            handleClearSearch();
          }}
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-bold">
            <Film className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-sm sm:text-base text-white tracking-wide">
                OmniStream
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30">
                PRO
              </span>
            </div>
          </div>
        </div>

        {/* Global Instant Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md relative hidden md:block">
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder={getSearchPlaceholder()}
            className="w-full bg-slate-900/80 border border-slate-800 rounded-xl py-2 pl-9 pr-8 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all font-sans"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          {localSearch && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </form>

        {/* Primary Navigation Hubs */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-1">
          {/* Home */}
          <button
            onClick={() => {
              setActiveTab('home');
              handleClearSearch();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'home'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-1 ring-blue-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Home</span>
          </button>

          {/* Movies & TV */}
          <button
            onClick={() => {
              setActiveTab('media');
              handleClearSearch();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'media'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-indigo-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Movies & TV</span>
          </button>

          {/* Anime */}
          <button
            onClick={() => {
              setActiveTab('anime');
              handleClearSearch();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'anime'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 ring-1 ring-purple-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Anime</span>
          </button>

          {/* Comics & Manga */}
          <button
            onClick={() => {
              setActiveTab('browse');
              handleClearSearch();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'browse'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30 ring-1 ring-sky-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Manga & Comics</span>
          </button>

          {/* Audiobooks */}
          <button
            onClick={() => {
              setActiveTab('audiobooks');
              handleClearSearch();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'audiobooks'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 ring-1 ring-amber-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Headphones className="w-3.5 h-3.5" />
            <span>Audiobooks</span>
          </button>

          {/* Live Sports */}
          <button
            onClick={() => {
              setActiveTab('sports');
              handleClearSearch();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'sports'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 ring-1 ring-rose-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Sports</span>
          </button>
        </div>

        {/* Right Action Tools */}
        <div className="flex items-center gap-1.5 text-slate-300">
          <button
            onClick={onOpenAndroidTV}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/50 text-amber-300 font-bold text-xs transition-colors cursor-pointer shadow-sm shadow-amber-400/10"
            title="Connect / Stream on Android TV Box"
          >
            <Tv className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Android TV</span>
          </button>

          <button
            onClick={onOpenCommandPalette}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer hidden sm:flex items-center gap-1 text-xs"
            title="Command Palette (Ctrl + K)"
          >
            <Command className="w-3.5 h-3.5" />
            <span className="text-[10px] text-slate-500 font-mono">⌘K</span>
          </button>

          <button
            onClick={onOpenStats}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Library & Watch Stats"
          >
            <Bookmark className="w-4 h-4 text-purple-400" />
          </button>
        </div>
      </div>
    </header>
  );
};

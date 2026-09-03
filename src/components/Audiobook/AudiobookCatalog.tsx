import React, { useState, useRef } from 'react';
import { Audiobook } from '../../types/audiobook';
import { AudiobookCard } from './AudiobookCard';
import { audiobookStorage } from '../../services/audiobookStorage';
import {
  Headphones,
  Upload,
  Search,
  Sparkles,
  Flame,
  Volume2,
  Clock,
  Radio,
  Compass,
  Scroll,
  TrendingUp,
  X,
  Layers,
  Briefcase,
  Play,
  Star,
  CheckCircle2,
  Award,
  Disc,
  ListMusic,
  Link as LinkIcon,
  Globe,
  ExternalLink,
  Loader2,
  Settings,
  Zap,
  HardDrive,
  Server
} from 'lucide-react';
import { AudiobookSettingsModal } from './AudiobookSettingsModal';

interface AudiobookCatalogProps {
  audiobooks: Audiobook[];
  localAudiobooks: Audiobook[];
  loading: boolean;
  onSelectBook: (book: Audiobook) => void;
  onUploadFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectCategory: (category: string) => void;
  activeCategory: string;
  searchQuery: string;
  onSearchQuery: (query: string) => void;
}

const AUDIOBOOK_PLATFORMS = [
  {
    id: 'graphicaudio',
    name: '🎬 GraphicAudio (Movie in Your Mind)',
    tag: 'GRAPHICAUDIO',
    bg: 'bg-red-600/20 text-red-300 border-red-500/40 hover:bg-red-600 hover:text-white',
    activeBg: 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-red-600/40 border-amber-400 ring-2 ring-amber-400/50'
  },
  {
    id: 'abb',
    name: '⚡ Debrid & AudiobookBay',
    tag: 'DEBRID',
    bg: 'bg-amber-600/20 text-amber-300 border-amber-500/40 hover:bg-amber-600 hover:text-slate-950',
    activeBg: 'bg-amber-500 text-slate-950 shadow-amber-500/40 border-amber-400 ring-2 ring-amber-400/50'
  },
  {
    id: 'local',
    name: '📁 Local & Audiobookshelf',
    tag: 'LOCAL',
    bg: 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-600 hover:text-white',
    activeBg: 'bg-emerald-600 text-white shadow-emerald-600/40 border-emerald-400 ring-2 ring-emerald-400/50'
  },
  {
    id: 'dramatized',
    name: '🎭 Full Cast & Dramatized',
    tag: 'FULL CAST',
    bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500 hover:text-slate-950',
    activeBg: 'bg-amber-500 text-slate-950 shadow-amber-500/40 border-amber-400 ring-2 ring-amber-400/50'
  },
  {
    id: 'audible',
    name: 'Audible Originals',
    tag: 'AUDIBLE',
    bg: 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-600 hover:text-white',
    activeBg: 'bg-indigo-600 text-white shadow-indigo-600/40 border-indigo-400 ring-2 ring-indigo-400/50'
  },
  {
    id: 'libby',
    name: '📚 Libby & OverDrive',
    tag: 'LIBBY',
    bg: 'bg-teal-600/20 text-teal-300 border-teal-500/40 hover:bg-teal-600 hover:text-white',
    activeBg: 'bg-teal-600 text-white shadow-teal-600/40 border-teal-400 ring-2 ring-teal-400/50'
  },
  {
    id: 'librivox',
    name: '🏛️ LibriVox Public Domain',
    tag: 'LIBRIVOX',
    bg: 'bg-sky-600/20 text-sky-300 border-sky-500/40 hover:bg-sky-600 hover:text-white',
    activeBg: 'bg-sky-500 text-white shadow-sky-500/40 border-sky-400 ring-2 ring-sky-400/50'
  },
  {
    id: 'bbcsounds',
    name: 'BBC Sounds Radio',
    tag: 'BBC SOUNDS',
    bg: 'bg-rose-600/20 text-rose-300 border-rose-500/40 hover:bg-rose-600 hover:text-white',
    activeBg: 'bg-rose-600 text-white shadow-rose-600/40 border-rose-400 ring-2 ring-rose-400/50'
  }
];

const AUDIOBOOK_CATEGORIES = [
  { id: 'graphicaudio', label: '🎬 GraphicAudio', icon: Sparkles },
  { id: 'dramatized', label: '🎭 Full Cast Dramas', icon: Award },
  { id: 'popular', label: '🔥 Top Trending', icon: TrendingUp },
  { id: 'fantasy', label: '🐉 Epic Fantasy & Sci-Fi', icon: Compass },
  { id: 'selfhelp', label: '🧠 Mindset & Habits', icon: Flame },
  { id: 'business', label: '💼 Strategy & Wealth', icon: Briefcase }
];

const POPULAR_AUDIOBOOK_SEARCHES = [
  'Mistborn Final Empire GraphicAudio',
  'The Way of Kings GraphicAudio',
  'Lord of the Rings Phil Dragash',
  'Red Rising GraphicAudio',
  'A Court of Thorns and Roses GraphicAudio',
  'Fourth Wing GraphicAudio',
  'The Sandman Full Cast',
  'Dune Full Cast Drama',
  'Good Omens BBC Radio',
  'Batman No Mans Land GraphicAudio',
  'Ender\'s Game Alive',
  'Atomic Habits James Clear'
];

export const AudiobookCatalog: React.FC<AudiobookCatalogProps> = ({
  audiobooks,
  localAudiobooks,
  loading,
  onSelectBook,
  onUploadFile,
  onSelectCategory,
  activeCategory,
  searchQuery,
  onSearchQuery
}) => {
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [pastedUrl, setPastedUrl] = useState('');
  const [isResolvingLink, setIsResolvingLink] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isPlatformActive = AUDIOBOOK_PLATFORMS.some((p) => p.id === activeCategory);
  const featured = audiobooks[0];

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0 && fileInputRef.current) {
      fileInputRef.current.files = files;
      const event = new Event('change', { bubbles: true });
      fileInputRef.current.dispatchEvent(event);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchQuery(localSearch);
  };

  const handleClear = () => {
    setLocalSearch('');
    onSearchQuery('');
  };

  const handleStreamPastedUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedUrl.trim()) return;

    setIsResolvingLink(true);
    try {
      onSearchQuery(pastedUrl.trim());
      setShowLinkModal(false);
      setPastedUrl('');
    } finally {
      setIsResolvingLink(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-8 animate-fade-in">
      {/* Hidden Audio File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".mp3,.m4b,.m4a,.aac,.opus,.ogg"
        onChange={onUploadFile}
        className="hidden"
      />

      {/* -------------------------------------------------------------
          TOP BAR: STREAMING AUDIOBOOK NETWORK SELECTOR & DEBRID SETTINGS
         ------------------------------------------------------------- */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
            <Radio className="w-3.5 h-3.5 text-amber-400" />
            <span>Audiobook Networks & Full Cast Dramatizations</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettingsModal(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-amber-400 border border-slate-800 hover:border-amber-500/40 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Debrid & Library Settings</span>
            </button>
            {isPlatformActive && (
              <button
                onClick={() => onSelectCategory('popular')}
                className="text-xs text-slate-400 hover:text-white transition-colors underline font-medium cursor-pointer"
              >
                ← Back to All
              </button>
            )}
          </div>
        </div>

        {/* Branded Network Selector Bar */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
          {AUDIOBOOK_PLATFORMS.map((net) => {
            const isSelected = activeCategory === net.id && !searchQuery;
            return (
              <button
                key={net.id}
                onClick={() => onSelectCategory(net.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black tracking-wide border shadow-lg transition-all whitespace-nowrap flex-shrink-0 cursor-pointer ${
                  isSelected ? `${net.activeBg} scale-105` : `${net.bg} bg-slate-900/80`
                }`}
              >
                <span>{net.name}</span>
                {isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* -------------------------------------------------------------
          1. GRAPHICAUDIO SHOWCASE (A MOVIE IN YOUR MIND)
         ------------------------------------------------------------- */}
      {(activeCategory === 'graphicaudio' || activeCategory === 'dramatized') && !searchQuery && featured && (
        <div
          onClick={() => onSelectBook(featured)}
          className="group relative rounded-3xl overflow-hidden bg-gradient-to-r from-red-950/90 via-slate-950 to-black border-2 border-red-600/50 p-6 md:p-10 shadow-2xl cursor-pointer transition-all hover:border-amber-400 hover:shadow-red-600/20"
        >
          <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl space-y-3">
            <span className="px-3 py-1 rounded-lg bg-gradient-to-r from-red-600 to-amber-600 text-white font-black text-[10px] tracking-wider uppercase inline-flex items-center gap-1.5 shadow-lg">
              <Sparkles className="w-3.5 h-3.5 fill-current" />
              GraphicAudio • A Movie In Your Mind®
            </span>

            <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight">
              {featured.title}
            </h2>
            <p className="text-xs sm:text-sm font-bold text-amber-400">
              Cast of 30+ Voice Actors • Layered SFX • Original Orchestral Score
            </p>
            <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
              {featured.description}
            </p>

            <div className="pt-2 flex items-center gap-3">
              <button className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-500/30 flex items-center gap-2 transition-all hover:scale-105 cursor-pointer">
                <Play className="w-4 h-4 fill-current" />
                <span>Play Full Cast Audio Drama</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          2. AUDIBLE THEMED SHOWCASE
         ------------------------------------------------------------- */}
      {activeCategory === 'audible' && !searchQuery && featured && (
        <div
          onClick={() => onSelectBook(featured)}
          className="group relative rounded-3xl overflow-hidden bg-gradient-to-r from-indigo-950/80 via-slate-900 to-indigo-950/40 border-2 border-indigo-500/40 p-6 md:p-10 shadow-2xl cursor-pointer transition-all hover:border-indigo-400"
        >
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-indigo-500 text-white font-black text-[10px] tracking-wider uppercase">
                Audible Original
              </span>
              <span className="text-xs font-bold text-indigo-300">#1 Bestselling Narration</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-black text-white">{featured.title}</h2>
            <p className="text-xs sm:text-sm font-semibold text-indigo-300">
              By {featured.author} • Unabridged Edition
            </p>
            <p className="text-xs text-slate-300 line-clamp-2">{featured.description}</p>

            <div className="pt-2 flex items-center gap-3">
              <button className="px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-black text-xs sm:text-sm shadow-lg shadow-indigo-500/30 flex items-center gap-2 transition-all hover:scale-105 cursor-pointer">
                <Play className="w-4 h-4 fill-current" />
                <span>Listen with Audible</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          3. SPOTIFY AUDIOBOOKS SHOWCASE
         ------------------------------------------------------------- */}
      {activeCategory === 'spotify' && !searchQuery && featured && (
        <div
          onClick={() => onSelectBook(featured)}
          className="group relative rounded-3xl overflow-hidden bg-gradient-to-r from-emerald-950/80 via-slate-900 to-emerald-950/40 border-2 border-emerald-500/40 p-6 md:p-10 shadow-2xl cursor-pointer transition-all hover:border-emerald-400"
        >
          <div className="relative z-10 max-w-2xl space-y-3">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] tracking-wider uppercase inline-flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Included with Spotify Premium
            </span>

            <h2 className="text-2xl sm:text-4xl font-black text-white">{featured.title}</h2>
            <p className="text-xs sm:text-sm font-semibold text-emerald-400">By {featured.author}</p>
            <p className="text-xs text-slate-300 line-clamp-2">{featured.description}</p>

            <div className="pt-2 flex items-center gap-3">
              <button className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-emerald-500/30 flex items-center gap-2 transition-all hover:scale-105 cursor-pointer">
                <Play className="w-4 h-4 fill-current" />
                <span>Stream on Spotify</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          STANDARD HERO: SEARCH ANY AUDIOBOOK & UPLOAD
         ------------------------------------------------------------- */}
      {!isPlatformActive && !searchQuery && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="group relative rounded-3xl overflow-hidden bg-gradient-to-r from-red-950/30 via-slate-900 to-amber-950/30 border-2 border-dashed border-amber-500/40 hover:border-amber-400 p-6 md:p-10 text-center cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/10"
        >
          <div className="max-w-xl mx-auto space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Headphones className="w-7 h-7" />
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white">
              GraphicAudio, Full Cast Dramas & Audiobooks
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Experience Brandon Sanderson's *Mistborn* & *Stormlight Archive*, Pierce Brown's *Red Rising*, Sarah J. Maas *ACOTAR*, and Tolkien's *Lord of the Rings* in full-scale audio drama with background streaming and track navigation.
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowLinkModal(true);
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/30 inline-flex items-center gap-2 transition-all hover:scale-105 cursor-pointer"
              >
                <LinkIcon className="w-4 h-4" />
                <span>🔗 Stream Any Link / URL</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs sm:text-sm inline-flex items-center gap-2 transition-all cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Local File</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Universal Search Bar & Quick Link Streamer */}
      <div className="max-w-2xl mx-auto space-y-2">
        <form onSubmit={handleSearchSubmit} className="relative flex items-center gap-2">
          <div className="relative flex-1 flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Paste any link (VK, DevUploads, Storytel, GraphicAudio, MP3) or search..."
              className="w-full bg-slate-900/90 text-xs sm:text-sm text-slate-100 pl-10 pr-10 py-3.5 rounded-2xl border border-slate-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all shadow-inner font-medium"
            />
            {localSearch && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-3.5 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowLinkModal(true)}
            className="px-4 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-500/30 hover:border-amber-400 text-xs font-bold transition-all flex items-center gap-1.5 shadow-md flex-shrink-0 cursor-pointer"
            title="Paste & Stream Any Link"
          >
            <LinkIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Paste Link</span>
          </button>
        </form>
      </div>

      {/* -------------------------------------------------------------
          CONTINUE LISTENING SHELF (PERSISTENT PROGRESS & RESUME)
         ------------------------------------------------------------- */}
      {(() => {
        const recentHistory = audiobookStorage.getRecentHistory();
        if (recentHistory.length === 0 || searchQuery) return null;

        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Continue Listening ({recentHistory.length})
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {recentHistory.slice(0, 4).map((hist) => {
                const matchingBook = audiobooks.find((b) => b.id === hist.bookId) || {
                  id: hist.bookId,
                  title: hist.title,
                  author: hist.author,
                  cover: hist.cover,
                  durationSeconds: hist.duration,
                  lastPosition: hist.currentTime
                };

                const leftSec = Math.max(0, hist.duration - hist.currentTime);
                const leftH = Math.floor(leftSec / 3600);
                const leftM = Math.floor((leftSec % 3600) / 60);
                const leftStr = leftH > 0 ? `${leftH}h ${leftM}m left` : `${leftM}m left`;

                return (
                  <div
                    key={hist.bookId}
                    onClick={() => onSelectBook(matchingBook as Audiobook)}
                    className="group p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 hover:border-amber-500/50 transition-all cursor-pointer shadow-lg flex items-center gap-3.5"
                  >
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-800 flex-shrink-0 shadow-md">
                      {hist.cover ? (
                        <img src={hist.cover} alt={hist.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600">
                          <Headphones className="w-6 h-6" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <Play className="w-5 h-5 text-amber-400 fill-current opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <h4 className="text-xs sm:text-sm font-black text-white truncate group-hover:text-amber-300 transition-colors">
                        {hist.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate">{hist.author}</p>

                      <div className="space-y-1 pt-0.5">
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                          <span className="text-amber-400 font-bold">{leftStr}</span>
                          <span>{hist.percent}%</span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full" style={{ width: `${hist.percent}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Local Uploaded Audiobooks Shelf */}
      {localAudiobooks.length > 0 && !searchQuery && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Your Local Audiobooks ({localAudiobooks.length})
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {localAudiobooks.map((book) => (
              <AudiobookCard key={book.id} book={book} onClick={onSelectBook} />
            ))}
          </div>
        </div>
      )}

      {/* Quick Search Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs text-slate-400">
        <span className="font-semibold text-slate-300 flex-shrink-0">Popular:</span>
        {POPULAR_AUDIOBOOK_SEARCHES.map((query) => (
          <button
            key={query}
            onClick={() => {
              setLocalSearch(query);
              onSearchQuery(query);
            }}
            className="px-3 py-1 rounded-full bg-slate-900/90 hover:bg-amber-500 hover:text-slate-950 border border-slate-800 text-slate-300 transition-all flex-shrink-0 text-[11px] cursor-pointer"
          >
            {query}
          </button>
        ))}
      </div>

      {/* Genre Filter Bar */}
      {!isPlatformActive && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 scrollbar-none">
            {AUDIOBOOK_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id && !searchQuery;
              return (
                <button
                  key={cat.id}
                  onClick={() => onSelectCategory(cat.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          <div className="text-xs text-slate-400">
            {searchQuery ? (
              <span>
                Results for &quot;<strong className="text-white">{searchQuery}</strong>&quot;
              </span>
            ) : (
              <span>Continuous Audio with Sleep Fade & Chapter Navigation</span>
            )}
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl bg-slate-900/40 border border-slate-800/60 overflow-hidden"
            >
              <div className="aspect-square bg-slate-800/60 w-full" />
              <div className="p-3 space-y-2">
                <div className="h-3.5 bg-slate-800 rounded w-3/4" />
                <div className="h-2.5 bg-slate-800/60 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Audiobooks Grid */}
      {!loading && audiobooks.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Headphones className="w-4 h-4 text-amber-400" />
              <span>
                {activeCategory === 'graphicaudio'
                  ? '🎬 GraphicAudio® - A Movie In Your Mind'
                  : activeCategory === 'dramatized'
                  ? '🎭 Full Cast Audio Dramas'
                  : activeCategory === 'audible'
                  ? 'Audible Bestsellers & Originals'
                  : activeCategory === 'spotify'
                  ? 'Spotify Premium Audiobooks'
                  : activeCategory === 'bbcsounds'
                  ? 'BBC Radio 4 Audio Dramas'
                  : 'Popular Audiobooks & Full Cast Dramas'}
              </span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">{audiobooks.length} Available</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
            {audiobooks.map((book) => (
              <AudiobookCard key={book.id} book={book} onClick={onSelectBook} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && audiobooks.length === 0 && (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-12 text-center space-y-4 max-w-lg mx-auto">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500">
            <Headphones className="w-7 h-7" />
          </div>
          <p className="text-xs text-slate-400">
            Try searching for another narrator or title, or paste a link to stream directly.
          </p>
        </div>
      )}

      {/* -------------------------------------------------------------
          PASTE & STREAM ANY LINK MODAL
         ------------------------------------------------------------- */}
      {showLinkModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
          onClick={() => setShowLinkModal(false)}
        >
          <div
            className="relative w-full max-w-lg bg-[#0a0f1d] border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <LinkIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Stream Any Audiobook Link</h3>
                  <p className="text-xs text-slate-400">Paste any web link, cloud host, or direct audio URL</p>
                </div>
              </div>

              <button
                onClick={() => setShowLinkModal(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStreamPastedUrl} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-amber-400" />
                  <span>Audiobook URL / Stream Link</span>
                </label>
                <textarea
                  rows={3}
                  value={pastedUrl}
                  onChange={(e) => setPastedUrl(e.target.value)}
                  placeholder="Paste VK redirect, DevUploads, Storytel, GraphicAudio, PixelDrain, YouTube, or direct .mp3/.m4b link..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono shadow-inner resize-none"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400">Supported Sources:</span>
                <div className="flex flex-wrap gap-1.5 text-[10px] text-slate-400 font-mono">
                  <span className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-amber-300">VK Redirects</span>
                  <span className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-amber-300">DevUploads</span>
                  <span className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-amber-300">Storytel</span>
                  <span className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-amber-300">GraphicAudio</span>
                  <span className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-amber-300">PixelDrain</span>
                  <span className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-amber-300">YouTube</span>
                  <span className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-amber-300">Direct MP3 / M4B</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!pastedUrl.trim() || isResolvingLink}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/30 flex items-center gap-2 transition-all hover:scale-105 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isResolvingLink ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Resolving Stream...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>Stream Audiobook</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Debrid, Local Folder & Audiobookshelf Settings Modal */}
      <AudiobookSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onImportLocalBooks={(books) => {
          if (books.length > 0) {
            onSelectCategory('local');
          }
        }}
        onImportAbsBooks={(books) => {
          if (books.length > 0) {
            onSelectCategory('local');
          }
        }}
      />
    </div>
  );
};

import React, { useState, useRef } from 'react';
import { Audiobook } from '../../types/audiobook';
import { AudiobookCard } from './AudiobookCard';
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
  Award
} from 'lucide-react';

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
    id: 'audible',
    name: 'Audible',
    tag: 'AUDIBLE',
    bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500 hover:text-slate-950',
    activeBg: 'bg-amber-500 text-slate-950 shadow-amber-500/40 border-amber-400 ring-2 ring-amber-400/50'
  },
  {
    id: 'spotify',
    name: 'Spotify Audiobooks',
    tag: 'SPOTIFY',
    bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500 hover:text-slate-950',
    activeBg: 'bg-emerald-500 text-slate-950 shadow-emerald-500/40 border-emerald-400 ring-2 ring-emerald-400/50'
  },
  {
    id: 'graphicaudio',
    name: 'GraphicAudio (Full Cast)',
    tag: 'GRAPHICAUDIO',
    bg: 'bg-red-600/20 text-red-300 border-red-500/40 hover:bg-red-600 hover:text-white',
    activeBg: 'bg-red-600 text-white shadow-red-600/40 border-red-400 ring-2 ring-red-400/50'
  },
  {
    id: 'bbcsounds',
    name: 'BBC Sounds Radio',
    tag: 'BBC SOUNDS',
    bg: 'bg-rose-600/20 text-rose-300 border-rose-500/40 hover:bg-rose-600 hover:text-white',
    activeBg: 'bg-rose-600 text-white shadow-rose-600/40 border-rose-400 ring-2 ring-rose-400/50'
  },
  {
    id: 'storytel',
    name: 'Storytel',
    tag: 'STORYTEL',
    bg: 'bg-orange-600/20 text-orange-300 border-orange-500/40 hover:bg-orange-600 hover:text-white',
    activeBg: 'bg-orange-600 text-white shadow-orange-600/40 border-orange-400 ring-2 ring-orange-400/50'
  },
  {
    id: 'librofm',
    name: 'Libro.fm',
    tag: 'LIBRO.FM',
    bg: 'bg-purple-600/20 text-purple-300 border-purple-500/40 hover:bg-purple-600 hover:text-white',
    activeBg: 'bg-purple-600 text-white shadow-purple-600/40 border-purple-400 ring-2 ring-purple-400/50'
  },
  {
    id: 'librivox',
    name: 'LibriVox Free Domain',
    tag: 'LIBRIVOX',
    bg: 'bg-sky-600/20 text-sky-300 border-sky-500/40 hover:bg-sky-600 hover:text-white',
    activeBg: 'bg-sky-500 text-white shadow-sky-500/40 border-sky-400 ring-2 ring-sky-400/50'
  }
];

const AUDIOBOOK_CATEGORIES = [
  { id: 'popular', label: '🔥 Top Trending', icon: TrendingUp },
  { id: 'dramatized', label: '🎭 Full Cast & Dramatized', icon: Sparkles },
  { id: 'fantasy', label: '🐉 Epic Fantasy & Fiction', icon: Compass },
  { id: 'selfhelp', label: '🧠 Mindset & Self-Improvement', icon: Flame },
  { id: 'business', label: '💼 Strategy & Wealth', icon: Briefcase }
];

const POPULAR_AUDIOBOOK_SEARCHES = [
  'Dune Full Cast',
  'Good Omens BBC Radio',
  'The Sandman Full Cast',
  'Harry Potter Stephen Fry',
  'The Way of Kings Michael Kramer',
  'Atomic Habits James Clear',
  'The 48 Laws of Power',
  'Can\'t Hurt Me David Goggins',
  'Rich Dad Poor Dad',
  'GraphicAudio',
  'Brandon Sanderson',
  'Stephen King'
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
          TOP BAR: STREAMING AUDIOBOOK NETWORK SELECTOR
         ------------------------------------------------------------- */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
            <Radio className="w-3.5 h-3.5 text-amber-400" />
            <span>Audiobook Platforms & Streaming Services</span>
          </div>

          {isPlatformActive && (
            <button
              onClick={() => onSelectCategory('popular')}
              className="text-xs text-slate-400 hover:text-white transition-colors underline font-medium"
            >
              ← Back to All Audiobooks
            </button>
          )}
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
                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-pulse" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* -------------------------------------------------------------
          1. AUDIBLE THEMED SHOWCASE
         ------------------------------------------------------------- */}
      {activeCategory === 'audible' && !searchQuery && featured && (
        <div
          onClick={() => onSelectBook(featured)}
          className="group relative rounded-3xl overflow-hidden bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/40 border-2 border-amber-500/40 p-6 md:p-10 shadow-2xl cursor-pointer transition-all hover:border-amber-400"
        >
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-[10px] tracking-wider uppercase">
                Audible Original
              </span>
              <span className="text-xs font-bold text-amber-300">#1 Bestselling Narration</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-black text-white">{featured.title}</h2>
            <p className="text-xs sm:text-sm font-semibold text-amber-400">By {featured.author} • Unabridged Edition</p>
            <p className="text-xs text-slate-300 line-clamp-2">{featured.description}</p>

            <div className="pt-2 flex items-center gap-3">
              <button className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/30 flex items-center gap-2 transition-all hover:scale-105">
                <Play className="w-4 h-4 fill-current" />
                <span>Listen with Audible</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          2. SPOTIFY AUDIOBOOKS SHOWCASE
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
              <button className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-emerald-500/30 flex items-center gap-2 transition-all hover:scale-105">
                <Play className="w-4 h-4 fill-current" />
                <span>Stream on Spotify</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          3. GRAPHICAUDIO SHOWCASE (A MOVIE IN YOUR MIND)
         ------------------------------------------------------------- */}
      {activeCategory === 'graphicaudio' && !searchQuery && featured && (
        <div
          onClick={() => onSelectBook(featured)}
          className="group relative rounded-3xl overflow-hidden bg-gradient-to-r from-red-950/80 via-slate-900 to-black border-2 border-red-600/40 p-6 md:p-10 shadow-2xl cursor-pointer transition-all hover:border-red-500"
        >
          <div className="relative z-10 max-w-2xl space-y-3">
            <span className="px-3 py-1 rounded bg-red-600 text-white font-black text-[10px] tracking-wider uppercase inline-flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              A Movie In Your Mind® • Full Cast Dramatization
            </span>

            <h2 className="text-2xl sm:text-4xl font-black text-white">{featured.title}</h2>
            <p className="text-xs sm:text-sm font-semibold text-red-400">Cast of 30+ Actors • Full Orchestral Score & SFX</p>
            <p className="text-xs text-slate-300 line-clamp-2">{featured.description}</p>

            <div className="pt-2 flex items-center gap-3">
              <button className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-red-600/30 flex items-center gap-2 transition-all hover:scale-105">
                <Play className="w-4 h-4 fill-current" />
                <span>Play Full Cast Audio Drama</span>
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
          className="group relative rounded-3xl overflow-hidden bg-gradient-to-r from-amber-950/40 via-slate-900 to-indigo-950/40 border-2 border-dashed border-amber-500/40 hover:border-amber-400 p-6 md:p-10 text-center cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/10"
        >
          <div className="max-w-xl mx-auto space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Headphones className="w-7 h-7" />
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white">
              Stream Any Audiobook & Full Cast Dramas
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Background playback while you browse, with sleep timer volume fade-out, smart resume rewind, and Immersion Reading sync. Search any title (*Dune*, *The Sandman*, *Good Omens*, *Atomic Habits*).
            </p>

            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/30 inline-flex items-center gap-2 transition-all"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Local Audiobook File</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Universal Search Bar */}
      <div className="max-w-xl mx-auto">
        <form onSubmit={handleSearchSubmit} className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search ANY audiobook (Audible, Spotify, GraphicAudio, Harry Potter, Dune...)"
            className="w-full bg-slate-900/90 text-xs sm:text-sm text-slate-100 pl-10 pr-10 py-3 rounded-2xl border border-slate-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all shadow-inner"
          />
          {localSearch && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3.5 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>
      </div>

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
            className="px-3 py-1 rounded-full bg-slate-900/90 hover:bg-amber-500 hover:text-slate-950 border border-slate-800 text-slate-300 transition-all flex-shrink-0 text-[11px]"
          >
            {query}
          </button>
        ))}
      </div>

      {/* Genre Filter Bar (for standard view) */}
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
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
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
              <span>Results for &quot;<strong className="text-white">{searchQuery}</strong>&quot;</span>
            ) : (
              <span>Continuous Audio with Sleep Fade & Immersion Sync</span>
            )}
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl bg-slate-900/40 border border-slate-800/60 overflow-hidden">
              <div className="aspect-[2/3] bg-slate-800/60 w-full" />
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
                {activeCategory === 'audible'
                  ? 'Audible Bestsellers & Originals'
                  : activeCategory === 'spotify'
                  ? 'Spotify Premium Audiobooks'
                  : activeCategory === 'graphicaudio'
                  ? 'GraphicAudio Dramatizations'
                  : activeCategory === 'bbcsounds'
                  ? 'BBC Radio 4 Audio Dramas'
                  : activeCategory === 'storytel'
                  ? 'Storytel Audio Releases'
                  : activeCategory === 'librofm'
                  ? 'Libro.fm Indie Catalog'
                  : activeCategory === 'librivox'
                  ? 'LibriVox Public Domain Audio'
                  : 'Popular Audiobooks'}
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
          <h3 className="text-lg font-bold text-white">No Audiobooks Found</h3>
          <p className="text-xs text-slate-400">
            Try searching for another narrator or title, or upload your local audio file above.
          </p>
        </div>
      )}
    </div>
  );
};

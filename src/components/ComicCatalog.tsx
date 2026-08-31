import React, { useState } from 'react';
import { Comic } from '../types/comic';
import { ComicCard } from './ComicCard';
import {
  Sparkles,
  Layers,
  ShieldCheck,
  Flame,
  Compass,
  UploadCloud,
  Smartphone,
  Search,
  X,
  Globe,
  Zap,
  BookOpen,
  Shield,
  Star,
  Puzzle
} from 'lucide-react';

interface ComicCatalogProps {
  comics: Comic[];
  loading: boolean;
  onSelectComic: (comic: Comic) => void;
  onSelectCategory: (category: string) => void;
  activeCategory: string;
  searchQuery: string;
  onSearchQuery: (query: string) => void;
  onOpenSample: () => void;
  onOpenUpload: () => void;
  onOpenUrlModal: () => void;
  onOpenExtensions?: () => void;
}

const CATEGORIES = [
  { id: 'all', label: '🔥 All Trending', icon: Compass },
  { id: 'marvel', label: '🔴 Marvel Comics', icon: Flame },
  { id: 'dc', label: '🔵 DC Comics', icon: ShieldCheck },
  { id: 'darkhorse', label: '⚫ Dark Horse & Image', icon: Zap },
  { id: 'manga', label: '🌸 Manga (MangaDex)', icon: Layers },
  { id: 'webtoon', label: '📱 Webtoons & Manhwa', icon: Smartphone },
  { id: 'uploads', label: '📂 My Uploads (CBZ/CBR)', icon: UploadCloud },
];

const COMIC_STUDIOS = [
  {
    id: 'marvel',
    name: 'Marvel Comics',
    sub: 'Spider-Man, X-Men, Avengers & Wolverine',
    color: 'from-red-600/30 to-slate-950 border-red-500/40 text-red-400',
    icon: '🔴',
    popular: ['Spider-Man', 'X-Men', 'Deadpool', 'Avengers']
  },
  {
    id: 'dc',
    name: 'DC Comics Universe',
    sub: 'Batman, Superman, Justice League & Flash',
    color: 'from-blue-600/30 to-slate-950 border-blue-500/40 text-blue-400',
    icon: '🔵',
    popular: ['Batman', 'Superman', 'Watchmen', 'The Flash']
  },
  {
    id: 'darkhorse',
    name: 'Dark Horse & Image',
    sub: 'Invincible, Hellboy, Spawn & The Boys',
    color: 'from-amber-600/30 to-slate-950 border-amber-500/40 text-amber-400',
    icon: '⚫',
    popular: ['Invincible', 'Hellboy', 'Spawn', 'The Boys']
  },
  {
    id: 'manga',
    name: 'Manga & Manhwa',
    sub: 'Solo Leveling, One Piece, JJK & Berserk',
    color: 'from-purple-600/30 to-slate-950 border-purple-500/40 text-purple-400',
    icon: '🌸',
    popular: ['Solo Leveling', 'One Piece', 'Jujutsu Kaisen', 'Berserk']
  }
];

const POPULAR_SEARCHES = [
  'Spider-Man',
  'Batman',
  'Invincible',
  'Solo Leveling',
  'One Piece',
  'Jujutsu Kaisen',
  'X-Men',
  'Superman',
  'Chainsaw Man',
  'Demon Slayer',
  'Berserk',
  'Hellboy',
  'Spawn',
  'Deadpool',
  'Tower of God',
  'Watchmen',
  'Lore Olympus'
];

export const ComicCatalog: React.FC<ComicCatalogProps> = ({
  comics,
  loading,
  onSelectComic,
  onSelectCategory,
  activeCategory,
  searchQuery,
  onSearchQuery,
  onOpenSample,
  onOpenUpload,
  onOpenUrlModal,
  onOpenExtensions
}) => {
  const [localSearch, setLocalSearch] = useState(searchQuery);

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
      {/* Hero Banner (Shown when not searching) */}
      {!searchQuery && (
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-blue-950/90 via-indigo-950/70 to-purple-950/90 border border-blue-500/20 p-6 md:p-10 shadow-2xl">
          <div className="absolute -right-10 -bottom-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-0 right-0 p-8 opacity-10 hidden lg:block pointer-events-none">
            <Layers className="w-80 h-80 text-blue-400" />
          </div>

          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>MIHON & TACHIYOMI MULTI-SOURCE COMICS HUB</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
              Read Marvel, DC, Manga & Webtoons Free of Charge.
            </h1>

            <p className="text-sm md:text-base text-slate-300 leading-relaxed">
              Powered by modular <strong>Tachiyomi Scraper Extensions</strong>, <strong>Offline Chapter Downloads</strong>, and <strong>Smart Guided Panel View</strong>.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              {onOpenExtensions && (
                <button
                  onClick={onOpenExtensions}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all hover:scale-105 cursor-pointer"
                >
                  <Puzzle className="w-4 h-4" />
                  <span>Extension Manager</span>
                </button>
              )}

              <button
                onClick={onOpenSample}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm shadow-lg border border-slate-700 flex items-center gap-2 transition-all hover:scale-105 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span>Panel View Demo</span>
              </button>

              <button
                onClick={onOpenUrlModal}
                className="px-5 py-2.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/40 font-bold text-sm shadow-lg flex items-center gap-2 transition-all hover:scale-105 cursor-pointer"
              >
                <Globe className="w-4 h-4" />
                <span>Scrape Webtoon URL</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comic Studio Hubs Shelf */}
      {!searchQuery && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {COMIC_STUDIOS.map((studio) => (
            <div
              key={studio.id}
              onClick={() => onSelectCategory(studio.id)}
              className={`p-4 rounded-2xl bg-gradient-to-b ${studio.color} border cursor-pointer hover:scale-105 transition-all shadow-lg flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{studio.icon}</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-black/60 backdrop-blur-md">
                  Explore Hub
                </span>
              </div>
              <div>
                <h4 className="text-sm font-black text-white">{studio.name}</h4>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{studio.sub}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dedicated Interactive Comic Search Bar */}
      <div className="space-y-3">
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search any comic, Marvel, DC, Dark Horse, Manga, or Webtoon title..."
            className="w-full pl-12 pr-12 py-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 focus:border-blue-500 focus:outline-none text-xs sm:text-sm text-white placeholder-slate-500 shadow-xl"
          />
          {localSearch && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>

        {/* Quick Search Suggestion Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs text-slate-400">
          <span className="font-bold text-slate-300 flex-shrink-0 text-[11px]">Trending Searches:</span>
          {POPULAR_SEARCHES.map((term) => (
            <button
              key={term}
              onClick={() => {
                setLocalSearch(term);
                onSearchQuery(term);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-blue-400 border border-slate-800 whitespace-nowrap transition-colors cursor-pointer text-[11px]"
            >
              {term}
            </button>
          ))}
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="flex items-center justify-between gap-4 overflow-x-auto pb-2 scrollbar-none border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-105'
                    : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800/80'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {onOpenExtensions && (
            <button
              onClick={onOpenExtensions}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-950/60 hover:bg-blue-900/60 text-blue-300 hover:text-white text-xs font-bold transition-all whitespace-nowrap border border-blue-800/60 cursor-pointer"
            >
              <Puzzle className="w-3.5 h-3.5 text-blue-400" />
              <span>Extensions</span>
            </button>
          )}

          <button
            onClick={onOpenUpload}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all whitespace-nowrap border border-slate-700 cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5 text-blue-400" />
            <span>Upload Archive</span>
          </button>
        </div>
      </div>

      {/* Comics Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
            <div
              key={n}
              className="aspect-[2/3] rounded-2xl bg-slate-900/60 border border-slate-800/60 animate-pulse"
            />
          ))}
        </div>
      ) : comics.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {comics.map((comic) => (
            <ComicCard
              key={comic.id}
              comic={comic}
              onClick={() => onSelectComic(comic)}
            />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center space-y-4 bg-slate-900/30 rounded-3xl border border-slate-800/50">
          <BookOpen className="w-12 h-12 text-slate-600 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">No comics found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Try a different search query or select another studio category above.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

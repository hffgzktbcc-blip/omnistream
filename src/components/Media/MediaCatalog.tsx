import React, { useState } from 'react';
import { MediaItem } from '../../types/media';
import { MediaCard } from './MediaCard';
import { TrailerModal } from '../Common/TrailerModal';
import {
  Sparkles,
  Flame,
  Film,
  Tv,
  Star,
  Play,
  Info,
  Clapperboard,
  Compass,
  Radio,
  ChevronRight,
  TrendingUp,
  Search,
  Video
} from 'lucide-react';

interface MediaCatalogProps {
  mediaList: MediaItem[];
  loading: boolean;
  onSelectMedia: (item: MediaItem) => void;
  onSelectCategory: (category: string) => void;
  activeCategory: string;
  searchQuery: string;
  onSearchQuery: (query: string) => void;
}

// 1. Primary Media Type & Curated Thematic Collections
const CATEGORIES = [
  { id: 'trending', label: '🔥 Trending All', icon: Flame },
  { id: 'movies', label: '🎬 Feature Movies', icon: Film },
  { id: 'tv', label: '📺 TV Series', icon: Tv },
  { id: 'top_rated', label: '⭐ IMDb Top 250', icon: Star },
  { id: 'ghibli', label: '🍃 Studio Ghibli', icon: Sparkles },
  { id: 'scifi', label: '🚀 Sci-Fi Thrillers', icon: Compass },
  { id: 'superhero', label: '🦸 Marvel & DC', icon: Sparkles }
];


// 2. Curated Streaming Platforms
const STREAMING_NETWORKS = [
  {
    id: 'netflix',
    name: 'Netflix',
    brandColor: '#E50914',
    bg: 'border-red-500/30 text-red-400 hover:bg-red-600 hover:text-white',
    activeBg: 'bg-red-600 text-white shadow-red-600/40 border-red-500'
  },
  {
    id: 'disney',
    name: 'Disney+',
    brandColor: '#0063E5',
    bg: 'border-blue-500/30 text-blue-400 hover:bg-blue-600 hover:text-white',
    activeBg: 'bg-blue-600 text-white shadow-blue-600/40 border-blue-400'
  },
  {
    id: 'prime',
    name: 'Prime Video',
    brandColor: '#00A8E1',
    bg: 'border-sky-500/30 text-sky-300 hover:bg-sky-500 hover:text-white',
    activeBg: 'bg-sky-500 text-slate-950 shadow-sky-500/40 border-sky-400 font-black'
  },
  {
    id: 'max',
    name: 'Max (HBO)',
    brandColor: '#5A2E98',
    bg: 'border-purple-500/30 text-purple-300 hover:bg-purple-600 hover:text-white',
    activeBg: 'bg-purple-600 text-white shadow-purple-600/40 border-purple-400'
  },
  {
    id: 'appletv',
    name: 'Apple TV+',
    brandColor: '#FFFFFF',
    bg: 'border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white',
    activeBg: 'bg-slate-700 text-white shadow-slate-700/40 border-slate-400'
  },
  {
    id: 'paramount',
    name: 'Paramount+',
    brandColor: '#0064FF',
    bg: 'border-cyan-500/30 text-cyan-300 hover:bg-cyan-600 hover:text-white',
    activeBg: 'bg-cyan-600 text-white shadow-cyan-600/40 border-cyan-400'
  }
];

// 3. Quick Browse Chips
const QUICK_BROWSE_TAGS = [
  'Deadpool & Wolverine',
  'Stranger Things',
  'House of the Dragon',
  'The Boys',
  'Invincible',
  'Severance',
  'Spider-Man',
  'Dune: Part Two'
];

export const MediaCatalog: React.FC<MediaCatalogProps> = ({
  mediaList,
  loading,
  onSelectMedia,
  onSelectCategory,
  activeCategory,
  searchQuery,
  onSearchQuery
}) => {
  const [trailerItem, setTrailerItem] = useState<MediaItem | null>(null);
  const isPlatformActive = STREAMING_NETWORKS.some((n) => n.id === activeCategory);

  const featured = mediaList[0];
  const featuredTitle = featured?.title || featured?.name || featured?.original_title || 'Featured Film';
  const featuredBackdrop = featured?.backdrop_path
    ? featured.backdrop_path.startsWith('http')
      ? featured.backdrop_path
      : `https://image.tmdb.org/t/p/original${featured.backdrop_path}`
    : '';

  const activeNetworkObj = STREAMING_NETWORKS.find((n) => n.id === activeCategory);

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-8 animate-fade-in">
      {/* -------------------------------------------------------------
          1. CLEAN UNIFIED FILTER & PLATFORM BAR
         ------------------------------------------------------------- */}
      <div className="space-y-3">
        {/* Core Media Categories */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id && !searchQuery;
              return (
                <button
                  key={cat.id}
                  onClick={() => onSelectCategory(cat.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-400'
                      : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search Result or Platform Reset indicator */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            {searchQuery ? (
              <span>
                Search results for &quot;<strong className="text-white">{searchQuery}</strong>&quot;
              </span>
            ) : isPlatformActive ? (
              <button
                onClick={() => onSelectCategory('trending')}
                className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors cursor-pointer"
              >
                ← Clear Network Filter
              </button>
            ) : (
              <span className="font-mono text-slate-500 hidden sm:inline">Multi-Source 4K Cinema</span>
            )}
          </div>
        </div>

        {/* Streaming Platform Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex-shrink-0 flex items-center gap-1.5 mr-1">
            <Radio className="w-3 h-3 text-indigo-400" />
            <span>Platform:</span>
          </span>
          {STREAMING_NETWORKS.map((net) => {
            const isSelected = activeCategory === net.id && !searchQuery;
            return (
              <button
                key={net.id}
                onClick={() => onSelectCategory(net.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap flex-shrink-0 cursor-pointer ${
                  isSelected ? `${net.activeBg} scale-105` : `${net.bg} bg-slate-900/80`
                }`}
              >
                <span>{net.name}</span>
                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
              </button>
            );
          })}
        </div>

        {/* Popular Title Quick Search Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs text-slate-400">
          <span className="text-[11px] font-semibold text-slate-500 flex-shrink-0 mr-1">Popular:</span>
          {QUICK_BROWSE_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => onSearchQuery(tag)}
              className="px-2.5 py-0.5 rounded-full bg-slate-900/90 hover:bg-indigo-600 hover:text-white border border-slate-800 text-slate-300 transition-all flex-shrink-0 text-[11px] cursor-pointer"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* -------------------------------------------------------------
          2. CINEMATIC SPOTLIGHT BILLBOARD (When not searching)
         ------------------------------------------------------------- */}
      {!searchQuery && featured && (
        <div
          onClick={() => onSelectMedia(featured)}
          className="group relative rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 hover:border-indigo-500/50 p-6 md:p-10 shadow-2xl cursor-pointer transition-all min-h-[360px] md:min-h-[420px] flex flex-col justify-end"
        >
          {featuredBackdrop ? (
            <div
              className="absolute inset-0 bg-cover bg-center opacity-45 group-hover:scale-105 transition-transform duration-700 pointer-events-none"
              style={{ backgroundImage: `url(${featuredBackdrop})` }}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-950/80 via-slate-900 to-purple-950/80 pointer-events-none" />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F17] via-[#0B0F17]/60 to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B0F17] via-[#0B0F17]/70 to-transparent pointer-events-none" />

          <div className="relative z-10 max-w-2xl space-y-3.5">
            <div className="flex items-center gap-2 flex-wrap">
              {activeNetworkObj ? (
                <span
                  className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider text-white shadow-md"
                  style={{ backgroundColor: activeNetworkObj.brandColor }}
                >
                  {activeNetworkObj.name} Original
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider shadow-md">
                  #1 FEATURED
                </span>
              )}
              {featured.vote_average && (
                <span className="flex items-center gap-1 text-xs font-bold text-amber-400">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  {featured.vote_average.toFixed(1)} Rating
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight drop-shadow-lg">
              {featuredTitle}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed line-clamp-3 drop-shadow">
              {featured.overview || 'Stream full HD movies and complete television seasons ad-free.'}
            </p>

            <div className="pt-2 flex items-center gap-3 flex-wrap">
              <button
                onClick={() => onSelectMedia(featured)}
                className="px-6 py-3 rounded-2xl bg-white hover:bg-slate-200 text-slate-950 font-black text-xs sm:text-sm shadow-xl flex items-center gap-2 transition-all hover:scale-105 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current text-slate-950" />
                <span>Stream Now</span>
              </button>
              <button
                onClick={() => setTrailerItem(featured)}
                className="px-5 py-3 rounded-2xl bg-rose-600/90 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm shadow-xl shadow-rose-600/30 flex items-center gap-2 transition-all hover:scale-105 cursor-pointer"
              >
                <Video className="w-4 h-4 text-white" />
                <span>Watch Trailer</span>
              </button>
              <button
                onClick={() => onSelectMedia(featured)}
                className="px-5 py-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60 font-bold text-xs sm:text-sm backdrop-blur-md flex items-center gap-2 transition-all hover:scale-105 cursor-pointer"
              >
                <Info className="w-4 h-4" />
                <span>View Details</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          3. CLEAN MEDIA GRID & TOP 10 RANKINGS
         ------------------------------------------------------------- */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl bg-slate-900/40 border border-slate-800/60 overflow-hidden">
              <div className="aspect-[2/3] bg-slate-800/60 w-full" />
              <div className="p-3 space-y-2">
                <div className="h-3.5 bg-slate-800 rounded w-3/4" />
                <div className="h-2.5 bg-slate-800/60 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : mediaList.length > 0 ? (
        <div className="space-y-6">
          {/* Section Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Film className="w-4 h-4 text-indigo-400" />
              <span>
                {activeNetworkObj
                  ? `${activeNetworkObj.name} Catalog`
                  : activeCategory === 'movies'
                  ? 'Feature Movies'
                  : activeCategory === 'tv'
                  ? 'TV Shows & Series'
                  : activeCategory === 'superhero'
                  ? 'Marvel & DC Universe'
                  : activeCategory === 'action'
                  ? 'Action & Sci-Fi'
                  : 'Popular Movies & TV Shows'}
              </span>
            </h3>
            <span className="text-xs text-slate-500 font-mono">{mediaList.length} Titles</span>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
            {mediaList.map((item) => (
              <MediaCard key={item.id} item={item} onClick={onSelectMedia} />
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-12 text-center space-y-4 max-w-lg mx-auto">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500">
            <Film className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-white">No Titles Found</h3>
          <p className="text-xs text-slate-400">
            Try selecting a different platform or use the search bar above.
          </p>
        </div>
      )}


      {trailerItem && (
        <TrailerModal
          mediaId={trailerItem.id}
          mediaType={trailerItem.media_type === 'tv' ? 'tv' : 'movie'}
          title={trailerItem.title || trailerItem.name || trailerItem.original_title || 'Media'}
          onClose={() => setTrailerItem(null)}
          onPlayFullMedia={() => {
            const item = trailerItem;
            setTrailerItem(null);
            onSelectMedia(item);
          }}
        />
      )}
    </div>
  );
};


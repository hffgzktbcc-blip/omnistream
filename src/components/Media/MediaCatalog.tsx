import React, { useState, useMemo } from 'react';
import { MediaItem } from '../../types/media';
import { MediaCard } from './MediaCard';
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
  Check,
  Plus,
  Tv2,
  Zap,
  Globe,
  Award,
  Layers,
  Search,
  SlidersHorizontal,
  ChevronRight,
  TrendingUp
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

const CATEGORIES = [
  { id: 'trending', label: 'Trending All', icon: Flame },
  { id: 'movies', label: 'Feature Movies', icon: Film },
  { id: 'tv', label: 'TV Shows & Series', icon: Tv },
  { id: 'superhero', label: 'Marvel & DC', icon: Sparkles },
  { id: 'action', label: 'Action & Sci-Fi', icon: Compass }
];

const STREAMING_NETWORKS = [
  {
    id: 'netflix',
    name: 'Netflix',
    tag: 'NETFLIX',
    brandColor: '#E50914',
    bg: 'bg-red-600/20 text-red-400 border-red-500/40 hover:bg-red-600 hover:text-white',
    activeBg: 'bg-red-600 text-white shadow-red-600/40 border-red-500 ring-2 ring-red-500/50'
  },
  {
    id: 'disney',
    name: 'Disney+',
    tag: 'DISNEY+',
    brandColor: '#0063E5',
    bg: 'bg-blue-600/20 text-blue-400 border-blue-500/40 hover:bg-blue-600 hover:text-white',
    activeBg: 'bg-blue-600 text-white shadow-blue-600/40 border-blue-400 ring-2 ring-blue-500/50'
  },
  {
    id: 'prime',
    name: 'Prime Video',
    tag: 'PRIME',
    brandColor: '#00A8E1',
    bg: 'bg-sky-500/20 text-sky-300 border-sky-400/40 hover:bg-sky-500 hover:text-white',
    activeBg: 'bg-sky-500 text-white shadow-sky-500/40 border-sky-400 ring-2 ring-sky-500/50'
  },
  {
    id: 'max',
    name: 'Max (HBO)',
    tag: 'MAX',
    brandColor: '#5A2E98',
    bg: 'bg-purple-600/20 text-purple-300 border-purple-500/40 hover:bg-purple-600 hover:text-white',
    activeBg: 'bg-purple-600 text-white shadow-purple-600/40 border-purple-400 ring-2 ring-purple-500/50'
  },
  {
    id: 'appletv',
    name: 'Apple TV+',
    tag: ' TV+',
    brandColor: '#FFFFFF',
    bg: 'bg-slate-700/30 text-slate-200 border-slate-500/40 hover:bg-slate-700 hover:text-white',
    activeBg: 'bg-slate-700 text-white shadow-slate-700/40 border-slate-400 ring-2 ring-slate-400/50'
  },
  {
    id: 'hulu',
    name: 'Hulu',
    tag: 'HULU',
    brandColor: '#1CE783',
    bg: 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-600 hover:text-white',
    activeBg: 'bg-emerald-600 text-white shadow-emerald-600/40 border-emerald-400 ring-2 ring-emerald-500/50'
  },
  {
    id: 'paramount',
    name: 'Paramount+',
    tag: 'PARAMOUNT+',
    brandColor: '#0064FF',
    bg: 'bg-blue-700/20 text-cyan-300 border-blue-500/40 hover:bg-blue-700 hover:text-white',
    activeBg: 'bg-blue-700 text-white shadow-blue-700/40 border-cyan-400 ring-2 ring-cyan-500/50'
  },
  {
    id: 'peacock',
    name: 'Peacock',
    tag: 'PEACOCK',
    brandColor: '#F2A900',
    bg: 'bg-amber-600/20 text-amber-300 border-amber-500/40 hover:bg-amber-600 hover:text-white',
    activeBg: 'bg-amber-600 text-white shadow-amber-600/40 border-amber-400 ring-2 ring-amber-500/50'
  }
];

const DISNEY_BRAND_TILES = [
  { id: 'disney_core', name: 'Disney', icon: '🏰', subtitle: 'Walt Disney Animation & Classics', query: 'disney' },
  { id: 'pixar', name: 'Pixar', icon: '💡', subtitle: 'Pixar Animation Studios', query: 'disney_pixar' },
  { id: 'marvel', name: 'Marvel', icon: '🦸', subtitle: 'Marvel Cinematic Universe', query: 'disney_marvel' },
  { id: 'starwars', name: 'Star Wars', icon: '⚔️', subtitle: 'Lucasfilm Galaxy Saga', query: 'disney_starwars' },
  { id: 'natgeo', name: 'Nat Geo', icon: '🌍', subtitle: 'Documentaries & Nature', query: 'disney_natgeo' }
];

const POPULAR_MEDIA_SEARCHES = [
  'Deadpool & Wolverine',
  'Stranger Things',
  'House of the Dragon',
  'The Boys',
  'Invincible',
  'Severance',
  'The Last of Us',
  'The Mandalorian',
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
  const isStreamingAppView = ['netflix', 'disney', 'prime', 'max', 'appletv', 'hulu', 'paramount', 'peacock', 'disney_marvel', 'disney_starwars', 'disney_pixar', 'disney_natgeo'].includes(activeCategory);

  const featured = mediaList[0];
  const featuredTitle = featured?.title || featured?.name || featured?.original_title || 'Featured Film';
  const featuredBackdrop = featured?.backdrop_path
    ? featured.backdrop_path.startsWith('http')
      ? featured.backdrop_path
      : `https://image.tmdb.org/t/p/original${featured.backdrop_path}`
    : '';

  const top10List = mediaList.slice(0, 10);
  const remainingList = mediaList.slice(10);

  // Group into curated rows for authentic platform feel
  const trendingNow = mediaList.slice(0, 8);
  const criticallyAcclaimed = mediaList.slice(8, 16);
  const actionSuspense = mediaList.slice(16, 24);

  return (
    <div
      className={`max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-8 animate-fade-in transition-colors duration-500 ${
        activeCategory === 'netflix'
          ? 'theme-netflix'
          : activeCategory.startsWith('disney')
          ? 'theme-disney'
          : activeCategory === 'prime'
          ? 'theme-prime'
          : activeCategory === 'max'
          ? 'theme-max'
          : activeCategory === 'appletv'
          ? 'theme-appletv'
          : ''
      }`}
    >
      {/* -------------------------------------------------------------
          TOP BAR: STREAMING SERVICE SELECTOR & SEARCH CHIPS
         ------------------------------------------------------------- */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-black text-slate-300 uppercase tracking-wider">
            <Radio className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span>Select Streaming Platform</span>
          </div>

          {isStreamingAppView && (
            <button
              onClick={() => onSelectCategory('trending')}
              className="text-xs text-slate-400 hover:text-white transition-colors underline font-medium cursor-pointer"
            >
              ← Back to All Media
            </button>
          )}
        </div>

        {/* Branded Network Selector Bar */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
          {STREAMING_NETWORKS.map((net) => {
            const isSelected = (activeCategory === net.id || (net.id === 'disney' && activeCategory.startsWith('disney_'))) && !searchQuery;
            return (
              <button
                key={net.id}
                onClick={() => onSelectCategory(net.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black tracking-wide border shadow-lg transition-all whitespace-nowrap flex-shrink-0 cursor-pointer ${
                  isSelected ? `${net.activeBg} scale-105` : `${net.bg} bg-slate-900/80`
                }`}
              >
                <span>{net.name}</span>
                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
              </button>
            );
          })}
        </div>

        {/* Quick Search Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs text-slate-400">
          <span className="font-semibold text-slate-300 flex-shrink-0">Popular:</span>
          {POPULAR_MEDIA_SEARCHES.map((query) => (
            <button
              key={query}
              onClick={() => onSearchQuery(query)}
              className="px-3 py-1 rounded-full bg-slate-900/90 hover:bg-indigo-600 hover:text-white border border-slate-800 text-slate-300 transition-all flex-shrink-0 text-[11px] cursor-pointer"
            >
              {query}
            </button>
          ))}
        </div>
      </div>

      {/* -------------------------------------------------------------
          1. NETFLIX THEMED APP EXPERIENCE
         ------------------------------------------------------------- */}
      {activeCategory === 'netflix' && !searchQuery && (
        <div className="space-y-8 animate-fade-in">
          {/* Netflix App Header Nav */}
          <div className="flex items-center justify-between border-b border-red-600/30 pb-3">
            <div className="flex items-center gap-4">
              <span className="text-2xl font-black text-red-600 tracking-tighter">NETFLIX</span>
              <div className="hidden sm:flex items-center gap-4 text-xs font-bold text-slate-300">
                <span className="text-white hover:text-red-500 cursor-pointer">Home</span>
                <span className="hover:text-white cursor-pointer">TV Shows</span>
                <span className="hover:text-white cursor-pointer">Movies</span>
                <span className="hover:text-white cursor-pointer">New &amp; Popular</span>
                <span className="hover:text-white cursor-pointer">My List</span>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-red-600/20 text-red-400 border border-red-600/30">
              Netflix Experience
            </span>
          </div>

          {/* Netflix Hero Billboard */}
          {featured && (
            <div
              onClick={() => onSelectMedia(featured)}
              className="group relative rounded-3xl overflow-hidden bg-black border border-red-600/30 min-h-[380px] md:min-h-[460px] p-6 md:p-12 shadow-2xl cursor-pointer flex flex-col justify-end transition-all hover:border-red-500"
            >
              {featuredBackdrop && (
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-65 group-hover:scale-105 transition-transform duration-1000 pointer-events-none"
                  style={{ backgroundImage: `url(${featuredBackdrop})` }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent pointer-events-none" />

              <div className="relative z-10 max-w-2xl space-y-4">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-red-600 text-white font-black text-[10px] rounded tracking-wider">
                    N SERIES
                  </span>
                  <span className="text-xs font-bold text-red-400 uppercase tracking-widest flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 fill-current" />
                    #1 in TV Shows &amp; Movies Today
                  </span>
                </div>

                <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-none drop-shadow-lg">
                  {featuredTitle}
                </h1>

                <div className="flex items-center gap-2.5 text-xs text-slate-300 font-bold">
                  <span className="text-emerald-400">98% Match</span>
                  <span className="px-1.5 py-0.5 border border-slate-600 rounded text-[10px] text-slate-300">16+</span>
                  <span>4K Ultra HD</span>
                  <span className="px-1.5 py-0.5 border border-slate-600 rounded text-[10px] text-slate-300">Spatial Audio</span>
                </div>

                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed line-clamp-3 max-w-xl drop-shadow">
                  {featured.overview}
                </p>

                <div className="pt-2 flex items-center gap-3">
                  <button className="px-6 py-3 rounded-xl bg-white hover:bg-slate-200 text-black font-black text-xs sm:text-sm shadow-xl flex items-center gap-2 transition-all hover:scale-105 cursor-pointer">
                    <Play className="w-4 h-4 fill-current text-black" />
                    <span>Play</span>
                  </button>
                  <button className="px-5 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white font-bold text-xs sm:text-sm backdrop-blur-md flex items-center gap-2 transition-all border border-slate-600 cursor-pointer">
                    <Info className="w-4 h-4" />
                    <span>More Info</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Netflix TOP 10 In Your Region Today with Huge Numbers */}
          <div className="space-y-4">
            <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
              <span className="text-red-600">Top 10</span> Today on Netflix
            </h3>

            <div className="flex items-center gap-4 overflow-x-auto pb-4 scrollbar-none">
              {top10List.map((item, idx) => {
                const poster = item.poster_path
                  ? item.poster_path.startsWith('http')
                    ? item.poster_path
                    : `https://image.tmdb.org/t/p/w500${item.poster_path}`
                  : '';
                const itemTitle = item.title || item.name || 'Title';
                return (
                  <div
                    key={item.id}
                    onClick={() => onSelectMedia(item)}
                    className="relative flex items-end flex-shrink-0 cursor-pointer group select-none"
                  >
                    {/* Big Bold Ranking Number Behind Poster */}
                    <span className="text-7xl sm:text-8xl md:text-9xl font-black tracking-tighter text-slate-800 group-hover:text-red-600/70 transition-colors leading-none -mr-4 sm:-mr-6 z-0 select-none drop-shadow-2xl">
                      {idx + 1}
                    </span>

                    {/* Poster Card */}
                    <div className="w-32 sm:w-40 aspect-[2/3] rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 group-hover:border-red-500 shadow-2xl relative z-10 transition-all duration-300 group-hover:scale-105">
                      {poster ? (
                        <img src={poster} alt={itemTitle} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-500 font-bold text-xs p-2 text-center">
                          {itemTitle}
                        </div>
                      )}
                      <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-red-600 text-white font-black text-[9px]">
                        TOP 10
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Curated Row: Trending Now on Netflix */}
          {trendingNow.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-red-500" />
                <span>Trending Now on Netflix</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                {trendingNow.map((item) => (
                  <MediaCard key={item.id} item={item} onClick={onSelectMedia} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------
          2. DISNEY+ THEMED APP EXPERIENCE
         ------------------------------------------------------------- */}
      {activeCategory.startsWith('disney') && !searchQuery && (
        <div className="space-y-8 animate-fade-in">
          {/* Disney+ App Header */}
          <div className="flex items-center justify-between border-b border-blue-600/30 pb-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-white tracking-wide">
                Disney<span className="text-blue-400">+</span>
              </span>
              <div className="hidden sm:flex items-center gap-4 text-xs font-bold text-slate-300">
                <span
                  onClick={() => onSelectCategory('disney')}
                  className="text-white hover:text-blue-400 cursor-pointer"
                >
                  Originals
                </span>
                <span
                  onClick={() => onSelectCategory('disney_marvel')}
                  className="hover:text-white cursor-pointer"
                >
                  Marvel Universe
                </span>
                <span
                  onClick={() => onSelectCategory('disney_starwars')}
                  className="hover:text-white cursor-pointer"
                >
                  Star Wars
                </span>
                <span
                  onClick={() => onSelectCategory('disney_pixar')}
                  className="hover:text-white cursor-pointer"
                >
                  Pixar
                </span>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-blue-600/20 text-blue-300 border border-blue-500/30">
              Disney+ Vault
            </span>
          </div>

          {/* Disney+ 5 Brand Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
            {DISNEY_BRAND_TILES.map((tile) => {
              const isTileActive = activeCategory === tile.query;
              return (
                <div
                  key={tile.id}
                  onClick={() => onSelectCategory(tile.query)}
                  className={`group relative rounded-2xl p-4 sm:p-5 bg-gradient-to-b from-[#1e2337] to-[#121526] border-2 shadow-xl cursor-pointer transition-all duration-300 hover:scale-105 flex flex-col items-center justify-center text-center overflow-hidden ${
                    isTileActive ? 'border-blue-400 shadow-blue-500/40 ring-2 ring-blue-500/50 scale-105' : 'border-slate-700/60 hover:border-blue-400 hover:shadow-blue-500/20'
                  }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="text-3xl sm:text-4xl mb-1 filter drop-shadow group-hover:scale-110 transition-transform">
                    {tile.icon}
                  </span>
                  <h4 className="text-sm font-black text-white tracking-wide">{tile.name}</h4>
                  <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{tile.subtitle}</p>
                </div>
              );
            })}
          </div>

          {/* Disney+ Hero Showcase */}
          {featured && (
            <div
              onClick={() => onSelectMedia(featured)}
              className="group relative rounded-3xl overflow-hidden bg-[#040714] border-2 border-blue-600/40 min-h-[360px] p-6 md:p-10 shadow-2xl cursor-pointer flex flex-col justify-end transition-all hover:border-blue-400 hover:shadow-blue-600/30"
            >
              {featuredBackdrop && (
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-60 group-hover:scale-105 transition-transform duration-1000 pointer-events-none"
                  style={{ backgroundImage: `url(${featuredBackdrop})` }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#040714] via-[#040714]/60 to-transparent pointer-events-none" />

              <div className="relative z-10 max-w-xl space-y-3">
                <span className="px-3 py-1 rounded-full bg-blue-600/30 text-blue-300 text-[10px] font-black uppercase tracking-wider border border-blue-400/40 inline-flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-blue-400" />
                  Disney+ Exclusive
                </span>

                <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                  {featuredTitle}
                </h2>

                <p className="text-xs sm:text-sm text-slate-300 line-clamp-2">{featured.overview}</p>

                <div className="pt-2 flex items-center gap-3">
                  <button className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-blue-600/40 flex items-center gap-2 transition-all hover:scale-105 cursor-pointer">
                    <Play className="w-4 h-4 fill-current" />
                    <span>Watch Now</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Curated Disney Catalog Grid */}
          <div className="space-y-3">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span>
                {activeCategory === 'disney_marvel'
                  ? 'Marvel Cinematic Universe Collection'
                  : activeCategory === 'disney_starwars'
                  ? 'Star Wars: The Galaxy Saga'
                  : activeCategory === 'disney_pixar'
                  ? 'Pixar Animation Studios Hits'
                  : 'Disney+ Premieres & Originals'}
              </span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
              {mediaList.map((item) => (
                <MediaCard key={item.id} item={item} onClick={onSelectMedia} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          3. PRIME VIDEO THEMED APP EXPERIENCE
         ------------------------------------------------------------- */}
      {activeCategory === 'prime' && !searchQuery && (
        <div className="space-y-8 animate-fade-in">
          {/* Prime Video Header */}
          <div className="flex items-center justify-between border-b border-sky-500/30 pb-3">
            <div className="flex items-center gap-4">
              <span className="text-2xl font-black text-sky-400 tracking-tight">prime video</span>
              <div className="hidden sm:flex items-center gap-3 text-xs font-bold text-slate-300">
                <span className="text-white hover:text-sky-400 cursor-pointer">All</span>
                <span className="hover:text-white cursor-pointer">Movies</span>
                <span className="hover:text-white cursor-pointer">TV Shows</span>
                <span className="hover:text-white cursor-pointer">Amazon Originals</span>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-400/30 flex items-center gap-1">
              <Check className="w-3 h-3 text-sky-400" />
              Included with Prime
            </span>
          </div>

          {/* Prime Video Hero Banner */}
          {featured && (
            <div
              onClick={() => onSelectMedia(featured)}
              className="group relative rounded-3xl overflow-hidden bg-slate-950 border border-sky-500/30 min-h-[360px] p-6 md:p-10 shadow-2xl cursor-pointer flex flex-col justify-end transition-all hover:border-sky-400"
            >
              {featuredBackdrop && (
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-60 group-hover:scale-105 transition-transform duration-1000 pointer-events-none"
                  style={{ backgroundImage: `url(${featuredBackdrop})` }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent pointer-events-none" />

              <div className="relative z-10 max-w-xl space-y-3">
                <span className="px-2.5 py-1 rounded bg-sky-500 text-slate-950 text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1">
                  <Check className="w-3 h-3 stroke-[3]" />
                  Prime Video Original
                </span>

                <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                  {featuredTitle}
                </h2>

                <p className="text-xs sm:text-sm text-slate-300 line-clamp-2">{featured.overview}</p>

                <div className="pt-2 flex items-center gap-3">
                  <button className="px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-sky-500/30 flex items-center gap-2 transition-all hover:scale-105 cursor-pointer">
                    <Play className="w-4 h-4 fill-current" />
                    <span>Watch with Prime</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Curated Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
            {mediaList.map((item) => (
              <MediaCard key={item.id} item={item} onClick={onSelectMedia} />
            ))}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          4. MAX (HBO) THEMED APP EXPERIENCE
         ------------------------------------------------------------- */}
      {activeCategory === 'max' && !searchQuery && (
        <div className="space-y-8 animate-fade-in">
          <div className="flex items-center justify-between border-b border-purple-500/30 pb-3">
            <span className="text-2xl font-black text-purple-400 tracking-wider">MAX</span>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-purple-600/20 text-purple-300 border border-purple-500/30">
              HBO Prestige Collection
            </span>
          </div>

          {featured && (
            <div
              onClick={() => onSelectMedia(featured)}
              className="group relative rounded-3xl overflow-hidden bg-slate-950 border border-purple-500/30 min-h-[360px] p-6 md:p-10 shadow-2xl cursor-pointer flex flex-col justify-end transition-all hover:border-purple-400"
            >
              {featuredBackdrop && (
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-60 group-hover:scale-105 transition-transform duration-1000 pointer-events-none"
                  style={{ backgroundImage: `url(${featuredBackdrop})` }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent pointer-events-none" />

              <div className="relative z-10 max-w-xl space-y-3">
                <span className="px-2.5 py-1 rounded bg-purple-600 text-white text-[10px] font-black uppercase tracking-wider">
                  HBO Original Series
                </span>
                <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                  {featuredTitle}
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 line-clamp-2">{featured.overview}</p>
                <div className="pt-2 flex items-center gap-3">
                  <button className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-purple-600/30 flex items-center gap-2 transition-all hover:scale-105 cursor-pointer">
                    <Play className="w-4 h-4 fill-current" />
                    <span>Stream on Max</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
            {mediaList.map((item) => (
              <MediaCard key={item.id} item={item} onClick={onSelectMedia} />
            ))}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          5. STANDARD CINEMA SPOTLIGHT BANNER (For Trending & General Views)
         ------------------------------------------------------------- */}
      {!isStreamingAppView && !searchQuery && featured && (
        <div
          onClick={() => onSelectMedia(featured)}
          className="group relative rounded-3xl overflow-hidden bg-slate-900 border border-indigo-500/30 p-6 md:p-10 shadow-2xl cursor-pointer transition-all hover:border-indigo-500/60"
        >
          {featuredBackdrop ? (
            <div
              className="absolute inset-0 bg-cover bg-center opacity-35 group-hover:scale-105 transition-transform duration-700 pointer-events-none"
              style={{ backgroundImage: `url(${featuredBackdrop})` }}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-950/80 via-slate-900 to-purple-950/80" />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F17] via-[#0B0F17]/60 to-transparent pointer-events-none" />

          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold">
              <Clapperboard className="w-3.5 h-3.5 text-indigo-400" />
              <span>SPOTLIGHT CINEMA &amp; TV</span>
            </div>

            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
              {featuredTitle}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed line-clamp-3">
              {featured.overview || 'Stream full HD movies and complete television seasons ad-free.'}
            </p>

            <div className="pt-2 flex items-center gap-3">
              <button className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all hover:scale-105 cursor-pointer">
                <Play className="w-4 h-4 fill-current" />
                <span>Stream Now</span>
              </button>
              {featured.vote_average && (
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/60 backdrop-blur-md text-xs font-bold text-amber-400 border border-amber-500/30">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>{featured.vote_average.toFixed(1)} / 10</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          GENRE / SUB-CATEGORY FILTER BAR
         ------------------------------------------------------------- */}
      {!isStreamingAppView && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 scrollbar-none">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id && !searchQuery;
              return (
                <button
                  key={cat.id}
                  onClick={() => onSelectCategory(cat.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
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
              <span>Ultra Fast HD Streaming (Multi-Server 4K)</span>
            )}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          GRID OF MEDIA CARDS
         ------------------------------------------------------------- */}
      {loading && (
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
      )}

      {!loading && mediaList.length > 0 && !isStreamingAppView && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Film className="w-4 h-4 text-indigo-400" />
              <span>Popular Movies &amp; TV Shows</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">{mediaList.length} Titles</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
            {mediaList.map((item) => (
              <MediaCard
                key={item.id}
                item={item}
                onClick={onSelectMedia}
              />
            ))}
          </div>
        </div>
      )}

      {!loading && mediaList.length === 0 && (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-12 text-center space-y-4 max-w-lg mx-auto">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500">
            <Film className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-white">No Movies or Shows Found</h3>
          <p className="text-xs text-slate-400">
            Try searching for a different title or select a streaming network above.
          </p>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Comic } from '../../types/comic';
import { Anime } from '../../types/anime';
import { MediaItem } from '../../types/media';
import { Audiobook } from '../../types/audiobook';
import { SportsMatch } from '../../types/sports';
import { animeStorage } from '../../services/animeStorage';
import { storage } from '../../services/storage';
import {
  BookOpen,
  Tv,
  Film,
  Headphones,
  Trophy,
  Sparkles,
  Play,
  Flame,
  ArrowRight,
  TrendingUp,
  Clock,
  Star,
  Compass,
  Radio,
  Layers,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

interface HomeDashboardProps {
  onNavigateTab: (tab: 'home' | 'browse' | 'anime' | 'media' | 'audiobooks' | 'sports' | 'rss' | 'library') => void;
  onSelectComic: (comic: Comic) => void;
  onSelectAnime: (anime: Anime) => void;
  onSelectMedia: (media: MediaItem) => void;
  onSelectAudiobook: (book: Audiobook) => void;
  onSelectSportsMatch: (match: SportsMatch) => void;
  trendingComics: Comic[];
  trendingAnime: Anime[];
  trendingMedia: MediaItem[];
  popularAudiobooks: Audiobook[];
  liveSports: SportsMatch[];
}

const SPOTLIGHT_ITEMS = [
  {
    id: 'deadpool_wolverine',
    type: 'media',
    title: 'Deadpool & Wolverine',
    subtitle: 'Movie • 4K Ultra HD • Action / Comedy',
    tag: '#1 MOVIE WORLDWIDE',
    tagColor: 'bg-rose-600',
    description: 'A listless Wade Wilson toils away in civilian life when the TVA pulls him into a multiversal mission requiring him to team up with a reluctant Wolverine.',
    cover: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1200&auto=format&fit=crop',
    actionText: 'Watch in 4K',
    actionTab: 'media'
  },
  {
    id: 'solo_leveling',
    type: 'anime',
    title: 'Solo Leveling: Arise',
    subtitle: 'Anime Simulcast • Sub & Dub • Season 2',
    tag: 'GLOBAL HIT',
    tagColor: 'bg-purple-600',
    description: 'In a world where hunters must battle deadly monsters, Sung Jinwoo, the weakest E-rank hunter, awakens with a secret quest log only he can see.',
    cover: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1200&auto=format&fit=crop',
    actionText: 'Watch Episode 1',
    actionTab: 'anime'
  },
  {
    id: 'six_nations_rugby',
    type: 'sports',
    title: 'Six Nations Rugby Championship',
    subtitle: 'Live Sports • Rugby Union • HD Feed',
    tag: 'LIVE TOURNAMENT',
    tagColor: 'bg-emerald-600',
    description: 'The pinnacle of international rugby union. Watch Ireland, France, England, Scotland, Wales, and Italy compete in high-stakes European clashes.',
    cover: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=1200&auto=format&fit=crop',
    actionText: 'Open Match Center',
    actionTab: 'sports'
  },
  {
    id: 'dune_part_two',
    type: 'media',
    title: 'Dune: Part Two',
    subtitle: 'Movie • 4K HDR • Sci-Fi Epic',
    tag: 'BLOCKBUSTER',
    tagColor: 'bg-amber-600',
    description: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.',
    cover: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop',
    actionText: 'Stream in 4K',
    actionTab: 'media'
  }
];

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  onNavigateTab,
  onSelectComic,
  onSelectAnime,
  onSelectMedia,
  onSelectAudiobook,
  onSelectSportsMatch,
  trendingComics,
  trendingAnime,
  trendingMedia,
  popularAudiobooks,
  liveSports
}) => {
  const [activeSpotlight, setActiveSpotlight] = useState(0);
  const [continueWatchingAnime, setContinueWatchingAnime] = useState<any[]>([]);
  const [recentComics, setRecentComics] = useState<any[]>([]);

  useEffect(() => {
    setContinueWatchingAnime(animeStorage.getWatchlist().slice(0, 5));
    setRecentComics(storage.getProgress().slice(0, 5));
  }, []);

  // Spotlight Auto-Rotation
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSpotlight((prev) => (prev + 1) % SPOTLIGHT_ITEMS.length);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  const currentHero = SPOTLIGHT_ITEMS[activeSpotlight];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-10 animate-fade-in">
      
      {/* -------------------------------------------------------------
          1. CINEMATIC SPOTLIGHT BILLBOARD
         ------------------------------------------------------------- */}
      <div className="relative rounded-3xl overflow-hidden bg-slate-950 border border-slate-800/80 shadow-2xl min-h-[360px] md:min-h-[420px] flex flex-col justify-end p-6 md:p-12 transition-all duration-700">
        {/* Background Artwork with Gradient Mask */}
        <div className="absolute inset-0 z-0">
          <img
            src={currentHero.cover}
            alt={currentHero.title}
            className="w-full h-full object-cover object-center transform scale-105 transition-transform duration-1000"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-2xl space-y-3 sm:space-y-4">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider text-white shadow-md ${currentHero.tagColor}`}>
              {currentHero.tag}
            </span>
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400 fill-amber-400" />
              {currentHero.subtitle}
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white leading-tight tracking-tight drop-shadow-lg">
            {currentHero.title}
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 line-clamp-3 leading-relaxed max-w-xl">
            {currentHero.description}
          </p>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => onNavigateTab(currentHero.actionTab as any)}
              className="px-6 py-3 rounded-2xl bg-white hover:bg-slate-200 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-xl shadow-white/10 transition-all hover:scale-105 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>{currentHero.actionText}</span>
            </button>
            <button
              onClick={() => onNavigateTab(currentHero.actionTab as any)}
              className="px-5 py-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60 font-bold text-xs sm:text-sm backdrop-blur-md flex items-center gap-2 transition-all hover:scale-105 cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
              <span>Explore Hub</span>
            </button>
          </div>
        </div>

        {/* Carousel Indicators */}
        <div className="absolute bottom-6 right-6 z-10 flex items-center gap-1.5">
          {SPOTLIGHT_ITEMS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveSpotlight(idx)}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                idx === activeSpotlight ? 'w-6 bg-white' : 'w-2 bg-slate-600 hover:bg-slate-400'
              }`}
            />
          ))}
        </div>
      </div>

      {/* -------------------------------------------------------------
          2. CONTINUE WATCHING & IN-PROGRESS QUEUE
         ------------------------------------------------------------- */}
      {continueWatchingAnime.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-400" />
              <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                Continue Watching
              </h2>
            </div>
            <button
              onClick={() => onNavigateTab('anime')}
              className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
            >
              <span>Watchlist</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {continueWatchingAnime.map((item, idx) => (
              <div
                key={idx}
                onClick={() => {
                  onNavigateTab('anime');
                  if (item.anime) onSelectAnime(item.anime);
                }}
                className="group relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-purple-500/50 shadow-lg cursor-pointer transition-all hover:scale-105"
              >
                <div className="aspect-[16/9] relative">
                  <img
                    src={item.cover}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] font-bold text-white">
                    <span className="px-1.5 py-0.5 rounded bg-purple-600/90 font-mono">
                      EP {item.currentEpisode || 1}
                    </span>
                    <span className="uppercase text-slate-300">{item.audioType || 'SUB'}</span>
                  </div>
                </div>
                <div className="p-2.5">
                  <h4 className="text-xs font-bold text-white truncate">{item.title}</h4>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          3. TOP 10 MOVIES & POPULAR SERIES
         ------------------------------------------------------------- */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-rose-500" />
            <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
              Top 10 Worldwide Movies & Shows
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/30">
              4K Ultra HD
            </span>
          </div>
          <button
            onClick={() => onNavigateTab('media')}
            className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
          >
            <span>View All Movies</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {trendingMedia.slice(0, 6).map((item) => (
            <div
              key={item.id}
              onClick={() => onSelectMedia(item)}
              className="group relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-indigo-500/60 shadow-xl cursor-pointer transition-all hover:scale-105"
            >
              <div className="aspect-[2/3] relative">
                <img
                  src={
                    item.poster_path
                      ? item.poster_path.startsWith('http')
                        ? item.poster_path
                        : `https://image.tmdb.org/t/p/w500${item.poster_path}`
                      : 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=500&auto=format&fit=crop'
                  }
                  alt={item.title || item.name || 'Movie'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-md text-[10px] font-bold text-amber-400 flex items-center gap-0.5 border border-white/10">
                  <Star className="w-2.5 h-2.5 fill-amber-400" />
                  <span>{item.vote_average ? item.vote_average.toFixed(1) : '8.5'}</span>
                </div>
              </div>
              <div className="p-3 space-y-1">
                <h4 className="text-xs font-bold text-white truncate">
                  {item.title || item.name}
                </h4>
                <p className="text-[10px] text-slate-400 capitalize">
                  {item.media_type === 'tv' ? 'TV Series' : 'Movie'} • {item.release_date ? item.release_date.slice(0, 4) : '2026'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* -------------------------------------------------------------
          4. TRENDING ANIME SIMULCASTS
         ------------------------------------------------------------- */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tv className="w-5 h-5 text-purple-400" />
            <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
              Trending Simulcast Anime
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-500/30">
              Sub & Dub
            </span>
          </div>
          <button
            onClick={() => onNavigateTab('anime')}
            className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
          >
            <span>View Anime Hub</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {trendingAnime.slice(0, 6).map((item) => (
            <div
              key={item.id}
              onClick={() => onSelectAnime(item)}
              className="group relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-purple-500/60 shadow-xl cursor-pointer transition-all hover:scale-105"
            >
              <div className="aspect-[2/3] relative">
                <img
                  src={item.coverImage?.extraLarge || item.coverImage?.large || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=500&auto=format&fit=crop'}
                  alt={item.title.english || item.title.romaji}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-md text-[10px] font-bold text-purple-300 border border-white/10">
                  {item.episodes ? `${item.episodes} EPS` : 'Airing'}
                </div>
              </div>
              <div className="p-3 space-y-1">
                <h4 className="text-xs font-bold text-white truncate">
                  {item.title.english || item.title.romaji}
                </h4>
                <p className="text-[10px] text-slate-400">
                  {item.genres?.slice(0, 2).join(' • ') || 'Action'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* -------------------------------------------------------------
          5. LIVE SPORTS MATCH CENTER
         ------------------------------------------------------------- */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-rose-500" />
            <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
              Live Rugby & Sports Center
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Streams
            </span>
          </div>
          <button
            onClick={() => onNavigateTab('sports')}
            className="text-xs font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
          >
            <span>View All Fixtures</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {liveSports.slice(0, 3).map((match) => {
            const homeName = typeof match.homeTeam === 'object' ? match.homeTeam?.name || 'Home' : String(match.homeTeam || 'Home');
            const awayName = typeof match.awayTeam === 'object' ? match.awayTeam?.name || 'Away' : String(match.awayTeam || 'Away');
            const homeScore = typeof match.homeTeam === 'object' ? match.homeTeam?.score : (match as any).homeScore;
            const awayScore = typeof match.awayTeam === 'object' ? match.awayTeam?.score : (match as any).awayScore;

            return (
              <div
                key={match.id}
                onClick={() => onSelectSportsMatch(match)}
                className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-rose-500/50 shadow-lg cursor-pointer transition-all hover:scale-102 space-y-3"
              >
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="text-slate-400 uppercase tracking-wider font-mono">
                    {match.league || 'Live Sports'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    {match.status === 'LIVE' ? '🔴 LIVE' : match.statusText || (match as any).time || 'Scheduled'}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-xs font-black text-white truncate">{homeName}</span>
                  </div>
                  <div className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono font-black text-amber-300">
                    {homeScore ?? '0'} - {awayScore ?? '0'}
                  </div>
                  <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                    <span className="text-xs font-black text-white truncate text-right">{awayName}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* -------------------------------------------------------------
          6. TRENDING MANGA & COMICS
         ------------------------------------------------------------- */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-sky-400" />
            <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
              Trending Manga & Manhwa
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-bold border border-sky-500/30">
              Webtoons & MangaDex
            </span>
          </div>
          <button
            onClick={() => onNavigateTab('browse')}
            className="text-xs font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
          >
            <span>View Manga Catalog</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {trendingComics.slice(0, 6).map((comic) => (
            <div
              key={comic.id}
              onClick={() => onSelectComic(comic)}
              className="group relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-sky-500/60 shadow-xl cursor-pointer transition-all hover:scale-105"
            >
              <div className="aspect-[2/3] relative">
                <img
                  src={comic.coverImage || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=500&auto=format&fit=crop'}
                  alt={comic.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-md text-[10px] font-bold text-sky-300 border border-white/10">
                  {comic.totalChapters ? `${comic.totalChapters} Ch` : 'Ongoing'}
                </div>
              </div>
              <div className="p-3 space-y-1">
                <h4 className="text-xs font-bold text-white truncate">{comic.title}</h4>
                <p className="text-[10px] text-slate-400 capitalize truncate">
                  {comic.publisher || 'MangaDex'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* -------------------------------------------------------------
          7. POPULAR AUDIOBOOKS
         ------------------------------------------------------------- */}
      {popularAudiobooks.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Headphones className="w-5 h-5 text-amber-400" />
              <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                Bestselling Audiobooks
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                Full Cast Narration
              </span>
            </div>
            <button
              onClick={() => onNavigateTab('audiobooks')}
              className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
            >
              <span>View All Audiobooks</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {popularAudiobooks.slice(0, 6).map((book) => (
              <div
                key={book.id}
                onClick={() => onSelectAudiobook(book)}
                className="group relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-amber-500/60 shadow-xl cursor-pointer transition-all hover:scale-105"
              >
                <div className="aspect-[2/3] relative">
                  <img
                    src={book.cover || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=500&auto=format&fit=crop'}
                    alt={book.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-md text-[10px] font-bold text-amber-300 border border-white/10">
                    {book.duration ? (typeof book.duration === 'number' ? `${Math.round(book.duration / 60)}m` : String(book.duration)) : 'Audiobook'}
                  </div>
                </div>
                <div className="p-3 space-y-1">
                  <h4 className="text-xs font-bold text-white truncate">{book.title}</h4>
                  <p className="text-[10px] text-slate-400 truncate">By {book.author}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

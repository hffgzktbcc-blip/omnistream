import React, { useState, useEffect, useRef } from 'react';
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
  ShieldCheck,
  Zap,
  Activity,
  CheckCircle2
} from 'lucide-react';

interface HomeDashboardProps {
  onNavigateTab: (
    tab: 'home' | 'browse' | 'anime' | 'media' | 'audiobooks' | 'sports' | 'rss' | 'library'
  ) => void;
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
    ambientGlow: 'rgba(225, 29, 72, 0.25)',
    description:
      'A listless Wade Wilson toils away in civilian life when the TVA pulls him into a multiversal mission requiring him to team up with a reluctant Wolverine.',
    cover:
      'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1200&auto=format&fit=crop',
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
    ambientGlow: 'rgba(147, 51, 234, 0.25)',
    description:
      'In a world where hunters must battle deadly monsters, Sung Jinwoo, the weakest E-rank hunter, awakens with a secret quest log only he can see.',
    cover:
      'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1200&auto=format&fit=crop',
    actionText: 'Watch Episode 1',
    actionTab: 'anime'
  },
  {
    id: 'six_nations_rugby',
    type: 'sports',
    title: 'SuperSport World of Champions',
    subtitle: 'Live Sports • Rugby, Premier League & F1 HD',
    tag: 'LIVE SATELLITE',
    tagColor: 'bg-amber-500 text-slate-950',
    ambientGlow: 'rgba(245, 158, 11, 0.25)',
    description:
      'The home of champions. Stream live Springboks test rugby, Premier League, UEFA Champions League, Formula 1, and UFC with zero delay.',
    cover:
      'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=1200&auto=format&fit=crop',
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
    ambientGlow: 'rgba(217, 119, 6, 0.25)',
    description:
      'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.',
    cover:
      'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop',
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
  const [progressPercent, setProgressPercent] = useState(0);
  const [continueWatchingAnime, setContinueWatchingAnime] = useState<any[]>([]);
  const [recentComics, setRecentComics] = useState<any[]>([]);

  useEffect(() => {
    setContinueWatchingAnime(animeStorage.getWatchlist().slice(0, 5));
    setRecentComics(storage.getProgress().slice(0, 5));
  }, []);

  // Spotlight Auto-Rotation with Animated Progress Indicator
  useEffect(() => {
    setProgressPercent(0);
    const interval = 50; // update progress every 50ms
    const totalDuration = 6000;
    const step = (interval / totalDuration) * 100;

    const timer = setInterval(() => {
      setProgressPercent((prev) => {
        if (prev >= 100) {
          setActiveSpotlight((s) => (s + 1) % SPOTLIGHT_ITEMS.length);
          return 0;
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [activeSpotlight]);

  const currentHero = SPOTLIGHT_ITEMS[activeSpotlight];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-10 animate-fade-in">
      {/* -------------------------------------------------------------
          1. ULTRA-DYNAMIC CINEMATIC SPOTLIGHT BILLBOARD
         ------------------------------------------------------------- */}
      <div className="relative rounded-3xl overflow-hidden bg-[#070b14] border border-slate-800 shadow-2xl min-h-[380px] md:min-h-[440px] flex flex-col justify-end p-6 md:p-12 transition-all duration-700 group">
        {/* Dynamic Ambient Color Halo */}
        <div
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl pointer-events-none transition-all duration-1000"
          style={{ backgroundColor: currentHero.ambientGlow }}
        />
        <div
          className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full blur-3xl pointer-events-none transition-all duration-1000"
          style={{ backgroundColor: currentHero.ambientGlow }}
        />

        {/* Background Artwork with Ken Burns Smooth Zoom */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img
            key={currentHero.id}
            src={currentHero.cover}
            alt={currentHero.title}
            className="w-full h-full object-cover object-center transform scale-105 animate-pulse-slow transition-all duration-1000"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#070b14] via-[#070b14]/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#070b14] via-[#070b14]/80 to-transparent" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-2xl space-y-3 sm:space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider shadow-md ${currentHero.tagColor}`}
            >
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

        {/* Dynamic Carousel Slide Selector Pills */}
        <div className="absolute bottom-6 right-6 z-10 flex items-center gap-2">
          {SPOTLIGHT_ITEMS.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveSpotlight(idx);
                setProgressPercent(0);
              }}
              className={`relative h-2 rounded-full overflow-hidden transition-all duration-300 cursor-pointer ${
                idx === activeSpotlight ? 'w-10 bg-slate-700' : 'w-2.5 bg-slate-800 hover:bg-slate-600'
              }`}
            >
              {idx === activeSpotlight && (
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-400 to-amber-300 rounded-full transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* -------------------------------------------------------------
          2. LIVE PULSE & REAL-TIME SYSTEM ACTIVITY TICKER
         ------------------------------------------------------------- */}
      <div className="rounded-2xl bg-gradient-to-r from-[#001433] via-[#001f4d] to-[#001026] border border-blue-900/60 p-3.5 shadow-xl flex items-center justify-between gap-4 flex-wrap text-xs text-blue-200 font-medium">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-bold text-white uppercase tracking-wider text-[11px]">
            Live Ecosystem
          </span>
        </div>

        <div className="flex items-center gap-4 sm:gap-6 flex-wrap font-mono text-[11px]">
          <span className="flex items-center gap-1.5 text-rose-300">
            <Film className="w-3.5 h-3.5 text-rose-400" />
            <span>4K Movies & TV Streaming</span>
          </span>
          <span className="flex items-center gap-1.5 text-purple-300">
            <Tv className="w-3.5 h-3.5 text-purple-400" />
            <span>Simulcasts Sub/Dub</span>
          </span>
          <span className="flex items-center gap-1.5 text-sky-300">
            <BookOpen className="w-3.5 h-3.5 text-sky-400" />
            <span>1,380 Keiyoushi Extensions</span>
          </span>
          <span className="flex items-center gap-1.5 text-amber-300">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>SuperSport Match Center</span>
          </span>
        </div>
      </div>

      {/* -------------------------------------------------------------
          3. DYNAMIC CONTINUE STREAMING & READING SHELF
         ------------------------------------------------------------- */}
      {(continueWatchingAnime.length > 0 || recentComics.length > 0) && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                Pick Up Where You Left Off
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
            {continueWatchingAnime.map((item, idx) => (
              <div
                key={`anime_${idx}`}
                onClick={() => {
                  onNavigateTab('anime');
                  if (item.anime) onSelectAnime(item.anime);
                }}
                className="group relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-purple-500/60 shadow-lg cursor-pointer transition-all hover:scale-105"
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
                <div className="p-2.5 flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white truncate">{item.title}</h4>
                  <Play className="w-3 h-3 text-purple-400 fill-current flex-shrink-0" />
                </div>
              </div>
            ))}

            {recentComics.map((item, idx) => (
              <div
                key={`comic_${idx}`}
                onClick={() => {
                  onNavigateTab('browse');
                  if (item.comic) onSelectComic(item.comic);
                }}
                className="group relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-sky-500/60 shadow-lg cursor-pointer transition-all hover:scale-105"
              >
                <div className="aspect-[16/9] relative">
                  <img
                    src={item.coverImage || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=200'}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] font-bold text-white">
                    <span className="px-1.5 py-0.5 rounded bg-sky-600/90 font-mono">
                      CH {item.currentChapter || 1}
                    </span>
                    <span className="text-slate-300">MANGA</span>
                  </div>
                </div>
                <div className="p-2.5 flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white truncate">{item.title}</h4>
                  <BookOpen className="w-3 h-3 text-sky-400 flex-shrink-0" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          4. MOVIES & TV POPULAR SHELF
         ------------------------------------------------------------- */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-rose-400" />
            <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
              Trending Movies & Series
            </h2>
          </div>
          <button
            onClick={() => onNavigateTab('media')}
            className="text-xs font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
          >
            <span>Explore All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
          {trendingMedia.slice(0, 6).map((item) => (
            <div
              key={item.id}
              onClick={() => onSelectMedia(item)}
              className="group relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-rose-500/60 shadow-xl cursor-pointer transition-all duration-300 hover:scale-105 hover:-translate-y-1"
            >
              <div className="aspect-[2/3] relative">
                <img
                  src={item.poster}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
                <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-md text-[10px] font-black text-amber-400 flex items-center gap-0.5 border border-white/10">
                  <Star className="w-2.5 h-2.5 fill-current" /> {item.rating || '8.5'}
                </div>
                <div className="absolute bottom-2 left-2 right-2">
                  <h4 className="text-xs font-bold text-white truncate group-hover:text-rose-300 transition-colors">
                    {item.title}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {item.type?.toUpperCase()} • {item.year || '2026'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* -------------------------------------------------------------
          5. ANIME SIMULCASTS SHELF
         ------------------------------------------------------------- */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tv className="w-5 h-5 text-purple-400" />
            <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
              Top Anime Simulcasts
            </h2>
          </div>
          <button
            onClick={() => onNavigateTab('anime')}
            className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
          >
            <span>Explore All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
          {trendingAnime.slice(0, 6).map((anime) => (
            <div
              key={anime.id}
              onClick={() => onSelectAnime(anime)}
              className="group relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-purple-500/60 shadow-xl cursor-pointer transition-all duration-300 hover:scale-105 hover:-translate-y-1"
            >
              <div className="aspect-[2/3] relative">
                <img
                  src={anime.coverImage}
                  alt={anime.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
                <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-purple-950/80 backdrop-blur-md text-[10px] font-black text-purple-300 border border-purple-500/30">
                  {anime.episodes ? `${anime.episodes} EPS` : 'SIMULCAST'}
                </div>
                <div className="absolute bottom-2 left-2 right-2">
                  <h4 className="text-xs font-bold text-white truncate group-hover:text-purple-300 transition-colors">
                    {anime.title}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {anime.genres?.[0] || 'Action'} • {anime.format || 'TV'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* -------------------------------------------------------------
          6. SUPERSPORT MATCH FIXTURES SPOTLIGHT
         ------------------------------------------------------------- */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
              SuperSport Live & Upcoming Center
            </h2>
          </div>
          <button
            onClick={() => onNavigateTab('sports')}
            className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
          >
            <span>Full Fixtures Grid</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {liveSports.slice(0, 3).map((match) => {
            const homeName =
              typeof match.homeTeam === 'object'
                ? match.homeTeam?.name || 'Home'
                : String(match.homeTeam || 'Home');
            const awayName =
              typeof match.awayTeam === 'object'
                ? match.awayTeam?.name || 'Away'
                : String(match.awayTeam || 'Away');
            const homeScore =
              typeof match.homeTeam === 'object' ? match.homeTeam?.score : undefined;
            const awayScore =
              typeof match.awayTeam === 'object' ? match.awayTeam?.score : undefined;

            return (
              <div
                key={match.id}
                onClick={() => onSelectSportsMatch(match)}
                className="p-4 rounded-2xl bg-[#00173d] border border-blue-900/60 hover:border-amber-400 cursor-pointer transition-all hover:scale-[1.02] shadow-xl flex flex-col justify-between space-y-3"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider">
                    {match.league}
                  </span>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded ${
                      match.status === 'LIVE'
                        ? 'bg-rose-600 text-white animate-pulse'
                        : match.status === 'FINISHED'
                        ? 'bg-blue-950 text-indigo-300 border border-indigo-500/40'
                        : 'bg-blue-950 text-blue-300 border border-blue-800'
                    }`}
                  >
                    {match.status === 'LIVE' ? 'LIVE NOW' : match.statusText || 'UPCOMING'}
                  </span>
                </div>

                <div className="space-y-1 text-sm font-bold text-white">
                  <div className="flex items-center justify-between">
                    <span className="truncate">{homeName}</span>
                    {homeScore !== undefined && (
                      <span className="text-amber-400 font-mono">{homeScore}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="truncate">{awayName}</span>
                    {awayScore !== undefined && (
                      <span className="text-amber-400 font-mono">{awayScore}</span>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-blue-900 flex items-center justify-between text-xs font-bold text-amber-400">
                  <span>Stream Channel</span>
                  <Play className="w-3.5 h-3.5 fill-current" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

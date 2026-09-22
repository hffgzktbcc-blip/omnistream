import React, { useState, useEffect } from 'react';
import { Comic } from '../../types/comic';
import { Anime } from '../../types/anime';
import { MediaItem } from '../../types/media';
import { SportsMatch } from '../../types/sports';
import { animeStorage } from '../../services/animeStorage';
import { storage } from '../../services/storage';
import { watchHistoryService, UnifiedHistoryItem } from '../../services/watchHistoryService';
import { fetchStreamHealth, StreamHealthReport } from '../../services/streamingService';
import {
  BookOpen,
  Tv,
  Film,
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
  CheckCircle2,
  Headphones,
  ChevronDown,
  ChevronUp,
  Server
} from 'lucide-react';

interface HomeDashboardProps {
  onNavigateTab: (
    tab: 'home' | 'browse' | 'anime' | 'media' | 'sports' | 'library' | 'audiobooks'
  ) => void;
  onSelectComic: (comic: Comic) => void;
  onSelectAnime: (anime: Anime) => void;
  onSelectMedia: (media: MediaItem) => void;
  onSelectSportsMatch: (match: SportsMatch) => void;
  trendingComics?: Comic[];
  trendingAnime?: Anime[];
  trendingMedia?: MediaItem[];
  liveSports?: SportsMatch[];
}

function formatTitle(title: any): string {
  if (!title) return '';
  if (typeof title === 'string') return title;
  if (typeof title === 'object') {
    return title.english || title.romaji || title.native || 'Anime Series';
  }
  return String(title);
}

function formatCover(coverImage: any): string {
  if (!coverImage) return 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=400';
  if (typeof coverImage === 'string') return coverImage;
  if (typeof coverImage === 'object') {
    return (
      coverImage.large ||
      coverImage.extraLarge ||
      coverImage.medium ||
      'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=400'
    );
  }
  return String(coverImage);
}

const SPOTLIGHT_ITEMS = [
  {
    id: 'deadpool_wolverine',
    type: 'media',
    title: 'Deadpool & Wolverine',
    subtitle: 'Movie • 4K Ultra HD • Action / Comedy',
    tag: '#1 MOVIE WORLDWIDE',
    tagColor: 'bg-rose-600 text-white',
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
    tagColor: 'bg-purple-600 text-white',
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
    tagColor: 'bg-amber-400 text-slate-950 font-black',
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
    tagColor: 'bg-amber-600 text-white',
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
  onSelectSportsMatch,
  trendingComics = [],
  trendingAnime = [],
  trendingMedia = [],
  liveSports = []
}) => {
  const [activeSpotlight, setActiveSpotlight] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [spotlightList, setSpotlightList] = useState<any[]>(SPOTLIGHT_ITEMS);
  const [continueWatchingAnime, setContinueWatchingAnime] = useState<any[]>([]);
  const [recentComics, setRecentComics] = useState<any[]>([]);
  const [historyItems, setHistoryItems] = useState<UnifiedHistoryItem[]>([]);
  const [streamHealth, setStreamHealth] = useState<StreamHealthReport | null>(null);
  const [showHealthDetails, setShowHealthDetails] = useState<boolean>(false);
  const [activeMoodFilter, setActiveMoodFilter] = useState<'all' | 'media' | 'anime' | 'sports' | 'audiobooks' | 'comics'>('all');
  const [dynamicMedia, setDynamicMedia] = useState<any[]>([]);
  const [dynamicAnime, setDynamicAnime] = useState<any[]>([]);
  const [dynamicSports, setDynamicSports] = useState<any[]>([]);

  // Fetch dynamic trending & spotlight feeds (Local static cache with remote GitHub fallback)
  useEffect(() => {
    const fetchDynamicFeeds = async () => {
      try {
        // Priority 1: Local /data/trending.json (bundled or cached)
        let res = await fetch('/data/trending.json', { cache: 'no-store' });
        if (!res.ok) {
          // Priority 2: Direct raw GitHub remote file (always live)
          res = await fetch('https://raw.githubusercontent.com/hffgzktbcc-blip/omnistream/main/public/data/trending.json');
        }
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.spotlights) && data.spotlights.length > 0) {
            setSpotlightList(data.spotlights);
          }
          if (Array.isArray(data.trendingMedia) && data.trendingMedia.length > 0) {
            setDynamicMedia(data.trendingMedia);
          }
          if (Array.isArray(data.trendingAnime) && data.trendingAnime.length > 0) {
            setDynamicAnime(data.trendingAnime);
          }
          if (Array.isArray(data.liveSports) && data.liveSports.length > 0) {
            setDynamicSports(data.liveSports);
          }
        }
      } catch (err) {
        console.warn('Could not load dynamic spotlight, using built-in catalog:', err);
      }
    };
    fetchDynamicFeeds();

    // Fetch live stream health telemetry from GitHub scout
    fetchStreamHealth().then((h) => {
      if (h) setStreamHealth(h);
    });
  }, []);

  useEffect(() => {
    try {
      const recent = watchHistoryService.getRecent(10);
      setHistoryItems(recent);
    } catch {
      setHistoryItems([]);
    }

    try {
      const watchlist = animeStorage.getWatchlist();
      setContinueWatchingAnime(Array.isArray(watchlist) ? watchlist.slice(0, 5) : []);
    } catch {
      setContinueWatchingAnime([]);
    }

    try {
      const progress = storage.getProgress();
      setRecentComics(Array.isArray(progress) ? progress.slice(0, 5) : []);
    } catch {
      setRecentComics([]);
    }
  }, []);

  // Spotlight Auto-Rotation with Animated Progress Indicator
  useEffect(() => {
    setProgressPercent(0);
    const interval = 50;
    const totalDuration = 6000;
    const step = (interval / totalDuration) * 100;

    const timer = setInterval(() => {
      setProgressPercent((prev) => {
        if (prev >= 100) {
          setActiveSpotlight((s) => (s + 1) % (spotlightList.length || 1));
          return 0;
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [activeSpotlight, spotlightList.length]);

  const currentHero = spotlightList[activeSpotlight] || spotlightList[0] || SPOTLIGHT_ITEMS[0];

  const safeMedia = Array.isArray(trendingMedia) && trendingMedia.length > 0 ? trendingMedia : dynamicMedia;
  const safeAnime = Array.isArray(trendingAnime) && trendingAnime.length > 0 ? trendingAnime : dynamicAnime;
  const safeComics = Array.isArray(trendingComics) ? trendingComics : [];
  const safeSports = Array.isArray(liveSports) && liveSports.length > 0 ? liveSports : dynamicSports;

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
            className="w-full h-full object-cover object-center transform scale-105 transition-all duration-1000"
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
              onClick={() => {
                if (currentHero.rawItem) {
                  if (currentHero.type === 'media') onSelectMedia(currentHero.rawItem);
                  else if (currentHero.type === 'anime') onSelectAnime(currentHero.rawItem);
                  else onNavigateTab(currentHero.actionTab as any);
                } else {
                  onNavigateTab(currentHero.actionTab as any);
                }
              }}
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
          {spotlightList.map((item, idx) => (
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
      {/* -------------------------------------------------------------
          2. DYNAMIC QUICK-MOOD & CATEGORY DISCOVERY BAR
         ------------------------------------------------------------- */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
        {[
          { id: 'all', label: 'All Discovery', icon: Flame, color: 'text-amber-400' },
          { id: 'media', label: '4K Movies & TV', icon: Film, color: 'text-rose-400' },
          { id: 'anime', label: 'Simulcast Anime', icon: Tv, color: 'text-purple-400' },
          { id: 'sports', label: 'SuperSport Live', icon: Trophy, color: 'text-emerald-400' },
          { id: 'audiobooks', label: 'Audiobooks', icon: Headphones, color: 'text-sky-400' },
          { id: 'comics', label: 'Manga & Comics', icon: BookOpen, color: 'text-cyan-400' },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeMoodFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveMoodFilter(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20 scale-105'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950 fill-current' : tab.color}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* -------------------------------------------------------------
          2.1 REAL-TIME STREAM ENGINE HEALTH TELEMETRY MONITOR
         ------------------------------------------------------------- */}
      <div className="rounded-2xl bg-gradient-to-r from-[#001433]/90 via-[#001f4d]/90 to-[#001026]/90 border border-blue-900/60 p-4 shadow-xl backdrop-blur-md transition-all">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping absolute" />
              <div className="w-3 h-3 rounded-full bg-emerald-400 relative" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-white text-xs uppercase tracking-wider">
                  Stream Engine Health
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-mono">
                  <ShieldCheck className="w-3 h-3" />
                  {streamHealth ? `${streamHealth.servers.filter((s: any) => s.status === 'online').length}/${streamHealth.servers.length} MIRRORS OPERATIONAL` : '6/6 ACTIVE'}
                </span>
              </div>
              <p className="text-[11px] text-blue-200/80 font-medium mt-0.5">
                {streamHealth?.bestServer ? (
                  <>Fastest Mirror: <span className="font-bold text-amber-300">{streamHealth.bestServer.name}</span> ({streamHealth.bestServer.latencyMs}ms) • Auto-failover verified</>
                ) : (
                  <>Real-time latency probed across VidLink, Videasy, AutoEmbed & Torrentio</>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHealthDetails(!showHealthDetails)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-950/80 hover:bg-blue-900 text-blue-200 border border-blue-800/80 hover:text-white transition-all cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5 text-blue-400" />
              <span>{showHealthDetails ? 'Hide Telemetry' : 'View Mirror Fleet'}</span>
              {showHealthDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Expandable Mirror Telemetry Grid */}
        {showHealthDetails && (
          <div className="mt-4 pt-3 border-t border-blue-900/60 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {(streamHealth?.servers || [
              { id: 'vidlink-pro', name: 'VidLink 4K Pro', status: 'online', latencyMs: 145 },
              { id: 'videasy-4k', name: 'Videasy 4K Ultra', status: 'online', latencyMs: 182 },
              { id: 'autoembed', name: 'AutoEmbed Ultra', status: 'online', latencyMs: 230 },
              { id: 'vidsrc-to', name: 'VidSrc TO Pro', status: 'online', latencyMs: 310 },
              { id: 'superembed', name: 'SuperEmbed Multi', status: 'online', latencyMs: 405 },
              { id: 'torrentio', name: 'Torrentio Debrid', status: 'online', latencyMs: 520 },
            ]).map((srv: any) => (
              <div
                key={srv.id}
                className="bg-slate-900/90 border border-blue-950/80 p-2.5 rounded-xl flex flex-col justify-between"
              >
                <div className="flex items-center justify-between text-[11px] font-bold text-white mb-1">
                  <span className="truncate">{srv.name}</span>
                  <div className={`w-2 h-2 rounded-full ${srv.status === 'online' ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span className="uppercase text-emerald-400 font-bold">{srv.status}</span>
                  <span>{srv.latencyMs}ms</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* -------------------------------------------------------------
          3. DYNAMIC CONTINUE STREAMING & READING SHELF
         ------------------------------------------------------------- */}
      {(activeMoodFilter === 'all' || activeMoodFilter === 'media' || activeMoodFilter === 'anime' || activeMoodFilter === 'comics' || activeMoodFilter === 'audiobooks') && (historyItems.length > 0 || continueWatchingAnime.length > 0 || recentComics.length > 0) && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                Pick Up Where You Left Off
              </h2>
            </div>
            {historyItems.length > 0 && (
              <span className="text-xs text-slate-400 font-medium">
                {historyItems.length} active in history
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
            {historyItems.length > 0
              ? historyItems.slice(0, 5).map((item) => {
                  const getBadgeConfig = () => {
                    switch (item.mediaType) {
                      case 'movie':
                        return { label: '4K MOVIE', color: 'bg-rose-600/90 text-white', icon: Film };
                      case 'tv':
                        return { label: item.subtitle || 'TV SHOW', color: 'bg-indigo-600/90 text-white', icon: Tv };
                      case 'anime':
                        return { label: item.subtitle || 'ANIME', color: 'bg-purple-600/90 text-white', icon: Play };
                      case 'comic':
                        return { label: item.subtitle || 'MANGA', color: 'bg-sky-600/90 text-white', icon: BookOpen };
                      case 'audiobook':
                        return { label: 'AUDIOBOOK', color: 'bg-amber-600/90 text-white', icon: Headphones };
                      default:
                        return { label: 'RESUME', color: 'bg-blue-600/90 text-white', icon: Play };
                    }
                  };

                  const badge = getBadgeConfig();
                  const BadgeIcon = badge.icon;

                  const handleItemClick = () => {
                    if (item.mediaType === 'movie' || item.mediaType === 'tv') {
                      if (item.rawItem) onSelectMedia(item.rawItem);
                      else onNavigateTab('media');
                    } else if (item.mediaType === 'anime') {
                      if (item.rawItem) onSelectAnime(item.rawItem);
                      else onNavigateTab('anime');
                    } else if (item.mediaType === 'comic') {
                      if (item.rawItem) onSelectComic(item.rawItem);
                      else onNavigateTab('browse');
                    } else if (item.mediaType === 'audiobook') {
                      onNavigateTab('audiobooks');
                    }
                  };

                  return (
                    <div
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      data-focusable="true"
                      aria-label={`Resume ${item.title}`}
                      onClick={handleItemClick}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.keyCode === 13 || e.keyCode === 23) {
                          e.preventDefault();
                          handleItemClick();
                        }
                      }}
                      className="group relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-amber-400/80 focus:border-amber-400 focus:ring-4 focus:ring-amber-500/30 shadow-lg cursor-pointer transition-all hover:scale-105 flex flex-col justify-between"
                    >
                      <div className="aspect-[16/9] relative bg-slate-950 overflow-hidden">
                        <img
                          src={item.cover || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=400'}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=400';
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
                        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] font-bold">
                          <span className={`px-1.5 py-0.5 rounded font-mono ${badge.color}`}>
                            {badge.label}
                          </span>
                          {item.year && <span className="text-slate-300 font-mono">{item.year}</span>}
                        </div>
                        {item.progressPercent !== undefined && item.progressPercent > 0 && (
                          <div className="absolute bottom-0 inset-x-0 h-1 bg-slate-800">
                            <div className="h-full bg-amber-400" style={{ width: `${item.progressPercent}%` }} />
                          </div>
                        )}
                      </div>
                      <div className="p-2.5 flex items-center justify-between gap-2">
                        <h4 className="text-xs font-bold text-white truncate group-hover:text-amber-300 transition-colors">
                          {item.title}
                        </h4>
                        <BadgeIcon className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                      </div>
                    </div>
                  );
                })
              : continueWatchingAnime.map((item, idx) => {
                  const title = formatTitle(item.anime?.title || item.title || 'Anime Series');
                  const cover = formatCover(item.anime?.coverImage || item.cover);
                  const ep = item.episodeNumber || item.currentEpisode || 1;

                  return (
                    <div
                      key={`anime_${idx}`}
                      role="button"
                      tabIndex={0}
                      data-focusable="true"
                      aria-label={`${title} Episode ${ep}`}
                      onClick={() => {
                        onNavigateTab('anime');
                        if (item.anime) onSelectAnime(item.anime);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.keyCode === 13 || e.keyCode === 23) {
                          e.preventDefault();
                          onNavigateTab('anime');
                          if (item.anime) onSelectAnime(item.anime);
                        }
                      }}
                      className="group relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-purple-500/60 focus:border-amber-400 focus:ring-4 focus:ring-amber-500/30 shadow-lg cursor-pointer transition-all hover:scale-105"
                    >
                      <div className="aspect-[16/9] relative">
                        <img
                          src={cover}
                          alt={title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
                        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] font-bold text-white">
                          <span className="px-1.5 py-0.5 rounded bg-purple-600/90 font-mono">
                            EP {ep}
                          </span>
                          <span className="uppercase text-slate-300">{item.audioType || 'SUB'}</span>
                        </div>
                      </div>
                      <div className="p-2.5 flex items-center justify-between">
                        <h4 className="text-xs font-bold text-white truncate">{title}</h4>
                        <Play className="w-3 h-3 text-purple-400 fill-current flex-shrink-0" />
                      </div>
                    </div>
                  );
                })}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          4. MOVIES & TV POPULAR SHELF
         ------------------------------------------------------------- */}
      {(activeMoodFilter === 'all' || activeMoodFilter === 'media') && safeMedia.length > 0 && (
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
            {safeMedia.slice(0, 6).map((item) => {
              const title = formatTitle(item.title);
              const poster = formatCover(item.poster);

              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  data-focusable="true"
                  aria-label={`${title} (${item.type || 'Movie'})`}
                  onClick={() => onSelectMedia(item)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.keyCode === 13 || e.keyCode === 23) {
                      e.preventDefault();
                      onSelectMedia(item);
                    }
                  }}
                  className="group relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-rose-500/60 focus:border-amber-400 focus:ring-4 focus:ring-amber-500/30 shadow-xl cursor-pointer transition-all duration-300 hover:scale-105 hover:-translate-y-1"
                >
                  <div className="aspect-[2/3] relative">
                    <img
                      src={poster}
                      alt={title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
                    <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-md text-[10px] font-black text-amber-400 flex items-center gap-0.5 border border-white/10">
                      <Star className="w-2.5 h-2.5 fill-current" /> {item.rating || '8.5'}
                    </div>
                    <div className="absolute bottom-2 left-2 right-2">
                      <h4 className="text-xs font-bold text-white truncate group-hover:text-rose-300 transition-colors">
                        {title}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {item.type?.toUpperCase()} • {item.year || '2026'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          5. ANIME SIMULCASTS SHELF
         ------------------------------------------------------------- */}
      {(activeMoodFilter === 'all' || activeMoodFilter === 'anime') && safeAnime.length > 0 && (
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
            {safeAnime.slice(0, 6).map((anime) => {
              const title = formatTitle(anime.title);
              const cover = formatCover(anime.coverImage);

              return (
                <div
                  key={anime.id}
                  role="button"
                  tabIndex={0}
                  data-focusable="true"
                  aria-label={title}
                  onClick={() => onSelectAnime(anime)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.keyCode === 13 || e.keyCode === 23) {
                      e.preventDefault();
                      onSelectAnime(anime);
                    }
                  }}
                  className="group relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-purple-500/60 focus:border-amber-400 focus:ring-4 focus:ring-amber-500/30 shadow-xl cursor-pointer transition-all duration-300 hover:scale-105 hover:-translate-y-1"
                >
                  <div className="aspect-[2/3] relative">
                    <img
                      src={cover}
                      alt={title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
                    <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-purple-950/80 backdrop-blur-md text-[10px] font-black text-purple-300 border border-purple-500/30">
                      {anime.episodes ? `${anime.episodes} EPS` : 'SIMULCAST'}
                    </div>
                    <div className="absolute bottom-2 left-2 right-2">
                      <h4 className="text-xs font-bold text-white truncate group-hover:text-purple-300 transition-colors">
                        {title}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {anime.genres?.[0] || 'Action'} • {anime.format || 'TV'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          6. SUPERSPORT MATCH FIXTURES SPOTLIGHT
         ------------------------------------------------------------- */}
      {(activeMoodFilter === 'all' || activeMoodFilter === 'sports') && safeSports.length > 0 && (
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
            {safeSports.slice(0, 3).map((match) => {
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
                  role="button"
                  tabIndex={0}
                  data-focusable="true"
                  aria-label={`${homeName} vs ${awayName}, ${match.league}`}
                  onClick={() => onSelectSportsMatch(match)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.keyCode === 13 || e.keyCode === 23) {
                      e.preventDefault();
                      onSelectSportsMatch(match);
                    }
                  }}
                  className="p-4 rounded-2xl bg-[#00173d] border border-blue-900/60 hover:border-amber-400 focus:border-amber-400 focus:ring-4 focus:ring-amber-500/30 cursor-pointer transition-all hover:scale-[1.02] shadow-xl flex flex-col justify-between space-y-3"
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
      )}

      {/* -------------------------------------------------------------
          7. POPULAR MANGA & COMICS SHELF
         ------------------------------------------------------------- */}
      {(activeMoodFilter === 'all' || activeMoodFilter === 'comics') && (trendingComics.length > 0 || recentComics.length > 0) && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-cyan-400" />
              <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                Popular Manga & Comics
              </h2>
            </div>
            <button
              onClick={() => onNavigateTab('browse')}
              className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
            >
              <span>Explore All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
            {(trendingComics.length > 0 ? trendingComics : recentComics).slice(0, 6).map((comic: any) => {
              const title = comic.title || 'Comic';
              const cover = comic.coverImage || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=400';

              return (
                <div
                  key={comic.id}
                  role="button"
                  tabIndex={0}
                  data-focusable="true"
                  aria-label={title}
                  onClick={() => onSelectComic(comic)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.keyCode === 13 || e.keyCode === 23) {
                      e.preventDefault();
                      onSelectComic(comic);
                    }
                  }}
                  className="group relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-cyan-500/60 focus:border-amber-400 focus:ring-4 focus:ring-amber-500/30 shadow-xl cursor-pointer transition-all duration-300 hover:scale-105 hover:-translate-y-1"
                >
                  <div className="aspect-[2/3] relative">
                    <img
                      src={cover}
                      alt={title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
                    <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-cyan-950/80 backdrop-blur-md text-[10px] font-black text-cyan-300 border border-cyan-500/30">
                      {comic.totalChapters ? `${comic.totalChapters} CHS` : 'MANGA'}
                    </div>
                    <div className="absolute bottom-2 left-2 right-2">
                      <h4 className="text-xs font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
                        {title}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {comic.author || comic.status || 'Keiyoushi Engine'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          8. AUDIOBOOKS CURATED SHOWCASE
         ------------------------------------------------------------- */}
      {(activeMoodFilter === 'all' || activeMoodFilter === 'audiobooks') && (
        <div className="rounded-2xl bg-gradient-to-r from-[#170e02] via-[#2d1b04] to-[#120a01] border border-amber-800/60 p-6 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <div className="flex items-center gap-2">
              <Headphones className="w-5 h-5 text-amber-400" />
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20">
                Audiobook Center
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white">
              Continuous Audiobooks & Variable Speed Pitch
            </h3>
            <p className="text-xs sm:text-sm text-slate-300">
              Stream thousands of audiobooks with chapter memory, sleep timers, variable playback speed (0.75x–2.0x), and background audio.
            </p>
            <button
              onClick={() => onNavigateTab('audiobooks')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-xs sm:text-sm hover:from-amber-300 hover:to-amber-400 transition-all cursor-pointer shadow-lg shadow-amber-500/20"
            >
              <span>Open Audiobooks Catalog</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-amber-950/40 border border-amber-700/40 flex items-center justify-center text-amber-400 flex-shrink-0">
            <Headphones className="w-12 h-12 opacity-80" />
          </div>
        </div>
      )}
    </div>
  );
};

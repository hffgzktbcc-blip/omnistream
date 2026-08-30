import React, { useState, useEffect, useMemo } from 'react';
import { Anime, AnimeScheduleItem, AnimeStudio, AnimeWatchProgress } from '../../types/anime';
import { AnimeCard } from './AnimeCard';
import { animeStorage } from '../../services/animeStorage';
import { api } from '../../services/api';
import {
  Sparkles,
  Flame,
  Tv,
  Film,
  Star,
  Play,
  Compass,
  Calendar,
  Bookmark,
  Building2,
  Clock,
  CheckCircle2,
  Trash2,
  Bot,
  Send,
  Loader2,
  Radio,
  SlidersHorizontal,
  LayoutGrid,
  TrendingUp,
  Volume2
} from 'lucide-react';

interface AnimeCatalogProps {
  animeList: Anime[];
  loading: boolean;
  onSelectAnime: (anime: Anime) => void;
  onSelectCategory: (category: string) => void;
  activeCategory: string;
  searchQuery: string;
  onSearchQuery: (query: string) => void;
  onPlayEpisode?: (anime: Anime, episodeNumber: number) => void;
}

const CATEGORIES = [
  { id: 'trending', label: 'Trending This Season', icon: Flame },
  { id: 'popular', label: 'Top Rated of All Time', icon: Star },
  { id: 'action', label: 'Action & Shonen', icon: Sparkles },
  { id: 'fantasy', label: 'Fantasy & Isekai', icon: Compass }
];

const POPULAR_ANIME_SEARCHES = [
  'Solo Leveling',
  'Demon Slayer',
  'Jujutsu Kaisen',
  'One Piece',
  'Bleach: Thousand-Year Blood War',
  'Attack on Titan',
  'Chainsaw Man',
  'Frieren: Beyond Journey\'s End',
  'Kaiju No. 8',
  'Spy x Family'
];

const TROPE_SUGGESTIONS = [
  '🔥 Overpowered Protagonist who hides their real power',
  '⚔️ High-Stakes Death Game & Psychological Survival',
  '🐉 Dark Fantasy Guilds & Solo Progression',
  '⏳ Time Loop Mystery & Tragic Realities',
  '🍵 Cozy Iyashikei Fantasy & Slow Life in Another World',
  '🧠 Mastermind Chess Matches & Mind Games'
];

export const AnimeCatalog: React.FC<AnimeCatalogProps> = ({
  animeList,
  loading,
  onSelectAnime,
  onSelectCategory,
  activeCategory,
  searchQuery,
  onSearchQuery,
  onPlayEpisode
}) => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'schedule' | 'watchlist' | 'studios' | 'matchmaker'>('catalog');
  const [watchlist, setWatchlist] = useState<AnimeWatchProgress[]>([]);
  const [watchlistFilter, setWatchlistFilter] = useState<'all' | 'watching' | 'plan_to_watch' | 'completed'>('all');

  // Simulcast schedule state
  const [schedules, setSchedules] = useState<AnimeScheduleItem[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState<boolean>(false);
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay()); // 0=Sun, 1=Mon...

  // Studios state
  const [studios, setStudios] = useState<AnimeStudio[]>([]);
  const [selectedStudio, setSelectedStudio] = useState<string | null>(null);

  // AI Trope Matchmaker state
  const [vibeInput, setVibeInput] = useState<string>('');
  const [aiRecs, setAiRecs] = useState<Anime[]>([]);
  const [loadingAi, setLoadingAi] = useState<boolean>(false);

  // Load watchlist on mount & updates
  useEffect(() => {
    setWatchlist(animeStorage.getWatchlist());
  }, []);

  // Load Schedule when schedule tab is activated
  useEffect(() => {
    if (activeTab === 'schedule' && schedules.length === 0) {
      setLoadingSchedule(true);
      api.getAnimeSchedule()
        .then((data) => setSchedules(data))
        .finally(() => setLoadingSchedule(false));
    }
  }, [activeTab, schedules.length]);

  // Load Studios when studios tab is activated
  useEffect(() => {
    if (activeTab === 'studios' && studios.length === 0) {
      api.getAnimeStudios().then((data) => setStudios(data));
    }
  }, [activeTab, studios.length]);

  const continueWatching = useMemo(() => {
    return animeStorage.getContinueWatching();
  }, [watchlist]);

  const featured = animeList[0];

  const handleRemoveFromWatchlist = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    animeStorage.removeFromWatchlist(id);
    setWatchlist(animeStorage.getWatchlist());
  };

  const handleTriggerAiMatch = async (queryToUse?: string) => {
    const text = (queryToUse || vibeInput).trim();
    if (!text) return;

    setLoadingAi(true);
    try {
      const results = await api.searchAnime(text.slice(0, 30));
      setAiRecs(results);
    } catch (e) {
      console.error('AI anime match error:', e);
    } finally {
      setLoadingAi(false);
    }
  };

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Format seconds to human countdown (e.g. "1d 4h" or "2h 30m")
  const formatCountdown = (seconds: number) => {
    if (seconds <= 0) return 'Aired Today';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-8 animate-fade-in">
      {/* -------------------------------------------------------------
          1. TOP HUB NAVIGATION TABS
         ------------------------------------------------------------- */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black tracking-wide border shadow-lg transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'catalog' && !searchQuery
              ? 'bg-purple-600 text-white border-purple-400 shadow-purple-600/30 scale-105'
              : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-purple-400" />
          <span>Browse Anime</span>
        </button>

        <button
          onClick={() => setActiveTab('schedule')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black tracking-wide border shadow-lg transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'schedule'
              ? 'bg-purple-600 text-white border-purple-400 shadow-purple-600/30 scale-105'
              : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-purple-400" />
          <span>Simulcast Schedule</span>
          {schedules.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-slate-950 text-purple-300 text-[10px] font-black">
              {schedules.length}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveTab('watchlist');
            setWatchlist(animeStorage.getWatchlist());
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black tracking-wide border shadow-lg transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'watchlist'
              ? 'bg-purple-600 text-white border-purple-400 shadow-purple-600/30 scale-105'
              : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
          }`}
        >
          <Bookmark className="w-3.5 h-3.5 text-purple-400" />
          <span>My Watchlist</span>
          {watchlist.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-slate-950 text-purple-300 text-[10px] font-black">
              {watchlist.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('studios')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black tracking-wide border shadow-lg transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'studios'
              ? 'bg-purple-600 text-white border-purple-400 shadow-purple-600/30 scale-105'
              : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
          }`}
        >
          <Building2 className="w-3.5 h-3.5 text-purple-400" />
          <span>Animation Studios</span>
        </button>

        <button
          onClick={() => setActiveTab('matchmaker')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black tracking-wide border shadow-lg transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'matchmaker'
              ? 'bg-purple-600 text-white border-purple-400 shadow-purple-600/30 scale-105'
              : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
          }`}
        >
          <Bot className="w-3.5 h-3.5 text-purple-400" />
          <span>AI Trope Matchmaker</span>
        </button>
      </div>

      {/* -------------------------------------------------------------
          2. CONTINUE WATCHING HERO ROW
         ------------------------------------------------------------- */}
      {!searchQuery && continueWatching.length > 0 && (
        <div className="space-y-3 p-5 rounded-3xl bg-gradient-to-r from-purple-950/40 via-slate-900/80 to-indigo-950/40 border border-purple-500/30 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Play className="w-4 h-4 text-purple-400 fill-current" />
              <span>Continue Watching</span>
            </h3>
            <span className="text-xs text-purple-300 font-semibold">{continueWatching.length} in progress</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {continueWatching.slice(0, 4).map((item) => (
              <div
                key={item.animeId}
                onClick={() => {
                  if (onPlayEpisode) onPlayEpisode(item.anime, item.episodeNumber);
                  else onSelectAnime(item.anime);
                }}
                className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 hover:border-purple-500/60 transition-all flex items-center justify-between gap-3 cursor-pointer group shadow-md"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={item.anime.coverImage?.large || item.anime.coverImage?.medium || ''}
                    alt={item.anime.title.english || item.anime.title.romaji}
                    className="w-12 h-16 object-cover rounded-xl shadow border border-slate-800 flex-shrink-0"
                  />
                  <div className="space-y-1 min-w-0">
                    <h4 className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors truncate">
                      {item.anime.title.english || item.anime.title.romaji}
                    </h4>
                    <div className="flex items-center gap-1.5 text-[11px] text-purple-400 font-bold">
                      <span>Episode {item.episodeNumber}</span>
                      <span className="text-slate-600">•</span>
                      <span className="uppercase text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300">
                        {item.audioType}
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                      <div
                        className="bg-purple-500 h-full rounded-full"
                        style={{ width: `${Math.max(10, Math.min(100, item.progressPercent || 25))}%` }}
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onPlayEpisode) onPlayEpisode(item.anime, item.episodeNumber);
                    else onSelectAnime(item.anime);
                  }}
                  className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow transition-all hover:scale-105 flex-shrink-0"
                  title="Resume Episode"
                >
                  <Play className="w-4 h-4 fill-current" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          3. TAB: SIMULCAST AIRING SCHEDULE
         ------------------------------------------------------------- */}
      {activeTab === 'schedule' && !searchQuery && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <span>Weekly Simulcast Release Calendar</span>
                <Radio className="w-5 h-5 text-purple-400 animate-pulse" />
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Official weekly drop schedules with live episode countdowns.
              </p>
            </div>

            {/* Day of Week Selector */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-2xl border border-slate-800 text-xs font-bold overflow-x-auto">
              {DAYS.map((day, idx) => (
                <button
                  key={day}
                  onClick={() => setSelectedDay(idx)}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    selectedDay === idx
                      ? 'bg-purple-600 text-white font-black shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {day} {idx === new Date().getDay() && '• Today'}
                </button>
              ))}
            </div>
          </div>

          {loadingSchedule ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 animate-pulse">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="aspect-[2/3] rounded-2xl bg-slate-900 border border-slate-800" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
              {schedules
                .filter((item) => {
                  const itemDay = new Date(item.airingAt * 1000).getDay();
                  return itemDay === selectedDay;
                })
                .map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onSelectAnime(item.anime)}
                    className="group relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-purple-500/60 shadow-lg cursor-pointer transition-all hover:scale-105 flex flex-col"
                  >
                    <div className="aspect-[2/3] relative overflow-hidden bg-slate-950">
                      <img
                        src={item.anime.coverImage?.large || item.anime.coverImage?.medium || ''}
                        alt={item.anime.title.english || item.anime.title.romaji}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      {/* Airing Countdown Badge */}
                      <div className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-purple-500/40 text-[10px] font-black text-purple-300 flex items-center gap-1 shadow">
                        <Clock className="w-3 h-3 text-purple-400" />
                        <span>{formatCountdown(item.timeUntilAiring)}</span>
                      </div>

                      {/* Episode Badge */}
                      <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-purple-600 text-[10px] font-black text-white shadow">
                        Ep {item.episode}
                      </div>
                    </div>

                    <div className="p-3 space-y-1 flex-1 flex flex-col justify-between">
                      <h4 className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-1">
                        {item.anime.title.english || item.anime.title.romaji}
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        {new Date(item.airingAt * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------
          4. TAB: MY WATCHLIST (WATCHING, PLAN TO WATCH, COMPLETED)
         ------------------------------------------------------------- */}
      {activeTab === 'watchlist' && !searchQuery && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <span>My Anime Watchlist</span>
                <Bookmark className="w-5 h-5 text-purple-400" />
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Track episode progress, plan future binges, and sync history.
              </p>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-2xl border border-slate-800 text-xs font-bold">
              <button
                onClick={() => setWatchlistFilter('all')}
                className={`px-3 py-1 rounded-xl transition-all ${
                  watchlistFilter === 'all' ? 'bg-purple-600 text-white font-black shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({watchlist.length})
              </button>
              <button
                onClick={() => setWatchlistFilter('watching')}
                className={`px-3 py-1 rounded-xl transition-all ${
                  watchlistFilter === 'watching' ? 'bg-purple-600 text-white font-black shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Watching ({watchlist.filter((w) => w.status === 'watching').length})
              </button>
              <button
                onClick={() => setWatchlistFilter('plan_to_watch')}
                className={`px-3 py-1 rounded-xl transition-all ${
                  watchlistFilter === 'plan_to_watch' ? 'bg-purple-600 text-white font-black shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Plan to Watch ({watchlist.filter((w) => w.status === 'plan_to_watch').length})
              </button>
              <button
                onClick={() => setWatchlistFilter('completed')}
                className={`px-3 py-1 rounded-xl transition-all ${
                  watchlistFilter === 'completed' ? 'bg-purple-600 text-white font-black shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Completed ({watchlist.filter((w) => w.status === 'completed').length})
              </button>
            </div>
          </div>

          {watchlist.length === 0 ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-12 text-center space-y-3 max-w-lg mx-auto">
              <Bookmark className="w-10 h-10 text-slate-500 mx-auto" />
              <h3 className="text-base font-bold text-white">Your Watchlist is Empty</h3>
              <p className="text-xs text-slate-400">
                Browse any anime series and click &quot;Add to Watchlist&quot; or start watching an episode.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
              {watchlist
                .filter((item) => {
                  if (watchlistFilter === 'watching') return item.status === 'watching';
                  if (watchlistFilter === 'plan_to_watch') return item.status === 'plan_to_watch';
                  if (watchlistFilter === 'completed') return item.status === 'completed';
                  return true;
                })
                .map((item) => (
                  <div key={item.animeId} className="relative group">
                    <AnimeCard anime={item.anime} onClick={onSelectAnime} />
                    <button
                      onClick={(e) => handleRemoveFromWatchlist(e, item.animeId)}
                      title="Remove from Watchlist"
                      className="absolute top-2 left-2 p-1.5 rounded-lg bg-slate-950/80 text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-600 hover:text-white shadow-md z-20"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------
          5. TAB: ANIMATION STUDIOS HUB
         ------------------------------------------------------------- */}
      {activeTab === 'studios' && !searchQuery && (
        <div className="space-y-6 animate-in fade-in">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <span>Famous Animation Studios</span>
              <Building2 className="w-5 h-5 text-purple-400" />
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Explore productions by Japan’s most acclaimed animation studios.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {studios.map((st) => (
              <div
                key={st.id}
                onClick={() => {
                  onSearchQuery(st.name);
                  setActiveTab('catalog');
                }}
                className="group relative rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-purple-500/60 shadow-xl cursor-pointer p-5 transition-all hover:scale-105 flex flex-col justify-end min-h-[140px]"
              >
                {st.banner && (
                  <div
                    className="absolute inset-0 bg-cover bg-center opacity-30 group-hover:scale-105 transition-transform duration-700 pointer-events-none"
                    style={{ backgroundImage: `url(${st.banner})` }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent pointer-events-none" />
                <div className="relative z-10 space-y-1">
                  <h3 className="text-base font-black text-white group-hover:text-purple-300 transition-colors">
                    {st.name}
                  </h3>
                  <span className="text-[11px] text-purple-400 font-bold flex items-center gap-1">
                    <span>View Catalog</span>
                    <span>→</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          6. TAB: AI TROPE & VIBE MATCHMAKER
         ------------------------------------------------------------- */}
      {activeTab === 'matchmaker' && !searchQuery && (
        <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-purple-950/60 via-slate-900 to-indigo-950/50 border border-purple-500/40 shadow-2xl space-y-6 animate-in fade-in">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold">
              <Bot className="w-3.5 h-3.5" />
              <span>AI Anime Concierge</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">Find Anime by Vibe, Trope, or Plot</h2>
            <p className="text-xs text-slate-300 max-w-xl">
              Describe the dynamic or storyline you want to watch next. AI will match relevant anime instantly.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleTriggerAiMatch();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={vibeInput}
              onChange={(e) => setVibeInput(e.target.value)}
              placeholder="e.g. Overpowered shadow assassin with deadly tournament arc..."
              className="flex-1 px-4 py-3.5 rounded-2xl bg-slate-950 border border-purple-500/40 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
            />
            <button
              type="submit"
              disabled={loadingAi}
              className="px-6 py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loadingAi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>Find Matches</span>
            </button>
          </form>

          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Try a Trope:</span>
            <div className="flex flex-wrap gap-2">
              {TROPE_SUGGESTIONS.map((sug, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setVibeInput(sug);
                    handleTriggerAiMatch(sug);
                  }}
                  className="text-xs px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-purple-600/30 border border-slate-700 hover:border-purple-500/50 text-slate-300 hover:text-white transition-all cursor-pointer"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          {aiRecs.length > 0 && (
            <div className="pt-4 border-t border-slate-800 space-y-4">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>AI Recommended Matches</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {aiRecs.map((anime) => (
                  <AnimeCard key={anime.id} anime={anime} onClick={onSelectAnime} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------
          7. DEFAULT CATALOG VIEW (SPOTLIGHT + CATEGORIES + GRID)
         ------------------------------------------------------------- */}
      {activeTab === 'catalog' && (
        <div className="space-y-8">
          {/* Featured Spotlight Banner */}
          {!searchQuery && featured && (
            <div
              onClick={() => onSelectAnime(featured)}
              className="group relative rounded-3xl overflow-hidden bg-slate-900 border border-purple-500/30 p-6 md:p-10 shadow-2xl cursor-pointer transition-all hover:border-purple-500/60"
            >
              {featured.bannerImage ? (
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-30 group-hover:scale-105 transition-transform duration-700 pointer-events-none"
                  style={{ backgroundImage: `url(${featured.bannerImage})` }}
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/80" />
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F17] via-[#0B0F17]/60 to-transparent pointer-events-none" />

              <div className="relative z-10 max-w-2xl space-y-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-xs font-bold">
                  <Tv className="w-3.5 h-3.5 text-purple-400" />
                  <span>SPOTLIGHT ANIME STREAMING</span>
                </div>

                <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                  {featured.title.english || featured.title.romaji || 'Featured Anime'}
                </h1>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed line-clamp-3">
                  {featured.description?.replace(/<[^>]*>?/gm, '') || 'Watch full episodes ad-free in crystal-clear high definition.'}
                </p>

                <div className="pt-2 flex items-center gap-3">
                  <button className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-purple-600/30 flex items-center gap-2 transition-all hover:scale-105">
                    <Play className="w-4 h-4 fill-current" />
                    <span>Watch Series</span>
                  </button>
                  {featured.averageScore && (
                    <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/60 backdrop-blur-md text-xs font-bold text-amber-400 border border-amber-500/30">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>{(featured.averageScore / 10).toFixed(1)} / 10</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Quick Search Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs text-slate-400">
            <span className="font-semibold text-slate-300 flex-shrink-0">Popular Anime:</span>
            {POPULAR_ANIME_SEARCHES.map((query) => (
              <button
                key={query}
                onClick={() => onSearchQuery(query)}
                className="px-3 py-1 rounded-full bg-slate-900/90 hover:bg-purple-600 hover:text-white border border-slate-800 text-slate-300 transition-all flex-shrink-0 text-[11px] cursor-pointer"
              >
                {query}
              </button>
            ))}
          </div>

          {/* Categories & Filter Bar */}
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
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
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
                <span>Anime matching &quot;<strong className="text-white">{searchQuery}</strong>&quot;</span>
              ) : (
                <span>Streaming sub &amp; dub in 1080p / 4K</span>
              )}
            </div>
          </div>

          {/* Loading Skeleton */}
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

          {/* Anime Grid */}
          {!loading && animeList.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
              {animeList.map((anime) => (
                <AnimeCard
                  key={anime.id}
                  anime={anime}
                  onClick={onSelectAnime}
                />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && animeList.length === 0 && (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-12 text-center space-y-4 max-w-lg mx-auto">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500">
                <Film className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-white">No Anime Found</h3>
              <p className="text-xs text-slate-400">
                Try searching for a different anime title or click a trending chip above.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

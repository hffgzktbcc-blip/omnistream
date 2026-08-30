import React, { useState } from 'react';
import { SportsMatch } from '../../types/sports';
import { SportsCard } from './SportsCard';
import {
  Trophy,
  Radio,
  Clock,
  Search,
  Zap,
  Flame,
  X,
  Compass,
  ExternalLink,
  Shield,
  Calendar,
  Sparkles,
  Tv
} from 'lucide-react';

interface SportsCatalogProps {
  matches: SportsMatch[];
  loading: boolean;
  onWatchMatch: (match: SportsMatch) => void;
  activeSport: string;
  onSelectSport: (sport: string) => void;
  activeFilter: 'all' | 'live' | 'upcoming';
  onSelectFilter: (filter: 'all' | 'live' | 'upcoming') => void;
  searchQuery: string;
  onSearchQuery: (query: string) => void;
}

const SPORTS_CATEGORIES = [
  { id: 'all', label: '🔥 All Sports', icon: Trophy },
  { id: 'rugby', label: '🏉 Rugby (Six Nations / Super Rugby / NRL)', icon: Trophy },
  { id: 'soccer', label: '⚽ Football (Premier League & UCL)', icon: Flame },
  { id: 'f1', label: '🏎️ Formula 1 & Racing', icon: Zap },
  { id: 'mma', label: '🥊 UFC & Boxing', icon: Radio },
  { id: 'basketball', label: '🏀 NBA & Basketball', icon: Zap },
  { id: 'football', label: '🏈 NFL & College', icon: Compass },
  { id: 'tennis', label: '🎾 Tennis & Cricket', icon: Trophy }
];

const LIVE_247_CHANNELS = [
  {
    id: 'channel_supersport_rugby',
    name: 'SuperSport Rugby HD',
    badge: '24/7 Live',
    sport: 'rugby',
    icon: '🏉',
    desc: 'Six Nations, Rugby Championship, Super Rugby & URC',
    url: 'https://topembed.pw/channel/SuperSportRugby',
    color: 'from-amber-600/30 to-emerald-950/80 border-amber-500/40 text-amber-300'
  },
  {
    id: 'channel_skysports_pl',
    name: 'Sky Sports Premier League',
    badge: 'EPL Live',
    sport: 'soccer',
    icon: '⚽',
    desc: 'Premier League Matchdays, Pre-Match & Analysis HD',
    url: 'https://topembed.pw/channel/SkySportsPremierLeague',
    color: 'from-blue-600/30 to-cyan-950/80 border-blue-500/40 text-blue-300'
  },
  {
    id: 'channel_tnt_sports',
    name: 'TNT Sports 1 (UCL & UFC)',
    badge: 'UCL & UFC',
    sport: 'all',
    icon: '🏆',
    desc: 'UEFA Champions League Nights & UFC Championship Main Cards',
    url: 'https://topembed.pw/channel/TNTSports1',
    color: 'from-purple-600/30 to-slate-950 border-purple-500/40 text-purple-300'
  },
  {
    id: 'channel_sky_f1',
    name: 'Sky Sports F1 HD',
    badge: 'F1 2026',
    sport: 'f1',
    icon: '🏎️',
    desc: 'Practice, Qualifying, Sprint & Grand Prix Race Feeds',
    url: 'https://topembed.pw/channel/SkySportsF1',
    color: 'from-red-600/30 to-rose-950 border-red-500/40 text-red-300'
  },
  {
    id: 'channel_espn',
    name: 'ESPN / ESPN 2 HD',
    badge: 'NBA & NFL',
    sport: 'basketball',
    icon: '🏀',
    desc: 'NBA Primetime, NFL Sunday Night, SportsCenter',
    url: 'https://topembed.pw/channel/ESPN',
    color: 'from-red-700/30 to-amber-950 border-red-500/40 text-rose-300'
  },
  {
    id: 'channel_dazn',
    name: 'DAZN Combat HD',
    badge: 'Boxing & MMA',
    sport: 'mma',
    icon: '🥊',
    desc: 'Live Championship Boxing, PFL MMA, and Fight Nights',
    url: 'https://topembed.pw/channel/DAZN1',
    color: 'from-yellow-600/30 to-slate-950 border-yellow-500/40 text-yellow-300'
  }
];

export const SportsCatalog: React.FC<SportsCatalogProps> = ({
  matches,
  loading,
  onWatchMatch,
  activeSport,
  onSelectSport,
  activeFilter,
  onSelectFilter,
  searchQuery,
  onSearchQuery
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

  const handleWatchChannel = (channel: typeof LIVE_247_CHANNELS[0]) => {
    const dummyMatch: SportsMatch = {
      id: channel.id,
      sport: channel.sport as any,
      league: channel.name,
      homeTeam: { name: channel.name, score: 'LIVE' },
      awayTeam: { name: '24/7 Broadcast Feed', score: 'HD' },
      status: 'LIVE',
      statusText: channel.desc,
      servers: [
        { name: `${channel.name} Direct`, url: channel.url },
        { name: 'VIPRow Universal Backup', url: 'https://www.viprow.nu/sports-online' },
        { name: 'Streamed.su Multi-Feed', url: 'https://streamed.su' }
      ]
    };
    onWatchMatch(dummyMatch);
  };

  const liveMatches = matches.filter((m) => m.status === 'LIVE');
  const filteredMatches = matches.filter((m) => {
    if (activeFilter === 'live') return m.status === 'LIVE';
    if (activeFilter === 'upcoming') return m.status === 'UPCOMING';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-8 animate-fade-in">
      {/* Spotlight Header Banner */}
      {!searchQuery && (
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-emerald-950/90 via-slate-900 to-rose-950/90 border border-emerald-500/20 p-6 md:p-10 shadow-2xl">
          <div className="absolute -right-10 -bottom-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold tracking-wide">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>GLOBAL 24/7 LIVE SPORTS & FIXTURE NAVIGATOR</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
              Rugby, Football, Formula 1, NBA & UFC Live.
            </h1>

            <p className="text-sm md:text-base text-slate-300 leading-relaxed">
              Stream live matches across the <strong>Six Nations</strong>, <strong>Rugby Championship</strong>, <strong>Premier League</strong>, <strong>UEFA Champions League</strong>, and <strong>Formula 1 Grand Prix</strong> with multi-server satellite failover and zero popup interruptions.
            </p>

            {liveMatches.length > 0 && (
              <div className="pt-2">
                <button
                  onClick={() => onWatchMatch(liveMatches[0])}
                  className="px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm shadow-xl shadow-rose-600/30 flex items-center gap-2 transition-all hover:scale-105 cursor-pointer"
                >
                  <Radio className="w-4 h-4 animate-pulse" />
                  <span>Watch Featured Live: {liveMatches[0].homeTeam.name} vs {liveMatches[0].awayTeam.name}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 24/7 Television Sports Network Shelf */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tv className="w-5 h-5 text-rose-400" />
            <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
              24/7 Live Sports Television Channels
            </h2>
          </div>
          <span className="text-xs text-slate-400">Direct Satellite Feeds</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {LIVE_247_CHANNELS.map((ch) => (
            <div
              key={ch.id}
              onClick={() => handleWatchChannel(ch)}
              className={`group relative p-3.5 rounded-2xl bg-gradient-to-b ${ch.color} border hover:scale-105 cursor-pointer transition-all shadow-lg flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">{ch.icon}</span>
                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-md">
                  {ch.badge}
                </span>
              </div>
              <div>
                <h4 className="text-xs font-bold text-white line-clamp-1">{ch.name}</h4>
                <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-tight">{ch.desc}</p>
              </div>
              <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-bold text-white group-hover:text-rose-300">
                <span>Watch Stream</span>
                <ExternalLink className="w-3 h-3" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Search & Category Filter Navigation */}
      <div className="space-y-4">
        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative max-w-2xl mx-auto">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search teams, leagues, or fighters (e.g. Springboks, Real Madrid, Verstappen, UFC, Arsenal)..."
            className="w-full pl-12 pr-12 py-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 focus:border-rose-500 focus:outline-none text-xs sm:text-sm text-white placeholder-slate-500 shadow-xl"
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

        {/* Sports Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {SPORTS_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelectSport(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex-shrink-0 ${
                activeSport === cat.id
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30 scale-105'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800/80'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Status Filter (All / Live / Upcoming) */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSelectFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Matches ({matches.length})
            </button>
            <button
              onClick={() => onSelectFilter('live')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeFilter === 'live' ? 'bg-rose-600/20 text-rose-400 border border-rose-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              Live Now ({liveMatches.length})
            </button>
            <button
              onClick={() => onSelectFilter('upcoming')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeFilter === 'upcoming' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Upcoming Scheduled
            </button>
          </div>
          <span className="text-xs text-slate-400 hidden sm:inline">
            Showing {filteredMatches.length} events
          </span>
        </div>
      </div>

      {/* Match Fixture Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 rounded-2xl bg-slate-900/60 border border-slate-800/60 animate-pulse" />
          ))}
        </div>
      ) : filteredMatches.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMatches.map((match) => (
            <SportsCard
              key={match.id}
              match={match}
              onWatch={() => onWatchMatch(match)}
            />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center space-y-3 bg-slate-900/30 rounded-3xl border border-slate-800/50">
          <Trophy className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No sports fixtures found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Try switching sport categories above or tune into our 24/7 Television Sports channels.
          </p>
        </div>
      )}
    </div>
  );
};

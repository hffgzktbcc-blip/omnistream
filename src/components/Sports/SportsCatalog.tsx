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
  Tv,
  Play,
  Share2,
  Medal,
  Crown
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

const SUPERSPORT_CATEGORIES = [
  { id: 'all', label: '🏆 All Champions', icon: Crown },
  { id: 'rugby', label: '🏉 Rugby (Springboks / Six Nations / URC)', icon: Trophy },
  { id: 'soccer', label: '⚽ Football (Premier League & UCL)', icon: Flame },
  { id: 'f1', label: '🏎️ Motorsport & Formula 1', icon: Zap },
  { id: 'mma', label: '🥊 UFC & Championship Boxing', icon: Radio },
  { id: 'cricket', label: '🏏 Cricket (Proteas & IPL)', icon: Medal },
  { id: 'tennis', label: '🎾 Tennis (Grand Slams & ATP)', icon: Trophy },
  { id: 'basketball', label: '🏀 NBA & Basketball', icon: Zap }
];

const SUPERSPORT_247_CHANNELS = [
  {
    id: 'channel_ss_rugby',
    name: 'SuperSport Rugby HD',
    badge: '🏉 Rugby Flagship',
    sport: 'rugby',
    icon: '🏉',
    desc: 'Springboks, Six Nations, Rugby Championship, Super Rugby & URC',
    url: 'https://topembed.pw/channel/SuperSportRugby',
    gradient: 'from-amber-600/30 via-[#00173d] to-[#000c1e] border-amber-400/40 text-amber-300'
  },
  {
    id: 'channel_ss_pl',
    name: 'SuperSport Premier League',
    badge: '⚽ 24/7 EPL Live',
    sport: 'soccer',
    icon: '⚽',
    desc: 'Premier League Matchdays, Tactical Cam, Press Conferences & Highlights',
    url: 'https://topembed.pw/channel/SkySportsPremierLeague',
    gradient: 'from-blue-600/30 via-[#00173d] to-[#000c1e] border-blue-400/40 text-blue-300'
  },
  {
    id: 'channel_ss_f1',
    name: 'SuperSport Motorsport / F1',
    badge: '🏎️ Grand Prix',
    sport: 'f1',
    icon: '🏎️',
    desc: 'Practice, Qualifying, Sprint Races, Pit-Lane Feed & On-Board Cameras',
    url: 'https://topembed.pw/channel/SkySportsF1',
    gradient: 'from-red-600/30 via-[#00173d] to-[#000c1e] border-red-400/40 text-red-300'
  },
  {
    id: 'channel_ss_grandstand',
    name: 'SuperSport Grandstand HD',
    badge: '🏆 Main Event',
    sport: 'all',
    icon: '🏆',
    desc: 'The World of Champions marquee flagship channel streaming top global finals',
    url: 'https://topembed.pw/channel/TNTSports1',
    gradient: 'from-yellow-500/30 via-[#00173d] to-[#000c1e] border-yellow-400/40 text-yellow-300'
  },
  {
    id: 'channel_ss_action',
    name: 'SuperSport Action & UFC',
    badge: '🥊 Combat Live',
    sport: 'mma',
    icon: '🥊',
    desc: 'UFC Pay-Per-View, Fight Nights, World Championship Boxing & PFL',
    url: 'https://topembed.pw/channel/DAZN1',
    gradient: 'from-purple-600/30 via-[#00173d] to-[#000c1e] border-purple-400/40 text-purple-300'
  },
  {
    id: 'channel_ss_variety',
    name: 'SuperSport Variety / ESPN',
    badge: '🏀 NBA & NFL',
    sport: 'basketball',
    icon: '🏀',
    desc: 'NBA Primetime, NFL Sunday Night, SportsCenter & College Sports',
    url: 'https://topembed.pw/channel/ESPN',
    gradient: 'from-emerald-600/30 via-[#00173d] to-[#000c1e] border-emerald-400/40 text-emerald-300'
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

  const handleWatchChannel = (channel: typeof SUPERSPORT_247_CHANNELS[0]) => {
    const dummyMatch: SportsMatch = {
      id: channel.id,
      sport: channel.sport as any,
      league: channel.name,
      homeTeam: { name: channel.name, score: 'LIVE' },
      awayTeam: { name: '24/7 Satellite Broadcast Feed', score: '1080p' },
      status: 'LIVE',
      statusText: channel.desc,
      servers: [
        { name: `${channel.name} Direct HD`, url: channel.url },
        { name: 'Streamed.su Global Mirror', url: 'https://streamed.su' },
        { name: 'VIPRow Universal Backup', url: 'https://www.viprow.nu/sports-online' }
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
      {/* SuperSport World of Champions Hero Header */}
      {!searchQuery && (
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#00173d] via-[#002b66] to-[#00122e] border-2 border-amber-400/40 p-6 md:p-10 shadow-2xl">
          {/* Gold & Blue ambient lighting */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-400/20 border border-amber-400/50 text-amber-300 text-xs font-black tracking-widest uppercase">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>SUPERSPORT • WORLD OF CHAMPIONS</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-none">
              Rugby, Premier League, Formula 1 & UFC Live.
            </h1>

            <p className="text-sm md:text-base text-blue-100/90 leading-relaxed font-medium">
              Live broadcast coverage for the <strong>Springboks</strong>, <strong>Six Nations</strong>, <strong>Rugby Championship</strong>, <strong>Premier League</strong>, <strong>UEFA Champions League</strong>, and <strong>Formula 1 Grand Prix</strong> with multi-satellite low-latency failover.
            </p>

            {liveMatches.length > 0 && (
              <div className="pt-2 flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => onWatchMatch(liveMatches[0])}
                  className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-500/30 flex items-center gap-2 transition-all hover:scale-105 cursor-pointer"
                >
                  <Radio className="w-4 h-4 text-slate-950 animate-pulse" />
                  <span>Watch Featured Live: {liveMatches[0].homeTeam.name} vs {liveMatches[0].awayTeam.name}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SuperSport 24/7 Television Broadcast Grid */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tv className="w-5 h-5 text-amber-400" />
            <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
              SuperSport 24/7 Live Television Channels
            </h2>
          </div>
          <span className="text-xs font-bold text-amber-400/80 bg-amber-400/10 px-2.5 py-1 rounded-lg border border-amber-400/20">
            Direct Satellite Feeds
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {SUPERSPORT_247_CHANNELS.map((ch) => (
            <div
              key={ch.id}
              onClick={() => handleWatchChannel(ch)}
              className={`group relative p-4 rounded-2xl bg-gradient-to-b ${ch.gradient} border hover:border-amber-400/60 hover:scale-105 cursor-pointer transition-all shadow-xl flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{ch.icon}</span>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-black/70 border border-white/10 backdrop-blur-md text-amber-300">
                  {ch.badge}
                </span>
              </div>
              <div className="my-1">
                <h4 className="text-xs font-black text-white line-clamp-1">{ch.name}</h4>
                <p className="text-[10px] text-blue-200/70 mt-1 line-clamp-2 leading-tight">{ch.desc}</p>
              </div>
              <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-black text-amber-400 group-hover:text-amber-300">
                <span>Watch Channel</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Search & Sport Filter Navigation */}
      <div className="space-y-4">
        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative max-w-2xl mx-auto">
          <Search className="w-5 h-5 text-blue-300 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search teams, tournaments, or fighters (e.g. Springboks, Real Madrid, Verstappen, UFC, Arsenal)..."
            className="w-full pl-12 pr-12 py-3.5 rounded-2xl bg-[#00173d] border-2 border-blue-800/60 focus:border-amber-400 focus:outline-none text-xs sm:text-sm text-white placeholder-blue-300/50 shadow-xl"
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

        {/* Sport Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {SUPERSPORT_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelectSport(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer flex-shrink-0 border ${
                activeSport === cat.id
                  ? 'bg-blue-600 text-white border-amber-400 shadow-lg shadow-blue-600/40 scale-105'
                  : 'bg-[#00173d] text-blue-200/80 hover:text-white hover:bg-blue-900 border-blue-900/60'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Status Filter (All / Live / Upcoming) */}
        <div className="flex items-center justify-between border-b border-blue-900/50 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSelectFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeFilter === 'all' ? 'bg-blue-600 text-white shadow-md' : 'text-blue-200 hover:text-white bg-blue-950/40'
              }`}
            >
              All Fixtures ({matches.length})
            </button>
            <button
              onClick={() => onSelectFilter('live')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeFilter === 'live'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : 'text-rose-400 hover:text-white bg-rose-950/30 border border-rose-500/30'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              Live Now ({liveMatches.length})
            </button>
            <button
              onClick={() => onSelectFilter('upcoming')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeFilter === 'upcoming' ? 'bg-blue-600 text-white shadow-md' : 'text-blue-200 hover:text-white bg-blue-950/40'
              }`}
            >
              Upcoming Scheduled
            </button>
          </div>
          <span className="text-xs text-blue-300 font-mono hidden sm:inline">
            Showing {filteredMatches.length} SuperSport events
          </span>
        </div>
      </div>

      {/* Match Fixture Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 rounded-2xl bg-[#00173d]/60 border border-blue-900/40 animate-pulse" />
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
        <div className="py-16 text-center space-y-3 bg-[#00173d]/40 rounded-3xl border border-blue-900/40">
          <Trophy className="w-12 h-12 text-amber-400 mx-auto" />
          <h3 className="text-base font-black text-white">No active matches found for this filter</h3>
          <p className="text-xs text-blue-200/70 max-w-sm mx-auto">
            Try switching sport categories above or tune into our 24/7 SuperSport Television channels.
          </p>
        </div>
      )}
    </div>
  );
};

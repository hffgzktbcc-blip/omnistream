import React, { useState, useEffect } from 'react';
import { SportsMatch } from '../../types/sports';
import { SportsCard } from './SportsCard';
import { iptvStorage, IPTVChannel } from '../../services/iptvStorage';
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
  Crown,
  Plus,
  Trash2,
  Video,
  CheckCircle2
} from 'lucide-react';

interface SportsCatalogProps {
  matches: SportsMatch[];
  loading: boolean;
  onWatchMatch: (match: SportsMatch) => void;
  activeSport: string;
  onSelectSport: (sport: string) => void;
  activeFilter: 'all' | 'live' | 'upcoming' | 'finished';
  onSelectFilter: (filter: 'all' | 'live' | 'upcoming' | 'finished') => void;
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

const SUPERSPORT_247_FEEDS = [
  {
    id: 'feed_ss_rugby_highlights',
    name: 'SuperSport Rugby Highlights HD',
    badge: '🏉 Springboks & URC',
    sport: 'rugby',
    icon: '🏉',
    desc: 'Official Springboks, Six Nations, Rugby Championship & URC match highlights',
    url: 'https://www.youtube-nocookie.com/embed/videoseries?list=PL0D5C35BB8FAEF3E8&autoplay=1',
    gradient: 'from-amber-600/30 via-[#00173d] to-[#000c1e] border-amber-400/40 text-amber-300'
  },
  {
    id: 'feed_ss_epl_live',
    name: 'Premier League Goals & Action',
    badge: '⚽ 24/7 EPL Highlights',
    sport: 'soccer',
    icon: '⚽',
    desc: 'Official Premier League matchday goals, tactical cam & press conferences',
    url: 'https://www.youtube-nocookie.com/embed/videoseries?list=PLQ_vl3g3HkWn3R8ZJ0T1kG5kP8V9rV3B_&autoplay=1',
    gradient: 'from-blue-600/30 via-[#00173d] to-[#000c1e] border-blue-400/40 text-blue-300'
  },
  {
    id: 'feed_ss_f1_live',
    name: 'Red Bull TV (Live 24/7 F1 & Action)',
    badge: '🏎️ 1080p Native HLS',
    sport: 'f1',
    icon: '🏎️',
    desc: 'Official 24/7 Red Bull Motorsport, Formula 1 paddock & extreme sports live feed',
    url: 'https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8',
    gradient: 'from-red-600/30 via-[#00173d] to-[#000c1e] border-red-400/40 text-red-300'
  },
  {
    id: 'feed_ss_sportsgrid',
    name: 'SportsGrid 24/7 Live Network',
    badge: '🏆 Live Satellite HLS',
    sport: 'all',
    icon: '🏆',
    desc: '24/7 real-time sports odds, match analysis, live scores and commentary',
    url: 'https://sportsgrid-klowdtv.amagi.tv/playlist.m3u8',
    gradient: 'from-yellow-500/30 via-[#00173d] to-[#000c1e] border-yellow-400/40 text-yellow-300'
  },
  {
    id: 'feed_ss_f1_paddock',
    name: 'Formula 1 Paddock & Analysis',
    badge: '🏎️ Official F1 HD',
    sport: 'f1',
    icon: '🏎️',
    desc: 'Grand Prix on-boards, technical breakdowns, driver interviews & press feeds',
    url: 'https://www.youtube-nocookie.com/embed/videoseries?list=PLfoNZDHitwjWq3qGz5hS5b6XJ3Q1X1Z1Z&autoplay=1',
    gradient: 'from-purple-600/30 via-[#00173d] to-[#000c1e] border-purple-400/40 text-purple-300'
  },
  {
    id: 'feed_ss_ufc_live',
    name: 'UFC & Combat Free Fights',
    badge: '🥊 UFC Live Replays',
    sport: 'mma',
    icon: '🥊',
    desc: 'Official full fight replays, knockout compilations, weigh-ins & press conferences',
    url: 'https://www.youtube-nocookie.com/embed/videoseries?list=PL_Gzvvgow5rw5sP5t3wS0D4v_p68d8x7b&autoplay=1',
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
  const [customChannels, setCustomChannels] = useState<IPTVChannel[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newChanName, setNewChanName] = useState('');
  const [newChanUrl, setNewChanUrl] = useState('');
  const [newChanSport, setNewChanSport] = useState<any>('all');

  useEffect(() => {
    setCustomChannels(iptvStorage.getChannels().filter((c) => c.isCustom));
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchQuery(localSearch);
  };

  const handleClear = () => {
    setLocalSearch('');
    onSearchQuery('');
  };

  const handleWatchFeed = (feed: typeof SUPERSPORT_247_FEEDS[0] | IPTVChannel) => {
    const dummyMatch: SportsMatch = {
      id: feed.id,
      sport: (feed as any).sport || 'all',
      league: feed.name,
      homeTeam: { name: feed.name, score: 'LIVE' },
      awayTeam: { name: 'SuperSport HD Broadcast', score: '24/7' },
      status: 'LIVE',
      statusText: (feed as any).desc || '24/7 Live Broadcast Feed',
      servers: [
        { name: `${feed.name}`, url: feed.url }
      ]
    };
    onWatchMatch(dummyMatch);
  };

  const handleAddCustomChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChanName || !newChanUrl) return;
    const added = iptvStorage.addCustomChannel({
      name: newChanName,
      url: newChanUrl,
      sport: newChanSport
    });
    setCustomChannels(iptvStorage.getChannels().filter((c) => c.isCustom));
    setNewChanName('');
    setNewChanUrl('');
    setShowAddModal(false);
    handleWatchFeed(added);
  };

  const handleDeleteCustomChannel = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    iptvStorage.removeCustomChannel(id);
    setCustomChannels(iptvStorage.getChannels().filter((c) => c.isCustom));
  };

  const DEFAULT_SUPERSPORT_MATCHES: SportsMatch[] = [
    {
      id: 'sport_rugby_springboks_nz',
      sport: 'rugby',
      league: 'Rugby Championship / Freedom Cup',
      homeTeam: {
        name: 'South Africa Springboks',
        logo: 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/rugby/500/21.png',
        score: '24'
      },
      awayTeam: {
        name: 'New Zealand All Blacks',
        logo: 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/rugby/500/17.png',
        score: '18'
      },
      status: 'FINISHED',
      statusText: 'Final Result (24-18) • Ellis Park Replay',
      servers: []
    },
    {
      id: 'sport_epl_liverpool_ipswich',
      sport: 'soccer',
      league: 'Premier League',
      homeTeam: {
        name: 'Liverpool',
        logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/364.png',
        score: undefined
      },
      awayTeam: {
        name: 'Ipswich Town',
        logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/370.png',
        score: undefined
      },
      status: 'UPCOMING',
      statusText: 'Friday • 21:00 Kickoff CAT',
      servers: []
    },
    {
      id: 'sport_ucl_villa_brugge',
      sport: 'soccer',
      league: 'UEFA Champions League',
      homeTeam: {
        name: 'Aston Villa',
        logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/362.png',
        score: undefined
      },
      awayTeam: {
        name: 'Club Brugge',
        logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/84.png',
        score: undefined
      },
      status: 'UPCOMING',
      statusText: 'Tuesday, Sep 8 • 18:45 Kickoff CAT',
      servers: []
    },
    {
      id: 'sport_f1_monza',
      sport: 'f1',
      league: 'Formula 1 World Championship',
      homeTeam: {
        name: 'Pirelli Italian Grand Prix • Monza',
        logo: 'https://a.espncdn.com/combiner/i?img=/i/leaguelogos/racing/500/f1.png',
        score: 'F1'
      },
      awayTeam: {
        name: 'Autodromo Nazionale Monza',
        logo: 'https://a.espncdn.com/i/teamlogos/racing/500/f1.png',
        score: 'RACE'
      },
      status: 'UPCOMING',
      statusText: 'Friday • 15:00 Practice / Quali',
      servers: []
    },
    {
      id: 'sport_ufc_dricus',
      sport: 'mma',
      league: 'UFC 312 Championship',
      homeTeam: {
        name: 'Dricus Du Plessis (Champion)',
        logo: 'https://a.espncdn.com/combiner/i?img=/i/leaguelogos/mma/500/ufc.png',
        score: 'SA'
      },
      awayTeam: {
        name: 'Israel Adesanya',
        logo: 'https://a.espncdn.com/i/teamlogos/mma/500/ufc.png',
        score: 'NZ'
      },
      status: 'UPCOMING',
      statusText: 'Saturday • 04:00 CAT Main Card',
      servers: []
    }
  ];

  // Guaranteed list of matches from server or fallback
  const baseMatches = matches && matches.length > 0 ? matches : DEFAULT_SUPERSPORT_MATCHES;

  // Filter by active sport category if not 'all'
  const sportFiltered =
    activeSport === 'all'
      ? baseMatches
      : baseMatches.filter((m) => m.sport === activeSport);

  // Search query filter
  const searchFiltered = searchQuery
    ? sportFiltered.filter((m) => {
        const q = searchQuery.toLowerCase();
        return (
          (m.homeTeam?.name || '').toLowerCase().includes(q) ||
          (m.awayTeam?.name || '').toLowerCase().includes(q) ||
          (m.league || '').toLowerCase().includes(q) ||
          (m.sport || '').toLowerCase().includes(q) ||
          (m.statusText || '').toLowerCase().includes(q)
        );
      })
    : sportFiltered;

  const liveMatches = searchFiltered.filter((m) => m.status === 'LIVE');
  const upcomingMatches = searchFiltered.filter((m) => m.status === 'UPCOMING');
  const finishedMatches = searchFiltered.filter((m) => m.status === 'FINISHED');

  const filteredMatches =
    activeFilter === 'live'
      ? liveMatches
      : activeFilter === 'upcoming'
      ? upcomingMatches
      : activeFilter === 'finished'
      ? finishedMatches
      : searchFiltered;

  const featuredMatch = liveMatches[0] || upcomingMatches[0] || baseMatches[0];

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-8 animate-fade-in">
      {/* SuperSport World of Champions Hero Header */}
      {!searchQuery && (
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#00173d] via-[#002b66] to-[#00122e] border-2 border-amber-400/40 p-6 md:p-10 shadow-2xl">
          {/* Ambient Lighting */}
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
              Official HD streams, live match scoreboards, and 24/7 broadcast feeds for the{' '}
              <strong>Springboks</strong>, <strong>Six Nations</strong>, <strong>Premier League</strong>,{' '}
              <strong>Formula 1</strong>, and <strong>UFC</strong>.
            </p>

            <div className="pt-2 flex items-center gap-3 flex-wrap">
              {featuredMatch && (
                <button
                  onClick={() => onWatchMatch(featuredMatch)}
                  className={`px-6 py-3.5 rounded-2xl font-black text-xs sm:text-sm shadow-xl flex items-center gap-2 transition-all hover:scale-105 cursor-pointer ${
                    featuredMatch.status === 'LIVE'
                      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                      : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-amber-500/30'
                  }`}
                >
                  {featuredMatch.status === 'LIVE' ? (
                    <>
                      <Radio className="w-4 h-4 text-white animate-pulse" />
                      <span>
                        Watch LIVE: {featuredMatch.homeTeam?.name || 'Home'} vs{' '}
                        {featuredMatch.awayTeam?.name || 'Away'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current text-slate-950" />
                      <span>
                        Featured Match: {featuredMatch.homeTeam?.name || 'Home'} vs{' '}
                        {featuredMatch.awayTeam?.name || 'Away'}
                      </span>
                    </>
                  )}
                </button>
              )}

              <button
                onClick={() => setShowAddModal(true)}
                className="px-5 py-3.5 rounded-2xl bg-blue-950 hover:bg-blue-900 text-amber-300 border border-amber-400/40 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Custom IPTV / M3U8 Stream</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom User IPTV Streams (if any) */}
      {customChannels.length > 0 && (
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tv className="w-5 h-5 text-amber-400" />
              <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                Your Custom IPTV Sports Channels
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {customChannels.map((ch) => (
              <div
                key={ch.id}
                onClick={() => handleWatchFeed(ch)}
                className="p-4 rounded-2xl bg-[#00173d] border border-amber-400/40 hover:border-amber-400 hover:scale-[1.02] cursor-pointer transition-all shadow-xl flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl">📡</span>
                  <div className="min-w-0">
                    <h4 className="text-xs font-black text-white truncate">{ch.name}</h4>
                    <p className="text-[10px] text-blue-200/70 truncate">{ch.url}</p>
                  </div>
                </div>
                <button
                  onClick={(e) => handleDeleteCustomChannel(ch.id, e)}
                  className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-blue-900 transition-colors cursor-pointer"
                  title="Remove channel"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 24/7 SuperSport Broadcast Channels Shelf */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-amber-400 animate-pulse" />
            <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
              24/7 SuperSport & Live Broadcast Channels
            </h2>
            <span className="text-[10px] font-bold text-amber-300 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/30">
              Always Live
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {SUPERSPORT_247_FEEDS.map((feed) => (
            <div
              key={feed.id}
              onClick={() => handleWatchFeed(feed)}
              className={`group relative rounded-2xl p-4 bg-gradient-to-br ${feed.gradient} border hover:scale-105 transition-all duration-300 cursor-pointer shadow-lg flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="text-xl">{feed.icon}</span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-950/70 backdrop-blur-md border border-white/10">
                  {feed.badge}
                </span>
              </div>
              <div className="my-1">
                <h4 className="text-xs font-black text-white line-clamp-1">{feed.name}</h4>
                <p className="text-[10px] text-blue-200/70 mt-1 line-clamp-2 leading-tight">
                  {feed.desc}
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-black text-amber-400 group-hover:text-amber-300">
                <span>Play Channel</span>
                <Play className="w-3 h-3 fill-current" />
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

        {/* Status Filter Tabs (All / Live Now / Upcoming / Results & Replays) */}
        <div className="flex items-center justify-between border-b border-blue-900/50 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onSelectFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-blue-200 hover:text-white bg-blue-950/40'
              }`}
            >
              All Fixtures ({searchFiltered.length})
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
                activeFilter === 'upcoming'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-blue-200 hover:text-white bg-blue-950/40'
              }`}
            >
              Upcoming Schedule ({upcomingMatches.length})
            </button>
            <button
              onClick={() => onSelectFilter('finished')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeFilter === 'finished'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-indigo-300 hover:text-white bg-indigo-950/30 border border-indigo-500/30'
              }`}
            >
              <Trophy className="w-3 h-3 text-amber-300" />
              Results & Replays ({finishedMatches.length})
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
            <div
              key={i}
              className="h-44 rounded-2xl bg-[#00173d]/60 border border-blue-900/40 animate-pulse"
            />
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
      ) : activeFilter === 'live' ? (
        <div className="p-8 text-center space-y-4 bg-gradient-to-b from-[#00173d]/80 to-[#000c1e] rounded-3xl border border-blue-800/60 shadow-xl">
          <div className="p-3.5 rounded-full bg-rose-600/20 text-rose-400 w-fit mx-auto border border-rose-500/30">
            <Radio className="w-8 h-8" />
          </div>
          <div className="space-y-1.5 max-w-lg mx-auto">
            <h3 className="text-base sm:text-lg font-black text-white">
              No Matches Currently Live Right Now
            </h3>
            <p className="text-xs text-blue-200/80 leading-relaxed">
              Live events update in real time when matches kickoff. Check out the{' '}
              <button
                onClick={() => onSelectFilter('upcoming')}
                className="text-amber-400 underline font-bold cursor-pointer"
              >
                Upcoming Schedule
              </button>{' '}
              for this week's fixtures or tune into our 24/7 SuperSport broadcast channels above.
            </p>
          </div>
        </div>
      ) : (
        <div className="py-16 text-center space-y-3 bg-[#00173d]/40 rounded-3xl border border-blue-900/40">
          <Trophy className="w-12 h-12 text-amber-400 mx-auto" />
          <h3 className="text-base font-black text-white">No matches found for this filter</h3>
          <p className="text-xs text-blue-200/70 max-w-sm mx-auto">
            Try switching sport categories above or tune into our 24/7 SuperSport Television channels.
          </p>
        </div>
      )}

      {/* Modal: Add Custom IPTV / M3U8 Stream */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg bg-[#00173d] border-2 border-amber-400/60 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-blue-900/60 pb-3">
              <div className="flex items-center gap-2">
                <Tv className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-black text-white">Add Custom Live Sports Stream</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-blue-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomChannel} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-amber-300 mb-1">
                  Channel / Match Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SuperSport Rugby HD / Springboks Feed"
                  value={newChanName}
                  onChange={(e) => setNewChanName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-blue-950 border border-blue-800 text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-300 mb-1">
                  Stream URL (.m3u8, HLS, or YouTube Live)
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://example.com/live/stream.m3u8"
                  value={newChanUrl}
                  onChange={(e) => setNewChanUrl(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-blue-950 border border-blue-800 text-white text-xs font-mono focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-300 mb-1">Sport Category</label>
                <select
                  value={newChanSport}
                  onChange={(e) => setNewChanSport(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-blue-950 border border-blue-800 text-white text-xs focus:outline-none focus:border-amber-400"
                >
                  <option value="all">All Sports</option>
                  <option value="rugby">Rugby</option>
                  <option value="soccer">Football / Soccer</option>
                  <option value="f1">Formula 1 / Motorsport</option>
                  <option value="mma">UFC / MMA</option>
                  <option value="cricket">Cricket</option>
                  <option value="basketball">Basketball / NBA</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-blue-900/60">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-colors cursor-pointer shadow-lg shadow-amber-400/20"
                >
                  Save & Stream
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

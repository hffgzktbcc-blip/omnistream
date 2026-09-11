import React, { useState, useEffect, useRef } from 'react';
import { SportsMatch } from '../../types/sports';
import { HlsVideoPlayer } from './HlsVideoPlayer';
import {
  X,
  ChevronLeft,
  RotateCcw,
  Maximize,
  Loader2,
  AlertTriangle,
  ExternalLink,
  Trophy,
  Radio,
  Tv,
  Sparkles,
  Airplay,
  ShieldCheck,
  Zap,
  Plus
} from 'lucide-react';

interface SportsPlayerModalProps {
  match: SportsMatch | null;
  onClose: () => void;
}

export interface StreamServer {
  name: string;
  url: string;
  type: 'hls' | 'youtube' | 'web';
  badge: string;
}

function getSportSpecificServers(match: SportsMatch, homeName: string, awayName: string): StreamServer[] {
  const sport = (match.sport || '').toLowerCase();
  const league = (match.league || '').toLowerCase();
  const query = `${homeName} vs ${awayName} ${match.league || ''}`;
  const encodedQuery = encodeURIComponent(query);

  const servers: StreamServer[] = [];

  // 1. Direct Match Servers (Prioritized if explicitly supplied, e.g. 24/7 channels or custom streams)
  if (match.servers && Array.isArray(match.servers) && match.servers.length > 0) {
    match.servers.forEach((s) => {
      if (s.url && !servers.some((srv) => srv.url === s.url)) {
        servers.push({
          name: s.name,
          url: s.url,
          type: s.url.includes('.m3u8')
            ? 'hls'
            : s.url.includes('youtube')
            ? 'youtube'
            : 'web',
          badge: s.url.includes('.m3u8') ? '1080p Native HLS' : 'Direct Feed'
        });
      }
    });
  }

  // 2. High-Reliability Native HLS 24/7 Sports Networks (Guaranteed smooth in-app playback)
  if (sport === 'f1' || league.includes('formula') || league.includes('racing')) {
    servers.push(
      {
        name: '🏎️ Red Bull TV HD (Live 24/7 Motorsport & F1 Action)',
        url: 'https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8',
        type: 'hls',
        badge: '1080p Native HLS'
      },
      {
        name: '🏎️ FloRacing 24/7 (Sprint Cars & Asphalt Racing)',
        url: 'https://floracing-distro-firetv.amagi.tv/playlist.m3u8',
        type: 'hls',
        badge: '1080p Native HLS'
      }
    );
  } else if (
    sport === 'soccer' ||
    league.includes('premier') ||
    league.includes('champions') ||
    league.includes('la liga') ||
    league.includes('serie') ||
    league.includes('football')
  ) {
    servers.push(
      {
        name: '⚽ FIFA+ Official Live HD',
        url: 'https://fifa-fifaplus-1-us.samsung.wurl.tv/playlist.m3u8',
        type: 'hls',
        badge: '720p Native HLS'
      },
      {
        name: '⚽ fubo Sports Network (Live Football & Tournaments)',
        url: 'https://fubotv-fubosportsnetwork-1-us.samsung.wurl.tv/playlist.m3u8',
        type: 'hls',
        badge: '1080p Native HLS'
      },
      {
        name: '🏆 SportsGrid 24/7 Match Center & Live Odds',
        url: 'https://sportsgrid-klowdtv.amagi.tv/playlist.m3u8',
        type: 'hls',
        badge: '1080p Native HLS'
      }
    );
  } else if (
    sport === 'mma' ||
    league.includes('ufc') ||
    league.includes('combat') ||
    league.includes('fight')
  ) {
    servers.push(
      {
        name: '🥊 DAZN Combat HD (Live Boxing & MMA)',
        url: 'https://jmp2.uk/plu-64d626ac9b414d000820e2fc.m3u8',
        type: 'hls',
        badge: 'HD Native HLS'
      },
      {
        name: '🥊 Fight Network HD (24/7 Combat Sports)',
        url: 'https://antennatv-fightnetwork-1-us.samsung.wurl.tv/playlist.m3u8',
        type: 'hls',
        badge: '1080p Native HLS'
      }
    );
  } else {
    servers.push({
      name: '🏆 SportsGrid 24/7 Live Network (Match Center & Odds)',
      url: 'https://sportsgrid-klowdtv.amagi.tv/playlist.m3u8',
      type: 'hls',
      badge: '1080p Native HLS'
    });
  }

  // 3. Live Web Match Scrapers & Broadcast Mirrors
  if (sport === 'rugby' || league.includes('rugby')) {
    servers.push(
      {
        name: `⚡ Streamed.su Rugby Match Feed (${homeName} vs ${awayName})`,
        url: 'https://streamed.su/category/rugby',
        type: 'web',
        badge: 'Web Popout'
      },
      {
        name: '🏉 SuperSport Rugby HD',
        url: 'https://topembed.pw/channel/SuperSportRugby',
        type: 'web',
        badge: 'SuperSport HD'
      },
      {
        name: '🏉 Sky Sports Arena HD',
        url: 'https://topembed.pw/channel/SkySportsArena',
        type: 'web',
        badge: 'Sky Sports'
      }
    );
  } else if (sport === 'soccer' || league.includes('premier') || league.includes('champions')) {
    servers.push(
      {
        name: `⚡ Streamed.su Football Feed (${homeName} vs ${awayName})`,
        url: 'https://streamed.su/category/football',
        type: 'web',
        badge: 'Web Popout'
      },
      {
        name: '⚽ SuperSport Premier League HD',
        url: 'https://topembed.pw/channel/SkySportsPremierLeague',
        type: 'web',
        badge: 'SuperSport HD'
      },
      {
        name: '⚽ TNT Sports 1 HD',
        url: 'https://topembed.pw/channel/TNTSports1',
        type: 'web',
        badge: 'TNT Sports'
      }
    );
  } else if (sport === 'f1' || league.includes('racing')) {
    servers.push(
      {
        name: '⚡ Streamed.su Motorsport Live Feed',
        url: 'https://streamed.su/category/motor-sports',
        type: 'web',
        badge: 'Web Popout'
      },
      {
        name: '🏎️ Sky Sports F1 HD',
        url: 'https://topembed.pw/channel/SkySportsF1',
        type: 'web',
        badge: 'Sky Sports F1'
      }
    );
  } else if (sport === 'mma' || league.includes('ufc')) {
    servers.push(
      {
        name: '⚡ Streamed.su UFC & Fight Feed',
        url: 'https://streamed.su/category/fight',
        type: 'web',
        badge: 'Web Popout'
      },
      {
        name: '🥊 TNT Sports 2 / UFC PPV',
        url: 'https://topembed.pw/channel/TNTSports2',
        type: 'web',
        badge: 'UFC Live'
      }
    );
  }

  // 4. Official YouTube Highlights & Search (Optional)
  servers.push({
    name: `🎬 Search Match Highlights on YouTube (${homeName} vs ${awayName})`,
    url: `https://www.youtube.com/results?search_query=${encodedQuery}+match+highlights`,
    type: 'web',
    badge: 'YouTube'
  });

  return servers;
}

export const SportsPlayerModal: React.FC<SportsPlayerModalProps> = ({
  match,
  onClose
}) => {
  const [serverIndex, setServerIndex] = useState<number>(0);
  const [theaterMode, setTheaterMode] = useState<boolean>(false);
  const [loadingServer, setLoadingServer] = useState<boolean>(true);
  const [reloadKey, setReloadKey] = useState<number>(Date.now());
  const [customStreamUrl, setCustomStreamUrl] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState<boolean>(false);

  const playerContainerRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!match) return null;

  const homeName =
    typeof match.homeTeam === 'object'
      ? match.homeTeam?.name || 'Home Team'
      : String(match.homeTeam || 'Home Team');
  const awayName =
    typeof match.awayTeam === 'object'
      ? match.awayTeam?.name || 'Away Team'
      : String(match.awayTeam || 'Away Team');
  const homeScore =
    typeof match.homeTeam === 'object' ? match.homeTeam?.score : undefined;
  const awayScore =
    typeof match.awayTeam === 'object' ? match.awayTeam?.score : undefined;

  const allServers = getSportSpecificServers(match, homeName, awayName);
  const currentServer = allServers[serverIndex] || allServers[0];
  const streamUrl = customStreamUrl || currentServer?.url || '';
  const isHls = streamUrl.includes('.m3u8') || currentServer?.type === 'hls';
  const isYouTube =
    streamUrl.includes('youtube') || currentServer?.type === 'youtube';

  const handlePopoutCinemaWindow = () => {
    window.open(streamUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-xl animate-fade-in">
      <div
        ref={playerContainerRef}
        className={`relative w-full ${
          theaterMode ? 'max-w-7xl' : 'max-w-6xl'
        } h-[92vh] max-h-[95vh] bg-[#000c1e] border-2 border-blue-900/60 rounded-3xl overflow-hidden shadow-2xl flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* SuperSport Gold Accent Strip */}
        <div className="h-1.5 bg-gradient-to-r from-amber-400 via-blue-500 to-amber-400 w-full" />

        {/* Header Bar */}
        <div className="p-3 sm:p-4 bg-[#00173d] border-b border-blue-900/50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-900/80 hover:bg-blue-800 text-white font-bold text-xs transition-colors cursor-pointer border border-blue-700/60 flex-shrink-0 shadow-md"
              title="Back to Sports (Esc / Remote Back)"
              aria-label="Back to Sports"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Sports</span>
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black tracking-wider text-amber-400 uppercase bg-amber-500/10 px-2 py-0.5 rounded border border-amber-400/30">
                  SUPERSPORT
                </span>
                <span className="text-xs sm:text-sm font-black text-white truncate">
                  {homeName} vs {awayName}
                </span>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded flex items-center gap-1 flex-shrink-0 ${
                    match.status === 'LIVE'
                      ? 'bg-rose-600 text-white animate-pulse'
                      : match.status === 'FINISHED'
                      ? 'bg-blue-800 text-blue-100'
                      : 'bg-amber-400 text-slate-950'
                  }`}
                >
                  {match.status === 'LIVE' && <Radio className="w-2.5 h-2.5" />}
                  {match.status === 'LIVE'
                    ? 'LIVE'
                    : match.status === 'FINISHED'
                    ? 'REPLAY / FINAL'
                    : 'SCHEDULED'}
                </span>
              </div>
              <p className="text-[11px] text-blue-200/70 font-mono mt-0.5 truncate">
                {match.league || 'SuperSport Match Center'} •{' '}
                {homeScore !== undefined && awayScore !== undefined
                  ? `Score: ${homeScore} - ${awayScore}`
                  : match.statusText || 'Broadcast Stream'}
              </p>
            </div>
          </div>

          {/* Controls & Server Switcher */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowCustomInput(!showCustomInput)}
              className="px-2.5 py-1.5 rounded-xl bg-blue-950/80 hover:bg-blue-900 text-amber-300 border border-amber-400/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
              title="Paste custom M3U8 or IPTV stream URL"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Add M3U8</span>
            </button>

            <select
              value={serverIndex}
              onChange={(e) => {
                setServerIndex(parseInt(e.target.value));
                setCustomStreamUrl('');
                setReloadKey(Date.now());
              }}
              className="bg-blue-950 text-blue-100 text-xs font-bold px-3 py-1.5 rounded-xl border border-blue-800/60 focus:outline-none focus:border-amber-400 cursor-pointer max-w-[180px] sm:max-w-xs truncate"
            >
              {allServers.map((s, idx) => (
                <option key={idx} value={idx}>
                  {s.name} ({s.badge})
                </option>
              ))}
            </select>

            <button
              onClick={handlePopoutCinemaWindow}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black tracking-wide transition-all shadow-lg shadow-blue-600/30 cursor-pointer border border-blue-400/30"
              title="Open stream in clean dedicated popout window"
            >
              <ExternalLink className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">Popout</span>
            </button>
          </div>
        </div>

        {/* Custom M3U8 Drawer */}
        {showCustomInput && (
          <div className="p-3 bg-[#00122e] border-b border-blue-900 flex items-center gap-3">
            <input
              type="text"
              placeholder="Paste custom .m3u8 live stream URL..."
              value={customStreamUrl}
              onChange={(e) => setCustomStreamUrl(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-xl bg-blue-950 text-white text-xs border border-blue-800 focus:outline-none focus:border-amber-400 font-mono"
            />
            <button
              onClick={() => {
                if (customStreamUrl) {
                  setReloadKey(Date.now());
                  setShowCustomInput(false);
                }
              }}
              className="px-4 py-1.5 rounded-xl bg-amber-400 text-slate-950 text-xs font-bold hover:bg-amber-300 cursor-pointer flex-shrink-0"
            >
              Stream URL
            </button>
          </div>
        )}

        {/* Video Player Display Screen */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
          {isHls ? (
            <HlsVideoPlayer
              key={`${streamUrl}_${reloadKey}`}
              src={streamUrl}
              title={`${homeName} vs ${awayName}`}
              autoPlay={true}
            />
          ) : isYouTube ? (
            <iframe
              key={`${streamUrl}_${reloadKey}`}
              src={streamUrl}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#000c1e] p-6 text-center space-y-4">
              <div className="p-4 rounded-3xl bg-blue-950/80 border border-blue-800 text-amber-400 shadow-xl">
                <Tv className="w-10 h-10" />
              </div>
              <div className="max-w-md space-y-2">
                <h3 className="text-base font-black text-white">
                  {currentServer?.name || 'Live Sports Broadcast Feed'}
                </h3>
                <p className="text-xs text-blue-200/80 leading-relaxed">
                  Web-based sports mirrors block embedding inside iframe windows. Click below to launch this live feed in a clean, popup-blocked cinema tab.
                </p>
              </div>
              <button
                onClick={handlePopoutCinemaWindow}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 flex items-center gap-2 transition-transform hover:scale-105 cursor-pointer"
              >
                <ExternalLink className="w-4 h-4 text-slate-950" />
                <span>Open {homeName} vs {awayName} Feed</span>
              </button>
            </div>
          )}
        </div>

        {/* Match Details & Server Ribbon Footer */}
        <div className="p-3 sm:p-4 bg-[#001433] border-t border-blue-900/60 flex items-center justify-between text-xs text-blue-200 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-amber-400">Current Feed:</span>
            <span className="font-mono text-white bg-blue-950 px-2 py-0.5 rounded border border-blue-800">
              {currentServer?.name}
            </span>
            <span className="text-blue-400">({currentServer?.badge})</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setReloadKey(Date.now())}
              className="flex items-center gap-1 text-slate-300 hover:text-white cursor-pointer"
              title="Reload current stream"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reload</span>
            </button>
            <button
              onClick={() => setTheaterMode(!theaterMode)}
              className="flex items-center gap-1 text-slate-300 hover:text-white cursor-pointer"
              title="Toggle Theater Mode"
            >
              <Maximize className="w-3.5 h-3.5" />
              <span>{theaterMode ? 'Standard' : 'Theater'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

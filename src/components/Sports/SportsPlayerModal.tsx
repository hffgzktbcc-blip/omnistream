import React, { useState, useEffect, useRef } from 'react';
import { SportsMatch } from '../../types/sports';
import { HlsVideoPlayer } from './HlsVideoPlayer';
import { api } from '../../services/api';
import {
  X,
  ChevronLeft,
  ChevronRight,
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

function getSportSpecificServers(
  match: SportsMatch,
  homeName: string,
  awayName: string,
  dynamicServers: StreamServer[] = []
): StreamServer[] {
  const sport = (match.sport || '').toLowerCase();
  const league = (match.league || '').toLowerCase();
  const query = `${homeName} vs ${awayName} ${match.league || ''}`;
  const encodedQuery = encodeURIComponent(query);

  const servers: StreamServer[] = [];

  // 1. Dynamic Live Match Embed Streams (Resolved live from streaming providers)
  if (dynamicServers.length > 0) {
    dynamicServers.forEach((ds) => {
      if (ds.url && !servers.some((s) => s.url === ds.url)) {
        servers.push(ds);
      }
    });
  }

  // 2. Direct Match Servers (Prioritized if explicitly supplied, e.g. 24/7 channels or custom streams)
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
          badge: s.url.includes('.m3u8') ? '1080p Native HLS' : 'Direct Live Feed'
        });
      }
    });
  }

  // 3. High-Reliability Verified 24/7 Networks (100% active, open CORS * across all browsers)
  if (sport === 'f1' || league.includes('formula') || league.includes('racing') || league.includes('motor')) {
    servers.push(
      {
        name: '🏎️ Red Bull TV HD (Live 24/7 F1, Paddock & Motorsport)',
        url: 'https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8',
        type: 'hls',
        badge: '1080p 60fps HLS'
      },
      {
        name: '🏎️ Fast&FunBox Action HD (Auto Racing & Extreme Sports)',
        url: 'https://dash3.antik.sk/live/test_fast_and_funbox_medium_atk/playlist.m3u8',
        type: 'hls',
        badge: '1080p Native HLS'
      },
      {
        name: '🏆 DraftKings Sports Network HD (Live Race Center & Odds)',
        url: 'https://na.linear.zype.com/e0bd0e23-a958-4e43-8164-4f2fef8876a8/fd3614bd-90bf-4530-a277-65ae3a1720c8-zype/live.m3u8',
        type: 'hls',
        badge: '1080p Native HLS'
      }
    );
  } else if (sport === 'cricket' || league.includes('cricket') || league.includes('ipl')) {
    servers.push(
      {
        name: '🏏 Cricket Gold HD (24/7 International Cricket & Archives)',
        url: 'https://streams2.sofast.tv/ptnr-yupptv/title-cricketgold/v1/master/611d79b11b77e2f571934fd80ca1413453772ac7/b2048bb8-1686-4432-aa50-647245383e0c/manifest.m3u8',
        type: 'hls',
        badge: '1080p Native HLS'
      },
      {
        name: '🏆 DraftKings Sports Network HD (Live Match Center & Odds)',
        url: 'https://na.linear.zype.com/e0bd0e23-a958-4e43-8164-4f2fef8876a8/fd3614bd-90bf-4530-a277-65ae3a1720c8-zype/live.m3u8',
        type: 'hls',
        badge: '1080p Native HLS'
      }
    );
  } else {
    servers.push(
      {
        name: '🏆 DraftKings Sports Network HD (24/7 Live Match Center & Odds)',
        url: 'https://na.linear.zype.com/e0bd0e23-a958-4e43-8164-4f2fef8876a8/fd3614bd-90bf-4530-a277-65ae3a1720c8-zype/live.m3u8',
        type: 'hls',
        badge: '1080p Native HLS'
      },
      {
        name: '🏎️ Red Bull TV HD (Extreme Sports & World Championships)',
        url: 'https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8',
        type: 'hls',
        badge: '1080p 60fps HLS'
      },
      {
        name: '⛳ 30A Golf Kingdom HD (Championship Golf)',
        url: 'https://30a-tv.com/feeds/vidaa/golf.m3u8',
        type: 'hls',
        badge: '720p Native HLS'
      }
    );
  }

  // 4. Active Live Match Broadcast Mirrors (No X-Frame-Options, iframe embeddable)
  servers.push(
    {
      name: `⚡ StrikeOut Live Sports Feed (${homeName} vs ${awayName})`,
      url: 'https://strikeout.im',
      type: 'web',
      badge: 'Live Mirror'
    },
    {
      name: `⚡ CricFree Global Stream (${homeName} vs ${awayName})`,
      url: 'https://cricfree.live',
      type: 'web',
      badge: 'Global Mirror'
    },
    {
      name: `⚡ SportLemons Live Hub (${homeName})`,
      url: 'https://sportlemons.net',
      type: 'web',
      badge: 'Match Hub'
    }
  );

  // 5. Official YouTube Highlights & Press Conferences (Embeddable YouTube Player)
  servers.push({
    name: `🎬 Match Highlights & Official Coverage (${homeName} vs ${awayName})`,
    url: `https://www.youtube.com/embed?listType=search&list=${encodedQuery}+highlights`,
    type: 'youtube',
    badge: 'YouTube HD'
  });

  return servers;
}

export const SportsPlayerModal: React.FC<SportsPlayerModalProps> = ({
  match,
  onClose
}) => {
  const [serverIndex, setServerIndex] = useState<number>(0);
  const [theaterMode, setTheaterMode] = useState<boolean>(false);
  const [iframeLoading, setIframeLoading] = useState<boolean>(true);
  const [reloadKey, setReloadKey] = useState<number>(Date.now());
  const [customStreamUrl, setCustomStreamUrl] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState<boolean>(false);
  const [dynamicServers, setDynamicServers] = useState<StreamServer[]>([]);

  const playerContainerRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Dynamically resolve live streams if match has sources
  useEffect(() => {
    if (!match) return;
    setServerIndex(0);
    setIframeLoading(true);
    setReloadKey(Date.now());

    if (match.sources && Array.isArray(match.sources) && match.sources.length > 0) {
      api.getMatchStreams(match.sources)
        .then((streams) => {
          if (streams.length > 0) {
            setDynamicServers(
              streams.map((s) => ({
                name: s.name,
                url: s.url,
                type: 'web',
                badge: s.badge
              }))
            );
          }
        })
        .catch(() => {});
    } else {
      setDynamicServers([]);
    }
  }, [match?.id]);

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

  const handleNextServer = () => {
    setServerIndex((prev) => (prev + 1) % allServers.length);
    setCustomStreamUrl('');
    setReloadKey(Date.now());
  };

  const handleOpenVlc = () => {
    const rawUrl = streamUrl;
    const absoluteUrl = rawUrl.startsWith('http') ? rawUrl : `${window.location.origin}${rawUrl}`;
    const cleanTitle = `${homeName} vs ${awayName}`.replace(/[^\w\s-]/g, '');
    const m3uContent = `#EXTM3U\n#EXTINF:-1,${cleanTitle}\n${absoluteUrl}\n`;
    const blob = new Blob([m3uContent], { type: 'application/x-mpegurl' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `${cleanTitle}.m3u`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);

    try {
      window.location.href = `vlc://${absoluteUrl}`;
    } catch {}
  };

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
            {isHls && (
              <button
                onClick={handleOpenVlc}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black border border-amber-500/40 text-xs font-bold transition-all shadow-sm cursor-pointer"
                title="Open in VLC / External Player (vlc:// or .m3u)"
              >
                <span className="text-sm">📙</span>
                <span className="hidden sm:inline">VLC</span>
              </button>
            )}

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
                setIframeLoading(true);
                setReloadKey(Date.now());
              }}
              className="bg-blue-950 text-blue-100 text-xs font-bold px-3 py-1.5 rounded-xl border border-blue-800/60 focus:outline-none focus:border-amber-400 cursor-pointer max-w-[170px] sm:max-w-xs truncate"
            >
              {allServers.map((s, idx) => (
                <option key={idx} value={idx}>
                  {s.name} ({s.badge})
                </option>
              ))}
            </select>

            {allServers.length > 1 && (
              <button
                onClick={handleNextServer}
                className="p-1.5 rounded-xl bg-blue-900/80 hover:bg-blue-800 text-amber-400 border border-blue-700/60 transition-colors cursor-pointer"
                title="Switch to next server"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

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
              streamUrl={streamUrl}
              src={streamUrl}
              title={`${homeName} vs ${awayName}`}
              autoPlay={true}
              onNextServer={allServers.length > 1 ? handleNextServer : undefined}
              onPopout={handlePopoutCinemaWindow}
            />
          ) : (
            <div className="relative w-full h-full bg-black flex items-center justify-center">
              {iframeLoading && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#000c1e]/90 backdrop-blur-sm space-y-3 pointer-events-none">
                  <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                  <p className="text-xs font-bold text-white tracking-wide">
                    Connecting to {currentServer?.name || 'Live Sports Feed'}...
                  </p>
                  <p className="text-[11px] text-blue-300/70 font-mono">
                    Securing stream & blocking popups
                  </p>
                </div>
              )}
              <iframe
                key={`${streamUrl}_${reloadKey}`}
                src={streamUrl}
                title={`${homeName} vs ${awayName}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
                onLoad={() => setIframeLoading(false)}
                className="w-full h-full border-0 absolute inset-0 z-10 bg-black"
                referrerPolicy="no-referrer"
                sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"
              />

              {/* In-Player Floating Quick Actions */}
              <div className="absolute bottom-3 right-3 z-30 flex items-center gap-2 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 opacity-70 hover:opacity-100 transition-opacity">
                <button
                  onClick={() => {
                    setIframeLoading(true);
                    setReloadKey(Date.now());
                  }}
                  className="text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                  title="Reload Current Stream"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reload</span>
                </button>
                <div className="h-3 w-px bg-white/20" />
                <button
                  onClick={handleNextServer}
                  className="text-amber-400 hover:text-amber-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  title="Switch to Next Server"
                >
                  <span>Next Server</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
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
            {allServers.length > 1 && (
              <button
                onClick={handleNextServer}
                className="flex items-center gap-1 text-amber-400 hover:text-amber-300 cursor-pointer font-bold"
                title="Switch to next streaming server"
              >
                <span>Next Server ⏭️</span>
              </button>
            )}
            <button
              onClick={() => {
                setIframeLoading(true);
                setReloadKey(Date.now());
              }}
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

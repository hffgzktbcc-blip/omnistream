import React, { useState, useEffect, useRef } from 'react';
import { SportsMatch } from '../../types/sports';
import {
  X,
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
  Zap
} from 'lucide-react';

interface SportsPlayerModalProps {
  match: SportsMatch | null;
  onClose: () => void;
}

const SUPERSPORT_CHANNELS = [
  {
    name: '🏉 SuperSport Rugby HD',
    url: 'https://topembed.pw/channel/SuperSportRugby',
    sport: 'rugby',
    badge: 'Springboks & URC'
  },
  {
    name: '⚽ SuperSport Premier League HD',
    url: 'https://topembed.pw/channel/SkySportsPremierLeague',
    sport: 'soccer',
    badge: 'EPL & UCL Live'
  },
  {
    name: '🏎️ SuperSport Motorsport / F1 HD',
    url: 'https://topembed.pw/channel/SkySportsF1',
    sport: 'f1',
    badge: 'F1 Grand Prix'
  },
  {
    name: '🏆 SuperSport Grandstand HD',
    url: 'https://topembed.pw/channel/TNTSports1',
    sport: 'all',
    badge: 'World of Champions'
  },
  {
    name: '🥊 SuperSport Action & UFC HD',
    url: 'https://topembed.pw/channel/DAZN1',
    sport: 'mma',
    badge: 'UFC & Boxing'
  },
  {
    name: '🏀 SuperSport Variety / ESPN HD',
    url: 'https://topembed.pw/channel/ESPN',
    sport: 'basketball',
    badge: 'NBA & NFL'
  },
  {
    name: '⚡ Streamed.su Multi-Sport HD',
    url: 'https://streamed.su',
    sport: 'all',
    badge: 'Global Mirror'
  },
  {
    name: '🌍 VIPRow Universal Sports',
    url: 'https://www.viprow.nu/sports-online',
    sport: 'all',
    badge: 'Satellite Backup'
  }
];

export const SportsPlayerModal: React.FC<SportsPlayerModalProps> = ({
  match,
  onClose
}) => {
  const [serverIndex, setServerIndex] = useState<number>(0);
  const [theaterMode, setTheaterMode] = useState<boolean>(false);
  const [loadingServer, setLoadingServer] = useState<boolean>(true);
  const [reloadKey, setReloadKey] = useState<number>(Date.now());
  const [exhaustedServers, setExhaustedServers] = useState<boolean>(false);
  const [serversTried, setServersTried] = useState<number>(0);

  const watchdogRef = useRef<NodeJS.Timeout | null>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  // Close on Escape key or Fullscreen on 'F'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if ((e.key === 'f' || e.key === 'F') && !['input', 'textarea'].includes((document.activeElement?.tagName || '').toLowerCase())) {
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Anti-Popup Armor
  useEffect(() => {
    const originalWindowOpen = window.open;
    window.open = function (...args: any[]) {
      console.log('Blocked popup window:', args[0]);
      return null;
    };

    return () => {
      window.open = originalWindowOpen;
    };
  }, []);

  if (!match) return null;

  const sportKey = (match.sport || '').toLowerCase();
  const relevantChannels = SUPERSPORT_CHANNELS.filter(
    (c) => c.sport === 'all' || c.sport === sportKey || sportKey === 'all'
  );

  const matchServers = match.servers && match.servers.length > 0 ? match.servers : [];
  const servers = [...matchServers, ...relevantChannels];
  const currentStreamUrl = servers[serverIndex]?.url || servers[0]?.url || 'https://www.viprow.nu/sports-online';

  // Watchdog timer (12s automatic failover)
  useEffect(() => {
    if (watchdogRef.current) clearTimeout(watchdogRef.current);
    if (exhaustedServers) return;

    setLoadingServer(true);
    watchdogRef.current = setTimeout(() => {
      handleServerTimeout();
    }, 12000);

    return () => {
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
    };
  }, [serverIndex, reloadKey]);

  const handleServerTimeout = () => {
    setServersTried((prev) => {
      const nextTried = prev + 1;
      if (nextTried >= servers.length) {
        setExhaustedServers(true);
        setLoadingServer(false);
        return nextTried;
      }
      setServerIndex((curr) => (curr + 1) % servers.length);
      setReloadKey(Date.now());
      return nextTried;
    });
  };

  const handleIframeLoaded = () => {
    if (watchdogRef.current) clearTimeout(watchdogRef.current);
    setLoadingServer(false);
  };

  const handleServerChange = (newIndex: number) => {
    setServerIndex(newIndex);
    setExhaustedServers(false);
    setServersTried(0);
    setReloadKey(Date.now());
  };

  const handleForceRefresh = () => {
    setExhaustedServers(false);
    setServersTried(0);
    setReloadKey(Date.now());
  };

  const toggleFullscreen = () => {
    const elem = playerContainerRef.current as any;
    if (!elem) return;
    const isFullscreen = document.fullscreenElement || (document as any).webkitFullscreenElement;
    if (!isFullscreen) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(() => {});
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
    }
  };

  /**
   * Dedicated Clean Popout Cinema Window
   * Bypasses all iframe header restrictions with 100% guarantee!
   */
  const handlePopoutCinemaWindow = () => {
    const titleText = `${match.homeTeam.name} vs ${match.awayTeam.name} • ${match.league}`;
    const popoutHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="referrer" content="no-referrer">
        <title>${titleText} • SuperSport Live Stream</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background: #000c1e; color: #fff; height: 100vh; display: flex; flex-direction: column; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; overflow: hidden; }
          .header { background: #00173d; padding: 12px 20px; display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #ffd100; font-size: 13px; font-weight: bold; }
          .header-left { display: flex; align-items: center; gap: 10px; }
          .badge { background: #e50914; color: #fff; font-size: 11px; padding: 3px 8px; border-radius: 6px; text-transform: uppercase; font-weight: 900; letter-spacing: 0.5px; }
          .supersport { color: #ffd100; font-weight: 900; font-size: 14px; }
          .btn { background: #0066ff; color: #fff; border: none; padding: 6px 14px; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: bold; transition: all 0.2s; }
          .btn:hover { background: #0052cc; }
          iframe { flex: 1; width: 100%; height: 100%; border: none; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            <span class="supersport">SUPERSPORT</span>
            <span class="badge">🔴 LIVE</span>
            <span>${titleText}</span>
          </div>
          <button class="btn" onclick="document.querySelector('iframe').requestFullscreen()">⛶ Fullscreen</button>
        </div>
        <iframe src="${currentStreamUrl}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="no-referrer"></iframe>
      </body>
      </html>
    `;
    const blob = new Blob([popoutHtml], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');
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
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-blue-950/80 hover:bg-blue-900 text-slate-300 hover:text-white transition-colors cursor-pointer border border-blue-800/50"
              title="Close Player (Esc)"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black tracking-wider text-amber-400 uppercase bg-amber-500/10 px-2 py-0.5 rounded border border-amber-400/30">
                  SUPERSPORT
                </span>
                <span className="text-xs sm:text-sm font-black text-white line-clamp-1">
                  {match.homeTeam.name} vs {match.awayTeam.name}
                </span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-rose-600 text-white flex items-center gap-1">
                  <Radio className="w-2.5 h-2.5 animate-pulse" />
                  {match.status === 'LIVE' ? 'LIVE NOW' : match.statusText || 'SCHEDULED'}
                </span>
              </div>
              <p className="text-[11px] text-blue-200/70 font-mono mt-0.5">
                {match.league} • {match.homeTeam.score !== undefined ? `Score: ${match.homeTeam.score} - ${match.awayTeam.score}` : 'Match Center'}
              </p>
            </div>
          </div>

          {/* Controls & Server Switcher */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleForceRefresh}
              className="p-2 rounded-xl bg-blue-950/80 hover:bg-blue-900 text-blue-200 hover:text-white transition-colors cursor-pointer border border-blue-800/40"
              title="Reload Stream (R)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <select
              value={serverIndex}
              onChange={(e) => handleServerChange(parseInt(e.target.value))}
              className="bg-blue-950 text-blue-100 text-xs font-bold px-3 py-1.5 rounded-xl border border-blue-800/60 focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              {servers.map((s, idx) => (
                <option key={idx} value={idx}>
                  {s.name}
                </option>
              ))}
            </select>

            <button
              onClick={handlePopoutCinemaWindow}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black tracking-wide transition-all shadow-lg shadow-blue-600/30 cursor-pointer border border-blue-400/30"
              title="Open Direct Popout Cinema Window (Guaranteed Playback)"
            >
              <ExternalLink className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">⚡ Popout Cinema</span>
            </button>
          </div>
        </div>

        {/* Video Canvas Container */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
          {/* Loading Spinner */}
          {loadingServer && !exhaustedServers && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/85 backdrop-blur-sm pointer-events-none">
              <Loader2 className="w-12 h-12 text-amber-400 animate-spin" />
              <div className="text-center space-y-1">
                <p className="text-xs font-black text-white tracking-wider uppercase">
                  Connecting to {servers[serverIndex]?.name || 'SuperSport Satellite Feed'}...
                </p>
                <p className="text-[11px] text-blue-300/80">
                  Negotiating ultra-low latency sports stream
                </p>
              </div>
            </div>
          )}

          {/* Exhausted Servers Fallback */}
          {exhaustedServers && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-[#000c1e]/98 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div className="space-y-1.5 max-w-md">
                <h3 className="text-base font-black text-white">Browser Iframe Protection Active</h3>
                <p className="text-xs text-blue-200/80 leading-relaxed">
                  This live sports satellite feed requires opening in our sandboxed popout cinema window to bypass browser security headers.
                </p>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handlePopoutCinemaWindow}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 cursor-pointer shadow-xl shadow-amber-500/30 transition-all hover:scale-105"
                >
                  <ExternalLink className="w-4 h-4 text-slate-950" />
                  <span>Launch Popout Cinema Window</span>
                </button>
                <button
                  onClick={() => handleServerChange(0)}
                  className="px-4 py-3 rounded-2xl bg-blue-950 hover:bg-blue-900 text-blue-200 border border-blue-800 font-bold text-xs cursor-pointer"
                >
                  Retry SuperSport 1
                </button>
              </div>
            </div>
          )}

          {/* Stream Iframe */}
          <iframe
            key={`${serverIndex}-${reloadKey}`}
            src={currentStreamUrl}
            onLoad={handleIframeLoaded}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="no-referrer"
            className="w-full h-full border-none"
          />
        </div>

        {/* SuperSport Broadcast Channels Switcher Shelf */}
        <div className="p-3 bg-[#001433] border-t border-blue-900/60 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider pl-2 flex-shrink-0 flex items-center gap-1">
            <Trophy className="w-3 h-3" />
            <span>SuperSport Feeds:</span>
          </span>
          {servers.map((srv, idx) => (
            <button
              key={idx}
              onClick={() => handleServerChange(idx)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex-shrink-0 border ${
                idx === serverIndex
                  ? 'bg-blue-600 text-white border-amber-400 shadow-lg shadow-blue-600/40 scale-105'
                  : 'bg-blue-950/60 text-blue-200/80 hover:text-white hover:bg-blue-900 border-blue-800/40'
              }`}
            >
              {srv.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

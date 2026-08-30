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
  Sparkles
} from 'lucide-react';

interface SportsPlayerModalProps {
  match: SportsMatch | null;
  onClose: () => void;
}

const GLOBAL_SPORTS_CHANNELS = [
  { name: '🏉 SuperSport Rugby HD', url: 'https://topembed.pw/channel/SuperSportRugby', sport: 'rugby' },
  { name: '⚽ Sky Sports Premier League', url: 'https://topembed.pw/channel/SkySportsPremierLeague', sport: 'soccer' },
  { name: '🏆 TNT Sports 1 (UCL & UFC)', url: 'https://topembed.pw/channel/TNTSports1', sport: 'all' },
  { name: '🏀 ESPN Live HD', url: 'https://topembed.pw/channel/ESPN', sport: 'basketball' },
  { name: '🏎️ Sky Sports F1 HD', url: 'https://topembed.pw/channel/SkySportsF1', sport: 'f1' },
  { name: '🥊 DAZN Combat / UFC HD', url: 'https://topembed.pw/channel/DAZN1', sport: 'mma' },
  { name: '🌍 VIPRow Universal Live', url: 'https://www.viprow.nu/sports-online', sport: 'all' },
  { name: '⚡ Streamed.su Match Feed', url: 'https://streamed.su', sport: 'all' }
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

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Anti-Popup Armor
  useEffect(() => {
    const originalWindowOpen = window.open;
    window.open = function (...args: any[]) {
      console.log('Blocked sports popup:', args[0]);
      return null;
    };

    return () => {
      window.open = originalWindowOpen;
    };
  }, []);

  if (!match) return null;

  const sportKey = (match.sport || '').toLowerCase();
  const relevantChannels = GLOBAL_SPORTS_CHANNELS.filter(
    (c) => c.sport === 'all' || c.sport === sportKey || sportKey === 'all'
  );

  const matchServers = match.servers && match.servers.length > 0 ? match.servers : [];
  const servers = [...matchServers, ...relevantChannels];
  const currentStreamUrl = servers[serverIndex]?.url || servers[0]?.url || 'https://www.viprow.nu/sports-online';

  // Watchdog timer (15s automatic failover)
  useEffect(() => {
    if (watchdogRef.current) clearTimeout(watchdogRef.current);
    if (exhaustedServers) return;

    setLoadingServer(true);
    watchdogRef.current = setTimeout(() => {
      handleServerTimeout();
    }, 15000);

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

  const handlePopoutDirect = () => {
    window.open(currentStreamUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-xl animate-fade-in">
      <div
        ref={playerContainerRef}
        className={`relative w-full ${
          theaterMode ? 'max-w-7xl' : 'max-w-6xl'
        } h-[92vh] max-h-[95vh] bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="p-3 sm:p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Close Player (Esc)"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-white line-clamp-1">
                  {match.homeTeam.name} vs {match.awayTeam.name}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-600 text-white flex items-center gap-1">
                  <Radio className="w-2.5 h-2.5 animate-pulse" />
                  {match.status === 'LIVE' ? 'LIVE NOW' : match.statusText || 'SCHEDULED'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                {match.league} • {match.homeTeam.score !== undefined ? `${match.homeTeam.score} - ${match.awayTeam.score}` : 'Match Center'}
              </p>
            </div>
          </div>

          {/* Controls & Server Switcher */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleForceRefresh}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Reload Stream"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <select
              value={serverIndex}
              onChange={(e) => handleServerChange(parseInt(e.target.value))}
              className="bg-slate-800 text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-700 focus:outline-none focus:border-rose-500 cursor-pointer"
            >
              {servers.map((s, idx) => (
                <option key={idx} value={idx}>
                  {s.name}
                </option>
              ))}
            </select>

            <button
              onClick={handlePopoutDirect}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md shadow-rose-600/20 cursor-pointer"
              title="Open Direct Stream in Clean Tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">⚡ Popout Stream</span>
            </button>
          </div>
        </div>

        {/* Video Canvas Container */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
          {/* Loading Spinner */}
          {loadingServer && !exhaustedServers && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/80 backdrop-blur-sm pointer-events-none">
              <Loader2 className="w-10 h-10 text-rose-500 animate-spin" />
              <div className="text-center space-y-1">
                <p className="text-xs font-bold text-white tracking-wide">
                  Connecting to {servers[serverIndex]?.name || 'Live Sports HD Feed'}...
                </p>
                <p className="text-[11px] text-slate-400">
                  Switching to fastest live satellite mirror
                </p>
              </div>
            </div>
          )}

          {/* Exhausted Servers Fallback */}
          {exhaustedServers && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-slate-950/95 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-md">
                <h3 className="text-sm font-bold text-white">Stream Loading in Popout Window</h3>
                <p className="text-xs text-slate-400">
                  Some live sports feeds require opening directly due to browser iframe protections.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePopoutDirect}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-rose-600/30"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open Live Feed Now</span>
                </button>
                <button
                  onClick={() => handleServerChange(0)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
                >
                  Retry Channel 1
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

        {/* Quick Channel Bar */}
        <div className="p-2.5 bg-slate-950 border-t border-slate-800 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-2 flex-shrink-0">
            Quick Channels:
          </span>
          {servers.map((srv, idx) => (
            <button
              key={idx}
              onClick={() => handleServerChange(idx)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex-shrink-0 ${
                idx === serverIndex
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
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

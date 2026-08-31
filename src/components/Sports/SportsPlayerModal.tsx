import React, { useState, useEffect, useRef } from 'react';
import { SportsMatch } from '../../types/sports';
import { HlsVideoPlayer } from './HlsVideoPlayer';
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
  Zap,
  Plus
} from 'lucide-react';

interface SportsPlayerModalProps {
  match: SportsMatch | null;
  onClose: () => void;
}

const SUPERSPORT_CHANNELS = [
  {
    name: '🏎️ Red Bull TV (Live 24/7 F1 & Action)',
    url: 'https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8',
    type: 'hls' as const,
    badge: '1080p Native'
  },
  {
    name: '🏉 Springboks & Rugby Highlights HD',
    url: 'https://www.youtube-nocookie.com/embed/videoseries?list=PL0D5C35BB8FAEF3E8&autoplay=1',
    type: 'youtube' as const,
    badge: 'Official HD'
  },
  {
    name: '⚽ Premier League Goals & Highlights',
    url: 'https://www.youtube-nocookie.com/embed/videoseries?list=PLQ_vl3g3HkWn3R8ZJ0T1kG5kP8V9rV3B_&autoplay=1',
    type: 'youtube' as const,
    badge: 'Official EPL'
  },
  {
    name: '🏎️ Formula 1 Race Highlights & Paddock',
    url: 'https://www.youtube-nocookie.com/embed/videoseries?list=PLfoNZDHitwjWq3qGz5hS5b6XJ3Q1X1Z1Z&autoplay=1',
    type: 'youtube' as const,
    badge: 'Official F1'
  },
  {
    name: '🏆 SportsGrid Live HD (24/7 Match Center)',
    url: 'https://sportsgrid-klowdtv.amagi.tv/playlist.m3u8',
    type: 'hls' as const,
    badge: 'Live Satellite'
  },
  {
    name: '🌍 VIPRow Live Sports Stream',
    url: 'https://www.viprow.nu/sports-online',
    type: 'web' as const,
    badge: 'External Popout'
  },
  {
    name: '⚡ Streamed.su Multi-Sport HD',
    url: 'https://streamed.su',
    type: 'web' as const,
    badge: 'External Popout'
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

  const homeName = typeof match.homeTeam === 'object' ? match.homeTeam?.name || 'Home Team' : String(match.homeTeam || 'Home Team');
  const awayName = typeof match.awayTeam === 'object' ? match.awayTeam?.name || 'Away Team' : String(match.awayTeam || 'Away Team');
  const homeScore = typeof match.homeTeam === 'object' ? match.homeTeam?.score : undefined;
  const awayScore = typeof match.awayTeam === 'object' ? match.awayTeam?.score : undefined;

  const matchServers = (match.servers || []).map((s) => ({
    name: s.name,
    url: s.url,
    type: s.url.includes('.m3u8')
      ? ('hls' as const)
      : s.url.includes('youtube')
      ? ('youtube' as const)
      : ('web' as const),
    badge: 'Match Feed'
  }));

  const allServers = [...matchServers, ...SUPERSPORT_CHANNELS];
  const currentServer = allServers[serverIndex] || allServers[0];
  const streamUrl = customStreamUrl || currentServer?.url || 'https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8';
  const isHls = streamUrl.includes('.m3u8') || currentServer?.type === 'hls';
  const isYouTube = streamUrl.includes('youtube') || currentServer?.type === 'youtube';

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
              className="p-1.5 rounded-xl bg-blue-950/80 hover:bg-blue-900 text-slate-300 hover:text-white transition-colors cursor-pointer border border-blue-800/50 flex-shrink-0"
              title="Close Player (Esc)"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black tracking-wider text-amber-400 uppercase bg-amber-500/10 px-2 py-0.5 rounded border border-amber-400/30">
                  SUPERSPORT
                </span>
                <span className="text-xs sm:text-sm font-black text-white truncate">
                  {homeName} vs {awayName}
                </span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-rose-600 text-white flex items-center gap-1 flex-shrink-0">
                  <Radio className="w-2.5 h-2.5 animate-pulse" />
                  {match.status === 'LIVE' ? 'LIVE' : match.statusText || 'SCHEDULED'}
                </span>
              </div>
              <p className="text-[11px] text-blue-200/70 font-mono mt-0.5 truncate">
                {match.league || 'SuperSport Championship'} • {homeScore !== undefined ? `Score: ${homeScore} - ${awayScore}` : 'Match Center'}
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

        {/* Custom M3U8 Stream Input Drawer */}
        {showCustomInput && (
          <div className="p-3 bg-[#00102b] border-b border-blue-900/60 flex items-center gap-3 animate-fade-in">
            <input
              type="url"
              value={customStreamUrl}
              onChange={(e) => setCustomStreamUrl(e.target.value)}
              placeholder="Paste any custom IPTV or live HLS (.m3u8) stream URL here..."
              className="flex-1 px-3.5 py-2 rounded-xl bg-[#000c1e] border border-blue-800 text-xs text-white placeholder-blue-300/40 focus:outline-none focus:border-amber-400"
            />
            <button
              onClick={() => {
                setShowCustomInput(false);
                setReloadKey(Date.now());
              }}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer"
            >
              Play M3U8 Stream
            </button>
          </div>
        )}

        {/* Video Player Canvas */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
          {isHls ? (
            <HlsVideoPlayer
              key={`hls-${streamUrl}-${reloadKey}`}
              streamUrl={streamUrl}
              title={match.homeTeam.name}
            />
          ) : isYouTube ? (
            <iframe
              key={`yt-${streamUrl}-${reloadKey}`}
              src={streamUrl}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              className="w-full h-full border-none"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-[#000c1e] text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 mx-auto">
                <ExternalLink className="w-7 h-7" />
              </div>
              <div className="space-y-1.5 max-w-md">
                <h3 className="text-base font-black text-white">External Live Sports Stream</h3>
                <p className="text-xs text-blue-200/80 leading-relaxed">
                  Third-party live satellite sports feeds block iframe embeds for security. Click below to launch in a clean, popup-protected cinema window.
                </p>
              </div>
              <button
                onClick={handlePopoutCinemaWindow}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 cursor-pointer shadow-xl shadow-amber-500/30 transition-all hover:scale-105"
              >
                <ExternalLink className="w-4 h-4 text-slate-950" />
                <span>Launch Direct Stream</span>
              </button>
            </div>
          )}
        </div>

        {/* SuperSport Broadcast Channels Switcher Shelf */}
        <div className="p-3 bg-[#001433] border-t border-blue-900/60 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider pl-2 flex-shrink-0 flex items-center gap-1">
            <Trophy className="w-3 h-3" />
            <span>SuperSport Feeds:</span>
          </span>
          {allServers.map((srv, idx) => (
            <button
              key={idx}
              onClick={() => {
                setServerIndex(idx);
                setCustomStreamUrl('');
                setReloadKey(Date.now());
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex-shrink-0 border ${
                idx === serverIndex && !customStreamUrl
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

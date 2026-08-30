import React, { useState, useEffect, useRef } from 'react';
import { MediaItem } from '../../types/media';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Maximize,
  RotateCcw,
  Film,
  Loader2,
  Airplay,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { CastModal } from '../Common/CastModal';

interface MediaPlayerModalProps {
  item: MediaItem | null;
  season?: number;
  episode?: number;
  onClose: () => void;
  onChangeEpisode?: (season: number, episode: number) => void;
}

export const MediaPlayerModal: React.FC<MediaPlayerModalProps> = ({
  item,
  season = 1,
  episode = 1,
  onClose,
  onChangeEpisode
}) => {
  const [serverIndex, setServerIndex] = useState<number>(0);
  const [theaterMode, setTheaterMode] = useState<boolean>(false);
  const [loadingServer, setLoadingServer] = useState<boolean>(true);
  const [reloadKey, setReloadKey] = useState<number>(Date.now());
  const [showCastModal, setShowCastModal] = useState<boolean>(false);
  const [exhaustedServers, setExhaustedServers] = useState<boolean>(false);
  const [serversTried, setServersTried] = useState<number>(0);

  const watchdogRef = useRef<NodeJS.Timeout | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Anti-Popup Armor (Silently neutralize popups without prompt loops)
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

  if (!item) return null;

  const title = item.title || item.name || item.original_title || 'Media';
  const isMovie = item.media_type === 'movie' || !!item.title;
  const totalSeasons = item.number_of_seasons || 1;
  const totalEpisodes = item.number_of_episodes || totalSeasons * 10;
  const episodesInCurrentSeason = Math.min(Math.ceil(totalEpisodes / totalSeasons), 24);

  // Multi-Server Embed Sources
  const movieServers = [
    {
      name: 'Server 1: VidLink Pro 4K',
      getUrl: (id: number) =>
        `https://vidlink.pro/movie/${id}?primaryColor=6366f1&secondaryColor=a855f7&iconColor=ffffff&title=true&poster=true&autoplay=true`
    },
    {
      name: 'Server 2: VidSrc XYZ',
      getUrl: (id: number) => `https://vidsrc.xyz/embed/movie/${id}`
    },
    {
      name: 'Server 3: VidSrc CC',
      getUrl: (id: number) => `https://vidsrc.cc/v2/embed/movie/${id}`
    },
    {
      name: 'Server 4: AutoEmbed Direct',
      getUrl: (id: number) => `https://player.autoembed.cc/embed/movie/${id}`
    },
    {
      name: 'Server 5: SmashyStream',
      getUrl: (id: number) => `https://player.smashystream.com/movie/${id}`
    },
    {
      name: 'Server 6: MultiEmbed Universal',
      getUrl: (id: number) => `https://multiembed.mov/?video_id=${id}&tmdb=1`
    },
    {
      name: 'Server 7: 2Embed VIP',
      getUrl: (id: number) => `https://www.2embed.cc/embed/${id}`
    }
  ];

  const tvServers = [
    {
      name: 'Server 1: VidLink Pro 4K',
      getUrl: (id: number, s: number, e: number) =>
        `https://vidlink.pro/tv/${id}/${s}/${e}?primaryColor=6366f1&secondaryColor=a855f7&iconColor=ffffff&title=true&poster=true&autoplay=true`
    },
    {
      name: 'Server 2: VidSrc XYZ',
      getUrl: (id: number, s: number, e: number) =>
        `https://vidsrc.xyz/embed/tv/${id}/${s}-${e}`
    },
    {
      name: 'Server 3: VidSrc CC',
      getUrl: (id: number, s: number, e: number) =>
        `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}`
    },
    {
      name: 'Server 4: AutoEmbed Direct',
      getUrl: (id: number, s: number, e: number) =>
        `https://player.autoembed.cc/embed/tv/${id}/${s}/${e}`
    },
    {
      name: 'Server 5: SmashyStream',
      getUrl: (id: number, s: number, e: number) =>
        `https://player.smashystream.com/tv/${id}?s=${s}&e=${e}`
    },
    {
      name: 'Server 6: MultiEmbed Universal',
      getUrl: (id: number, s: number, e: number) =>
        `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}`
    },
    {
      name: 'Server 7: 2Embed VIP',
      getUrl: (id: number, s: number, e: number) =>
        `https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}`
    }
  ];

  const servers = isMovie ? movieServers : tvServers;
  const currentStreamUrl = isMovie
    ? movieServers[serverIndex]?.getUrl(item.id) || movieServers[0].getUrl(item.id)
    : tvServers[serverIndex]?.getUrl(item.id, season, episode) || tvServers[0].getUrl(item.id, season, episode);

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
  }, [serverIndex, reloadKey, season, episode]);

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

  const handleRetryAll = () => {
    setExhaustedServers(false);
    setServersTried(0);
    setServerIndex(0);
    setReloadKey(Date.now());
  };

  const handlePopout = () => {
    const titleText = `${title}${!isMovie ? ` S${season} E${episode}` : ''}`;
    const popoutHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="referrer" content="no-referrer">
        <title>${titleText} • OmniStream Player</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background: #000; color: #fff; height: 100vh; display: flex; flex-direction: column; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; overflow: hidden; }
          .header { background: #0f172a; padding: 10px 16px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #1e293b; font-size: 13px; font-weight: bold; }
          .header-left { display: flex; align-items: center; gap: 8px; }
          .badge { background: #6366f1; font-size: 11px; padding: 2px 8px; border-radius: 6px; }
          .btn { background: #334155; color: #fff; border: 1px solid #475569; padding: 5px 12px; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: bold; }
          .btn:hover { background: #475569; }
          iframe { flex: 1; width: 100%; height: 100%; border: none; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            <span>▶ ${titleText}</span>
            <span class="badge">${servers[serverIndex]?.name || 'Direct Stream'}</span>
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

  const handleNextEp = () => {
    if (onChangeEpisode && episode < episodesInCurrentSeason) {
      onChangeEpisode(season, episode + 1);
      handleForceRefresh();
    }
  };

  const handlePrevEp = () => {
    if (onChangeEpisode && episode > 1) {
      onChangeEpisode(season, episode - 1);
      handleForceRefresh();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-xl animate-fade-in">
      <div
        className={`relative w-full ${
          theaterMode ? 'max-w-6xl' : 'max-w-5xl'
        } max-h-[95vh] bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-3 sm:p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Close Player (Esc)"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-white line-clamp-1">
                  {title}
                </span>
                {!isMovie && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-600 text-white flex-shrink-0">
                    S{season} E{episode}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <Film className="w-3.5 h-3.5 text-indigo-400" />
                <span>Multi-Mirror 4K Player</span>
              </p>
            </div>
          </div>

          {/* Server Selector & Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleForceRefresh}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Reload Stream"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <select
              value={serverIndex}
              onChange={(e) => handleServerChange(parseInt(e.target.value))}
              className="bg-slate-800 text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {servers.map((s, idx) => (
                <option key={idx} value={idx}>
                  {s.name}
                </option>
              ))}
            </select>

            <button
              onClick={handlePopout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all"
              title="Open Clean Popout Window"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Popout</span>
            </button>

            <button
              onClick={() => setShowCastModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 text-xs font-bold transition-all"
              title="Cast to Apple TV or Smart Display"
            >
              <Airplay className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cast</span>
            </button>

            <button
              onClick={() => setTheaterMode(!theaterMode)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors hidden sm:block"
              title="Toggle Theater Mode"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video Player Frame */}
        <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden">
          {loadingServer && !exhaustedServers && (
            <div className="absolute inset-0 z-30 bg-black/90 flex flex-col items-center justify-center gap-2 text-indigo-400">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="text-xs font-semibold">
                Connecting to {servers[serverIndex]?.name.split(':')[1] || 'Streaming Server'}...
              </span>
              <span className="text-[10px] text-slate-500">Auto-failover active</span>
            </div>
          )}

          {exhaustedServers ? (
            <div className="absolute inset-0 z-40 bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mb-3">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-white font-bold text-sm sm:text-base mb-1">No Playable Stream Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mb-4">
                Tested all {servers.length} streaming mirrors. The stream may be temporarily restricted in an iframe or unavailable.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRetryAll}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry All Servers</span>
                </button>
                <button
                  onClick={handlePopout}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Launch Popout Window</span>
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-bold transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <iframe
              key={`player_${serverIndex}_${season}_${episode}_${item.id}_${reloadKey}`}
              src={currentStreamUrl}
              title={`${title} Player`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; web-share"
              allowFullScreen
              referrerPolicy="no-referrer"
              onLoad={handleIframeLoaded}
              className="w-full h-full border-0"
            />
          )}
        </div>

        {/* Bottom Episode Navigation (For TV series) */}
        {!isMovie && onChangeEpisode && (
          <div className="p-4 bg-slate-900/90 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <button
                onClick={handlePrevEp}
                disabled={episode <= 1}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-semibold transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous Ep</span>
              </button>

              <span className="text-xs font-bold text-slate-300">
                Season <strong className="text-indigo-400">{season}</strong> • Episode{' '}
                <strong className="text-indigo-400">{episode}</strong> of {episodesInCurrentSeason}
              </span>

              <button
                onClick={handleNextEp}
                disabled={episode >= episodesInCurrentSeason}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all"
              >
                <span>Next Ep</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Episode Quick Jump Strip */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {Array.from({ length: episodesInCurrentSeason }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  onClick={() => {
                    onChangeEpisode(season, num);
                    handleForceRefresh();
                  }}
                  className={`w-9 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${
                    num === episode
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-105'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Apple TV / AirPlay Casting Modal */}
      <CastModal
        isOpen={showCastModal}
        onClose={() => setShowCastModal(false)}
        mediaTitle={title}
        mediaType={isMovie ? 'movie' : 'tv'}
      />
    </div>
  );
};

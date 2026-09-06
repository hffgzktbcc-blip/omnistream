import React, { useState, useEffect, useRef } from 'react';
import { Anime } from '../../types/anime';
import { MediaItem } from '../../types/media';
import { STREAM_SERVERS, StreamServer, measureServerPing, ANIME_TMDB_MAP, resolveDirectStream, DirectStreamResponse } from '../../services/streamingService';
import { animeStorage } from '../../services/animeStorage';
import { watchHistoryService } from '../../services/watchHistoryService';
import { CinemaPlayer } from './CinemaPlayer';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Maximize,
  RotateCcw,
  Loader2,
  Tv,
  Airplay,
  Layers,
  Zap,
  Film,
  AlertTriangle,
  ExternalLink,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Radio,
  Sparkles
} from 'lucide-react';
import { CastModal } from './CastModal';

export interface UnifiedPlayerSession {
  type: 'movie' | 'tv' | 'anime';
  title: string;
  tmdbId?: number;
  season?: number;
  episode?: number;
  totalEpisodes?: number;
  totalSeasons?: number;
  animeData?: Anime;
  mediaData?: MediaItem;
}

interface UnifiedVideoPlayerProps {
  session: UnifiedPlayerSession | null;
  onClose: () => void;
  onUpdateSession?: (updates: Partial<UnifiedPlayerSession>) => void;
}

export const UnifiedVideoPlayer: React.FC<UnifiedVideoPlayerProps> = ({
  session,
  onClose,
  onUpdateSession
}) => {
  const [selectedServerIndex, setSelectedServerIndex] = useState<number>(0);
  const [audioType, setAudioType] = useState<'sub' | 'dub'>(() => animeStorage.getAudioPreference());
  const [theaterMode, setTheaterMode] = useState<boolean>(false);
  const [showCastModal, setShowCastModal] = useState<boolean>(false);
  const [showEpisodeDrawer, setShowEpisodeDrawer] = useState<boolean>(false);
  const [loadingServer, setLoadingServer] = useState<boolean>(true);
  const [exhaustedServers, setExhaustedServers] = useState<boolean>(false);
  const [serversTried, setServersTried] = useState<number>(0);
  const [resolvedTmdbId, setResolvedTmdbId] = useState<number | undefined>(() => {
    if (session?.tmdbId) return session.tmdbId;
    if (session?.animeData?.id && ANIME_TMDB_MAP[session.animeData.id]) {
      return ANIME_TMDB_MAP[session.animeData.id];
    }
    return undefined;
  });
  const [serverPings, setServerPings] = useState<Record<string, number>>({});
  const [reloadKey, setReloadKey] = useState<number>(Date.now());
  const [showUnmutePrompt, setShowUnmutePrompt] = useState<boolean>(true);
  // ─── Cinema Player Direct HLS Mode ───────────────────────────
  const [cinemaMode, setCinemaMode] = useState<'resolving' | 'cinema' | 'iframe'>('resolving');
  const [directStream, setDirectStream] = useState<DirectStreamResponse | null>(null);
  const [cinemaFailed, setCinemaFailed] = useState(false);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const watchdogRef = useRef<NodeJS.Timeout | null>(null);

  // Next / Prev Server Switchers
  const handleNextServer = () => {
    setSelectedServerIndex((prev) => (prev + 1) % STREAM_SERVERS.length);
    setExhaustedServers(false);
    setServersTried(0);
    setReloadKey(Date.now());
  };

  const handlePrevServer = () => {
    setSelectedServerIndex((prev) => (prev - 1 + STREAM_SERVERS.length) % STREAM_SERVERS.length);
    setExhaustedServers(false);
    setServersTried(0);
    setReloadKey(Date.now());
  };

  // Close on Escape, Fullscreen on 'F', Next Server on 'S', Unmute on 'M'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['input', 'textarea'].includes((document.activeElement?.tagName || '').toLowerCase())) return;
      if (e.key === 'Escape' || e.keyCode === 4) onClose();
      if (e.key === 'f' || e.key === 'F') toggleFullscreen();
      if (e.key === 's' || e.key === 'S') handleNextServer();
      if (e.key === 'm' || e.key === 'M') setShowUnmutePrompt(false);
      if (e.key === 'r' || e.key === 'R') handleForceRefresh();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Anti-Popup Armor (Silently swallow popups)
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

  // Measure server latencies on mount
  useEffect(() => {
    STREAM_SERVERS.forEach(async (srv) => {
      const ping = await measureServerPing(srv);
      setServerPings((prev) => ({ ...prev, [srv.id]: ping }));
    });
  }, []);

  // Dynamic TMDB Show/Movie ID Resolver fallback
  useEffect(() => {
    if (!session) return;

    if (session.type === 'anime') {
      const animeId = session.animeData?.id || session.tmdbId;
      if (animeId && ANIME_TMDB_MAP[animeId]) {
        setResolvedTmdbId(ANIME_TMDB_MAP[animeId]);
        return;
      }
      const title = session.title || session.animeData?.title.english || session.animeData?.title.romaji || '';
      if (title) {
        fetch(`/api/anime/resolve-tmdb?title=${encodeURIComponent(title)}&id=${animeId || ''}`)
          .then((r) => r.json())
          .then((data) => {
            if (data?.tmdbId) {
              setResolvedTmdbId(data.tmdbId);
            }
          })
          .catch(() => {});
      }
    } else if (session.tmdbId) {
      setResolvedTmdbId(session.tmdbId);
    }

    // Persist to unified cross-media watch history
    try {
      if (session.type === 'movie') {
        const item: MediaItem = session.mediaData || {
          id: session.tmdbId || 0,
          title: session.title,
          media_type: 'movie'
        };
        watchHistoryService.saveMovie(item);
      } else if (session.type === 'tv') {
        const item: MediaItem = session.mediaData || {
          id: session.tmdbId || 0,
          name: session.title,
          title: session.title,
          media_type: 'tv'
        };
        watchHistoryService.saveTv(item, session.season || 1, session.episode || 1);
      } else if (session.type === 'anime' && session.animeData) {
        watchHistoryService.saveAnime(session.animeData, session.episode || 1, audioType);
        animeStorage.updateProgress(session.animeData, session.episode || 1, session.totalEpisodes || 12, audioType);
      }
    } catch (e) {
      console.warn('Failed to save to unified watch history:', e);
    }
  }, [session, audioType]);

  // ─── Direct Stream Resolution (Cinema Mode) ────────────────
  useEffect(() => {
    if (!session || cinemaFailed) {
      setCinemaMode('iframe');
      return;
    }

    setCinemaMode('resolving');
    const effectiveTmdb = resolvedTmdbId || session.tmdbId || (session.type === 'anime' ? session.animeData?.id : session.mediaData?.id);
    if (!effectiveTmdb) {
      setCinemaMode('iframe');
      return;
    }

    const timeoutId = setTimeout(() => {
      // If resolution takes > 5s, fall back to iframe
      setCinemaMode('iframe');
    }, 5000);

    resolveDirectStream({
      type: session.type,
      id: effectiveTmdb,
      season: session.season,
      episode: session.episode,
      audioType: session.type === 'anime' ? audioType : undefined,
    }).then((result) => {
      clearTimeout(timeoutId);
      if (result.success && result.streamUrl) {
        setDirectStream(result);
        setCinemaMode('cinema');
      } else {
        setCinemaMode('iframe');
      }
    }).catch(() => {
      clearTimeout(timeoutId);
      setCinemaMode('iframe');
    });

    return () => clearTimeout(timeoutId);
  }, [session, resolvedTmdbId, audioType, cinemaFailed, reloadKey]);

  if (!session) return null;

  const currentSeason = session.season || 1;
  const currentEpisode = session.episode || 1;
  const effectiveTmdbId = resolvedTmdbId || session.tmdbId || (session.type === 'anime' ? session.animeData?.id : session.mediaData?.id) || 93405;
  const currentServer: StreamServer = STREAM_SERVERS[selectedServerIndex] || STREAM_SERVERS[0];

  const getStreamUrl = (srv: StreamServer) => {
    if (session.type === 'movie') {
      return srv.getMovieUrl(effectiveTmdbId);
    } else if (session.type === 'anime') {
      return srv.getAnimeUrl(effectiveTmdbId, currentEpisode, audioType);
    } else {
      return srv.getTvUrl(effectiveTmdbId, currentSeason, currentEpisode);
    }
  };

  const streamUrl = getStreamUrl(currentServer);

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
  }, [selectedServerIndex, reloadKey, currentSeason, currentEpisode, audioType]);

  const handleServerTimeout = () => {
    setServersTried((prev) => {
      const nextTried = prev + 1;
      if (nextTried >= STREAM_SERVERS.length) {
        setExhaustedServers(true);
        setLoadingServer(false);
        return nextTried;
      }
      setSelectedServerIndex((curr) => (curr + 1) % STREAM_SERVERS.length);
      setReloadKey(Date.now());
      return nextTried;
    });
  };

  const handleIframeLoaded = () => {
    if (watchdogRef.current) clearTimeout(watchdogRef.current);
    setLoadingServer(false);
  };

  const handleForceRefresh = () => {
    setExhaustedServers(false);
    setServersTried(0);
    setReloadKey(Date.now());
  };

  const handleRetryAll = () => {
    setExhaustedServers(false);
    setServersTried(0);
    setSelectedServerIndex(0);
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

  const handlePopout = () => {
    const titleText = `${session.title}${session.type !== 'movie' ? ` S${currentSeason} E${currentEpisode}` : ''}`;
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
            <span class="badge">${currentServer.name}</span>
          </div>
          <button class="btn" onclick="document.querySelector('iframe').requestFullscreen()">⛶ Fullscreen</button>
        </div>
        <iframe src="${streamUrl}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="no-referrer"></iframe>
      </body>
      </html>
    `;
    const blob = new Blob([popoutHtml], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');
  };

  const totalEpisodes = session.totalEpisodes || (session.animeData?.episodes) || 24;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-xl animate-fade-in">
      <div
        ref={playerContainerRef}
        className={`relative w-full ${
          theaterMode ? 'max-w-7xl' : 'max-w-6xl'
        } h-[92vh] max-h-[95vh] bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col`}
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
                  {session.title}
                </span>
                {session.type !== 'movie' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-600 text-white flex-shrink-0">
                    S{currentSeason} E{currentEpisode}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <Film className="w-3.5 h-3.5 text-purple-400" />
                <span>Multi-Mirror Cinema Player</span>
              </p>
            </div>
          </div>

          {/* Controls & Server Switcher */}
          <div className="flex items-center gap-2">
            {session.type === 'anime' && (
              <div className="flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700">
                <button
                  onClick={() => {
                    setAudioType('sub');
                    animeStorage.setAudioPreference('sub');
                    handleForceRefresh();
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    audioType === 'sub' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  SUB
                </button>
                <button
                  onClick={() => {
                    setAudioType('dub');
                    animeStorage.setAudioPreference('dub');
                    handleForceRefresh();
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    audioType === 'dub' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  DUB
                </button>
              </div>
            )}

            <button
              onClick={handleForceRefresh}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Reload Stream"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <select
              value={selectedServerIndex}
              onChange={(e) => {
                setSelectedServerIndex(parseInt(e.target.value));
                setExhaustedServers(false);
                setServersTried(0);
                setReloadKey(Date.now());
              }}
              className="bg-slate-800 text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-700 focus:outline-none focus:border-purple-500 cursor-pointer"
            >
              {STREAM_SERVERS.map((s, idx) => (
                <option key={idx} value={idx}>
                  {s.name} {serverPings[s.id] ? `(${serverPings[s.id]}ms)` : ''}
                </option>
              ))}
            </select>

            <button
              onClick={handlePopout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all"
              title="Open in Standalone Popout Tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Popout</span>
            </button>

            <button
              onClick={() => setShowCastModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/40 text-xs font-bold transition-all"
              title="Cast to Apple TV"
            >
              <Airplay className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cast</span>
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Toggle Cinema Fullscreen (F)"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video Canvas & Episode Drawer Container */}
        <div className="relative flex-1 bg-black flex overflow-hidden">
          <div className="relative flex-1 aspect-video sm:aspect-auto min-h-[360px] sm:min-h-[480px] bg-black">
            {loadingServer && !exhaustedServers && (
              <div className="absolute inset-0 z-30 bg-black/90 flex flex-col items-center justify-center gap-2 text-purple-400">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="text-xs font-semibold">
                  Connecting to {currentServer.name}...
                </span>
                <span className="text-[10px] text-slate-500">Auto-failover active</span>
              </div>
            )}

            {exhaustedServers ? (
              <div className="absolute inset-0 z-40 bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center mb-3">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-white font-bold text-sm sm:text-base mb-1">Stream Blocked or Offline</h3>
                <p className="text-xs text-slate-400 max-w-sm mb-4">
                  Tested all {STREAM_SERVERS.length} streaming mirrors. Try launching the Direct TV Stream (bypasses iframe embed locks) or retry.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleRetryAll}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-lg shadow-purple-600/30 flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retry All Servers</span>
                  </button>
                  <button
                    onClick={handlePopout}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg shadow-blue-600/30 flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Direct TV Stream</span>
                  </button>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-bold transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : cinemaMode === 'resolving' ? (
              /* ─── Resolving Direct Stream ──────────────── */
              <div className="absolute inset-0 z-30 bg-black/95 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
                <p className="text-xs font-bold text-white/70">Resolving Cinema Stream...</p>
                <p className="text-[10px] text-slate-500">Direct HLS • No iframes • Full remote control</p>
              </div>
            ) : cinemaMode === 'cinema' && directStream?.streamUrl ? (
              /* ─── Cinema Player (Direct HLS) ──────────── */
              <CinemaPlayer
                streamUrl={directStream.streamUrl}
                qualities={directStream.qualities}
                subtitles={directStream.subtitles}
                audioTracks={directStream.audioTracks}
                title={`${session.title}${session.type !== 'movie' ? ` S${currentSeason} E${currentEpisode}` : ''}`}
                mediaType={session.type}
                mediaId={effectiveTmdbId}
                season={currentSeason}
                episode={currentEpisode}
                resumeTime={watchHistoryService.getItem(
                  session.type === 'movie' ? `movie_${effectiveTmdbId}` :
                  session.type === 'tv' ? `tv_${effectiveTmdbId}` :
                  `anime_${effectiveTmdbId}`
                )?.currentTime}
                onError={() => {
                  setCinemaFailed(true);
                  setCinemaMode('iframe');
                }}
                onClose={onClose}
              />
            ) : (
              <>
                {/* ─── Iframe Fallback Mode ──────────────── */}
                {/* Android TV Unmute & Audio Activation Prompt */}
                {showUnmutePrompt && !loadingServer && (
                  <div
                    onClick={() => setShowUnmutePrompt(false)}
                    className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2.5 cursor-pointer border-2 border-white/50 animate-bounce transition-all scale-105"
                  >
                    <Volume2 className="w-5 h-5 text-slate-950 animate-pulse" />
                    <span className="text-xs sm:text-sm">🔊 No Sound on Android TV? Click / Press OK here to Unmute</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowUnmutePrompt(false);
                      }}
                      className="p-1 rounded-full bg-black/20 hover:bg-black/40 text-slate-950 ml-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <iframe
                  key={`stream_${currentServer.id}_${effectiveTmdbId}_${currentSeason}_${currentEpisode}_${audioType}_${reloadKey}`}
                  src={streamUrl}
                  title={`${session.title} Player`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; web-share"
                  allowFullScreen
                  referrerPolicy="no-referrer"
                  onLoad={handleIframeLoaded}
                  className="w-full h-full border-0 absolute inset-0 z-10"
                />

                {/* Floating TV Remote Control Bar */}
                <div className="absolute bottom-0 left-0 right-0 z-20 p-2 sm:p-3 bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-transparent flex flex-wrap items-center justify-between gap-2 pointer-events-auto">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <button
                      onClick={handlePrevServer}
                      className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 text-[11px] sm:text-xs font-bold flex items-center gap-1 transition-all shadow-md"
                      title="Previous Server"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Prev Mirror</span>
                    </button>
                    <button
                      onClick={handleNextServer}
                      className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-purple-600/90 hover:bg-purple-500 text-white border border-purple-400/50 text-[11px] sm:text-xs font-bold flex items-center gap-1 transition-all shadow-md shadow-purple-600/20"
                      title="Next Server (S)"
                    >
                      <span>Next Mirror (S)</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={handleForceRefresh}
                      className="p-1.5 sm:p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                      title="Reload Stream (R)"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <button
                      onClick={handlePopout}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] sm:text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
                      title="Direct TV Stream (Bypasses Embed Block & Autoplay Restrictions)"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Direct TV Stream</span>
                    </button>
                    <button
                      onClick={() => setShowUnmutePrompt((prev) => !prev)}
                      className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 border border-amber-500/40 text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition-all"
                      title="Unmute / Audio Help (M)"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Unmute Sound</span>
                    </button>
                    <button
                      onClick={toggleFullscreen}
                      className="p-1.5 sm:p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                      title="Fullscreen (F)"
                    >
                      <Maximize className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Episode Drawer for TV and Anime */}
          {showEpisodeDrawer && session.type !== 'movie' && (
            <div className="w-64 sm:w-80 bg-slate-900 border-l border-slate-800 p-4 overflow-y-auto flex flex-col space-y-3 animate-in slide-in-from-right duration-200 flex-shrink-0 z-20">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Tv className="w-3.5 h-3.5 text-purple-400" />
                  <span>Episodes & Seasons</span>
                </h4>
                <button
                  onClick={() => setShowEpisodeDrawer(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5 overflow-y-auto flex-1 pr-1">
                {Array.from({ length: totalEpisodes }, (_, i) => i + 1).map((ep) => (
                  <button
                    key={ep}
                    onClick={() => {
                      if (onUpdateSession) onUpdateSession({ episode: ep });
                      handleForceRefresh();
                    }}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all ${
                      currentEpisode === ep
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    Episode {ep}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Episode Navigation (For TV and Anime) */}
        {session.type !== 'movie' && (
          <div className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between gap-3">
            <button
              onClick={() => {
                if (currentEpisode > 1 && onUpdateSession) {
                  onUpdateSession({ episode: currentEpisode - 1 });
                  handleForceRefresh();
                }
              }}
              disabled={currentEpisode <= 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-semibold"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Prev Ep</span>
            </button>

            <button
              onClick={() => setShowEpisodeDrawer(!showEpisodeDrawer)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold border border-slate-700"
            >
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span>Ep {currentEpisode} / {totalEpisodes}</span>
            </button>

            <button
              onClick={() => {
                if (currentEpisode < totalEpisodes && onUpdateSession) {
                  onUpdateSession({ episode: currentEpisode + 1 });
                  handleForceRefresh();
                }
              }}
              disabled={currentEpisode >= totalEpisodes}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-bold"
            >
              <span>Next Ep</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Cast Modal */}
      <CastModal
        isOpen={showCastModal}
        onClose={() => setShowCastModal(false)}
        mediaTitle={session.title}
        mediaType={session.type}
      />
    </div>
  );
};

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Anime } from '../../types/anime';
import { MediaItem } from '../../types/media';
import { STREAM_SERVERS, StreamServer, measureServerPing, ANIME_TMDB_MAP, resolveDirectStream, DirectStreamResponse } from '../../services/streamingService';
import { animeStorage } from '../../services/animeStorage';
import { watchHistoryService } from '../../services/watchHistoryService';
import { stremioService, StremioStream } from '../../services/stremioService';
import { CinemaPlayer } from './CinemaPlayer';
import { StremioSettingsModal } from './StremioSettingsModal';
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
  Sparkles,
  Settings
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
  onOpenTorrent?: (title: string) => void;
}

const isAndroidTVDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (Boolean((window as any).AndroidTVBridge?.isTV?.())) return true;
  const ua = navigator.userAgent.toLowerCase();
  return (
    ua.includes('tv') ||
    ua.includes('leanback') ||
    ua.includes('android tv') ||
    ua.includes('smart-tv') ||
    ua.includes('googletv') ||
    ua.includes('aftn') ||
    ua.includes('aftm') ||
    ua.includes('bravia') ||
    ua.includes('shield')
  );
};

const isIOSDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
};

export const UnifiedVideoPlayer: React.FC<UnifiedVideoPlayerProps> = ({
  session,
  onClose,
  onUpdateSession,
  onOpenTorrent
}) => {
  const isTV = isAndroidTVDevice();
  const isIOS = isIOSDevice();
  const [iosFullscreen, setIosFullscreen] = useState<boolean>(false);
  const [selectedServerIndex, setSelectedServerIndex] = useState<number>(0);
  const [audioType, setAudioType] = useState<'sub' | 'dub'>(() => animeStorage.getAudioPreference());
  const [theaterMode, setTheaterMode] = useState<boolean>(() => isAndroidTVDevice() || isIOSDevice());
  const [showCastModal, setShowCastModal] = useState<boolean>(false);
  const [showEpisodeDrawer, setShowEpisodeDrawer] = useState<boolean>(false);
  const [loadingServer, setLoadingServer] = useState<boolean>(true);
  const [exhaustedServers, setExhaustedServers] = useState<boolean>(false);
  const [serversTried, setServersTried] = useState<number>(0);
  const [showControls, setShowControls] = useState<boolean>(true);
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
  const [cinemaMode, setCinemaMode] = useState<'resolving' | 'cinema' | 'iframe'>('iframe');

  const [directStream, setDirectStream] = useState<DirectStreamResponse | null>(null);
  const [cinemaFailed, setCinemaFailed] = useState(false);
  const [stremioStreams, setStremioStreams] = useState<StremioStream[]>([]);
  const [loadingStremio, setLoadingStremio] = useState<boolean>(false);
  const [activeStremioStream, setActiveStremioStream] = useState<StremioStream | null>(null);
  const [showStremioModal, setShowStremioModal] = useState<boolean>(false);
  const [torrentModalStream, setTorrentModalStream] = useState<StremioStream | null>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const watchdogRef = useRef<NodeJS.Timeout | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const allowPopupRef = useRef<boolean>(false);

  // Auto-hide HUD on inactivity
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 4500);
  }, []);

  useEffect(() => {
    resetControlsTimer();
    const onActivity = () => resetControlsTimer();
    window.addEventListener('mousemove', onActivity);
    window.addEventListener('keydown', onActivity);
    window.addEventListener('touchstart', onActivity);
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      window.removeEventListener('mousemove', onActivity);
      window.removeEventListener('keydown', onActivity);
      window.removeEventListener('touchstart', onActivity);
    };
  }, [resetControlsTimer]);

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

  // Close on Escape / Remote Back, Fullscreen on 'F', Next Server on 'S', Unmute on 'M', Theater on 'T'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['input', 'textarea', 'select'].includes((document.activeElement?.tagName || '').toLowerCase())) return;
      resetControlsTimer();

      if (
        e.key === 'Escape' ||
        e.key === 'Back' ||
        e.key === 'BrowserBack' ||
        e.key === 'GoBack' ||
        [4, 27, 10009, 461].includes(e.keyCode)
      ) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
      if (e.key === 'f' || e.key === 'F') toggleFullscreen();
      if (e.key === 't' || e.key === 'T') setTheaterMode((prev) => !prev);
      if (e.key === 's' || e.key === 'S') handleNextServer();
      if (e.key === 'm' || e.key === 'M') setShowUnmutePrompt(false);
      if (e.key === 'r' || e.key === 'R') handleForceRefresh();
    };

    const handleAndroidBack = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('android-back-press', handleAndroidBack);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('android-back-press', handleAndroidBack);
    };
  }, [onClose, resetControlsTimer]);

  // Anti-Popup Armor (Silently swallow popups, but allow user popouts)
  useEffect(() => {
    const originalWindowOpen = window.open;
    window.open = function (...args: any[]) {
      if (allowPopupRef.current) {
        return originalWindowOpen.apply(window, args as any);
      }
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

  // ─── Direct Stream Resolution (Non-blocking background promotion) ────
  useEffect(() => {
    if (!session || cinemaFailed) return;

    const effectiveTmdb = resolvedTmdbId || session.tmdbId || (session.type === 'anime' ? session.animeData?.id : session.mediaData?.id);
    if (!effectiveTmdb) return;

    resolveDirectStream({
      type: session.type,
      id: effectiveTmdb,
      title: session.title,
      season: session.season,
      episode: session.episode,
      audioType: session.type === 'anime' ? audioType : undefined,
    }).then((result) => {
      if (result.success && result.streamUrl) {
        setDirectStream(result);
        setCinemaMode('cinema');
      }
    }).catch(() => {});
  }, [session, resolvedTmdbId, audioType, cinemaFailed, reloadKey]);

  // ─── Stremio & Real-Debrid Background Resolution ────────────────
  useEffect(() => {
    if (!session || cinemaFailed) return;

    const effectiveTmdb = resolvedTmdbId || session.tmdbId || (session.type === 'anime' ? session.animeData?.id : session.mediaData?.id);
    if (!effectiveTmdb) return;

    let isMounted = true;
    setLoadingStremio(true);

    stremioService.getStreams({
      type: session.type,
      tmdbId: effectiveTmdb,
      season: session.season || 1,
      episode: session.episode || 1,
    }).then((streams) => {
      if (!isMounted) return;
      setStremioStreams(streams);
      setLoadingStremio(false);

      // Auto-promote to direct debrid stream if user has configured key
      const debridKey = stremioService.getDebridKey();
      if (debridKey && streams.length > 0) {
        const topDirect = streams.find((s) => s.url && s.isDebrid) || streams.find((s) => s.url);
        if (topDirect && topDirect.url) {
          setActiveStremioStream(topDirect);
          setDirectStream({
            success: true,
            streamUrl: topDirect.url,
            qualities: [{ quality: topDirect.quality || 'Auto', url: topDirect.url }],
            provider: topDirect.addonName
          });
          setCinemaMode('cinema');
        }
      }
    }).catch((err) => {
      console.warn('Failed to load Stremio streams:', err);
      if (isMounted) setLoadingStremio(false);
    });

    return () => {
      isMounted = false;
    };
  }, [session, resolvedTmdbId, reloadKey, cinemaFailed]);


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
    setVideoStarted(false);
    setReloadKey(Date.now());
  };

  const handleRetryAll = () => {
    setExhaustedServers(false);
    setServersTried(0);
    setSelectedServerIndex(0);
    setVideoStarted(false);
    setReloadKey(Date.now());
  };

  const toggleFullscreen = () => {
    if (isIOS) {
      setIosFullscreen((prev) => !prev);
      return;
    }
    const elem = playerContainerRef.current as any;
    if (!elem) return;
    const isFullscreen = document.fullscreenElement || (document as any).webkitFullscreenElement;
    if (!isFullscreen) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(() => {
          setIosFullscreen(true);
        });
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      } else {
        setIosFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
      setIosFullscreen(false);
    }
  };

  const handlePopout = () => {
    allowPopupRef.current = true;
    try {
      const titleText = `${session.title}${session.type !== 'movie' ? ` S${currentSeason} E${currentEpisode}` : ''}`;
      const backSectionLabel = session.type === 'movie' ? 'Movies' : session.type === 'tv' ? 'TV Shows' : 'Anime';
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
          .header-left { display: flex; align-items: center; gap: 10px; }
          .badge { background: #6366f1; font-size: 11px; padding: 2px 8px; border-radius: 6px; }
          .btn { background: #334155; color: #fff; border: 1px solid #475569; padding: 6px 14px; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: bold; transition: all 0.2s; display: inline-flex; align-items: center; gap: 6px; }
          .btn:hover { background: #475569; }
          .btn-back { background: #7c3aed; border-color: #8b5cf6; }
          .btn-back:hover { background: #6d28d9; }
          iframe { flex: 1; width: 100%; height: 100%; border: none; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            <button class="btn btn-back" onclick="returnToMovies()" title="Return to Movie Section (Esc / Remote Back)">
              <span>◀ Back to ${backSectionLabel}</span>
            </button>
            <span>▶ ${titleText}</span>
            <span class="badge">${currentServer.name}</span>
          </div>
          <button class="btn" onclick="document.querySelector('iframe').requestFullscreen()">⛶ Fullscreen</button>
        </div>
        <iframe src="${streamUrl}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="no-referrer"></iframe>
        <script>
          function returnToMovies() {
            if (window.opener && !window.opener.closed) {
              window.opener.focus();
              window.close();
            } else if (window.history.length > 1) {
              window.history.back();
            } else {
              window.location.href = window.location.origin;
            }
          }
          window.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' || e.key === 'Back' || e.key === 'BrowserBack' || [4, 27, 10009, 461].includes(e.keyCode)) {
              e.preventDefault();
              returnToMovies();
            }
          });
        </script>
      </body>
      </html>
    `;
      const blob = new Blob([popoutHtml], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } finally {
      setTimeout(() => {
        allowPopupRef.current = false;
      }, 500);
    }
  };

  const handleOpenVlc = () => {
    const rawUrl = directStream?.streamUrl || streamUrl;
    const absoluteUrl = rawUrl.startsWith('http') ? rawUrl : `${window.location.origin}${rawUrl}`;
    
    // 1. Download quick .m3u playlist file (universal double-click opens VLC / IINA / PotPlayer)
    const titleClean = (session.title || 'OmniStream').replace(/[^\w\s-]/g, '');
    const m3uContent = `#EXTM3U\n#EXTINF:-1,${session.title || 'OmniStream'}\n${absoluteUrl}\n`;
    const blob = new Blob([m3uContent], { type: 'application/x-mpegurl' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `${titleClean}.m3u`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);

    // 2. Also trigger deep-link vlc://
    try {
      window.location.href = `vlc://${absoluteUrl}`;
    } catch {
      // Ignored
    }
  };

  const handleOpenWvc = () => {
    const rawUrl = directStream?.streamUrl || streamUrl;
    const absoluteUrl = rawUrl.startsWith('http') ? rawUrl : `${window.location.origin}${rawUrl}`;
    const wvcUrl = `wvc-x-callback://open?url=${encodeURIComponent(absoluteUrl)}&secure_uri=true`;
    try {
      window.location.href = wvcUrl;
    } catch {
      // Ignored
    }
  };

  const totalEpisodes = session.totalEpisodes || (session.animeData?.episodes) || 24;
  const isEdgeToEdge = isTV || theaterMode || isIOS || iosFullscreen;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${
        isEdgeToEdge ? 'p-0 bg-black' : 'p-2 sm:p-4 bg-black/90 backdrop-blur-xl'
      } animate-fade-in`}
    >
      <div
        ref={playerContainerRef}
        className={`relative w-full ${
          isEdgeToEdge
            ? 'w-full h-full max-w-none max-h-none rounded-none border-0'
            : `${theaterMode ? 'max-w-7xl' : 'max-w-6xl'} h-[92vh] max-h-[95vh] rounded-3xl border border-slate-800 shadow-2xl`
        } bg-slate-950 overflow-hidden flex flex-col`}
        onClick={(e) => {
          e.stopPropagation();
          resetControlsTimer();
        }}
        onMouseMove={resetControlsTimer}
      >
        {/* Top Header */}
        <div
          className={`p-3 sm:p-4 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between gap-3 transition-all duration-300 z-30 pt-[max(env(safe-area-inset-top),0.75rem)] pl-[max(env(safe-area-inset-left),0.75rem)] pr-[max(env(safe-area-inset-right),0.75rem)] ${
            showControls ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-full pointer-events-none'
          }`}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-600/90 hover:bg-purple-600 text-white font-bold text-xs transition-all shadow-md border border-purple-400/30 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400"
              title={`Back to ${session.type === 'movie' ? 'Movies' : session.type === 'tv' ? 'TV Shows' : 'Anime'} (Esc / Remote Back)`}
              aria-label="Back to section"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to {session.type === 'movie' ? 'Movies' : session.type === 'tv' ? 'TV Shows' : 'Anime'}</span>
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

            <button
              onClick={() => setShowStremioModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-500/40 text-xs font-bold transition-all shadow-sm cursor-pointer"
              title="Configure Stremio Addons & Real-Debrid"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Stremio</span>
              {stremioService.getDebridKey() && (
                <span className="px-1 py-0.2 bg-emerald-500/30 text-emerald-300 text-[9px] rounded font-mono font-bold border border-emerald-500/40">RD+</span>
              )}
            </button>

            <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700/80 overflow-x-auto scrollbar-none max-w-[200px] sm:max-w-md">
              {/* Stremio / Torrentio / Debrid Streams */}
              {stremioStreams.slice(0, 4).map((s) => {
                const isSelected = activeStremioStream?.id === s.id && cinemaMode === 'cinema';
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      if (s.url) {
                        setActiveStremioStream(s);
                        setDirectStream({
                          success: true,
                          streamUrl: s.url,
                          qualities: [{ quality: s.quality || 'Direct', url: s.url }],
                          provider: s.addonName
                        });
                        setCinemaFailed(false);
                        setCinemaMode('cinema');
                      } else {
                        // Torrent without Debrid - open quick options modal (WVC, VLC, or Free TorBox)
                        setTorrentModalStream(s);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30 ring-1 ring-amber-300'
                        : s.url
                        ? 'text-amber-300 hover:text-white hover:bg-slate-700/60'
                        : 'text-purple-300 hover:text-white hover:bg-slate-700/60 border border-purple-500/30'
                    }`}
                    title={s.title || s.name}
                  >
                    <span>{s.url ? '⚡' : '🧲'} {s.quality || '4K'}</span>
                    {s.isDebrid && <span className="text-[9px] bg-black/40 text-amber-200 px-1 rounded">RD</span>}
                    {!s.url && s.seeders ? <span className="text-[9px] text-purple-300/80">({s.seeders})</span> : null}
                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-pulse" />}
                  </button>
                );
              })}

              {/* Standard Web Mirrors */}
              {STREAM_SERVERS.map((s, idx) => {
                const isSelected = selectedServerIndex === idx && cinemaMode !== 'cinema';
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      setActiveStremioStream(null);
                      setSelectedServerIndex(idx);
                      setCinemaMode('iframe');
                      setExhaustedServers(false);
                      setServersTried(0);
                      setReloadKey(Date.now());
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
                    }`}
                  >
                    <span>{s.name}</span>
                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleOpenWvc}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black border border-amber-500/40 text-xs font-bold transition-all shadow-sm cursor-pointer"
              title="Cast via Web Video Caster (wvc-x-callback://)"
            >
              <span>📺</span>
              <span className="hidden sm:inline">WVC</span>
            </button>

            <button
              onClick={handleOpenVlc}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black border border-amber-500/40 text-xs font-bold transition-all shadow-sm"
              title="Open in VLC / External Player (vlc:// or .m3u)"
            >
              <span className="text-sm">📙</span>
              <span className="hidden sm:inline">VLC</span>
            </button>

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
            {loadingServer && !exhaustedServers && cinemaMode === 'iframe' && (
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
                  Tested all {STREAM_SERVERS.length} streaming mirrors. Switch to the direct ad-free cinema stream, launch the popout player, or return to {session.type === 'movie' ? 'Movies' : session.type === 'tv' ? 'TV Shows' : 'Anime'}.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={() => {
                      setCinemaFailed(false);
                      setCinemaMode('resolving');
                      setReloadKey(Date.now());
                    }}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-lg shadow-purple-600/30 flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Direct Cinema Stream</span>
                  </button>
                  <button
                    onClick={handleRetryAll}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retry Mirrors</span>
                  </button>
                  <button
                    onClick={handlePopout}
                    className="px-3.5 py-2 rounded-xl bg-blue-600/90 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg shadow-blue-600/30 flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Popout Player</span>
                  </button>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Back to {session.type === 'movie' ? 'Movies' : session.type === 'tv' ? 'TV Shows' : 'Anime'}</span>
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
                onSwitchToMirror={() => {
                  setCinemaFailed(true);
                  setCinemaMode('iframe');
                }}
                onClose={onClose}
              />
            ) : (
              <>
                {/* ─── Iframe Clean Fast Mode (No sandbox, direct acceleration) ──────────────── */}
                <iframe
                  key={`stream_${currentServer.id}_${effectiveTmdbId}_${currentSeason}_${currentEpisode}_${audioType}_${reloadKey}`}
                  src={streamUrl}
                  title={`${session.title} Player`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                  referrerPolicy="no-referrer"
                  {...{ playsinline: 'true', 'webkit-playsinline': 'true' }}
                  onLoad={handleIframeLoaded}
                  className="w-full h-full border-0 absolute inset-0 z-10"
                />
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

      {/* Stremio & Real-Debrid Settings Modal */}
      <StremioSettingsModal
        isOpen={showStremioModal}
        onClose={() => {
          setShowStremioModal(false);
          setReloadKey(Date.now());
        }}
      />

      {/* Torrent Stream Quick Action Modal (No Debrid) */}
      {torrentModalStream && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-purple-500/40 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-amber-400">
                <span className="text-xl">🧲</span>
                <h3 className="text-sm font-bold text-white">Torrentio Stream Options</h3>
              </div>
              <button
                onClick={() => setTorrentModalStream(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
              <p className="font-bold text-white line-clamp-2">{torrentModalStream.title || torrentModalStream.name}</p>
              <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                <span>Quality: <strong className="text-amber-300">{torrentModalStream.quality || 'HD'}</strong></span>
                {torrentModalStream.size && <span>Size: <strong className="text-white">{torrentModalStream.size}</strong></span>}
                {torrentModalStream.seeders && <span>Seeds: <strong className="text-emerald-400">{torrentModalStream.seeders}</strong></span>}
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Standard web browsers cannot stream peer-to-peer BitTorrent directly without Debrid. Choose how you'd like to play:
            </p>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => {
                  if (torrentModalStream.magnet) {
                    window.location.href = `wvc-x-callback://open?url=${encodeURIComponent(torrentModalStream.magnet)}&secure_uri=true`;
                  }
                  setTorrentModalStream(null);
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-500/20"
              >
                <span>📺 Cast to TV via Web Video Caster (WVC)</span>
              </button>

              <button
                onClick={() => {
                  if (torrentModalStream.magnet) {
                    window.location.href = `vlc://${torrentModalStream.magnet}`;
                  }
                  setTorrentModalStream(null);
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-700"
              >
                <span>📙 Open in VLC Media Player</span>
              </button>

              <button
                onClick={() => {
                  setTorrentModalStream(null);
                  setShowStremioModal(true);
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border border-purple-500/40"
              >
                <span>⚡ Connect Free TorBox / Real-Debrid for In-Browser 4K</span>
              </button>

              <button
                onClick={() => {
                  setTorrentModalStream(null);
                  setSelectedServerIndex(0);
                  setCinemaMode('iframe');
                  setReloadKey(Date.now());
                }}
                className="w-full py-2 text-center text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Switch to Free Web Mirror (Videasy / VidLink)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

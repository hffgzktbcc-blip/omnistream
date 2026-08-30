import React, { useState, useEffect, useRef } from 'react';
import { Anime } from '../../types/anime';
import { animeStorage } from '../../services/animeStorage';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Maximize,
  RotateCcw,
  Loader2,
  Tv,
  Airplay,
  Volume2,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { CastModal } from '../Common/CastModal';

interface AnimePlayerModalProps {
  anime: Anime | null;
  episodeNumber: number;
  onClose: () => void;
  onChangeEpisode?: (episode: number) => void;
}

export const AnimePlayerModal: React.FC<AnimePlayerModalProps> = ({
  anime,
  episodeNumber,
  onClose,
  onChangeEpisode
}) => {
  const [serverIndex, setServerIndex] = useState<number>(0);
  const [audioType, setAudioType] = useState<'sub' | 'dub'>(() => animeStorage.getAudioPreference());
  const [theaterMode, setTheaterMode] = useState<boolean>(false);
  const [loadingServer, setLoadingServer] = useState<boolean>(true);
  const [reloadKey, setReloadKey] = useState<number>(Date.now());
  const [showCastModal, setShowCastModal] = useState<boolean>(false);
  const [showEpisodeDrawer, setShowEpisodeDrawer] = useState<boolean>(false);
  const [resolvedTmdbId, setResolvedTmdbId] = useState<number | undefined>(anime?.tmdbId);
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

  // Dynamic Accurate TMDB TV Anime Resolver
  useEffect(() => {
    if (!anime) return;
    if (anime.tmdbId) {
      setResolvedTmdbId(anime.tmdbId);
      return;
    }

    const searchTitle = anime.title.english || anime.title.romaji || '';
    fetch(`/api/anime/resolve-tmdb?title=${encodeURIComponent(searchTitle)}&id=${anime.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.success && data?.tmdbId) {
          setResolvedTmdbId(data.tmdbId);
        }
      })
      .catch(() => {});
  }, [anime]);

  // Anti-Popup Armor
  useEffect(() => {
    const originalWindowOpen = window.open;
    window.open = function (...args: any[]) {
      console.log('Blocked anime popup:', args[0]);
      return null;
    };

    return () => {
      window.open = originalWindowOpen;
    };
  }, []);

  // Save progress on episode change
  useEffect(() => {
    if (anime) {
      animeStorage.updateProgress(anime, episodeNumber, anime.episodes || 12, audioType, 50);
    }
  }, [anime, episodeNumber, audioType]);

  if (!anime) return null;

  const totalEpisodes = anime.episodes || 24;
  const title = anime.title.english || anime.title.romaji || 'Anime';
  const isMovie = anime.format === 'MOVIE' || totalEpisodes === 1;
  const effectiveId = resolvedTmdbId || anime.tmdbId || anime.id;

  // Streaming Mirrors
  const tvServers = [
    {
      name: `Server 1: VidLink Pro 4K (${audioType.toUpperCase()})`,
      url: `https://vidlink.pro/tv/${effectiveId}/1/${episodeNumber}?primaryColor=a855f7&secondaryColor=6366f1&iconColor=ffffff&title=true&poster=true&autoplay=true`
    },
    {
      name: 'Server 2: VidSrc XYZ',
      url: `https://vidsrc.xyz/embed/tv/${effectiveId}/1-${episodeNumber}`
    },
    {
      name: 'Server 3: VidSrc CC',
      url: `https://vidsrc.cc/v2/embed/tv/${effectiveId}/1/${episodeNumber}`
    },
    {
      name: 'Server 4: AutoEmbed Direct',
      url: `https://player.autoembed.cc/embed/tv/${effectiveId}/1/${episodeNumber}`
    },
    {
      name: 'Server 5: SmashyStream',
      url: `https://player.smashystream.com/tv/${effectiveId}?s=1&e=${episodeNumber}`
    },
    {
      name: 'Server 6: MultiEmbed Universal',
      url: `https://multiembed.mov/?video_id=${effectiveId}&tmdb=1&s=1&e=${episodeNumber}`
    },
    {
      name: 'Server 7: 2Embed VIP',
      url: `https://www.2embed.cc/embedtv/${effectiveId}&s=1&e=${episodeNumber}`
    }
  ];

  const movieServers = [
    {
      name: `Server 1: VidLink Pro 4K (${audioType.toUpperCase()})`,
      url: `https://vidlink.pro/movie/${effectiveId}?primaryColor=a855f7&secondaryColor=6366f1&iconColor=ffffff&title=true&poster=true&autoplay=true`
    },
    {
      name: 'Server 2: VidSrc XYZ',
      url: `https://vidsrc.xyz/embed/movie/${effectiveId}`
    },
    {
      name: 'Server 3: VidSrc CC',
      url: `https://vidsrc.cc/v2/embed/movie/${effectiveId}`
    },
    {
      name: 'Server 4: AutoEmbed Direct',
      url: `https://player.autoembed.cc/embed/movie/${effectiveId}`
    },
    {
      name: 'Server 5: SmashyStream',
      url: `https://player.smashystream.com/movie/${effectiveId}`
    },
    {
      name: 'Server 6: MultiEmbed Universal',
      url: `https://multiembed.mov/?video_id=${effectiveId}&tmdb=1`
    },
    {
      name: 'Server 7: 2Embed VIP',
      url: `https://www.2embed.cc/embed/${effectiveId}`
    }
  ];

  const servers = isMovie ? movieServers : tvServers;
  const currentStreamUrl = servers[serverIndex]?.url || servers[0].url;

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
  }, [serverIndex, reloadKey, episodeNumber, audioType]);

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

  const handlePopout = () => {
    const titleText = `${title}${!isMovie ? ` Ep ${episodeNumber}` : ''}`;
    const popoutHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="referrer" content="no-referrer">
        <title>${titleText} • OmniStream Anime</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background: #000; color: #fff; height: 100vh; display: flex; flex-direction: column; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; overflow: hidden; }
          .header { background: #1e1b4b; padding: 10px 16px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #312e81; font-size: 13px; font-weight: bold; }
          .header-left { display: flex; align-items: center; gap: 8px; }
          .badge { background: #8b5cf6; font-size: 11px; padding: 2px 8px; border-radius: 6px; }
          .btn { background: #4338ca; color: #fff; border: 1px solid #6366f1; padding: 5px 12px; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: bold; }
          .btn:hover { background: #4f46e5; }
          iframe { flex: 1; width: 100%; height: 100%; border: none; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            <span>▶ ${titleText} (${audioType.toUpperCase()})</span>
            <span class="badge">${servers[serverIndex]?.name || 'Anime Stream'}</span>
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
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-600 text-white flex-shrink-0">
                    Ep {episodeNumber}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <Tv className="w-3.5 h-3.5 text-purple-400" />
                <span>Simulcast Stream • {audioType.toUpperCase()}</span>
              </p>
            </div>
          </div>

          {/* Server & Audio Controls */}
          <div className="flex items-center gap-2">
            {/* Sub / Dub Selector */}
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

            <select
              value={serverIndex}
              onChange={(e) => handleServerChange(parseInt(e.target.value))}
              className="bg-slate-800 text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-700 focus:outline-none focus:border-purple-500 cursor-pointer"
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/40 text-xs font-bold transition-all"
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
            <div className="absolute inset-0 z-30 bg-black/90 flex flex-col items-center justify-center gap-2 text-purple-400">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="text-xs font-semibold">
                Connecting to {servers[serverIndex]?.name.split(':')[1] || 'Anime Server'}...
              </span>
              <span className="text-[10px] text-slate-500">Auto-failover active</span>
            </div>
          )}

          {exhaustedServers ? (
            <div className="absolute inset-0 z-40 bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center mb-3">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-white font-bold text-sm sm:text-base mb-1">No Playable Stream Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mb-4">
                Tested all {servers.length} anime mirrors. Open in a dedicated popout window or retry another server.
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
              key={`anime_player_${serverIndex}_${episodeNumber}_${effectiveId}_${reloadKey}_${audioType}`}
              src={currentStreamUrl}
              title={`${title} Anime Player`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; web-share"
              allowFullScreen
              referrerPolicy="no-referrer"
              onLoad={handleIframeLoaded}
              className="w-full h-full border-0"
            />
          )}
        </div>

        {/* Bottom Episode Navigation */}
        {!isMovie && onChangeEpisode && (
          <div className="p-4 bg-slate-900/90 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  if (episodeNumber > 1) {
                    onChangeEpisode(episodeNumber - 1);
                    handleForceRefresh();
                  }
                }}
                disabled={episodeNumber <= 1}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-semibold transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous Ep</span>
              </button>

              <span className="text-xs font-bold text-slate-300">
                Episode <strong className="text-purple-400">{episodeNumber}</strong> of {totalEpisodes}
              </span>

              <button
                onClick={() => {
                  if (episodeNumber < totalEpisodes) {
                    onChangeEpisode(episodeNumber + 1);
                    handleForceRefresh();
                  }
                }}
                disabled={episodeNumber >= totalEpisodes}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-bold shadow-md shadow-purple-600/30 transition-all"
              >
                <span>Next Ep</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Episode Jump Strip */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {Array.from({ length: totalEpisodes }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  onClick={() => {
                    onChangeEpisode(num);
                    handleForceRefresh();
                  }}
                  className={`w-9 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${
                    num === episodeNumber
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 scale-105'
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

      {/* Apple TV Casting Modal */}
      <CastModal
        isOpen={showCastModal}
        onClose={() => setShowCastModal(false)}
        mediaTitle={title}
        mediaType="anime"
      />
    </div>
  );
};

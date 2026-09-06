import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import {
  Play, Pause, SkipBack, SkipForward, Maximize, Minimize,
  Volume2, VolumeX, Subtitles, Music, ChevronUp, ChevronDown,
  Loader2, AlertTriangle, RefreshCw, PictureInPicture2, Airplay,
  Settings, X, Check
} from 'lucide-react';
import type { DirectStreamSubtitle, DirectStreamAudioTrack } from '../../services/streamingService';
import { watchHistoryService } from '../../services/watchHistoryService';

// ─── Types ───────────────────────────────────────────────────────
interface CinemaPlayerProps {
  streamUrl: string;
  qualities?: { label: string; url: string }[];
  subtitles?: DirectStreamSubtitle[];
  audioTracks?: DirectStreamAudioTrack[];
  title: string;
  mediaType: 'movie' | 'tv' | 'anime';
  mediaId: string | number;
  season?: number;
  episode?: number;
  resumeTime?: number;
  onError?: () => void;        // fallback trigger
  onClose?: () => void;
}

type AspectMode = '16:9' | 'fill' | 'original';

// ─── Helpers ─────────────────────────────────────────────────────
function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return '0:00';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

function isAndroidTV(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('android') && (ua.includes('tv') || ua.includes('large') || ua.includes('aftn') || ua.includes('aftm'));
}

// ─── Component ───────────────────────────────────────────────────
export const CinemaPlayer: React.FC<CinemaPlayerProps> = ({
  streamUrl,
  qualities = [],
  subtitles = [],
  audioTracks = [],
  title,
  mediaType,
  mediaId,
  season,
  episode,
  resumeTime,
  onError,
  onClose,
}) => {
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hudTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressSaveRef = useRef<NodeJS.Timeout | null>(null);
  const seekAnimTimerRef = useRef<NodeJS.Timeout | null>(null);
  const doubleTapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTapRef = useRef<{ time: number; x: number }>({ time: 0, x: 0 });

  // State
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHud, setShowHud] = useState(true);
  const [showDrawer, setShowDrawer] = useState<'subtitles' | 'audio' | 'quality' | null>(null);
  const [selectedSubIdx, setSelectedSubIdx] = useState(-1); // -1 = off
  const [selectedQualityIdx, setSelectedQualityIdx] = useState(-1); // -1 = auto
  const [seekIndicator, setSeekIndicator] = useState<{ direction: 'fwd' | 'bwd'; visible: boolean }>({ direction: 'fwd', visible: false });
  const [aspectMode, setAspectMode] = useState<AspectMode>('16:9');
  const [brightnessOverlay, setBrightnessOverlay] = useState(1);
  const [showBrightnessIndicator, setShowBrightnessIndicator] = useState(false);
  const [showVolumeIndicator, setShowVolumeIndicator] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ─── HLS Setup ───────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    setLoading(true);
    setError(null);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 120,
        startLevel: -1, // auto
      });
      hlsRef.current = hls;

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
        if (resumeTime && resumeTime > 5) {
          video.currentTime = resumeTime;
        }
        video.play().catch(() => {
          video.muted = true;
          setMuted(true);
          video.play().catch(() => {});
        });
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn('[CinemaPlayer] Network error, recovering...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('[CinemaPlayer] Media error, recovering...');
              hls.recoverMediaError();
              break;
            default:
              console.error('[CinemaPlayer] Fatal error:', data);
              setError('Stream failed to load. Switching to mirror...');
              setLoading(false);
              hls.destroy();
              // Trigger fallback to iframe after short delay
              setTimeout(() => onError?.(), 2000);
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Safari HLS
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', () => {
        setLoading(false);
        if (resumeTime && resumeTime > 5) {
          video.currentTime = resumeTime;
        }
        video.play().catch(() => {});
      });
      video.addEventListener('error', () => {
        setError('Native player failed to load stream.');
        setLoading(false);
        setTimeout(() => onError?.(), 2000);
      });
    } else {
      setError('HLS streaming is not supported in this browser.');
      setLoading(false);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamUrl, retryCount]);

  // ─── Subtitle Track Management ──────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Remove existing tracks
    while (video.firstChild) {
      if ((video.firstChild as HTMLElement).tagName === 'TRACK') {
        video.removeChild(video.firstChild);
      } else break;
    }

    subtitles.forEach((sub, idx) => {
      const track = document.createElement('track');
      track.kind = 'subtitles';
      track.label = sub.label;
      track.srclang = sub.language;
      track.src = sub.url;
      if (idx === selectedSubIdx) {
        track.default = true;
      }
      video.appendChild(track);
    });

    // Enable/disable tracks
    if (video.textTracks) {
      for (let i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].mode = i === selectedSubIdx ? 'showing' : 'hidden';
      }
    }
  }, [subtitles, selectedSubIdx]);

  // ─── Video Event Listeners ──────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onDurationChange = () => setDuration(video.duration || 0);
    const onVolumeChange = () => {
      setVolume(video.volume);
      setMuted(video.muted);
    };
    const onWaiting = () => setLoading(true);
    const onPlaying = () => setLoading(false);

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('durationchange', onDurationChange);
    video.addEventListener('volumechange', onVolumeChange);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlaying);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('durationchange', onDurationChange);
      video.removeEventListener('volumechange', onVolumeChange);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('playing', onPlaying);
    };
  }, []);

  // ─── Progress Save (every 5s) ───────────────────────────────
  useEffect(() => {
    progressSaveRef.current = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.paused || !video.duration) return;

      const progressPercent = Math.round((video.currentTime / video.duration) * 100);
      const historyId = mediaType === 'movie'
        ? `movie_${mediaId}`
        : mediaType === 'tv'
        ? `tv_${mediaId}`
        : `anime_${mediaId}`;

      const existing = watchHistoryService.getItem(historyId);
      if (existing) {
        // Update with exact second
        const items = JSON.parse(localStorage.getItem('omnistream_unified_history_v1') || '[]');
        const idx = items.findIndex((i: any) => i.id === historyId);
        if (idx >= 0) {
          items[idx].currentTime = Math.floor(video.currentTime);
          items[idx].duration = Math.floor(video.duration);
          items[idx].progressPercent = progressPercent;
          items[idx].lastWatchedAt = Date.now();
          localStorage.setItem('omnistream_unified_history_v1', JSON.stringify(items));
        }
      }
    }, 5000);

    return () => {
      if (progressSaveRef.current) clearInterval(progressSaveRef.current);
    };
  }, [mediaId, mediaType]);

  // ─── HUD Auto-hide ─────────────────────────────────────────
  const showHudTemporarily = useCallback(() => {
    setShowHud(true);
    if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
    hudTimerRef.current = setTimeout(() => {
      if (!showDrawer) setShowHud(false);
    }, 4000);
  }, [showDrawer]);

  // ─── Seek ───────────────────────────────────────────────────
  const seek = useCallback((delta: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + delta));
    setSeekIndicator({ direction: delta > 0 ? 'fwd' : 'bwd', visible: true });
    if (seekAnimTimerRef.current) clearTimeout(seekAnimTimerRef.current);
    seekAnimTimerRef.current = setTimeout(() => {
      setSeekIndicator(prev => ({ ...prev, visible: false }));
    }, 600);
    showHudTemporarily();
  }, [showHudTemporarily]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
    showHudTemporarily();
  }, [showHudTemporarily]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
  }, []);

  const toggleFullscreen = useCallback(() => {
    const elem = containerRef.current;
    if (!elem) return;
    const doc = document as any;
    const isFull = doc.fullscreenElement || doc.webkitFullscreenElement;
    if (!isFull) {
      if (elem.requestFullscreen) elem.requestFullscreen().catch(() => {});
      else if ((elem as any).webkitRequestFullscreen) (elem as any).webkitRequestFullscreen();
    } else {
      if (doc.exitFullscreen) doc.exitFullscreen().catch(() => {});
      else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
    }
  }, []);

  // Track fullscreen changes
  useEffect(() => {
    const handler = () => {
      const doc = document as any;
      setIsFullscreen(!!(doc.fullscreenElement || doc.webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', handler);
    document.addEventListener('webkitfullscreenchange', handler);
    return () => {
      document.removeEventListener('fullscreenchange', handler);
      document.removeEventListener('webkitfullscreenchange', handler);
    };
  }, []);

  // ─── PiP & AirPlay ─────────────────────────────────────────
  const togglePiP = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if ((document as any).pictureInPictureElement) {
        await (document as any).exitPictureInPicture();
      } else if ((video as any).requestPictureInPicture) {
        await (video as any).requestPictureInPicture();
      }
    } catch (e) {
      console.warn('PiP not available:', e);
    }
  }, []);

  const showAirPlay = useCallback(() => {
    const video = videoRef.current as any;
    if (video?.webkitShowPlaybackTargetPicker) {
      video.webkitShowPlaybackTargetPicker();
    }
  }, []);

  // ─── Quality Switching ──────────────────────────────────────
  const switchQuality = useCallback((idx: number) => {
    if (!hlsRef.current) return;
    if (idx === -1) {
      hlsRef.current.currentLevel = -1; // auto
    } else if (qualities[idx]) {
      // Load new quality URL
      const video = videoRef.current;
      const time = video?.currentTime || 0;
      hlsRef.current.loadSource(qualities[idx].url);
      hlsRef.current.on(Hls.Events.MANIFEST_PARSED, () => {
        if (video) {
          video.currentTime = time;
          video.play().catch(() => {});
        }
      });
    }
    setSelectedQualityIdx(idx);
    setShowDrawer(null);
  }, [qualities]);

  // ─── D-Pad / Keyboard Navigation ───────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Don't intercept if focus is on an input
      const tag = (document.activeElement?.tagName || '').toLowerCase();
      if (['input', 'textarea', 'select'].includes(tag)) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          seek(-10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          seek(10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (!showDrawer) {
            setShowDrawer('subtitles');
            showHudTemporarily();
          } else if (showDrawer === 'subtitles') {
            setShowDrawer('audio');
          } else if (showDrawer === 'audio') {
            setShowDrawer('quality');
          } else {
            setShowDrawer(null);
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (showDrawer === 'quality') {
            setShowDrawer('audio');
          } else if (showDrawer === 'audio') {
            setShowDrawer('subtitles');
          } else if (showDrawer === 'subtitles') {
            setShowDrawer(null);
          } else {
            // Show volume/brightness on mobile; just show HUD on TV
            showHudTemporarily();
          }
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (showDrawer) {
            // Enter confirms current drawer selection — close it
            setShowDrawer(null);
          } else {
            togglePlay();
          }
          break;
        case 'Escape':
        case 'GoBack':
          e.preventDefault();
          if (showDrawer) {
            setShowDrawer(null);
          } else {
            onClose?.();
          }
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          toggleMute();
          break;
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [seek, togglePlay, toggleFullscreen, toggleMute, showDrawer, showHudTemporarily, onClose]);

  // ─── Touch Gestures (Mobile) ───────────────────────────────
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;

    // Only handle vertical swipes
    if (Math.abs(dy) > 30 && Math.abs(dy) > Math.abs(dx) * 1.5) {
      const container = containerRef.current;
      if (!container) return;
      const containerWidth = container.clientWidth;
      const isLeftHalf = touchStartRef.current.x < containerWidth / 2;

      if (isLeftHalf) {
        // Brightness (left half)
        const newBrightness = Math.max(0.2, Math.min(1, brightnessOverlay + (dy < 0 ? 0.02 : -0.02)));
        setBrightnessOverlay(newBrightness);
        setShowBrightnessIndicator(true);
      } else {
        // Volume (right half)
        const video = videoRef.current;
        if (video) {
          const newVol = Math.max(0, Math.min(1, video.volume + (dy < 0 ? 0.02 : -0.02)));
          video.volume = newVol;
          video.muted = false;
          setShowVolumeIndicator(true);
        }
      }
    }
  }, [brightnessOverlay]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const now = Date.now();
    const dt = now - touchStartRef.current.time;

    // Hide indicators
    setTimeout(() => {
      setShowBrightnessIndicator(false);
      setShowVolumeIndicator(false);
    }, 800);

    // Double-tap detection for ±10s seek
    if (dt < 300) {
      const touch = e.changedTouches[0];
      if (!touch) { touchStartRef.current = null; return; }

      const tapGap = now - lastTapRef.current.time;
      if (tapGap < 350) {
        const container = containerRef.current;
        if (container) {
          const isLeftHalf = touch.clientX < container.clientWidth / 2;
          if (isLeftHalf) {
            seek(-10);
          } else {
            seek(10);
          }
        }
        lastTapRef.current = { time: 0, x: 0 };
      } else {
        lastTapRef.current = { time: now, x: touch.clientX };
        // Single tap → toggle HUD after short delay
        if (doubleTapTimerRef.current) clearTimeout(doubleTapTimerRef.current);
        doubleTapTimerRef.current = setTimeout(() => {
          showHudTemporarily();
        }, 360);
      }
    }

    touchStartRef.current = null;
  }, [seek, showHudTemporarily]);

  // ─── Aspect Ratio Toggle ──────────────────────────────────
  const cycleAspect = useCallback(() => {
    setAspectMode(prev => {
      if (prev === '16:9') return 'fill';
      if (prev === 'fill') return 'original';
      return '16:9';
    });
  }, []);

  const aspectClass = aspectMode === 'fill' ? 'object-cover' : aspectMode === 'original' ? 'object-scale-down' : 'object-contain';

  // ─── Progress Bar Click ───────────────────────────────────
  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    video.currentTime = ratio * duration;
  }, [duration]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // ─── Render ────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black select-none overflow-hidden"
      style={{ filter: `brightness(${brightnessOverlay})` }}
      onMouseMove={showHudTemporarily}
      onClick={() => !isTouchDevice() && showHudTemporarily()}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* ─── Video Element ──────────────────────────────── */}
      <video
        ref={videoRef}
        className={`w-full h-full ${aspectClass}`}
        playsInline
        autoPlay
        crossOrigin="anonymous"
        x-webkit-airplay="allow"
      />

      {/* ─── Loading Spinner ────────────────────────────── */}
      {loading && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-black/70 pointer-events-none">
          <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
          <p className="text-xs font-bold text-white/80">Loading Cinema Stream...</p>
        </div>
      )}

      {/* ─── Error State ────────────────────────────────── */}
      {error && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-black/90 text-center p-6">
          <AlertTriangle className="w-10 h-10 text-amber-400" />
          <p className="text-sm font-bold text-white">{error}</p>
          <button
            onClick={() => { setError(null); setRetryCount(c => c + 1); }}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      )}

      {/* ─── Seek Indicator (±10s) ──────────────────────── */}
      {seekIndicator.visible && (
        <div className={`absolute top-1/2 -translate-y-1/2 z-30 pointer-events-none animate-ping ${
          seekIndicator.direction === 'fwd' ? 'right-[20%]' : 'left-[20%]'
        }`}>
          <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
            {seekIndicator.direction === 'fwd' ? (
              <SkipForward className="w-8 h-8 text-white" />
            ) : (
              <SkipBack className="w-8 h-8 text-white" />
            )}
          </div>
          <p className="text-center text-white text-xs font-bold mt-1">
            {seekIndicator.direction === 'fwd' ? '+10s' : '-10s'}
          </p>
        </div>
      )}

      {/* ─── Brightness Indicator (left swipe) ──────────── */}
      {showBrightnessIndicator && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-30 pointer-events-none flex flex-col items-center gap-1">
          <div className="bg-black/60 backdrop-blur-sm rounded-xl px-3 py-2 text-white text-center">
            <p className="text-[10px] font-bold opacity-70">BRIGHTNESS</p>
            <p className="text-lg font-black">{Math.round(brightnessOverlay * 100)}%</p>
          </div>
        </div>
      )}

      {/* ─── Volume Indicator (right swipe) ─────────────── */}
      {showVolumeIndicator && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-30 pointer-events-none flex flex-col items-center gap-1">
          <div className="bg-black/60 backdrop-blur-sm rounded-xl px-3 py-2 text-white text-center">
            <p className="text-[10px] font-bold opacity-70">VOLUME</p>
            <p className="text-lg font-black">{Math.round(volume * 100)}%</p>
          </div>
        </div>
      )}

      {/* ─── HUD Overlay (Controls) ─────────────────────── */}
      <div
        className={`absolute inset-0 z-20 transition-opacity duration-300 ${
          showHud ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onClose && (
              <button onClick={onClose} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            )}
            <div>
              <h3 className="text-sm font-bold text-white line-clamp-1">{title}</h3>
              {mediaType !== 'movie' && season != null && episode != null && (
                <p className="text-[10px] text-white/60 font-medium">S{season} E{episode}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* PiP */}
            {'pictureInPictureEnabled' in document && (
              <button onClick={togglePiP} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors" title="Picture-in-Picture">
                <PictureInPicture2 className="w-4 h-4" />
              </button>
            )}
            {/* AirPlay */}
            {(videoRef.current as any)?.webkitShowPlaybackTargetPicker && (
              <button onClick={showAirPlay} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors" title="AirPlay">
                <Airplay className="w-4 h-4" />
              </button>
            )}
            {/* Aspect */}
            <button onClick={cycleAspect} className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold transition-colors">
              {aspectMode === '16:9' ? '16:9' : aspectMode === 'fill' ? 'FILL' : 'FIT'}
            </button>
          </div>
        </div>

        {/* Center Play/Pause */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {!loading && !error && (
            <button
              onClick={(e) => { e.stopPropagation(); togglePlay(); }}
              className="pointer-events-auto p-4 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 text-white transition-all hover:scale-110"
            >
              {playing ? <Pause className="w-10 h-10" /> : <Play className="w-10 h-10" />}
            </button>
          )}
        </div>

        {/* Bottom Bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-8">
          {/* Progress Bar */}
          <div
            className="w-full h-1.5 bg-white/20 rounded-full cursor-pointer mb-3 group hover:h-2.5 transition-all"
            onClick={handleProgressClick}
          >
            <div
              className="h-full bg-purple-500 rounded-full relative transition-all"
              style={{ width: `${progressPercent}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          {/* Controls Row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button onClick={togglePlay} className="p-1.5 text-white hover:text-purple-300 transition-colors">
                {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
              <button onClick={() => seek(-10)} className="p-1.5 text-white hover:text-purple-300 transition-colors" title="Rewind 10s">
                <SkipBack className="w-4 h-4" />
              </button>
              <button onClick={() => seek(10)} className="p-1.5 text-white hover:text-purple-300 transition-colors" title="Forward 10s">
                <SkipForward className="w-4 h-4" />
              </button>
              <button onClick={toggleMute} className="p-1.5 text-white hover:text-purple-300 transition-colors">
                {muted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <span className="text-[11px] text-white/70 font-mono tabular-nums">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {subtitles.length > 0 && (
                <button
                  onClick={() => setShowDrawer(showDrawer === 'subtitles' ? null : 'subtitles')}
                  className={`p-1.5 rounded-lg transition-colors ${
                    selectedSubIdx >= 0 ? 'text-purple-400 bg-purple-500/20' : 'text-white/70 hover:text-white'
                  }`}
                  title="Subtitles"
                >
                  <Subtitles className="w-4 h-4" />
                </button>
              )}
              {audioTracks.length > 1 && (
                <button
                  onClick={() => setShowDrawer(showDrawer === 'audio' ? null : 'audio')}
                  className="p-1.5 text-white/70 hover:text-white rounded-lg transition-colors"
                  title="Audio Tracks"
                >
                  <Music className="w-4 h-4" />
                </button>
              )}
              {qualities.length > 1 && (
                <button
                  onClick={() => setShowDrawer(showDrawer === 'quality' ? null : 'quality')}
                  className="p-1.5 text-white/70 hover:text-white rounded-lg transition-colors"
                  title="Quality"
                >
                  <Settings className="w-4 h-4" />
                </button>
              )}
              <button onClick={toggleFullscreen} className="p-1.5 text-white hover:text-purple-300 transition-colors">
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Drawer Panels (Subtitles / Audio / Quality) ── */}
      {showDrawer && (
        <div className="absolute right-0 top-0 bottom-0 w-72 z-40 bg-black/95 backdrop-blur-xl border-l border-white/10 flex flex-col animate-in slide-in-from-right duration-200">
          <div className="p-3 border-b border-white/10 flex items-center justify-between">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              {showDrawer === 'subtitles' ? '🔤 Subtitles' : showDrawer === 'audio' ? '🔊 Audio Track' : '📺 Quality'}
            </h4>
            <button onClick={() => setShowDrawer(null)} className="p-1 text-white/50 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {showDrawer === 'subtitles' && (
              <>
                <button
                  onClick={() => { setSelectedSubIdx(-1); setShowDrawer(null); }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                    selectedSubIdx === -1 ? 'bg-purple-600 text-white' : 'text-white/70 hover:bg-white/10'
                  }`}
                >
                  <span>Off</span>
                  {selectedSubIdx === -1 && <Check className="w-3.5 h-3.5" />}
                </button>
                {subtitles.map((sub, idx) => (
                  <button
                    key={idx}
                    onClick={() => { setSelectedSubIdx(idx); setShowDrawer(null); }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                      selectedSubIdx === idx ? 'bg-purple-600 text-white' : 'text-white/70 hover:bg-white/10'
                    }`}
                  >
                    <span>{sub.label} ({sub.language})</span>
                    {selectedSubIdx === idx && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </>
            )}

            {showDrawer === 'audio' && audioTracks.map((track, idx) => (
              <button
                key={idx}
                onClick={() => setShowDrawer(null)}
                className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold text-white/70 hover:bg-white/10 flex items-center justify-between transition-colors"
              >
                <span>{track.label} ({track.language})</span>
              </button>
            ))}

            {showDrawer === 'quality' && (
              <>
                <button
                  onClick={() => switchQuality(-1)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                    selectedQualityIdx === -1 ? 'bg-purple-600 text-white' : 'text-white/70 hover:bg-white/10'
                  }`}
                >
                  <span>Auto</span>
                  {selectedQualityIdx === -1 && <Check className="w-3.5 h-3.5" />}
                </button>
                {qualities.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => switchQuality(idx)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                      selectedQualityIdx === idx ? 'bg-purple-600 text-white' : 'text-white/70 hover:bg-white/10'
                    }`}
                  >
                    <span>{q.label}</span>
                    {selectedQualityIdx === idx && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </>
            )}
          </div>

          {/* D-Pad hints */}
          {isAndroidTV() && (
            <div className="p-3 border-t border-white/10 text-[10px] text-white/40 font-mono">
              <p>▲▼ Switch drawer • ◄► Seek ±10s</p>
              <p>OK Select • BACK Close</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

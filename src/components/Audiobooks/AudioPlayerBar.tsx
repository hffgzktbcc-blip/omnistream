import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Moon,
  Bookmark,
  ChevronUp,
  ChevronDown,
  X,
  Radio,
  Users,
  Download,
  Check,
  Maximize2,
  Minimize2,
  Headphones,
  Loader2
} from 'lucide-react';
import { Audiobook, AudioTrack } from '../../types/audiobook';
import { audiobookStorage } from '../../services/audiobookStorage';
import { watchHistoryService } from '../../services/watchHistoryService';
import {
  isAudioDownloaded,
  downloadAudioForOffline,
  removeOfflineAudio,
  getOfflineAudioUrl
} from '../../services/offlineAudioStorage';

interface AudioPlayerBarProps {
  book: Audiobook;
  tracks: AudioTrack[];
  currentTrackIndex: number;
  initialTime?: number;
  onClose: () => void;
  onOpenTimer: () => void;
  onOpenBookmarks: () => void;
  onTrackChange: (index: number) => void;
  sleepMinutes: number | null;
  sleepSecondsLeft: number | null;
}

export const AudioPlayerBar: React.FC<AudioPlayerBarProps> = ({
  book,
  tracks,
  currentTrackIndex,
  initialTime = 0,
  onClose,
  onOpenTimer,
  onOpenBookmarks,
  onTrackChange,
  sleepMinutes,
  sleepSecondsLeft
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wakeLockRef = useRef<any>(null);
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [duration, setDuration] = useState(0);
  const [bufferPct, setBufferPct] = useState(0);
  const [volume, setVolume] = useState<number>(() => {
    const saved = localStorage.getItem('omnistream_audio_volume');
    return saved !== null ? parseFloat(saved) : 1;
  });
  const [isMuted, setIsMuted] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(() => {
    const saved = localStorage.getItem(`omnistream:bookRate:${book.id}`);
    if (saved) {
      const idx = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0].indexOf(parseFloat(saved));
      return idx >= 0 ? idx : 1;
    }
    return 1;
  });

  const [showDrawer, setShowDrawer] = useState(false);
  const [showCoverModal, setShowCoverModal] = useState(false);
  const [peers, setPeers] = useState(0);
  const [downloadSpeed, setDownloadSpeed] = useState('');
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);

  const speeds = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
  const currentTrack = tracks[currentTrackIndex];
  const trackId = `${book.id}_track_${currentTrackIndex}`;

  // Check offline download status
  useEffect(() => {
    setIsDownloaded(isAudioDownloaded(trackId));
  }, [trackId]);

  // Setup audio stream source with offline cache check
  useEffect(() => {
    if (!currentTrack) return;
    const audio = audioRef.current;
    if (!audio) return;

    let isMounted = true;
    setIsBuffering(true);

    const setupStream = async () => {
      // 1. Fast-path: check offline cache
      const offlineBlob = await getOfflineAudioUrl(trackId);
      if (offlineBlob && isMounted) {
        audio.src = offlineBlob;
      } else if (isMounted) {
        audio.src = currentTrack.streamUrl;
      }

      audio.playbackRate = speeds[speedIdx];
      audio.volume = isMuted ? 0 : volume;
      audio.load();

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            if (initialTime > 0) audio.currentTime = initialTime;
            if (isMounted) {
              setIsPlaying(true);
              setIsBuffering(false);
            }
          })
          .catch(() => {
            if (isMounted) setIsBuffering(false);
          });
      }
    };

    setupStream();

    return () => {
      isMounted = false;
    };
  }, [currentTrack, trackId]);

  // Screen Wake Lock API (keeps mobile screen awake while audio plays)
  useEffect(() => {
    if (typeof window === 'undefined' || !('wakeLock' in navigator)) return;
    if (isPlaying) {
      (navigator as any).wakeLock
        ?.request('screen')
        .then((wl: any) => {
          wakeLockRef.current = wl;
        })
        .catch(() => {});
    } else {
      wakeLockRef.current?.release?.().catch(() => {});
      wakeLockRef.current = null;
    }
    return () => {
      wakeLockRef.current?.release?.().catch(() => {});
    };
  }, [isPlaying]);

  // MediaSession API: iOS / Android / macOS Lock Screen & AirPods controls
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    const coverUrl = book.cover
      ? book.cover.startsWith('http')
        ? book.cover
        : `${window.location.origin}${book.cover}`
      : 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=500';

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack?.name || book.title,
      artist: book.author,
      album: book.title,
      artwork: [
        { src: coverUrl, sizes: '96x96', type: 'image/jpeg' },
        { src: coverUrl, sizes: '256x256', type: 'image/jpeg' },
        { src: coverUrl, sizes: '512x512', type: 'image/jpeg' }
      ]
    });

    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

    try {
      navigator.mediaSession.setActionHandler('play', () => {
        audioRef.current?.play().catch(() => {});
        setIsPlaying(true);
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        audioRef.current?.pause();
        setIsPlaying(false);
      });
      navigator.mediaSession.setActionHandler('seekbackward', () => skip(-15));
      navigator.mediaSession.setActionHandler('seekforward', () => skip(30));
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        if (currentTrackIndex > 0) onTrackChange(currentTrackIndex - 1);
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        if (currentTrackIndex < tracks.length - 1) onTrackChange(currentTrackIndex + 1);
      });
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined && audioRef.current) {
          audioRef.current.currentTime = details.seekTime;
          setCurrentTime(details.seekTime);
        }
      });
    } catch {}
  }, [book, currentTrack, isPlaying, currentTrackIndex, tracks.length]);

  // Sync position state to system scrubber
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('mediaSession' in navigator) ||
      !('setPositionState' in navigator.mediaSession) ||
      duration <= 0
    )
      return;

    try {
      navigator.mediaSession.setPositionState({
        duration: Math.max(0, duration),
        playbackRate: isPlaying ? speeds[speedIdx] : 0,
        position: Math.min(duration, Math.max(0, currentTime))
      });
    } catch {}
  }, [currentTime, duration, isPlaying, speedIdx]);

  // Sleep Timer Fade to Silence
  useEffect(() => {
    if (sleepSecondsLeft !== null && sleepSecondsLeft <= 5 && isPlaying) {
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
      let currentVol = volume;
      fadeIntervalRef.current = setInterval(() => {
        currentVol = Math.max(0, currentVol - 0.2);
        if (audioRef.current) audioRef.current.volume = currentVol;
        if (currentVol <= 0) {
          if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
          audioRef.current?.pause();
          setIsPlaying(false);
          if (audioRef.current) audioRef.current.volume = volume;
        }
      }, 800);
    }
    return () => {
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
    };
  }, [sleepSecondsLeft, isPlaying, volume]);

  // Swarm Polling (if torrent-backed)
  useEffect(() => {
    if (!book.infoHash) return;
    let isMounted = true;

    const poll = async () => {
      try {
        const res = await fetch(`/api/audiobooks/torrent/status/${book.infoHash}`);
        if (res.ok) {
          const s = await res.json();
          if (isMounted) {
            setPeers(s.numPeers || 0);
            setDownloadSpeed(s.downloadSpeedFormatted || '0 KB/s');
          }
        }
      } catch (e) {}
    };

    poll();
    const timer = setInterval(poll, 3000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [book.infoHash]);

  // Periodic progress saving
  useEffect(() => {
    const timer = setInterval(() => {
      if (audioRef.current && isPlaying && currentTime > 0) {
        audiobookStorage.saveProgress({
          bookId: book.id,
          title: book.title,
          author: book.author,
          cover: book.cover,
          currentTime,
          duration,
          currentChapterIndex: currentTrackIndex,
          currentPartIndex: currentTrackIndex,
          lastPlayedAt: Date.now(),
          completed: duration > 0 && currentTime >= duration - 10,
          percent: duration > 0 ? Math.round((currentTime / duration) * 100) : 0
        });

        watchHistoryService.saveAudiobook(book, currentTrackIndex, currentTime, duration);
      }
    }, 4000);

    return () => clearInterval(timer);
  }, [isPlaying, currentTime, duration, book, currentTrackIndex]);

  // Global Keyboard Shortcuts (Shelf & AudioBay features)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable);
      if (isInput) return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        skip(-15);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        skip(30);
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        onOpenBookmarks();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
      } else if (e.key === '[') {
        e.preventDefault();
        cycleSpeed(-1);
      } else if (e.key === ']') {
        e.preventDefault();
        cycleSpeed(1);
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        if (currentTrackIndex < tracks.length - 1) onTrackChange(currentTrackIndex + 1);
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        if (currentTrackIndex > 0) onTrackChange(currentTrackIndex - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, currentTrackIndex, tracks.length, volume, isMuted, speedIdx]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch((e) => console.warn(e));
      setIsPlaying(true);
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  const skip = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration || Infinity, audio.currentTime + seconds));
  };

  const cycleSpeed = (delta: number) => {
    let nextIdx = speedIdx + delta;
    if (nextIdx >= speeds.length) nextIdx = 0;
    if (nextIdx < 0) nextIdx = speeds.length - 1;
    setSpeedIdx(nextIdx);
    localStorage.setItem(`omnistream:bookRate:${book.id}`, String(speeds[nextIdx]));
    if (audioRef.current) {
      audioRef.current.playbackRate = speeds[nextIdx];
    }
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (audioRef.current) {
      audioRef.current.volume = next ? 0 : volume;
    }
  };

  const handleVolumeChange = (newVal: number) => {
    setVolume(newVal);
    setIsMuted(false);
    localStorage.setItem('omnistream_audio_volume', String(newVal));
    if (audioRef.current) {
      audioRef.current.volume = newVal;
    }
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentTime(audio.currentTime);

    if (audio.buffered.length > 0 && audio.duration > 0) {
      const end = audio.buffered.end(audio.buffered.length - 1);
      setBufferPct(Math.min(100, (end / audio.duration) * 100));
    }
  };

  const handleToggleOffline = async () => {
    if (isDownloaded) {
      await removeOfflineAudio(trackId);
      setIsDownloaded(false);
      return;
    }

    if (!currentTrack) return;
    setDownloadProgress(0);
    try {
      await downloadAudioForOffline(
        {
          partId: trackId,
          bookId: book.id,
          partTitle: currentTrack.name,
          bookTitle: book.title,
          coverUrl: book.cover,
          audioUrl: currentTrack.streamUrl
        },
        (pct) => setDownloadProgress(pct)
      );
      setIsDownloaded(true);
      setDownloadProgress(null);
    } catch (e) {
      setDownloadProgress(null);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const coverUrl = book.cover
    ? book.cover.startsWith('http')
      ? `/api/audiobooks/proxy-image?url=${encodeURIComponent(book.cover)}`
      : book.cover
    : 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=300';

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => {
          if (audioRef.current) setDuration(audioRef.current.duration);
        }}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onEnded={() => {
          if (currentTrackIndex < tracks.length - 1) {
            onTrackChange(currentTrackIndex + 1);
          } else {
            setIsPlaying(false);
          }
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* ─── SHELF IMMERSIVE COVER & EQUALIZER MODAL ─── */}
      {showCoverModal && (
        <div className="fixed inset-0 z-50 bg-[#090b14]/98 backdrop-blur-2xl flex flex-col items-center justify-between p-6 animate-in fade-in duration-200">
          {/* Top Bar */}
          <div className="w-full max-w-lg flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2">
              <Headphones className="w-4 h-4" />
              Shelf Cinema Audio
            </span>
            <button
              onClick={() => setShowCoverModal(false)}
              className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <Minimize2 className="w-5 h-5" />
            </button>
          </div>

          {/* Central Jacket Glow & Artwork */}
          <div className="relative flex flex-col items-center my-auto">
            {/* Ambient Blurred Backdrop */}
            <div
              className="absolute inset-0 w-72 h-72 md:w-96 md:h-96 rounded-full blur-3xl opacity-40 scale-125"
              style={{
                backgroundImage: `url(${coverUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            />

            {/* Front Jacket Art */}
            <div className="relative z-10 w-48 h-48 sm:w-64 sm:h-64 rounded-3xl overflow-hidden shadow-2xl ring-2 ring-white/20 transition-transform duration-500 hover:scale-105">
              <img src={coverUrl} alt="" className="w-full h-full object-cover" />
            </div>

            {/* Soundwave Equalizer Bars */}
            <div className="flex items-end gap-1.5 h-6 mt-6 z-10">
              {[40, 80, 100, 60, 90, 45, 75].map((h, i) => (
                <span
                  key={i}
                  className={`w-1 rounded-full bg-amber-400 transition-all duration-300 ${
                    isPlaying ? 'animate-pulse' : 'opacity-30'
                  }`}
                  style={{
                    height: isPlaying ? `${h}%` : '20%',
                    animationDelay: `${i * 120}ms`,
                    animationDuration: '800ms'
                  }}
                />
              ))}
            </div>

            {/* Title & Track Details */}
            <h2 className="text-lg sm:text-xl font-black text-white text-center mt-4 max-w-md line-clamp-1">
              {book.title}
            </h2>
            <p className="text-sm font-semibold text-amber-400/90 text-center max-w-md line-clamp-1 mt-1">
              {currentTrack?.name || book.author}
            </p>
          </div>

          {/* Bottom Scrubbing & Playback */}
          <div className="w-full max-w-lg pb-6">
            <div
              className="w-full h-2 bg-slate-800 rounded-full cursor-pointer overflow-hidden mb-2 group relative"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pos = (e.clientX - rect.left) / rect.width;
                if (audioRef.current && duration > 0) {
                  audioRef.current.currentTime = pos * duration;
                }
              }}
            >
              <div
                className="h-full bg-amber-500 rounded-full transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-4">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>

            <div className="flex items-center justify-center gap-6">
              <button
                onClick={() => skip(-15)}
                className="p-3 text-slate-300 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition"
              >
                <RotateCcw className="w-6 h-6" />
              </button>
              <button
                onClick={togglePlayPause}
                className="w-16 h-16 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center shadow-xl shadow-amber-500/30 active:scale-95 transition"
              >
                {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
              </button>
              <button
                onClick={() => skip(30)}
                className="p-3 text-slate-300 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition"
              >
                <RotateCw className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chapters & Tracks Drawer */}
      {showDrawer && (
        <div className="fixed inset-x-0 bottom-[120px] md:bottom-24 z-40 max-w-2xl mx-auto px-4 animate-slide-up">
          <div className="bg-[#0f1422]/98 backdrop-blur-2xl border border-blue-900/60 rounded-3xl p-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-black text-white uppercase tracking-wider">
                Chapters / Tracks ({tracks.length})
              </span>
              <button
                onClick={() => setShowDrawer(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-1 mt-2 pr-1">
              {tracks.map((t, idx) => {
                const isActive = idx === currentTrackIndex;
                return (
                  <button
                    key={t.index}
                    onClick={() => {
                      onTrackChange(idx);
                      setShowDrawer(false);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition cursor-pointer ${
                      isActive
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                    }`}
                  >
                    <span className="truncate pr-2">{t.name}</span>
                    <span className="text-[10px] shrink-0 opacity-80">{t.sizeFormatted}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Persistent Bottom Bar */}
      <footer className="fixed bottom-[52px] md:bottom-0 inset-x-0 z-40 bg-[#090b14]/95 backdrop-blur-2xl border-t border-blue-900/40 px-3 sm:px-6 py-2 shadow-2xl transition-all">
        {/* Scrub Bar */}
        <div
          className="relative w-full h-1.5 group cursor-pointer mb-2 flex items-center"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            if (audioRef.current && duration > 0) {
              audioRef.current.currentTime = pos * duration;
            }
          }}
        >
          {/* Buffer Bar */}
          <div
            className="absolute top-0 bottom-0 left-0 bg-slate-700/60 rounded-full pointer-events-none"
            style={{ width: `${bufferPct}%` }}
          />
          {/* Playback Fill */}
          <div
            className="absolute top-0 bottom-0 left-0 bg-amber-500 rounded-full pointer-events-none"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Jacket artwork & Book details */}
          <div
            className="flex items-center gap-2 sm:gap-3 min-w-0 max-w-[40%] sm:max-w-[32%] cursor-pointer group"
            onClick={() => setShowCoverModal(true)}
            title="Open Shelf Cover Mode"
          >
            <div className="relative shrink-0">
              <img
                src={coverUrl}
                alt=""
                className="w-10 h-10 object-cover rounded-xl bg-slate-900 border border-slate-800 shrink-0 shadow transition group-hover:scale-105"
              />
              {isPlaying && (
                <span className="absolute bottom-0 inset-x-0 h-1 bg-amber-400 rounded-b-xl animate-pulse" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-black text-white truncate leading-tight group-hover:text-amber-400 transition">
                {book.title}
              </h4>
              <p className="text-[11px] text-amber-400/90 truncate font-medium">
                {currentTrack?.name || book.author}
              </p>
            </div>
          </div>

          {/* Center: Playback Controls & Time */}
          <div className="flex flex-col items-center gap-0.5">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => skip(-15)}
                className="p-1.5 text-slate-400 hover:text-white transition cursor-pointer"
                title="Rewind 15s (Arrow Left)"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={togglePlayPause}
                className="w-9 h-9 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/30 transition cursor-pointer active:scale-95"
                title="Play/Pause (Space)"
              >
                {isBuffering ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                )}
              </button>

              <button
                onClick={() => skip(30)}
                className="p-1.5 text-slate-400 hover:text-white transition cursor-pointer"
                title="Forward 30s (Arrow Right)"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
              <span>{formatTime(currentTime)}</span>
              <span>/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right: Offline, Speed, Timer, Bookmarks, Drawer, Volume, Close */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Swarm Peers (if torrent) */}
            {peers > 0 && (
              <div
                className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-xl bg-slate-900 border border-slate-800 text-[10px] text-emerald-400 font-mono"
                title="Live WebTorrent Swarm Status"
              >
                <Users className="w-3 h-3" />
                <span>{peers}</span>
                {downloadSpeed && <span className="text-slate-500">| {downloadSpeed}</span>}
              </div>
            )}

            {/* Offline Cache Download Button */}
            <button
              onClick={handleToggleOffline}
              disabled={downloadProgress !== null}
              className={`p-1.5 rounded-xl border transition cursor-pointer flex items-center gap-1 ${
                isDownloaded
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900 border-transparent'
              }`}
              title={isDownloaded ? 'Cached Offline (Click to remove)' : 'Save for Offline Listening'}
            >
              {downloadProgress !== null ? (
                <span className="text-[10px] font-mono font-bold animate-pulse">
                  {downloadProgress}%
                </span>
              ) : isDownloaded ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Download className="w-4 h-4" />
              )}
            </button>

            {/* Playback Speed */}
            <button
              onClick={() => cycleSpeed(1)}
              className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-[11px] font-mono font-bold transition cursor-pointer"
              title="Speed (Hotkeys: [ and ])"
            >
              {speeds[speedIdx]}x
            </button>

            {/* Sleep Timer */}
            <button
              onClick={onOpenTimer}
              className={`p-1.5 rounded-xl transition cursor-pointer relative ${
                sleepMinutes !== null
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
              title="Sleep Timer"
            >
              <Moon className="w-4 h-4" />
              {sleepSecondsLeft && sleepSecondsLeft > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>

            {/* Bookmarks */}
            <button
              onClick={onOpenBookmarks}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition cursor-pointer"
              title="Bookmarks (Hotkey: B)"
            >
              <Bookmark className="w-4 h-4 text-amber-400" />
            </button>

            {/* Chapters Drawer Toggle */}
            <button
              onClick={() => setShowDrawer(!showDrawer)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition cursor-pointer"
              title="Track List & Chapters"
            >
              {showDrawer ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>

            {/* Volume */}
            <div className="hidden sm:flex items-center gap-1">
              <button
                onClick={toggleMute}
                className="p-1.5 text-slate-400 hover:text-white transition cursor-pointer"
                title="Mute / Unmute (Hotkey: M)"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-16 h-1 accent-amber-500 bg-slate-800 rounded-full cursor-pointer"
              />
            </div>

            {/* Close Player */}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-900 rounded-xl transition cursor-pointer ml-1"
              title="Close Player"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </footer>
    </>
  );
};

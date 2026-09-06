import React, { useState, useEffect, useRef } from 'react';
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
  Gauge
} from 'lucide-react';
import { Audiobook, AudioTrack } from '../../types/audiobook';
import { audiobookStorage } from '../../services/audiobookStorage';
import { watchHistoryService } from '../../services/watchHistoryService';

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [duration, setDuration] = useState(0);
  const [bufferPct, setBufferPct] = useState(0);
  const [volume, setVolume] = useState<number>(() => {
    const saved = localStorage.getItem('omnistream_audio_volume');
    return saved !== null ? parseFloat(saved) : 1;
  });
  const [isMuted, setIsMuted] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(1);
  const [showDrawer, setShowDrawer] = useState(false);
  const [peers, setPeers] = useState(0);
  const [downloadSpeed, setDownloadSpeed] = useState('');

  const speeds = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
  const currentTrack = tracks[currentTrackIndex];

  // Setup audio stream source
  useEffect(() => {
    if (!currentTrack) return;
    const audio = audioRef.current;
    if (!audio) return;

    audio.src = currentTrack.streamUrl;
    audio.playbackRate = speeds[speedIdx];
    audio.volume = isMuted ? 0 : volume;

    audio.load();
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          if (initialTime > 0) audio.currentTime = initialTime;
          setIsPlaying(true);
        })
        .catch((err) => console.warn('Audio play pending buffer:', err));
    }
  }, [currentTrack]);

  // Swarm Polling
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
        activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || (activeEl as HTMLElement).isContentEditable);
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

    // Calculate buffer percentage
    if (audio.buffered.length > 0 && audio.duration > 0) {
      const end = audio.buffered.end(audio.buffered.length - 1);
      setBufferPct(Math.min(100, (end / audio.duration) * 100));
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
        <div className="relative w-full h-1 group cursor-pointer mb-2 flex items-center">
          {/* Buffer Bar */}
          <div
            className="absolute left-0 top-0 h-full bg-slate-700/60 rounded-full transition-all"
            style={{ width: `${bufferPct}%` }}
          />
          {/* Progress Bar */}
          <div
            className="absolute left-0 top-0 h-full bg-amber-500 rounded-full group-hover:bg-amber-400"
            style={{ width: `${progressPct}%` }}
          />
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="1"
            value={currentTime}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setCurrentTime(val);
              if (audioRef.current) audioRef.current.currentTime = val;
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Book Cover & Info */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1 sm:flex-initial sm:w-64">
            <img
              src={coverUrl}
              alt=""
              className="w-10 h-10 object-cover rounded-xl bg-slate-900 border border-slate-800 shrink-0 shadow"
            />
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-black text-white truncate leading-tight">{book.title}</h4>
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
                {isPlaying ? (
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

          {/* Right: Swarm status, Speed, Timer, Bookmarks, Volume, Close */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Swarm Peers / Speed Indicator */}
            {peers > 0 && (
              <div
                className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-xl bg-slate-900 border border-slate-800 text-[10px] text-emerald-400 font-mono"
                title="Live WebTorrent Swarm Status"
              >
                <Users className="w-3 h-3" />
                <span>{peers}</span>
                {downloadSpeed && <span className="text-slate-500">| {downloadSpeed}</span>}
              </div>
            )}

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

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

      {/* ─── CAR MODE / IMMERSIVE PLAYER ─── */}
      {showCoverModal && (
        <div className="fixed inset-0 z-[60] bg-[#0f1013] flex flex-col items-center justify-between p-6 sm:p-10 animate-in fade-in duration-200">
          <div className="w-full flex items-center justify-between">
            <button onClick={() => setShowCoverModal(false)} className="p-3 text-slate-300 hover:text-white bg-[#1e2025] rounded-full transition">
              <ChevronDown className="w-8 h-8" />
            </button>
            <span className="text-sm font-bold text-[#f69931] uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#f69931] animate-pulse" />
              Car Mode
            </span>
            <div className="w-14" /> {/* Spacer */}
          </div>

          <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl">
            <div className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-sm shadow-2xl overflow-hidden mb-12 border border-[#2a2c33]">
              <img src={coverUrl} alt="" className="w-full h-full object-cover" />
            </div>

            <h2 className="text-3xl sm:text-4xl font-black text-white text-center line-clamp-1 mb-2">
              {book.title}
            </h2>
            <p className="text-xl font-semibold text-slate-400 text-center line-clamp-1">
              {currentTrack?.name || book.author}
            </p>
          </div>

          <div className="w-full max-w-2xl pb-10 space-y-12">
            <div className="flex items-center justify-center gap-10 sm:gap-16">
              <button onClick={() => skip(-15)} className="p-6 bg-[#1e2025] hover:bg-[#2a2c33] text-slate-300 hover:text-white rounded-full transition cursor-pointer">
                <RotateCcw className="w-10 h-10" />
              </button>
              
              <button
                onClick={togglePlayPause}
                className="w-32 h-32 rounded-full bg-[#f69931] text-black flex items-center justify-center shadow-[0_0_40px_rgba(246,153,49,0.3)] transition active:scale-95 cursor-pointer"
              >
                {isPlaying ? <Pause className="w-14 h-14 fill-current" /> : <Play className="w-14 h-14 fill-current ml-2" />}
              </button>
              
              <button onClick={() => skip(30)} className="p-6 bg-[#1e2025] hover:bg-[#2a2c33] text-slate-300 hover:text-white rounded-full transition cursor-pointer">
                <RotateCw className="w-10 h-10" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chapters & Tracks Drawer */}
      {showDrawer && (
        <div className="fixed inset-x-0 bottom-32 z-40 max-w-3xl mx-auto px-4 animate-in slide-in-from-bottom-10">
          <div className="bg-[#1e2025] border border-[#2a2c33] rounded-sm p-4 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#2a2c33]">
              <span className="text-sm font-bold text-white uppercase tracking-wider">
                Chapters / Tracks ({tracks.length})
              </span>
              <button onClick={() => setShowDrawer(false)} className="p-2 text-slate-400 hover:text-white rounded-full bg-[#0f1013] transition cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1 mt-2">
              {tracks.map((t, idx) => {
                const isActive = idx === currentTrackIndex;
                return (
                  <button
                    key={t.index}
                    onClick={() => {
                      onTrackChange(idx);
                      setShowDrawer(false);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-sm flex items-center justify-between transition cursor-pointer ${
                      isActive ? 'bg-[#f69931]/10 text-[#f69931]' : 'hover:bg-[#0f1013] text-slate-300 hover:text-white'
                    }`}
                  >
                    <span className="text-sm font-semibold truncate pr-4">{t.name}</span>
                    {isActive ? (
                      <span className="flex items-center gap-2 text-xs font-bold">
                        <Play className="w-3 h-3 fill-current" /> PLAYING
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500 font-mono">{t.sizeFormatted}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── BOTTOM PLAYER BAR ─── */}
      <div className="fixed bottom-0 inset-x-0 z-50 bg-[#0f1013] border-t border-[#2a2c33] pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        {/* Scrubber - Full width at top of bar */}
        <div
          className="w-full h-1.5 bg-[#2a2c33] cursor-pointer relative group"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            if (audioRef.current && duration > 0) audioRef.current.currentTime = pos * duration;
          }}
        >
          <div className="absolute top-0 left-0 h-full bg-slate-500 opacity-30" style={{ width: `${bufferPct}%` }} />
          <div className="absolute top-0 left-0 h-full bg-[#f69931] transition-all group-hover:h-2" style={{ width: `${progressPct}%` }} />
        </div>

        <div className="max-w-7xl mx-auto px-4 h-20 md:h-24 flex items-center justify-between gap-4">
          
          {/* Cover & Info (Left) */}
          <div className="flex items-center gap-4 flex-1 min-w-0 h-full">
            <div 
              onClick={() => setShowCoverModal(true)}
              className="relative w-14 h-14 md:w-16 md:h-16 rounded-sm overflow-hidden shrink-0 cursor-pointer shadow-md border border-[#2a2c33] group"
            >
              <img src={coverUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                <Maximize2 className="w-5 h-5 text-white" />
              </div>
            </div>
            
            <div className="flex flex-col min-w-0 pr-4">
              <h4 className="text-sm md:text-base font-bold text-white truncate">{book.title}</h4>
              <p className="text-xs text-slate-400 truncate mt-0.5">{currentTrack?.name || book.author}</p>
              
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-[10px] md:text-xs text-[#f69931] font-mono">{formatTime(currentTime)} / {formatTime(duration)}</span>
                
                {book.infoHash && (
                  <span className="hidden md:flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-sm">
                    <Radio className="w-3 h-3" /> SWARM
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Core Playback Controls (Center) */}
          <div className="flex items-center justify-center gap-4 md:gap-8 flex-none">
            <button onClick={() => skip(-15)} className="text-slate-400 hover:text-white transition cursor-pointer">
              <RotateCcw className="w-6 h-6 md:w-7 md:h-7" />
            </button>
            
            <button
              onClick={togglePlayPause}
              className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-[#f69931] text-black flex items-center justify-center hover:scale-105 active:scale-95 transition cursor-pointer"
            >
              {isBuffering ? (
                <Loader2 className="w-6 h-6 md:w-8 md:h-8 animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-6 h-6 md:w-8 md:h-8 fill-current" />
              ) : (
                <Play className="w-6 h-6 md:w-8 md:h-8 fill-current ml-1" />
              )}
            </button>
            
            <button onClick={() => skip(30)} className="text-slate-400 hover:text-white transition cursor-pointer">
              <RotateCw className="w-6 h-6 md:w-7 md:h-7" />
            </button>
          </div>

          {/* Secondary Actions (Right) */}
          <div className="flex-1 flex items-center justify-end gap-3 sm:gap-4 h-full">
            {/* Speed Toggle */}
            <button onClick={() => cycleSpeed(1)} className="text-xs font-bold text-[#f69931] w-12 h-8 flex items-center justify-center bg-[#f69931]/10 rounded-sm hover:bg-[#f69931]/20 transition cursor-pointer">
              {speeds[speedIdx]}x
            </button>
            
            {/* Chapters Toggle */}
            <button onClick={() => setShowDrawer(!showDrawer)} className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-sm transition cursor-pointer ${showDrawer ? 'bg-[#f69931] text-black' : 'bg-[#1e2025] text-slate-300 hover:text-white'}`}>
              <ChevronUp className="w-4 h-4" />
              <span className="text-xs font-bold">Chapters</span>
            </button>

            {/* Bookmarks */}
            <button onClick={onOpenBookmarks} className="hidden sm:block p-2 text-slate-400 hover:text-white transition cursor-pointer">
              <Bookmark className="w-5 h-5" />
            </button>
            
            {/* Sleep Timer */}
            <button onClick={onOpenTimer} className="relative p-2 text-slate-400 hover:text-white transition cursor-pointer">
              <Moon className="w-5 h-5" />
              {sleepMinutes !== null && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#f69931] text-[9px] font-bold text-black border border-[#0f1013]">
                  {sleepMinutes === 999 ? 'C' : sleepMinutes}
                </span>
              )}
            </button>
            
            {/* Volume Control (Desktop only) */}
            <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-[#2a2c33]">
              <button onClick={toggleMute} className="text-slate-400 hover:text-white transition cursor-pointer">
                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-20 accent-[#f69931] bg-[#1e2025] h-1.5 rounded-full appearance-none cursor-pointer"
              />
            </div>
            
            {/* Close Player */}
            <button onClick={onClose} className="p-2 text-slate-500 hover:text-red-400 transition ml-2 cursor-pointer">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};


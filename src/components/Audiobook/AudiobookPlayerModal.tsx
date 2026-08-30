import React, { useState, useEffect } from 'react';
import { Audiobook, AudiobookBookmark } from '../../types/audiobook';
import { usePlayback } from '../../context/PlaybackContext';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Bookmark,
  Moon,
  Clock,
  User,
  Volume2,
  Minimize2,
  Gauge,
  Video,
  Headphones,
  Sparkles,
  Airplay
} from 'lucide-react';
import { CastModal } from '../Common/CastModal';

interface AudiobookPlayerModalProps {
  book: Audiobook | null;
  onClose: () => void;
}

export const AudiobookPlayerModal: React.FC<AudiobookPlayerModalProps> = ({
  book,
  onClose
}) => {
  const {
    activeMedia,
    sleepTimerMinutes,
    sleepTimerSecondsLeft,
    togglePlayPause,
    seekTo,
    skipForward,
    skipBackward,
    setPlaybackSpeed,
    setSleepTimer,
    minimizePlayer
  } = usePlayback();

  const [audioOnlyMode, setAudioOnlyMode] = useState<boolean>(true);
  const [showBookmarks, setShowBookmarks] = useState<boolean>(false);
  const [bookmarks, setBookmarks] = useState<AudiobookBookmark[]>(book?.bookmarks || []);
  const [showCastModal, setShowCastModal] = useState<boolean>(false);

  const isCurrentBook = activeMedia?.type === 'audiobook' && activeMedia.item.id === book?.id;
  const isPlaying = isCurrentBook ? activeMedia.isPlaying : false;
  const currentTime = isCurrentBook ? activeMedia.currentTime : (book?.lastPosition || 0);
  const duration = isCurrentBook ? activeMedia.duration : (book?.durationSeconds || 3600 * 5);
  const currentSpeed = isCurrentBook ? activeMedia.speed : 1.0;

  // Keyboard shortcut 'B' for Bookmark & Space for Play/Pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === 'b' || e.key === 'B') {
        handleAddBookmark();
      } else if (e.key === ' ') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        skipBackward(15);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        skipForward(30);
      } else if (e.key === 'Escape') {
        minimizePlayer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTime, togglePlayPause, skipBackward, skipForward, minimizePlayer]);

  if (!book) return null;

  const handleAddBookmark = () => {
    const newBm: AudiobookBookmark = {
      id: `bm_${Date.now()}`,
      timestamp: currentTime,
      note: `Bookmark at ${formatTime(currentTime)}`,
      createdAt: Date.now()
    };
    const updated = [newBm, ...bookmarks];
    setBookmarks(updated);
  };

  const handleSetSleepTimer = (minutes: number) => {
    if (sleepTimerMinutes === minutes) {
      setSleepTimer(null);
    } else {
      setSleepTimer(minutes);
    }
  };

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const embedUrl = book.youtubeId
    ? `https://www.youtube-nocookie.com/embed/${book.youtubeId}?autoplay=1&enablejsapi=1&start=${Math.floor(currentTime)}`
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-xl animate-fade-in">
      <div
        className="relative w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={minimizePlayer}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1 text-xs font-semibold"
              title="Dock & Listen in Background"
            >
              <Minimize2 className="w-4 h-4" />
              <span className="hidden sm:inline">Dock</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
              title="Close Player"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white line-clamp-1">
                {book.title}
              </h3>
              <p className="text-[11px] text-amber-400 flex items-center gap-1">
                <User className="w-3 h-3 text-slate-400" />
                <span>{book.author}</span>
              </p>
            </div>
          </div>

          {/* Mode Switcher & Tools */}
          <div className="flex items-center gap-1.5">
            {/* Audio / Video Switcher */}
            {book.youtubeId && (
              <button
                onClick={() => setAudioOnlyMode(!audioOnlyMode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  audioOnlyMode
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
                title="Toggle Audio-Only / Video Mode"
              >
                {audioOnlyMode ? <Headphones className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{audioOnlyMode ? 'Audio Mode' : 'Video Mode'}</span>
              </button>
            )}

            {/* AirPlay / Cast Button */}
            <button
              onClick={() => setShowCastModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-400/40 text-xs font-bold transition-all"
              title="Cast to Apple TV or HomePod"
            >
              <Airplay className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cast to Apple TV</span>
            </button>

            {/* Bookmarks Toggle */}
            <button
              onClick={() => setShowBookmarks(!showBookmarks)}
              className={`p-2 rounded-xl border transition-colors ${
                showBookmarks ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
              title="Bookmarks (Press B)"
            >
              <Bookmark className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Player Body */}
        <div className="p-6 flex flex-col items-center justify-center space-y-6">
          {/* 1. Audio-Only Visualizer Mode */}
          {audioOnlyMode ? (
            <div className="flex flex-col items-center text-center space-y-4 w-full">
              {/* Cover Art with subtle glow */}
              <div className="relative w-48 sm:w-56 aspect-square rounded-3xl overflow-hidden shadow-2xl border border-amber-500/20 bg-slate-900 group">
                {book.cover ? (
                  <img src={book.cover} alt={book.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-b from-amber-950/30 to-slate-950 text-amber-400">
                    <Headphones className="w-16 h-16 mb-2" />
                    <span className="text-xs font-bold text-white">{book.title}</span>
                  </div>
                )}

                {/* Animated Waveform Equalizer */}
                {isPlaying && (
                  <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-1 px-4">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-1 bg-amber-400/90 rounded-full animate-pulse"
                        style={{
                          height: `${12 + (i % 4) * 8}px`,
                          animationDuration: `${0.6 + (i % 3) * 0.3}s`
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Title & Narrator */}
              <div className="space-y-1 max-w-md">
                <h2 className="text-base sm:text-lg font-black text-white line-clamp-1">
                  {book.title}
                </h2>
                <p className="text-xs text-slate-400">
                  By <span className="text-slate-200">{book.author}</span>
                  {book.narrator && <span> • Narrated by {book.narrator}</span>}
                </p>
              </div>
            </div>
          ) : (
            /* 2. Video Mode */
            <div className="w-full aspect-video rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-xl">
              <iframe
                src={embedUrl}
                title={book.title}
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>
          )}

          {/* Interactive Progress Bar & Time */}
          <div className="w-full space-y-2">
            <div
              className="relative h-2 w-full bg-slate-800 rounded-full cursor-pointer overflow-hidden group"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                seekTo(ratio * duration);
              }}
            >
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-150"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Playback Transport Controls */}
          <div className="flex items-center justify-center gap-4 sm:gap-6">
            <button
              onClick={() => skipBackward(15)}
              className="p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-all hover:scale-105 border border-slate-800 flex flex-col items-center gap-0.5"
              title="Rewind 15s"
            >
              <RotateCcw className="w-5 h-5" />
              <span className="text-[9px] font-mono">15s</span>
            </button>

            <button
              onClick={togglePlayPause}
              className="p-5 rounded-3xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-xl shadow-amber-500/30 transition-all hover:scale-110"
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? (
                <Pause className="w-7 h-7 fill-current" />
              ) : (
                <Play className="w-7 h-7 fill-current ml-0.5" />
              )}
            </button>

            <button
              onClick={() => skipForward(30)}
              className="p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-all hover:scale-105 border border-slate-800 flex flex-col items-center gap-0.5"
              title="Forward 30s"
            >
              <RotateCw className="w-5 h-5" />
              <span className="text-[9px] font-mono">30s</span>
            </button>
          </div>

          {/* Speed & Sleep Timer Controls (Shelf.app Style) */}
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 border-t border-slate-800/80 pt-4">
            {/* Speed Selector */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Gauge className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-semibold text-slate-300">Speed:</span>
              {[0.75, 1.0, 1.25, 1.5, 1.75, 2.0].map((s) => (
                <button
                  key={s}
                  onClick={() => setPlaybackSpeed(s)}
                  className={`px-2 py-0.5 rounded-md font-bold text-[11px] transition-all ${
                    currentSpeed === s
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            {/* Sleep Timer */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-semibold text-slate-300">Sleep:</span>
              {[5, 15, 30, 45, 60].map((m) => (
                <button
                  key={m}
                  onClick={() => handleSetSleepTimer(m)}
                  className={`px-2 py-0.5 rounded-md font-bold text-[11px] transition-all ${
                    sleepTimerMinutes === m
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {m}m
                </button>
              ))}
              {sleepTimerSecondsLeft !== null && (
                <span className="text-[10px] text-indigo-300 font-mono px-1.5 py-0.5 rounded bg-indigo-950 border border-indigo-700">
                  {Math.floor(sleepTimerSecondsLeft / 60)}:{(sleepTimerSecondsLeft % 60).toString().padStart(2, '0')}
                </span>
              )}
            </div>
          </div>

          {/* Bookmarks Drawer */}
          {showBookmarks && (
            <div className="w-full bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-3 animate-slide-up">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                  <span>Bookmarks ({bookmarks.length})</span>
                </span>
                <button
                  onClick={handleAddBookmark}
                  className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 text-[10px] font-bold hover:bg-amber-400 transition-all"
                >
                  + Add Moment (B)
                </button>
              </div>

              {bookmarks.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic text-center py-2">
                  No bookmarks saved yet. Press 'B' while listening to bookmark memorable quotes.
                </p>
              ) : (
                <div className="max-h-32 overflow-y-auto space-y-1.5">
                  {bookmarks.map((bm) => (
                    <div
                      key={bm.id}
                      onClick={() => seekTo(bm.timestamp)}
                      className="p-2 rounded-xl bg-slate-800/70 hover:bg-slate-800 text-xs flex items-center justify-between cursor-pointer text-slate-200 border border-slate-700/50"
                    >
                      <span>{bm.note || 'Bookmark'}</span>
                      <span className="text-[10px] text-amber-400 font-mono">
                        {formatTime(bm.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Apple TV / AirPlay Casting Modal */}
      <CastModal
        isOpen={showCastModal}
        onClose={() => setShowCastModal(false)}
        mediaTitle={`${book.title} • ${book.author}`}
        mediaType="audiobook"
      />
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Audiobook, AudiobookBookmark, AudiobookChapter } from '../../types/audiobook';
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
  VolumeX,
  Minimize2,
  Gauge,
  Video,
  Headphones,
  Sparkles,
  Airplay,
  ListMusic,
  SkipBack,
  SkipForward,
  CheckCircle2,
  Radio,
  Sliders,
  ShieldCheck,
  Disc
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
    minimizePlayer,
    playChapter,
    nextChapter,
    prevChapter,
    setVolume,
    toggleMute
  } = usePlayback();

  const [audioOnlyMode, setAudioOnlyMode] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'player' | 'chapters' | 'bookmarks'>('player');
  const [bookmarks, setBookmarks] = useState<AudiobookBookmark[]>(book?.bookmarks || []);
  const [showCastModal, setShowCastModal] = useState<boolean>(false);
  const [bookmarkNote, setBookmarkNote] = useState('');
  const [showAddBookmarkInput, setShowAddBookmarkInput] = useState(false);

  const isCurrentBook = activeMedia?.type === 'audiobook' && activeMedia.item.id === book?.id;
  const isPlaying = isCurrentBook ? activeMedia.isPlaying : false;
  const currentTime = isCurrentBook ? activeMedia.currentTime : (book?.lastPosition || 0);
  const duration = isCurrentBook ? activeMedia.duration : (book?.durationSeconds || 3600 * 5);
  const currentSpeed = isCurrentBook ? activeMedia.speed : 1.0;
  const currentChapterIdx = isCurrentBook ? activeMedia.currentChapterIndex : 0;
  const currentVolume = isCurrentBook ? activeMedia.volume : 1.0;
  const isMuted = isCurrentBook ? activeMedia.isMuted : false;

  const chapters: AudiobookChapter[] = book?.chapters || [];
  const currentChapter = chapters[currentChapterIdx];

  // Keyboard shortcut listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === 'b' || e.key === 'B') {
        handleAddQuickBookmark();
      } else if (e.key === ' ') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        skipBackward(15);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        skipForward(30);
      } else if (e.key === 'm' || e.key === 'M') {
        toggleMute();
      } else if (e.key === 'c' || e.key === 'C') {
        setActiveTab((prev) => (prev === 'chapters' ? 'player' : 'chapters'));
      } else if (e.key === 'Escape') {
        minimizePlayer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTime, togglePlayPause, skipBackward, skipForward, minimizePlayer, toggleMute]);

  if (!book) return null;

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs)) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleAddQuickBookmark = () => {
    const newBm: AudiobookBookmark = {
      id: `bm_${Date.now()}`,
      timestamp: currentTime,
      note: bookmarkNote.trim() || `Bookmark at ${formatTime(currentTime)}`,
      createdAt: Date.now()
    };
    const updated = [newBm, ...bookmarks];
    setBookmarks(updated);
    setBookmarkNote('');
    setShowAddBookmarkInput(false);
  };

  const handleSetSleepTimer = (minutes: number) => {
    if (sleepTimerMinutes === minutes) {
      setSleepTimer(null);
    } else {
      setSleepTimer(minutes);
    }
  };

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  const embedUrl = book.youtubeId
    ? `https://www.youtube-nocookie.com/embed/${book.youtubeId}?autoplay=1&enablejsapi=1&start=${Math.floor(currentTime)}`
    : '';

  const hasDirectAudio = Boolean(currentChapter?.audioUrl || book.audioUrl);
  const isGraphicAudio = book.isGraphicAudio || book.genre === 'Full Cast & Dramatized' || book.title.toLowerCase().includes('graphicaudio') || book.title.toLowerCase().includes('soundscape') || book.title.toLowerCase().includes('full cast');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-2xl animate-fade-in">
      <div
        className="relative w-full max-w-2xl bg-[#070b14] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Dynamic Background Glow */}
        <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full blur-3xl bg-amber-500/10 pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full blur-3xl bg-purple-500/10 pointer-events-none" />

        {/* Top Header */}
        <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={minimizePlayer}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              title="Dock & Listen in Background (Esc)"
            >
              <Minimize2 className="w-4 h-4" />
              <span className="hidden sm:inline">Dock</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
              title="Close Player"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-black text-white truncate">
                  {book.title}
                </h3>
                {isGraphicAudio && (
                  <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-md flex-shrink-0">
                    GraphicAudio
                  </span>
                )}
              </div>
              <p className="text-[11px] text-amber-400 flex items-center gap-1 truncate mt-0.5">
                <User className="w-3 h-3 text-slate-400 flex-shrink-0" />
                <span className="truncate">{book.author}</span>
                {currentChapter && (
                  <span className="text-slate-400 truncate">• {currentChapter.title}</span>
                )}
              </p>
            </div>
          </div>

          {/* Mode Switcher & Tools */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Audio / Video Switcher */}
            {book.youtubeId && (
              <button
                onClick={() => setAudioOnlyMode(!audioOnlyMode)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  audioOnlyMode
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
                title="Toggle Audio-Only / Video Mode"
              >
                {audioOnlyMode ? <Headphones className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{audioOnlyMode ? 'Audio' : 'Video'}</span>
              </button>
            )}

            {/* Chapters Drawer Button */}
            {chapters.length > 0 && (
              <button
                onClick={() => setActiveTab(activeTab === 'chapters' ? 'player' : 'chapters')}
                className={`p-2 rounded-xl border transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold ${
                  activeTab === 'chapters'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
                title={`Chapters (${chapters.length}) - Press 'C'`}
              >
                <ListMusic className="w-4 h-4" />
                <span className="text-[10px] hidden sm:inline">{chapters.length} Tracks</span>
              </button>
            )}

            {/* AirPlay / Cast Button */}
            <button
              onClick={() => setShowCastModal(true)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-all cursor-pointer"
              title="Cast to Apple TV, HomePod or TV Box"
            >
              <Airplay className="w-4 h-4" />
            </button>

            {/* Bookmarks Toggle */}
            <button
              onClick={() => setActiveTab(activeTab === 'bookmarks' ? 'player' : 'bookmarks')}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                activeTab === 'bookmarks'
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
              title="Bookmarks (Press B)"
            >
              <Bookmark className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab View: CHAPTERS TRACK LIST */}
        {activeTab === 'chapters' && chapters.length > 0 && (
          <div className="p-4 overflow-y-auto max-h-[60vh] space-y-2 relative z-10 animate-fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <ListMusic className="w-4 h-4 text-amber-400" />
                <span>Audio Tracks & Chapters ({chapters.length})</span>
              </span>
              <button
                onClick={() => setActiveTab('player')}
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
              >
                Back to Player
              </button>
            </div>

            <div className="space-y-1.5">
              {chapters.map((ch, idx) => {
                const isSelected = currentChapterIdx === idx;
                return (
                  <div
                    key={ch.id || idx}
                    onClick={() => {
                      playChapter(idx);
                      setActiveTab('player');
                    }}
                    className={`p-3 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-400/60 text-amber-300 shadow-md shadow-amber-500/10'
                        : 'bg-slate-900/70 border-slate-800/80 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono text-xs font-bold flex-shrink-0 ${
                          isSelected ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {isSelected && isPlaying ? (
                          <Disc className="w-4 h-4 animate-spin" />
                        ) : (
                          idx + 1
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold truncate">{ch.title}</h4>
                        {ch.duration && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            {ch.duration}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isSelected && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-400 text-slate-950">
                          ACTIVE
                        </span>
                      )}
                      <Play className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab View: BOOKMARKS */}
        {activeTab === 'bookmarks' && (
          <div className="p-4 overflow-y-auto max-h-[60vh] space-y-3 relative z-10 animate-fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Bookmark className="w-4 h-4 text-amber-400" />
                <span>Saved Bookmarks & Moments ({bookmarks.length})</span>
              </span>
              <button
                onClick={() => setShowAddBookmarkInput(!showAddBookmarkInput)}
                className="px-2.5 py-1 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 cursor-pointer"
              >
                + Add Moment (B)
              </button>
            </div>

            {showAddBookmarkInput && (
              <div className="p-3 rounded-2xl bg-slate-900 border border-amber-500/40 space-y-2">
                <input
                  type="text"
                  value={bookmarkNote}
                  onChange={(e) => setBookmarkNote(e.target.value)}
                  placeholder={`Note at ${formatTime(currentTime)} (e.g., Epic Battle scene)`}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddQuickBookmark();
                  }}
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowAddBookmarkInput(false)}
                    className="px-3 py-1 rounded-lg text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddQuickBookmark}
                    className="px-3 py-1 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold"
                  >
                    Save Timestamp
                  </button>
                </div>
              </div>
            )}

            {bookmarks.length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center py-6">
                No bookmarks saved yet. Press 'B' during playback to save memorable moments.
              </p>
            ) : (
              <div className="space-y-2">
                {bookmarks.map((bm) => (
                  <div
                    key={bm.id}
                    onClick={() => {
                      seekTo(bm.timestamp);
                      setActiveTab('player');
                    }}
                    className="p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-xs flex items-center justify-between cursor-pointer text-slate-200 border border-slate-800 hover:border-amber-400/50"
                  >
                    <span className="font-semibold">{bm.note}</span>
                    <span className="text-[10px] text-amber-400 font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                      {formatTime(bm.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Main Player View */}
        {activeTab === 'player' && (
          <div className="p-6 flex flex-col items-center justify-center space-y-6 relative z-10 overflow-y-auto">
            {/* 1. Audio-Only Visualizer Mode */}
            {audioOnlyMode ? (
              <div className="flex flex-col items-center text-center space-y-4 w-full">
                {/* Cover Art with dynamic artwork frame */}
                <div className="relative w-44 sm:w-52 aspect-square rounded-3xl overflow-hidden shadow-2xl border-2 border-amber-500/30 bg-slate-900 group">
                  {book.cover ? (
                    <img
                      src={book.cover}
                      alt={book.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-b from-amber-950/30 to-slate-950 text-amber-400">
                      <Headphones className="w-16 h-16 mb-2" />
                      <span className="text-xs font-bold text-white">{book.title}</span>
                    </div>
                  )}

                  {/* Audio Source / Quality Badge */}
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[9px] font-mono text-amber-300 border border-white/10 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{hasDirectAudio ? 'Hi-Fi Audio' : 'Audio Stream'}</span>
                  </div>

                  {/* Animated Waveform Equalizer */}
                  {isPlaying && (
                    <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-1 px-4 bg-black/40 backdrop-blur-sm py-1.5">
                      {Array.from({ length: 16 }).map((_, i) => (
                        <div
                          key={i}
                          className="w-1 bg-gradient-to-t from-amber-500 to-amber-300 rounded-full animate-pulse"
                          style={{
                            height: `${8 + ((i * 7) % 18)}px`,
                            animationDuration: `${0.4 + (i % 4) * 0.2}s`
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
                  <p className="text-xs text-slate-300">
                    By <span className="text-white font-bold">{book.author}</span>
                    {book.narrator && (
                      <span className="text-amber-400"> • {book.narrator}</span>
                    )}
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
                className="relative h-2.5 w-full bg-slate-900 border border-slate-800 rounded-full cursor-pointer overflow-hidden group shadow-inner"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                  seekTo(ratio * duration);
                }}
              >
                <div
                  className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 rounded-full transition-all duration-150 relative"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span className="text-amber-400 font-bold">{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Playback Transport Controls */}
            <div className="flex items-center justify-center gap-3 sm:gap-5">
              {/* Previous Chapter */}
              {chapters.length > 1 && (
                <button
                  onClick={prevChapter}
                  disabled={currentChapterIdx <= 0}
                  className={`p-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 transition-all ${
                    currentChapterIdx <= 0
                      ? 'opacity-40 cursor-not-allowed'
                      : 'hover:bg-slate-800 hover:text-white cursor-pointer hover:scale-105'
                  }`}
                  title="Previous Chapter"
                >
                  <SkipBack className="w-4 h-4" />
                </button>
              )}

              {/* Rewind 15s */}
              <button
                onClick={() => skipBackward(15)}
                className="p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-all hover:scale-105 border border-slate-800 flex flex-col items-center gap-0.5 cursor-pointer"
                title="Rewind 15s (Left Arrow)"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="text-[9px] font-mono">15s</span>
              </button>

              {/* Big Play / Pause */}
              <button
                onClick={togglePlayPause}
                className="p-5 rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black shadow-xl shadow-amber-500/30 transition-all hover:scale-110 cursor-pointer"
                title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
              >
                {isPlaying ? (
                  <Pause className="w-7 h-7 fill-current" />
                ) : (
                  <Play className="w-7 h-7 fill-current ml-0.5" />
                )}
              </button>

              {/* Forward 30s */}
              <button
                onClick={() => skipForward(30)}
                className="p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-all hover:scale-105 border border-slate-800 flex flex-col items-center gap-0.5 cursor-pointer"
                title="Forward 30s (Right Arrow)"
              >
                <RotateCw className="w-4 h-4" />
                <span className="text-[9px] font-mono">30s</span>
              </button>

              {/* Next Chapter */}
              {chapters.length > 1 && (
                <button
                  onClick={nextChapter}
                  disabled={currentChapterIdx >= chapters.length - 1}
                  className={`p-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 transition-all ${
                    currentChapterIdx >= chapters.length - 1
                      ? 'opacity-40 cursor-not-allowed'
                      : 'hover:bg-slate-800 hover:text-white cursor-pointer hover:scale-105'
                  }`}
                  title="Next Chapter"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Volume & Speed & Sleep Timer Controls */}
            <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 border-t border-slate-800/80 pt-4">
              {/* Volume Slider */}
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  className="text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
                  title="Toggle Mute (M)"
                >
                  {isMuted || currentVolume === 0 ? (
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
                  value={isMuted ? 0 : currentVolume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-20 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              {/* Speed Selector */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <Gauge className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-semibold text-slate-300">Speed:</span>
                {[0.75, 1.0, 1.25, 1.5, 1.75, 2.0].map((s) => (
                  <button
                    key={s}
                    onClick={() => setPlaybackSpeed(s)}
                    className={`px-2 py-0.5 rounded-md font-bold text-[11px] transition-all cursor-pointer ${
                      currentSpeed === s
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
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
                {[15, 30, 45, 60].map((m) => (
                  <button
                    key={m}
                    onClick={() => handleSetSleepTimer(m)}
                    className={`px-2 py-0.5 rounded-md font-bold text-[11px] transition-all cursor-pointer ${
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
                    {Math.floor(sleepTimerSecondsLeft / 60)}:
                    {(sleepTimerSecondsLeft % 60).toString().padStart(2, '0')}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
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

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Audiobook, AudiobookBookmark, AudiobookChapter, AudiobookPart, AudiobookSource } from '../../types/audiobook';
import { usePlayback } from '../../context/PlaybackContext';
import { audiobookStorage } from '../../services/audiobookStorage';
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
  Disc,
  Layers,
  ChevronDown,
  Trash2,
  Plus,
  Compass,
  Zap,
  Repeat,
  FileText,
  BrainCircuit,
  ExternalLink,
  Search,
  ShoppingCart,
  BookOpen
} from 'lucide-react';
import { CastModal } from '../Common/CastModal';

interface AudiobookPlayerModalProps {
  book: Audiobook | null;
  onClose: () => void;
}

export interface TranscriptCue {
  start: number;
  dur?: number;
  text: string;
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
    playPart,
    nextPart,
    prevPart,
    switchAudioSource,
    setVolume,
    toggleMute
  } = usePlayback();

  const [activeTab, setActiveTab] = useState<'player' | 'chapters' | 'parts' | 'transcript' | 'recap' | 'bookmarks' | 'sources'>('player');
  const [showCastModal, setShowCastModal] = useState<boolean>(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState<boolean>(false);
  const [showSleepMenu, setShowSleepMenu] = useState<boolean>(false);
  const [showRemainingTime, setShowRemainingTime] = useState<boolean>(true);
  const [bookmarks, setBookmarks] = useState<AudiobookBookmark[]>([]);
  const [bookmarkNote, setBookmarkNote] = useState('');
  const [showAddBookmarkInput, setShowAddBookmarkInput] = useState(false);

  // Transcript State
  const [transcriptCues, setTranscriptCues] = useState<TranscriptCue[]>([]);
  const [loadingTranscript, setLoadingTranscript] = useState<boolean>(false);
  const [transcriptSearch, setTranscriptSearch] = useState<string>('');
  const transcriptActiveRef = useRef<HTMLSpanElement | null>(null);

  // Recap State
  const [recapText, setRecapText] = useState<string | null>(null);
  const [isGeneratingRecap, setIsGeneratingRecap] = useState<boolean>(false);

  const isCurrentBook = activeMedia?.type === 'audiobook' && activeMedia.item.id === book?.id;
  const isPlaying = isCurrentBook ? activeMedia.isPlaying : false;
  const currentTime = isCurrentBook ? activeMedia.currentTime : (book?.lastPosition || 0);
  const duration = isCurrentBook ? activeMedia.duration : (book?.durationSeconds || 3600 * 5);
  const currentSpeed = isCurrentBook ? activeMedia.speed : 1.0;
  const currentChapterIdx = isCurrentBook ? activeMedia.currentChapterIndex : 0;
  const currentPartIdx = isCurrentBook ? activeMedia.currentPartIndex : 0;
  const currentVolume = isCurrentBook ? activeMedia.volume : 1.0;
  const isMuted = isCurrentBook ? activeMedia.isMuted : false;

  const currentBook = isCurrentBook ? activeMedia.item : (book || {} as Audiobook);
  const chapters: AudiobookChapter[] = currentBook.chapters || [];
  const parts: AudiobookPart[] = currentBook.parts || [];
  const sources: AudiobookSource[] = currentBook.sources || [];
  const currentChapter = chapters[currentChapterIdx];
  const currentPart = parts[currentPartIdx];

  const currentYoutubeId = currentPart?.youtubeId || currentBook.youtubeId;

  // Load saved bookmarks for current book
  useEffect(() => {
    if (book?.id) {
      setBookmarks(audiobookStorage.getBookmarks(book.id));
    }
  }, [book?.id]);

  // Fetch Transcript when available
  useEffect(() => {
    if (currentYoutubeId) {
      setLoadingTranscript(true);
      fetch(`/api/audiobooks/transcript?videoId=${encodeURIComponent(currentYoutubeId)}`)
        .then((r) => r.json())
        .then((data) => {
          if (data && Array.isArray(data.cues)) {
            setTranscriptCues(data.cues);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingTranscript(false));
    }
  }, [currentYoutubeId]);

  // Keyboard shortcut listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === ' ' || e.code === 'Space') {
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
      } else if (e.key === 't' || e.key === 'T') {
        setActiveTab((prev) => (prev === 'transcript' ? 'player' : 'transcript'));
      } else if (e.key === 'Escape') {
        minimizePlayer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTime, togglePlayPause, skipBackward, skipForward, minimizePlayer, toggleMute]);

  // Auto-scroll transcript to active cue
  const activeTranscriptIndex = useMemo(() => {
    if (transcriptCues.length === 0) return -1;
    let lo = 0;
    let hi = transcriptCues.length - 1;
    let ans = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (transcriptCues[mid].start <= currentTime) {
        ans = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return ans;
  }, [transcriptCues, currentTime]);

  useEffect(() => {
    if (activeTab === 'transcript' && !transcriptSearch && transcriptActiveRef.current) {
      transcriptActiveRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [activeTranscriptIndex, activeTab, transcriptSearch]);

  if (!book) return null;

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs) || secs < 0) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const remainingSeconds = Math.max(0, duration - currentTime);

  const handleAddQuickBookmark = () => {
    if (!book.id) return;
    const newBm: AudiobookBookmark = {
      id: `bm_${Date.now()}`,
      timestamp: currentTime,
      note: bookmarkNote.trim() || `Bookmark at ${formatTime(currentTime)}`,
      createdAt: Date.now(),
      chapterIndex: currentChapterIdx,
      partIndex: currentPartIdx
    };
    const updated = audiobookStorage.saveBookmark(book.id, newBm);
    setBookmarks(updated);
    setBookmarkNote('');
    setShowAddBookmarkInput(false);
  };

  const handleDeleteBookmark = (bmId: string) => {
    if (!book.id) return;
    const updated = audiobookStorage.deleteBookmark(book.id, bmId);
    setBookmarks(updated);
  };

  // Generate Spoiler-Free Recap of the last 10 minutes of narration
  const handleGenerateRecap = () => {
    setIsGeneratingRecap(true);
    setTimeout(() => {
      if (transcriptCues.length > 0) {
        // Extract past 10 minutes of cues up to currentTime
        const pastCues = transcriptCues.filter((c) => c.start <= currentTime && c.start >= Math.max(0, currentTime - 600));
        if (pastCues.length > 0) {
          const sentences = pastCues.map((c) => c.text).join(' ');
          // Select key descriptive sentences
          const formatted = sentences.length > 600 ? `${sentences.slice(0, 580)}...` : sentences;
          setRecapText(formatted);
        } else {
          setRecapText(`Currently at ${formatTime(currentTime)}. The story is progressing through chapter events and dialogue.`);
        }
      } else {
        setRecapText(`Listening to "${book.title}" at ${formatTime(currentTime)}. Continue playing to follow the primary character arcs and story progression.`);
      }
      setIsGeneratingRecap(false);
    }, 400);
  };

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const isGraphicAudio = book.isGraphicAudio || book.genre === 'Full Cast & Dramatized' || book.title.toLowerCase().includes('graphicaudio') || book.title.toLowerCase().includes('soundscape');

  const speeds = [0.75, 1.0, 1.2, 1.25, 1.5, 1.75, 2.0, 2.5];
  const sleepOptions = [
    { label: 'Off', minutes: null },
    { label: '15 mins', minutes: 15 },
    { label: '30 mins', minutes: 30 },
    { label: '45 mins', minutes: 45 },
    { label: '60 mins', minutes: 60 }
  ];

  // Store & Library Reference Links (Ported from Shelf)
  const buyQuery = encodeURIComponent([book.title, book.author].filter(Boolean).join(' '));
  const libraryLinks = [
    { name: 'Audible', url: `https://www.audible.com/search?keywords=${buyQuery}`, icon: Headphones },
    { name: 'Amazon', url: `https://www.amazon.com/s?k=${buyQuery}&i=stripbooks`, icon: ShoppingCart },
    { name: 'Kobo', url: `https://www.kobo.com/search?query=${buyQuery}`, icon: BookOpen },
    { name: 'Libro.fm', url: `https://libro.fm/search?utf8=%E2%9C%93&q=${buyQuery}`, icon: Radio },
    { name: 'Google Books', url: `https://www.google.com/search?tbm=bks&q=${buyQuery}`, icon: Compass }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-2xl animate-fade-in">
      <div
        className="relative w-full max-w-2xl bg-[#080d1a] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Dynamic Cover Ambient Glow */}
        {book.cover && (
          <div
            className="absolute inset-0 opacity-15 blur-3xl scale-125 pointer-events-none transition-all duration-700"
            style={{
              backgroundImage: `url(${book.cover})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          />
        )}

        {/* -------------------------------------------------------------
            TOP HEADER: DOCK, TITLE, SOURCE PILL & CLOSE
           ------------------------------------------------------------- */}
        <div className="p-3.5 sm:p-4 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between gap-3 relative z-10 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <button
              onClick={minimizePlayer}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1 text-xs font-bold cursor-pointer"
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
          </div>

          {/* Active Title */}
          <div className="min-w-0 flex-1 text-center px-2">
            <h3 className="text-xs sm:text-sm font-black text-white truncate">{book.title}</h3>
            <p className="text-[11px] text-amber-400/90 truncate font-semibold">{book.author}</p>
          </div>

          {/* Source Switcher Pill & Cast Button */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {sources.length > 1 && (
              <button
                onClick={() => setActiveTab(activeTab === 'sources' ? 'player' : 'sources')}
                className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                title="Switch Audio Stream Source"
              >
                <Zap className="w-3 h-3 text-amber-400" />
                <span className="hidden sm:inline">Sources ({sources.length})</span>
              </button>
            )}

            <button
              onClick={() => setShowCastModal(true)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Cast Audio (AirPlay / Chromecast)"
            >
              <Airplay className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* -------------------------------------------------------------
            TAB NAVIGATION BAR: NOW PLAYING | CHAPTERS | TRANSCRIPT | RECAP | PARTS | BOOKMARKS
           ------------------------------------------------------------- */}
        <div className="flex items-center justify-around border-b border-slate-800/80 bg-slate-950/60 p-1 text-xs font-bold overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('player')}
            className={`flex-1 py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'player' ? 'bg-amber-500 text-slate-950 shadow-md font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Headphones className="w-3.5 h-3.5" />
            <span>Player</span>
          </button>

          <button
            onClick={() => setActiveTab('chapters')}
            className={`flex-1 py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'chapters' ? 'bg-amber-500 text-slate-950 shadow-md font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ListMusic className="w-3.5 h-3.5" />
            <span>Chapters ({chapters.length || 1})</span>
          </button>

          <button
            onClick={() => setActiveTab('transcript')}
            className={`flex-1 py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'transcript' ? 'bg-amber-500 text-slate-950 shadow-md font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Transcript</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('recap');
              if (!recapText) handleGenerateRecap();
            }}
            className={`flex-1 py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'recap' ? 'bg-amber-500 text-slate-950 shadow-md font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            <span>Recap</span>
          </button>

          {parts.length > 1 && (
            <button
              onClick={() => setActiveTab('parts')}
              className={`flex-1 py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeTab === 'parts' ? 'bg-amber-500 text-slate-950 shadow-md font-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Parts ({parts.length})</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`flex-1 py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'bookmarks' ? 'bg-amber-500 text-slate-950 shadow-md font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Bookmarks</span>
          </button>
        </div>

        {/* -------------------------------------------------------------
            TAB CONTENT
           ------------------------------------------------------------- */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 relative z-10">
          {/* TAB 1: NOW PLAYING VIEW */}
          {activeTab === 'player' && (
            <div className="space-y-6 animate-fade-in">
              {/* Hero Album / Book Artwork with Pulsing Equalizer Ring */}
              <div className="flex flex-col items-center justify-center pt-2">
                <div className="relative group">
                  {/* Equalizer Ring */}
                  <div className={`absolute -inset-2 rounded-3xl bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 opacity-30 blur-xl transition-opacity ${isPlaying ? 'opacity-70 animate-pulse' : 'opacity-20'}`} />

                  <div className="relative w-44 h-44 sm:w-56 sm:h-56 rounded-3xl overflow-hidden shadow-2xl border-2 border-slate-700/80 bg-slate-900 flex items-center justify-center">
                    {book.cover ? (
                      <img
                        src={book.cover}
                        alt={book.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Headphones className="w-16 h-16 text-slate-600" />
                    )}

                    {/* GraphicAudio / Full Cast Badge Overlay */}
                    {isGraphicAudio && (
                      <div className="absolute top-2 left-2 right-2">
                        <span className="px-2.5 py-1 rounded-lg bg-red-600/90 backdrop-blur-md text-white font-black text-[9px] uppercase tracking-wider shadow flex items-center gap-1">
                          <Sparkles className="w-3 h-3 fill-current" />
                          <span>GraphicAudio • A Movie in Your Mind®</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Subtitle & Current Part/Chapter Badge */}
                <div className="text-center mt-4 space-y-1 max-w-md">
                  <h2 className="text-base sm:text-lg font-black text-white leading-snug truncate">
                    {book.title}
                  </h2>
                  <p className="text-xs text-slate-400 truncate">
                    Narrated by {book.narrator || 'Full Voice Cast & Sound Design'}
                  </p>

                  <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                    {parts.length > 1 && (
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-amber-300 text-[10px] font-bold">
                        Part {currentPartIdx + 1} of {parts.length}
                      </span>
                    )}

                    {currentChapter && (
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-sky-300 text-[10px] font-bold truncate max-w-xs">
                        {currentChapter.title}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Timeline & Precision Scrub Bar */}
              <div className="space-y-2 max-w-xl mx-auto px-2">
                <div className="relative group">
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={currentTime}
                    onChange={(e) => seekTo(parseFloat(e.target.value))}
                    className="w-full h-2.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-amber-500 transition-all hover:h-3.5 focus:outline-none"
                    style={{
                      background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${progressPercent}%, #1e293b ${progressPercent}%, #1e293b 100%)`
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span className="font-bold text-slate-200">{formatTime(currentTime)}</span>

                  <button
                    onClick={() => setShowRemainingTime(!showRemainingTime)}
                    className="hover:text-amber-400 transition-colors cursor-pointer"
                    title="Click to toggle Total / Remaining Time"
                  >
                    {showRemainingTime ? `-${formatTime(remainingSeconds)}` : formatTime(duration)}
                  </button>
                </div>
              </div>

              {/* Flagship Controls: Skip 15s / 30s, Play/Pause, Next/Prev Parts */}
              <div className="flex items-center justify-center gap-4 sm:gap-6 pt-2">
                {/* Previous Chapter / Part */}
                <button
                  onClick={prevChapter}
                  className="p-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-all cursor-pointer"
                  title="Previous Chapter / Part"
                >
                  <SkipBack className="w-5 h-5" />
                </button>

                {/* Rewind 15s */}
                <button
                  onClick={() => skipBackward(15)}
                  className="p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-all hover:scale-105 active:scale-95 cursor-pointer flex flex-col items-center"
                  title="Rewind 15 Seconds (Left Arrow)"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span className="text-[9px] font-mono font-bold mt-0.5">15s</span>
                </button>

                {/* Main Play / Pause Button */}
                <button
                  onClick={togglePlayPause}
                  className="w-16 h-16 sm:w-18 sm:h-18 rounded-3xl bg-gradient-to-tr from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black shadow-xl shadow-amber-500/30 flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer"
                  title="Play / Pause (Space)"
                >
                  {isPlaying ? (
                    <Pause className="w-8 h-8 fill-current" />
                  ) : (
                    <Play className="w-8 h-8 fill-current translate-x-0.5" />
                  )}
                </button>

                {/* Fast Forward 30s */}
                <button
                  onClick={() => skipForward(30)}
                  className="p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-all hover:scale-105 active:scale-95 cursor-pointer flex flex-col items-center"
                  title="Fast Forward 30 Seconds (Right Arrow)"
                >
                  <RotateCw className="w-5 h-5" />
                  <span className="text-[9px] font-mono font-bold mt-0.5">30s</span>
                </button>

                {/* Next Chapter / Part */}
                <button
                  onClick={nextChapter}
                  className="p-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-all cursor-pointer"
                  title="Next Chapter / Part"
                >
                  <SkipForward className="w-5 h-5" />
                </button>
              </div>

              {/* Utility Tools Drawer Bar (Speed, Sleep Timer, Quick Bookmark, Volume) */}
              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-2 max-w-xl mx-auto flex-wrap">
                {/* Speed Toggle */}
                <div className="relative">
                  <button
                    onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Gauge className="w-3.5 h-3.5 text-amber-400" />
                    <span>{currentSpeed}x</span>
                  </button>

                  {showSpeedMenu && (
                    <div className="absolute bottom-full mb-2 left-0 w-32 rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl p-1.5 z-30 space-y-1 text-xs">
                      {speeds.map((s) => (
                        <button
                          key={s}
                          onClick={() => {
                            setPlaybackSpeed(s);
                            setShowSpeedMenu(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-xl transition-colors font-bold ${
                            currentSpeed === s ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:bg-slate-900'
                          }`}
                        >
                          {s}x {s === 1.0 ? '(Normal)' : ''}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sleep Timer */}
                <div className="relative">
                  <button
                    onClick={() => setShowSleepMenu(!showSleepMenu)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      sleepTimerSecondsLeft
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                        : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5 text-purple-400" />
                    <span>
                      {sleepTimerSecondsLeft ? `${Math.ceil(sleepTimerSecondsLeft / 60)}m left` : 'Sleep Timer'}
                    </span>
                  </button>

                  {showSleepMenu && (
                    <div className="absolute bottom-full mb-2 left-0 w-36 rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl p-1.5 z-30 space-y-1 text-xs">
                      {sleepOptions.map((opt) => (
                        <button
                          key={opt.label}
                          onClick={() => {
                            setSleepTimer(opt.minutes);
                            setShowSleepMenu(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-xl transition-colors font-bold ${
                            sleepTimerMinutes === opt.minutes
                              ? 'bg-purple-600 text-white'
                              : 'text-slate-300 hover:bg-slate-900'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick Bookmark Button */}
                <button
                  onClick={() => setShowAddBookmarkInput(!showAddBookmarkInput)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                  <span>Bookmark</span>
                </button>

                {/* Volume Slider */}
                <div className="flex items-center gap-2">
                  <button onClick={toggleMute} className="text-slate-400 hover:text-white cursor-pointer">
                    {isMuted || currentVolume === 0 ? (
                      <VolumeX className="w-4 h-4 text-rose-400" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-slate-300" />
                    )}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : currentVolume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-16 sm:w-20 h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-amber-500"
                  />
                </div>
              </div>

              {/* Quick Add Bookmark Input */}
              {showAddBookmarkInput && (
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-amber-500/30 flex items-center gap-2 max-w-xl mx-auto animate-fade-in">
                  <input
                    type="text"
                    value={bookmarkNote}
                    onChange={(e) => setBookmarkNote(e.target.value)}
                    placeholder={`Note for bookmark at ${formatTime(currentTime)}...`}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                    autoFocus
                  />
                  <button
                    onClick={handleAddQuickBookmark}
                    className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              )}

              {/* Shelf-Style Direct Library Links */}
              <div className="pt-2 flex items-center justify-center gap-3 text-[11px] text-slate-400 flex-wrap">
                <span className="font-semibold text-slate-500">Edition & Buy Links:</span>
                {libraryLinks.map((lib) => (
                  <a
                    key={lib.name}
                    href={lib.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-amber-400 transition-colors flex items-center gap-1"
                  >
                    <span>{lib.name}</span>
                    <ExternalLink className="w-2.5 h-2.5 text-slate-600" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: CHAPTERS DRAWER */}
          {activeTab === 'chapters' && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <ListMusic className="w-4 h-4 text-sky-400" />
                  <span>Audiobook Chapters ({chapters.length || 1})</span>
                </h4>
                <span className="text-[11px] text-slate-400 font-mono">1-Click Jump</span>
              </div>

              {chapters.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                  <p>Single-track audiobook stream.</p>
                  <p className="text-slate-500">Duration: {formatTime(duration)}</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {chapters.map((ch, idx) => {
                    const isCurrent = currentChapterIdx === idx;
                    return (
                      <div
                        key={ch.id || idx}
                        onClick={() => {
                          playChapter(idx);
                          setActiveTab('player');
                        }}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isCurrent
                            ? 'bg-sky-500/15 border-sky-500/40 text-white shadow-md'
                            : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-850 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs ${
                              isCurrent ? 'bg-sky-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <span className="text-xs sm:text-sm font-bold truncate">{ch.title}</span>
                        </div>

                        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 flex-shrink-0">
                          {ch.duration && <span>{ch.duration}</span>}
                          {isCurrent && isPlaying && (
                            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: LIVE READ-ALONG TRANSCRIPT DRAWER (Shelf Feature) */}
          {activeTab === 'transcript' && (
            <div className="space-y-4 animate-fade-in flex flex-col h-full">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={transcriptSearch}
                    onChange={(e) => setTranscriptSearch(e.target.value)}
                    placeholder="Search words in transcript..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-8 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                  {transcriptSearch && (
                    <button
                      onClick={() => setTranscriptSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <span className="text-[11px] text-amber-400 font-bold whitespace-nowrap">
                  Tap to Seek
                </span>
              </div>

              {loadingTranscript ? (
                <div className="p-12 text-center text-xs text-slate-400 space-y-2">
                  <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p>Loading live audio captions...</p>
                </div>
              ) : transcriptCues.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                  <FileText className="w-8 h-8 text-slate-600 mx-auto" />
                  <p>No captions available for this stream.</p>
                  <p className="text-slate-500">Audio playback, chapters, and speed control remain active.</p>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto space-y-3 pr-2 text-xs sm:text-sm leading-relaxed">
                  {transcriptCues
                    .filter((cue) => !transcriptSearch || cue.text.toLowerCase().includes(transcriptSearch.toLowerCase()))
                    .map((cue, idx) => {
                      const isActive = activeTranscriptIndex === idx;
                      return (
                        <span
                          key={idx}
                          ref={isActive ? transcriptActiveRef : undefined}
                          onClick={() => seekTo(cue.start)}
                          className={`inline cursor-pointer px-1 py-0.5 rounded-lg transition-colors mr-1 ${
                            isActive
                              ? 'bg-amber-500/25 text-amber-300 font-bold ring-1 ring-amber-400/40'
                              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                          }`}
                          title={`Jump to ${formatTime(cue.start)}`}
                        >
                          {cue.text}{' '}
                        </span>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SPOILER-FREE RECAP (Shelf Feature) */}
          {activeTab === 'recap' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <BrainCircuit className="w-4 h-4 text-purple-400" />
                  <span>Story Recap • What Just Happened?</span>
                </h4>
                <button
                  onClick={handleGenerateRecap}
                  disabled={isGeneratingRecap}
                  className="text-xs text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Repeat className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-[11px] text-purple-300 font-mono">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Narrative up to {formatTime(currentTime)} (Spoiler-Free)</span>
                </div>

                {isGeneratingRecap ? (
                  <div className="py-8 text-center text-xs text-slate-400 space-y-2">
                    <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p>Analyzing recent narration...</p>
                  </div>
                ) : (
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-serif">
                    {recapText || `You are listening at ${formatTime(currentTime)}. Click refresh to summarize the last 10 minutes of narration.`}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: MULTI-PARTS DRAWER */}
          {activeTab === 'parts' && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span>Audiobook Parts & Volumes ({parts.length})</span>
                </h4>
                <span className="text-[11px] text-slate-400 font-mono">Continuous Autoplay</span>
              </div>

              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {parts.map((p, idx) => {
                  const isCurrent = currentPartIdx === idx;
                  return (
                    <div
                      key={p.id || idx}
                      onClick={() => {
                        playPart(idx);
                        setActiveTab('player');
                      }}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isCurrent
                          ? 'bg-amber-500/15 border-amber-500/40 text-white shadow-md'
                          : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-855 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                            isCurrent ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {p.partNumber || idx + 1}
                        </div>
                        <div>
                          <h5 className="text-xs sm:text-sm font-bold truncate">{p.title}</h5>
                          {p.duration && <p className="text-[11px] text-slate-400 font-mono">{p.duration}</p>}
                        </div>
                      </div>

                      {isCurrent && (
                        <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                          {isPlaying ? 'Playing Now' : 'Selected'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 6: BOOKMARKS & SAVED NOTES */}
          {activeTab === 'bookmarks' && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Bookmark className="w-4 h-4 text-amber-400" />
                  <span>Saved Bookmarks ({bookmarks.length})</span>
                </h4>
                <button
                  onClick={() => setShowAddBookmarkInput(true)}
                  className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New</span>
                </button>
              </div>

              {bookmarks.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                  <Bookmark className="w-8 h-8 text-slate-600 mx-auto" />
                  <p>No bookmarks saved yet.</p>
                  <p className="text-slate-500">Tap "Bookmark" while listening or press B to save memorable moments.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {bookmarks.map((bm) => (
                    <div
                      key={bm.id}
                      className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-all"
                    >
                      <div
                        onClick={() => {
                          seekTo(bm.timestamp);
                          setActiveTab('player');
                        }}
                        className="min-w-0 flex-1 cursor-pointer"
                      >
                        <span className="text-xs font-mono font-bold text-amber-400">
                          {formatTime(bm.timestamp)}
                        </span>
                        <p className="text-xs text-white font-medium truncate mt-0.5">{bm.note}</p>
                      </div>

                      <button
                        onClick={() => handleDeleteBookmark(bm.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Delete Bookmark"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 7: AUDIO STREAM SOURCES */}
          {activeTab === 'sources' && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Audio Stream Sources</span>
                </h4>
                <span className="text-[11px] text-slate-400 font-mono">1-Click Switch</span>
              </div>

              <div className="space-y-2.5">
                {sources.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => {
                      switchAudioSource(s.id);
                      setActiveTab('player');
                    }}
                    className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 transition-all cursor-pointer flex items-center justify-between gap-3"
                  >
                    <div>
                      <h5 className="text-xs sm:text-sm font-bold text-white">{s.name}</h5>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {s.type.toUpperCase()} • {s.duration || 'Full Stream'}
                      </p>
                    </div>

                    <button className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors">
                      Switch
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cast Modal */}
      {showCastModal && (
        <CastModal
          isOpen={showCastModal}
          onClose={() => setShowCastModal(false)}
          title={book.title}
          subtitle={`By ${book.author}`}
          mediaUrl={book.audioUrl || ''}
          posterUrl={book.cover}
        />
      )}
    </div>
  );
};

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { Audiobook } from '../types/audiobook';
import { Anime } from '../types/anime';
import { MediaItem } from '../types/media';
import { SportsMatch } from '../types/sports';

export type ActiveMedia =
  | {
      type: 'audiobook';
      item: Audiobook;
      isPlaying: boolean;
      currentTime: number;
      duration: number;
      speed: number;
      currentChapterIndex: number;
      volume: number;
      isMuted: boolean;
    }
  | { type: 'anime'; item: Anime; episode: number; serverUrl?: string }
  | { type: 'media'; item: MediaItem; season?: number; episode?: number; serverUrl?: string }
  | { type: 'sports'; item: SportsMatch; serverUrl?: string }
  | null;

interface PlaybackContextType {
  activeMedia: ActiveMedia;
  isMinimized: boolean;
  sleepTimerMinutes: number | null;
  sleepTimerSecondsLeft: number | null;
  playAudiobook: (book: Audiobook, chapterIndex?: number) => void;
  playAnime: (anime: Anime, episode: number) => void;
  playMedia: (item: MediaItem, season?: number, episode?: number) => void;
  playSports: (match: SportsMatch) => void;
  minimizePlayer: () => void;
  expandPlayer: () => void;
  closePlayer: () => void;
  togglePlayPause: () => void;
  seekTo: (seconds: number) => void;
  skipForward: (seconds?: number) => void;
  skipBackward: (seconds?: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  setSleepTimer: (minutes: number | null) => void;
  playChapter: (chapterIndex: number) => void;
  nextChapter: () => void;
  prevChapter: () => void;
  setVolume: (val: number) => void;
  toggleMute: () => void;
}

const PlaybackContext = createContext<PlaybackContextType | undefined>(undefined);

const POS_STORAGE_PREFIX = 'omnistream_audio_pos_';
const LAST_PAUSED_PREFIX = 'omnistream_audio_paused_';

export const PlaybackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeMedia, setActiveMedia] = useState<ActiveMedia>(null);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
  const [sleepTimerSecondsLeft, setSleepTimerSecondsLeft] = useState<number | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Position Auto-Saver (every 3 seconds)
  useEffect(() => {
    if (activeMedia?.type === 'audiobook' && activeMedia.isPlaying) {
      const bookId = activeMedia.item.id;
      const pos = activeMedia.currentTime;
      try {
        localStorage.setItem(`${POS_STORAGE_PREFIX}${bookId}`, pos.toString());
      } catch (e) {}
    }
  }, [activeMedia?.type === 'audiobook' ? activeMedia?.currentTime : null]);

  // Sleep Timer Countdown & Volume Fade-out
  useEffect(() => {
    if (sleepTimerSecondsLeft === null) return;

    if (sleepTimerSecondsLeft <= 0) {
      if (activeMedia?.type === 'audiobook') {
        setActiveMedia((prev) =>
          prev && prev.type === 'audiobook' ? { ...prev, isPlaying: false } : prev
        );
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.volume = 1.0;
        }
      }
      setSleepTimerMinutes(null);
      setSleepTimerSecondsLeft(null);
      return;
    }

    // Smooth volume fade in the final 60 seconds
    if (sleepTimerSecondsLeft <= 60 && audioRef.current && activeMedia?.type === 'audiobook') {
      const targetVol = Math.max(0.05, (sleepTimerSecondsLeft / 60) * activeMedia.volume);
      audioRef.current.volume = targetVol;
    }

    const timer = setInterval(() => {
      setSleepTimerSecondsLeft((prev) => (prev !== null && prev > 0 ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(timer);
  }, [sleepTimerSecondsLeft, activeMedia]);

  // Synchronize native audio element with active chapter and stream
  useEffect(() => {
    if (activeMedia?.type === 'audiobook' && audioRef.current) {
      const currentChapter = activeMedia.item.chapters?.[activeMedia.currentChapterIndex];
      const targetUrl = currentChapter?.audioUrl || activeMedia.item.audioUrl || '';

      if (targetUrl && audioRef.current.src !== targetUrl) {
        audioRef.current.src = targetUrl;
        audioRef.current.currentTime = activeMedia.currentTime;
      }

      audioRef.current.playbackRate = activeMedia.speed;
      audioRef.current.volume = activeMedia.isMuted ? 0 : activeMedia.volume;

      if (activeMedia.isPlaying && targetUrl) {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    }
  }, [
    activeMedia?.type === 'audiobook' ? activeMedia?.isPlaying : null,
    activeMedia?.type === 'audiobook' ? activeMedia?.speed : null,
    activeMedia?.type === 'audiobook' ? activeMedia?.currentChapterIndex : null,
    activeMedia?.type === 'audiobook' ? activeMedia?.volume : null,
    activeMedia?.type === 'audiobook' ? activeMedia?.isMuted : null
  ]);

  const playAudiobook = useCallback((book: Audiobook, chapterIndex: number = 0) => {
    let resumePos = book.lastPosition || 0;
    try {
      const savedPos = localStorage.getItem(`${POS_STORAGE_PREFIX}${book.id}`);
      if (savedPos) {
        resumePos = parseFloat(savedPos) || 0;
      }
      const lastPaused = localStorage.getItem(`${LAST_PAUSED_PREFIX}${book.id}`);
      if (lastPaused) {
        const elapsed = (Date.now() - parseInt(lastPaused, 10)) / 1000;
        if (elapsed > 180 && resumePos > 6) {
          resumePos -= 6;
        }
      }
    } catch (e) {}

    const chapters = book.chapters || [];
    const safeChapterIndex = Math.min(Math.max(0, chapterIndex), Math.max(0, chapters.length - 1));
    const activeChapter = chapters[safeChapterIndex];
    const initialDuration = activeChapter?.endTime || book.durationSeconds || 3600 * 5;

    setActiveMedia({
      type: 'audiobook',
      item: book,
      isPlaying: true,
      currentTime: chapterIndex > 0 ? 0 : resumePos,
      duration: initialDuration,
      speed: 1.0,
      currentChapterIndex: safeChapterIndex,
      volume: 1.0,
      isMuted: false
    });
    setIsMinimized(false);
  }, []);

  const playChapter = useCallback((chapterIndex: number) => {
    setActiveMedia((prev) => {
      if (!prev || prev.type !== 'audiobook') return prev;
      const chapters = prev.item.chapters || [];
      if (chapterIndex < 0 || chapterIndex >= chapters.length) return prev;
      const ch = chapters[chapterIndex];

      if (audioRef.current && ch.audioUrl) {
        audioRef.current.src = ch.audioUrl;
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }

      return {
        ...prev,
        currentChapterIndex: chapterIndex,
        currentTime: 0,
        isPlaying: true,
        duration: ch.endTime || prev.duration
      };
    });
  }, []);

  const nextChapter = useCallback(() => {
    if (activeMedia?.type === 'audiobook') {
      const chapters = activeMedia.item.chapters || [];
      if (activeMedia.currentChapterIndex < chapters.length - 1) {
        playChapter(activeMedia.currentChapterIndex + 1);
      }
    }
  }, [activeMedia, playChapter]);

  const prevChapter = useCallback(() => {
    if (activeMedia?.type === 'audiobook') {
      if (activeMedia.currentChapterIndex > 0) {
        playChapter(activeMedia.currentChapterIndex - 1);
      } else {
        seekTo(0);
      }
    }
  }, [activeMedia, playChapter]);

  const setVolume = useCallback((val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    setActiveMedia((prev) => (prev && prev.type === 'audiobook' ? { ...prev, volume: clamped, isMuted: clamped === 0 } : prev));
    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
  }, []);

  const toggleMute = useCallback(() => {
    setActiveMedia((prev) => {
      if (!prev || prev.type !== 'audiobook') return prev;
      const nextMuted = !prev.isMuted;
      if (audioRef.current) {
        audioRef.current.volume = nextMuted ? 0 : prev.volume;
      }
      return { ...prev, isMuted: nextMuted };
    });
  }, []);

  const playAnime = useCallback((anime: Anime, episode: number) => {
    setActiveMedia({ type: 'anime', item: anime, episode });
    setIsMinimized(false);
  }, []);

  const playMedia = useCallback((item: MediaItem, season: number = 1, episode: number = 1) => {
    setActiveMedia({ type: 'media', item, season, episode });
    setIsMinimized(false);
  }, []);

  const playSports = useCallback((match: SportsMatch) => {
    setActiveMedia({ type: 'sports', item: match });
    setIsMinimized(false);
  }, []);

  const minimizePlayer = useCallback(() => setIsMinimized(true), []);
  const expandPlayer = useCallback(() => setIsMinimized(false), []);

  const closePlayer = useCallback(() => {
    if (activeMedia?.type === 'audiobook') {
      try {
        localStorage.setItem(`${LAST_PAUSED_PREFIX}${activeMedia.item.id}`, Date.now().toString());
      } catch (e) {}
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current.volume = 1.0;
    }
    setActiveMedia(null);
    setIsMinimized(false);
    setSleepTimerMinutes(null);
    setSleepTimerSecondsLeft(null);
  }, [activeMedia]);

  const togglePlayPause = useCallback(() => {
    if (activeMedia && activeMedia.type === 'audiobook') {
      const nextPlaying = !activeMedia.isPlaying;
      if (!nextPlaying) {
        try {
          localStorage.setItem(`${LAST_PAUSED_PREFIX}${activeMedia.item.id}`, Date.now().toString());
        } catch (e) {}
      }
      setActiveMedia({ ...activeMedia, isPlaying: nextPlaying });
      if (audioRef.current) {
        if (nextPlaying) audioRef.current.play().catch(() => {});
        else audioRef.current.pause();
      }
    }
  }, [activeMedia]);

  const seekTo = useCallback((seconds: number) => {
    if (activeMedia && activeMedia.type === 'audiobook') {
      const clamped = Math.max(0, Math.min(activeMedia.duration || 3600 * 5, seconds));
      setActiveMedia({ ...activeMedia, currentTime: clamped });
      if (audioRef.current) {
        audioRef.current.currentTime = clamped;
      }
      try {
        localStorage.setItem(`${POS_STORAGE_PREFIX}${activeMedia.item.id}`, clamped.toString());
      } catch (e) {}
    }
  }, [activeMedia]);

  const skipForward = useCallback((seconds: number = 30) => {
    if (activeMedia && activeMedia.type === 'audiobook') {
      seekTo(activeMedia.currentTime + seconds);
    }
  }, [activeMedia, seekTo]);

  const skipBackward = useCallback((seconds: number = 15) => {
    if (activeMedia && activeMedia.type === 'audiobook') {
      seekTo(activeMedia.currentTime - seconds);
    }
  }, [activeMedia, seekTo]);

  const setPlaybackSpeed = useCallback((speed: number) => {
    if (activeMedia && activeMedia.type === 'audiobook') {
      setActiveMedia({ ...activeMedia, speed });
      if (audioRef.current) {
        audioRef.current.playbackRate = speed;
      }
    }
  }, [activeMedia]);

  const setSleepTimer = useCallback((minutes: number | null) => {
    if (minutes === null || minutes <= 0) {
      setSleepTimerMinutes(null);
      setSleepTimerSecondsLeft(null);
      if (audioRef.current) audioRef.current.volume = 1.0;
    } else {
      setSleepTimerMinutes(minutes);
      setSleepTimerSecondsLeft(minutes * 60);
      if (audioRef.current) audioRef.current.volume = 1.0;
    }
  }, []);

  const currentYoutubeId =
    activeMedia?.type === 'audiobook' && activeMedia.item.youtubeId
      ? activeMedia.item.youtubeId
      : null;

  return (
    <PlaybackContext.Provider
      value={{
        activeMedia,
        isMinimized,
        sleepTimerMinutes,
        sleepTimerSecondsLeft,
        playAudiobook,
        playAnime,
        playMedia,
        playSports,
        minimizePlayer,
        expandPlayer,
        closePlayer,
        togglePlayPause,
        seekTo,
        skipForward,
        skipBackward,
        setPlaybackSpeed,
        setSleepTimer,
        playChapter,
        nextChapter,
        prevChapter,
        setVolume,
        toggleMute
      }}
    >
      {children}

      {/* Hidden Persistent Audio Element */}
      <audio
        ref={audioRef}
        className="hidden"
        onTimeUpdate={() => {
          if (audioRef.current && activeMedia?.type === 'audiobook') {
            setActiveMedia((prev) =>
              prev && prev.type === 'audiobook'
                ? {
                    ...prev,
                    currentTime: audioRef.current?.currentTime || prev.currentTime,
                    duration: audioRef.current?.duration || prev.duration
                  }
                : prev
            );
          }
        }}
        onLoadedMetadata={() => {
          if (audioRef.current && activeMedia?.type === 'audiobook' && audioRef.current.duration) {
            setActiveMedia((prev) =>
              prev && prev.type === 'audiobook'
                ? {
                    ...prev,
                    duration: audioRef.current?.duration || prev.duration
                  }
                : prev
            );
          }
        }}
        onEnded={() => {
          if (activeMedia?.type === 'audiobook') {
            const chapters = activeMedia.item.chapters || [];
            if (activeMedia.currentChapterIndex < chapters.length - 1) {
              playChapter(activeMedia.currentChapterIndex + 1);
            } else {
              setActiveMedia((prev) =>
                prev && prev.type === 'audiobook' ? { ...prev, isPlaying: false } : prev
              );
            }
          }
        }}
      />

      {/* Hidden Persistent YouTube Audio Player for YouTube audiobooks */}
      {currentYoutubeId && isMinimized && (
        <div className="opacity-0 pointer-events-none fixed -top-96 -left-96 w-1 h-1 overflow-hidden">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${currentYoutubeId}?autoplay=1&enablejsapi=1`}
            title="Persistent Background Stream"
            allow="autoplay"
            className="w-1 h-1"
          />
        </div>
      )}
    </PlaybackContext.Provider>
  );
};

export const usePlayback = () => {
  const context = useContext(PlaybackContext);
  if (!context) {
    throw new Error('usePlayback must be used within a PlaybackProvider');
  }
  return context;
};

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { Audiobook, AudiobookChapter, AudiobookPart, AudiobookSource } from '../types/audiobook';
import { Anime } from '../types/anime';
import { MediaItem } from '../types/media';
import { SportsMatch } from '../types/sports';
import { audiobookStorage } from '../services/audiobookStorage';

export type ActiveMedia =
  | {
      type: 'audiobook';
      item: Audiobook;
      isPlaying: boolean;
      currentTime: number;
      duration: number;
      speed: number;
      currentChapterIndex: number;
      currentPartIndex: number;
      selectedSourceId?: string;
      volume: number;
      isMuted: boolean;
      activeStreamType: 'audio' | 'youtube';
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
  playAudiobook: (book: Audiobook, chapterIndex?: number, partIndex?: number) => void;
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
  playPart: (partIndex: number) => void;
  nextPart: () => void;
  prevPart: () => void;
  switchAudioSource: (sourceId: string) => void;
  setVolume: (val: number) => void;
  toggleMute: () => void;
}

const PlaybackContext = createContext<PlaybackContextType | undefined>(undefined);

export const PlaybackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeMedia, setActiveMedia] = useState<ActiveMedia>(null);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
  const [sleepTimerSecondsLeft, setSleepTimerSecondsLeft] = useState<number | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytIframeRef = useRef<HTMLIFrameElement | null>(null);

  // Position Auto-Saver (every 2 seconds)
  useEffect(() => {
    if (activeMedia?.type === 'audiobook' && activeMedia.isPlaying) {
      audiobookStorage.saveProgress({
        bookId: activeMedia.item.id,
        title: activeMedia.item.title,
        author: activeMedia.item.author,
        cover: activeMedia.item.cover,
        currentTime: activeMedia.currentTime,
        duration: activeMedia.duration,
        currentChapterIndex: activeMedia.currentChapterIndex,
        currentPartIndex: activeMedia.currentPartIndex,
        lastPlayedAt: Date.now(),
        completed: activeMedia.duration > 0 && activeMedia.currentTime >= activeMedia.duration - 30,
        percent: activeMedia.duration > 0 ? Math.min(100, Math.round((activeMedia.currentTime / activeMedia.duration) * 100)) : 0
      });
    }
  }, [activeMedia?.type === 'audiobook' ? Math.floor(activeMedia?.currentTime || 0) : null]);

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
        sendYtCommand('pauseVideo');
      }
      setSleepTimerMinutes(null);
      setSleepTimerSecondsLeft(null);
      return;
    }

    if (sleepTimerSecondsLeft <= 60 && audioRef.current && activeMedia?.type === 'audiobook') {
      const targetVol = Math.max(0.05, (sleepTimerSecondsLeft / 60) * activeMedia.volume);
      audioRef.current.volume = targetVol;
    }

    const timer = setInterval(() => {
      setSleepTimerSecondsLeft((prev) => (prev !== null && prev > 0 ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(timer);
  }, [sleepTimerSecondsLeft, activeMedia]);

  // Helper for sending YouTube IFrame commands
  const sendYtCommand = (func: string, args: any[] = []) => {
    if (ytIframeRef.current && ytIframeRef.current.contentWindow) {
      ytIframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func, args }),
        '*'
      );
    }
  };

  // Synchronize HTML5 Audio Element
  useEffect(() => {
    if (activeMedia?.type === 'audiobook' && audioRef.current) {
      const currentPart = activeMedia.item.parts?.[activeMedia.currentPartIndex];
      const currentChapter = (currentPart?.chapters || activeMedia.item.chapters)?.[activeMedia.currentChapterIndex];
      const targetUrl = currentChapter?.audioUrl || currentPart?.audioUrl || activeMedia.item.audioUrl || '';

      if (targetUrl) {
        if (audioRef.current.src !== targetUrl) {
          audioRef.current.src = targetUrl;
          audioRef.current.currentTime = activeMedia.currentTime;
        }
        audioRef.current.playbackRate = activeMedia.speed;
        audioRef.current.volume = activeMedia.isMuted ? 0 : activeMedia.volume;

        if (activeMedia.isPlaying) {
          audioRef.current.play().catch(() => {});
        } else {
          audioRef.current.pause();
        }
      } else {
        audioRef.current.pause();
      }
    }
  }, [
    activeMedia?.type === 'audiobook' ? activeMedia?.isPlaying : null,
    activeMedia?.type === 'audiobook' ? activeMedia?.speed : null,
    activeMedia?.type === 'audiobook' ? activeMedia?.currentChapterIndex : null,
    activeMedia?.type === 'audiobook' ? activeMedia?.currentPartIndex : null,
    activeMedia?.type === 'audiobook' ? activeMedia?.volume : null,
    activeMedia?.type === 'audiobook' ? activeMedia?.isMuted : null
  ]);

  // Play an Audiobook
  const playAudiobook = useCallback((book: Audiobook, chapterIndex: number = 0, partIndex: number = 0) => {
    // 1. Check saved listening progress from storage
    const saved = audiobookStorage.getProgress(book.id);
    let resumePos = chapterIndex === 0 && partIndex === 0 ? (saved?.currentTime || book.lastPosition || 0) : 0;
    const safeChapterIndex = chapterIndex !== 0 ? chapterIndex : (saved?.currentChapterIndex || 0);
    const safePartIndex = partIndex !== 0 ? partIndex : (saved?.currentPartIndex || 0);

    // Smart backstep (6 seconds) if paused a while ago
    if (saved?.lastPlayedAt && Date.now() - saved.lastPlayedAt > 180000 && resumePos > 6) {
      resumePos -= 6;
    }

    const initialDuration = book.durationSeconds || 3600 * 5;
    const hasDirectAudio = Boolean(book.audioUrl || book.chapters?.[0]?.audioUrl);

    // Clean reset previous audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    setActiveMedia({
      type: 'audiobook',
      item: book,
      isPlaying: true,
      currentTime: resumePos,
      duration: initialDuration,
      speed: 1.0,
      currentChapterIndex: safeChapterIndex,
      currentPartIndex: safePartIndex,
      selectedSourceId: book.sources?.[0]?.id,
      volume: 1.0,
      isMuted: false,
      activeStreamType: hasDirectAudio ? 'audio' : 'youtube'
    });
    setIsMinimized(false);

    // Auto-resolve full verified audio stream, chapters & multi-part tracks from the server
    if (!book.chapters || book.chapters.length === 0 || !book.audioUrl || book.platform === 'audible' || !book.parts) {
      fetch(`/api/audiobooks/resolve?title=${encodeURIComponent(book.title)}&author=${encodeURIComponent(book.author || '')}`)
        .then((r) => r.json())
        .then((resolved) => {
          if (resolved && (resolved.audioUrl || resolved.youtubeId || resolved.chapters || resolved.parts || resolved.sources)) {
            setActiveMedia((prev) => {
              if (!prev || prev.type !== 'audiobook' || prev.item.id !== book.id) return prev;

              const targetAudioUrl = resolved.audioUrl || prev.item.audioUrl || '';
              const targetYtId = resolved.youtubeId || prev.item.youtubeId;

              const updatedBook: Audiobook = {
                ...prev.item,
                audioUrl: targetAudioUrl,
                youtubeId: targetYtId,
                chapters: resolved.chapters || prev.item.chapters,
                parts: resolved.parts || prev.item.parts,
                sources: resolved.sources || prev.item.sources,
                durationSeconds: resolved.durationSeconds || prev.item.durationSeconds
              };

              const streamType = targetAudioUrl ? 'audio' : 'youtube';

              if (audioRef.current && targetAudioUrl && audioRef.current.src !== targetAudioUrl) {
                audioRef.current.src = targetAudioUrl;
                audioRef.current.currentTime = resumePos;
                audioRef.current.play().catch(() => {});
              }

              return {
                ...prev,
                item: updatedBook,
                activeStreamType: streamType,
                duration: resolved.durationSeconds || prev.duration
              };
            });
          }
        })
        .catch(() => {});
    }
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
        currentTime: ch.startTime || 0,
        isPlaying: true,
        duration: ch.endTime ? (ch.endTime - ch.startTime) : prev.duration
      };
    });
  }, []);

  const nextChapter = useCallback(() => {
    if (activeMedia?.type === 'audiobook') {
      const chapters = activeMedia.item.chapters || [];
      if (activeMedia.currentChapterIndex < chapters.length - 1) {
        playChapter(activeMedia.currentChapterIndex + 1);
      } else if (activeMedia.item.parts && activeMedia.currentPartIndex < activeMedia.item.parts.length - 1) {
        playPart(activeMedia.currentPartIndex + 1);
      }
    }
  }, [activeMedia, playChapter]);

  const prevChapter = useCallback(() => {
    if (activeMedia?.type === 'audiobook') {
      if (activeMedia.currentTime > 5) {
        seekTo(0);
      } else if (activeMedia.currentChapterIndex > 0) {
        playChapter(activeMedia.currentChapterIndex - 1);
      } else if (activeMedia.currentPartIndex > 0) {
        playPart(activeMedia.currentPartIndex - 1);
      }
    }
  }, [activeMedia, playChapter]);

  const playPart = useCallback((partIndex: number) => {
    setActiveMedia((prev) => {
      if (!prev || prev.type !== 'audiobook') return prev;
      const parts = prev.item.parts || [];
      if (partIndex < 0 || partIndex >= parts.length) return prev;
      const part = parts[partIndex];

      if (audioRef.current && part.audioUrl) {
        audioRef.current.src = part.audioUrl;
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }

      return {
        ...prev,
        currentPartIndex: partIndex,
        currentChapterIndex: 0,
        currentTime: 0,
        isPlaying: true,
        duration: part.durationSeconds || prev.duration,
        activeStreamType: part.audioUrl ? 'audio' : (part.youtubeId ? 'youtube' : prev.activeStreamType)
      };
    });
  }, []);

  const nextPart = useCallback(() => {
    if (activeMedia?.type === 'audiobook') {
      const parts = activeMedia.item.parts || [];
      if (activeMedia.currentPartIndex < parts.length - 1) {
        playPart(activeMedia.currentPartIndex + 1);
      }
    }
  }, [activeMedia, playPart]);

  const prevPart = useCallback(() => {
    if (activeMedia?.type === 'audiobook') {
      if (activeMedia.currentPartIndex > 0) {
        playPart(activeMedia.currentPartIndex - 1);
      } else {
        seekTo(0);
      }
    }
  }, [activeMedia, playPart]);

  const switchAudioSource = useCallback((sourceId: string) => {
    setActiveMedia((prev) => {
      if (!prev || prev.type !== 'audiobook') return prev;
      const source = prev.item.sources?.find((s) => s.id === sourceId);
      if (!source) return prev;

      const newStreamType = source.audioUrl ? 'audio' : 'youtube';
      if (audioRef.current && source.audioUrl) {
        audioRef.current.src = source.audioUrl;
        audioRef.current.currentTime = prev.currentTime;
        if (prev.isPlaying) audioRef.current.play().catch(() => {});
      } else if (audioRef.current) {
        audioRef.current.pause();
      }

      return {
        ...prev,
        selectedSourceId: sourceId,
        activeStreamType: newStreamType,
        duration: source.durationSeconds || prev.duration
      };
    });
  }, []);

  const setVolume = useCallback((val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    setActiveMedia((prev) => (prev && prev.type === 'audiobook' ? { ...prev, volume: clamped, isMuted: clamped === 0 } : prev));
    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
    sendYtCommand('setVolume', [clamped * 100]);
  }, []);

  const toggleMute = useCallback(() => {
    setActiveMedia((prev) => {
      if (!prev || prev.type !== 'audiobook') return prev;
      const nextMuted = !prev.isMuted;
      if (audioRef.current) {
        audioRef.current.volume = nextMuted ? 0 : prev.volume;
      }
      sendYtCommand(nextMuted ? 'mute' : 'unMute');
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
      audiobookStorage.saveProgress({
        bookId: activeMedia.item.id,
        title: activeMedia.item.title,
        author: activeMedia.item.author,
        cover: activeMedia.item.cover,
        currentTime: activeMedia.currentTime,
        duration: activeMedia.duration,
        currentChapterIndex: activeMedia.currentChapterIndex,
        currentPartIndex: activeMedia.currentPartIndex,
        lastPlayedAt: Date.now(),
        completed: false,
        percent: activeMedia.duration > 0 ? Math.min(100, Math.round((activeMedia.currentTime / activeMedia.duration) * 100)) : 0
      });
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current.volume = 1.0;
    }
    sendYtCommand('pauseVideo');
    setActiveMedia(null);
    setIsMinimized(false);
    setSleepTimerMinutes(null);
    setSleepTimerSecondsLeft(null);
  }, [activeMedia]);

  const togglePlayPause = useCallback(() => {
    if (activeMedia && activeMedia.type === 'audiobook') {
      const nextPlaying = !activeMedia.isPlaying;
      setActiveMedia({ ...activeMedia, isPlaying: nextPlaying });
      if (audioRef.current && activeMedia.activeStreamType === 'audio') {
        if (nextPlaying) audioRef.current.play().catch(() => {});
        else audioRef.current.pause();
      }
      sendYtCommand(nextPlaying ? 'playVideo' : 'pauseVideo');
    }
  }, [activeMedia]);

  const seekTo = useCallback((seconds: number) => {
    if (activeMedia && activeMedia.type === 'audiobook') {
      const clamped = Math.max(0, Math.min(activeMedia.duration || 3600 * 5, seconds));
      setActiveMedia({ ...activeMedia, currentTime: clamped });
      if (audioRef.current && activeMedia.activeStreamType === 'audio') {
        audioRef.current.currentTime = clamped;
      }
      sendYtCommand('seekTo', [clamped, true]);
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
      sendYtCommand('setPlaybackRate', [speed]);
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
    activeMedia?.type === 'audiobook'
      ? activeMedia.item.parts?.[activeMedia.currentPartIndex]?.youtubeId || activeMedia.item.youtubeId
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
        playPart,
        nextPart,
        prevPart,
        switchAudioSource,
        setVolume,
        toggleMute
      }}
    >
      {children}

      {/* Hidden Persistent HTML5 Audio Element */}
      <audio
        ref={audioRef}
        className="hidden"
        onTimeUpdate={() => {
          if (audioRef.current && activeMedia?.type === 'audiobook' && activeMedia.activeStreamType === 'audio') {
            const rawDur = audioRef.current.duration;
            const hasValidAudioDur = rawDur && !isNaN(rawDur) && rawDur > 60;
            setActiveMedia((prev) =>
              prev && prev.type === 'audiobook'
                ? {
                    ...prev,
                    currentTime: audioRef.current?.currentTime || prev.currentTime,
                    duration: hasValidAudioDur ? rawDur : (prev.duration || prev.item.durationSeconds || 3600)
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
            } else if (activeMedia.item.parts && activeMedia.currentPartIndex < activeMedia.item.parts.length - 1) {
              playPart(activeMedia.currentPartIndex + 1);
            } else {
              setActiveMedia((prev) =>
                prev && prev.type === 'audiobook' ? { ...prev, isPlaying: false } : prev
              );
            }
          }
        }}
      />

      {/* Background YouTube Audio Bridge */}
      {currentYoutubeId && activeMedia?.type === 'audiobook' && activeMedia.activeStreamType === 'youtube' && (
        <div className="opacity-0 pointer-events-none fixed -top-96 -left-96 w-1 h-1 overflow-hidden">
          <iframe
            ref={ytIframeRef}
            src={`https://www.youtube-nocookie.com/embed/${currentYoutubeId}?enablejsapi=1&autoplay=1&origin=${window.location.origin}`}
            title="Audiobook Stream Bridge"
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

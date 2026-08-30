import React from 'react';
import { usePlayback } from '../../context/PlaybackContext';
import {
  Play,
  Pause,
  Maximize2,
  X,
  Headphones,
  Tv,
  Film,
  Trophy,
  Moon,
  RotateCcw,
  RotateCw
} from 'lucide-react';

export const MiniPlayer: React.FC = () => {
  const {
    activeMedia,
    isMinimized,
    sleepTimerSecondsLeft,
    expandPlayer,
    closePlayer,
    togglePlayPause,
    skipBackward,
    skipForward,
    seekTo
  } = usePlayback();

  if (!activeMedia || !isMinimized) return null;

  const getMediaDetails = () => {
    switch (activeMedia.type) {
      case 'audiobook':
        return {
          title: activeMedia.item.title,
          subtitle: activeMedia.item.author || 'Audiobook',
          cover: activeMedia.item.cover,
          icon: Headphones,
          color: 'amber'
        };
      case 'anime':
        return {
          title: activeMedia.item.title.english || activeMedia.item.title.romaji,
          subtitle: `Episode ${activeMedia.episode}`,
          cover: activeMedia.item.coverImage.medium,
          icon: Tv,
          color: 'purple'
        };
      case 'media':
        return {
          title: activeMedia.item.title || activeMedia.item.name || 'Media',
          subtitle: activeMedia.season
            ? `S${activeMedia.season} E${activeMedia.episode}`
            : 'Movie',
          cover: activeMedia.item.poster_path
            ? `https://image.tmdb.org/t/p/w200${activeMedia.item.poster_path}`
            : undefined,
          icon: Film,
          color: 'indigo'
        };
      case 'sports':
        return {
          title: `${activeMedia.item.homeTeam.name} vs ${activeMedia.item.awayTeam.name}`,
          subtitle: activeMedia.item.league,
          cover: activeMedia.item.homeTeam.logo,
          icon: Trophy,
          color: 'rose'
        };
    }
  };

  const details = getMediaDetails();
  const Icon = details.icon;

  const isAudiobook = activeMedia.type === 'audiobook';
  const progressPercent =
    isAudiobook && activeMedia.duration > 0
      ? (activeMedia.currentTime / activeMedia.duration) * 100
      : 0;

  const formatSleepTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <aside
      aria-label="Media Mini Player"
      className="fixed bottom-5 right-5 z-50 animate-slide-up select-none"
    >
      <div className="relative flex flex-col rounded-2xl bg-slate-950/95 backdrop-blur-xl border border-slate-700/80 shadow-2xl shadow-black/80 hover:border-amber-500/50 transition-all max-w-xs sm:max-w-sm group overflow-hidden">
        <div className="flex items-center gap-3 p-2.5 pr-4">
          {/* Cover Art / Thumbnail */}
          <div
            onClick={expandPlayer}
            className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-800 flex-shrink-0 cursor-pointer group-hover:opacity-90 shadow-md"
          >
            {details.cover ? (
              <img
                src={details.cover}
                alt={details.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-slate-800 to-slate-700 text-slate-400">
                <Icon className="w-5 h-5" />
              </div>
            )}

            {/* Animated Sound Equalizer for Audiobooks */}
            {isAudiobook && activeMedia.isPlaying && (
              <div className="absolute inset-0 bg-black/40 flex items-end justify-center gap-0.5 pb-2">
                <span className="w-1 h-3 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1 h-5 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1 h-2 bg-amber-400 rounded-full animate-bounce" />
              </div>
            )}
          </div>

          {/* Media Info */}
          <div
            onClick={expandPlayer}
            className="flex-1 min-w-0 cursor-pointer"
          >
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <Icon className="w-2.5 h-2.5 text-amber-400" />
                {activeMedia.type}
              </span>
              {sleepTimerSecondsLeft !== null && (
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-700/50 flex items-center gap-0.5">
                  <Moon className="w-2.5 h-2.5" />
                  {formatSleepTime(sleepTimerSecondsLeft)}
                </span>
              )}
            </div>
            <h4 className="text-xs font-bold text-white truncate mt-0.5 group-hover:text-amber-400 transition-colors">
              {details.title}
            </h4>
            <p className="text-[11px] text-slate-400 truncate">
              {details.subtitle}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {isAudiobook && (
              <>
                <button
                  onClick={() => skipBackward(15)}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                  title="Rewind 15s"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={togglePlayPause}
                  className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-lg shadow-amber-500/20 transition-all hover:scale-105"
                  title={activeMedia.isPlaying ? 'Pause' : 'Play'}
                >
                  {activeMedia.isPlaying ? (
                    <Pause className="w-3.5 h-3.5 fill-current" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  )}
                </button>

                <button
                  onClick={() => skipForward(30)}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                  title="Forward 30s"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            <button
              onClick={expandPlayer}
              className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Expand Full Player"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={closePlayer}
              className="p-1.5 rounded-xl hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
              title="Close Playback"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Audiobook Progress Bar at Bottom of MiniPlayer */}
        {isAudiobook && (
          <div
            className="w-full h-1 bg-slate-800 cursor-pointer relative"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const ratio = Math.max(0, Math.min(1, clickX / rect.width));
              seekTo(ratio * activeMedia.duration);
            }}
          >
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-200"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>
    </aside>
  );
};

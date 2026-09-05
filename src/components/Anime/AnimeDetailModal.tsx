import React, { useState, useEffect } from 'react';
import { Anime, AnimeEpisode, AnimeWatchStatus } from '../../types/anime';
import { animeStorage } from '../../services/animeStorage';
import { api } from '../../services/api';
import {
  X,
  Play,
  Star,
  Calendar,
  Clock,
  Tv,
  Film,
  Bookmark,
  CheckCircle2,
  BookOpen,
  Volume2,
  Sparkles,
  ExternalLink,
  ChevronDown,
  Info
} from 'lucide-react';

interface AnimeDetailModalProps {
  anime: Anime | null;
  onClose: () => void;
  onPlayEpisode: (anime: Anime, episodeNumber: number) => void;
  onReadManga?: (title: string) => void;
  onAddToArr?: (media: {
    title: string;
    tmdbId?: number | string;
    type: 'movie' | 'tv' | 'anime';
    posterUrl?: string;
    year?: number | string;
    overview?: string;
  }) => void;
}

export const AnimeDetailModal: React.FC<AnimeDetailModalProps> = ({
  anime,
  onClose,
  onPlayEpisode,
  onReadManga,
  onAddToArr
}) => {
  const [audioType, setAudioType] = useState<'sub' | 'dub'>(() => animeStorage.getAudioPreference());
  const [watchStatus, setWatchStatus] = useState<AnimeWatchStatus>(() => {
    if (!anime) return 'plan_to_watch';
    const progress = animeStorage.getProgress(anime.id);
    return progress?.status || 'plan_to_watch';
  });
  const [episodes, setEpisodes] = useState<AnimeEpisode[]>(() => {
    if (!anime) return [];
    const count = anime.episodes || 12;
    return Array.from({ length: count }, (_, i) => ({
      number: i + 1,
      title: `Episode ${i + 1}`,
      thumbnail: anime.coverImage?.large || '',
      description: `Episode ${i + 1} of ${anime.title.english || anime.title.romaji || 'Anime'}`,
      isFiller: false
    }));
  });
  const [loadingEpisodes, setLoadingEpisodes] = useState<boolean>(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState<boolean>(false);

  useEffect(() => {
    if (!anime) return;
    const title = anime.title.english || anime.title.romaji || '';
    const totalEp = anime.episodes || 12;

    // Pre-seed if anime changes
    setEpisodes(
      Array.from({ length: totalEp }, (_, i) => ({
        number: i + 1,
        title: `Episode ${i + 1}`,
        thumbnail: anime.coverImage?.large || '',
        description: `Episode ${i + 1} of ${title}`,
        isFiller: false
      }))
    );

    api.getAnimeEpisodes(title, anime.id, totalEp)
      .then((data) => {
        if (data && data.length > 0) setEpisodes(data);
      })
      .catch(() => {});
  }, [anime]);

  if (!anime) return null;

  const title = anime.title.english || anime.title.romaji || anime.title.native || 'Anime Series';
  const coverUrl = anime.coverImage?.extraLarge || anime.coverImage?.large || '';
  const totalEpisodes = anime.episodes || episodes.length || 12;
  const currentProgress = animeStorage.getProgress(anime.id);

  const handleAudioChange = (type: 'sub' | 'dub') => {
    setAudioType(type);
    animeStorage.setAudioPreference(type);
  };

  const handleStatusChange = (status: AnimeWatchStatus) => {
    setWatchStatus(status);
    animeStorage.updateStatus(anime, status);
    setShowStatusDropdown(false);
  };

  const playButtonRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      playButtonRef.current?.focus();
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/60 hover:bg-black/90 text-slate-300 hover:text-white transition-all backdrop-blur-md cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto p-6 md:p-8 space-y-6">
          {/* Header Info */}
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {/* Poster */}
            <div className="w-36 sm:w-48 aspect-[2/3] rounded-2xl overflow-hidden bg-slate-800 shadow-2xl flex-shrink-0 border border-slate-700/60 relative">
              <img
                src={coverUrl}
                alt={title}
                className="w-full h-full object-cover"
              />
              {currentProgress && (
                <div className="absolute bottom-0 inset-x-0 bg-black/80 backdrop-blur-md p-1.5 text-center text-[10px] text-purple-300 font-bold border-t border-purple-500/30">
                  Watched Ep {currentProgress.episodeNumber} of {totalEpisodes}
                </div>
              )}
            </div>

            {/* Metadata & Title */}
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {anime.format || 'Anime'}
                </span>
                {anime.seasonYear && (
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {anime.seasonYear}
                  </span>
                )}
                {anime.averageScore && (
                  <span className="text-xs text-amber-400 font-bold flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    {(anime.averageScore / 10).toFixed(1)} / 10
                  </span>
                )}
                {anime.status && (
                  <span className="text-xs text-emerald-400 font-medium">
                    ● {anime.status}
                  </span>
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                {title}
              </h2>

              {anime.title.romaji && anime.title.romaji !== title && (
                <p className="text-xs text-slate-400 italic">
                  {anime.title.romaji}
                </p>
              )}

              {/* Sub / Dub Selector & Watchlist Dropdown */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {/* Sub / Dub Switcher */}
                <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
                  <button
                    onClick={() => handleAudioChange('sub')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      audioType === 'sub'
                        ? 'bg-purple-600 text-white font-black shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    SUB (Japanese)
                  </button>
                  <button
                    onClick={() => handleAudioChange('dub')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      audioType === 'dub'
                        ? 'bg-purple-600 text-white font-black shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    DUB (English)
                  </button>
                </div>

                {/* Watchlist Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Bookmark className="w-3.5 h-3.5 text-purple-400" />
                    <span className="capitalize">{watchStatus.replace(/_/g, ' ')}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {showStatusDropdown && (
                    <div className="absolute left-0 mt-1.5 w-40 rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl p-1.5 z-30 space-y-1 text-xs animate-in zoom-in-95">
                      {(['watching', 'plan_to_watch', 'completed', 'on_hold', 'dropped'] as AnimeWatchStatus[]).map((s) => (
                        <button
                          key={s}
                          onClick={() => handleStatusChange(s)}
                          className={`w-full text-left px-3 py-1.5 rounded-xl transition-colors capitalize font-semibold ${
                            watchStatus === s ? 'bg-purple-600 text-white' : 'text-slate-300 hover:bg-slate-900'
                          }`}
                        >
                          {s.replace(/_/g, ' ')}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons: Start Episode 1, Resume, Read Manga */}
              <div className="flex items-center gap-2.5 pt-2 flex-wrap">
                <button
                  ref={playButtonRef}
                  autoFocus
                  tabIndex={0}
                  role="button"
                  data-focusable="true"
                  onClick={() => onPlayEpisode(anime, currentProgress?.episodeNumber || 1)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.keyCode === 13 || e.keyCode === 23) {
                      e.preventDefault();
                      onPlayEpisode(anime, currentProgress?.episodeNumber || 1);
                    }
                  }}
                  className="px-6 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 focus:bg-purple-500 text-white font-black text-xs sm:text-sm shadow-xl shadow-purple-600/40 flex items-center gap-2.5 transition-all hover:scale-105 focus:scale-105 focus:ring-4 focus:ring-amber-400 focus:border-amber-400 cursor-pointer"
                >
                  <Play className="w-5 h-5 fill-current text-white" />
                  <span>
                    {currentProgress ? `Resume Ep ${currentProgress.episodeNumber}` : 'Start Episode 1'}
                  </span>
                </button>

                {/* Read Manga Bridge */}
                {onReadManga && (
                  <button
                    onClick={() => {
                      onClose();
                      onReadManga(title);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all hover:scale-105 cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4 text-sky-400" />
                    <span>Read Manga</span>
                  </button>
                )}

                {/* Add to Sonarr */}
                {onAddToArr && (
                  <button
                    onClick={() =>
                      onAddToArr({
                        title,
                        type: 'anime',
                        posterUrl: anime.coverImage?.large,
                        year: anime.seasonYear,
                        overview: anime.description
                      })
                    }
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all hover:scale-105 cursor-pointer"
                    title="Add to Sonarr (Anime PVR)"
                  >
                    <Tv className="w-4 h-4 text-sky-400" />
                    <span>Add to Sonarr</span>
                  </button>
                )}
              </div>

              {/* Genres */}
              {anime.genres && anime.genres.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {anime.genres.map((g, idx) => (
                    <span key={idx} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700/50">
                      {g}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Synopsis */}
          {anime.description && (
            <div className="space-y-1.5 border-t border-slate-800 pt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Synopsis</h4>
              <p className="text-xs md:text-sm text-slate-300 leading-relaxed max-h-36 overflow-y-auto pr-2">
                {anime.description.replace(/<[^>]*>?/gm, '')}
              </p>
            </div>
          )}

          {/* Rich Episodes Section */}
          <div className="space-y-3 border-t border-slate-800 pt-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Tv className="w-4 h-4 text-purple-400" />
                <span>Episodes ({totalEpisodes})</span>
              </h4>
              <span className="text-xs text-purple-400 font-semibold uppercase tracking-wider">
                {audioType} • 1080p Stream
              </span>
            </div>

            {loadingEpisodes ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 animate-pulse">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-20 rounded-2xl bg-slate-800 border border-slate-700/60" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto pr-1">
                {episodes.map((ep) => {
                  const isCurrent = currentProgress?.episodeNumber === ep.number;
                  return (
                    <div
                      key={ep.number}
                      onClick={() => onPlayEpisode(anime, ep.number)}
                      className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 group ${
                        isCurrent
                          ? 'bg-purple-950/60 border-purple-500 shadow-md'
                          : 'bg-slate-950/70 border-slate-800 hover:border-purple-500/60 hover:bg-slate-800/60'
                      }`}
                    >
                      {/* Thumbnail or Fallback */}
                      <div className="w-16 h-12 rounded-xl bg-slate-900 overflow-hidden relative flex-shrink-0 border border-slate-800">
                        <img
                          src={ep.thumbnail || coverUrl}
                          alt={ep.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Play className="w-4 h-4 fill-white text-white" />
                        </div>
                      </div>

                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11px] font-black text-purple-300">
                            Ep {ep.number}
                          </span>
                          {ep.duration && (
                            <span className="text-[10px] text-slate-500">{ep.duration}m</span>
                          )}
                        </div>
                        <h5 className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors truncate">
                          {ep.title || `Episode ${ep.number}`}
                        </h5>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

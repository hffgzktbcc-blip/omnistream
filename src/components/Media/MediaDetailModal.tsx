import React, { useState } from 'react';
import { MediaItem, TVSeason } from '../../types/media';
import { X, Play, Star, Calendar, Clock, Film, Tv, Clapperboard, Download } from 'lucide-react';

interface MediaDetailModalProps {
  item: MediaItem | null;
  onClose: () => void;
  onPlayMedia: (item: MediaItem, season?: number, episode?: number) => void;
  onAddToArr?: (media: {
    title: string;
    tmdbId?: number | string;
    type: 'movie' | 'tv' | 'anime';
    posterUrl?: string;
    year?: number | string;
    overview?: string;
  }) => void;
}

export const MediaDetailModal: React.FC<MediaDetailModalProps> = ({
  item,
  onClose,
  onPlayMedia,
  onAddToArr
}) => {
  const [selectedSeason, setSelectedSeason] = useState<number>(1);

  if (!item) return null;

  const title = item.title || item.name || item.original_title || item.original_name || 'Media';
  const isMovie = item.media_type === 'movie' || !!item.title;
  const releaseYear = (item.release_date || item.first_air_date || '').slice(0, 4);

  const posterUrl = item.poster_path
    ? item.poster_path.startsWith('http')
      ? item.poster_path
      : `https://image.tmdb.org/t/p/w500${item.poster_path}`
    : '';

  const backdropUrl = item.backdrop_path
    ? item.backdrop_path.startsWith('http')
      ? item.backdrop_path
      : `https://image.tmdb.org/t/p/original${item.backdrop_path}`
    : '';

  const totalSeasons = item.number_of_seasons || 1;
  const totalEpisodes = item.number_of_episodes || (totalSeasons * 10);
  const episodesInCurrentSeason = Math.min(Math.ceil(totalEpisodes / totalSeasons), 24);

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          tabIndex={0}
          title="Close (Esc)"
          aria-label="Close details"
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/60 hover:bg-black/90 text-slate-300 hover:text-white transition-all backdrop-blur-md focus:ring-2 focus:ring-amber-400"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Backdrop Banner */}
        <div className="relative h-48 sm:h-64 w-full overflow-hidden bg-slate-950 flex-shrink-0">
          {backdropUrl ? (
            <img
              src={backdropUrl}
              alt={title}
              className="w-full h-full object-cover opacity-40"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-950" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 md:p-8 -mt-24 sm:-mt-32 relative z-10 space-y-6">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {/* Poster Card */}
            <div className="w-36 sm:w-48 aspect-[2/3] rounded-2xl overflow-hidden bg-slate-800 shadow-2xl flex-shrink-0 border border-slate-700/60 relative">
              {posterUrl ? (
                <img
                  src={posterUrl}
                  alt={title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center text-slate-500">
                  {isMovie ? <Film className="w-12 h-12 mb-2" /> : <Tv className="w-12 h-12 mb-2" />}
                  <span className="text-xs">{title}</span>
                </div>
              )}
            </div>

            {/* Metadata & Title */}
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {isMovie ? 'Feature Film' : 'TV Series'}
                </span>
                {releaseYear && (
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {releaseYear}
                  </span>
                )}
                {item.vote_average !== undefined && item.vote_average > 0 && (
                  <span className="text-xs text-amber-400 font-bold flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    {item.vote_average.toFixed(1)} / 10
                  </span>
                )}
                {item.runtime && (
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {item.runtime} mins
                  </span>
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                {title}
              </h2>

              {item.tagline && (
                <p className="text-xs text-slate-400 italic">
                  &ldquo;{item.tagline}&rdquo;
                </p>
              )}

              {/* Primary Action Buttons */}
              <div className="flex items-center gap-3 pt-2 flex-wrap">
                <button
                  ref={playButtonRef}
                  autoFocus
                  tabIndex={0}
                  role="button"
                  data-focusable="true"
                  onClick={() => onPlayMedia(item, isMovie ? undefined : selectedSeason, 1)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.keyCode === 13 || e.keyCode === 23) {
                      e.preventDefault();
                      onPlayMedia(item, isMovie ? undefined : selectedSeason, 1);
                    }
                  }}
                  className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 focus:bg-indigo-500 text-white font-black text-xs sm:text-sm shadow-xl shadow-indigo-600/40 flex items-center gap-2.5 transition-all hover:scale-105 focus:scale-105 focus:ring-4 focus:ring-amber-400 focus:border-amber-400 cursor-pointer"
                >
                  <Play className="w-5 h-5 fill-current text-white" />
                  <span>{isMovie ? 'Stream Full Movie' : `Stream Season ${selectedSeason} Ep 1`}</span>
                </button>

                {onAddToArr && (
                  <button
                    onClick={() =>
                      onAddToArr({
                        title,
                        tmdbId: item.id,
                        type: isMovie ? 'movie' : 'tv',
                        posterUrl,
                        year: releaseYear,
                        overview: item.overview
                      })
                    }
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all hover:scale-105 cursor-pointer"
                    title={`Add to ${isMovie ? 'Radarr' : 'Sonarr'}`}
                  >
                    <Download className="w-4 h-4 text-cyan-400" />
                    <span>{isMovie ? 'Add to Radarr' : 'Add to Sonarr'}</span>
                  </button>
                )}
              </div>

              {/* Genres */}
              {item.genres && item.genres.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {item.genres.map((g) => (
                    <span key={g.id} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700/50">
                      {g.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Synopsis */}
          {item.overview && (
            <div className="space-y-1.5 border-t border-slate-800 pt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Overview</h4>
              <p className="text-xs md:text-sm text-slate-300 leading-relaxed max-h-36 overflow-y-auto pr-2">
                {item.overview}
              </p>
            </div>
          )}

          {/* TV Series Season & Episode Guide */}
          {!isMovie && (
            <div className="space-y-4 border-t border-slate-800 pt-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Tv className="w-4 h-4 text-indigo-400" />
                  <span>Episodes & Seasons</span>
                </h4>

                {/* Season Dropdown */}
                {totalSeasons > 1 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Season:</span>
                    <select
                      value={selectedSeason}
                      onChange={(e) => setSelectedSeason(parseInt(e.target.value))}
                      className="bg-slate-800 text-slate-200 text-xs px-3 py-1.5 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                    >
                      {Array.from({ length: totalSeasons }, (_, i) => i + 1).map((sNum) => (
                        <option key={sNum} value={sNum}>
                          Season {sNum}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Episode Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-56 overflow-y-auto pr-1">
                {Array.from({ length: episodesInCurrentSeason }, (_, i) => i + 1).map((epNum) => (
                  <button
                    key={epNum}
                    onClick={() => onPlayMedia(item, selectedSeason, epNum)}
                    className="group flex items-center justify-between p-2.5 rounded-xl bg-slate-800/70 hover:bg-indigo-600 hover:text-white border border-slate-700/60 hover:border-indigo-500 transition-all text-xs font-bold text-slate-200"
                  >
                    <span>S{selectedSeason} E{epNum}</span>
                    <Play className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:fill-current transition-all" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

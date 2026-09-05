import React, { useState } from 'react';
import { MediaItem } from '../../types/media';
import { Play, Star, Film, Tv } from 'lucide-react';

interface MediaCardProps {
  item: MediaItem;
  onClick: (item: MediaItem) => void;
}

export const MediaCard: React.FC<MediaCardProps> = ({ item, onClick }) => {
  const [imgError, setImgError] = useState(false);

  const title = item.title || item.name || item.original_title || item.original_name || 'Title';
  const releaseYear = (item.release_date || item.first_air_date || '').slice(0, 4);
  const isMovie = item.media_type === 'movie' || !!item.title;

  const posterUrl = item.poster_path
    ? item.poster_path.startsWith('http')
      ? item.poster_path
      : `https://image.tmdb.org/t/p/w500${item.poster_path}`
    : '';

  return (
    <div
      role="button"
      tabIndex={0}
      data-focusable="true"
      aria-label={`${title} (${releaseYear || 'Media'})`}
      onClick={() => onClick(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.keyCode === 13 || e.keyCode === 23) {
          e.preventDefault();
          onClick(item);
        }
      }}
      className="group relative flex flex-col rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-indigo-500/50 focus:border-amber-400 focus:ring-4 focus:ring-amber-500/30 overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1"
    >
      {/* Poster Image */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-800">
        {!imgError && posterUrl ? (
          <img
            src={posterUrl}
            alt={title}
            onError={() => setImgError(true)}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-slate-800 text-slate-400">
            {isMovie ? <Film className="w-10 h-10 mb-2 text-slate-600" /> : <Tv className="w-10 h-10 mb-2 text-slate-600" />}
            <span className="text-xs font-semibold line-clamp-2">{title}</span>
          </div>
        )}

        {/* Rating Badge */}
        {item.vote_average !== undefined && item.vote_average > 0 && (
          <div className="absolute top-2.5 left-2.5">
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/90 text-black shadow-md backdrop-blur-md">
              <Star className="w-3 h-3 fill-current" />
              <span>{item.vote_average.toFixed(1)}</span>
            </span>
          </div>
        )}

        {/* Type & Provider Badges */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
          {item.provider && (
            <span className="text-[9px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded bg-black/80 text-white border border-white/20 shadow-md backdrop-blur-md">
              {item.provider === 'appletv' ? 'Apple TV+' : item.provider === 'disney' ? 'Disney+' : item.provider === 'prime' ? 'Prime' : item.provider === 'paramount' ? 'Paramount+' : item.provider}
            </span>
          )}
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shadow-md backdrop-blur-md ${
            isMovie ? 'bg-indigo-600/90 text-white' : 'bg-pink-600/90 text-white'
          }`}>
            {isMovie ? 'MOVIE' : 'TV SHOW'}
          </span>
        </div>

        {/* Hover Quick Stream Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
          <button className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/30 transition-all">
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isMovie ? 'Watch Movie' : 'Watch Series'}</span>
          </button>
        </div>
      </div>

      {/* Info Content */}
      <div className="p-3 flex flex-col flex-1 justify-between">
        <div>
          <h3 className="text-xs font-bold text-slate-100 line-clamp-1 group-hover:text-indigo-400 transition-colors">
            {title}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
            {releaseYear ? `${releaseYear} • ` : ''}{isMovie ? 'Feature Film' : 'TV Series'}
          </p>
        </div>
      </div>
    </div>
  );
};

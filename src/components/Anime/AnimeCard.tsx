import React, { useState } from 'react';
import { Anime } from '../../types/anime';
import { Play, Star, Film } from 'lucide-react';

interface AnimeCardProps {
  anime: Anime;
  onClick: (anime: Anime) => void;
}

export const AnimeCard: React.FC<AnimeCardProps> = ({ anime, onClick }) => {
  const [imgError, setImgError] = useState(false);

  const title = anime.title.english || anime.title.romaji || anime.title.native || 'Anime Series';
  const coverUrl = anime.coverImage?.large || anime.coverImage?.medium || '';

  return (
    <div
      role="button"
      tabIndex={0}
      data-focusable="true"
      aria-label={title}
      onClick={() => onClick(anime)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.keyCode === 13 || e.keyCode === 23) {
          e.preventDefault();
          onClick(anime);
        }
      }}
      className="group relative flex flex-col rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-purple-500/50 focus:border-amber-400 focus:ring-4 focus:ring-amber-500/30 overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-1"
    >
      {/* Cover Image */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-800">
        {!imgError && coverUrl ? (
          <img
            src={coverUrl}
            alt={title}
            onError={() => setImgError(true)}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-slate-800 text-slate-400">
            <Film className="w-10 h-10 mb-2 text-slate-600" />
            <span className="text-xs font-semibold line-clamp-2">{title}</span>
          </div>
        )}

        {/* Score Badge */}
        {anime.averageScore && (
          <div className="absolute top-2.5 left-2.5">
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/90 text-black shadow-md backdrop-blur-md">
              <Star className="w-3 h-3 fill-current" />
              <span>{(anime.averageScore / 10).toFixed(1)}</span>
            </span>
          </div>
        )}

        {/* Episodes / Status Badge */}
        <div className="absolute top-2.5 right-2.5">
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-black/60 text-slate-200 backdrop-blur-md">
            {anime.episodes ? `${anime.episodes} EPS` : anime.status || 'TV'}
          </span>
        </div>

        {/* Hover Quick Watch Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
          <button className="w-full py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-purple-600/30 transition-all">
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Stream Episodes</span>
          </button>
        </div>
      </div>

      {/* Info Content */}
      <div className="p-3 flex flex-col flex-1 justify-between">
        <div>
          <h3 className="text-xs font-bold text-slate-100 line-clamp-1 group-hover:text-purple-400 transition-colors">
            {title}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
            {anime.seasonYear ? `${anime.seasonYear} • ` : ''}{anime.format || 'Anime'}
          </p>
        </div>

        {/* Genres */}
        {anime.genres && anime.genres.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {anime.genres.slice(0, 2).map((genre, idx) => (
              <span key={idx} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/50">
                {genre}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

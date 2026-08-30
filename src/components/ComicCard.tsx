import React, { useState } from 'react';
import { Comic } from '../types/comic';
import { BookOpen } from 'lucide-react';

interface ComicCardProps {
  comic: Comic;
  onClick: (comic: Comic) => void;
  progress?: { pageNumber: number; totalPages: number };
}

export const ComicCard: React.FC<ComicCardProps> = ({ comic, onClick, progress }) => {
  const [imgError, setImgError] = useState(false);

  const coverUrl = comic.cover.startsWith('http') && !comic.cover.includes('/api/proxy-image')
    ? `/api/proxy-image?url=${encodeURIComponent(comic.cover)}`
    : comic.cover;

  return (
    <div
      onClick={() => onClick(comic)}
      className="group relative flex flex-col rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-blue-500/50 overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1"
    >
      {/* Cover Image Container */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-800">
        {!imgError ? (
          <img
            src={coverUrl}
            alt={comic.title}
            onError={() => setImgError(true)}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-slate-800 text-slate-400">
            <BookOpen className="w-10 h-10 mb-2 text-slate-600" />
            <span className="text-xs font-semibold line-clamp-2">{comic.title}</span>
          </div>
        )}

        {/* Source Badge */}
        <div className="absolute top-2.5 left-2.5">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shadow-md backdrop-blur-md ${
            comic.source === 'webtoons'
              ? 'bg-emerald-500/90 text-white'
              : comic.source === 'mangadex'
              ? 'bg-orange-500/90 text-white'
              : comic.source === 'archive'
              ? 'bg-blue-600/90 text-white'
              : comic.source === 'sample'
              ? 'bg-purple-600/90 text-white'
              : 'bg-indigo-600/90 text-white'
          }`}>
            {comic.source === 'webtoons'
              ? 'WEBTOON'
              : comic.source === 'mangadex'
              ? 'MANGA'
              : comic.source === 'archive'
              ? 'COMIC'
              : comic.source === 'sample'
              ? 'DEMO'
              : 'CUSTOM'}
          </span>
        </div>

        {/* Year / Type Badge */}
        {comic.year && (
          <div className="absolute top-2.5 right-2.5">
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-black/60 text-slate-200 backdrop-blur-md">
              {comic.year}
            </span>
          </div>
        )}

        {/* Reading Progress Bar */}
        {progress && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/60">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
              style={{ width: `${Math.min(100, (progress.pageNumber / progress.totalPages) * 100)}%` }}
            />
          </div>
        )}

        {/* Hover Quick Read Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
          <button className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/30 transition-all">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Read Episodes</span>
          </button>
        </div>
      </div>

      {/* Info Content */}
      <div className="p-3 flex flex-col flex-1 justify-between">
        <div>
          <h3 className="text-xs font-bold text-slate-100 line-clamp-1 group-hover:text-blue-400 transition-colors">
            {comic.title}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
            {comic.author || 'Various Creators'}
          </p>
        </div>

        {/* Tags */}
        {comic.tags && comic.tags.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {comic.tags.slice(0, 2).map((tag, idx) => (
              <span key={idx} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/50">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

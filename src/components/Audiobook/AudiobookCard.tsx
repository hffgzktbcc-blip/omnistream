import React, { useState } from 'react';
import { Audiobook } from '../../types/audiobook';
import { Headphones, Play, Clock, User } from 'lucide-react';

interface AudiobookCardProps {
  book: Audiobook;
  onClick: (book: Audiobook) => void;
}

export const AudiobookCard: React.FC<AudiobookCardProps> = ({ book, onClick }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      onClick={() => onClick(book)}
      className="group relative flex flex-col rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-amber-500/50 overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/10 hover:-translate-y-1"
    >
      {/* Cover Art */}
      <div className="relative aspect-square w-full overflow-hidden bg-slate-800">
        {!imgError && book.cover ? (
          <img
            src={book.cover}
            alt={book.title}
            onError={() => setImgError(true)}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-b from-slate-800 to-slate-900 text-slate-300">
            <Headphones className="w-10 h-10 mb-2 text-amber-400" />
            <h4 className="text-xs font-bold line-clamp-3 text-white px-2">{book.title}</h4>
            <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{book.author}</p>
          </div>
        )}

        {/* Duration Badge */}
        {book.duration && (
          <div className="absolute top-2.5 right-2.5">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-black/75 text-amber-300 border border-amber-500/30 backdrop-blur-md flex items-center gap-1 shadow-md">
              <Clock className="w-2.5 h-2.5" />
              {book.duration}
            </span>
          </div>
        )}

        {/* Audio-only badge */}
        <div className="absolute top-2.5 left-2.5">
          <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 uppercase shadow-md">
            AUDIOBOOK
          </span>
        </div>

        {/* Hover Play Button */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
          <button className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/30 transition-all">
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Listen Now</span>
          </button>
        </div>
      </div>

      {/* Info Content */}
      <div className="p-3 flex flex-col flex-1 justify-between">
        <div>
          <h3 className="text-xs font-bold text-slate-100 line-clamp-1 group-hover:text-amber-400 transition-colors">
            {book.title}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1 flex items-center gap-1">
            <User className="w-3 h-3 text-slate-500" />
            <span>{book.author}</span>
          </p>
        </div>

        {book.currentProgress !== undefined && book.currentProgress > 0 && (
          <div className="mt-2.5 space-y-1">
            <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full transition-all"
                style={{ width: `${book.currentProgress}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-slate-400">
              <span>{book.currentProgress}% completed</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

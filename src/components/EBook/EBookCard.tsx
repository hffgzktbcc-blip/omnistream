import React, { useState } from 'react';
import { EBook } from '../../types/ebook';
import { BookOpen, User, Zap, Sparkles, Download, Check, Loader2, BookMarked } from 'lucide-react';
import { downloadEpubDirectly } from '../../services/epubDownloader';
import { ebookStorage } from '../../services/ebookStorage';

interface EBookCardProps {
  book: EBook;
  onClick: (book: EBook) => void;
  onReadNow?: (book: EBook) => void;
}

export const EBookCard: React.FC<EBookCardProps> = ({ book, onClick, onReadNow }) => {
  const [imgError, setImgError] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const localMeta = ebookStorage.getMetaById(book.id);
  const isSavedLocally = Boolean(book.isLocalUpload || (book.chapters && book.chapters.length > 0) || localMeta);
  const currentProgress = book.currentProgress ?? localMeta?.currentProgress ?? 0;
  const isWebNovel = typeof book.id === 'string' && book.id.startsWith('wn_');

  const handleDirectDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadEpubDirectly(book);
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 3000);
    } catch (err) {
      console.error('Direct download error:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handleReadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const targetBook = localMeta ? { ...book, ...localMeta } : book;
    if (onReadNow) {
      onReadNow(targetBook);
    } else {
      onClick(targetBook);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      data-focusable="true"
      aria-label={book.title}
      onClick={() => onClick(localMeta ? { ...book, ...localMeta } : book)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.keyCode === 13 || e.keyCode === 23) {
          e.preventDefault();
          onClick(localMeta ? { ...book, ...localMeta } : book);
        }
      }}
      className="group relative flex flex-col rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-emerald-500/50 focus:border-amber-400 focus:ring-4 focus:ring-amber-500/30 overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-1"
    >
      {/* Cover */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-800">
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
            <BookOpen className="w-10 h-10 mb-2 text-emerald-400" />
            <h4 className="text-xs font-bold line-clamp-3 text-white px-2">{book.title}</h4>
            <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{book.author}</p>
          </div>
        )}

        {/* Badge */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
          {isSavedLocally && (
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-emerald-500 text-slate-950 shadow-md">
              SAVED
            </span>
          )}
          <span
            className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md shadow-md backdrop-blur-md ${
              book.isLocalUpload
                ? 'bg-amber-500 text-black'
                : book.subjects?.some((s) => s.toLowerCase().includes('booktok'))
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white'
                : isWebNovel
                ? 'bg-purple-600 text-white'
                : 'bg-slate-800 text-slate-200 border border-slate-700'
            }`}
          >
            {book.isLocalUpload
              ? 'LOCAL'
              : book.subjects?.some((s) => s.toLowerCase().includes('booktok'))
              ? '#BOOKTOK'
              : isWebNovel
              ? 'WEB NOVEL'
              : 'BESTSELLER'}
          </span>
        </div>

        {/* Reading Progress Indicator Bar at Bottom of Cover */}
        {currentProgress > 0 && (
          <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-sm p-1.5 flex items-center justify-between gap-2">
            <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full"
                style={{ width: `${currentProgress}%` }}
              />
            </div>
            <span className="text-[9px] font-bold text-emerald-400">
              {currentProgress}%
            </span>
          </div>
        )}

        {/* Hover Quick Actions */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2.5 gap-1.5">
          <button
            onClick={handleReadClick}
            className="w-full py-2 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.02]"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{currentProgress > 0 ? `Resume (${currentProgress}%)` : 'Read Now'}</span>
          </button>
          <button
            onClick={handleDirectDownload}
            disabled={downloading}
            className="w-full py-1.5 px-2.5 rounded-xl bg-slate-800/90 hover:bg-sky-600 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 border border-slate-700 hover:border-sky-500 shadow-md transition-all hover:scale-[1.02]"
          >
            {downloading ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin text-sky-300" />
                <span>Downloading...</span>
              </>
            ) : downloaded ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span>Saved to Shelf!</span>
              </>
            ) : isSavedLocally ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span>Download .EPUB</span>
              </>
            ) : (
              <>
                <Download className="w-3 h-3 text-sky-400" />
                <span>Download .EPUB</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Info Content */}
      <div className="p-3 flex flex-col flex-1 justify-between">
        <div>
          <h3 className="text-xs font-bold text-slate-100 line-clamp-1 group-hover:text-emerald-400 transition-colors">
            {book.title}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1 flex items-center gap-1">
            <User className="w-3 h-3 text-slate-500" />
            <span>{book.author}</span>
          </p>
        </div>

        {/* Subjects / Genres */}
        {book.subjects && book.subjects.length > 0 && (
          <div className="flex items-center gap-1 mt-2 flex-wrap">
            {book.subjects.slice(0, 2).map((sub, idx) => (
              <span
                key={idx}
                className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/50 line-clamp-1 max-w-[120px]"
              >
                {sub.split('--')[0].trim()}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

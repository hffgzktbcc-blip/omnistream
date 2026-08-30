import React, { useEffect, useState } from 'react';
import { Comic, Chapter, ReadingProgress } from '../types/comic';
import { api } from '../services/api';
import { storage } from '../services/storage';
import { X, Play, Bookmark, Heart, BookOpen, Clock, Calendar, Sparkles, Loader2 } from 'lucide-react';

interface ComicDetailModalProps {
  comic: Comic | null;
  onClose: () => void;
  onStartReading: (comic: Comic, chapter: Chapter) => void;
}

export const ComicDetailModal: React.FC<ComicDetailModalProps> = ({
  comic,
  onClose,
  onStartReading
}) => {
  const [details, setDetails] = useState<Comic | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFav, setIsFav] = useState(false);
  const [progress, setProgress] = useState<ReadingProgress | undefined>(undefined);

  useEffect(() => {
    if (!comic) return;
    setIsFav(storage.isFavorite(comic.id));
    setProgress(storage.getComicProgress(comic.id));

    // If comic already has chapters (e.g. sample or local), use directly
    if (comic.chapters && comic.chapters.length > 0) {
      setDetails(comic);
      setLoading(false);
      return;
    }

    setLoading(true);
    api.getComicDetails(comic.source, comic.id)
      .then((fullComic) => {
        setDetails(fullComic);
      })
      .catch((err) => {
        console.warn('Failed to load full comic details:', err);
        // Fallback to basic comic
        setDetails({
          ...comic,
          chapters: [{ id: `${comic.id}_full`, chapter: '1', title: comic.title, pages: 24 }]
        });
      })
      .finally(() => setLoading(false));
  }, [comic]);

  if (!comic) return null;

  const handleToggleFavorite = () => {
    if (!details) return;
    const newState = storage.toggleFavorite(details);
    setIsFav(newState);
  };

  const activeComic = details || comic;
  const coverUrl = activeComic.cover.startsWith('http') && !activeComic.cover.includes('/api/proxy-image')
    ? `/api/proxy-image?url=${encodeURIComponent(activeComic.cover)}`
    : activeComic.cover;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/50 hover:bg-black/80 text-slate-300 hover:text-white transition-all backdrop-blur-sm"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content Body (Scrollable) */}
        <div className="overflow-y-auto p-6 md:p-8 space-y-6">
          {/* Header Info Grid */}
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {/* Cover Art */}
            <div className="w-36 sm:w-48 aspect-[2/3] rounded-2xl overflow-hidden bg-slate-800 shadow-xl flex-shrink-0 border border-slate-700/60">
              <img
                src={coverUrl}
                alt={activeComic.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Title & Metadata */}
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  {activeComic.source === 'mangadex' ? 'MangaDex' : activeComic.source === 'archive' ? 'Archive Comic' : 'Exclusive'}
                </span>
                {activeComic.year && (
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {activeComic.year}
                  </span>
                )}
                {activeComic.status && (
                  <span className="text-xs text-emerald-400 font-medium">
                    ● {activeComic.status}
                  </span>
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                {activeComic.title}
              </h2>

              <p className="text-xs text-slate-400">
                Created by <strong className="text-slate-200">{activeComic.author || 'Unknown'}</strong>
              </p>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                {activeComic.chapters && activeComic.chapters.length > 0 && (
                  <button
                    onClick={() => onStartReading(activeComic, activeComic.chapters![0])}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all hover:scale-105"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>{progress ? 'Resume Reading' : 'Start Issue #1'}</span>
                  </button>
                )}

                <button
                  onClick={handleToggleFavorite}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    isFav
                      ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                  title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                </button>
              </div>

              {/* Tags */}
              {activeComic.tags && activeComic.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {activeComic.tags.map((tag, idx) => (
                    <span key={idx} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700/50">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Multi-Source Online Reading Mirrors */}
              <div className="space-y-1.5 pt-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Direct Online Mirrors:</span>
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={`https://mangadex.org/search?q=${encodeURIComponent(activeComic.title)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-orange-600/30 text-orange-400 border border-orange-500/30 hover:border-orange-500 flex items-center gap-1 transition-all"
                  >
                    <span>MangaDex</span>
                  </a>
                  <a
                    href={activeComic.webtoonUrl || `https://www.webtoons.com/en/search?keyword=${encodeURIComponent(activeComic.title)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 hover:border-emerald-500 flex items-center gap-1 transition-all"
                  >
                    <span>Webtoons</span>
                  </a>
                  <a
                    href={`https://readcomiconline.li/Search/Comic?keyword=${encodeURIComponent(activeComic.title)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 hover:border-blue-500 flex items-center gap-1 transition-all"
                  >
                    <span>ReadComicOnline</span>
                  </a>
                  <a
                    href={`https://archive.org/search?query=${encodeURIComponent(activeComic.title)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-purple-600/30 text-purple-400 border border-purple-500/30 hover:border-purple-500 flex items-center gap-1 transition-all"
                  >
                    <span>Archive CBZ</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          {activeComic.description && (
            <div className="space-y-1.5 border-t border-slate-800 pt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Synopsis</h4>
              <p className="text-xs md:text-sm text-slate-300 leading-relaxed max-h-40 overflow-y-auto pr-2">
                {activeComic.description}
              </p>
            </div>
          )}

          {/* Chapters / Issues List */}
          <div className="space-y-3 border-t border-slate-800 pt-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-400" />
                <span>Available Issues & Chapters</span>
              </h4>
              <span className="text-xs text-slate-500">
                {activeComic.chapters?.length || 0} issues
              </span>
            </div>

            {loading ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                <span className="text-xs">Fetching high-res chapter index...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
                {activeComic.chapters && activeComic.chapters.length > 0 ? (
                  activeComic.chapters.map((ch) => (
                    <div
                      key={ch.id}
                      onClick={() => onStartReading(activeComic, ch)}
                      className="group flex items-center justify-between p-3 rounded-xl bg-slate-800/60 hover:bg-blue-600/20 border border-slate-700/50 hover:border-blue-500/40 cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-700/70 group-hover:bg-blue-600 text-slate-300 group-hover:text-white flex items-center justify-center text-xs font-bold transition-colors">
                          {ch.chapter || '1'}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-200 group-hover:text-blue-300 transition-colors line-clamp-1">
                            {ch.title}
                          </p>
                          {ch.size && <span className="text-[10px] text-slate-500">{ch.size}</span>}
                        </div>
                      </div>
                      <Play className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 text-center py-6 text-xs text-slate-500">
                    No issues indexed yet. Click Start Reading to load stream.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

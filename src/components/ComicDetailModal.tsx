import React, { useEffect, useState } from 'react';
import { Comic, Chapter, ReadingProgress } from '../types/comic';
import { api } from '../services/api';
import { storage } from '../services/storage';
import { offlineStorage } from '../services/offlineStorage';
import {
  X,
  Play,
  Bookmark,
  Heart,
  BookOpen,
  Clock,
  Calendar,
  Sparkles,
  Loader2,
  Download,
  CheckCircle2,
  Trash2,
  HardDrive
} from 'lucide-react';

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
  const [downloadedMap, setDownloadedMap] = useState<Record<string, boolean>>({});
  const [downloadingMap, setDownloadingMap] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!comic) return;
    setIsFav(storage.isFavorite(comic.id));
    setProgress(storage.getComicProgress(comic.id));

    const checkDownloads = async (chaptersList: Chapter[]) => {
      const map: Record<string, boolean> = {};
      for (const ch of chaptersList) {
        const isDl = await offlineStorage.isChapterDownloaded(ch.id);
        if (isDl) map[ch.id] = true;
      }
      setDownloadedMap(map);
    };

    if (comic.chapters && comic.chapters.length > 0) {
      setDetails(comic);
      setLoading(false);
      checkDownloads(comic.chapters);
      return;
    }

    setLoading(true);
    api.getComicDetails(comic.source, comic.id)
      .then((fullComic) => {
        setDetails(fullComic);
        if (fullComic.chapters) checkDownloads(fullComic.chapters);
      })
      .catch((err) => {
        console.warn('Failed to load full comic details:', err);
        const fallback: Comic = {
          ...comic,
          chapters: [{ id: `${comic.id}_full`, chapter: '1', title: comic.title, pages: 24 }]
        };
        setDetails(fallback);
        if (fallback.chapters) checkDownloads(fallback.chapters);
      })
      .finally(() => setLoading(false));
  }, [comic]);

  if (!comic) return null;

  const handleToggleFavorite = () => {
    if (!details) return;
    const newState = storage.toggleFavorite(details);
    setIsFav(newState);
  };

  const handleDownloadChapter = async (e: React.MouseEvent, ch: Chapter) => {
    e.stopPropagation();
    if (!activeComic) return;

    if (downloadedMap[ch.id]) {
      // Delete offline chapter
      await offlineStorage.deleteChapter(activeComic.id, ch.id);
      setDownloadedMap((prev) => ({ ...prev, [ch.id]: false }));
      return;
    }

    try {
      setDownloadingMap((prev) => ({ ...prev, [ch.id]: 0 }));
      const pages = await api.getChapterPages(activeComic.source, ch.id);
      if (!pages || pages.length === 0) throw new Error('No pages found');

      await offlineStorage.downloadChapter(activeComic, ch, pages, (done, total) => {
        setDownloadingMap((prev) => ({ ...prev, [ch.id]: Math.round((done / total) * 100) }));
      });

      setDownloadedMap((prev) => ({ ...prev, [ch.id]: true }));
    } catch (err) {
      console.error('Failed to download chapter:', err);
      alert('Failed to download chapter for offline reading.');
    } finally {
      setDownloadingMap((prev) => {
        const next = { ...prev };
        delete next[ch.id];
        return next;
      });
    }
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
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/50 hover:bg-black/80 text-slate-300 hover:text-white transition-all backdrop-blur-sm cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content Body */}
        <div className="overflow-y-auto p-6 md:p-8 space-y-6">
          {/* Header Info Grid */}
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div className="w-36 sm:w-48 aspect-[2/3] rounded-2xl overflow-hidden bg-slate-800 shadow-xl flex-shrink-0 border border-slate-700/60">
              <img
                src={coverUrl}
                alt={activeComic.title}
                className="w-full h-full object-cover"
              />
            </div>

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
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all hover:scale-105 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>{progress ? 'Resume Reading' : 'Start Issue #1'}</span>
                  </button>
                )}

                <button
                  onClick={handleToggleFavorite}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
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

          {/* Chapters / Issues List with Offline Downloads */}
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
                  activeComic.chapters.map((ch) => {
                    const isDownloaded = downloadedMap[ch.id];
                    const isDownloading = typeof downloadingMap[ch.id] === 'number';

                    return (
                      <div
                        key={ch.id}
                        onClick={() => onStartReading(activeComic, ch)}
                        className="group flex items-center justify-between p-3 rounded-xl bg-slate-800/60 hover:bg-blue-600/20 border border-slate-700/50 hover:border-blue-500/40 cursor-pointer transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-slate-700/70 group-hover:bg-blue-600 text-slate-300 group-hover:text-white flex items-center justify-center text-xs font-bold transition-colors flex-shrink-0">
                            {ch.chapter || '1'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-200 group-hover:text-blue-300 transition-colors truncate">
                              {ch.title}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500">
                              {isDownloaded && (
                                <span className="text-emerald-400 font-bold flex items-center gap-1">
                                  <HardDrive className="w-3 h-3" />
                                  <span>Offline Ready</span>
                                </span>
                              )}
                              {ch.size && <span>{ch.size}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* Download Offline Button */}
                          <button
                            onClick={(e) => handleDownloadChapter(e, ch)}
                            className={`p-2 rounded-lg transition-all cursor-pointer ${
                              isDownloaded
                                ? 'bg-emerald-600/20 text-emerald-400 hover:bg-red-600/20 hover:text-red-400'
                                : isDownloading
                                ? 'bg-blue-600/30 text-blue-400'
                                : 'bg-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700'
                            }`}
                            title={isDownloaded ? 'Delete offline copy' : 'Download for offline reading'}
                          >
                            {isDownloading ? (
                              <span className="text-[10px] font-bold">{downloadingMap[ch.id]}%</span>
                            ) : isDownloaded ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <Play className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </div>
                    );
                  })
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

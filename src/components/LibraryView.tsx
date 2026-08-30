import React, { useState, useEffect } from 'react';
import { Comic, ReadingProgress, Bookmark } from '../types/comic';
import { EBook } from '../types/ebook';
import { Audiobook } from '../types/audiobook';
import { storage } from '../services/storage';
import { ebookStorage } from '../services/ebookStorage';
import {
  BookOpen,
  Bookmark as BookmarkIcon,
  Clock,
  Trash2,
  Play,
  ArrowRight,
  BookText,
  Headphones,
  Sparkles,
  Upload,
  CheckCircle2
} from 'lucide-react';

interface LibraryViewProps {
  onOpenComic: (
    comic: Comic,
    chapterId?: string,
    pageNumber?: number,
    panelIndex?: number
  ) => void;
  onOpenEBook?: (book: EBook) => void;
  onOpenAudiobook?: (book: Audiobook) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  onOpenComic,
  onOpenEBook,
  onOpenAudiobook
}) => {
  const [activeTab, setActiveTab] = useState<'ebooks' | 'comics' | 'bookmarks'>('ebooks');
  const [history, setHistory] = useState<ReadingProgress[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [ebooks, setEbooks] = useState<EBook[]>([]);

  useEffect(() => {
    setHistory(storage.getProgress());
    setBookmarks(storage.getBookmarks());
    setEbooks(ebookStorage.getLibrary());
  }, []);

  const handleClearHistory = () => {
    if (confirm('Clear all reading history?')) {
      localStorage.removeItem('omni_comic_history');
      setHistory([]);
    }
  };

  const handleDeleteEBook = async (id: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Remove this book from your library?')) {
      await ebookStorage.removeBook(id);
      setEbooks(ebookStorage.getLibrary());
    }
  };

  const handleDeleteBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    storage.removeBookmark(id);
    setBookmarks(storage.getBookmarks());
  };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Your Personal Library</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage your uploaded books, comic reading history, and saved bookmarks
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveTab('ebooks')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'ebooks'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookText className="w-3.5 h-3.5" />
            <span>Uploaded Books ({ebooks.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('comics')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'comics'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Comics History ({history.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'bookmarks'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookmarkIcon className="w-3.5 h-3.5" />
            <span>Bookmarks ({bookmarks.length})</span>
          </button>
        </div>
      </div>

      {/* 1. UPLOADED E-BOOKS SHELF */}
      {activeTab === 'ebooks' && (
        <div className="space-y-6">
          {ebooks.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {ebooks.map((book) => {
                const totalCh = book.totalChapters || book.chapters?.length || 1;
                const currCh = book.currentChapter || 1;
                const progressPct = book.currentProgress || Math.round((currCh / totalCh) * 100);

                return (
                  <div
                    key={book.id}
                    onClick={() => onOpenEBook && onOpenEBook(book)}
                    className="group relative flex flex-col rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-1 p-5 justify-between space-y-4"
                  >
                    <div className="flex gap-4">
                      {/* Cover */}
                      <div className="w-20 aspect-[2/3] rounded-xl overflow-hidden bg-slate-800 flex-shrink-0 shadow-md">
                        {book.cover ? (
                          <img
                            src={book.cover}
                            alt={book.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-emerald-950 to-teal-900 text-emerald-400">
                            <BookText className="w-8 h-8" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                          Uploaded E-Book
                        </span>
                        <h3 className="text-sm font-bold text-white line-clamp-2 group-hover:text-emerald-400 transition-colors">
                          {book.title}
                        </h3>
                        <p className="text-xs text-slate-400 line-clamp-1">{book.author}</p>
                        <p className="text-[11px] text-slate-500 pt-1">
                          Chapter {currCh} of {totalCh}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar & Actions */}
                    <div className="space-y-3 pt-3 border-t border-slate-800/80">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] text-slate-400">
                          <span>Reading Progress</span>
                          <span className="font-bold text-emerald-400">{progressPct}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            style={{ width: `${progressPct}%` }}
                            className="h-full bg-emerald-500 rounded-full transition-all"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <button className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 group-hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-all">
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Continue</span>
                        </button>

                        <button
                          onClick={(e) => handleDeleteEBook(book.id, e)}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                          title="Remove Book"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-12 text-center space-y-4 max-w-lg mx-auto">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                <Upload className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-white">No Uploaded E-Books Yet</h3>
              <p className="text-xs text-slate-400">
                Drop any .EPUB, .TXT, or .MD file from OceanofPDF in the E-Books tab to build your library.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 2. COMICS HISTORY */}
      {activeTab === 'comics' && (
        <div className="space-y-6">
          {history.length > 0 && (
            <div className="flex justify-end">
              <button
                onClick={handleClearHistory}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 text-xs font-bold transition-all border border-slate-700/60"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear History</span>
              </button>
            </div>
          )}

          {history.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
              {history.map((item) => (
                <div
                  key={`${item.comicId}_${item.chapterId}`}
                  onClick={() =>
                    onOpenComic(
                      {
                        id: item.comicId,
                        title: 'Comic Issue',
                        cover: '',
                        author: 'Artist',
                        description: 'Comic Issue',
                        source: 'webtoons'
                      },
                      item.chapterId,
                      item.pageNumber,
                      item.panelIndex
                    )
                  }
                  className="group relative flex flex-col rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500/50 overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1 p-3 space-y-2"
                >
                  <div className="aspect-[2/3] w-full rounded-xl overflow-hidden bg-slate-800 flex items-center justify-center text-slate-500">
                    <BookOpen className="w-8 h-8" />
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-white truncate">{item.comicId}</h4>
                    <p className="text-[11px] text-slate-400">Page {item.pageNumber}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-12 text-center space-y-4 max-w-lg mx-auto">
              <BookOpen className="w-10 h-10 mx-auto text-slate-500" />
              <h3 className="text-lg font-bold text-white">No Reading History</h3>
              <p className="text-xs text-slate-400">
                Read any comic or manga to track your progress here automatically.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 3. BOOKMARKS */}
      {activeTab === 'bookmarks' && (
        <div className="space-y-4">
          {bookmarks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bookmarks.map((bm) => (
                <div
                  key={bm.id}
                  onClick={() =>
                    onOpenComic(
                      {
                        id: bm.comicId,
                        title: 'Bookmarked Comic',
                        cover: '',
                        author: 'Artist',
                        description: 'Bookmarked Issue',
                        source: 'webtoons'
                      },
                      bm.chapterId,
                      bm.pageNumber,
                      bm.panelIndex
                    )
                  }
                  className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/50 flex items-center justify-between gap-4 cursor-pointer transition-all hover:shadow-lg group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-16 rounded-lg overflow-hidden bg-slate-800 flex items-center justify-center text-amber-400">
                      <BookmarkIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors line-clamp-1">
                        Page {bm.pageNumber}
                      </h4>
                      <p className="text-[11px] text-slate-400">Chapter {bm.chapterId}</p>
                      {bm.note && (
                        <p className="text-[10px] text-amber-300/80 italic mt-0.5">&quot;{bm.note}&quot;</p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDeleteBookmark(bm.id, e)}
                    className="p-2 rounded-xl hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors flex-shrink-0"
                    title="Remove Bookmark"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-12 text-center space-y-4 max-w-lg mx-auto">
              <BookmarkIcon className="w-10 h-10 mx-auto text-slate-500" />
              <h3 className="text-lg font-bold text-white">No Saved Bookmarks</h3>
              <p className="text-xs text-slate-400">
                Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-[11px]">B</kbd> while reading any comic or listening to an audiobook to save a bookmark moment.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Comic, ReadingProgress, Bookmark } from '../types/comic';
import { EBook } from '../types/ebook';
import { storage } from '../services/storage';
import { ebookStorage } from '../services/ebookStorage';
import { offlineStorage, OfflineComicSummary } from '../services/offlineStorage';
import { backupService } from '../services/backupService';
import {
  BookOpen,
  Bookmark as BookmarkIcon,
  Clock,
  Trash2,
  Play,
  ArrowRight,
  BookText,
  Sparkles,
  Upload,
  CheckCircle2,
  HardDrive,
  Heart,
  Layers,
  Flame,
  Download
} from 'lucide-react';

interface LibraryViewProps {
  onOpenComic: (
    comic: Comic,
    chapterId?: string,
    pageNumber?: number,
    panelIndex?: number
  ) => void;
  onOpenEBook?: (book: EBook) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  onOpenComic,
  onOpenEBook
}) => {
  const [activeTab, setActiveTab] = useState<'comics' | 'ebooks' | 'bookmarks'>('comics');
  const [comicSubCategory, setComicSubCategory] = useState<'reading' | 'downloaded' | 'favorites' | 'completed'>('reading');
  const [history, setHistory] = useState<ReadingProgress[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [ebooks, setEbooks] = useState<EBook[]>([]);
  const [favorites, setFavorites] = useState<Comic[]>([]);
  const [offlineComics, setOfflineComics] = useState<OfflineComicSummary[]>([]);

  useEffect(() => {
    setHistory(storage.getProgress());
    setBookmarks(storage.getBookmarks());
    setEbooks(ebookStorage.getLibrary());
    setFavorites(storage.getFavorites());

    offlineStorage.getAllDownloadedComics().then((dls) => {
      setOfflineComics(dls);
    });
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
          <h1 className="text-2xl sm:text-3xl font-black text-white">Your Tachiyomi Personal Library</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Organized manga progress, offline downloaded chapters, and saved bookmarks
          </p>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-3">
          {/* Backup / Restore Controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => backupService.exportBackup()}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-bold transition-all cursor-pointer"
              title="Export Tachimanga / Tachiyomi backup"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>Export Backup</span>
            </button>

            <label className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-bold transition-all cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-purple-400" />
              <span>Restore</span>
              <input
                type="file"
                accept=".json,.tachibk"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const res = await backupService.importBackup(file);
                    alert(res.message);
                    if (res.success) {
                      setHistory(storage.getProgress());
                      setBookmarks(storage.getBookmarks());
                      setFavorites(storage.getFavorites());
                    }
                  }
                }}
              />
            </label>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-2xl border border-slate-800">
            <button
              onClick={() => setActiveTab('comics')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'comics'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Manga & Comics ({history.length + offlineComics.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('ebooks')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'ebooks'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookText className="w-3.5 h-3.5" />
              <span>EPUB & Books ({ebooks.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('bookmarks')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'bookmarks'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookmarkIcon className="w-3.5 h-3.5" />
              <span>Bookmarks ({bookmarks.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Comics & Manga Tachiyomi Categories */}
      {activeTab === 'comics' && (
        <div className="space-y-6">
          {/* Sub-Category Filter Pills */}
          <div className="flex items-center justify-between gap-4 overflow-x-auto pb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setComicSubCategory('reading')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  comicSubCategory === 'reading'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Reading ({history.length})</span>
              </button>

              <button
                onClick={() => setComicSubCategory('downloaded')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  comicSubCategory === 'downloaded'
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                <HardDrive className="w-3.5 h-3.5 text-emerald-300" />
                <span>Offline Downloads ({offlineComics.length})</span>
              </button>

              <button
                onClick={() => setComicSubCategory('favorites')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  comicSubCategory === 'favorites'
                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                <Heart className="w-3.5 h-3.5" />
                <span>Favorites ({favorites.length})</span>
              </button>
            </div>

            {history.length > 0 && comicSubCategory === 'reading' && (
              <button
                onClick={handleClearHistory}
                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear History</span>
              </button>
            )}
          </div>

          {/* 1. Currently Reading Shelf */}
          {comicSubCategory === 'reading' && (
            <>
              {history.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {history.map((prog) => {
                    const dummyComic: Comic = {
                      id: prog.comicId,
                      source: 'mangadex',
                      title: prog.comicTitle || 'Reading Issue',
                      cover: prog.cover || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=600&auto=format&fit=crop',
                      type: 'Manga'
                    };
                    const percent = prog.totalPages > 0 ? Math.round((prog.lastPage / prog.totalPages) * 100) : 0;

                    return (
                      <div
                        key={prog.comicId}
                        onClick={() => onOpenComic(dummyComic, prog.lastChapterId, prog.lastPage, prog.lastPanel)}
                        className="group relative p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-blue-500/50 cursor-pointer transition-all shadow-lg flex items-center gap-4"
                      >
                        <div className="w-16 h-24 rounded-xl overflow-hidden bg-slate-800 flex-shrink-0 border border-slate-700">
                          <img
                            src={prog.cover || dummyComic.cover}
                            alt={prog.comicTitle}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <h4 className="text-sm font-bold text-white truncate group-hover:text-blue-400 transition-colors">
                            {prog.comicTitle || 'Untitled Issue'}
                          </h4>
                          <p className="text-xs text-slate-400">
                            {prog.chapterTitle ? prog.chapterTitle : `Chapter ${prog.chapterNumber || '1'}`}
                          </p>
                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                            <span>Page {prog.lastPage} of {prog.totalPages || '?'}</span>
                            <span className="font-bold text-blue-400">{percent}%</span>
                          </div>
                          {/* Progress Bar */}
                          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                        <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors flex-shrink-0">
                          <Play className="w-4 h-4 fill-current" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-16 text-center space-y-3 bg-slate-900/30 rounded-3xl border border-slate-800/50">
                  <Clock className="w-12 h-12 text-slate-600 mx-auto" />
                  <h3 className="text-base font-bold text-white">No reading progress yet</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Start reading any comic or manga from the Browse tab to automatically track chapters here.
                  </p>
                </div>
              )}
            </>
          )}

          {/* 2. Downloaded Offline Shelf */}
          {comicSubCategory === 'downloaded' && (
            <>
              {offlineComics.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {offlineComics.map((off) => {
                    const dummyComic: Comic = {
                      id: off.comicId,
                      source: off.source || 'mangadex',
                      title: off.title,
                      cover: off.cover,
                      author: off.author,
                      type: off.type || 'Manga'
                    };

                    return (
                      <div
                        key={off.comicId}
                        onClick={() => onOpenComic(dummyComic)}
                        className="group relative p-4 rounded-2xl bg-slate-900/80 border border-emerald-500/30 hover:border-emerald-500 cursor-pointer transition-all shadow-lg flex items-center gap-4"
                      >
                        <div className="w-16 h-24 rounded-xl overflow-hidden bg-slate-800 flex-shrink-0 border border-slate-700">
                          <img
                            src={off.cover}
                            alt={off.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                            <HardDrive className="w-3 h-3" />
                            <span>{off.downloadedChaptersCount} Chapters Offline</span>
                          </div>
                          <h4 className="text-sm font-bold text-white truncate group-hover:text-emerald-400 transition-colors">
                            {off.title}
                          </h4>
                          <p className="text-xs text-slate-400">{off.author || 'Author'}</p>
                        </div>
                        <div className="p-2 rounded-xl bg-emerald-600/20 text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors flex-shrink-0">
                          <Play className="w-4 h-4 fill-current" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-16 text-center space-y-3 bg-slate-900/30 rounded-3xl border border-slate-800/50">
                  <HardDrive className="w-12 h-12 text-slate-600 mx-auto" />
                  <h3 className="text-base font-bold text-white">No downloaded chapters</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Click the ⬇️ Download icon on any comic issue to save it for 100% offline reading.
                  </p>
                </div>
              )}
            </>
          )}

          {/* 3. Favorites Shelf */}
          {comicSubCategory === 'favorites' && (
            <>
              {favorites.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {favorites.map((fav) => (
                    <div
                      key={fav.id}
                      onClick={() => onOpenComic(fav)}
                      className="group cursor-pointer space-y-2"
                    >
                      <div className="aspect-[2/3] rounded-2xl overflow-hidden bg-slate-800 border border-slate-800 group-hover:border-rose-500 transition-all shadow-lg">
                        <img
                          src={fav.cover}
                          alt={fav.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <h4 className="text-xs font-bold text-white truncate group-hover:text-rose-400">
                        {fav.title}
                      </h4>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center space-y-3 bg-slate-900/30 rounded-3xl border border-slate-800/50">
                  <Heart className="w-12 h-12 text-slate-600 mx-auto" />
                  <h3 className="text-base font-bold text-white">No favorite comics yet</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Click the heart icon on any comic or manga to add it to your favorites.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* EPUB & Uploaded E-Books */}
      {activeTab === 'ebooks' && (
        <div className="space-y-6">
          {ebooks.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ebooks.map((book) => (
                <div
                  key={book.id}
                  onClick={() => onOpenEBook && onOpenEBook(book)}
                  className="group relative p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 cursor-pointer transition-all shadow-lg flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-14 h-20 rounded-xl overflow-hidden bg-slate-800 flex-shrink-0 border border-slate-700 flex items-center justify-center">
                      {book.cover ? (
                        <img src={book.cover} alt={book.title} className="w-full h-full object-cover" />
                      ) : (
                        <BookText className="w-6 h-6 text-emerald-400" />
                      )}
                    </div>
                    <div className="min-w-0 space-y-1">
                      <h4 className="text-sm font-bold text-white truncate group-hover:text-emerald-400 transition-colors">
                        {book.title}
                      </h4>
                      <p className="text-xs text-slate-400 truncate">{book.author || 'Unknown Author'}</p>
                      {book.format && (
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                          {book.format}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDeleteEBook(book.id, e)}
                    className="p-2 text-slate-500 hover:text-red-400 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Remove book"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center space-y-3 bg-slate-900/30 rounded-3xl border border-slate-800/50">
              <BookText className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No uploaded books</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Drag and drop any EPUB, PDF, or TXT file into OmniStream to read in Kindle-style reader mode.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Bookmarks */}
      {activeTab === 'bookmarks' && (
        <div className="space-y-6">
          {bookmarks.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {bookmarks.map((bm) => (
                <div
                  key={bm.id}
                  className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-400">Page {bm.pageNumber}</span>
                    <button
                      onClick={(e) => handleDeleteBookmark(bm.id, e)}
                      className="text-slate-500 hover:text-red-400 p-1 rounded cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-300 line-clamp-2">{bm.note || 'No notes added'}</p>
                  <span className="text-[10px] text-slate-500">
                    {new Date(bm.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center space-y-3 bg-slate-900/30 rounded-3xl border border-slate-800/50">
              <BookmarkIcon className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No bookmarks saved</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Press B or click the bookmark icon while reading to save pages.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

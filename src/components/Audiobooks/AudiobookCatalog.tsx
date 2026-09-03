import React, { useState, useEffect } from 'react';
import {
  Search,
  Headphones,
  Play,
  RotateCcw,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Trash2,
  Zap,
  BookOpen
} from 'lucide-react';
import { Audiobook, AudioTrack, AudiobookListeningProgress } from '../../types/audiobook';
import { audiobookStorage } from '../../services/audiobookStorage';

interface AudiobookCatalogProps {
  onSelectBook: (book: Audiobook) => void;
  onResumeListening: (progress: AudiobookListeningProgress) => void;
}

export const AudiobookCatalog: React.FC<AudiobookCatalogProps> = ({
  onSelectBook,
  onResumeListening
}) => {
  const [books, setBooks] = useState<Audiobook[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGenre, setActiveGenre] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [continueList, setContinueList] = useState<AudiobookListeningProgress[]>(() => {
    return audiobookStorage.getRecentHistory();
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const genres = [
    { label: 'All Releases', id: '' },
    { label: 'Fantasy', id: 'fantasy' },
    { label: 'Sci-Fi', id: 'sci-fi' },
    { label: 'Mystery', id: 'mystery' },
    { label: 'Thriller', id: 'thriller' },
    { label: 'Romance', id: 'romance' },
    { label: 'Non-Fiction', id: 'non-fiction' },
    { label: 'Historic', id: 'historic' },
    { label: 'Classics', id: 'classic' },
    { label: 'Young Adult', id: 'young-adult' },
    { label: 'Crime', id: 'crime' },
    { label: 'Adventure', id: 'adventure' }
  ];

  useEffect(() => {
    fetchFeed(1);
  }, [activeGenre]);

  const fetchFeed = async (page: number) => {
    setLoading(true);
    setErrorMsg(null);
    setCurrentPage(page);

    try {
      const endpoint = activeGenre
        ? `/api/audiobooks/category/${activeGenre}?page=${page}`
        : `/api/audiobooks/recent?page=${page}`;

      const res = await fetch(endpoint);
      if (!res.ok) throw new Error('AudioBay stream network error');
      const data = await res.json();

      setBooks(data.items || []);
      setTotalPages(data.totalPages || 1);
    } catch (err: any) {
      console.warn('Audiobooks fetch failed:', err);
      setErrorMsg('Failed to reach AudioBay server. Click retry to reconnect.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      fetchFeed(1);
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setActiveGenre('');
    setCurrentPage(1);

    try {
      const res = await fetch(`/api/audiobooks/search?q=${encodeURIComponent(searchQuery.trim())}&page=1`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setBooks(data.items || []);
      setTotalPages(data.totalPages || 1);
    } catch (e: any) {
      setErrorMsg('Audiobook search failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClearProgress = (bookId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const all = audiobookStorage.getAllProgress();
      delete all[bookId];
      localStorage.setItem('omnistream_audiobook_progress_v2', JSON.stringify(all));
      setContinueList(audiobookStorage.getRecentHistory());
    } catch (err) {}
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex flex-col px-4 md:px-12 py-6 gap-8 animate-fade-in max-w-7xl mx-auto w-full">
      {/* Search and Hero Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-wider border border-amber-500/30">
              Direct Swarm Streaming
            </span>
            <span className="text-xs text-slate-400">AudiobookBay + Shelf Suite</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <Headphones className="w-7 h-7 text-amber-400" />
            <span>Audiobooks Hub</span>
          </h1>
        </div>

        {/* Audiobook Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search audiobooks by title, author..."
            className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-2xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none shadow-inner"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
        </form>
      </div>

      {/* Genre Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
        {genres.map((g) => {
          const isActive = activeGenre === g.id;
          return (
            <button
              key={g.id}
              onClick={() => {
                setActiveGenre(g.id);
                setSearchQuery('');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800/80'
              }`}
            >
              {g.label}
            </button>
          );
        })}
      </div>

      {/* Continue Listening Shelf (Shelf Feature) */}
      {continueList.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Continue Listening</span>
            </h3>
            <span className="text-[11px] text-slate-500">{continueList.length} in progress</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {continueList.slice(0, 3).map((item) => {
              const coverUrl = item.cover
                ? item.cover.startsWith('http')
                  ? `/api/audiobooks/proxy-image?url=${encodeURIComponent(item.cover)}`
                  : item.cover
                : 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=300';

              return (
                <div
                  key={item.bookId}
                  onClick={() => onResumeListening(item)}
                  className="bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800/80 hover:border-amber-500/50 rounded-2xl p-3 flex items-center gap-3.5 group transition cursor-pointer relative shadow-lg"
                >
                  <img
                    src={coverUrl}
                    alt=""
                    className="w-14 h-16 object-cover rounded-xl bg-slate-950 border border-slate-800 shrink-0 shadow"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=300';
                    }}
                  />
                  <div className="flex-1 min-w-0 pr-4">
                    <h4 className="text-xs font-bold text-white truncate leading-tight group-hover:text-amber-300 transition">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 truncate mb-2">{item.author}</p>
                    {/* Progress bar */}
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden flex">
                      <div
                        className="bg-amber-500 h-full rounded-full transition-all"
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 font-mono">
                      <span>{formatTime(item.currentTime)}</span>
                      <span className="text-amber-400 font-bold">{item.percent}%</span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleClearProgress(item.bookId, e)}
                    className="absolute top-2 right-2 p-1 text-slate-500 hover:text-rose-400 rounded-lg transition opacity-0 group-hover:opacity-100"
                    title="Remove from history"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Catalog Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {searchQuery
                ? `Search results for "${searchQuery}"`
                : activeGenre
                ? `${activeGenre.toUpperCase()} Releases`
                : 'Trending Audiobooks'}
            </span>
          </h3>
          <span className="text-xs text-slate-500 font-mono">{books.length} audiobooks</span>
        </div>

        {/* Error State */}
        {errorMsg && (
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-center flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Headphones className="w-5 h-5" />
            </div>
            <p className="text-xs text-slate-300 max-w-sm">{errorMsg}</p>
            <button
              onClick={() => fetchFeed(currentPage)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Loading Skeletons */}
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="bg-slate-900/60 rounded-2xl p-2.5 flex flex-col gap-2 animate-pulse border border-slate-800/50"
              >
                <div className="aspect-[2/3] w-full rounded-xl bg-slate-800" />
                <div className="h-3 w-3/4 bg-slate-800 rounded" />
                <div className="h-2.5 w-1/2 bg-slate-800 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Books Grid */}
        {!loading && !errorMsg && books.length === 0 && (
          <div className="py-16 text-center text-slate-500 text-xs">
            No audiobooks found matching this criteria.
          </div>
        )}

        {!loading && !errorMsg && books.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4">
            {books.map((book) => {
              const coverUrl = book.cover
                ? book.cover.startsWith('http')
                  ? `/api/audiobooks/proxy-image?url=${encodeURIComponent(book.cover)}`
                  : book.cover
                : 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=300';

              return (
                <div
                  key={book.id}
                  onClick={() => onSelectBook(book)}
                  className="group bg-slate-900/70 hover:bg-slate-900 border border-slate-800/80 hover:border-amber-500/50 rounded-2xl p-2.5 flex flex-col transition cursor-pointer shadow-md hover:shadow-xl hover:shadow-amber-500/5"
                >
                  <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-slate-950 mb-2.5 shadow">
                    <img
                      src={coverUrl}
                      alt={book.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=300';
                      }}
                    />
                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur text-[9px] font-black uppercase text-amber-400 border border-white/10">
                      {book.format || 'AUDIO'}
                    </div>
                    {book.size && (
                      <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur text-[9px] font-bold text-slate-300">
                        {book.size}
                      </div>
                    )}
                    {/* Hover Play Glow Button */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/50">
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h4
                        className="text-xs font-bold text-white group-hover:text-amber-300 transition truncate leading-tight"
                        title={book.title}
                      >
                        {book.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate mb-1">{book.author}</p>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1.5 border-t border-slate-800/60 font-mono">
                      <span>{book.bitrate || 'Unabridged'}</span>
                      <span className="text-amber-400 font-bold flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Stream
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-6 pb-20">
            <button
              disabled={currentPage <= 1 || loading}
              onClick={() => fetchFeed(currentPage - 1)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 disabled:opacity-40 text-slate-300 hover:text-white transition cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-xs font-mono text-slate-400 font-bold">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages || loading}
              onClick={() => fetchFeed(currentPage + 1)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 disabled:opacity-40 text-slate-300 hover:text-white transition cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

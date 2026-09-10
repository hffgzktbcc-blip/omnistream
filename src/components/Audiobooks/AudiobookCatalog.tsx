import React, { useState, useEffect } from 'react';
import {
  Search,
  Headphones,
  Play,
  RotateCcw,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Zap,
  Bookmark,
  Library,
  Video,
  Globe,
  Radio,
  Activity
} from 'lucide-react';
import { Audiobook, AudioTrack, AudiobookListeningProgress } from '../../types/audiobook';
import { audiobookStorage } from '../../services/audiobookStorage';

interface AudiobookCatalogProps {
  onSelectBook: (book: Audiobook) => void;
  onResumeListening: (progress: AudiobookListeningProgress) => void;
}

type AudioSourceType = 'all' | 'webtorrent' | 'archive' | 'youtube' | 'audiobay';


export const AudiobookCatalog: React.FC<AudiobookCatalogProps> = ({
  onSelectBook,
  onResumeListening
}) => {
  const [books, setBooks] = useState<Audiobook[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceType, setSourceType] = useState<AudioSourceType>('all');
  const [activeGenre, setActiveGenre] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [savedIds, setSavedIds] = useState<Set<string>>(() => {
    return new Set(audiobookStorage.getShelf().map((i) => i.book.id));
  });
  const [continueList, setContinueList] = useState<AudiobookListeningProgress[]>(() => {
    return audiobookStorage.getRecentHistory();
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const genres = [
    { label: 'All Releases', id: '' },
    { label: '📚 My Bookshelf', id: 'my_bookshelf' },
    { label: 'Fantasy', id: 'fantasy' },
    { label: 'Sci-Fi', id: 'sci-fi' },
    { label: 'Mystery', id: 'mystery' },
    { label: 'Thriller', id: 'thriller' },
    { label: 'Classics', id: 'classic' },
    { label: 'Adventure', id: 'adventure' }
  ];

  useEffect(() => {
    fetchFeed(1);
  }, [activeGenre, sourceType]);

  const fetchFeed = async (page: number) => {
    setLoading(true);
    setErrorMsg(null);
    setCurrentPage(page);

    // Shelf Suite: Personal Bookshelf
    if (activeGenre === 'my_bookshelf') {
      try {
        const shelf = audiobookStorage.getShelf();
        setBooks(shelf.map((s) => s.book));
        setTotalPages(1);
      } catch (err: any) {
        setErrorMsg('Failed to load your personal bookshelf.');
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      if (sourceType === 'webtorrent') {
        const q = searchQuery || (activeGenre ? `${activeGenre} audiobook` : 'audiobook bestsellers');
        const res = await fetch(`/api/audiobooks/torrent/search?q=${encodeURIComponent(q)}`);
        if (!res.ok) throw new Error('Failed to search WebTorrent swarms');
        const data = await res.json();
        setBooks(data.items || []);
        setTotalPages(1);
      } else if (sourceType === 'archive') {
        const res = await fetch(`/api/audiobooks/archive/search?q=${encodeURIComponent(searchQuery || 'classic')}&page=${page}`);
        if (!res.ok) throw new Error('Failed to load archive audiobooks');
        const data = await res.json();
        setBooks(data.items || []);
        setTotalPages(data.totalPages || 1);
      } else if (sourceType === 'youtube') {
        const res = await fetch(`/api/audiobooks/youtube/search?q=${encodeURIComponent(searchQuery || 'audiobook')}`);
        if (!res.ok) throw new Error('Failed to load YouTube audiobooks');
        const data = await res.json();
        setBooks(data.items || []);
        setTotalPages(1);
      } else {
        // Default 'all' or 'audiobay': fetch direct archive or AudioBay
        const endpoint = activeGenre
          ? `/api/audiobooks/category/${activeGenre}?page=${page}`
          : `/api/audiobooks/recent?page=${page}`;

        const res = await fetch(endpoint);
        if (!res.ok) throw new Error('Audiobook network stream issue');
        const data = await res.json();
        setBooks(data.items || []);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err: any) {
      console.warn('Audiobooks fetch fallback to archive:', err);
      // Fallback to Internet Archive so user always sees playable audiobooks
      try {
        const fallbackRes = await fetch(`/api/audiobooks/archive/search?q=Sherlock&page=1`);
        if (fallbackRes.ok) {
          const fbData = await fallbackRes.json();
          setBooks(fbData.items || []);
          setTotalPages(fbData.totalPages || 1);
        }
      } catch {
        setErrorMsg('Failed to reach audiobook server. Click retry to reconnect.');
      }
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
      if (sourceType === 'webtorrent') {
        const res = await fetch(`/api/audiobooks/torrent/search?q=${encodeURIComponent(searchQuery.trim())}`);
        const data = await res.json();
        setBooks(data.items || []);
        setTotalPages(1);
      } else if (sourceType === 'archive') {
        const res = await fetch(`/api/audiobooks/archive/search?q=${encodeURIComponent(searchQuery.trim())}&page=1`);
        const data = await res.json();
        setBooks(data.items || []);
        setTotalPages(data.totalPages || 1);
      } else if (sourceType === 'youtube') {
        const res = await fetch(`/api/audiobooks/youtube/search?q=${encodeURIComponent(searchQuery.trim())}`);
        const data = await res.json();
        setBooks(data.items || []);
        setTotalPages(1);
      } else {
        // Universal search: AudiobookBay with WebTorrent Swarm and Archive fallbacks
        let foundBooks: Audiobook[] = [];
        let pages = 1;

        try {
          const res = await fetch(`/api/audiobooks/search?q=${encodeURIComponent(searchQuery.trim())}&page=1`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.items) && data.items.length > 0) {
              foundBooks = data.items;
              pages = data.totalPages || 1;
            }
          }
        } catch {}

        // If AudiobookBay had 0 results or timed out, query WebTorrent Swarms
        if (foundBooks.length === 0) {
          try {
            const tRes = await fetch(`/api/audiobooks/torrent/search?q=${encodeURIComponent(searchQuery.trim())}`);
            if (tRes.ok) {
              const tData = await tRes.json();
              if (Array.isArray(tData.items) && tData.items.length > 0) {
                foundBooks = tData.items;
                pages = 1;
              }
            }
          } catch {}
        }

        // If still empty, query Internet Archive
        if (foundBooks.length === 0) {
          try {
            const aRes = await fetch(`/api/audiobooks/archive/search?q=${encodeURIComponent(searchQuery.trim())}&page=1`);
            if (aRes.ok) {
              const aData = await aRes.json();
              foundBooks = aData.items || [];
              pages = aData.totalPages || 1;
            }
          } catch {}
        }

        setBooks(foundBooks);
        setTotalPages(pages);
      }
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

  
function renderBookCard(book, savedIds, setSavedIds, onSelectBook, activeGenre, setBooks) {
  const isSaved = savedIds.has(book.id);
  const coverUrl = book.cover
    ? book.cover.startsWith('http')
      ? `/api/audiobooks/proxy-image?url=${encodeURIComponent(book.cover)}`
      : book.cover
    : 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=300';

  const handleToggleShelf = (e) => {
    e.stopPropagation();
    if (isSaved) {
      audiobookStorage.removeFromShelf(book.id);
      setSavedIds((prev) => {
        const next = new Set(prev);
        next.delete(book.id);
        return next;
      });
      if (activeGenre === 'my_bookshelf') {
        setBooks((prev) => prev.filter((b) => b.id !== book.id));
      }
    } else {
      audiobookStorage.saveToShelf(book, 'want_to_listen');
      setSavedIds((prev) => new Set(prev).add(book.id));
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelectBook(book)}
      className="group flex flex-col transition cursor-pointer w-full"
    >
      <div className="relative aspect-square w-full bg-[#1e2025] mb-3 shadow-lg group-hover:shadow-2xl group-hover:shadow-[#f69931]/10 transition-shadow">
        <img
          src={coverUrl}
          alt={book.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=300';
          }}
        />
        
        {/* Only From tag mockup */}
        <div className="absolute top-0 left-0 w-full bg-[#f69931] text-black text-[9px] font-black uppercase text-center py-0.5 tracking-widest shadow-md">
          {book.format === 'M4B' ? 'Premium' : 'Unabridged'}
        </div>

        <button
          type="button"
          onClick={handleToggleShelf}
          className={`absolute bottom-2 right-2 p-2 rounded-full backdrop-blur-md transition-all z-10 ${
            isSaved
              ? 'bg-[#f69931] text-black shadow-md'
              : 'bg-black/60 text-white hover:bg-black/90'
          }`}
        >
          <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
        </button>

        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-[#f69931] text-black flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition">
            <Play className="w-5 h-5 fill-current ml-1" />
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <h4 className="text-sm font-bold text-white group-hover:text-[#f69931] transition truncate leading-tight mb-1" title={book.title}>
          {book.title}
        </h4>
        <p className="text-xs text-slate-400 truncate mb-1">{book.author}</p>
        <p className="text-[11px] text-slate-500 font-mono mt-1">{book.size || book.bitrate || 'Length: 12 hrs and 30 mins'}</p>
      </div>
    </div>
  );
}

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-28 bg-[#0f1013] min-h-screen -mx-4 sm:-mx-8 px-4 sm:px-8 pt-4">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-sm text-[10px] font-black uppercase tracking-wider bg-[#f69931] text-black">
              PREMIUM AUDIO
            </span>
            <span className="text-xs text-slate-400">WebTorrent P2P • Direct CDN</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Audiobooks Hub</span>
          </h1>
        </div>

        {/* Audiobook Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search audiobooks, authors..."
            className="w-full bg-[#1e2025] border border-[#2a2c33] focus:border-[#f69931] rounded-sm py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-400 focus:outline-none"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        </form>
      </div>

      {/* Genre Pills */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-2 border-b border-[#2a2c33]">
        {genres.map((g) => {
          const isActive = activeGenre === g.id;
          return (
            <button
              key={g.id}
              onClick={() => {
                setActiveGenre(g.id);
                setSearchQuery('');
              }}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition cursor-pointer ${
                isActive
                  ? 'bg-[#f69931] text-black'
                  : 'bg-transparent text-slate-300 hover:text-white border border-[#2a2c33] hover:border-slate-500'
              }`}
            >
              {g.label}
            </button>
          );
        })}
      </div>

      {/* Error State */}
      {errorMsg && (
        <div className="p-6 rounded-md bg-[#1e2025] border border-red-900/50 text-center flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
          <p className="text-sm text-slate-300 max-w-sm">{errorMsg}</p>
          <button
            onClick={() => fetchFeed(currentPage)}
            className="px-6 py-2 bg-[#f69931] hover:bg-[#e08929] text-black font-bold text-sm rounded-sm transition cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Continue Listening Shelf */}
      {continueList.length > 0 && !searchQuery && !activeGenre && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white tracking-tight">Jump Back In</h2>
          <div className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory scrollbar-none">
            {continueList.map((item) => {
              const coverUrl = item.cover
                ? item.cover.startsWith('http')
                  ? `/api/audiobooks/proxy-image?url=${encodeURIComponent(item.cover)}`
                  : item.cover
                : 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=300';

              return (
                <div
                  key={item.bookId}
                  onClick={() => onResumeListening(item)}
                  className="snap-start shrink-0 w-[300px] bg-[#1e2025] border border-[#2a2c33] hover:border-[#f69931] rounded-sm p-4 flex gap-4 group transition cursor-pointer shadow-lg"
                >
                  <img
                    src={coverUrl}
                    alt=""
                    className="w-20 h-20 object-cover rounded shadow-md shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=300';
                    }}
                  />
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h4 className="text-sm font-bold text-white truncate leading-tight group-hover:text-[#f69931] transition">
                      {item.title}
                    </h4>
                    <p className="text-xs text-slate-400 truncate mt-1 mb-3">{item.author}</p>
                    
                    <div className="w-full bg-[#0f1013] h-1.5 rounded-full overflow-hidden flex">
                      <div
                        className="bg-[#f69931] h-full rounded-full transition-all"
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 font-mono">
                      <span>{formatTime(item.currentTime)} left</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Featured Hero (Only if not searching and have books) */}
      {!loading && !searchQuery && books.length > 0 && !activeGenre && (
        <section className="relative w-full h-[350px] md:h-[400px] rounded-sm overflow-hidden mb-8 shadow-2xl group cursor-pointer" onClick={() => onSelectBook(books[0])}>
          <div className="absolute inset-0 bg-[#0f1013]">
             <img 
               src={books[0].cover ? (books[0].cover.startsWith('http') ? `/api/audiobooks/proxy-image?url=${encodeURIComponent(books[0].cover)}` : books[0].cover) : ''} 
               className="w-full h-full object-cover blur-3xl opacity-40 scale-110" alt="" 
             />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f1013] via-[#0f1013]/60 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#0f1013] via-[#0f1013]/80 to-transparent"></div>
          
          <div className="absolute inset-0 p-8 flex items-center gap-8 z-10">
            <img 
              src={books[0].cover ? (books[0].cover.startsWith('http') ? `/api/audiobooks/proxy-image?url=${encodeURIComponent(books[0].cover)}` : books[0].cover) : ''} 
              className="w-40 h-40 sm:w-56 sm:h-56 object-cover rounded shadow-2xl group-hover:scale-105 transition duration-500" 
              alt=""
            />
            <div className="flex flex-col gap-3 max-w-xl">
              <span className="text-[#f69931] text-xs font-bold tracking-widest uppercase">Featured Title</span>
              <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight line-clamp-2">{books[0].title}</h2>
              <p className="text-lg text-slate-300">{books[0].author}</p>
              
              <div className="mt-4 flex items-center gap-4">
                <button 
                  onClick={(e) => { e.stopPropagation(); onSelectBook(books[0]); }}
                  className="px-8 py-3 bg-[#f69931] hover:bg-[#e08929] text-black font-bold text-sm rounded-sm transition flex items-center gap-2"
                >
                  <Play className="w-5 h-5 fill-current" /> Play Sample
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-[#1e2025] rounded-sm p-3 flex flex-col gap-3 animate-pulse border border-[#2a2c33]">
              <div className="aspect-square w-full rounded bg-[#2a2c33]" />
              <div className="h-4 w-3/4 bg-[#2a2c33] rounded" />
              <div className="h-3 w-1/2 bg-[#2a2c33] rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Main Catalog View */}
      {!loading && !errorMsg && books.length > 0 && (
        <section className="space-y-8">
          
          {/* If searching or a specific genre is selected, just show grid */}
          {(searchQuery || activeGenre) ? (
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight mb-6 flex items-center gap-2">
                <span>{searchQuery ? `Results for "${searchQuery}"` : `${activeGenre.toUpperCase()}`}</span>
                <span className="text-sm font-normal text-slate-400">({books.length})</span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
                {books.map((book) => renderBookCard(book, savedIds, setSavedIds, onSelectBook, activeGenre, setBooks))}
              </div>
            </div>
          ) : (
            // If home page, chunk into simulated categories
            <>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight mb-4 flex justify-between items-end">
                  <span>Trending Now</span>
                  <span className="text-sm font-normal text-[#f69931] hover:underline cursor-pointer">See all</span>
                </h2>
                <div className="flex overflow-x-auto gap-4 sm:gap-6 pb-4 snap-x snap-mandatory scrollbar-none">
                  {books.slice(1, 8).map((book) => (
                    <div key={book.id} className="snap-start shrink-0 w-[160px] sm:w-[180px]">
                       {renderBookCard(book, savedIds, setSavedIds, onSelectBook, activeGenre, setBooks)}
                    </div>
                  ))}
                </div>
              </div>

              {books.length > 8 && (
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight mb-4 flex justify-between items-end">
                    <span>New Releases</span>
                    <span className="text-sm font-normal text-[#f69931] hover:underline cursor-pointer">See all</span>
                  </h2>
                  <div className="flex overflow-x-auto gap-4 sm:gap-6 pb-4 snap-x snap-mandatory scrollbar-none">
                    {books.slice(8, 15).map((book) => (
                      <div key={book.id} className="snap-start shrink-0 w-[160px] sm:w-[180px]">
                         {renderBookCard(book, savedIds, setSavedIds, onSelectBook, activeGenre, setBooks)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* Pagination Bar */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-10 pb-10">
          <button
            disabled={currentPage <= 1}
            onClick={() => fetchFeed(currentPage - 1)}
            className="p-3 rounded-full bg-[#1e2025] border border-[#2a2c33] disabled:opacity-40 text-slate-300 hover:bg-[#2a2c33] transition cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-semibold text-white">
            Page {currentPage} of {totalPages}
          </span>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => fetchFeed(currentPage + 1)}
            className="p-3 rounded-full bg-[#1e2025] border border-[#2a2c33] disabled:opacity-40 text-slate-300 hover:bg-[#2a2c33] transition cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};

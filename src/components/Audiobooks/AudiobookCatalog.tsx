import React, { useState, useEffect, useMemo } from 'react';
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
  Activity,
  Flame,
  BookOpen,
  Compass,
  ShieldCheck,
  CheckCircle2,
  Layers,
  Volume2,
  Clock,
  User,
  ExternalLink,
  X,
  Radio,
  Sliders
} from 'lucide-react';
import { Audiobook, AudioTrack, AudiobookListeningProgress } from '../../types/audiobook';
import { audiobookStorage } from '../../services/audiobookStorage';
import { api } from '../../services/api';
import { stremioService } from '../../services/stremioService';
import { debridAudioService } from '../../services/debridAudioService';
import { StremioSettingsModal } from '../Common/StremioSettingsModal';

interface AudiobookCatalogProps {
  onSelectBook: (book: Audiobook) => void;
  onResumeListening: (progress: AudiobookListeningProgress) => void;
}

type AudioSourceType = 'all' | 'webtorrent' | 'archive' | 'youtube';

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

  // Real-Debrid / Torbox Swarm Connection
  const [isDebridModalOpen, setIsDebridModalOpen] = useState(false);
  const [debridKey, setDebridKey] = useState<string>(() => stremioService.getDebridKey());
  const [debridProvider, setDebridProvider] = useState<string>(() => stremioService.getDebridProvider());

  const genres = [
    { label: '🔥 All Releases', id: '' },
    { label: '☁️ Debrid Vault', id: 'debrid_vault' },
    { label: '📚 My Bookshelf', id: 'my_bookshelf' },
    { label: '🚀 Sci-Fi & Cyberpunk', id: 'sci-fi' },
    { label: '⚔️ Fantasy & Magic', id: 'fantasy' },
    { label: '🔍 Mystery & Thriller', id: 'thriller' },
    { label: '🧠 Mindset & Self-Growth', id: 'self-growth' },
    { label: '🏛️ Classics & Literature', id: 'classic' },
    { label: '🧭 Adventure & Epics', id: 'adventure' }
  ];

  useEffect(() => {
    fetchFeed(1);
  }, [activeGenre, sourceType]);

  const fetchFeed = async (page: number) => {
    setLoading(true);
    setErrorMsg(null);
    setCurrentPage(page);

    // Debrid Vault Suite: Cloud Torrents Library
    if (activeGenre === 'debrid_vault') {
      try {
        if (!debridAudioService.isDebridConfigured()) {
          setIsDebridModalOpen(true);
          setErrorMsg('Connect your Real-Debrid or Torbox key to access your personal Debrid Cloud Vault.');
          setBooks([]);
        } else {
          const cloudBooks = await debridAudioService.getUserCloudAudiobooks();
          setBooks(cloudBooks);
          setTotalPages(1);
          if (cloudBooks.length === 0) {
            setErrorMsg('No audiobooks found in your cloud vault yet. Any audiobook torrents you add to Real-Debrid or Torbox will appear here.');
          }
        }
      } catch (err: any) {
        setErrorMsg('Failed to load your Debrid Cloud Vault.');
      } finally {
        setLoading(false);
      }
      return;
    }

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
        let loaded: Audiobook[] = [];
        try {
          const res = await fetch(`/api/audiobooks/torrent/search?q=${encodeURIComponent(q)}`);
          if (res.ok) {
            const ct = res.headers.get('content-type') || '';
            if (ct.includes('application/json')) {
              const data = await res.json();
              loaded = data.items || [];
            }
          }
        } catch {}
        if (loaded.length === 0) {
          loaded = await api.getPopularAudiobooks(activeGenre);
        }
        setBooks(loaded);
        setTotalPages(1);
      } else if (sourceType === 'archive') {
        const data = await api.searchAudiobooks(searchQuery || 'classic');
        setBooks(data);
        setTotalPages(1);
      } else if (sourceType === 'youtube') {
        const loaded = await api.getPopularAudiobooks(activeGenre);
        setBooks(loaded);
        setTotalPages(1);
      } else {
        let loaded: Audiobook[] = [];
        const endpoint = activeGenre
          ? `/api/audiobooks/category/${activeGenre}?page=${page}`
          : `/api/audiobooks/recent?page=${page}`;
        try {
          const res = await fetch(endpoint);
          if (res.ok) {
            const ct = res.headers.get('content-type') || '';
            if (ct.includes('application/json')) {
              const data = await res.json();
              if (Array.isArray(data.items) && data.items.length > 0) {
                loaded = data.items;
                setTotalPages(data.totalPages || 1);
              }
            }
          }
        } catch {}

        if (loaded.length === 0) {
          loaded = await api.getPopularAudiobooks(activeGenre);
          setTotalPages(1);
        }
        setBooks(loaded);
      }
    } catch (err: any) {
      console.warn('Audiobooks fetch fallback to curated/archive:', err);
      const fallback = await api.getPopularAudiobooks(activeGenre);
      setBooks(fallback);
      setTotalPages(1);
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
        let loaded: Audiobook[] = [];
        try {
          const res = await fetch(`/api/audiobooks/torrent/search?q=${encodeURIComponent(searchQuery.trim())}`);
          if (res.ok) {
            const ct = res.headers.get('content-type') || '';
            if (ct.includes('application/json')) {
              const data = await res.json();
              loaded = data.items || [];
            }
          }
        } catch {}
        if (loaded.length === 0) {
          loaded = await api.searchAudiobooks(searchQuery.trim());
        }
        setBooks(loaded);
        setTotalPages(1);
      } else if (sourceType === 'archive') {
        const data = await api.searchAudiobooks(searchQuery.trim());
        setBooks(data);
        setTotalPages(1);
      } else if (sourceType === 'youtube') {
        const loaded = await api.searchAudiobooks(searchQuery.trim());
        setBooks(loaded);
        setTotalPages(1);
      } else {
        // Universal search: AudiobookBay with WebTorrent Swarm and Archive fallbacks
        let foundBooks: Audiobook[] = [];
        let pages = 1;

        try {
          const res = await fetch(`/api/audiobooks/search?q=${encodeURIComponent(searchQuery.trim())}&page=1`);
          if (res.ok) {
            const ct = res.headers.get('content-type') || '';
            if (ct.includes('application/json')) {
              const data = await res.json();
              if (Array.isArray(data.items) && data.items.length > 0) {
                foundBooks = data.items;
                pages = data.totalPages || 1;
              }
            }
          }
        } catch {}

        // Fallback to client-side search if server returned 0 or failed
        if (foundBooks.length === 0) {
          foundBooks = await api.searchAudiobooks(searchQuery.trim());
        }

        setBooks(foundBooks);
        setTotalPages(pages);
      }
    } catch (e: any) {
      console.warn('Audiobook search error, using client fallback:', e);
      const fallback = await api.searchAudiobooks(searchQuery.trim());
      setBooks(fallback);
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

  // Grouped Curated Shelves for Home View
  const trendingBooks = useMemo(() => {
    return books.slice(0, 10);
  }, [books]);

  const sciFiBooks = useMemo(() => {
    return books.filter(b => 
      b.categories?.some(c => c.toLowerCase().includes('sci-fi')) ||
      ['projhailmary', 'dune1', 'martian1', 'neuromancer1', 'threebody1'].includes(b.id)
    );
  }, [books]);

  const fantasyBooks = useMemo(() => {
    return books.filter(b => 
      b.categories?.some(c => c.toLowerCase().includes('fantasy')) ||
      ['hphallows', 'hobbit1', 'lotr1', 'wayofkings1', 'namewind1'].includes(b.id)
    );
  }, [books]);

  const thrillerBooks = useMemo(() => {
    return books.filter(b => 
      b.categories?.some(c => c.toLowerCase().includes('thriller') || c.toLowerCase().includes('mystery')) ||
      ['silentpatient1', 'gonegirl1', 'davinci1', 'sherlock1'].includes(b.id)
    );
  }, [books]);

  const selfHelpBooks = useMemo(() => {
    return books.filter(b => 
      b.categories?.some(c => c.toLowerCase().includes('self help') || c.toLowerCase().includes('business')) ||
      ['atomichabits', 'sapiens1', 'deepwork1', 'canthurtme1'].includes(b.id)
    );
  }, [books]);

  const classicBooks = useMemo(() => {
    return books.filter(b => 
      b.categories?.some(c => c.toLowerCase().includes('classic')) ||
      ['1984george', 'bravenewworld1', 'greatgatsby1'].includes(b.id)
    );
  }, [books]);

  const renderBookCard = (book: Audiobook) => {
    const isSaved = savedIds.has(book.id);
    const fallbackSvg = `data:image/svg+xml;utf8,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400"><defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#18181b"/><stop offset="100%" stop-color="#09090b"/></linearGradient></defs><rect width="400" height="400" rx="16" fill="url(#bg)"/><rect x="16" y="16" width="368" height="368" rx="12" fill="none" stroke="rgba(245,158,11,0.3)" stroke-width="1.5"/><circle cx="200" cy="130" r="36" fill="rgba(245,158,11,0.15)"/><text x="200" y="220" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-size="20" font-weight="bold">${(book.title || 'Audiobook').replace(/&/g, '&amp;').slice(0, 30)}</text><text x="200" y="260" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="14">${(book.author || 'Unabridged').replace(/&/g, '&amp;').slice(0, 24)}</text><text x="200" y="335" text-anchor="middle" fill="#f59e0b" font-family="sans-serif" font-size="11" font-weight="bold" letter-spacing="3">AUDIOBOOK</text></svg>`
    )}`;
    const coverUrl = book.cover && !book.cover.includes('unsplash.com')
      ? book.cover.startsWith('http')
        ? `/api/audiobooks/proxy-image?url=${encodeURIComponent(book.cover)}`
        : book.cover
      : fallbackSvg;

    const handleToggleShelf = (e: React.MouseEvent) => {
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
        key={book.id}
        role="button"
        tabIndex={0}
        onClick={() => onSelectBook(book)}
        className="group relative flex flex-col bg-zinc-900/60 hover:bg-zinc-800/80 border border-white/5 hover:border-amber-500/40 rounded-2xl p-2.5 transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/10 hover:-translate-y-1 cursor-pointer w-full"
      >
        {/* Artwork Container */}
        <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-zinc-950 mb-2.5 shadow-md">
          <img
            src={coverUrl}
            alt={book.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLImageElement).src = fallbackSvg;
            }}
          />

          {/* Format Badge */}
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10 text-[10px] font-bold text-amber-300">
            <span>{book.format === 'MP3' ? 'MP3 320k' : 'M4B'}</span>
          </div>

          {/* Bookmark Button */}
          <button
            type="button"
            onClick={handleToggleShelf}
            className={`absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-md transition-all z-10 ${
              isSaved
                ? 'bg-amber-500 text-black shadow-md'
                : 'bg-black/60 text-white hover:bg-black/90 border border-white/10'
            }`}
            title={isSaved ? 'Remove from Bookshelf' : 'Save to Bookshelf'}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
          </button>

          {/* Length Badge */}
          {(book.duration || book.size) && (
            <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] text-zinc-300 font-mono border border-white/10">
              {book.duration || book.size}
            </div>
          )}

          {/* Hover Play Button */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
            <div className="w-12 h-12 rounded-full bg-amber-500 text-black flex items-center justify-center shadow-xl transform scale-90 group-hover:scale-100 transition duration-300">
              <Play className="w-5 h-5 fill-current ml-0.5" />
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div className="flex-1 flex flex-col justify-between px-1">
          <div>
            <h4
              className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors line-clamp-1 leading-tight mb-1"
              title={book.title}
            >
              {book.title}
            </h4>
            <p className="text-xs text-zinc-400 truncate mb-1">{book.author}</p>
          </div>

          <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1 border-t border-white/5 mt-1">
            <span className="truncate max-w-[120px]">
              {book.narrator ? `🎙️ ${book.narrator}` : '🎧 Unabridged'}
            </span>
            <span className="text-amber-400/80 font-medium flex items-center gap-0.5">
              <Zap className="w-2.5 h-2.5" /> {debridKey ? 'RD+' : 'Swarm'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderHorizontalShelf = (
    title: string,
    subtitle: string,
    icon: React.ReactNode,
    shelfBooks: Audiobook[],
    genreId: string
  ) => {
    if (!shelfBooks || shelfBooks.length === 0) return null;

    return (
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-inner">
              {icon}
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>{title}</span>
                <span className="text-xs font-normal text-zinc-500">({shelfBooks.length})</span>
              </h3>
              <p className="text-xs text-zinc-400">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveGenre(genreId);
              setSearchQuery('');
            }}
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 group py-1.5 px-3 rounded-lg hover:bg-amber-500/10 transition cursor-pointer"
          >
            <span>See all</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        <div className="flex overflow-x-auto gap-4 pb-3 snap-x snap-mandatory scrollbar-none -mx-4 sm:-mx-8 px-4 sm:px-8">
          {shelfBooks.map((book) => (
            <div key={book.id} className="snap-start shrink-0 w-[170px] sm:w-[190px]">
              {renderBookCard(book)}
            </div>
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-28 bg-[#090a0f] min-h-screen -mx-4 sm:-mx-8 px-4 sm:px-8 pt-4">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-b from-zinc-900/80 to-zinc-900/40 p-4 sm:p-6 rounded-2xl border border-white/5 backdrop-blur-md shadow-2xl">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-md shadow-amber-500/20">
              AUDIOBOOK BAY & DEBRID
            </span>
            <span className="text-xs text-zinc-400">
              Unabridged M4B & MP3 • Real-Debrid Swarm Resolution
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Audiobooks Hub</span>
          </h1>
        </div>

        {/* Right Action: Debrid Status Pill + Search Bar */}
        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          {/* Debrid Cloud Pill */}
          {debridKey ? (
            <button
              type="button"
              onClick={() => setIsDebridModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 transition cursor-pointer text-xs font-semibold shadow-md whitespace-nowrap"
              title="Real-Debrid API key active. Click to view or reconfigure."
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>RD+ Swarms Active</span>
              <span className="text-[10px] text-emerald-400/60 border-l border-emerald-500/30 pl-2 ml-1">
                Configure
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsDebridModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 text-amber-300 transition cursor-pointer text-xs font-semibold shadow-lg shadow-amber-500/10 whitespace-nowrap group"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
              <span>Connect Real-Debrid</span>
              <span className="text-[10px] bg-amber-400/20 text-amber-200 px-1.5 py-0.5 rounded font-mono">
                Instant
              </span>
            </button>
          )}

          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search titles, authors, narrators..."
              className="w-full bg-zinc-950/80 border border-white/10 focus:border-amber-500 rounded-xl py-2 pl-9 pr-8 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all shadow-inner"
            />
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  fetchFeed(1);
                }}
                className="absolute right-2.5 top-2.5 text-zinc-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Source Selector & Genre Pills */}
      <div className="flex flex-col gap-3 border-b border-white/10 pb-4">
        {/* Source Engine Toggle */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider mr-1">Engine:</span>
          {[
            { id: 'all', label: '⚡ All & AudiobookBay Swarms' },
            { id: 'webtorrent', label: '🧲 WebTorrent P2P' },
            { id: 'archive', label: '🏛️ BBC & Archive.org' },
            { id: 'youtube', label: '📺 YouTube Editions' }
          ].map((src) => {
            const isSelected = sourceType === src.id;
            return (
              <button
                key={src.id}
                type="button"
                onClick={() => setSourceType(src.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500 text-black font-bold shadow-md shadow-amber-500/20'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/5'
                }`}
              >
                {src.label}
              </button>
            );
          })}
        </div>

        {/* Genre Pills */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          {genres.map((g) => {
            const isActive = activeGenre === g.id;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => {
                  setActiveGenre(g.id);
                  setSearchQuery('');
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  isActive
                    ? 'bg-white text-black shadow-lg font-bold'
                    : 'bg-zinc-900/60 text-zinc-300 hover:text-white border border-white/10 hover:border-zinc-500'
                }`}
              >
                {g.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error State */}
      {errorMsg && (
        <div className="p-6 rounded-2xl bg-zinc-900/80 border border-red-500/30 text-center flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center border border-red-500/20">
            <Activity className="w-6 h-6" />
          </div>
          <p className="text-sm text-zinc-300 max-w-sm">{errorMsg}</p>
          <button
            onClick={() => fetchFeed(currentPage)}
            className="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl transition cursor-pointer shadow-lg shadow-amber-500/20"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Jump Back In (Continue Listening) */}
      {continueList.length > 0 && !searchQuery && !activeGenre && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-amber-400" />
              <span>Jump Back In</span>
            </h2>
          </div>
          <div className="flex overflow-x-auto gap-4 pb-3 snap-x snap-mandatory scrollbar-none -mx-4 sm:-mx-8 px-4 sm:px-8">
            {continueList.map((item) => {
              const fallbackItemSvg = `data:image/svg+xml;utf8,${encodeURIComponent(
                `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" rx="8" fill="#18181b"/><circle cx="50" cy="50" r="20" fill="rgba(245,158,11,0.2)"/><text x="50" y="55" text-anchor="middle" fill="#f59e0b" font-family="sans-serif" font-size="12" font-weight="bold">AUDIO</text></svg>`
              )}`;
              const coverUrl = item.cover && !item.cover.includes('unsplash.com')
                ? item.cover.startsWith('http')
                  ? `/api/audiobooks/proxy-image?url=${encodeURIComponent(item.cover)}`
                  : item.cover
                : fallbackItemSvg;

              return (
                <div
                  key={item.bookId}
                  onClick={() => onResumeListening(item)}
                  className="snap-start shrink-0 w-[280px] sm:w-[320px] bg-zinc-900/70 border border-white/5 hover:border-amber-500/40 rounded-2xl p-3 flex gap-3 group transition cursor-pointer shadow-lg hover:shadow-amber-500/10 relative overflow-hidden backdrop-blur-sm"
                >
                  <img
                    src={coverUrl}
                    alt=""
                    className="w-16 h-16 object-cover rounded-xl shadow-md shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = fallbackItemSvg;
                    }}
                  />
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h4 className="text-xs font-bold text-white truncate group-hover:text-amber-400 transition-colors">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-zinc-400 truncate mt-0.5 mb-2">{item.author}</p>

                    <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden flex">
                      <div
                        className="bg-amber-500 h-full rounded-full transition-all"
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-1 font-mono">
                      <span>{Math.round(item.percent)}% listened</span>
                      <button
                        type="button"
                        onClick={(e) => handleClearProgress(item.bookId, e)}
                        className="text-zinc-600 hover:text-red-400 p-0.5 transition"
                        title="Dismiss from history"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Featured Hero Banner */}
      {!loading && !searchQuery && books.length > 0 && !activeGenre && (
        <section
          className="relative w-full rounded-3xl overflow-hidden shadow-2xl border border-white/10 group cursor-pointer"
          onClick={() => onSelectBook(books[0])}
        >
          {/* Ambient Backdrop Blur */}
          <div className="absolute inset-0 bg-zinc-950">
            <img
              src={
                books[0].cover
                  ? books[0].cover.startsWith('http')
                    ? `/api/audiobooks/proxy-image?url=${encodeURIComponent(books[0].cover)}`
                    : books[0].cover
                  : ''
              }
              className="w-full h-full object-cover blur-3xl opacity-30 scale-125"
              alt=""
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-transparent" />

          <div className="relative p-6 sm:p-10 flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8 z-10">
            <div className="relative shrink-0">
              <img
                src={
                  books[0].cover
                    ? books[0].cover.startsWith('http')
                      ? `/api/audiobooks/proxy-image?url=${encodeURIComponent(books[0].cover)}`
                      : books[0].cover
                    : ''
                }
                className="w-44 h-44 sm:w-56 sm:h-56 object-cover rounded-2xl shadow-2xl group-hover:scale-105 transition-transform duration-500 border border-white/10"
                alt=""
              />
              <div className="absolute -bottom-2 -right-2 bg-amber-500 text-black text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-lg uppercase">
                {books[0].format === 'MP3' ? 'MP3 320k' : 'M4B Unabridged'}
              </div>
            </div>

            <div className="flex flex-col gap-2.5 max-w-2xl text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <span className="text-amber-400 text-xs font-bold tracking-widest uppercase flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Featured Audio Swarm
                </span>
                <span className="text-[10px] bg-white/10 text-zinc-300 px-2 py-0.5 rounded-full">
                  10Gbps CDN Ready
                </span>
              </div>

              <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight line-clamp-2">
                {books[0].title}
              </h2>
              <p className="text-base sm:text-lg text-zinc-300 font-medium">{books[0].author}</p>

              {books[0].description && (
                <p className="text-xs sm:text-sm text-zinc-400 line-clamp-2 sm:line-clamp-3 leading-relaxed">
                  {books[0].description}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-1 text-xs text-zinc-400">
                {books[0].narrator && (
                  <span className="flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                    <User className="w-3 h-3 text-amber-400" />
                    <span>Narrator: {books[0].narrator}</span>
                  </span>
                )}
                {books[0].duration && (
                  <span className="flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>{books[0].duration}</span>
                  </span>
                )}
              </div>

              <div className="mt-3 flex items-center justify-center md:justify-start gap-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectBook(books[0]);
                  }}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-xs sm:text-sm rounded-xl transition flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" /> Stream Swarm
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const isSaved = savedIds.has(books[0].id);
                    if (isSaved) {
                      audiobookStorage.removeFromShelf(books[0].id);
                      setSavedIds((prev) => {
                        const next = new Set(prev);
                        next.delete(books[0].id);
                        return next;
                      });
                    } else {
                      audiobookStorage.saveToShelf(books[0], 'want_to_listen');
                      setSavedIds((prev) => new Set(prev).add(books[0].id));
                    }
                  }}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm rounded-xl transition flex items-center gap-1.5 border border-white/10 cursor-pointer"
                >
                  <Bookmark
                    className={`w-4 h-4 ${savedIds.has(books[0].id) ? 'fill-current text-amber-400' : ''}`}
                  />
                  <span>{savedIds.has(books[0].id) ? 'Saved' : 'Save to Bookshelf'}</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="bg-zinc-900/60 rounded-2xl p-3 flex flex-col gap-3 animate-pulse border border-white/5"
            >
              <div className="aspect-square w-full rounded-xl bg-zinc-800" />
              <div className="h-4 w-3/4 bg-zinc-800 rounded" />
              <div className="h-3 w-1/2 bg-zinc-800 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Main Content Area */}
      {!loading && !errorMsg && books.length > 0 && (
        <div className="space-y-10">
          {/* Specific Search or Filter View */}
          {searchQuery || activeGenre ? (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                    <span>
                      {searchQuery
                        ? `Search: "${searchQuery}"`
                        : activeGenre === 'my_bookshelf'
                        ? 'My Bookshelf'
                        : genres.find((g) => g.id === activeGenre)?.label || activeGenre.toUpperCase()}
                    </span>
                    <span className="text-sm font-normal text-zinc-400">({books.length})</span>
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Click any title for chapter tracks, Real-Debrid swarm unrestrict, and instant streaming.
                  </p>
                </div>
              </div>

              {activeGenre === 'my_bookshelf' && books.length === 0 ? (
                <div className="text-center py-16 px-4 bg-zinc-900/40 rounded-3xl border border-white/5">
                  <Bookmark className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-white mb-1">Your bookshelf is empty</h3>
                  <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-4">
                    Tap the bookmark ribbon on any audiobook cover to build your personal offline listening queue.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveGenre('')}
                    className="px-5 py-2 rounded-xl bg-amber-500 text-black font-bold text-xs"
                  >
                    Browse Bestsellers
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
                  {books.map((book) => renderBookCard(book))}
                </div>
              )}
            </div>
          ) : (
            // Rich Curated Shelves on Home View
            <>
              {/* Shelf 1: Trending Swarms */}
              {renderHorizontalShelf(
                'Trending Swarms',
                'Top-seeded releases ready for instant 10Gbps Debrid unrestrict',
                <Flame className="w-5 h-5" />,
                trendingBooks,
                ''
              )}

              {/* Shelf 2: Sci-Fi & Cyberpunk Epics */}
              {renderHorizontalShelf(
                'Sci-Fi & Cyberpunk Epics',
                'Mind-bending cosmic odysseys, dystopian futures & cyber warfare',
                <Compass className="w-5 h-5" />,
                sciFiBooks,
                'sci-fi'
              )}

              {/* Shelf 3: Fantasy & Mythic Adventures */}
              {renderHorizontalShelf(
                'Fantasy & Mythic Sagas',
                'High magic, epic world-building, swords, and legendary heroes',
                <Layers className="w-5 h-5" />,
                fantasyBooks,
                'fantasy'
              )}

              {/* Shelf 4: Mystery & Psychological Thrillers */}
              {renderHorizontalShelf(
                'Mystery & Psychological Thrillers',
                'High stakes investigations, shocking twists, and cold murder cases',
                <ShieldCheck className="w-5 h-5" />,
                thrillerBooks,
                'thriller'
              )}

              {/* Shelf 5: Self-Growth & Mental Toughness */}
              {renderHorizontalShelf(
                'Mindset, Habits & Self-Growth',
                'Build unbeatable discipline, focus deeply, and shatter physical limits',
                <Sparkles className="w-5 h-5" />,
                selfHelpBooks,
                'self-growth'
              )}

              {/* Shelf 6: Classics & World Literature */}
              {renderHorizontalShelf(
                'Classics & Timeless Masterpieces',
                'Enduring stories, dystopian warnings, and iconic literary works',
                <BookOpen className="w-5 h-5" />,
                classicBooks,
                'classic'
              )}

              {/* Bottom: Complete Library Grid */}
              <section className="pt-6 border-t border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white tracking-tight">All Audio Swarms</h3>
                    <p className="text-xs text-zinc-400">
                      Complete library index across all categories and mirrors
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
                  {books.map((book) => renderBookCard(book))}
                </div>
              </section>
            </>
          )}
        </div>
      )}

      {/* Pagination Bar */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-10 pb-6">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => fetchFeed(currentPage - 1)}
            className="p-2.5 rounded-xl bg-zinc-900 border border-white/10 disabled:opacity-30 text-zinc-300 hover:bg-zinc-800 transition cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-xs font-semibold text-zinc-300 font-mono">
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => fetchFeed(currentPage + 1)}
            className="p-2.5 rounded-xl bg-zinc-900 border border-white/10 disabled:opacity-30 text-zinc-300 hover:bg-zinc-800 transition cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Stremio / Debrid Settings Modal */}
      <StremioSettingsModal
        isOpen={isDebridModalOpen}
        onClose={() => setIsDebridModalOpen(false)}
        onSaved={() => {
          setDebridKey(stremioService.getDebridKey());
          setDebridProvider(stremioService.getDebridProvider());
        }}
      />
    </div>
  );
};

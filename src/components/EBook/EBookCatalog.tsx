import React, { useState, useRef, useEffect, useMemo } from 'react';
import { EBook } from '../../types/ebook';
import { EBookCard } from './EBookCard';
import { SendToKoboModal } from './SendToKoboModal';
import { CloudBookImportModal } from './CloudBookImportModal';
import { api } from '../../services/api';
import { ebookStorage } from '../../services/ebookStorage';
import {
  Upload,
  BookOpen,
  Sparkles,
  Search,
  Bookmark,
  Library,
  Compass,
  Scroll,
  Zap,
  TrendingUp,
  X,
  Waves,
  Globe,
  Radio,
  CheckCircle2,
  Play,
  Star,
  Award,
  BookMarked,
  Trash2,
  Download,
  ExternalLink,
  MessageSquare,
  Bot,
  Send,
  Loader2,
  Flame,
  LayoutGrid,
  List,
  ArrowUpDown,
  SlidersHorizontal,
  Check,
  Cloud,
  Tablet,
  FolderOpen
} from 'lucide-react';

interface EBookCatalogProps {
  onlineBooks: EBook[];
  localBooks: EBook[];
  loading: boolean;
  onSelectBook: (book: EBook) => void;
  onReadNow?: (book: EBook) => void;
  onUploadFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectCategory: (category: string) => void;
  activeCategory: string;
  searchQuery: string;
  onSearchQuery: (query: string) => void;
}

const EBOOK_PLATFORMS = [
  {
    id: 'kindle',
    name: 'Amazon Kindle',
    tag: 'KINDLE',
    bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500 hover:text-slate-950',
    activeBg: 'bg-amber-500 text-slate-950 shadow-amber-500/40 border-amber-400 ring-2 ring-amber-400/50'
  },
  {
    id: 'kobo',
    name: 'Rakuten Kobo',
    tag: 'KOBO',
    bg: 'bg-red-600/20 text-red-300 border-red-500/40 hover:bg-red-600 hover:text-white',
    activeBg: 'bg-red-600 text-white shadow-red-600/40 border-red-400 ring-2 ring-red-400/50'
  },
  {
    id: 'applebooks',
    name: 'Apple Books',
    tag: ' BOOKS',
    bg: 'bg-slate-700/30 text-slate-200 border-slate-500/40 hover:bg-slate-700 hover:text-white',
    activeBg: 'bg-slate-200 text-slate-950 shadow-slate-200/40 border-white ring-2 ring-slate-300/50'
  },
  {
    id: 'googleplay',
    name: 'Google Play Books',
    tag: 'PLAY BOOKS',
    bg: 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-600 hover:text-white',
    activeBg: 'bg-emerald-500 text-slate-950 shadow-emerald-500/40 border-emerald-400 ring-2 ring-emerald-400/50'
  },
  {
    id: 'nook',
    name: 'Barnes & Noble Nook',
    tag: 'NOOK',
    bg: 'bg-teal-700/20 text-teal-300 border-teal-500/40 hover:bg-teal-700 hover:text-white',
    activeBg: 'bg-teal-600 text-white shadow-teal-600/40 border-teal-400 ring-2 ring-teal-400/50'
  },
  {
    id: 'standardebooks',
    name: 'Standard Ebooks',
    tag: 'STANDARD EBOOKS',
    bg: 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-600 hover:text-white',
    activeBg: 'bg-indigo-600 text-white shadow-indigo-600/40 border-indigo-400 ring-2 ring-indigo-400/50'
  },
  {
    id: 'gutenberg',
    name: 'Project Gutenberg',
    tag: 'GUTENBERG',
    bg: 'bg-sky-600/20 text-sky-300 border-sky-500/40 hover:bg-sky-600 hover:text-white',
    activeBg: 'bg-sky-500 text-slate-950 shadow-sky-500/40 border-sky-400 ring-2 ring-sky-400/50'
  }
];

const CURATED_FEEDS = [
  { id: 'classics', label: '📖 Full-Text Classics (Read Instantly)', icon: BookOpen },
  { id: 'booktok', label: '🔥 #BookTok Viral Sensations', icon: Flame },
  { id: 'popular', label: '✨ All Bestsellers', icon: TrendingUp },
  { id: 'nyt_fiction', label: '🏆 NYT Fiction', icon: Award },
  { id: 'nyt_nonfiction', label: '📊 NYT Non-Fiction', icon: Scroll },
  { id: 'goodreads_choice', label: '⭐ Goodreads Choice', icon: Star },
  { id: 'webnovels', label: '⚡ Web Novels & LitRPG', icon: Zap },
  { id: 'my_bookshelf', label: '📚 My Bookshelf', icon: Library },
  { id: 'ai_matchmaker', label: '🤖 AI Vibe Matcher', icon: Bot }
];

const POPULAR_SEARCHES = [
  'The Lion and the Deathless Dark',
  'Fourth Wing',
  'Iron Flame',
  'A Court of Thorns and Roses',
  'The Housemaid',
  'The Seven Husbands of Evelyn Hugo',
  'The Silent Patient',
  'Twisted Love',
  'Icebreaker',
  'Divine Rivals',
  'The Women',
  'Project Hail Mary',
  'Atomic Habits',
  'Yellowface',
  'Shatter Me',
  'Shadow Slave'
];

const VIBE_PROMPT_SUGGESTIONS = [
  '🚀 Fast-paced Sci-Fi Mystery like Project Hail Mary',
  '🐉 Dark Magic Academy with Deadly Trials like Fourth Wing',
  '🧠 Habit Stacking & Mental Models for Peak Performance',
  '🏛️ Dark Academia & Translation Magic like Babel',
  '⚔️ Progression Fantasy & System Leveling like Solo Leveling',
  '🕯️ Cozy Found-Family Fantasy like The House in the Cerulean Sea'
];

export const EBookCatalog: React.FC<EBookCatalogProps> = ({
  onlineBooks,
  localBooks,
  loading,
  onSelectBook,
  onReadNow,
  onUploadFile,
  onSelectCategory,
  activeCategory,
  searchQuery,
  onSearchQuery
}) => {
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [activeTab, setActiveTab] = useState<string>(activeCategory || 'popular');
  const [shelfBooks, setShelfBooks] = useState<EBook[]>(localBooks);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'recent' | 'title' | 'author' | 'rating'>('recent');
  const [shelfFilter, setShelfFilter] = useState<'all' | 'reading' | 'completed'>('all');
  const [selectedKoboBook, setSelectedKoboBook] = useState<EBook | null>(null);
  const [isCloudImportOpen, setIsCloudImportOpen] = useState<boolean>(false);
  const [showOceanModal, setShowOceanModal] = useState<boolean>(false);
  const [oceanUrl, setOceanUrl] = useState<string>('');
  const [importingOcean, setImportingOcean] = useState<boolean>(false);
  const [oceanStatus, setOceanStatus] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI Matchmaker State
  const [vibeInput, setVibeInput] = useState('');
  const [aiRecs, setAiRecs] = useState<EBook[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    setShelfBooks(ebookStorage.getLibrary());
  }, [localBooks]);

  const lastReadBook = useMemo(() => {
    return ebookStorage.getLastReadBook();
  }, [shelfBooks]);

  useEffect(() => {
    if (activeCategory) setActiveTab(activeCategory);
  }, [activeCategory]);

  const handleImportOceanofpdf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oceanUrl.trim() || importingOcean) return;

    setImportingOcean(true);
    setOceanStatus('🌊 Scraping OceanofPDF, resolving download link & extracting chapters...');
    try {
      const importedBook = await api.importOceanofpdfBook(oceanUrl.trim());
      if (importedBook) {
        await ebookStorage.saveBook(importedBook);
        setShelfBooks(ebookStorage.getLibrary());
        setOceanUrl('');
        setShowOceanModal(false);
        if (onReadNow) onReadNow(importedBook);
      } else {
        setOceanStatus('Could not resolve direct book download. Please verify the URL or try searching by title.');
      }
    } catch (err: any) {
      setOceanStatus(`Error: ${err.message}`);
    } finally {
      setImportingOcean(false);
    }
  };

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    if (tabId === 'my_bookshelf') {
      setShelfBooks(ebookStorage.getLibrary());
    } else if (tabId !== 'ai_matchmaker') {
      onSelectCategory(tabId);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchQuery(localSearch);
  };

  const handleClear = () => {
    setLocalSearch('');
    onSearchQuery('');
  };

  const handleRemoveFromShelf = async (e: React.MouseEvent, bookId: string | number) => {
    e.stopPropagation();
    await ebookStorage.removeBook(bookId);
    setShelfBooks(ebookStorage.getLibrary());
  };

  const handleTriggerAiMatch = async (promptToUse?: string) => {
    const queryText = promptToUse || vibeInput;
    if (!queryText.trim()) return;

    setLoadingAi(true);
    try {
      const recs = await api.getAIMatchmakerRecommendations(queryText.trim());
      setAiRecs(recs);
    } catch (e) {
      console.error('AI matchmaker error:', e);
    } finally {
      setLoadingAi(false);
    }
  };

  const isPlatformActive = EBOOK_PLATFORMS.some((p) => p.id === activeCategory);
  const featured = onlineBooks[0];

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-8 animate-fade-in">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".epub,.txt,.md,.html"
        onChange={onUploadFile}
        className="hidden"
      />

      {/* -------------------------------------------------------------
          TOP SHELF: MY BOOKSHELF & CONTINUE READING (PERSISTENT AT TOP)
         ------------------------------------------------------------- */}
      {shelfBooks.length > 0 && activeTab !== 'my_bookshelf' && !searchQuery && (
        <div className="rounded-3xl p-5 sm:p-6 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/30 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookMarked className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm sm:text-base font-black text-white tracking-wide">
                My Bookshelf & In-Progress Reads
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                {shelfBooks.length} Saved
              </span>
            </div>
            <button
              onClick={() => handleSelectTab('my_bookshelf')}
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>View Full Bookshelf</span>
              <BookOpen className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {shelfBooks.slice(0, 6).map((book) => (
              <EBookCard
                key={book.id}
                book={book}
                onClick={onSelectBook}
                onReadNow={onReadNow}
              />
            ))}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          1. TOP HUB TABS: CURATED FEEDS, BOOKSHELF & AI MATCHMAKER
         ------------------------------------------------------------- */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-black text-slate-300 uppercase tracking-wider">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Curated Feeds & Leaderboards</span>
          </div>

          <div className="flex items-center gap-2">
            {/* OceanofPDF Direct 1-Click Import Button */}
            <button
              onClick={() => setShowOceanModal(true)}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition-all hover:scale-105 cursor-pointer"
              title="Download directly from OceanofPDF Link"
            >
              <Globe className="w-3.5 h-3.5 text-sky-200" />
              <span className="hidden sm:inline">OceanofPDF</span>
            </button>

            {/* Cloud & Calibre Sync Button */}
            <button
              onClick={() => setIsCloudImportOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-sky-600 hover:text-white border border-slate-700 text-sky-300 font-bold text-xs flex items-center gap-1.5 shadow transition-all hover:scale-105 cursor-pointer"
              title="Import from Google Drive or Calibre Server"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Drive / Calibre</span>
            </button>

            {/* Send to Kobo Button */}
            <button
              onClick={() => setSelectedKoboBook(lastReadBook || shelfBooks[0] || onlineBooks[0])}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-purple-600 hover:text-white border border-slate-700 text-purple-300 font-bold text-xs flex items-center gap-1.5 shadow transition-all hover:scale-105 cursor-pointer"
              title="Wireless Send to Kobo E-Reader (BookDrop)"
            >
              <Tablet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Send to Kobo</span>
            </button>

            {/* Local Upload Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all hover:scale-105 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import File</span>
            </button>
          </div>
        </div>

        {/* Curated Feed Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CURATED_FEEDS.map((feed) => {
            const Icon = feed.icon;
            const isSelected = activeTab === feed.id && !searchQuery;
            return (
              <button
                key={feed.id}
                onClick={() => handleSelectTab(feed.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black tracking-wide border shadow-lg transition-all whitespace-nowrap flex-shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-emerald-500/30 scale-105'
                    : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-slate-950' : 'text-emerald-400'}`} />
                <span>{feed.label}</span>
                {feed.id === 'my_bookshelf' && shelfBooks.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-950 text-emerald-400 text-[10px] font-black">
                    {shelfBooks.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* E-Book Platform Skins Row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none pt-1">
          {EBOOK_PLATFORMS.map((net) => {
            const isSelected = activeCategory === net.id && !searchQuery;
            return (
              <button
                key={net.id}
                onClick={() => onSelectCategory(net.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold tracking-wide border transition-all whitespace-nowrap flex-shrink-0 cursor-pointer ${
                  isSelected ? `${net.activeBg} scale-105` : `${net.bg} bg-slate-900/60`
                }`}
              >
                <span>{net.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* -------------------------------------------------------------
          2. AI NATURAL LANGUAGE VIBE & PLOT MATCHMAKER TAB
         ------------------------------------------------------------- */}
      {activeTab === 'ai_matchmaker' && !searchQuery && (
        <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-indigo-950/60 via-slate-900 to-purple-950/50 border border-indigo-500/40 shadow-2xl space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold">
                <Bot className="w-3.5 h-3.5" />
                <span>AI Literary Concierge</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">Find Books by Vibe, Trope, or Plot</h2>
              <p className="text-xs text-slate-300 max-w-xl">
                Describe the feeling, setting, or plot you want to read next. Local AI will find the best matches with instant download links.
              </p>
            </div>
          </div>

          {/* Search Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleTriggerAiMatch();
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <MessageSquare className="w-4 h-4 text-indigo-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={vibeInput}
                onChange={(e) => setVibeInput(e.target.value)}
                placeholder="e.g. A fast-paced sci-fi thriller set on a generation ship with witty banter..."
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-slate-950/80 border border-indigo-500/30 focus:border-indigo-400 focus:outline-none text-xs sm:text-sm text-white placeholder-slate-500 shadow-inner"
              />
            </div>
            <button
              type="submit"
              disabled={loadingAi}
              className="px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
            >
              {loadingAi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>Find Matches</span>
            </button>
          </form>

          {/* Quick Suggestion Chips */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Try a Vibe:</span>
            <div className="flex flex-wrap gap-2">
              {VIBE_PROMPT_SUGGESTIONS.map((sug, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setVibeInput(sug);
                    handleTriggerAiMatch(sug);
                  }}
                  className="text-xs px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-indigo-600/30 border border-slate-700 hover:border-indigo-500/50 text-slate-300 hover:text-white transition-all"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          {/* AI Recommended Books Grid */}
          {aiRecs.length > 0 && (
            <div className="pt-4 border-t border-slate-800 space-y-4">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>AI Recommended Matches</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {aiRecs.map((book) => (
                  <EBookCard key={book.id} book={book} onClick={onSelectBook} onReadNow={onReadNow} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------
          3. "MY BOOKSHELF" TAB: VISUAL LIBRARY WITH READING PROGRESS
         ------------------------------------------------------------- */}
      {activeTab === 'my_bookshelf' && !searchQuery && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <span>My Personal Bookshelf</span>
                <BookMarked className="w-5 h-5 text-emerald-400" />
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                All imported .EPUB, .PDF, and in-progress books stored privately in your browser.
              </p>
            </div>

            {/* Bookshelf Filter & View Mode Controls */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-bold">
                <button
                  onClick={() => setShelfFilter('all')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    shelfFilter === 'all' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All ({shelfBooks.length})
                </button>
                <button
                  onClick={() => setShelfFilter('reading')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    shelfFilter === 'reading' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Reading ({shelfBooks.filter((b) => (b.currentProgress || 0) > 0 && (b.currentProgress || 0) < 100).length})
                </button>
                <button
                  onClick={() => setShelfFilter('completed')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    shelfFilter === 'completed' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Completed ({shelfBooks.filter((b) => (b.currentProgress || 0) >= 100).length})
                </button>
              </div>

              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === 'grid' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === 'list' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                  title="List View"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {shelfBooks.length === 0 ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-12 rounded-3xl border-2 border-dashed border-slate-800 hover:border-emerald-500/50 bg-slate-900/40 text-center space-y-3 cursor-pointer transition-all hover:bg-slate-900/70"
            >
              <Upload className="w-10 h-10 text-slate-500 mx-auto" />
              <h3 className="text-base font-bold text-white">Your Bookshelf is Empty</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Drag and drop any .EPUB, .PDF, or .TXT file here or click to import and start reading immediately.
              </p>
            </div>
          ) : viewMode === 'list' ? (
            /* LIST / TABLE VIEW */
            <div className="rounded-3xl bg-slate-900/60 border border-slate-800 overflow-hidden">
              <div className="divide-y divide-slate-800/60">
                {shelfBooks
                  .filter((b) => {
                    if (shelfFilter === 'reading') return (b.currentProgress || 0) > 0 && (b.currentProgress || 0) < 100;
                    if (shelfFilter === 'completed') return (b.currentProgress || 0) >= 100;
                    return true;
                  })
                  .map((book) => (
                    <div
                      key={book.id}
                      onClick={() => onSelectBook(book)}
                      className="p-4 flex items-center justify-between gap-4 hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <img
                          src={book.cover || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=300'}
                          alt={book.title}
                          className="w-12 h-16 object-cover rounded-xl shadow border border-slate-800 flex-shrink-0"
                        />
                        <div className="space-y-1 min-w-0">
                          <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                            {book.title}
                          </h4>
                          <p className="text-xs text-slate-400 truncate">{book.author}</p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500">
                            <span>{book.year || 'Classic'}</span>
                            <span>•</span>
                            <span className="text-emerald-400 font-semibold">
                              {book.currentProgress ? `${book.currentProgress}% read` : 'Not started'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {onReadNow && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onReadNow(book);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>Read</span>
                          </button>
                        )}
                        <button
                          onClick={(e) => handleRemoveFromShelf(e, book.id)}
                          className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Remove from Shelf"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            /* CARD GRID VIEW */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {shelfBooks
                .filter((b) => {
                  if (shelfFilter === 'reading') return (b.currentProgress || 0) > 0 && (b.currentProgress || 0) < 100;
                  if (shelfFilter === 'completed') return (b.currentProgress || 0) >= 100;
                  return true;
                })
                .map((book) => (
                  <div key={book.id} className="relative group">
                    <EBookCard book={book} onClick={onSelectBook} onReadNow={onReadNow} />
                    
                    {/* Delete from Shelf Button */}
                    <button
                      onClick={(e) => handleRemoveFromShelf(e, book.id)}
                      title="Remove from Shelf"
                      className="absolute top-2 left-2 p-1.5 rounded-lg bg-slate-950/80 text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-600 hover:text-white shadow-md z-20"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------
          4. GLOBAL MULTI-MIRROR SEARCH & HERO HEADER
         ------------------------------------------------------------- */}
      {activeTab !== 'ai_matchmaker' && activeTab !== 'my_bookshelf' && !searchQuery && (
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-emerald-950/40 via-slate-900 to-sky-950/40 border border-slate-800 p-6 md:p-8 shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
                <Waves className="w-3.5 h-3.5" />
                <span>Multi-Mirror Global Book Finder</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">Access Every E-Book Free of Charge</h2>
              <p className="text-xs text-slate-300">
                1-Click downloads and online reading across OceanofPDF, Anna&apos;s Archive, Libgen, and Gutenberg.
              </p>
            </div>

            {/* Quick Mirror Badges */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-3 py-1.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-300 font-bold flex items-center gap-1.5">
                <Waves className="w-3.5 h-3.5" />
                <span>OceanofPDF</span>
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 font-bold flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                <span>Anna&apos;s Archive</span>
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5" />
                <span>Libgen RS</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          5. "CONTINUE READING" LAST READ HERO BANNER
         ------------------------------------------------------------- */}
      {!searchQuery && lastReadBook && (
        <div
          onClick={() => (onReadNow ? onReadNow(lastReadBook) : onSelectBook(lastReadBook))}
          className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/30 hover:border-emerald-500/60 flex items-center justify-between gap-4 cursor-pointer transition-all shadow-xl group"
        >
          <div className="flex items-center gap-4 min-w-0">
            <img
              src={lastReadBook.cover || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=300'}
              alt={lastReadBook.title}
              className="w-12 sm:w-14 h-16 sm:h-20 object-cover rounded-xl shadow-lg border border-slate-700 flex-shrink-0 group-hover:scale-105 transition-transform"
            />
            <div className="space-y-1 min-w-0">
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold uppercase tracking-wider border border-emerald-500/30">
                <BookOpen className="w-3 h-3" />
                <span>Resume Reading</span>
              </div>
              <h3 className="text-sm sm:text-base font-black text-white group-hover:text-emerald-400 transition-colors truncate">
                {lastReadBook.title}
              </h3>
              <p className="text-xs text-slate-400 truncate">{lastReadBook.author}</p>
              <div className="flex items-center gap-3 text-xs text-slate-300 pt-0.5">
                <div className="w-24 sm:w-36 bg-slate-800 rounded-full h-1.5 sm:h-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all"
                    style={{ width: `${Math.max(5, lastReadBook.currentProgress || 0)}%` }}
                  />
                </div>
                <span className="text-[11px] font-mono font-bold text-emerald-400">
                  Ch. {lastReadBook.currentChapter || 1} • {lastReadBook.currentProgress || 0}%
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onReadNow ? onReadNow(lastReadBook) : onSelectBook(lastReadBook);
            }}
            className="px-4 sm:px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 flex-shrink-0 transition-transform active:scale-95 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Resume</span>
          </button>
        </div>
      )}

      {/* -------------------------------------------------------------
          6. SEARCH BAR WITH CLEAR & DEBOUNCE & TRENDING CHIPS
         ------------------------------------------------------------- */}
      <div className="space-y-3">
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search any title, author, or ISBN across all libraries..."
            className="w-full pl-12 pr-12 py-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 focus:border-emerald-500 focus:outline-none text-xs sm:text-sm text-white placeholder-slate-500 shadow-xl"
          />
          {localSearch && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>

        {/* Trending Search Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mr-1 flex-shrink-0">
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <span>Trending:</span>
          </span>
          {POPULAR_SEARCHES.map((query) => (
            <button
              key={query}
              onClick={() => {
                setLocalSearch(query);
                onSearchQuery(query);
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-emerald-600 hover:text-white border border-slate-800 text-slate-300 transition-all flex-shrink-0 text-xs font-semibold"
            >
              {query}
            </button>
          ))}
        </div>
      </div>

      {/* -------------------------------------------------------------
          6. MAIN E-BOOKS CATALOG GRID
         ------------------------------------------------------------- */}
      {activeTab !== 'my_bookshelf' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-400" />
              <span>
                {searchQuery
                  ? `Search Results for "${searchQuery}"`
                  : activeTab === 'booktok'
                  ? '🔥 #BookTok Viral Sensations & Romantasy'
                  : activeTab === 'nyt_fiction'
                  ? '🏆 The New York Times Fiction Bestsellers'
                  : activeTab === 'nyt_nonfiction'
                  ? '📊 The New York Times Non-Fiction Bestsellers'
                  : activeTab === 'goodreads_choice'
                  ? '⭐ Goodreads Choice Award Winners'
                  : activeTab === 'webnovels'
                  ? '⚡ Trending Web Novels & LitRPG'
                  : '✨ Popular E-Books & Bestsellers'}
              </span>
            </h3>
            <span className="text-xs text-slate-400">{onlineBooks.length} titles available</span>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 animate-pulse">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="aspect-[2/3] rounded-2xl bg-slate-900 border border-slate-800" />
              ))}
            </div>
          ) : onlineBooks.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-slate-900/40 border border-slate-800 space-y-2">
              <p className="text-slate-400 text-sm">No books found matching this query.</p>
              <p className="text-xs text-slate-500">Try searching for an author name or alternative title.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {onlineBooks.map((book) => (
                <EBookCard key={book.id} book={book} onClick={onSelectBook} onReadNow={onReadNow} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Send to Kobo Modal */}
      {selectedKoboBook && (
        <SendToKoboModal
          book={selectedKoboBook}
          onClose={() => setSelectedKoboBook(null)}
        />
      )}

      {/* Cloud & Calibre Sync Modal */}
      {isCloudImportOpen && (
        <CloudBookImportModal
          onClose={() => setIsCloudImportOpen(false)}
          onBookImported={() => {
            setShelfBooks(ebookStorage.getLibrary());
          }}
          onSendToKobo={(b) => {
            setIsCloudImportOpen(false);
            setSelectedKoboBook(b);
          }}
        />
      )}

      {/* OceanofPDF Direct Importer Modal */}
      {showOceanModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          onClick={() => setShowOceanModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-slate-950 border border-sky-500/40 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-600 flex items-center justify-center text-white">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm sm:text-base">
                    OceanofPDF Direct Importer
                  </h3>
                  <p className="text-xs text-slate-400">
                    Paste any OceanofPDF URL or Book Title to download & read instantly
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowOceanModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleImportOceanofpdf} className="space-y-3 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  OceanofPDF Book URL or Title:
                </label>
                <input
                  type="text"
                  value={oceanUrl}
                  onChange={(e) => setOceanUrl(e.target.value)}
                  placeholder="e.g. https://oceanofpdf.com/authors/... or 'Fourth Wing Rebecca Yarros'"
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                  required
                />
              </div>

              {oceanStatus && (
                <p className="text-xs text-sky-400 font-mono bg-sky-950/30 p-2.5 rounded-xl border border-sky-500/30">
                  {oceanStatus}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOceanModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!oceanUrl.trim() || importingOcean}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-sky-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all hover:scale-105"
                >
                  {importingOcean ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Importing & Unpacking...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Download & Open Book</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

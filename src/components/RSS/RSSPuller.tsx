import React, { useState, useEffect } from 'react';
import { RSSFeed, RSSArticle } from '../../types/rss';
import {
  Rss,
  Plus,
  Trash2,
  ExternalLink,
  RefreshCw,
  BookOpen,
  Tv,
  Trophy,
  Flame,
  Globe,
  Clock,
  User,
  Sparkles,
  X,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const CURATED_FEEDS: RSSFeed[] = [
  {
    id: 'feed_ann',
    title: 'Anime News Network',
    url: 'https://www.animenewsnetwork.com/all/rss.xml',
    category: 'anime',
    description: 'Breaking anime, manga, and light novel news directly from Tokyo and worldwide.'
  },
  {
    id: 'feed_bbc_world',
    title: 'BBC World News',
    url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    category: 'custom',
    description: 'International global headlines and cultural reports.'
  },
  {
    id: 'feed_bbc_sports',
    title: 'BBC Sports Live',
    url: 'https://feeds.bbci.co.uk/sport/rss.xml',
    category: 'sports',
    description: 'Live match reports, Premier League, Formula 1, and global tournaments.'
  },
  {
    id: 'feed_book_riot',
    title: 'Book Riot Literary News',
    url: 'https://bookriot.com/feed/',
    category: 'books',
    description: 'Trending book releases, author interviews, reviews, and reading guides.'
  },
  {
    id: 'feed_ign',
    title: 'IGN Entertainment',
    url: 'https://feeds.feedburner.com/ign/all',
    category: 'tech',
    description: 'Comics, movies, TV series reviews, and entertainment coverage.'
  }
];

const LOCAL_FEEDS_KEY = 'omnistream_rss_feeds';

export const RSSPuller: React.FC = () => {
  const { showError, showSuccess } = useToast();
  const [feeds, setFeeds] = useState<RSSFeed[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_FEEDS_KEY);
      return saved ? JSON.parse(saved) : CURATED_FEEDS;
    } catch {
      return CURATED_FEEDS;
    }
  });

  const [activeFeedId, setActiveFeedId] = useState<string>(feeds[0]?.id || 'feed_ann');
  const [articles, setArticles] = useState<RSSArticle[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [newFeedUrl, setNewFeedUrl] = useState<string>('');
  const [selectedArticle, setSelectedArticle] = useState<RSSArticle | null>(null);

  // Fetch active feed
  useEffect(() => {
    const activeFeed = feeds.find((f) => f.id === activeFeedId);
    if (activeFeed) {
      loadFeedArticles(activeFeed.url);
    }
  }, [activeFeedId]);

  const loadFeedArticles = async (url: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rss/pull?url=${encodeURIComponent(url)}`);
      if (!res.ok) throw new Error('Failed to pull RSS feed');
      const data = await res.json();
      setArticles(data.articles || []);
    } catch (err) {
      console.error('RSS pull error:', err);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeedUrl.trim()) return;

    const url = newFeedUrl.trim();
    setNewFeedUrl('');
    setLoading(true);

    try {
      const res = await fetch(`/api/rss/pull?url=${encodeURIComponent(url)}`);
      if (!res.ok) throw new Error('Invalid or unreachable RSS feed URL');
      const data = await res.json();

      const newFeed: RSSFeed = {
        id: `custom_${Date.now()}`,
        title: data.feedTitle || 'Custom Feed',
        url,
        category: 'custom',
        description: `Custom RSS feed from ${url}`,
        articles: data.articles
      };

      const updated = [newFeed, ...feeds];
      setFeeds(updated);
      localStorage.setItem(LOCAL_FEEDS_KEY, JSON.stringify(updated));
      setActiveFeedId(newFeed.id);
      setArticles(data.articles || []);
      showSuccess(`Added RSS Feed: "${newFeed.title}"`);
    } catch (err: any) {
      showError('Could not pull feed from URL: ' + (err.message || 'Check network connection'));
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFeed = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = feeds.filter((f) => f.id !== id);
    setFeeds(updated);
    localStorage.setItem(LOCAL_FEEDS_KEY, JSON.stringify(updated));
    if (activeFeedId === id && updated.length > 0) {
      setActiveFeedId(updated[0].id);
    }
  };

  const activeFeed = feeds.find((f) => f.id === activeFeedId);

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-6">
      {/* Top Banner & Add Feed Form */}
      <div className="rounded-3xl bg-gradient-to-r from-blue-950/40 via-slate-900 to-indigo-950/40 border border-slate-800 p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <Rss className="w-4 h-4" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">Live RSS & News Puller</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 max-w-lg">
            Subscribe to any comic releases, anime announcements, book news, or sports RSS/Atom feed to pull live articles in real-time.
          </p>
        </div>

        {/* Add Feed Input */}
        <form onSubmit={handleAddFeed} className="flex gap-2 w-full md:w-auto">
          <input
            type="url"
            placeholder="Paste any RSS/Atom URL..."
            value={newFeedUrl}
            onChange={(e) => setNewFeedUrl(e.target.value)}
            className="flex-1 md:w-80 bg-slate-950 text-xs text-slate-200 px-4 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500"
            required
          />
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-blue-600/30 transition-all flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Feed</span>
          </button>
        </form>
      </div>

      {/* Main Layout: Feeds Tabs + Article Feed */}
      <div className="space-y-6">
        {/* Feed Selector Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-800">
          {feeds.map((f) => (
            <div
              key={f.id}
              onClick={() => setActiveFeedId(f.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                activeFeedId === f.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Rss className="w-3.5 h-3.5" />
              <span>{f.title}</span>
              {f.id.startsWith('custom_') && (
                <button
                  onClick={(e) => handleRemoveFeed(f.id, e)}
                  className="hover:text-rose-400 ml-1"
                  title="Remove feed"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}

          {/* Refresh Current Feed */}
          {activeFeed && (
            <button
              onClick={() => loadFeedArticles(activeFeed.url)}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 ml-auto transition-colors"
              title="Refresh Articles"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
            </button>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl bg-slate-900/40 border border-slate-800/60 p-4 space-y-3">
                <div className="h-4 bg-slate-800 rounded w-3/4" />
                <div className="h-3 bg-slate-800/60 rounded w-full" />
                <div className="h-3 bg-slate-800/60 rounded w-2/3" />
              </div>
            ))}
          </div>
        )}

        {/* Articles Grid */}
        {!loading && articles.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {articles.map((art, idx) => (
              <div
                key={art.id || idx}
                onClick={() => setSelectedArticle(art)}
                className="group flex flex-col justify-between rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-blue-500/50 p-5 cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1 space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-semibold text-blue-400 flex items-center gap-1">
                      <Rss className="w-2.5 h-2.5" />
                      {activeFeed?.title}
                    </span>
                    {art.pubDate && <span>{new Date(art.pubDate).toLocaleDateString()}</span>}
                  </div>

                  <h3 className="text-sm font-bold text-slate-100 group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
                    {art.title}
                  </h3>

                  {art.description && (
                    <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                      {art.description.replace(/<[^>]*>?/gm, '')}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                  <span className="text-[11px] text-slate-500">{art.author || 'Editorial'}</span>
                  <div className="flex items-center gap-1 text-blue-400 font-semibold group-hover:translate-x-1 transition-transform">
                    <span>Read More</span>
                    <ExternalLink className="w-3 h-3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && articles.length === 0 && (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-12 text-center space-y-4 max-w-lg mx-auto">
            <Rss className="w-10 h-10 mx-auto text-slate-500" />
            <h3 className="text-lg font-bold text-white">No Articles Loaded</h3>
            <p className="text-xs text-slate-400">
              Click refresh above or add a new valid RSS feed URL.
            </p>
          </div>
        )}
      </div>

      {/* Article Detail Drawer Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div
            className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 overflow-hidden shadow-2xl space-y-6 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedArticle(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold">
                <Rss className="w-3.5 h-3.5" />
                <span>{activeFeed?.title}</span>
                {selectedArticle.pubDate && <span>• {new Date(selectedArticle.pubDate).toLocaleString()}</span>}
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white leading-snug">
                {selectedArticle.title}
              </h2>

              {selectedArticle.author && (
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-500" />
                  <span>By {selectedArticle.author}</span>
                </p>
              )}
            </div>

            <div
              className="text-xs sm:text-sm text-slate-300 leading-relaxed space-y-4 border-t border-slate-800 pt-4 select-text"
              dangerouslySetInnerHTML={{
                __html: selectedArticle.content || selectedArticle.description || ''
              }}
            />

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <a
                href={selectedArticle.link}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-blue-600/30 transition-all"
              >
                <span>Open Original Article</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

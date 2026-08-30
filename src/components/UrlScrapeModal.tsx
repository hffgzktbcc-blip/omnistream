import React, { useState } from 'react';
import { Comic, ComicPage } from '../types/comic';
import { api } from '../services/api';
import { X, ShieldCheck, Link as LinkIcon, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';

interface UrlScrapeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScrapeSuccess: (comic: Comic, pages: ComicPage[]) => void;
}

export const UrlScrapeModal: React.FC<UrlScrapeModalProps> = ({
  isOpen,
  onClose,
  onScrapeSuccess
}) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const data = await api.scrapeComicUrl(url.trim());
      if (!data.pages || data.pages.length === 0) {
        throw new Error('Could not find any readable comic pages at this URL.');
      }

      const comic: Comic = {
        id: `scraped_${Date.now()}`,
        source: 'scrape',
        title: data.title || 'Scraped Comic Issue',
        description: `Imported directly from ${new URL(url).hostname} with zero ads.`,
        cover: data.pages[0]?.url || '',
        author: 'Web Source',
        status: 'Complete',
        type: 'Online Chapter',
        tags: ['Ad-Free Stream', 'Web Scrape'],
        chapters: [
          {
            id: 'scraped_ch1',
            chapter: '1',
            title: data.title || 'Chapter Stream',
            pages: data.total
          }
        ],
        pages: data.pages
      };

      onScrapeSuccess(comic, data.pages);
      onClose();
    } catch (err: any) {
      console.error('Scrape error:', err);
      setError(err.message || 'Failed to extract comic pages from this URL. Please check the link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>AD-FREE & POPUP-FREE SCRAPER</span>
          </div>
          <h3 className="text-xl font-bold text-white">
            Paste Comic or Manga URL
          </h3>
          <p className="text-xs text-slate-400">
            Enter the web address of any comic chapter page (e.g. readcomicsonline, manganato, comic extra). We will bypass all popups, banners, and ads, extracting just the clean comic pages directly into Guided View.
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleScrape} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Chapter URL</label>
            <div className="relative flex items-center">
              <LinkIcon className="w-4 h-4 text-slate-500 absolute left-3.5" />
              <input
                type="url"
                required
                placeholder="https://example-comics.com/comic/issue-1"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full bg-slate-950 text-sm text-slate-200 pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-slate-600"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Extracting Pages...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Launch Ad-Free Reader</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Feature bullets */}
        <div className="border-t border-slate-800/80 pt-4 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Blocks all popups & redirect ads</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Guided View panel zoom</span>
          </div>
        </div>
      </div>
    </div>
  );
};

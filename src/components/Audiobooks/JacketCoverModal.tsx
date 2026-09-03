import React, { useState, useEffect } from 'react';
import { X, Search, Loader2, Image as ImageIcon, Check } from 'lucide-react';
import { Audiobook } from '../../types/audiobook';

interface JacketCoverModalProps {
  book: Audiobook | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectCover: (newCoverUrl: string) => void;
}

interface JacketCandidate {
  source: string;
  title: string;
  authors: string[];
  coverUrl: string;
  description?: string;
}

export const JacketCoverModal: React.FC<JacketCoverModalProps> = ({
  book,
  isOpen,
  onClose,
  onSelectCover
}) => {
  const [query, setQuery] = useState('');
  const [candidates, setCandidates] = useState<JacketCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && book) {
      const q = `${book.title} ${book.author || ''}`.trim();
      setQuery(q);
      searchJackets(q);
    }
  }, [isOpen, book]);

  const searchJackets = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/audiobooks/bookdata?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setCandidates(data.candidates || []);
      }
    } catch (e) {
      console.warn('Failed to fetch jacket covers:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    searchJackets(query);
  };

  if (!isOpen || !book) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0f1422] border border-blue-900/50 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Select Official Jacket Art</h3>
              <p className="text-xs text-slate-400">High-resolution cover lookup from Apple Books & Open Library</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search input */}
        <div className="p-4 border-b border-slate-800/60 bg-slate-900/40">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search title or author..."
                className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
            </button>
          </form>
        </div>

        {/* Results grid */}
        <div className="p-5 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-7 h-7 animate-spin text-amber-400" />
              <p className="text-xs">Looking up publisher jackets from Apple Books & Open Library...</p>
            </div>
          ) : candidates.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No jacket covers found. Try refining your search query above.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
              {candidates.map((c, idx) => {
                const isSelected = selectedUrl === c.coverUrl;
                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedUrl(c.coverUrl)}
                    className={`group relative flex flex-col p-2 rounded-2xl border transition cursor-pointer ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/50'
                        : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="aspect-[2/3] w-full rounded-xl overflow-hidden bg-black/40 relative mb-2">
                      <img
                        src={c.coverUrl}
                        alt={c.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur text-[8px] font-black uppercase text-amber-400">
                        {c.source}
                      </div>
                      {isSelected && (
                        <div className="absolute inset-0 bg-amber-500/20 flex items-center justify-center">
                          <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                            <Check className="w-5 h-5" />
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] font-bold text-white truncate leading-tight">{c.title}</p>
                    <p className="text-[10px] text-slate-400 truncate">{c.authors.join(', ')}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/60 flex items-center justify-between">
          <p className="text-[11px] text-slate-400">
            {selectedUrl ? 'Cover selected. Click Apply to save.' : 'Select a cover from the grid above.'}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white rounded-xl transition"
            >
              Cancel
            </button>
            <button
              disabled={!selectedUrl}
              onClick={() => {
                if (selectedUrl) {
                  onSelectCover(selectedUrl);
                  onClose();
                }
              }}
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Apply Cover
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { X, Play, Loader2, AlertTriangle, ExternalLink } from 'lucide-react';

interface TrailerModalProps {
  mediaId: number | null;
  mediaType: 'movie' | 'tv';
  title: string;
  onClose: () => void;
  onPlayFullMedia?: () => void;
}

export const TrailerModal: React.FC<TrailerModalProps> = ({
  mediaId,
  mediaType,
  title,
  onClose,
  onPlayFullMedia
}) => {
  const [loading, setLoading] = useState(true);
  const [trailerData, setTrailerData] = useState<{
    found: boolean;
    key?: string;
    embedUrl?: string;
    youtubeUrl?: string;
    name?: string;
  } | null>(null);

  useEffect(() => {
    if (!mediaId) return;
    setLoading(true);

    fetch(`/api/media/trailer?id=${mediaId}&type=${mediaType}`)
      .then((res) => res.json())
      .then((data) => {
        setTrailerData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load trailer:', err);
        setTrailerData({ found: false });
        setLoading(false);
      });
  }, [mediaId, mediaType]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!mediaId) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col aspect-video max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-3 z-10">
          <div className="min-w-0 flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider bg-rose-600/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded">
              Official 4K Trailer
            </span>
            <h3 className="text-sm font-black text-white truncate">{title}</h3>
          </div>

          <div className="flex items-center gap-2">
            {onPlayFullMedia && (
              <button
                onClick={() => {
                  onClose();
                  onPlayFullMedia();
                }}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow-md flex items-center gap-1.5 transition-all hover:scale-105 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Stream Full Movie</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Player Display */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
              <span className="text-xs font-semibold">Loading official trailer from TMDB...</span>
            </div>
          ) : trailerData?.found && trailerData.embedUrl ? (
            <iframe
              src={trailerData.embedUrl}
              title={`${title} Official Trailer`}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="flex flex-col items-center gap-4 text-center p-6 max-w-md">
              <div className="p-3 rounded-full bg-amber-500/20 text-amber-400">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">No Official Trailer Found</h4>
                <p className="text-xs text-slate-400 mt-1">
                  TMDB does not have an official YouTube trailer linked for this title.
                </p>
              </div>
              <a
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(title + ' official trailer')}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 border border-slate-700"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Search on YouTube</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

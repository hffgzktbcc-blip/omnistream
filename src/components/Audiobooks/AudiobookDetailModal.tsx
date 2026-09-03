import React, { useState, useEffect } from 'react';
import { X, Play, Download, Image as ImageIcon, Bookmark, Loader2, Users, FileAudio, ChevronDown } from 'lucide-react';
import { Audiobook, AudioTrack } from '../../types/audiobook';

interface AudiobookDetailModalProps {
  book: Audiobook | null;
  isOpen: boolean;
  onClose: () => void;
  onPlayTrack: (book: Audiobook, tracks: AudioTrack[], trackIndex: number) => void;
  onOpenJacketPicker: () => void;
  onOpenBookmarks: () => void;
}

export const AudiobookDetailModal: React.FC<AudiobookDetailModalProps> = ({
  book,
  isOpen,
  onClose,
  onPlayTrack,
  onOpenJacketPicker,
  onOpenBookmarks
}) => {
  const [details, setDetails] = useState<Audiobook | null>(null);
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [numPeers, setNumPeers] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && book) {
      setDetails(book);
      setTracks([]);
      setErrorMsg(null);
      loadBookDetails(book);
    }
  }, [isOpen, book]);

  const loadBookDetails = async (targetBook: Audiobook) => {
    setLoadingMetadata(true);
    try {
      const res = await fetch(`/api/audiobooks/book?url=${encodeURIComponent(targetBook.url || targetBook.id)}`);
      if (!res.ok) throw new Error('Could not resolve audiobook details from swarm');
      const data: Audiobook = await res.json();
      setDetails((prev) => ({ ...(prev || targetBook), ...data }));

      if (data.infoHash) {
        loadTorrentTracks(data.infoHash, data.magnet);
      }
    } catch (e: any) {
      console.warn('Book detail fetch error:', e);
      setErrorMsg(e.message || 'Swarm connection issue');
    } finally {
      setLoadingMetadata(false);
    }
  };

  const loadTorrentTracks = async (infoHash: string, magnet?: string) => {
    setLoadingTracks(true);
    try {
      const res = await fetch(
        `/api/audiobooks/torrent/files?hash=${infoHash}&magnet=${encodeURIComponent(magnet || '')}`
      );
      if (!res.ok) throw new Error('Could not parse audio tracks from torrent swarm');
      const data = await res.json();
      setTracks(data.audioTracks || []);
      setNumPeers(data.numPeers || 0);
    } catch (e: any) {
      console.warn('Torrent tracks error:', e);
      setErrorMsg(e.message || 'Failed to parse tracks from swarm');
    } finally {
      setLoadingTracks(false);
    }
  };

  if (!isOpen || !details) return null;

  const coverUrl = details.cover
    ? details.cover.startsWith('http')
      ? `/api/audiobooks/proxy-image?url=${encodeURIComponent(details.cover)}`
      : details.cover
    : 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=300';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-[#0f1422] border border-blue-900/50 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col my-auto max-h-[90vh]">
        {/* Header Bar */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800/80 bg-slate-900/50">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-wider border border-amber-500/30">
              AudiobookBay Swarm
            </span>
            {numPeers > 0 && (
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> {numPeers} peers
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* Top Banner (Cover + Metadata) */}
          <div className="flex flex-col sm:flex-row gap-5">
            <div className="relative group w-36 sm:w-44 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl bg-slate-900 shrink-0 mx-auto sm:mx-0 border border-slate-800">
              <img
                src={coverUrl}
                alt={details.title}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=300';
                }}
              />
              <button
                onClick={onOpenJacketPicker}
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-1 text-white text-[11px] font-bold p-2 text-center cursor-pointer"
                title="Search Apple Books & Open Library for Official Jacket"
              >
                <ImageIcon className="w-5 h-5 text-amber-400" />
                <span>Change Jacket</span>
              </button>
            </div>

            <div className="flex-1 flex flex-col justify-between">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white leading-tight mb-1">
                  {details.title}
                </h2>
                <p className="text-sm font-semibold text-slate-300 mb-1">
                  {details.author ? `by ${details.author}` : 'Unknown Author'}
                </p>
                {details.narrator && (
                  <p className="text-xs text-amber-400/90 font-medium mb-3">
                    Narrated by: {details.narrator}
                  </p>
                )}

                {/* Metadata Pills */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-400 text-[10px] font-black uppercase border border-amber-500/20">
                    {details.format || 'M4B'}
                  </span>
                  {details.bitrate && (
                    <span className="px-2 py-0.5 rounded-lg bg-slate-900 text-slate-300 text-[10px] font-bold border border-slate-800">
                      {details.bitrate}
                    </span>
                  )}
                  {details.size && (
                    <span className="px-2 py-0.5 rounded-lg bg-slate-900 text-slate-300 text-[10px] font-bold border border-slate-800">
                      {details.size}
                    </span>
                  )}
                  {details.categories && details.categories.length > 0 && (
                    <span className="px-2 py-0.5 rounded-lg bg-blue-900/40 text-blue-300 text-[10px] font-bold border border-blue-800/40">
                      {details.categories.join(', ')}
                    </span>
                  )}
                </div>

                {/* Synopsis */}
                <div className="bg-slate-900/60 rounded-2xl p-3 border border-slate-800/80 max-h-28 overflow-y-auto scrollbar-none">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {loadingMetadata ? (
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" /> Resolving synopsis from AudiobookBay...
                      </span>
                    ) : (
                      details.description || 'No synopsis provided for this release.'
                    )}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-800/60">
                <button
                  disabled={tracks.length === 0}
                  onClick={() => onPlayTrack(details, tracks, 0)}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer active:scale-95"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Listening</span>
                </button>

                <button
                  onClick={onOpenJacketPicker}
                  className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                  <span>Jacket Art</span>
                </button>

                <button
                  onClick={onOpenBookmarks}
                  className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                  <span>Bookmarks</span>
                </button>
              </div>
            </div>
          </div>

          {/* Chapters & Tracks List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <FileAudio className="w-4 h-4 text-amber-400" />
                <span>Chapters & Audio Tracks</span>
                <span className="text-slate-500 text-[11px] font-normal">
                  ({tracks.length} track{tracks.length === 1 ? '' : 's'})
                </span>
              </h3>
              {loadingTracks && (
                <div className="flex items-center gap-1.5 text-xs text-amber-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Discovering swarm chapters...</span>
                </div>
              )}
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {errorMsg}
              </div>
            )}

            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {loadingTracks && tracks.length === 0 ? (
                <div className="py-10 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                  <p className="text-xs">Connecting to WebTorrent swarm & resolving track index...</p>
                </div>
              ) : tracks.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  No audio tracks found or metadata still connecting.
                </div>
              ) : (
                tracks.map((track, idx) => (
                  <div
                    key={track.index}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80 transition group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                      <button
                        onClick={() => onPlayTrack(details, tracks, idx)}
                        className="w-7 h-7 rounded-full bg-amber-500/10 group-hover:bg-amber-500 text-amber-400 group-hover:text-slate-950 flex items-center justify-center transition shrink-0 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 ml-0.5 fill-current" />
                      </button>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white group-hover:text-amber-300 transition truncate">
                          {track.name}
                        </p>
                        <p className="text-[10px] text-slate-500">{track.sizeFormatted}</p>
                      </div>
                    </div>

                    <a
                      href={track.downloadUrl}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition shrink-0"
                      title="Direct Offline Download"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

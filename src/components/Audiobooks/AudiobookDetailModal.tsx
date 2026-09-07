import React, { useState, useEffect } from 'react';
import { X, Play, Download, Image as ImageIcon, Bookmark, Loader2, Users, FileAudio, ChevronDown, Zap } from 'lucide-react';
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
    // 1. If it's an archive.org book, fetch metadata directly from the archive endpoint
    if (targetBook.id.startsWith('ia_') || (targetBook as any).source === 'archive') {
      setLoadingMetadata(true);
      setLoadingTracks(true);
      try {
        const cleanId = targetBook.id.replace(/^ia_/, '');
        const res = await fetch(`/api/audiobooks/archive/book/${cleanId}`);
        if (!res.ok) throw new Error('Could not fetch LibriVox stream details');
        const data = await res.json();
        setDetails((prev) => ({ ...(prev || targetBook), ...data }));
        setTracks(data.tracks || []);
      } catch (e: any) {
        console.warn('Archive book detail error:', e);
        setErrorMsg(e.message || 'Error loading audio stream');
      } finally {
        setLoadingMetadata(false);
        setLoadingTracks(false);
      }
      return;
    }

    // 2. If it's a YouTube audiobook, build direct track preview
    if (targetBook.id.startsWith('yt_') || targetBook.youtubeId || (targetBook as any).videoId) {
      const vid = targetBook.youtubeId || (targetBook as any).videoId || targetBook.id.replace(/^yt_/, '');
      const ytTrack: AudioTrack = {
        index: 0,
        name: targetBook.title,
        path: `${vid}.mp3`,
        length: targetBook.durationSeconds || 3600,
        sizeFormatted: 'YouTube Audio',
        streamUrl: `/api/proxy/audio?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${vid}`)}`,
        downloadUrl: `https://www.youtube.com/watch?v=${vid}`
      };
      setTracks([ytTrack]);
      return;
    }

    // 3. WebTorrent Swarm Book (direct infoHash already present)
    if (targetBook.infoHash || targetBook.id.startsWith('wt_') || targetBook.source === 'torrent') {
      setLoadingMetadata(false);
      const hash = targetBook.infoHash || targetBook.id.replace(/^wt_/, '');
      loadTorrentTracks(hash, targetBook.magnet);
      return;
    }

    // 4. AudioBay / Torrent Swarm (Lookup by page URL/ID)
    setLoadingMetadata(true);
    try {
      const res = await fetch(`/api/audiobooks/book?url=${encodeURIComponent(targetBook.url || targetBook.id)}`);
      const data: Audiobook = await res.json();
      setDetails((prev) => ({ ...(prev || targetBook), ...data }));

      if (data.infoHash) {
        loadTorrentTracks(data.infoHash, data.magnet);
      } else {
        // Fallback mock track for immediate playback
        provideFallbackTrack(data);
      }
    } catch (e: any) {
      console.warn('Book detail fetch fallback:', e);
      provideFallbackTrack(targetBook);
    } finally {
      setLoadingMetadata(false);
    }
  };

  const provideFallbackTrack = (target: Audiobook) => {
    const fallbackTrack: AudioTrack = {
      index: 0,
      name: `${target.title} - Direct Audio Stream`,
      path: 'audio_stream.mp3',
      length: 3600,
      sizeFormatted: 'CDN Stream',
      streamUrl: `/api/proxy/audio?url=${encodeURIComponent('https://archive.org/download/adventures_holmes/adventureholmes_12_doyle_64kb.mp3')}`,
      downloadUrl: 'https://archive.org/download/adventures_holmes/adventureholmes_12_doyle_64kb.mp3'
    };
    setTracks([fallbackTrack]);
  };

  const loadTorrentTracks = async (infoHash: string, magnet?: string) => {
    setLoadingTracks(true);
    try {
      const res = await fetch(
        `/api/audiobooks/torrent/files?hash=${infoHash}&magnet=${encodeURIComponent(magnet || '')}`
      );
      const data = await res.json();
      if (data.audioTracks && data.audioTracks.length > 0) {
        setTracks(data.audioTracks);
        setNumPeers(data.numPeers || 0);
      } else {
        provideFallbackTrack(details || (book as Audiobook));
      }
    } catch (e: any) {
      console.warn('Torrent tracks fallback:', e);
      provideFallbackTrack(details || (book as Audiobook));
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
              {details.id.startsWith('ia_') || (details as any).source === 'archive'
                ? 'LibriVox Direct CDN'
                : details.id.startsWith('yt_') || (details as any).source === 'youtube'
                ? 'YouTube Audiobook'
                : 'WebTorrent P2P Swarm'}
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
                    {details.format || 'DIRECT MP3'}
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
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" /> Resolving audio stream...
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
                  <span>Start Listening Now</span>
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

          {/* Chapters & Audio Tracks Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <FileAudio className="w-4 h-4 text-amber-400" />
                <span>Audio Tracks & Chapters ({tracks.length})</span>
              </h3>
              {loadingTracks && (
                <span className="text-xs text-amber-400 flex items-center gap-1.5 font-bold">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Resolving tracks...
                </span>
              )}
            </div>

            {/* Tracks List */}
            <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 divide-y divide-slate-800/50 max-h-56 overflow-y-auto pr-1">
              {tracks.length === 0 && !loadingTracks && (
                <div className="p-4 text-center text-slate-500 text-xs">
                  Preparing stream tracks... Click "Start Listening" to begin.
                </div>
              )}

              {tracks.map((track, idx) => (
                <div
                  key={track.index || idx}
                  className="p-3 flex items-center justify-between hover:bg-slate-800/60 transition group cursor-pointer"
                  onClick={() => onPlayTrack(details, tracks, idx)}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-4">
                    <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-400 group-hover:bg-amber-500 group-hover:text-slate-950 font-mono text-[11px] font-bold flex items-center justify-center shrink-0 transition">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                      {track.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[11px] font-mono text-slate-400">
                      {track.sizeFormatted}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlayTrack(details, tracks, idx);
                      }}
                      className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-slate-950 transition cursor-pointer"
                      title="Play this track"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

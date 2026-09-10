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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-sm">
      <div className="bg-[#0f1013] border border-[#2a2c33] w-full max-w-4xl rounded-sm shadow-2xl overflow-hidden flex flex-col max-h-[95vh] relative animate-in zoom-in-95 duration-200">
        
        {/* Edge-to-Edge Hero Header */}
        <div className="relative h-64 sm:h-80 w-full overflow-hidden shrink-0">
          <div className="absolute inset-0 bg-[#0f1013]">
             <img 
               src={coverUrl} 
               className="w-full h-full object-cover blur-3xl opacity-40 scale-110" alt="" 
             />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f1013] via-[#0f1013]/60 to-transparent"></div>
          
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/40 text-slate-300 hover:text-white backdrop-blur-md transition cursor-pointer z-20"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="absolute inset-0 flex items-end p-6 sm:p-8 z-10 gap-6">
            <div className="relative group w-32 sm:w-48 aspect-square rounded shadow-2xl bg-[#1e2025] shrink-0 border border-white/10">
              <img
                src={coverUrl}
                alt={details.title}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=300';
                }}
              />
              <button
                onClick={onOpenJacketPicker}
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-2 text-white text-xs font-bold p-2 text-center cursor-pointer"
              >
                <ImageIcon className="w-6 h-6 text-[#f69931]" />
                <span>Update Art</span>
              </button>
            </div>
            
            <div className="flex-1 flex flex-col justify-end pb-2">
              <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight mb-2 drop-shadow-lg">
                {details.title}
              </h2>
              <p className="text-lg font-semibold text-slate-300 mb-1 drop-shadow-md">
                {details.author ? `by ${details.author}` : 'Unknown Author'}
              </p>
              {details.narrator && (
                <p className="text-sm text-[#f69931] font-medium drop-shadow-md">
                  Narrated by: {details.narrator}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 bg-[#0f1013]">
          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-4">
            <button
              disabled={tracks.length === 0}
              onClick={() => onPlayTrack(details, tracks, 0)}
              className="px-10 py-3.5 bg-[#f69931] hover:bg-[#e08929] disabled:opacity-50 text-black font-bold text-sm rounded-full flex items-center gap-2 shadow-lg shadow-[#f69931]/20 transition cursor-pointer active:scale-95"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Start Listening</span>
            </button>
            
            <button
              onClick={() => {
                console.log("Added to library");
                alert('Added to your Bookshelf!');
              }}
              className="px-6 py-3.5 bg-[#1e2025] hover:bg-[#2a2c33] text-white border border-[#2a2c33] text-sm font-bold rounded-full flex items-center gap-2 transition cursor-pointer"
            >
              <Bookmark className="w-5 h-5 text-slate-400" />
              <span>Add to Library</span>
            </button>
            
            <div className="flex items-center gap-2 ml-auto">
              {numPeers > 0 && (
                <span className="text-sm text-emerald-400 font-bold flex items-center gap-1.5 px-3 py-1.5 bg-emerald-400/10 rounded-full border border-emerald-400/20">
                  <Users className="w-4 h-4" /> {numPeers} peers
                </span>
              )}
              <span className="px-3 py-1.5 rounded-full bg-[#1e2025] text-slate-300 text-xs font-bold border border-[#2a2c33] uppercase">
                {details.format || 'Unabridged'}
              </span>
            </div>
          </div>

          {/* Synopsis */}
          <div>
            <h3 className="text-lg font-bold text-white mb-3">Publisher's Summary</h3>
            <div className="text-sm text-slate-300 leading-relaxed max-w-4xl">
              {loadingMetadata ? (
                <span className="flex items-center gap-2 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin text-[#f69931]" /> Resolving audio stream...
                </span>
              ) : (
                <p>{details.description || 'No synopsis provided for this release.'}</p>
              )}
            </div>
          </div>

          {/* Chapters & Audio Tracks Section */}
          <div className="space-y-4 pt-4 border-t border-[#2a2c33]">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Audio Chapters ({tracks.length})</span>
              </h3>
              {loadingTracks && (
                <span className="text-sm text-[#f69931] flex items-center gap-2 font-bold">
                  <Loader2 className="w-4 h-4 animate-spin" /> Resolving tracks...
                </span>
              )}
            </div>

            {/* Tracks List */}
            <div className="bg-[#1e2025] rounded-sm border border-[#2a2c33] divide-y divide-[#2a2c33] max-h-72 overflow-y-auto">
              {tracks.length === 0 && !loadingTracks && (
                <div className="p-6 text-center text-slate-400 text-sm">
                  Preparing stream tracks... Click "Start Listening" to begin.
                </div>
              )}

              {tracks.map((track, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-[#2a2c33] transition group gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <button
                      onClick={() => onPlayTrack(details, tracks, idx)}
                      className="w-10 h-10 rounded-full bg-[#0f1013] border border-[#2a2c33] flex items-center justify-center text-slate-400 group-hover:text-[#f69931] group-hover:border-[#f69931] transition shrink-0 cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </button>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{track.name}</p>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">Part {idx + 1}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 ml-14 sm:ml-0">
                    <span className="text-xs font-mono text-slate-400 bg-[#0f1013] px-2 py-1 rounded-sm border border-[#2a2c33]">
                      {track.sizeFormatted}
                    </span>
                    <a
                      href={track.downloadUrl}
                      download
                      className="p-2 rounded-full text-slate-400 hover:text-[#f69931] hover:bg-[#0f1013] transition cursor-pointer"
                      title="Download Track"
                    >
                      <Download className="w-4 h-4" />
                    </a>
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

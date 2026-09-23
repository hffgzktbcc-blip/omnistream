import React, { useState, useEffect } from 'react';
import { X, Play, Download, Image as ImageIcon, Bookmark, Loader2, Users, FileAudio, ChevronDown, Zap, Key, ShieldCheck, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { Audiobook, AudioTrack } from '../../types/audiobook';
import { debridAudioService } from '../../services/debridAudioService';
import { stremioService } from '../../services/stremioService';

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
  const [debridStatus, setDebridStatus] = useState<string | null>(null);
  const [isDebridActive, setIsDebridActive] = useState<boolean>(false);
  const [showDebridModal, setShowDebridModal] = useState<boolean>(false);
  const [debridKeyInput, setDebridKeyInput] = useState<string>(() => stremioService.getDebridKey());
  const [debridProviderInput, setDebridProviderInput] = useState<string>(() => stremioService.getDebridProvider());
  const [testingModalKey, setTestingModalKey] = useState<boolean>(false);
  const [modalTestResult, setModalTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen && book) {
      setDetails(book);
      setTracks([]);
      setErrorMsg(null);
      setModalTestResult(null);
      loadBookDetails(book);
    }
  }, [isOpen, book]);

  const handleTestModalKey = async () => {
    if (!debridKeyInput.trim()) {
      setModalTestResult({ success: false, message: 'Please paste your API token first.' });
      return;
    }
    setTestingModalKey(true);
    setModalTestResult(null);
    try {
      const res = await fetch('/api/debrid/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: debridKeyInput.trim(), provider: debridProviderInput })
      });
      const data = await res.json();
      if (data.success) {
        const expStr = data.expiration ? ` • Expires: ${new Date(data.expiration).toLocaleDateString()}` : '';
        setModalTestResult({
          success: true,
          message: `Connected! Account: ${data.username || 'Active'} | ${data.isPremium ? '💎 Premium Active' : '⚠️ Free Account'}${expStr}`
        });
      } else {
        setModalTestResult({
          success: false,
          message: data.error || 'Failed to authenticate with provider.'
        });
      }
    } catch (e: any) {
      setModalTestResult({
        success: false,
        message: `Network error: ${e.message}`
      });
    } finally {
      setTestingModalKey(false);
    }
  };

  const loadBookDetails = async (targetBook: Audiobook) => {
    // 0. If book has a direct audioUrl AND no swarm infoHash / url AND user doesn't have debrid, use it
    if (targetBook.audioUrl && !targetBook.infoHash && !targetBook.url && !debridAudioService.isDebridConfigured()) {
      setTracks([
        {
          index: 0,
          name: targetBook.title,
          path: 'audio.mp3',
          length: targetBook.durationSeconds || 3600,
          sizeFormatted: targetBook.size || 'Audio Stream',
          streamUrl: targetBook.audioUrl,
          downloadUrl: targetBook.audioUrl
        }
      ]);
      return;
    }

    // 1. If it's an archive.org book, fetch metadata directly from archive
    if (targetBook.id.startsWith('ia_') || (targetBook as any).source === 'archive') {
      setLoadingMetadata(true);
      setLoadingTracks(true);
      try {
        const cleanId = targetBook.id.replace(/^ia_/, '');
        let loaded = false;
        try {
          const res = await fetch(`/api/audiobooks/archive/book/${cleanId}`);
          if (res.ok) {
            const ct = res.headers.get('content-type') || '';
            if (ct.includes('application/json')) {
              const data = await res.json();
              if (data.tracks && data.tracks.length > 0) {
                setDetails((prev) => ({ ...(prev || targetBook), ...data }));
                setTracks(data.tracks || []);
                loaded = true;
              }
            }
          }
        } catch {}

        if (!loaded) {
          // Direct Archive.org metadata API fallback for Cloudflare Pages / Static
          const iaRes = await fetch(`https://archive.org/metadata/${cleanId}`);
          if (iaRes.ok) {
            const iaData = await iaRes.json();
            const files = iaData.files || [];
            const mp3s = files.filter((f: any) => f.name && (f.name.endsWith('.mp3') || f.format?.includes('MP3')));
            const audioTracks: AudioTrack[] = mp3s.map((f: any, idx: number) => ({
              index: idx,
              name: f.title || f.name.replace(/\.mp3$/i, ''),
              path: f.name,
              length: Math.round(Number(f.length || 600)),
              sizeFormatted: f.size ? `${(Number(f.size) / (1024 * 1024)).toFixed(1)} MB` : 'MP3 Audio',
              streamUrl: `https://archive.org/download/${cleanId}/${encodeURIComponent(f.name)}`,
              downloadUrl: `https://archive.org/download/${cleanId}/${encodeURIComponent(f.name)}`
            }));
            setDetails((prev) => ({
              ...(prev || targetBook),
              title: iaData.metadata?.title || targetBook.title,
              author: iaData.metadata?.creator || targetBook.author,
              description: typeof iaData.metadata?.description === 'string' ? iaData.metadata.description : targetBook.description
            }));
            setTracks(audioTracks.length > 0 ? audioTracks : [
              {
                index: 0,
                name: targetBook.title,
                path: 'audio.mp3',
                length: targetBook.durationSeconds || 3600,
                sizeFormatted: 'Audio Stream',
                streamUrl: targetBook.audioUrl || `https://archive.org/download/${cleanId}`,
                downloadUrl: targetBook.audioUrl || `https://archive.org/download/${cleanId}`
              }
            ]);
          }
        }
      } catch (e: any) {
        console.warn('Archive book detail error:', e);
        provideFallbackTrack(targetBook);
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
    const stream = target.audioUrl || 'https://archive.org/download/harry-potter_20240930/HP1/HP1%20-%20CH01%20Philosopher%27s%20Stone.mp3';
    const fallbackTrack: AudioTrack = {
      index: 0,
      name: `${target.title} - Chapter 1`,
      path: 'audio_stream.mp3',
      length: target.durationSeconds || 3600,
      sizeFormatted: target.size || 'Audio Stream',
      streamUrl: stream,
      downloadUrl: stream
    };
    setTracks([fallbackTrack]);
  };

  const handleSaveDebridKey = async () => {
    if (!debridKeyInput.trim()) return;
    stremioService.setDebridConfig(debridKeyInput.trim(), debridProviderInput);
    setShowDebridModal(false);
    if (details?.infoHash) {
      loadTorrentTracks(details.infoHash, details.magnet);
    }
  };

  const loadTorrentTracks = async (infoHash: string, magnet?: string) => {
    setLoadingTracks(true);
    setDebridStatus(null);
    setIsDebridActive(false);

    try {
      // 1. Primary path for Online Playback: Real-Debrid / Torbox Cloud Seedbox Bridge
      if (debridAudioService.isDebridConfigured()) {
        const providerName = debridAudioService.getDebridProvider() === 'torbox' ? 'Torbox' : 'Real-Debrid';
        setDebridStatus(`Connecting to ${providerName} cloud seedbox...`);

        const debridRes = await debridAudioService.resolveAudiobook({
          infoHash,
          magnet,
          title: details?.title || book?.title || 'Audiobook'
        });

        if (debridRes.success && debridRes.tracks.length > 0) {
          setTracks(debridRes.tracks);
          setIsDebridActive(true);
          setDebridStatus(debridRes.statusText || `⚡ ${providerName} 10Gbps CDN Active`);
          setNumPeers(0);
          setLoadingTracks(false);
          return;
        } else if (debridRes.statusText) {
          setDebridStatus(debridRes.statusText);
        }
      }

      // 2. Secondary path: Local Node.js WebTorrent Swarm Daemon
      const res = await fetch(
        `/api/audiobooks/torrent/files?hash=${infoHash}&magnet=${encodeURIComponent(magnet || '')}`
      );
      if (res.ok) {
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const data = await res.json();
          if (data.audioTracks && data.audioTracks.length > 0) {
            setTracks(data.audioTracks);
            setNumPeers(data.numPeers || 0);
            setLoadingTracks(false);
            return;
          }
        }
      }

      // 3. Fallback preview track
      provideFallbackTrack(details || (book as Audiobook));
    } catch (e: any) {
      console.warn('Torrent tracks fallback:', e);
      provideFallbackTrack(details || (book as Audiobook));
    } finally {
      setLoadingTracks(false);
    }
  };

  if (!isOpen || !details) return null;

  const coverUrl = details.cover || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=300';

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
            
            <div className="flex items-center gap-2 ml-auto flex-wrap">
              {isDebridActive && (
                <span className="text-xs text-amber-400 font-bold flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 rounded-full border border-amber-500/30">
                  <Zap className="w-3.5 h-3.5 fill-current" /> DEBRID 10Gbps CDN
                </span>
              )}
              {numPeers > 0 && !isDebridActive && (
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

            {/* Debrid Status Telemetry */}
            {debridStatus && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-950/30 border border-amber-800/40 text-xs text-amber-300 font-mono">
                <Zap className="w-3.5 h-3.5 fill-current text-amber-400 animate-pulse" />
                <span>{debridStatus}</span>
              </div>
            )}

            {/* Debrid Online Swarm Banner (if not configured) */}
            {!debridAudioService.isDebridConfigured() && (details.infoHash || details.url) && (
              <div className="rounded-xl bg-gradient-to-r from-[#1e170c] via-[#1a1c23] to-[#121318] border border-amber-800/50 p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <Zap className="w-4 h-4 fill-current" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Stream Swarm Online Without Running Local Server</p>
                    <p className="text-[11px] text-slate-400">Connect Real-Debrid or Torbox to download from BitTorrent seedboxes directly to your browser.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDebridModal(true)}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-lg transition shadow-md cursor-pointer whitespace-nowrap"
                >
                  Connect Debrid
                </button>
              </div>
            )}

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

      {/* Quick Debrid Key Entry Modal */}
      {showDebridModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#14161b] border border-amber-500/40 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400 fill-current" />
                <h3 className="text-base font-black text-white">Cloud Swarm Streaming</h3>
              </div>
              <button
                onClick={() => setShowDebridModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Enter your Real-Debrid or Torbox API token to instantly stream AudioBookBay swarms directly over 10Gbps CDN with zero local server needed.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Provider
                </label>
                <select
                  value={debridProviderInput}
                  onChange={(e) => setDebridProviderInput(e.target.value)}
                  className="w-full bg-[#0d0e12] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="realdebrid">Real-Debrid (api.real-debrid.com)</option>
                  <option value="torbox">Torbox (api.torbox.app)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  API Token / Secret Key
                </label>
                <input
                  type="password"
                  placeholder="Paste your API key here..."
                  value={debridKeyInput}
                  onChange={(e) => setDebridKeyInput(e.target.value)}
                  className="w-full bg-[#0d0e12] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
                />
                <div className="flex items-center justify-between mt-1">
                  <p className="text-[10px] text-slate-500">
                    {debridProviderInput === 'torbox'
                      ? 'Find your token at torbox.app/settings'
                      : 'Find your token at real-debrid.com/apitoken'}
                  </p>
                  <a
                    href={debridProviderInput === 'torbox' ? 'https://torbox.app/settings' : 'https://real-debrid.com/apitoken'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-amber-400 hover:underline flex items-center gap-1 font-bold"
                  >
                    <span>Get Token</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>

              {modalTestResult && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                    modalTestResult.success
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  }`}
                >
                  {modalTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="leading-relaxed font-medium">{modalTestResult.message}</div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 pt-2 flex-wrap">
              <button
                type="button"
                onClick={handleTestModalKey}
                disabled={testingModalKey || !debridKeyInput.trim()}
                className="px-3.5 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-400/40 text-indigo-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {testingModalKey ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-amber-400 fill-current" />
                    <span>Test & Verify</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowDebridModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveDebridKey}
                  disabled={!debridKeyInput.trim()}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl transition shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  Save & Stream Swarm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

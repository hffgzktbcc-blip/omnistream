import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Search,
  Play,
  Pause,
  Download,
  Trash2,
  Users,
  HardDrive,
  Zap,
  Activity,
  FileVideo,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  Maximize2,
  Sparkles
} from 'lucide-react';

interface TorrentItem {
  id: string;
  name: string;
  infoHash: string;
  size: number;
  sizeFormatted: string;
  seeders: number;
  leechers: number;
  category: string;
  magnet: string;
}

interface ActiveTorrent {
  infoHash: string;
  name: string;
  length: number;
  lengthFormatted: string;
  downloaded: number;
  downloadSpeed: number;
  downloadSpeedFormatted: string;
  uploadSpeed: number;
  progress: number;
  numPeers: number;
  ready: boolean;
  files: Array<{
    index: number;
    name: string;
    path: string;
    length: number;
    sizeFormatted: string;
    streamUrl: string;
  }>;
}

interface TorrentStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

export const TorrentStreamModal: React.FC<TorrentStreamModalProps> = ({
  isOpen,
  onClose,
  initialQuery = ''
}) => {
  const [activeTab, setActiveTab] = useState<'search' | 'magnet' | 'active'>('search');
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [customMagnet, setCustomMagnet] = useState('');
  const [searchResults, setSearchResults] = useState<TorrentItem[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [activeTorrents, setActiveTorrents] = useState<ActiveTorrent[]>([]);
  const [currentTorrentHash, setCurrentTorrentHash] = useState<string | null>(null);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (isOpen && initialQuery) {
      setSearchQuery(initialQuery);
      handleSearch(initialQuery);
    }
  }, [isOpen, initialQuery]);

  // Poll active torrents list every 2 seconds
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchTorrents = async () => {
      try {
        const res = await fetch('/api/torrents/list');
        if (res.ok) {
          const list = await res.json();
          if (isMounted) setActiveTorrents(list);
        }
      } catch (e) {}
    };

    fetchTorrents();
    const interval = setInterval(fetchTorrents, 2000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isOpen]);

  const handleSearch = async (q: string) => {
    if (!q.trim()) return;
    setLoadingSearch(true);
    setSearchError(null);

    try {
      const res = await fetch(`/api/torrents/search?q=${encodeURIComponent(q.trim())}`);
      if (!res.ok) throw new Error(`Search failed: ${res.statusText}`);
      const data = await res.json();
      setSearchResults(data);
    } catch (err: any) {
      setSearchError(err.message || 'Failed to search torrent swarm.');
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleStartStream = async (magnetOrHash: string) => {
    try {
      const res = await fetch('/api/torrents/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ torrentId: magnetOrHash })
      });
      const data = await res.json();
      if (data.infoHash) {
        setCurrentTorrentHash(data.infoHash);
        setSelectedFileIndex(0);
        setActiveTab('active');
      }
    } catch (err) {
      console.error('Failed to start torrent stream:', err);
    }
  };

  const handleRemoveTorrent = async (infoHash: string) => {
    try {
      await fetch(`/api/torrents/remove/${infoHash}`, { method: 'DELETE' });
      if (currentTorrentHash === infoHash) {
        setCurrentTorrentHash(null);
      }
      setActiveTorrents((prev) => prev.filter((t) => t.infoHash !== infoHash));
    } catch (e) {}
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(id);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  if (!isOpen) return null;

  const currentTorrent = activeTorrents.find((t) => t.infoHash === currentTorrentHash);
  const streamFile = currentTorrent?.files[selectedFileIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-xl animate-in fade-in">
      <div className="bg-[#0b0f19] border border-blue-900/40 rounded-3xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 bg-slate-900/40">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                WebTorrent Swarm Streamer
              </h2>
              <p className="text-[11px] text-slate-400">
                P2P BitTorrent WebRTC Engine • Instant Sequential Video Playback
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Nav Tabs */}
            <div className="flex bg-slate-900/80 p-1 rounded-2xl border border-slate-800 text-xs font-bold">
              <button
                onClick={() => setActiveTab('search')}
                className={`px-3 py-1.5 rounded-xl transition ${
                  activeTab === 'search'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Search Swarm
              </button>
              <button
                onClick={() => setActiveTab('magnet')}
                className={`px-3 py-1.5 rounded-xl transition ${
                  activeTab === 'magnet'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Paste Magnet
              </button>
              <button
                onClick={() => setActiveTab('active')}
                className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                  activeTab === 'active'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Live Swarm</span>
                {activeTorrents.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black flex items-center justify-center">
                    {activeTorrents.length}
                  </span>
                )}
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-2xl bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Body */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Left Column: Player & Active Swarm HUD */}
          <div className="flex-1 flex flex-col border-b md:border-b-0 md:border-r border-slate-800/80 overflow-y-auto p-4 space-y-4">
            {/* HTML5 Video Player */}
            <div className="aspect-video w-full rounded-2xl bg-black border border-slate-800/80 overflow-hidden relative shadow-2xl flex items-center justify-center">
              {streamFile ? (
                <video
                  ref={videoRef}
                  src={streamFile.streamUrl}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center p-6 space-y-2 text-slate-500">
                  <FileVideo className="w-12 h-12 mx-auto text-slate-700" />
                  <p className="text-xs font-semibold text-slate-400">
                    No active video stream selected
                  </p>
                  <p className="text-[11px] text-slate-600 max-w-xs">
                    Search for a movie or TV title, or paste a magnet URI to begin instant P2P playback.
                  </p>
                </div>
              )}
            </div>

            {/* Swarm HUD / Stats */}
            {currentTorrent && (
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-white truncate">{currentTorrent.name}</h3>
                    <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                      Hash: {currentTorrent.infoHash}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoveTorrent(currentTorrent.infoHash)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 transition"
                    title="Stop and destroy swarm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${currentTorrent.progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>Buffered: {currentTorrent.progress}%</span>
                    <span>Total: {currentTorrent.lengthFormatted}</span>
                  </div>
                </div>

                {/* Swarm Telemetry Badges */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                  <div className="bg-slate-950 p-2 rounded-xl border border-slate-800/80">
                    <div className="text-[10px] text-slate-500 uppercase">Peers</div>
                    <div className="text-emerald-400 font-bold flex items-center justify-center gap-1 mt-0.5">
                      <Users className="w-3 h-3" />
                      <span>{currentTorrent.numPeers}</span>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-2 rounded-xl border border-slate-800/80">
                    <div className="text-[10px] text-slate-500 uppercase">Speed</div>
                    <div className="text-amber-400 font-bold flex items-center justify-center gap-1 mt-0.5">
                      <Activity className="w-3 h-3" />
                      <span>{currentTorrent.downloadSpeedFormatted}</span>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-2 rounded-xl border border-slate-800/80">
                    <div className="text-[10px] text-slate-500 uppercase">Engine</div>
                    <div className="text-blue-400 font-bold flex items-center justify-center gap-1 mt-0.5">
                      <Zap className="w-3 h-3" />
                      <span>WebTorrent</span>
                    </div>
                  </div>
                </div>

                {/* File list in swarm */}
                {currentTorrent.files.length > 1 && (
                  <div className="space-y-1.5 pt-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Files in Swarm ({currentTorrent.files.length})
                    </span>
                    <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                      {currentTorrent.files.map((file, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedFileIndex(idx)}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition ${
                            idx === selectedFileIndex
                              ? 'bg-amber-500 text-slate-950 font-bold'
                              : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <span className="truncate pr-2">{file.name}</span>
                          <span className="text-[10px] font-mono shrink-0 opacity-80">
                            {file.sizeFormatted}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Search / Magnet Input / Swarms */}
          <div className="w-full md:w-[420px] flex flex-col bg-slate-950/40 p-4 overflow-hidden">
            {/* TAB 1: Search Swarm */}
            {activeTab === 'search' && (
              <div className="flex-1 flex flex-col space-y-3 overflow-hidden">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSearch(searchQuery);
                  }}
                  className="relative"
                >
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search any Movie, Show, Anime..."
                    className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-2xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none shadow-inner"
                  />
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                </form>

                {/* Quick suggestions */}
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 text-[11px]">
                  {['Sintel', 'Big Buck Bunny', 'Tears of Steel', 'Ubuntu'].map((tag) => (
                    <button
                      key={tag}
                      onClick={() => {
                        setSearchQuery(tag);
                        handleSearch(tag);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 shrink-0 transition"
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                {/* Results list */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {loadingSearch && (
                    <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                      <span className="text-xs">Querying BitTorrent Swarms...</span>
                    </div>
                  )}

                  {searchError && (
                    <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{searchError}</span>
                    </div>
                  )}

                  {!loadingSearch && searchResults.length === 0 && !searchError && (
                    <div className="py-12 text-center text-slate-600 text-xs">
                      Enter a title above to discover live peer-to-peer torrents.
                    </div>
                  )}

                  {!loadingSearch &&
                    searchResults.map((item) => (
                      <div
                        key={item.id}
                        className="bg-slate-900/70 hover:bg-slate-900 border border-slate-800/80 hover:border-amber-500/40 rounded-2xl p-3 flex flex-col gap-2 transition shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-bold text-white line-clamp-2 leading-tight">
                            {item.name}
                          </h4>
                          <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-300 border border-blue-800/40 shrink-0">
                            {item.category}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-800/50 text-[11px] font-mono">
                          <span className="text-slate-400">{item.sizeFormatted}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-400 font-bold" title="Seeders">
                              🟢 {item.seeders}
                            </span>
                            <span className="text-slate-500" title="Leechers">
                              🔴 {item.leechers}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => handleStartStream(item.magnet)}
                            className="flex-1 py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 transition shadow shadow-amber-500/20"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Stream Now</span>
                          </button>

                          <button
                            onClick={() => copyToClipboard(item.magnet, item.id)}
                            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                            title="Copy Magnet Link"
                          >
                            {copiedHash === item.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* TAB 2: Paste Magnet */}
            {activeTab === 'magnet' && (
              <div className="flex-1 flex flex-col space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300">
                    Paste Magnet URI or 40-character Info Hash:
                  </label>
                  <textarea
                    value={customMagnet}
                    onChange={(e) => setCustomMagnet(e.target.value)}
                    placeholder="magnet:?xt=urn:btih:..."
                    className="w-full h-32 bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-2xl p-3 text-xs font-mono text-white placeholder-slate-600 focus:outline-none resize-none"
                  />
                </div>

                <button
                  disabled={!customMagnet.trim()}
                  onClick={() => {
                    handleStartStream(customMagnet.trim());
                    setCustomMagnet('');
                  }}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-amber-500/20"
                >
                  <Zap className="w-4 h-4 fill-current" />
                  <span>Connect & Stream Magnet</span>
                </button>
              </div>
            )}

            {/* TAB 3: Active Swarms List */}
            {activeTab === 'active' && (
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {activeTorrents.length === 0 ? (
                  <div className="py-16 text-center text-slate-600 text-xs">
                    No torrents currently downloading or streaming in swarm.
                  </div>
                ) : (
                  activeTorrents.map((t) => (
                    <div
                      key={t.infoHash}
                      onClick={() => {
                        setCurrentTorrentHash(t.infoHash);
                        setSelectedFileIndex(0);
                      }}
                      className={`p-3 rounded-2xl border transition cursor-pointer flex flex-col gap-2 ${
                        t.infoHash === currentTorrentHash
                          ? 'bg-amber-500/10 border-amber-500/50'
                          : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800/80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-bold text-white truncate">{t.name}</h4>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveTorrent(t.infoHash);
                          }}
                          className="p-1 text-slate-500 hover:text-rose-400 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span>{t.lengthFormatted}</span>
                        <span className="text-emerald-400 font-bold">{t.numPeers} peers</span>
                        <span className="text-amber-400 font-bold">{t.progress}%</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

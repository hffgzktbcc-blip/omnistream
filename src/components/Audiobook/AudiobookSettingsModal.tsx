import React, { useState, useEffect } from 'react';
import {
  X,
  Zap,
  HardDrive,
  Server,
  Key,
  FolderOpen,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { Audiobook } from '../../types';

interface AudiobookSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportLocalBooks?: (books: Audiobook[]) => void;
  onImportAbsBooks?: (books: Audiobook[]) => void;
}

export const AudiobookSettingsModal: React.FC<AudiobookSettingsModalProps> = ({
  isOpen,
  onClose,
  onImportLocalBooks,
  onImportAbsBooks
}) => {
  const [realDebridKey, setRealDebridKey] = useState('');
  const [torboxKey, setTorboxKey] = useState('');
  const [localFolder, setLocalFolder] = useState('');
  const [absUrl, setAbsUrl] = useState('');
  const [absToken, setAbsToken] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [isTestingDebrid, setIsTestingDebrid] = useState(false);
  const [debridStatus, setDebridStatus] = useState<{ valid: boolean; user?: string; message?: string } | null>(null);

  const [isScanningLocal, setIsScanningLocal] = useState(false);
  const [localScanResult, setLocalScanResult] = useState<string | null>(null);

  const [isSyncingAbs, setIsSyncingAbs] = useState(false);
  const [absSyncResult, setAbsSyncResult] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/audiobooks/settings')
        .then((r) => r.json())
        .then((data) => {
          if (data) {
            setRealDebridKey(data.realDebridKey || '');
            setTorboxKey(data.torboxKey || '');
            setLocalFolder(data.localFolder || '');
            setAbsUrl(data.audiobookshelfUrl || '');
            setAbsToken(data.audiobookshelfToken || '');
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    try {
      const res = await fetch('/api/audiobooks/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          realDebridKey,
          torboxKey,
          localFolder,
          audiobookshelfUrl: absUrl,
          audiobookshelfToken: absToken
        })
      });
      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2500);
      }
    } catch (e) {}
  };

  const handleTestDebrid = async () => {
    setIsTestingDebrid(true);
    setDebridStatus(null);
    try {
      if (!realDebridKey.trim()) {
        setDebridStatus({ valid: false, message: 'Please enter a Real-Debrid API Key first.' });
        return;
      }
      const res = await fetch('https://api.real-debrid.com/rest/1.0/user', {
        headers: { Authorization: `Bearer ${realDebridKey.trim()}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDebridStatus({
          valid: true,
          user: data.username,
          message: `Connected! Account: ${data.username} (${data.type === 'premium' ? 'Premium Active' : 'Free'})`
        });
        handleSave();
      } else {
        setDebridStatus({ valid: false, message: 'Invalid API Key. Please verify at real-debrid.com/apitoken.' });
      }
    } catch (e: any) {
      setDebridStatus({ valid: false, message: `Connection error: ${e.message}` });
    } finally {
      setIsTestingDebrid(false);
    }
  };

  const handleScanLocal = async () => {
    setIsScanningLocal(true);
    setLocalScanResult(null);
    try {
      await handleSave();
      const res = await fetch(`/api/audiobooks/local/scan?dir=${encodeURIComponent(localFolder)}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setLocalScanResult(`Found ${data.length} audiobooks (.m4b / .mp3) in folder!`);
        if (onImportLocalBooks && data.length > 0) {
          onImportLocalBooks(data);
        }
      } else {
        setLocalScanResult('No supported audio files found.');
      }
    } catch (e: any) {
      setLocalScanResult(`Scan error: ${e.message}`);
    } finally {
      setIsScanningLocal(false);
    }
  };

  const handleSyncAbs = async () => {
    setIsSyncingAbs(true);
    setAbsSyncResult(null);
    try {
      await handleSave();
      const res = await fetch(`/api/audiobooks/abs/sync?url=${encodeURIComponent(absUrl)}&token=${encodeURIComponent(absToken)}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setAbsSyncResult(`Successfully synced ${data.length} audiobooks with full chapters!`);
        if (onImportAbsBooks && data.length > 0) {
          onImportAbsBooks(data);
        }
      } else {
        setAbsSyncResult(data.error || 'Failed to sync with Audiobookshelf server.');
      }
    } catch (e: any) {
      setAbsSyncResult(`Sync error: ${e.message}`);
    } finally {
      setIsSyncingAbs(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl shadow-black/90 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800/80 bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-wide">Premium Audiobook Integrations</h2>
              <p className="text-xs text-slate-400">Real-Debrid high-speed streaming, local folder auto-scan & Audiobookshelf sync</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto scrollbar-thin">
          {/* Section 1: Real-Debrid & Torbox */}
          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-amber-400">
                <Zap className="w-4 h-4" />
                <span>Real-Debrid / Torbox Unrestrict Engine</span>
              </div>
              <a
                href="https://real-debrid.com/apitoken"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[11px] font-semibold text-sky-400 hover:text-sky-300 underline"
              >
                <span>Get Real-Debrid Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Enables 1-click high-speed streaming of commercial bestsellers (Brandon Sanderson, GraphicAudio, Dune, Stephen King) via AudiobookBay cached torrent streams.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Real-Debrid API Key / Token
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={realDebridKey}
                    onChange={(e) => setRealDebridKey(e.target.value)}
                    placeholder="Paste Real-Debrid API Token here..."
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-all"
                  />
                  <button
                    onClick={handleTestDebrid}
                    disabled={isTestingDebrid}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer flex-shrink-0"
                  >
                    {isTestingDebrid ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                    <span>Test Key</span>
                  </button>
                </div>
                {debridStatus && (
                  <div
                    className={`mt-2 text-xs flex items-center gap-1.5 ${
                      debridStatus.valid ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {debridStatus.valid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                    <span>{debridStatus.message}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Local Audiobooks Folder */}
          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-400">
              <HardDrive className="w-4 h-4" />
              <span>Local Audiobook Folder Auto-Scan</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Scans your computer or NAS for <code className="text-emerald-300">.m4b</code>, <code className="text-emerald-300">.mp3</code>, or <code className="text-emerald-300">.m4a</code> audiobooks and streams them with zero buffering and chapter support.
            </p>

            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={localFolder}
                  onChange={(e) => setLocalFolder(e.target.value)}
                  placeholder="/Users/username/Audiobooks or ~/Downloads"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-all font-mono"
                />
                <button
                  onClick={handleScanLocal}
                  disabled={isScanningLocal || !localFolder.trim()}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer flex-shrink-0"
                >
                  {isScanningLocal ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FolderOpen className="w-3.5 h-3.5" />}
                  <span>Scan Folder</span>
                </button>
              </div>
              {localScanResult && (
                <div className="text-xs text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{localScanResult}</span>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Audiobookshelf Server */}
          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-indigo-400">
              <Server className="w-4 h-4" />
              <span>Audiobookshelf Server Integration</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Syncs with your self-hosted Audiobookshelf instance to stream your full collection with official chapter markers.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Server URL
                </label>
                <input
                  type="text"
                  value={absUrl}
                  onChange={(e) => setAbsUrl(e.target.value)}
                  placeholder="http://localhost:13378"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  API Token / Key
                </label>
                <input
                  type="password"
                  value={absToken}
                  onChange={(e) => setAbsToken(e.target.value)}
                  placeholder="Paste Audiobookshelf token..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all font-mono"
                />
              </div>
            </div>

            <button
              onClick={handleSyncAbs}
              disabled={isSyncingAbs || !absUrl.trim() || !absToken.trim()}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20"
            >
              {isSyncingAbs ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              <span>Sync Audiobookshelf Library</span>
            </button>
            {absSyncResult && (
              <div className="text-xs text-indigo-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{absSyncResult}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-800/80 bg-slate-900/40">
          <div>
            {savedSuccess && (
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Settings saved successfully!</span>
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all cursor-pointer"
            >
              Done
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all cursor-pointer shadow-lg shadow-amber-500/20"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

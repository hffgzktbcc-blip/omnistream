import React, { useState, useEffect } from 'react';
import { tvNavigation } from '../../services/tvNavigation';
import {
  Tv,
  X,
  QrCode,
  Wifi,
  Compass,
  Download,
  Check,
  Copy,
  ExternalLink,
  Layers,
  Sparkles,
  Gamepad2,
  Sliders
} from 'lucide-react';

interface AndroidTVModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidTVModal: React.FC<AndroidTVModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [tvModeEnabled, setTvModeEnabled] = useState(tvNavigation.getTVMode());

  const tvUrl = typeof window !== 'undefined' ? window.location.origin : 'https://omnistream-mivy.onrender.com';

  useEffect(() => {
    setTvModeEnabled(tvNavigation.getTVMode());
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(tvUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleToggleTvMode = () => {
    const next = !tvModeEnabled;
    tvNavigation.setTVMode(next);
    setTvModeEnabled(next);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-[#001433] border-2 border-amber-400/50 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Top Gold Strip */}
        <div className="h-1.5 bg-gradient-to-r from-amber-400 via-blue-500 to-amber-400 w-full" />

        {/* Modal Header */}
        <div className="p-6 border-b border-blue-900/60 flex items-center justify-between bg-[#00173d]">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-amber-400/20 border border-amber-400/40 text-amber-400 shadow-lg shadow-amber-400/10">
              <Tv className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">Android TV & TV Box Hub</h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-mono">
                  10-Foot UI
                </span>
              </div>
              <p className="text-xs text-blue-200/80">
                Stream movies, anime, comics, and live SuperSport on your Android TV box or Hisense TV
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-blue-300 hover:text-white rounded-xl hover:bg-blue-900 transition-colors cursor-pointer border border-blue-800/40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-100">
          {/* Card 1: Local Network URL */}
          <div className="p-5 rounded-2xl bg-[#000c1e] border-2 border-blue-800/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-black text-amber-300 uppercase tracking-wide">
                  Wi-Fi Direct URL for TV
                </span>
              </div>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                ● Server Online
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 bg-[#00173d] p-3 rounded-xl border border-blue-900">
              <span className="text-sm sm:text-base font-mono font-black text-white truncate tracking-wide">
                {tvUrl}
              </span>
              <button
                onClick={handleCopy}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer flex-shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-amber-300" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy URL'}</span>
              </button>
            </div>
            <p className="text-[11px] text-blue-200/70">
              Make sure your Android TV box and Mac are on the same Wi-Fi network.
            </p>
          </div>

          {/* Card 2: 10-Foot D-Pad Mode Toggle */}
          <div className="p-5 rounded-2xl bg-[#000c1e] border border-blue-800/60 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-900/40 text-amber-300">
                <Gamepad2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white">D-Pad TV Remote Navigation Mode</h4>
                <p className="text-xs text-blue-200/70">
                  Enables spatial 2D arrow navigation, glowing focus rings, and large 10-foot fonts.
                </p>
              </div>
            </div>

            <button
              onClick={handleToggleTvMode}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex-shrink-0 ${
                tvModeEnabled
                  ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/20'
                  : 'bg-blue-900/60 text-blue-200 border border-blue-800'
              }`}
            >
              {tvModeEnabled ? '✓ TV Mode ON' : 'Turn ON TV Mode'}
            </button>
          </div>

          {/* Card 3: 3 Easy Ways to Open on Android TV */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider">
              3 Easy Ways to Open on Android TV
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Option A */}
              <div className="p-4 rounded-2xl bg-[#00173d] border border-blue-900/60 space-y-2">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                  <Download className="w-4 h-4 text-amber-400" />
                  <span>1. Downloader App</span>
                </div>
                <p className="text-[11px] text-blue-100/80 leading-relaxed">
                  Open the free <strong>Downloader</strong> app on your Android TV and type <code className="bg-blue-950 px-1 py-0.5 rounded text-amber-300 font-mono text-[10px]">{tvUrl}</code> in the browser tab.
                </p>
              </div>

              {/* Option B */}
              <div className="p-4 rounded-2xl bg-[#00173d] border border-blue-900/60 space-y-2">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                  <Compass className="w-4 h-4 text-amber-400" />
                  <span>2. TV Bro Browser</span>
                </div>
                <p className="text-[11px] text-blue-100/80 leading-relaxed">
                  Install <strong>TV Bro</strong> from Google Play Store on Android TV. Navigate to the link and bookmark it.
                </p>
              </div>

              {/* Option C */}
              <div className="p-4 rounded-2xl bg-[#00173d] border border-blue-900/60 space-y-2">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>3. Cast / AirPlay</span>
                </div>
                <p className="text-[11px] text-blue-100/80 leading-relaxed">
                  Click Chrome/Brave menu → <strong>Cast</strong> to instantly cast your browser tab to your Android TV or Hisense TV.
                </p>
              </div>
            </div>
          </div>

          {/* Card 4: Remote Control Keybindings */}
          <div className="p-4 rounded-2xl bg-[#00102b] border border-blue-900/50 space-y-2 text-xs">
            <span className="font-bold text-amber-300 uppercase text-[10px] tracking-wider">
              🎮 TV Remote Shortcuts:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px] text-blue-200">
              <div><kbd className="bg-blue-950 px-1.5 py-0.5 rounded border border-blue-800 text-white">⬆ ⬇ ⬅ ➡</kbd> Move focus</div>
              <div><kbd className="bg-blue-950 px-1.5 py-0.5 rounded border border-blue-800 text-white">OK / Enter</kbd> Select / Play</div>
              <div><kbd className="bg-blue-950 px-1.5 py-0.5 rounded border border-blue-800 text-white">Back / Esc</kbd> Close / Return</div>
              <div><kbd className="bg-blue-950 px-1.5 py-0.5 rounded border border-blue-800 text-white">Space / OK</kbd> Play / Pause</div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-blue-900/60 bg-[#00173d] flex items-center justify-between text-xs text-blue-300">
          <span>Local IP: {localIp} (Port 5200)</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from "react";
import { tvNavigation } from "../../services/tvNavigation";
import { Navigation, CornerDownLeft, CheckCircle2, Search, Home } from "lucide-react";

export const TVRemoteHelper: React.FC<{
  onJumpToSearch?: () => void;
  onJumpToHome?: () => void;
  isVideoPlaying?: boolean;
}> = ({ onJumpToSearch, onJumpToHome, isVideoPlaying }) => {
  const [isTV, setIsTV] = useState(tvNavigation.getTVMode());
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsTV(tvNavigation.getTVMode());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Do not show over active video player
  if (!isTV || isVideoPlaying) return null;

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-3 right-3 z-40 px-3 py-1.5 rounded-full bg-slate-950/80 hover:bg-slate-900 border border-amber-500/40 text-amber-400 text-[11px] font-bold shadow-xl backdrop-blur-md flex items-center gap-1.5 transition-all"
        title="Show TV Remote Controls Guide"
      >
        <Navigation className="w-3.5 h-3.5" />
        <span>TV Remote Guide</span>
      </button>
    );
  }

  return (
    <aside
      aria-label="TV Remote Navigation Controls"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 pointer-events-auto select-none"
    >
      <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 rounded-2xl bg-slate-950/90 border border-amber-500/50 shadow-2xl shadow-amber-500/10 backdrop-blur-xl text-white text-xs font-semibold">
        {/* D-Pad Arrows */}
        <div className="flex items-center gap-1.5 text-amber-300">
          <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/40 font-mono text-[10px] font-black">
            ▲ ▼ ◀ ▶
          </span>
          <span className="text-[11px] text-slate-300 font-medium">Navigate</span>
        </div>

        <span className="text-slate-600 font-bold">•</span>

        {/* Enter / OK Button */}
        <div className="flex items-center gap-1.5 text-emerald-400">
          <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/40 font-mono text-[10px] font-black">
            OK / ENTER
          </span>
          <span className="text-[11px] text-slate-300 font-medium">Select / Play</span>
        </div>

        <span className="text-slate-600 font-bold">•</span>

        {/* Back Button */}
        <div className="flex items-center gap-1.5 text-rose-400">
          <span className="px-1.5 py-0.5 rounded-md bg-rose-500/20 border border-rose-400/40 font-mono text-[10px] font-black">
            BACK
          </span>
          <span className="text-[11px] text-slate-300 font-medium">Exit / Close</span>
        </div>

        {/* Quick Shortcuts */}
        {(onJumpToSearch || onJumpToHome) && (
          <>
            <span className="hidden md:inline text-slate-600 font-bold">•</span>
            <div className="hidden md:flex items-center gap-1.5">
              {onJumpToHome && (
                <button
                  onClick={onJumpToHome}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-bold flex items-center gap-1"
                >
                  <Home className="w-3 h-3" />
                  <span>Home</span>
                </button>
              )}
              {onJumpToSearch && (
                <button
                  onClick={onJumpToSearch}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-bold flex items-center gap-1"
                >
                  <Search className="w-3 h-3" />
                  <span>Search</span>
                </button>
              )}
            </div>
          </>
        )}

        <button
          onClick={() => setMinimized(true)}
          className="ml-1 text-slate-500 hover:text-slate-300 p-0.5 rounded"
          title="Minimize bar"
        >
          ✕
        </button>
      </div>
    </aside>
  );
};

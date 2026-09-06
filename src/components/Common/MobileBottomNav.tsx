import React, { useState } from 'react';
import {
  Home,
  Film,
  Tv,
  BookOpen,
  Headphones,
  MoreHorizontal,
  Trophy,
  Rss,
  Bookmark,
  Activity,
  HardDrive,
  X
} from 'lucide-react';
import { tvNavigation } from '../../services/tvNavigation';

interface MobileBottomNavProps {
  activeTab: 'home' | 'browse' | 'anime' | 'media' | 'sports' | 'rss' | 'library' | 'arr' | 'audiobooks';
  setActiveTab: (tab: any) => void;
  onOpenStats?: () => void;
  onOpenAndroidTV?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenStats,
  onOpenAndroidTV
}) => {
  const [showMoreDrawer, setShowMoreDrawer] = useState(false);

  // If in TV mode, don't show the mobile bottom nav
  if (tvNavigation.getTVMode()) {
    return null;
  }

  const navItems = [
    { id: 'home', label: 'Home', icon: Home, color: 'text-blue-400' },
    { id: 'media', label: 'Movies', icon: Film, color: 'text-rose-400' },
    { id: 'anime', label: 'Anime', icon: Tv, color: 'text-purple-400' },
    { id: 'browse', label: 'Comics', icon: BookOpen, color: 'text-sky-400' },
    { id: 'audiobooks', label: 'Audio', icon: Headphones, color: 'text-amber-400' }
  ];

  const moreItems = [
    { id: 'sports', label: 'Live Sports', icon: Trophy, color: 'text-amber-400' },
    { id: 'library', label: 'My Library', icon: Bookmark, color: 'text-emerald-400' },
    { id: 'rss', label: 'News Feeds', icon: Rss, color: 'text-orange-400' },
    { id: 'arr', label: 'Arr Media Vault', icon: HardDrive, color: 'text-cyan-400' }
  ];

  const isMoreActive = ['sports', 'library', 'rss', 'arr'].includes(activeTab);

  return (
    <>
      {/* More Options Drawer Modal */}
      {showMoreDrawer && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col justify-end md:hidden animate-fade-in"
          onClick={() => setShowMoreDrawer(false)}
        >
          <div
            className="bg-[#0B0F17] border-t border-slate-800 rounded-t-3xl p-5 space-y-4 max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-black text-white uppercase tracking-wider">
                Explore More Hubs
              </span>
              <button
                onClick={() => setShowMoreDrawer(false)}
                className="p-1 rounded-full bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {moreItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setShowMoreDrawer(false);
                    }}
                    className={`flex items-center gap-3 p-3 rounded-2xl border transition-all text-left ${
                      isActive
                        ? 'bg-blue-600/20 border-blue-500/60 text-white'
                        : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className={`p-2 rounded-xl bg-slate-800/80 ${item.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold">{item.label}</h4>
                      <p className="text-[10px] text-slate-400">Tap to open</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {onOpenStats && (
              <button
                onClick={() => {
                  setShowMoreDrawer(false);
                  onOpenStats();
                }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 text-xs font-bold text-slate-200 hover:text-white transition-colors"
              >
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>View Global Reading & Stream Stats</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Floating Bottom Nav Dock */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-[#090b14]/95 backdrop-blur-2xl border-t border-slate-800/90 px-2 py-1.5 shadow-2xl flex items-center justify-around select-none"
        style={{ paddingBottom: 'max(6px, env(safe-area-inset-bottom))' }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer ${
                isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-all ${
                  isActive
                    ? 'bg-blue-600/20 ring-1 ring-blue-500/40 scale-110 shadow-lg shadow-blue-500/10'
                    : ''
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? item.color : 'text-slate-400'}`} />
              </div>
              <span
                className={`text-[10px] font-bold mt-0.5 tracking-tight ${
                  isActive ? 'text-white font-black' : 'text-slate-400'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}

        {/* More Button */}
        <button
          onClick={() => setShowMoreDrawer(true)}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer ${
            isMoreActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div
            className={`p-1.5 rounded-xl transition-all ${
              isMoreActive
                ? 'bg-blue-600/20 ring-1 ring-blue-500/40 scale-110 shadow-lg shadow-blue-500/10'
                : ''
            }`}
          >
            <MoreHorizontal
              className={`w-4 h-4 ${isMoreActive ? 'text-amber-400' : 'text-slate-400'}`}
            />
          </div>
          <span
            className={`text-[10px] font-bold mt-0.5 tracking-tight ${
              isMoreActive ? 'text-white font-black' : 'text-slate-400'
            }`}
          >
            More
          </span>
        </button>
      </nav>
    </>
  );
};

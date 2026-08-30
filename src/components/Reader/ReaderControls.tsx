import React, { useState } from 'react';
import {
  ReadingMode,
  ReadingDirection,
  DisplayFilter,
  Comic,
  Chapter
} from '../../types/comic';
import { UserPreferences } from '../../services/storage';
import {
  ArrowLeft,
  BookOpen,
  Columns2,
  ScrollText,
  Sparkles,
  SlidersHorizontal,
  Bookmark,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Sun,
  Bot,
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkle
} from 'lucide-react';

interface ReaderControlsProps {
  visible: boolean;
  comic: Comic;
  chapter: Chapter;
  currentPage: number;
  totalPages: number;
  currentPanelIndex?: number;
  totalPanelsOnPage?: number;
  mode: ReadingMode;
  direction: ReadingDirection;
  preferences: UserPreferences;
  isFullscreen: boolean;
  enableAmbilight: boolean;
  autoPlaySpeed: number;
  soundEnabled: boolean;
  onBack: () => void;
  onPageChange: (page: number) => void;
  onNext: () => void;
  onPrev: () => void;
  onModeChange: (mode: ReadingMode) => void;
  onDirectionChange: (dir: ReadingDirection) => void;
  onToggleFullscreen: () => void;
  onAddBookmark: () => void;
  onOpenShortcuts: () => void;
  onOpenAiDrawer: () => void;
  onToggleAmbilight: () => void;
  onToggleSound: () => void;
  onSetAutoPlaySpeed: (speed: number) => void;
  onUpdatePreferences: (prefs: Partial<UserPreferences>) => void;
}

export const ReaderControls: React.FC<ReaderControlsProps> = ({
  visible,
  comic,
  chapter,
  currentPage,
  totalPages,
  currentPanelIndex,
  totalPanelsOnPage,
  mode,
  direction,
  preferences,
  isFullscreen,
  enableAmbilight,
  autoPlaySpeed,
  soundEnabled,
  onBack,
  onPageChange,
  onNext,
  onPrev,
  onModeChange,
  onDirectionChange,
  onToggleFullscreen,
  onAddBookmark,
  onOpenShortcuts,
  onOpenAiDrawer,
  onToggleAmbilight,
  onToggleSound,
  onSetAutoPlaySpeed,
  onUpdatePreferences
}) => {
  const [showSettings, setShowSettings] = useState(false);

  const filters = preferences.filters;

  const handleFilterChange = (key: keyof DisplayFilter, val: any) => {
    onUpdatePreferences({
      filters: {
        ...filters,
        [key]: val
      }
    });
  };

  const resetFilters = () => {
    onUpdatePreferences({
      filters: {
        brightness: 100,
        contrast: 100,
        sepia: 0,
        invert: false,
        grayscale: false
      }
    });
  };

  return (
    <>
      {/* TOP HUD BAR */}
      <div
        className={`fixed top-0 left-0 right-0 z-40 bg-gradient-to-b from-[#0B0F17]/95 via-[#0B0F17]/80 to-transparent p-4 transition-all duration-300 pointer-events-auto ${
          visible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Left: Back & Comic Info */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 shadow-md backdrop-blur-md transition-all"
              title="Return to Library (Esc)"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="hidden sm:block">
              <h2 className="text-xs md:text-sm font-bold text-white line-clamp-1 max-w-[200px] md:max-w-xs">
                {comic.title}
              </h2>
              <p className="text-[11px] text-slate-400 line-clamp-1">
                {chapter.title}
              </p>
            </div>
          </div>

          {/* Center: Reading Mode Selector */}
          <div className="flex items-center bg-slate-900/90 p-1 rounded-2xl border border-slate-700/80 shadow-lg backdrop-blur-md">
            {/* Single Page */}
            <button
              onClick={() => onModeChange('single')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                mode === 'single'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Single Page Mode (S)"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Single</span>
            </button>

            {/* Double Page */}
            <button
              onClick={() => onModeChange('double')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                mode === 'double'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Double Page Spread Mode (D)"
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Double</span>
            </button>

            {/* Vertical Scroll (Webtoon) */}
            <button
              onClick={() => onModeChange('vertical')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                mode === 'vertical'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Vertical Scroll / Webtoon Mode (V)"
            >
              <ScrollText className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Webtoon</span>
            </button>

            {/* Smart Panel View (Guided View) */}
            <button
              onClick={() => onModeChange('panel')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                mode === 'panel'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-purple-400 hover:text-purple-300'
              }`}
              title="Smart Guided Panel View (P)"
            >
              <Sparkles className="w-3.5 h-3.5 fill-current" />
              <span>Panel View</span>
            </button>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* AI Assistant Button */}
            <button
              onClick={onOpenAiDrawer}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 text-xs font-bold shadow-md backdrop-blur-md transition-all hover:scale-105"
              title="Open AI Comic Companion"
            >
              <Bot className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">AI Intel</span>
            </button>

            {/* LTR / RTL Direction Toggle */}
            <button
              onClick={() => onDirectionChange(direction === 'ltr' ? 'rtl' : 'ltr')}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 text-xs font-bold shadow-md backdrop-blur-md transition-all"
              title={direction === 'ltr' ? 'Western: Left-to-Right' : 'Manga: Right-to-Left'}
            >
              {direction.toUpperCase()}
            </button>

            {/* Settings Toggle */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-xl border transition-all ${
                showSettings
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-slate-900/80 border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title="Display & Reader Settings"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>

            {/* Bookmark */}
            <button
              onClick={onAddBookmark}
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 shadow-md backdrop-blur-md transition-all"
              title="Bookmark Current Page (B)"
            >
              <Bookmark className="w-4 h-4" />
            </button>

            {/* Fullscreen */}
            <button
              onClick={onToggleFullscreen}
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 shadow-md backdrop-blur-md transition-all"
              title="Toggle Fullscreen (F)"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* SETTINGS DRAWER */}
        {showSettings && (
          <div
            className="absolute top-16 right-4 sm:right-8 w-84 bg-slate-900/95 border border-slate-800 rounded-3xl p-5 shadow-2xl backdrop-blur-2xl space-y-4 text-xs z-50 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <span className="font-bold text-white flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
                <span>Display & Cinematic Options</span>
              </span>
              <button
                onClick={resetFilters}
                className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px]"
                title="Reset adjustments"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            {/* Dynamic Ambilight Glow */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                <Sparkle className="w-3.5 h-3.5 text-purple-400" />
                <span>Ambilight Cinema Glow</span>
              </div>
              <button
                onClick={onToggleAmbilight}
                className={`w-10 h-5 rounded-full transition-colors relative ${
                  enableAmbilight ? 'bg-purple-600' : 'bg-slate-800'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.75 transition-transform ${
                    enableAmbilight ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Tactile Sound FX */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-blue-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
                <span>Page Flip Audio FX</span>
              </div>
              <button
                onClick={onToggleSound}
                className={`w-10 h-5 rounded-full transition-colors relative ${
                  soundEnabled ? 'bg-blue-600' : 'bg-slate-800'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.75 transition-transform ${
                    soundEnabled ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Auto Play Speed */}
            <div className="space-y-1 pt-1 border-t border-slate-800">
              <div className="flex justify-between text-slate-400">
                <span>Cinema Auto-Play Speed</span>
                <span className="text-emerald-400 font-bold">{autoPlaySpeed}s / panel</span>
              </div>
              <input
                type="range"
                min="1.5"
                max="8"
                step="0.5"
                value={autoPlaySpeed}
                onChange={(e) => onSetAutoPlaySpeed(parseFloat(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>

            {/* Brightness */}
            <div className="space-y-1 pt-1 border-t border-slate-800">
              <div className="flex justify-between text-slate-400">
                <span className="flex items-center gap-1">
                  <Sun className="w-3 h-3 text-amber-400" /> Brightness
                </span>
                <span>{filters.brightness}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="150"
                value={filters.brightness}
                onChange={(e) => handleFilterChange('brightness', parseInt(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>

            {/* Contrast */}
            <div className="space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Contrast</span>
                <span>{filters.contrast}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="150"
                value={filters.contrast}
                onChange={(e) => handleFilterChange('contrast', parseInt(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>

            {/* Invert / Night Reading */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-300">Invert Colors (Dark Paper)</span>
              <button
                onClick={() => handleFilterChange('invert', !filters.invert)}
                className={`w-10 h-5 rounded-full transition-colors relative ${
                  filters.invert ? 'bg-blue-600' : 'bg-slate-800'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.75 transition-transform ${
                    filters.invert ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM HUD SCRUBBER BAR */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-[#0B0F17]/95 via-[#0B0F17]/85 to-transparent p-4 transition-all duration-300 pointer-events-auto ${
          visible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-2">
          <div className="flex items-center gap-3 text-xs font-semibold text-slate-300 bg-slate-900/90 px-4 py-1.5 rounded-full border border-slate-800 shadow-md backdrop-blur-md">
            <span>
              Page <strong className="text-white">{currentPage}</strong> of <strong className="text-slate-400">{totalPages}</strong>
            </span>
            {mode === 'panel' && totalPanelsOnPage !== undefined && (
              <span className="text-purple-400 font-bold border-l border-slate-700 pl-3">
                Panel {(currentPanelIndex || 0) + 1} / {totalPanelsOnPage}
              </span>
            )}
          </div>

          <div className="w-full flex items-center gap-3">
            <button
              onClick={onPrev}
              className="p-2 rounded-full bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700 shadow-md backdrop-blur-md transition-all"
              title="Previous"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex-1 relative flex items-center">
              <input
                type="range"
                min="1"
                max={Math.max(1, totalPages)}
                value={currentPage}
                onChange={(e) => onPageChange(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            <button
              onClick={onNext}
              className="p-2 rounded-full bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700 shadow-md backdrop-blur-md transition-all"
              title="Next"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

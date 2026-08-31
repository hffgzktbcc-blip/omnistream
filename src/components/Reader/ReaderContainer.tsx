import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Comic,
  Chapter,
  ComicPage,
  ReadingMode,
  ReadingDirection
} from '../../types/comic';
import { storage, UserPreferences } from '../../services/storage';
import { soundFx } from '../../services/soundEffects';
import { ReaderControls } from './ReaderControls';
import { PaginationView } from './PaginationView';
import { VerticalScrollView } from './VerticalScrollView';
import { PanelView } from './PanelView';
import { ShortcutsModal } from './ShortcutsModal';
import { AiAssistantDrawer } from './AiAssistantDrawer';
import { Loader2, BookmarkPlus, ChevronLeft, ChevronRight, AlertCircle, ArrowLeft } from 'lucide-react';

interface ReaderContainerProps {
  comic: Comic;
  chapter: Chapter;
  pages: ComicPage[];
  initialPage?: number;
  initialPanel?: number;
  onExit: () => void;
}

export const ReaderContainer: React.FC<ReaderContainerProps> = ({
  comic,
  chapter,
  pages,
  initialPage = 1,
  initialPanel = 0,
  onExit
}) => {
  const isWebtoonComic =
    comic.source === 'webtoons' ||
    comic.type?.toLowerCase().includes('webtoon') ||
    comic.type?.toLowerCase().includes('manhwa') ||
    comic.tags?.some((t) => t.toLowerCase().includes('webtoon'));

  const [preferences, setPreferences] = useState<UserPreferences>(storage.getPreferences());
  const [mode, setMode] = useState<ReadingMode>(
    isWebtoonComic ? 'vertical' : preferences.defaultMode
  );
  const [direction, setDirection] = useState<ReadingDirection>(preferences.defaultDirection);
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [panelIndex, setPanelIndex] = useState<number>(initialPanel);
  const [totalPanelsOnPage, setTotalPanelsOnPage] = useState<number>(1);
  const [hudVisible, setHudVisible] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showShortcuts, setShowShortcuts] = useState<boolean>(false);
  const [showAiDrawer, setShowAiDrawer] = useState<boolean>(false);
  const [showBookmarkDialog, setShowBookmarkDialog] = useState<boolean>(false);
  const [bookmarkNote, setBookmarkNote] = useState<string>('');

  // Pro Features State
  const [autoPlay, setAutoPlay] = useState<boolean>(false);
  const [autoPlaySpeed, setAutoPlaySpeed] = useState<number>(3.5);
  const [enableAmbilight, setEnableAmbilight] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const hideHudTimer = useRef<NodeJS.Timeout | null>(null);

  const resetHudTimer = useCallback(() => {
    setHudVisible(true);
    if (hideHudTimer.current) clearTimeout(hideHudTimer.current);
    hideHudTimer.current = setTimeout(() => {
      setHudVisible(false);
    }, 5000);
  }, []);

  const toggleHud = () => {
    setHudVisible((prev) => !prev);
  };

  // Save reading progress
  useEffect(() => {
    if (pages.length === 0) return;
    storage.saveProgress({
      comicId: comic.id,
      chapterId: chapter.id,
      comicTitle: comic.title,
      chapterTitle: chapter.title,
      cover: comic.cover,
      source: comic.source,
      pageNumber: currentPage,
      totalPages: pages.length,
      panelIndex: mode === 'panel' ? panelIndex : undefined,
      updatedAt: Date.now()
    });
  }, [comic, chapter, currentPage, panelIndex, mode, pages.length]);

  // Zero-Buffering Page Preloader (Tachiyomi Pro feature)
  useEffect(() => {
    if (!pages || pages.length === 0) return;
    const preloadIndices = [currentPage, currentPage + 1, currentPage + 2];
    preloadIndices.forEach((idx) => {
      if (idx <= pages.length) {
        const page = pages[idx - 1];
        if (page && page.url) {
          const img = new Image();
          img.src = page.url;
        }
      }
    });
  }, [currentPage, pages]);

  // UNIFIED NEXT STEP
  const handleNextStep = useCallback(() => {
    if (mode === 'panel') {
      if (panelIndex < totalPanelsOnPage - 1) {
        setPanelIndex((prev) => prev + 1);
      } else if (currentPage < pages.length) {
        soundFx.playPageTurn();
        setCurrentPage((prev) => prev + 1);
        setPanelIndex(0);
      }
    } else if (mode === 'double') {
      soundFx.playPageTurn();
      if (preferences.doublePageCoverOffset && currentPage === 1) {
        setCurrentPage(2);
      } else {
        setCurrentPage((prev) => Math.min(pages.length, prev + 2));
      }
    } else {
      if (currentPage < pages.length) {
        soundFx.playPageTurn();
        setCurrentPage((prev) => prev + 1);
        setPanelIndex(0);
      }
    }
  }, [mode, panelIndex, totalPanelsOnPage, currentPage, pages.length, preferences.doublePageCoverOffset]);

  // UNIFIED PREVIOUS STEP
  const handlePrevStep = useCallback(() => {
    if (mode === 'panel') {
      if (panelIndex > 0) {
        setPanelIndex((prev) => prev - 1);
      } else if (currentPage > 1) {
        soundFx.playPageTurn();
        setCurrentPage((prev) => prev - 1);
        setPanelIndex(0);
      }
    } else if (mode === 'double') {
      soundFx.playPageTurn();
      if (preferences.doublePageCoverOffset && currentPage <= 3) {
        setCurrentPage(1);
      } else {
        setCurrentPage((prev) => Math.max(1, prev - 2));
      }
    } else {
      if (currentPage > 1) {
        soundFx.playPageTurn();
        setCurrentPage((prev) => prev - 1);
        setPanelIndex(0);
      }
    }
  }, [mode, panelIndex, currentPage, preferences.doublePageCoverOffset]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      resetHudTimer();

      switch (e.key) {
        case 'ArrowRight':
        case ' ': // Spacebar
          e.preventDefault();
          direction === 'ltr' ? handleNextStep() : handlePrevStep();
          break;

        case 'ArrowLeft':
          e.preventDefault();
          direction === 'ltr' ? handlePrevStep() : handleNextStep();
          break;

        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;

        case 'p':
        case 'P':
          e.preventDefault();
          setMode((prev) => (prev === 'panel' ? 'single' : 'panel'));
          setPanelIndex(0);
          break;

        case 's':
        case 'S':
          e.preventDefault();
          setMode('single');
          break;

        case 'd':
        case 'D':
          e.preventDefault();
          setMode('double');
          break;

        case 'v':
        case 'V':
          e.preventDefault();
          setMode('vertical');
          break;

        case 'a':
        case 'A':
          e.preventDefault();
          setShowAiDrawer((prev) => !prev);
          break;

        case 'b':
        case 'B':
          e.preventDefault();
          setShowBookmarkDialog(true);
          break;

        case 'Escape':
          e.preventDefault();
          if (showAiDrawer) setShowAiDrawer(false);
          else if (showShortcuts) setShowShortcuts(false);
          else if (showBookmarkDialog) setShowBookmarkDialog(false);
          else onExit();
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [direction, handleNextStep, handlePrevStep, showShortcuts, showAiDrawer, showBookmarkDialog, onExit, resetHudTimer]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleUpdatePreferences = (updated: Partial<UserPreferences>) => {
    const newPrefs = storage.savePreferences(updated);
    setPreferences(newPrefs);
  };

  const handleSaveBookmark = () => {
    const activePage = pages[currentPage - 1];
    storage.addBookmark({
      comicId: comic.id,
      chapterId: chapter.id,
      comicTitle: comic.title,
      chapterTitle: chapter.title,
      cover: comic.cover,
      pageNumber: currentPage,
      panelIndex: mode === 'panel' ? panelIndex : undefined,
      thumbnailUrl: activePage?.url,
      note: bookmarkNote.trim() || undefined
    });
    setBookmarkNote('');
    setShowBookmarkDialog(false);
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundFx.setEnabled(next);
  };

  const activePage = pages[currentPage - 1] || pages[0];

  const getThemeBg = () => {
    switch (preferences.theme) {
      case 'amoled':
        return 'bg-[#000000]';
      case 'charcoal':
        return 'bg-[#1E293B]';
      case 'light':
        return 'bg-[#F8FAFC] text-slate-900';
      default:
        return 'bg-[#0B0F17]';
    }
  };

  if (!pages || pages.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0B0F17] text-white p-6 text-center animate-fade-in">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shadow-lg">
            <AlertCircle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white">No Readable Pages Available</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              This chapter does not contain any hosted image pages. It may be licensed, externally hosted, or temporarily unavailable.
            </p>
          </div>

          <div className="w-full pt-2 flex flex-col gap-2">
            <button
              onClick={onExit}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Library / Catalog (Esc)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={resetHudTimer}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden transition-colors duration-300 ${getThemeBg()}`}
    >
      {/* TOP & BOTTOM HUD CONTROLS */}
      <ReaderControls
        visible={hudVisible}
        comic={comic}
        chapter={chapter}
        currentPage={currentPage}
        totalPages={pages.length}
        currentPanelIndex={panelIndex}
        totalPanelsOnPage={totalPanelsOnPage}
        mode={mode}
        direction={direction}
        preferences={preferences}
        isFullscreen={isFullscreen}
        enableAmbilight={enableAmbilight}
        autoPlaySpeed={autoPlaySpeed}
        soundEnabled={soundEnabled}
        onBack={onExit}
        onPageChange={(p) => {
          setCurrentPage(p);
          setPanelIndex(0);
        }}
        onNext={direction === 'ltr' ? handleNextStep : handlePrevStep}
        onPrev={direction === 'ltr' ? handlePrevStep : handleNextStep}
        onModeChange={(m) => {
          setMode(m);
          setPanelIndex(0);
        }}
        onDirectionChange={setDirection}
        onToggleFullscreen={toggleFullscreen}
        onAddBookmark={() => setShowBookmarkDialog(true)}
        onOpenShortcuts={() => setShowShortcuts(true)}
        onOpenAiDrawer={() => setShowAiDrawer(true)}
        onToggleAmbilight={() => setEnableAmbilight(!enableAmbilight)}
        onToggleSound={toggleSound}
        onSetAutoPlaySpeed={setAutoPlaySpeed}
        onUpdatePreferences={handleUpdatePreferences}
      />

      {/* FLOATING PROMINENT ON-SCREEN NAVIGATION BUTTONS */}
      <div className="fixed inset-y-0 left-0 z-30 flex items-center pl-3 pointer-events-none">
        <button
          onClick={(e) => {
            e.stopPropagation();
            direction === 'ltr' ? handlePrevStep() : handleNextStep();
          }}
          className="pointer-events-auto p-3.5 rounded-full bg-slate-900/80 hover:bg-blue-600 hover:scale-110 text-white border border-slate-700 shadow-2xl backdrop-blur-md transition-all duration-200 opacity-60 hover:opacity-100"
          title="Previous (Left Arrow / Shift+Space)"
        >
          <ChevronLeft className="w-7 h-7" />
        </button>
      </div>

      <div className="fixed inset-y-0 right-0 z-30 flex items-center pr-3 pointer-events-none">
        <button
          onClick={(e) => {
            e.stopPropagation();
            direction === 'ltr' ? handleNextStep() : handlePrevStep();
          }}
          className="pointer-events-auto p-3.5 rounded-full bg-slate-900/80 hover:bg-blue-600 hover:scale-110 text-white border border-slate-700 shadow-2xl backdrop-blur-md transition-all duration-200 opacity-60 hover:opacity-100"
          title="Next (Right Arrow / Space)"
        >
          <ChevronRight className="w-7 h-7" />
        </button>
      </div>

      {/* CORE READING VIEWS */}
      <main className="w-full h-full flex items-center justify-center">
        {pages.length === 0 ? (
          <div className="max-w-md p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-4 shadow-2xl animate-fade-in mx-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">External Chapter Mirror</h3>
              <p className="text-xs text-slate-400">
                This chapter is hosted on an external official reader (such as MangaPlus or Webtoons). You can open the mirror directly or pick another chapter.
              </p>
            </div>
            <div className="pt-2 flex flex-col gap-2">
              {chapter.externalUrl && (
                <a
                  href={chapter.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30"
                >
                  <span>Open Official Reader</span>
                </a>
              )}
              <button
                onClick={onExit}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Chapter Index</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* 1. Single & Double Page View */}
            {(mode === 'single' || mode === 'double') && (
              <PaginationView
                pages={pages}
                currentPage={currentPage}
                isDoublePage={mode === 'double'}
                direction={direction}
                coverOffset={preferences.doublePageCoverOffset}
                filters={preferences.filters}
                onNextPage={handleNextStep}
                onPrevPage={handlePrevStep}
                onToggleHud={toggleHud}
              />
            )}

            {/* 2. Continuous Vertical Scroll (Webtoon) */}
            {mode === 'vertical' && (
              <VerticalScrollView
                pages={pages}
                currentPage={currentPage}
                gap={preferences.webtoonGap}
                filters={preferences.filters}
                onPageVisible={(p) => setCurrentPage(p)}
                onToggleHud={toggleHud}
              />
            )}

            {/* 3. Smart Guided Panel View 2.0 */}
            {mode === 'panel' && activePage && (
              <PanelView
                page={activePage}
                direction={direction}
                filters={preferences.filters}
                panelIndex={panelIndex}
                autoPlay={autoPlay}
                autoPlaySpeed={autoPlaySpeed}
                enableAmbilight={enableAmbilight}
                onPanelIndexChange={setPanelIndex}
                onNextPage={handleNextStep}
                onPrevPage={handlePrevStep}
                onToggleHud={toggleHud}
                onToggleAutoPlay={() => setAutoPlay(!autoPlay)}
                onPanelsDetected={(detected) => setTotalPanelsOnPage(detected.length)}
              />
            )}
          </>
        )}
      </main>

      {/* AI COMPANION DRAWER */}
      <AiAssistantDrawer
        isOpen={showAiDrawer}
        onClose={() => setShowAiDrawer(false)}
        comic={comic}
        chapter={chapter}
        currentPage={currentPage}
      />

      {/* SHORTCUTS MODAL */}
      <ShortcutsModal
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />

      {/* BOOKMARK NOTE DIALOG */}
      {showBookmarkDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setShowBookmarkDialog(false)}
        >
          <div
            className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                <BookmarkPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Save Bookmark</h3>
                <p className="text-[11px] text-slate-400">
                  Page {currentPage} {mode === 'panel' ? `• Panel ${panelIndex + 1}` : ''}
                </p>
              </div>
            </div>

            <textarea
              rows={3}
              placeholder="Add optional note or memory..."
              value={bookmarkNote}
              onChange={(e) => setBookmarkNote(e.target.value)}
              className="w-full bg-slate-950 text-xs text-slate-200 p-3 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 placeholder:text-slate-600 resize-none"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowBookmarkDialog(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBookmark}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all"
              >
                Save Bookmark
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

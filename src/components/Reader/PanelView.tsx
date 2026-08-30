import React, { useEffect, useState, useRef } from 'react';
import { ComicPage, PanelBox, ReadingDirection, DisplayFilter } from '../../types/comic';
import { detectPanelsAdvanced, DominantColors } from '../../services/panelDetector';
import { soundFx } from '../../services/soundEffects';
import {
  Sparkles,
  Eye,
  Play,
  Pause,
  Edit3,
  Check,
  SplitSquareVertical,
  SplitSquareHorizontal,
  Trash2
} from 'lucide-react';

interface PanelViewProps {
  page: ComicPage;
  direction: ReadingDirection;
  filters: DisplayFilter;
  panelIndex: number;
  autoPlay: boolean;
  autoPlaySpeed: number;
  enableAmbilight: boolean;
  onPanelIndexChange: (idx: number) => void;
  onNextPage: () => void;
  onPrevPage: () => void;
  onToggleHud: () => void;
  onToggleAutoPlay: () => void;
  onPanelsDetected: (panels: PanelBox[]) => void;
}

export const PanelView: React.FC<PanelViewProps> = ({
  page,
  direction,
  filters,
  panelIndex,
  autoPlay,
  autoPlaySpeed,
  enableAmbilight,
  onPanelIndexChange,
  onNextPage,
  onPrevPage,
  onToggleHud,
  onToggleAutoPlay,
  onPanelsDetected
}) => {
  const [panels, setPanels] = useState<PanelBox[]>(page.panels || []);
  const [detecting, setDetecting] = useState<boolean>(false);
  const [showOverview, setShowOverview] = useState<boolean>(false);
  const [isEditingPanels, setIsEditingPanels] = useState<boolean>(false);
  const [ambient, setAmbient] = useState<DominantColors>({
    primary: '#3B82F6',
    secondary: '#8B5CF6',
    glow: 'rgba(59, 130, 246, 0.25)'
  });
  const [imgNaturalSize, setImgNaturalSize] = useState<{ width: number; height: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Filter styles
  const filterStyle: React.CSSProperties = {
    filter: `brightness(${filters.brightness}%) contrast(${filters.contrast}%) sepia(${filters.sepia}%) ${
      filters.invert ? 'invert(1) hue-rotate(180deg)' : ''
    } ${filters.grayscale ? 'grayscale(1)' : ''}`,
  };

  // Run panel detection on page load
  useEffect(() => {
    let cancelled = false;

    if (page.panels && page.panels.length > 0) {
      setPanels(page.panels);
      onPanelsDetected(page.panels);
      return;
    }

    setDetecting(true);
    detectPanelsAdvanced(page.url, direction)
      .then((res) => {
        if (!cancelled) {
          setPanels(res.panels);
          setAmbient(res.ambientColors);
          page.panels = res.panels;
          onPanelsDetected(res.panels);
          if (panelIndex >= res.panels.length) {
            onPanelIndexChange(Math.max(0, res.panels.length - 1));
          }
        }
      })
      .catch((err) => {
        console.warn('Advanced panel detection fallback:', err);
      })
      .finally(() => {
        if (!cancelled) setDetecting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page.url, direction]);

  // Sound effect on panel transition
  useEffect(() => {
    soundFx.playPanelWhoosh();
  }, [panelIndex, page.pageNumber]);

  // Auto-play timer
  useEffect(() => {
    if (!autoPlay || detecting) return;

    const timer = setTimeout(() => {
      if (panelIndex < panels.length - 1) {
        onPanelIndexChange(panelIndex + 1);
      } else {
        onNextPage();
      }
    }, autoPlaySpeed * 1000);

    return () => clearTimeout(timer);
  }, [autoPlay, autoPlaySpeed, panelIndex, panels.length, onPanelIndexChange, onNextPage, detecting]);

  const activePanel: PanelBox = panels[panelIndex] || {
    x: 0,
    y: 0,
    width: 1,
    height: 1
  };

  // Compute Marvel Unlimited Camera Zoom & Pan Transform
  const getCameraTransform = () => {
    if (showOverview || isEditingPanels || !containerRef.current || !imgNaturalSize) {
      return {
        transform: 'scale(1)',
        transition: 'transform 0.4s ease-out'
      };
    }

    const containerW = containerRef.current.clientWidth;
    const containerH = containerRef.current.clientHeight;

    const fitScale = Math.min(
      (containerW * 0.94) / imgNaturalSize.width,
      (containerH * 0.92) / imgNaturalSize.height
    );

    const renderedW = imgNaturalSize.width * fitScale;
    const renderedH = imgNaturalSize.height * fitScale;

    const pPxW = activePanel.width * renderedW;
    const pPxH = activePanel.height * renderedH;
    const pPxX = activePanel.x * renderedW;
    const pPxY = activePanel.y * renderedH;

    const zoomScale = Math.min(
      (containerW * 0.88) / Math.max(pPxW, 50),
      (containerH * 0.86) / Math.max(pPxH, 50),
      3.2
    );

    const panelCenterRelX = pPxX + pPxW / 2 - renderedW / 2;
    const panelCenterRelY = pPxY + pPxH / 2 - renderedH / 2;

    const translateX = -panelCenterRelX * zoomScale;
    const translateY = -panelCenterRelY * zoomScale;

    return {
      transform: `translate(${translateX}px, ${translateY}px) scale(${zoomScale})`,
      transition: 'transform 0.52s cubic-bezier(0.16, 1, 0.3, 1)'
    };
  };

  const handleNext = () => {
    if (detecting) return;
    if (panelIndex < panels.length - 1) {
      onPanelIndexChange(panelIndex + 1);
    } else {
      onNextPage();
    }
  };

  const handlePrev = () => {
    if (detecting) return;
    if (panelIndex > 0) {
      onPanelIndexChange(panelIndex - 1);
    } else {
      onPrevPage();
    }
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.currentTarget;
    setImgNaturalSize({
      width: target.naturalWidth || 800,
      height: target.naturalHeight || 1200
    });
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowOverview((prev) => !prev);
  };

  // Panel Editing actions
  const handleSplitVertical = (idx: number) => {
    const target = panels[idx];
    const halfH = target.height / 2;
    const p1: PanelBox = { ...target, height: halfH, id: `p_${Date.now()}_1` };
    const p2: PanelBox = { ...target, y: target.y + halfH, height: halfH, id: `p_${Date.now()}_2` };
    const newPanels = [...panels];
    newPanels.splice(idx, 1, p1, p2);
    setPanels(newPanels);
    page.panels = newPanels;
  };

  const handleSplitHorizontal = (idx: number) => {
    const target = panels[idx];
    const halfW = target.width / 2;
    const p1: PanelBox = { ...target, width: halfW, id: `p_${Date.now()}_1` };
    const p2: PanelBox = { ...target, x: target.x + halfW, width: halfW, id: `p_${Date.now()}_2` };
    const newPanels = [...panels];
    newPanels.splice(idx, 1, p1, p2);
    setPanels(newPanels);
    page.panels = newPanels;
  };

  const handleDeletePanel = (idx: number) => {
    if (panels.length <= 1) return;
    const newPanels = panels.filter((_, i) => i !== idx);
    setPanels(newPanels);
    page.panels = newPanels;
    if (panelIndex >= newPanels.length) {
      onPanelIndexChange(newPanels.length - 1);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center select-none overflow-hidden"
      onClick={onToggleHud}
      onDoubleClick={handleDoubleClick}
    >
      {/* DYNAMIC AMBILIGHT CINEMA BACKDROP */}
      {enableAmbilight && (
        <div
          className="absolute inset-0 pointer-events-none transition-all duration-700 blur-3xl opacity-40"
          style={{
            background: `radial-gradient(circle at center, ${ambient.glow} 0%, transparent 70%)`
          }}
        />
      )}

      {/* Detecting Spinner */}
      {detecting && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/90 border border-purple-500/30 text-purple-300 text-xs font-semibold shadow-2xl backdrop-blur-md animate-pulse">
          <Sparkles className="w-3.5 h-3.5 animate-spin" />
          <span>Smart Panel Beats Analyzing...</span>
        </div>
      )}

      {/* Tap Navigation Zones (3-Zone Marvel Unlimited System) */}
      {!isEditingPanels && (
        <>
          {/* Left Zone: Previous Beat */}
          <div
            className="absolute top-0 bottom-0 left-0 w-1/3 z-20 cursor-w-resize"
            onClick={(e) => {
              e.stopPropagation();
              direction === 'ltr' ? handlePrev() : handleNext();
            }}
          />
          {/* Right Zone: Next Beat */}
          <div
            className="absolute top-0 bottom-0 right-0 w-1/3 z-20 cursor-e-resize"
            onClick={(e) => {
              e.stopPropagation();
              direction === 'ltr' ? handleNext() : handlePrev();
            }}
          />
        </>
      )}

      {/* Animated Camera Stage */}
      <div
        className="relative flex items-center justify-center max-w-full max-h-full origin-center will-change-transform"
        style={getCameraTransform()}
      >
        <div className="relative shadow-2xl rounded-lg overflow-hidden bg-slate-950">
          <img
            ref={imgRef}
            src={page.url}
            alt={`Page ${page.pageNumber}`}
            style={filterStyle}
            onLoad={handleImageLoad}
            className="max-h-[92vh] max-w-[92vw] object-contain pointer-events-none rounded transition-all"
          />

          {/* Marvel Unlimited Spotlight Border Glow */}
          {!showOverview && !isEditingPanels && activePanel && (
            <div
              className="absolute border-2 border-purple-400/95 rounded-md pointer-events-none transition-all duration-300 shadow-[0_0_35px_rgba(168,85,247,0.45)]"
              style={{
                left: `${activePanel.x * 100}%`,
                top: `${activePanel.y * 100}%`,
                width: `${activePanel.width * 100}%`,
                height: `${activePanel.height * 100}%`,
              }}
            />
          )}

          {/* Overview & Editor Overlay */}
          {(showOverview || isEditingPanels) && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]">
              {panels.map((p, idx) => (
                <div
                  key={p.id || idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    onPanelIndexChange(idx);
                    if (!isEditingPanels) setShowOverview(false);
                  }}
                  className={`absolute border-2 rounded transition-all flex flex-col items-center justify-center gap-1 ${
                    idx === panelIndex
                      ? 'border-purple-400 bg-purple-500/25 ring-2 ring-purple-400/50'
                      : 'border-white/60 bg-black/30 hover:bg-purple-500/15'
                  }`}
                  style={{
                    left: `${p.x * 100}%`,
                    top: `${p.y * 100}%`,
                    width: `${p.width * 100}%`,
                    height: `${p.height * 100}%`,
                  }}
                >
                  <span className="w-6 h-6 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center shadow-lg">
                    {idx + 1}
                  </span>

                  {isEditingPanels && (
                    <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-700 scale-90">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSplitHorizontal(idx); }}
                        className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white"
                        title="Split Horizontal"
                      >
                        <SplitSquareHorizontal className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSplitVertical(idx); }}
                        className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white"
                        title="Split Vertical"
                      >
                        <SplitSquareVertical className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeletePanel(idx); }}
                        className="p-1 hover:bg-rose-600 rounded text-slate-300 hover:text-white"
                        title="Delete Panel"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FLOATING ACTION TOOLBAR */}
      <div
        className="fixed bottom-20 right-6 z-30 flex flex-col items-end gap-2 pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          {/* Cinema Auto-Play */}
          <button
            onClick={onToggleAutoPlay}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold shadow-xl backdrop-blur-md transition-all ${
              autoPlay
                ? 'bg-emerald-600 border-emerald-400 text-white animate-pulse'
                : 'bg-slate-900/90 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Toggle Cinema Auto-Play"
          >
            {autoPlay ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{autoPlay ? 'Auto Playing' : 'Cinema Mode'}</span>
          </button>

          {/* Edit Panels */}
          <button
            onClick={() => {
              setIsEditingPanels(!isEditingPanels);
              setShowOverview(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold shadow-xl backdrop-blur-md transition-all ${
              isEditingPanels
                ? 'bg-amber-600 border-amber-400 text-white'
                : 'bg-slate-900/90 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Edit Panels"
          >
            {isEditingPanels ? <Check className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
            <span>{isEditingPanels ? 'Done' : 'Edit Panels'}</span>
          </button>

          {/* Overview */}
          <button
            onClick={() => {
              setShowOverview(!showOverview);
              setIsEditingPanels(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold shadow-xl backdrop-blur-md transition-all ${
              showOverview
                ? 'bg-purple-600 border-purple-400 text-white'
                : 'bg-slate-900/90 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Double-tap anywhere or click here to toggle Full Page Overview"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{showOverview ? 'Zoom Beat' : 'Overview'}</span>
          </button>
        </div>

        {/* Minimap Thumbnail */}
        <div
          className="w-24 aspect-[2/3] relative rounded-xl overflow-hidden bg-slate-900/90 border border-slate-700 shadow-2xl p-1 cursor-pointer hover:border-purple-500 transition-colors"
          onClick={() => setShowOverview(!showOverview)}
          title="Click to toggle overview"
        >
          <img
            src={page.url}
            alt="Minimap"
            className="w-full h-full object-cover rounded opacity-70"
          />
          {activePanel && (
            <div
              className="absolute border-2 border-purple-400 bg-purple-500/30 rounded-sm transition-all duration-300"
              style={{
                left: `${activePanel.x * 100}%`,
                top: `${activePanel.y * 100}%`,
                width: `${activePanel.width * 100}%`,
                height: `${activePanel.height * 100}%`,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { ComicPage } from '../../types/comic';
import { Loader2 } from 'lucide-react';

interface PageCanvasProps {
  page: ComicPage;
  activePanelIndex: number;
  isPanelMode: boolean;
  zoomLevel: number;
  onPanelClick?: (panelIndex: number) => void;
  onPageClick?: () => void;
  ambientMode?: boolean;
}

export const PageCanvas: React.FC<PageCanvasProps> = ({
  page,
  activePanelIndex,
  isPanelMode,
  zoomLevel,
  onPanelClick,
  onPageClick,
  ambientMode = true
}) => {
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const panels = page.panels || [];
  const currentPanel = panels[activePanelIndex] || { x: 0, y: 0, width: 1, height: 1 };

  useEffect(() => {
    setImageLoaded(false);
  }, [page.url]);

  // Calculate CSS Transform for Marvel Unlimited-style Smart Guided Panels
  const getPanelTransform = () => {
    if (!isPanelMode || panels.length === 0) {
      return {
        transform: `scale(${zoomLevel})`,
        transformOrigin: 'center center',
        transition: 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)'
      };
    }

    // Zoom factor to focus on this panel
    const scaleX = 1 / Math.max(currentPanel.width, 0.25);
    const scaleY = 1 / Math.max(currentPanel.height, 0.25);
    const targetScale = Math.min(scaleX, scaleY) * 0.92 * zoomLevel;

    // Center of target panel
    const originX = (currentPanel.x + currentPanel.width / 2) * 100;
    const originY = (currentPanel.y + currentPanel.height / 2) * 100;

    return {
      transform: `scale(${targetScale})`,
      transformOrigin: `${originX}% ${originY}%`,
      transition: 'transform 0.65s cubic-bezier(0.25, 1, 0.35, 1)'
    };
  };

  return (
    <div
      className="relative flex items-center justify-center min-h-full w-full p-2 sm:p-4 select-none overflow-hidden"
      onClick={onPageClick}
    >
      {/* Ambient Dynamic Backlight Glow */}
      {ambientMode && imageLoaded && (
        <div
          className="absolute inset-0 pointer-events-none opacity-30 blur-3xl scale-110 transition-opacity duration-700"
          style={{
            backgroundImage: `url(${page.url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
      )}

      {/* Main Comic Page Container with Reserved Aspect Area */}
      <div
        style={getPanelTransform()}
        className="relative max-w-full max-h-[90vh] shadow-2xl rounded-xl overflow-hidden transition-all flex items-center justify-center min-w-[280px] sm:min-w-[420px] min-h-[55vh] sm:min-h-[78vh] bg-slate-900/60 border border-slate-800/80"
      >
        {/* Loading Skeleton / Area-Scoped Spinner */}
        {!imageLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/70 z-10 space-y-3 p-6 text-center animate-pulse">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shadow-lg">
              <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
            </div>
            <p className="text-xs font-semibold text-slate-300">
              Loading Page {page.pageNumber}...
            </p>
          </div>
        )}

        <img
          src={page.url}
          alt={`Page ${page.pageNumber}`}
          onLoad={() => setImageLoaded(true)}
          className={`w-auto h-auto max-h-[90vh] max-w-full object-contain rounded-xl shadow-black/80 drop-shadow-2xl transition-opacity duration-300 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          draggable={false}
        />

        {/* Panel Click Overlays (When not in guided mode) */}
        {!isPanelMode &&
          imageLoaded &&
          panels.map((p, idx) => (
            <div
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                if (onPanelClick) onPanelClick(idx);
              }}
              style={{
                left: `${p.x * 100}%`,
                top: `${p.y * 100}%`,
                width: `${p.width * 100}%`,
                height: `${p.height * 100}%`
              }}
              className="absolute border border-blue-500/0 hover:border-blue-500/60 hover:bg-blue-500/10 cursor-pointer rounded transition-all group"
            >
              <span className="opacity-0 group-hover:opacity-100 bg-blue-600 text-white text-[9px] font-bold px-1 rounded absolute top-1 left-1">
                Panel {idx + 1}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
};

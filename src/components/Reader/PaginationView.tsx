import React, { useState, useEffect } from 'react';
import { ComicPage, ReadingDirection, DisplayFilter } from '../../types/comic';
import { Loader2 } from 'lucide-react';

interface PaginationViewProps {
  pages: ComicPage[];
  currentPage: number;
  isDoublePage: boolean;
  direction: ReadingDirection;
  coverOffset: boolean;
  filters: DisplayFilter;
  onNextPage: () => void;
  onPrevPage: () => void;
  onToggleHud: () => void;
}

export const PaginationView: React.FC<PaginationViewProps> = ({
  pages,
  currentPage,
  isDoublePage,
  direction,
  coverOffset,
  filters,
  onNextPage,
  onPrevPage,
  onToggleHud
}) => {
  const [loadedMap, setLoadedMap] = useState<Record<number, boolean>>({});

  // Background Image Preloader for page N+1, N+2, and N-1
  useEffect(() => {
    const indicesToPreload = [currentPage, currentPage + 1, currentPage - 2];
    indicesToPreload.forEach((idx) => {
      const page = pages[idx];
      if (page && page.url) {
        const img = new Image();
        img.src = page.url;
      }
    });
  }, [currentPage, pages]);

  // Compute pages to display (Single vs Double)
  let displayedPages: ComicPage[] = [];

  if (!isDoublePage) {
    // Single page
    const p = pages[currentPage - 1];
    if (p) displayedPages = [p];
  } else {
    // Double page logic with optional cover page offset
    if (coverOffset && currentPage === 1) {
      // Cover page shown individually
      const p = pages[0];
      if (p) displayedPages = [p];
    } else {
      // Find pair
      let firstIndex = currentPage - 1;
      // Adjust alignment
      if (coverOffset && firstIndex % 2 === 0) {
        firstIndex = Math.max(1, firstIndex - 1);
      } else if (!coverOffset && firstIndex % 2 !== 0) {
        firstIndex = firstIndex - 1;
      }

      const p1 = pages[firstIndex];
      const p2 = pages[firstIndex + 1];

      if (p1 && p2) {
        // For Manga (RTL), reverse the pair so right page is first in reading order
        displayedPages = direction === 'rtl' ? [p2, p1] : [p1, p2];
      } else if (p1) {
        displayedPages = [p1];
      }
    }
  }

  // Filter styles
  const filterStyle: React.CSSProperties = {
    filter: `brightness(${filters.brightness}%) contrast(${filters.contrast}%) sepia(${filters.sepia}%) ${
      filters.invert ? 'invert(1) hue-rotate(180deg)' : ''
    } ${filters.grayscale ? 'grayscale(1)' : ''}`,
    transition: 'filter 0.2s ease-out'
  };

  const handleImageLoad = (pageNumber: number) => {
    setLoadedMap((prev) => ({ ...prev, [pageNumber]: true }));
  };

  return (
    <div
      className="relative w-full h-full flex items-center justify-center select-none overflow-hidden"
      onClick={onToggleHud}
    >
      {/* Click zone - Left (Previous for LTR, Next for RTL) */}
      <div
        className="absolute top-0 bottom-0 left-0 w-1/4 z-20 cursor-w-resize"
        onClick={(e) => {
          e.stopPropagation();
          direction === 'ltr' ? onPrevPage() : onNextPage();
        }}
      />

      {/* Click zone - Right (Next for LTR, Previous for RTL) */}
      <div
        className="absolute top-0 bottom-0 right-0 w-1/4 z-20 cursor-e-resize"
        onClick={(e) => {
          e.stopPropagation();
          direction === 'ltr' ? onNextPage() : onPrevPage();
        }}
      />

      {/* Comic Page Images Container */}
      <div className="relative flex items-center justify-center max-w-full max-h-full p-2 md:p-6 gap-3">
        {displayedPages.map((page) => {
          const isLoaded = loadedMap[page.pageNumber];

          return (
            <div
              key={page.pageNumber}
              className="relative flex items-center justify-center max-w-full max-h-[95vh] min-w-[280px] sm:min-w-[400px] min-h-[55vh] sm:min-h-[78vh] shadow-2xl rounded-xl overflow-hidden bg-slate-900/60 border border-slate-800/80"
            >
              {/* Scoped Skeleton Loading State */}
              {!isLoaded && (
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
                style={filterStyle}
                onLoad={() => handleImageLoad(page.pageNumber)}
                className={`max-h-[92vh] max-w-full object-contain pointer-events-none rounded shadow-lg transition-opacity duration-300 ${
                  isLoaded ? 'opacity-100' : 'opacity-0'
                }`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

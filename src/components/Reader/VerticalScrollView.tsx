import React, { useEffect, useRef } from 'react';
import { ComicPage, DisplayFilter } from '../../types/comic';
import { Loader2 } from 'lucide-react';

interface VerticalScrollViewProps {
  pages: ComicPage[];
  currentPage: number;
  gap: number;
  filters: DisplayFilter;
  onPageVisible: (pageNumber: number) => void;
  onToggleHud: () => void;
}

export const VerticalScrollView: React.FC<VerticalScrollViewProps> = ({
  pages,
  currentPage,
  gap,
  filters,
  onPageVisible,
  onToggleHud
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Filter styles
  const filterStyle: React.CSSProperties = {
    filter: `brightness(${filters.brightness}%) contrast(${filters.contrast}%) sepia(${filters.sepia}%) ${
      filters.invert ? 'invert(1) hue-rotate(180deg)' : ''
    } ${filters.grayscale ? 'grayscale(1)' : ''}`,
    transition: 'filter 0.2s ease-out'
  };

  // Scroll to current page if changed from outside (e.g. slider)
  useEffect(() => {
    const el = pageRefs.current[currentPage];
    if (el && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      // Only scroll if outside visible window
      if (elRect.top < containerRect.top - 100 || elRect.bottom > containerRect.bottom + 100) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [currentPage]);

  // Observe page visibility to update current page indicator
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const pageNum = parseInt(entry.target.getAttribute('data-page') || '1', 10);
            if (pageNum) {
              onPageVisible(pageNum);
            }
          }
        }
      },
      {
        root: containerRef.current,
        threshold: 0.4
      }
    );

    Object.values(pageRefs.current).forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [pages]);

  return (
    <div
      ref={containerRef}
      onClick={onToggleHud}
      className="w-full h-full overflow-y-auto overflow-x-hidden select-none scrollbar-thin scrollbar-thumb-slate-700"
    >
      <div
        className="max-w-4xl mx-auto flex flex-col items-center py-6"
        style={{ gap: `${gap}px` }}
      >
        {pages.map((page) => (
          <div
            key={page.pageNumber}
            ref={(el) => { pageRefs.current[page.pageNumber] = el; }}
            data-page={page.pageNumber}
            className="relative w-full max-w-3xl flex items-center justify-center bg-slate-950/40 shadow-xl min-h-[400px]"
          >
            <img
              src={page.url}
              alt={`Page ${page.pageNumber}`}
              style={filterStyle}
              loading="lazy"
              className="w-full h-auto object-contain pointer-events-none"
            />
            {/* Page number badge */}
            <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-md text-[10px] text-slate-300 font-mono pointer-events-none">
              {page.pageNumber}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

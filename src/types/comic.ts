export type ComicSource = 'archive' | 'mangadex' | 'webtoons' | 'local' | 'scrape' | 'sample';

export type ReadingMode = 'single' | 'double' | 'vertical' | 'panel';

export type ReadingDirection = 'ltr' | 'rtl';

export interface PanelBox {
  id?: string;
  x: number;      // 0.0 to 1.0 (relative to image width)
  y: number;      // 0.0 to 1.0 (relative to image height)
  width: number;  // 0.0 to 1.0
  height: number; // 0.0 to 1.0
  order?: number;
}

export interface ComicPage {
  pageNumber: number;
  url: string;
  blob?: Blob;
  panels?: PanelBox[];
  width?: number;
  height?: number;
}

export interface Chapter {
  id: string;
  chapter: string;
  title: string;
  publishDate?: string;
  pages?: number;
  size?: string;
  fileName?: string;
  externalUrl?: string;
}

export interface Comic {
  id: string;
  source: ComicSource;
  title: string;
  description: string;
  cover: string;
  author: string;
  year?: string;
  status?: string;
  type?: string;
  tags?: string[];
  downloads?: number;
  chapters?: Chapter[];
  pages?: ComicPage[];
  webtoonUrl?: string;
}

export interface ReadingProgress {
  comicId: string;
  chapterId: string;
  comicTitle: string;
  chapterTitle: string;
  cover: string;
  source: ComicSource;
  pageNumber: number;
  totalPages: number;
  panelIndex?: number;
  updatedAt: number;
}

export interface Bookmark {
  id: string;
  comicId: string;
  chapterId: string;
  comicTitle: string;
  chapterTitle: string;
  cover: string;
  pageNumber: number;
  panelIndex?: number;
  thumbnailUrl?: string;
  note?: string;
  createdAt: number;
}

export interface DisplayFilter {
  brightness: number; // 50 to 150 (default 100)
  contrast: number;   // 50 to 150 (default 100)
  sepia: number;      // 0 to 100 (default 0)
  invert: boolean;    // dark mode inverted
  grayscale: boolean;
}

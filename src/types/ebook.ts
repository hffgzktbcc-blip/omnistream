export type EBookTheme = 'dark' | 'amoled' | 'sepia' | 'paper' | 'light' | 'emerald' | 'nord' | 'eink';
export type EBookFontFamily = 'serif' | 'sans' | 'mono' | 'merriweather' | 'georgia' | 'dyslexic';
export type EBookFontSize = 'sm' | 'base' | 'lg' | 'xl' | '2xl';
export type EBookLayoutMode = 'scroll' | 'paginated';

export interface EBookChapter {
  id: string;
  title: string;
  content: string;
  order: number;
  href?: string;
}

export interface EBookBookmark {
  id: string;
  bookId: string | number;
  chapterIndex: number;
  chapterTitle: string;
  excerpt: string;
  createdAt: number;
}

export interface EBook {
  id: string | number;
  title: string;
  author: string;
  cover?: string;
  description?: string;
  subjects?: string[];
  languages?: string[];
  downloadCount?: number;
  year?: string | number;
  rating?: number;
  chapters?: EBookChapter[];
  totalChapters?: number;
  currentChapter?: number;
  currentProgress?: number; // 0 to 100
  currentBlockIndex?: number;
  currentPageIndex?: number;
  lastReadTimestamp?: number;
  updatedAt?: number;
  isLocalUpload?: boolean;
  sourceUrl?: string;
  hasFullText?: boolean;
  oceanofpdfUrl?: string;
  annasArchiveUrl?: string;
  libgenUrl?: string;
  epubUrl?: string;
}

export type AmbientSoundType = 'off' | 'rain' | 'fireplace' | 'cafe' | 'forest' | 'whitenoise';

export interface EBookSettings {
  fontSize: number; // 14 to 32
  fontFamily: EBookFontFamily;
  lineHeight: number; // 1.4 to 2.2
  theme: EBookTheme;
  maxWidth: number; // 600 to 1100
  textAlign: 'left' | 'justify';
  layoutMode: EBookLayoutMode;
  bionicReading: boolean;
  speechRate: number; // 0.5 to 2.0
  ambientSound: AmbientSoundType;
  ambientVolume: number; // 0.0 to 1.0
  rsvpWpm: number; // 200 to 800
}

export interface AudiobookChapter {
  id: string;
  title: string;
  startTime: number; // in seconds
  endTime?: number;
  duration?: string;
  audioUrl?: string;
}

export interface AudiobookBookmark {
  id: string;
  timestamp: number;
  note?: string;
  createdAt: number;
}

export interface Audiobook {
  id: string;
  title: string;
  author: string;
  narrator?: string;
  duration?: string;
  durationSeconds?: number;
  cover?: string;
  youtubeId?: string;
  audioUrl?: string;
  description?: string;
  genre?: string;
  platform?: string; // 'graphicaudio' | 'audible' | 'bbcsounds' | 'archive' | 'spotify'
  isGraphicAudio?: boolean;
  isDramatized?: boolean;
  chapters?: AudiobookChapter[];
  bookmarks?: AudiobookBookmark[];
  currentProgress?: number; // 0 to 100
  lastPosition?: number; // seconds
  updatedAt?: number;
  isLocalUpload?: boolean;
}

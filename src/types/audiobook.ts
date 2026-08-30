export interface AudiobookChapter {
  id: string;
  title: string;
  startTime: number; // in seconds
  endTime?: number;
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
  chapters?: AudiobookChapter[];
  bookmarks?: AudiobookBookmark[];
  currentProgress?: number; // 0 to 100
  lastPosition?: number; // seconds
  updatedAt?: number;
  isLocalUpload?: boolean;
}

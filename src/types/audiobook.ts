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
  chapterIndex?: number;
  partIndex?: number;
}

export interface AudiobookSource {
  id: string;
  name: string;
  type: 'direct' | 'archive' | 'youtube' | 'local';
  audioUrl?: string;
  youtubeId?: string;
  duration?: string;
  durationSeconds?: number;
  chapters?: AudiobookChapter[];
  quality?: string;
}

export interface AudiobookPart {
  id: string;
  partNumber: number;
  title: string;
  duration?: string;
  durationSeconds?: number;
  audioUrl?: string;
  youtubeId?: string;
  chapters?: AudiobookChapter[];
}

export interface AudiobookListeningProgress {
  bookId: string;
  title: string;
  author: string;
  cover?: string;
  currentTime: number;
  duration: number;
  currentChapterIndex: number;
  currentPartIndex: number;
  lastPlayedAt: number;
  completed: boolean;
  percent: number;
}

export interface AudioTrack {
  index: number;
  name: string;
  path: string;
  length: number;
  sizeFormatted: string;
  streamUrl: string;
  downloadUrl: string;
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
  platform?: string; // 'audiobay' | 'graphicaudio' | 'audible' | 'bbcsounds' | 'archive' | 'spotify' | 'direct' | 'pixeldrain' | 'youtube'
  isGraphicAudio?: boolean;
  isDramatized?: boolean;
  chapters?: AudiobookChapter[];
  parts?: AudiobookPart[];
  sources?: AudiobookSource[];
  selectedSourceId?: string;
  bookmarks?: AudiobookBookmark[];
  currentProgress?: number; // 0 to 100
  lastPosition?: number; // seconds
  lastChapterIndex?: number;
  lastPartIndex?: number;
  updatedAt?: number;
  isLocalUpload?: boolean;
  // AudioBay & Swarm Fields
  rawTitle?: string;
  url?: string;
  infoHash?: string;
  magnet?: string;
  format?: string;
  bitrate?: string;
  size?: string;
  categories?: string[];
  trackers?: string[];
  tracks?: AudioTrack[];
}


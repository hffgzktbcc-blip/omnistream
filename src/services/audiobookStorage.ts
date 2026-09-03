import { Audiobook, AudiobookBookmark, AudiobookListeningProgress } from '../types/audiobook';

const PROGRESS_STORAGE_KEY = 'omnistream_audiobook_progress_v2';
const BOOKMARKS_STORAGE_KEY = 'omnistream_audiobook_bookmarks_v2';
const RECENT_BOOKS_KEY = 'omnistream_recent_audiobooks_v2';

export const audiobookStorage = {
  saveProgress(progress: AudiobookListeningProgress): void {
    try {
      const all = this.getAllProgress();
      all[progress.bookId] = {
        ...progress,
        lastPlayedAt: Date.now(),
        percent: progress.duration > 0 ? Math.min(100, Math.round((progress.currentTime / progress.duration) * 100)) : 0
      };
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(all));
    } catch (e) {
      console.warn('Failed to save audiobook progress:', e);
    }
  },

  getProgress(bookId: string): AudiobookListeningProgress | null {
    try {
      const all = this.getAllProgress();
      return all[bookId] || null;
    } catch {
      return null;
    }
  },

  getAllProgress(): Record<string, AudiobookListeningProgress> {
    try {
      const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  },

  getRecentHistory(): AudiobookListeningProgress[] {
    const all = this.getAllProgress();
    return Object.values(all).sort((a, b) => (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0));
  },

  saveBookmark(bookId: string, bookmark: AudiobookBookmark): AudiobookBookmark[] {
    try {
      const all = this.getAllBookmarks();
      const list = all[bookId] || [];
      const updated = [bookmark, ...list.filter((b) => b.id !== bookmark.id)];
      all[bookId] = updated;
      localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(all));
      return updated;
    } catch (e) {
      console.warn('Failed to save bookmark:', e);
      return [];
    }
  },

  getBookmarks(bookId: string): AudiobookBookmark[] {
    try {
      const all = this.getAllBookmarks();
      return all[bookId] || [];
    } catch {
      return [];
    }
  },

  deleteBookmark(bookId: string, bookmarkId: string): AudiobookBookmark[] {
    try {
      const all = this.getAllBookmarks();
      const list = all[bookId] || [];
      const updated = list.filter((b) => b.id !== bookmarkId);
      all[bookId] = updated;
      localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(all));
      return updated;
    } catch {
      return [];
    }
  },

  getAllBookmarks(): Record<string, AudiobookBookmark[]> {
    try {
      const raw = localStorage.getItem(BOOKMARKS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  },

  clearProgress(bookId: string): void {
    try {
      const all = this.getAllProgress();
      delete all[bookId];
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(all));
    } catch {}
  }
};

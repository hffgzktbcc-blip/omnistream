import { EBookBookmark } from '../types/ebook';

const BOOKMARKS_KEY = 'omnistream_ebook_bookmarks_v1';

export const bookmarkStorage = {
  getBookmarks(bookId: string | number): EBookBookmark[] {
    try {
      const raw = localStorage.getItem(BOOKMARKS_KEY);
      if (!raw) return [];
      const all: EBookBookmark[] = JSON.parse(raw);
      return all.filter((b) => String(b.bookId) === String(bookId));
    } catch {
      return [];
    }
  },

  getAllBookmarks(): EBookBookmark[] {
    try {
      const raw = localStorage.getItem(BOOKMARKS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  addBookmark(bookmark: Omit<EBookBookmark, 'id' | 'createdAt'>): EBookBookmark {
    const all = this.getAllBookmarks();
    const newBookmark: EBookBookmark = {
      ...bookmark,
      id: `bm_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      createdAt: Date.now()
    };
    const updated = [newBookmark, ...all];
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated));
    return newBookmark;
  },

  removeBookmark(id: string): void {
    const all = this.getAllBookmarks();
    const filtered = all.filter((b) => b.id !== id);
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(filtered));
  },

  isBookmarked(bookId: string | number, chapterIndex: number): boolean {
    const bookmarks = this.getBookmarks(bookId);
    return bookmarks.some((b) => b.chapterIndex === chapterIndex);
  }
};

import { ReadingProgress, Bookmark, Comic, ReadingMode, ReadingDirection, DisplayFilter } from '../types/comic';

const HISTORY_KEY = 'omni_comic_history';
const BOOKMARKS_KEY = 'omni_comic_bookmarks';
const FAVORITES_KEY = 'omni_comic_favorites';
const PREFS_KEY = 'omni_comic_preferences';

export interface UserPreferences {
  defaultMode: ReadingMode;
  defaultDirection: ReadingDirection;
  theme: 'dark' | 'amoled' | 'charcoal' | 'light';
  fitMode: 'height' | 'width' | 'contain' | 'original';
  webtoonGap: number; // in pixels (0, 8, 16)
  doublePageCoverOffset: boolean;
  filters: DisplayFilter;
}

const defaultPreferences: UserPreferences = {
  defaultMode: 'single',
  defaultDirection: 'ltr',
  theme: 'dark',
  fitMode: 'contain',
  webtoonGap: 0,
  doublePageCoverOffset: true,
  filters: {
    brightness: 100,
    contrast: 100,
    sepia: 0,
    invert: false,
    grayscale: false
  }
};

export const storage = {
  // Reading Progress History
  getProgress(): ReadingProgress[] {
    try {
      const data = localStorage.getItem(HISTORY_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveProgress(item: ReadingProgress): void {
    try {
      const history = this.getProgress().filter(h => !(h.comicId === item.comicId && h.chapterId === item.chapterId));
      history.unshift({ ...item, updatedAt: Date.now() });
      // Keep last 40 items
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 40)));
    } catch (e) {
      console.warn('Failed to save progress:', e);
    }
  },

  getComicProgress(comicId: string): ReadingProgress | undefined {
    return this.getProgress().find(h => h.comicId === comicId);
  },

  // Bookmarks
  getBookmarks(): Bookmark[] {
    try {
      const data = localStorage.getItem(BOOKMARKS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  addBookmark(bookmark: Omit<Bookmark, 'id' | 'createdAt'>): Bookmark {
    const list = this.getBookmarks();
    const newBookmark: Bookmark = {
      ...bookmark,
      id: `bm_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      createdAt: Date.now()
    };
    list.unshift(newBookmark);
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(list));
    return newBookmark;
  },

  removeBookmark(id: string): void {
    const list = this.getBookmarks().filter(b => b.id !== id);
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(list));
  },

  // Favorites
  getFavorites(): Comic[] {
    try {
      const data = localStorage.getItem(FAVORITES_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  toggleFavorite(comic: Comic): boolean {
    const favorites = this.getFavorites();
    const index = favorites.findIndex(f => f.id === comic.id && f.source === comic.source);
    if (index >= 0) {
      favorites.splice(index, 1);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
      return false;
    } else {
      favorites.unshift(comic);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
      return true;
    }
  },

  isFavorite(comicId: string): boolean {
    return this.getFavorites().some(f => f.id === comicId);
  },

  // Custom Uploaded Comics
  getCustomComics(): Comic[] {
    try {
      const data = localStorage.getItem('omni_custom_comics');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveCustomComic(comic: Comic): void {
    try {
      const list = this.getCustomComics().filter(c => c.id !== comic.id);
      // Strip base64 heavy blobs from local storage object metadata, keep first page as thumbnail
      const lightweightComic: Comic = {
        ...comic,
        pages: undefined
      };
      list.unshift(lightweightComic);
      localStorage.setItem('omni_custom_comics', JSON.stringify(list.slice(0, 50)));
    } catch (e) {
      console.warn('Failed to save custom comic:', e);
    }
  },

  // Preferences
  getPreferences(): UserPreferences {
    try {
      const data = localStorage.getItem(PREFS_KEY);
      return data ? { ...defaultPreferences, ...JSON.parse(data) } : defaultPreferences;
    } catch {
      return defaultPreferences;
    }
  },

  savePreferences(prefs: Partial<UserPreferences>): UserPreferences {
    const current = this.getPreferences();
    const updated = { ...current, ...prefs };
    localStorage.setItem(PREFS_KEY, JSON.stringify(updated));
    return updated;
  }
};

import { EBook, EBookSettings } from '../types/ebook';
import { api } from './api';

const EBOOKS_META_KEY = 'omnistream_ebooks_meta_v2';
const EBOOKS_SETTINGS_KEY = 'omnistream_ebooks_settings';
const DB_NAME = 'OmniStream_EBooks_DB';
const DB_VERSION = 2;
const STORE_META = 'books_meta';
const STORE_CONTENT = 'books_content';

export const DEFAULT_EBOOK_SETTINGS: EBookSettings = {
  fontSize: 18,
  fontFamily: 'serif',
  lineHeight: 1.75,
  theme: 'dark',
  maxWidth: 760,
  textAlign: 'left',
  layoutMode: 'scroll',
  bionicReading: false,
  speechRate: 1.0,
  ambientSound: 'off',
  ambientVolume: 0.35,
  rsvpWpm: 350
};

// Open or Upgrade IndexedDB
function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported in this environment'));
    }

    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e: any) => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_CONTENT)) {
        db.createObjectStore(STORE_CONTENT, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// In-Memory Fast Cache
let _memoryLibrary: EBook[] = [];
const _contentCache = new Map<string, EBook>();
let _isInitialized = false;

// Bootstrap initial synchronous metadata from localStorage
try {
  const cached = localStorage.getItem(EBOOKS_META_KEY);
  if (cached) {
    _memoryLibrary = JSON.parse(cached);
  }
} catch {
  _memoryLibrary = [];
}

// Create a lightweight metadata record without massive chapter HTML
function createLightweightMeta(book: EBook): EBook {
  return {
    id: book.id,
    title: book.title,
    author: book.author || 'Unknown Author',
    cover: book.cover,
    description: book.description ? book.description.slice(0, 300) : '',
    year: book.year,
    rating: book.rating,
    downloadCount: book.downloadCount,
    subjects: book.subjects || [],
    languages: book.languages || ['en'],
    totalChapters: book.chapters?.length || book.totalChapters || 1,
    currentChapter: book.currentChapter || 1,
    currentProgress: book.currentProgress || 0,
    isLocalUpload: book.isLocalUpload ?? true,
    hasFullText: true,
    sourceUrl: book.sourceUrl,
    epubUrl: book.epubUrl,
    updatedAt: book.updatedAt || Date.now()
  };
}

export const ebookStorage = {
  /**
   * Synchronous getter for instant React rendering without lag
   */
  getLibrary(): EBook[] {
    return _memoryLibrary;
  },

  /**
   * Asynchronous full library initializer:
   * Merges IndexedDB storage + Server permanent disk backup + localStorage
   */
  async init(): Promise<EBook[]> {
    try {
      const db = await openIndexedDB();
      const idbMetaList: EBook[] = await new Promise((resolve) => {
        const tx = db.transaction(STORE_META, 'readonly');
        const store = tx.objectStore(STORE_META);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });

      // Fetch persistent local library from backend server disk
      const serverBooks = await api.getSavedServerLibrary();

      // Merge IDB, Server, and Memory lists
      const map = new Map<string, EBook>();

      // 1. Initial memory/localStorage
      _memoryLibrary.forEach((b) => map.set(String(b.id), b));

      // 2. IndexedDB stored books (authoritative client store)
      idbMetaList.forEach((b) => map.set(String(b.id), { ...map.get(String(b.id)), ...b }));

      // 3. Server-side disk saved books (permanent backup)
      serverBooks.forEach((b) => map.set(String(b.id), { ...map.get(String(b.id)), ...b }));

      _memoryLibrary = Array.from(map.values()).sort(
        (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)
      );

      // Save lightweight metadata back to localStorage for next quick launch
      try {
        localStorage.setItem(EBOOKS_META_KEY, JSON.stringify(_memoryLibrary.slice(0, 100)));
      } catch (e) {
        console.warn('Metadata localStorage cache limit reached');
      }

      _isInitialized = true;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('omnistream_ebooks_changed'));
      }

      return _memoryLibrary;
    } catch (err) {
      console.warn('IndexedDB init fallback:', err);
      return _memoryLibrary;
    }
  },

  /**
   * Save a complete book into IndexedDB, memory, localStorage metadata, and Server Disk
   */
  async saveBook(book: EBook): Promise<void> {
    const bookIdStr = String(book.id);
    const meta = createLightweightMeta(book);

    // 1. Cache full content in memory
    _contentCache.set(bookIdStr, book);

    // 2. Update memory library list
    const existingIdx = _memoryLibrary.findIndex((b) => String(b.id) === bookIdStr);
    if (existingIdx >= 0) {
      _memoryLibrary[existingIdx] = { ..._memoryLibrary[existingIdx], ...meta, updatedAt: Date.now() };
    } else {
      _memoryLibrary.unshift({ ...meta, updatedAt: Date.now() });
    }

    // 3. Save lightweight meta to localStorage (NEVER exceeds quota)
    try {
      localStorage.setItem(EBOOKS_META_KEY, JSON.stringify(_memoryLibrary.slice(0, 100)));
    } catch (e) {
      console.warn('localStorage metadata update warning:', e);
    }

    // 4. Save full book & chapters into IndexedDB (Gigabyte quota)
    try {
      const db = await openIndexedDB();
      const tx = db.transaction([STORE_META, STORE_CONTENT], 'readwrite');
      tx.objectStore(STORE_META).put(meta);
      tx.objectStore(STORE_CONTENT).put({
        id: book.id,
        chapters: book.chapters || [],
        fullBook: book,
        updatedAt: Date.now()
      });
    } catch (err) {
      console.warn('IndexedDB full book write error:', err);
    }

    // 5. Asynchronously persist to server disk backup
    api.persistEBookToServer(book).catch(() => {});

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('omnistream_ebooks_changed'));
    }
  },

  /**
   * Load full book with all chapters from Memory -> IndexedDB -> Server Disk
   */
  async getBook(id: string | number): Promise<EBook | null> {
    const bookIdStr = String(id);

    // 1. Check in-memory cache
    const mem = _contentCache.get(bookIdStr);
    if (mem && mem.chapters && mem.chapters.length > 0) {
      return mem;
    }

    // 2. Check IndexedDB content store
    try {
      const db = await openIndexedDB();
      const idbRecord: any = await new Promise((resolve) => {
        const tx = db.transaction(STORE_CONTENT, 'readonly');
        const store = tx.objectStore(STORE_CONTENT);
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      });

      if (idbRecord && idbRecord.chapters && idbRecord.chapters.length > 0) {
        const full = idbRecord.fullBook || {
          ...this.getMetaById(id),
          chapters: idbRecord.chapters,
          totalChapters: idbRecord.chapters.length
        };
        _contentCache.set(bookIdStr, full);
        return full;
      }
    } catch (err) {
      console.warn('IndexedDB getBook error:', err);
    }

    // 3. Check Server disk backup
    try {
      const serverBook = await api.getSavedServerContent(id);
      if (serverBook && serverBook.chapters && serverBook.chapters.length > 0) {
        _contentCache.set(bookIdStr, serverBook);
        return serverBook;
      }
    } catch (err) {
      console.warn('Server saved book fetch error:', err);
    }

    // 4. Return metadata if available
    const meta = this.getMetaById(id);
    return meta || null;
  },

  getMetaById(id: string | number): EBook | undefined {
    return _memoryLibrary.find((b) => String(b.id) === String(id));
  },

  /**
   * Update reading progress for a book (including exact chapter, paragraph block, and page index)
   */
  updateProgress(
    bookId: string | number,
    currentChapter: number,
    totalChapters: number,
    currentBlockIndex?: number,
    currentPageIndex?: number
  ): void {
    const bookIdStr = String(bookId);
    const book = _memoryLibrary.find((b) => String(b.id) === bookIdStr);
    if (book) {
      book.currentChapter = currentChapter;
      book.totalChapters = totalChapters;
      book.currentProgress = Math.min(100, Math.round((currentChapter / (totalChapters || 1)) * 100));
      if (currentBlockIndex !== undefined) book.currentBlockIndex = currentBlockIndex;
      if (currentPageIndex !== undefined) book.currentPageIndex = currentPageIndex;
      book.lastReadTimestamp = Date.now();
      book.updatedAt = Date.now();

      try {
        localStorage.setItem(EBOOKS_META_KEY, JSON.stringify(_memoryLibrary.slice(0, 100)));
      } catch {}

      openIndexedDB()
        .then((db) => {
          const tx = db.transaction(STORE_META, 'readwrite');
          tx.objectStore(STORE_META).put(book);
        })
        .catch(() => {});

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('omnistream_ebooks_changed'));
      }
    }
  },

  /**
   * Retrieve the most recently read book to resume immediately
   */
  getLastReadBook(): EBook | null {
    if (_memoryLibrary.length === 0) return null;
    const sorted = [..._memoryLibrary].sort(
      (a, b) => (b.lastReadTimestamp || b.updatedAt || 0) - (a.lastReadTimestamp || a.updatedAt || 0)
    );
    return sorted[0] || null;
  },

  /**
   * Remove a book completely from memory, localStorage, IndexedDB, and server storage
   */
  async removeBook(id: string | number): Promise<void> {
    const bookIdStr = String(id);
    _contentCache.delete(bookIdStr);
    _memoryLibrary = _memoryLibrary.filter((b) => String(b.id) !== bookIdStr);

    try {
      localStorage.setItem(EBOOKS_META_KEY, JSON.stringify(_memoryLibrary.slice(0, 100)));
    } catch {}

    try {
      const db = await openIndexedDB();
      const tx = db.transaction([STORE_META, STORE_CONTENT], 'readwrite');
      tx.objectStore(STORE_META).delete(id);
      tx.objectStore(STORE_CONTENT).delete(id);
    } catch (err) {
      console.warn('IndexedDB delete error:', err);
    }

    api.deleteSavedServerBook(id).catch(() => {});

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('omnistream_ebooks_changed'));
    }
  },

  getSettings(): EBookSettings {
    try {
      const data = localStorage.getItem(EBOOKS_SETTINGS_KEY);
      return data ? { ...DEFAULT_EBOOK_SETTINGS, ...JSON.parse(data) } : DEFAULT_EBOOK_SETTINGS;
    } catch {
      return DEFAULT_EBOOK_SETTINGS;
    }
  },

  saveSettings(settings: Partial<EBookSettings>): EBookSettings {
    try {
      const current = this.getSettings();
      const updated = { ...current, ...settings };
      localStorage.setItem(EBOOKS_SETTINGS_KEY, JSON.stringify(updated));
      return updated;
    } catch {
      return DEFAULT_EBOOK_SETTINGS;
    }
  }
};

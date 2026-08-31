// Mihon / Tachiyomi Offline Chapter & Storage Engine
// Uses native IndexedDB to store downloaded manga/comic chapters for 100% offline reading

import { Comic, Chapter, ComicPage } from '../types/comic';

const DB_NAME = 'omnistream_offline_manga_db';
const DB_VERSION = 1;
const STORE_CHAPTERS = 'offline_chapters';
const STORE_COMICS = 'offline_comics';

export interface OfflineChapterData {
  chapterId: string;
  comicId: string;
  comicTitle: string;
  chapterTitle: string;
  chapterNumber: string;
  source: string;
  cover: string;
  downloadedAt: number;
  totalPages: number;
  pages: Array<{ pageNumber: number; blob: Blob; mimeType: string }>;
}

export interface OfflineComicSummary {
  comicId: string;
  title: string;
  author?: string;
  cover: string;
  source: string;
  type?: string;
  downloadedChaptersCount: number;
  lastUpdated: number;
}

class OfflineStorageEngine {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB is not supported in this environment.'));
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_CHAPTERS)) {
          const chStore = db.createObjectStore(STORE_CHAPTERS, { keyPath: 'chapterId' });
          chStore.createIndex('comicId', 'comicId', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_COMICS)) {
          db.createObjectStore(STORE_COMICS, { keyPath: 'comicId' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  /**
   * Download all pages of a chapter and save to IndexedDB
   */
  async downloadChapter(
    comic: Comic,
    chapter: Chapter,
    pages: ComicPage[],
    onProgress?: (downloaded: number, total: number) => void
  ): Promise<void> {
    const db = await this.getDB();
    const storedPages: Array<{ pageNumber: number; blob: Blob; mimeType: string }> = [];

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      try {
        const res = await fetch(page.url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        storedPages.push({
          pageNumber: page.pageNumber,
          blob,
          mimeType: blob.type || 'image/jpeg'
        });
      } catch (err) {
        console.warn(`Failed to fetch page ${page.pageNumber}:`, err);
      }
      if (onProgress) {
        onProgress(i + 1, pages.length);
      }
    }

    if (storedPages.length === 0) {
      throw new Error('Could not download any page images for this chapter.');
    }

    const chapterRecord: OfflineChapterData = {
      chapterId: chapter.id,
      comicId: comic.id,
      comicTitle: comic.title,
      chapterTitle: chapter.title || `Chapter ${chapter.chapter}`,
      chapterNumber: chapter.chapter,
      source: comic.source,
      cover: comic.cover,
      downloadedAt: Date.now(),
      totalPages: storedPages.length,
      pages: storedPages
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_CHAPTERS, STORE_COMICS], 'readwrite');
      const chStore = tx.objectStore(STORE_CHAPTERS);
      const cmStore = tx.objectStore(STORE_COMICS);

      chStore.put(chapterRecord);

      // Update Comic Summary
      const cmGet = cmStore.get(comic.id);
      cmGet.onsuccess = () => {
        const existing: OfflineComicSummary = cmGet.result || {
          comicId: comic.id,
          title: comic.title,
          author: comic.author,
          cover: comic.cover,
          source: comic.source,
          type: comic.type,
          downloadedChaptersCount: 0,
          lastUpdated: Date.now()
        };
        existing.downloadedChaptersCount = (existing.downloadedChaptersCount || 0) + 1;
        existing.lastUpdated = Date.now();
        cmStore.put(existing);
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Check if a chapter is downloaded
   */
  async isChapterDownloaded(chapterId: string): Promise<boolean> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_CHAPTERS, 'readonly');
        const req = tx.objectStore(STORE_CHAPTERS).get(chapterId);
        req.onsuccess = () => resolve(Boolean(req.result));
        req.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  }

  /**
   * Get parsed offline pages as memory blob URLs for the reader
   */
  async getOfflineChapterPages(chapterId: string): Promise<ComicPage[] | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_CHAPTERS, 'readonly');
        const req = tx.objectStore(STORE_CHAPTERS).get(chapterId);
        req.onsuccess = () => {
          const data: OfflineChapterData = req.result;
          if (!data || !data.pages || data.pages.length === 0) {
            resolve(null);
            return;
          }
          const pages: ComicPage[] = data.pages.map((p) => ({
            pageNumber: p.pageNumber,
            url: URL.createObjectURL(p.blob)
          }));
          resolve(pages);
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  /**
   * Delete a downloaded chapter
   */
  async deleteChapter(comicId: string, chapterId: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_CHAPTERS, STORE_COMICS], 'readwrite');
      tx.objectStore(STORE_CHAPTERS).delete(chapterId);

      const cmStore = tx.objectStore(STORE_COMICS);
      const cmGet = cmStore.get(comicId);
      cmGet.onsuccess = () => {
        const existing: OfflineComicSummary = cmGet.result;
        if (existing) {
          existing.downloadedChaptersCount = Math.max(0, existing.downloadedChaptersCount - 1);
          if (existing.downloadedChaptersCount === 0) {
            cmStore.delete(comicId);
          } else {
            cmStore.put(existing);
          }
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Get all downloaded comics summary for the Library tab
   */
  async getAllDownloadedComics(): Promise<OfflineComicSummary[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_COMICS, 'readonly');
        const req = tx.objectStore(STORE_COMICS).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  /**
   * Get all downloaded chapters for a specific comic
   */
  async getDownloadedChaptersForComic(comicId: string): Promise<OfflineChapterData[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_CHAPTERS, 'readonly');
        const index = tx.objectStore(STORE_CHAPTERS).index('comicId');
        const req = index.getAll(comicId);
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }
}

export const offlineStorage = new OfflineStorageEngine();

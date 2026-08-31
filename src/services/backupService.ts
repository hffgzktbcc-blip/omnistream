// Tachimanga & Tachiyomi Backup & Restore Service
// Supports exporting and importing .json / .tachibk style backup archives

import { storage } from './storage';
import { offlineStorage } from './offlineStorage';
import { extensionManager } from './extensionManager';

export interface TachiyomiBackupData {
  version: number;
  appName: string;
  exportedAt: number;
  history: any[];
  favorites: any[];
  bookmarks: any[];
  preferences: any;
  extensions: any[];
}

class BackupService {
  /**
   * Export complete library and progress as a downloadable JSON backup
   */
  exportBackup(): void {
    const backup: TachiyomiBackupData = {
      version: 2,
      appName: 'OmniStream (Tachimanga / Tachiyomi compatible)',
      exportedAt: Date.now(),
      history: storage.getProgress(),
      favorites: storage.getFavorites(),
      bookmarks: storage.getBookmarks(),
      preferences: storage.getPreferences(),
      extensions: extensionManager.getExtensions()
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `omnistream_tachimanga_backup_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Import and merge a JSON / Tachiyomi / Tachimanga backup file
   */
  async importBackup(file: File): Promise<{ success: boolean; itemsRestored: number; message: string }> {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      let itemsRestored = 0;

      // Restore History
      if (Array.isArray(data.history)) {
        data.history.forEach((h: any) => {
          if (h.comicId) {
            storage.saveProgress(h);
            itemsRestored++;
          }
        });
      }

      // Restore Favorites
      if (Array.isArray(data.favorites)) {
        data.favorites.forEach((fav: any) => {
          if (fav.id && !storage.isFavorite(fav.id)) {
            storage.toggleFavorite(fav);
            itemsRestored++;
          }
        });
      }

      // Restore Bookmarks
      if (Array.isArray(data.bookmarks)) {
        data.bookmarks.forEach((bm: any) => {
          storage.addBookmark(bm);
          itemsRestored++;
        });
      }

      // Restore Preferences
      if (data.preferences) {
        storage.savePreferences(data.preferences);
      }

      return {
        success: true,
        itemsRestored,
        message: `Successfully restored ${itemsRestored} items from backup!`
      };
    } catch (err: any) {
      console.error('Backup import error:', err);
      return {
        success: false,
        itemsRestored: 0,
        message: `Failed to import backup: ${err.message || 'Invalid backup file'}`
      };
    }
  }
}

export const backupService = new BackupService();

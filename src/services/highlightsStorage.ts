export interface EBookHighlight {
  id: string;
  bookId: string | number;
  chapterIndex: number;
  text: string;
  note?: string;
  color: 'yellow' | 'emerald' | 'sky' | 'purple' | 'rose';
  createdAt: number;
}

const STORAGE_KEY = 'omnistream_ebook_highlights';

export const highlightsStorage = {
  getHighlights(bookId: string | number): EBookHighlight[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      const all: EBookHighlight[] = JSON.parse(data);
      return all.filter((h) => String(h.bookId) === String(bookId));
    } catch {
      return [];
    }
  },

  addHighlight(highlight: Omit<EBookHighlight, 'id' | 'createdAt'>): EBookHighlight {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      const all: EBookHighlight[] = data ? JSON.parse(data) : [];
      const newHighlight: EBookHighlight = {
        ...highlight,
        id: `hl_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        createdAt: Date.now()
      };
      all.push(newHighlight);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      return newHighlight;
    } catch {
      return {
        ...highlight,
        id: `hl_${Date.now()}`,
        createdAt: Date.now()
      };
    }
  },

  updateHighlight(id: string, updates: Partial<EBookHighlight>): void {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return;
      const all: EBookHighlight[] = JSON.parse(data);
      const updated = all.map((h) => (h.id === id ? { ...h, ...updates } : h));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to update highlight:', e);
    }
  },

  removeHighlight(id: string): void {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return;
      const all: EBookHighlight[] = JSON.parse(data);
      const updated = all.filter((h) => h.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to remove highlight:', e);
    }
  }
};

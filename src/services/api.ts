import { Comic, ComicPage, Chapter } from '../types/comic';
import { Anime, AnimeEpisode, AnimeScheduleItem, AnimeStudio } from '../types/anime';
import { MediaItem } from '../types/media';
import { EBook } from '../types/ebook';
import { Audiobook } from '../types/audiobook';
import { SportsMatch } from '../types/sports';

const BASE_URL = '/api';

export const api = {
  // 1. COMICS API
  async getPopularComics(category: string = 'all'): Promise<Comic[]> {
    try {
      const res = await fetch(`${BASE_URL}/comics/popular?category=${category}`);
      if (!res.ok) throw new Error('Failed to fetch popular comics');
      return await res.json();
    } catch (err) {
      console.warn('API getPopularComics error, falling back to sample:', err);
      const sample = await this.getSampleComic();
      return [sample];
    }
  },

  async searchComics(query: string, source: string = 'all'): Promise<Comic[]> {
    try {
      const res = await fetch(`${BASE_URL}/comics/search?q=${encodeURIComponent(query)}&source=${source}`);
      if (!res.ok) throw new Error('Search request failed');
      return await res.json();
    } catch (err) {
      console.error('API searchComics error:', err);
      return [];
    }
  },

  async getComicDetails(source: string, id: string): Promise<Comic> {
    try {
      const res = await fetch(`${BASE_URL}/comics/details/${source}/${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error('Failed to fetch comic details');
      return await res.json();
    } catch (err) {
      console.error('API getComicDetails error:', err);
      throw err;
    }
  },

  async getChapterPages(
    sourceOrChapterId: string,
    chapterIdOrOptions?: string | { signal?: AbortSignal },
    options?: { signal?: AbortSignal }
  ): Promise<ComicPage[]> {
    let source = 'mangadex';
    let chapterId = sourceOrChapterId;
    let signal: AbortSignal | undefined;

    if (typeof chapterIdOrOptions === 'string') {
      source = sourceOrChapterId;
      chapterId = chapterIdOrOptions;
      signal = options?.signal;
    } else {
      signal = (chapterIdOrOptions as any)?.signal;
      if (chapterId.startsWith('wt__')) {
        source = 'webtoons';
      } else if (chapterId.startsWith('sample_')) {
        source = 'sample';
      } else if (chapterId.includes('__file__') || chapterId.includes('__bookreader')) {
        source = 'archive';
      }
    }

    try {
      const res = await fetch(`${BASE_URL}/comics/chapter/${encodeURIComponent(source)}/${encodeURIComponent(chapterId)}`, {
        signal
      });
      if (!res.ok) throw new Error('Failed to load chapter pages');
      const data = await res.json();
      if (Array.isArray(data)) return data;
      if (Array.isArray(data.pages)) return data.pages;
      return [];
    } catch (err) {
      console.error('API getChapterPages error:', err);
      throw err;
    }
  },

  async scrapeComicUrl(url: string, signal?: AbortSignal): Promise<{ title: string; total: number; pages: ComicPage[] }> {
    try {
      const res = await fetch(`${BASE_URL}/comics/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        signal
      });
      if (!res.ok) throw new Error('Failed to scrape URL');
      return await res.json();
    } catch (err) {
      console.error('API scrapeComicUrl error:', err);
      throw err;
    }
  },

  async getSampleComic(): Promise<Comic> {
    try {
      const res = await fetch(`${BASE_URL}/comics/sample`);
      if (!res.ok) throw new Error('Sample fetch failed');
      return await res.json();
    } catch (err) {
      return {
        id: 'sample_cyber_horizon',
        source: 'sample',
        title: 'Cyber Horizon: Origins #1',
        description: 'A cyberpunk thriller following a rogue AI detective navigating neo-Tokyo megastructures.',
        cover: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=600&auto=format&fit=crop',
        author: 'Studio Neo',
        year: '2026',
        type: 'Western Comic',
        status: 'Complete',
        chapters: [{ id: 'sample_issue_1', chapter: '1', title: 'Issue #1: The Awakening', pages: 4 }],
        pages: [
          {
            pageNumber: 1,
            url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1600&auto=format&fit=crop',
            panels: [{ x: 0, y: 0, width: 1, height: 1 }]
          },
          {
            pageNumber: 2,
            url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1600&auto=format&fit=crop',
            panels: [
              { x: 0.05, y: 0.05, width: 0.9, height: 0.28 },
              { x: 0.05, y: 0.36, width: 0.43, height: 0.28 },
              { x: 0.52, y: 0.36, width: 0.43, height: 0.28 },
              { x: 0.05, y: 0.67, width: 0.9, height: 0.28 }
            ]
          },
          {
            pageNumber: 3,
            url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1600&auto=format&fit=crop',
            panels: [
              { x: 0.05, y: 0.05, width: 0.43, height: 0.42 },
              { x: 0.52, y: 0.05, width: 0.43, height: 0.42 },
              { x: 0.05, y: 0.52, width: 0.9, height: 0.43 }
            ]
          },
          {
            pageNumber: 4,
            url: 'https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=1600&auto=format&fit=crop',
            panels: [
              { x: 0.05, y: 0.05, width: 0.9, height: 0.43 },
              { x: 0.05, y: 0.52, width: 0.43, height: 0.43 },
              { x: 0.52, y: 0.52, width: 0.43, height: 0.43 }
            ]
          }
        ]
      };
    }
  },

  // 2. ANIME API
  async getTrendingAnime(category: string = 'trending'): Promise<Anime[]> {
    try {
      const res = await fetch(`${BASE_URL}/anime/trending?category=${category}`);
      if (!res.ok) throw new Error('Failed to fetch anime');
      return await res.json();
    } catch (err) {
      console.error('Anime trending fetch error:', err);
      return [];
    }
  },

  async searchAnime(query: string): Promise<Anime[]> {
    try {
      const res = await fetch(`${BASE_URL}/anime/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error('Anime search failed');
      return await res.json();
    } catch (err) {
      console.error('Anime search error:', err);
      return [];
    }
  },

  async getAnimeEpisodes(title: string, id?: number, totalEpisodes: number = 12): Promise<AnimeEpisode[]> {
    try {
      const params = new URLSearchParams({
        title,
        totalEpisodes: String(totalEpisodes)
      });
      if (id) params.append('id', String(id));

      const res = await fetch(`${BASE_URL}/anime/episodes?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch anime episodes');
      return await res.json();
    } catch (err) {
      console.warn('Episodes fetch error, using fallback:', err);
      return Array.from({ length: totalEpisodes }, (_, i) => ({
        number: i + 1,
        title: `Episode ${i + 1}`,
        description: `Episode ${i + 1} of ${title}.`,
        isFiller: false
      }));
    }
  },

  async getAnimeSchedule(): Promise<AnimeScheduleItem[]> {
    try {
      const res = await fetch(`${BASE_URL}/anime/schedule`);
      if (!res.ok) throw new Error('Failed to fetch simulcast schedule');
      return await res.json();
    } catch (err) {
      console.error('Anime schedule fetch error:', err);
      return [];
    }
  },

  async getAnimeStudios(): Promise<AnimeStudio[]> {
    try {
      const res = await fetch(`${BASE_URL}/anime/studios`);
      if (!res.ok) throw new Error('Failed to fetch anime studios');
      return await res.json();
    } catch (err) {
      console.error('Anime studios error:', err);
      return [];
    }
  },

  // -------------------------------------------------------------
  // ANTIGRAVITY IN-APP DEVELOPER & CLI ENGINE
  // -------------------------------------------------------------
  async getAntigravityStatus(): Promise<any> {
    try {
      const res = await fetch(`${BASE_URL}/antigravity/status`);
      if (!res.ok) throw new Error('Antigravity status failed');
      return await res.json();
    } catch (err) {
      console.warn('Antigravity status error:', err);
      return null;
    }
  },

  async execAntigravityCommand(command: string, context?: any): Promise<{ command: string; output: string }> {
    try {
      const res = await fetch(`${BASE_URL}/antigravity/exec`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, context })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Command failed');
      return data;
    } catch (err: any) {
      return {
        command,
        output: `❌ Command Error: ${err.message || 'Execution failed'}`
      };
    }
  },

  async sendAntigravityPrompt(prompt: string, context?: any): Promise<{ success: boolean; response: string }> {
    try {
      const res = await fetch(`${BASE_URL}/antigravity/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, context })
      });
      return await res.json();
    } catch (err: any) {
      return {
        success: false,
        response: `⚠️ Failed to queue prompt: ${err.message}`
      };
    }
  },

  async sendAntigravityChatMessage(
    message: string,
    context?: any,
    history?: any[]
  ): Promise<{ success: boolean; response: string; thoughts?: string; actionResult?: any }> {
    try {
      const res = await fetch(`${BASE_URL}/antigravity/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, context, history })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to get response');
      return data;
    } catch (err: any) {
      return {
        success: false,
        response: `⚠️ Antigravity connection error: ${err.message}`
      };
    }
  },

  // 3. MOVIES & TV API
  async getTrendingMedia(category: string = 'trending'): Promise<MediaItem[]> {
    try {
      const res = await fetch(`${BASE_URL}/media/trending?category=${category}`);
      if (!res.ok) throw new Error('Failed to fetch media');
      return await res.json();
    } catch (err) {
      console.error('Media trending fetch error:', err);
      return [];
    }
  },

  async searchMedia(query: string): Promise<MediaItem[]> {
    try {
      const res = await fetch(`${BASE_URL}/media/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error('Media search failed');
      return await res.json();
    } catch (err) {
      console.error('Media search error:', err);
      return [];
    }
  },

  // 4. E-BOOKS API
  async importOceanofpdfBook(url: string, title?: string, author?: string): Promise<EBook | null> {
    try {
      const res = await fetch(`${BASE_URL}/ebooks/oceanofpdf-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, title, author })
      });
      const data = await res.json();
      if (data?.success && data?.book) {
        return data.book;
      }
      return null;
    } catch (e) {
      console.error('OceanofPDF import error:', e);
      return null;
    }
  },

  async autoFetchEBook(book: Partial<EBook>): Promise<EBook | null> {
    try {
      const res = await fetch(`${BASE_URL}/ebooks/auto-fetch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: book.id,
          title: book.title,
          author: book.author
        })
      });
      const data = await res.json();
      if (data?.success && data?.book) {
        return data.book;
      }
      return null;
    } catch (e) {
      console.error('Auto fetch ebook error:', e);
      return null;
    }
  },

  async getPopularEBooks(category: string = 'popular'): Promise<EBook[]> {
    try {
      const res = await fetch(`${BASE_URL}/ebooks/popular?category=${category}`);
      if (!res.ok) throw new Error('Failed to fetch ebooks');
      return await res.json();
    } catch (err) {
      console.error('EBooks trending error:', err);
      return [];
    }
  },

  async searchEBooks(query: string): Promise<EBook[]> {
    try {
      const res = await fetch(`${BASE_URL}/ebooks/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error('EBooks search failed');
      return await res.json();
    } catch (err) {
      console.error('EBooks search error:', err);
      return [];
    }
  },

  async getEBookContent(bookId: string | number, sourceUrl?: string): Promise<{ chapters: any[] }> {
    try {
      const res = await fetch(`${BASE_URL}/ebooks/content?id=${bookId}&url=${encodeURIComponent(sourceUrl || '')}`);
      if (!res.ok) throw new Error('Failed to fetch ebook content');
      return await res.json();
    } catch (err) {
      console.error('EBook content fetch error:', err);
      throw err;
    }
  },

  async enrichEBookMetadata(title: string, author?: string, filename?: string): Promise<{
    title?: string;
    author?: string;
    cover?: string | null;
    year?: string | number;
    subjects?: string[];
    synopsis?: string | null;
  }> {
    try {
      const res = await fetch(`${BASE_URL}/ebooks/enrich-metadata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, author, filename })
      });
      if (!res.ok) return { cover: null, synopsis: null, subjects: [] };
      return await res.json();
    } catch (err) {
      console.error('Metadata enrichment error:', err);
      return { cover: null, synopsis: null, subjects: [] };
    }
  },

  async getAIMatchmakerRecommendations(vibePrompt: string): Promise<EBook[]> {
    try {
      const res = await fetch(`${BASE_URL}/ebooks/ai-matchmaker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vibePrompt })
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.recommendations || [];
    } catch (err) {
      console.error('AI matchmaker error:', err);
      return [];
    }
  },

  async lookupDictionary(word: string): Promise<any> {
    try {
      const res = await fetch(`${BASE_URL}/ebooks/lookup/dictionary?word=${encodeURIComponent(word)}`);
      if (!res.ok) throw new Error('Definition not found');
      return await res.json();
    } catch (err) {
      console.warn('Dictionary lookup error:', err);
      return null;
    }
  },

  async lookupTranslate(text: string, toLang: string = 'en'): Promise<any> {
    try {
      const res = await fetch(`${BASE_URL}/ebooks/lookup/translate?text=${encodeURIComponent(text)}&to=${encodeURIComponent(toLang)}`);
      if (!res.ok) throw new Error('Translation failed');
      return await res.json();
    } catch (err) {
      console.warn('Translation error:', err);
      return null;
    }
  },

  async lookupAiExplain(text: string, mode: 'explain' | 'summarize' | 'analyze' = 'explain'): Promise<string> {
    try {
      const res = await fetch(`${BASE_URL}/ebooks/lookup/ai-explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, mode })
      });
      if (!res.ok) throw new Error('AI explain failed');
      const data = await res.json();
      return data.explanation || '';
    } catch (err) {
      console.warn('AI explain error:', err);
      return `Insight: "${text.slice(0, 60)}..." highlights key themes and character perspective.`;
    }
  },

  async persistEBookToServer(book: EBook): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/ebooks/persist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(book)
      });
      return res.ok;
    } catch (err) {
      console.warn('Failed to backup ebook to server disk:', err);
      return false;
    }
  },

  async getSavedServerLibrary(): Promise<EBook[]> {
    try {
      const res = await fetch(`${BASE_URL}/ebooks/saved-library`);
      if (!res.ok) return [];
      return await res.json();
    } catch (err) {
      console.warn('Failed to load server saved library:', err);
      return [];
    }
  },

  async getSavedServerContent(id: string | number): Promise<EBook | null> {
    try {
      const res = await fetch(`${BASE_URL}/ebooks/saved-content?id=${encodeURIComponent(id)}`);
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.warn('Failed to load server saved content:', err);
      return null;
    }
  },

  async deleteSavedServerBook(id: string | number): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/ebooks/delete-saved?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      return res.ok;
    } catch (err) {
      console.warn('Failed to delete server saved book:', err);
      return false;
    }
  },

  // -------------------------------------------------------------
  // KOBO WIRELESS SYNC (BOOKDROP PROTOCOL)
  // -------------------------------------------------------------
  async sendToKobo(
    deviceKey: string,
    book: EBook,
    format: 'kepub' | 'epub' = 'kepub'
  ): Promise<{ success: boolean; message: string; fileId?: string }> {
    try {
      const res = await fetch(`${BASE_URL}/kobo/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceKey: deviceKey.toUpperCase().trim(),
          book,
          format
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send to Kobo');
      return data;
    } catch (err: any) {
      console.error('Send to Kobo error:', err);
      throw err;
    }
  },

  async sendCustomFileToKobo(
    deviceKey: string,
    fileData: string,
    filename: string,
    format: 'kepub' | 'epub' = 'kepub'
  ): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`${BASE_URL}/kobo/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceKey: deviceKey.toUpperCase().trim(),
          fileData,
          filename,
          format
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send file to Kobo');
      return data;
    } catch (err: any) {
      console.error('Send file to Kobo error:', err);
      throw err;
    }
  },

  // -------------------------------------------------------------
  // GOOGLE DRIVE BOOK IMPORTER
  // -------------------------------------------------------------
  async importFromGoogleDrive(url: string): Promise<EBook> {
    try {
      const res = await fetch(`${BASE_URL}/gdrive/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Google Drive import failed');
      return data.book;
    } catch (err: any) {
      console.error('Google Drive import API error:', err);
      throw err;
    }
  },

  // -------------------------------------------------------------
  // CALIBRE & CALIBRE-WEB OPDS BROWSER
  // -------------------------------------------------------------
  async browseCalibre(
    url: string,
    username?: string,
    password?: string
  ): Promise<{ title: string; url: string; entries: any[]; subCatalogs: any[] }> {
    try {
      const params = new URLSearchParams({ url });
      if (username) params.append('username', username);
      if (password) params.append('password', password);

      const res = await fetch(`${BASE_URL}/calibre/browse?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to browse Calibre OPDS library');
      return data;
    } catch (err: any) {
      console.error('Calibre browse error:', err);
      throw err;
    }
  },

  async importFromCalibre(
    downloadUrl: string,
    title: string,
    author?: string,
    username?: string,
    password?: string
  ): Promise<EBook> {
    try {
      const res = await fetch(`${BASE_URL}/calibre/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          downloadUrl,
          title,
          author,
          username,
          password
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to import book from Calibre');
      return data.book;
    } catch (err: any) {
      console.error('Calibre import error:', err);
      throw err;
    }
  },

  // 5. AUDIOBOOKS API
  async getPopularAudiobooks(category: string = 'popular'): Promise<Audiobook[]> {
    try {
      const res = await fetch(`${BASE_URL}/audiobooks/popular?category=${category}`);
      if (!res.ok) throw new Error('Failed to fetch audiobooks');
      return await res.json();
    } catch (err) {
      console.error('Audiobooks trending error:', err);
      return [];
    }
  },

  async searchAudiobooks(query: string): Promise<Audiobook[]> {
    try {
      const res = await fetch(`${BASE_URL}/audiobooks/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error('Audiobooks search failed');
      return await res.json();
    } catch (err) {
      console.error('Audiobooks search error:', err);
      return [];
    }
  },

  // 6. LIVE SPORTS API
  async getLiveSports(sport: string = 'all'): Promise<SportsMatch[]> {
    try {
      const res = await fetch(`${BASE_URL}/sports/live?sport=${sport}`);
      if (!res.ok) throw new Error('Failed to fetch live sports');
      return await res.json();
    } catch (err) {
      console.error('Live sports fetch error:', err);
      return [];
    }
  },

  async searchSports(query: string): Promise<SportsMatch[]> {
    try {
      const res = await fetch(`${BASE_URL}/sports/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error('Sports search failed');
      return await res.json();
    } catch (err) {
      console.error('Sports search error:', err);
      return [];
    }
  },

  // 7. UNIVERSAL SMART AI SEARCH & INTEL
  async searchSmart(query: string): Promise<{
    query: string;
    intent: any;
    totalCount: number;
    results: {
      comics: Comic[];
      anime: Anime[];
      media: MediaItem[];
      ebooks: EBook[];
      audiobooks: Audiobook[];
    };
  }> {
    try {
      const res = await fetch(`${BASE_URL}/search/smart?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error('Smart AI search failed');
      return await res.json();
    } catch (err) {
      console.error('Smart AI search error:', err);
      return {
        query,
        intent: null,
        totalCount: 0,
        results: { comics: [], anime: [], media: [], ebooks: [], audiobooks: [] }
      };
    }
  },

  async getAIIntel(title: string, chapterTitle?: string, category: string = 'Comics') {
    try {
      const res = await fetch(`${BASE_URL}/ai/intel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, chapterTitle, category })
      });
      if (!res.ok) throw new Error('Failed to get AI intel');
      return await res.json();
    } catch (err) {
      console.error('AI Intel error:', err);
      return null;
    }
  },

  async askAI(comicTitle: string, question: string, category: string = 'entertainment') {
    try {
      const res = await fetch(`${BASE_URL}/ai/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comicTitle, question, category })
      });
      if (!res.ok) throw new Error('Failed to ask AI');
      return await res.json();
    } catch (err) {
      console.error('Ask AI error:', err);
      return { answer: 'AI assistant is currently offline.' };
    }
  }
};


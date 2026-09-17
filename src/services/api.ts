import { Comic, ComicPage, Chapter } from '../types/comic';
import { Anime, AnimeEpisode, AnimeScheduleItem, AnimeStudio } from '../types/anime';
import { MediaItem } from '../types/media';
import { EBook } from '../types/ebook';
import { Audiobook } from '../types/audiobook';
import { SportsMatch } from '../types/sports';

const BASE_URL = '/api';

async function safeFetchJson<T = any>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, init);
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await res.json();
    }
    const text = await res.text();
    if (text.startsWith('{') || text.startsWith('[')) {
      return JSON.parse(text);
    }
    return null;
  } catch {
    return null;
  }
}

export const api = {
  // 1. COMICS API
  async getPopularComics(category: string = 'all'): Promise<Comic[]> {
    const serverData = await safeFetchJson<Comic[]>(`${BASE_URL}/comics/popular?category=${category}`);
    if (serverData && Array.isArray(serverData) && serverData.length > 0) {
      return serverData;
    }

    // Direct MangaDex Client-Side Fallback for Cloudflare Pages / Static Deployments
    try {
      const res = await fetch('https://api.mangadex.org/manga?limit=24&order[followedCount]=desc&includes[]=cover_art&contentRating[]=safe&contentRating[]=suggestive');
      if (res.ok) {
        const data = await res.json();
        const list: Comic[] = (data.data || []).map((m: any) => {
          const coverRel = m.relationships?.find((r: any) => r.type === 'cover_art');
          const coverFile = coverRel?.attributes?.fileName;
          const cover = coverFile
            ? `https://uploads.mangadex.org/covers/${m.id}/${coverFile}.512.jpg`
            : 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=600&auto=format&fit=crop';
          return {
            id: m.id,
            source: 'mangadex',
            title: m.attributes?.title?.en || Object.values(m.attributes?.title || {})[0] || 'Manga',
            description: m.attributes?.description?.en || 'High-res manga release from MangaDex.',
            cover,
            author: 'MangaDex',
            year: String(m.attributes?.year || 2024),
            type: 'Manga',
            status: m.attributes?.status === 'completed' ? 'Complete' : 'Ongoing',
            chapters: []
          };
        });
        if (list.length > 0) return list;
      }
    } catch (err) {
      console.warn('MangaDex fallback error:', err);
    }

    const sample = await this.getSampleComic();
    return [sample];
  },

  async searchComics(query: string, source: string = 'all'): Promise<Comic[]> {
    const serverData = await safeFetchJson<Comic[]>(`${BASE_URL}/comics/search?q=${encodeURIComponent(query)}&source=${source}`);
    if (serverData && Array.isArray(serverData) && serverData.length > 0) {
      return serverData;
    }

    try {
      const res = await fetch(`https://api.mangadex.org/manga?title=${encodeURIComponent(query)}&limit=24&includes[]=cover_art&contentRating[]=safe&contentRating[]=suggestive`);
      if (res.ok) {
        const data = await res.json();
        return (data.data || []).map((m: any) => {
          const coverRel = m.relationships?.find((r: any) => r.type === 'cover_art');
          const coverFile = coverRel?.attributes?.fileName;
          const cover = coverFile
            ? `https://uploads.mangadex.org/covers/${m.id}/${coverFile}.512.jpg`
            : 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=600&auto=format&fit=crop';
          return {
            id: m.id,
            source: 'mangadex',
            title: m.attributes?.title?.en || Object.values(m.attributes?.title || {})[0] || 'Manga',
            description: m.attributes?.description?.en || '',
            cover,
            author: 'MangaDex',
            year: String(m.attributes?.year || 2024),
            type: 'Manga',
            status: m.attributes?.status === 'completed' ? 'Complete' : 'Ongoing',
            chapters: []
          };
        });
      }
    } catch (err) {
      console.error('MangaDex search fallback error:', err);
    }
    return [];
  },

  async getComicDetails(source: string, id: string): Promise<Comic> {
    const serverData = await safeFetchJson<Comic>(`${BASE_URL}/comics/details/${source}/${encodeURIComponent(id)}`);
    if (serverData && serverData.id) {
      return serverData;
    }

    try {
      const feedRes = await fetch(`https://api.mangadex.org/manga/${id}/feed?translatedLanguage[]=en&order[chapter]=desc&limit=96`);
      if (feedRes.ok) {
        const feedData = await feedRes.json();
        const chapters = (feedData.data || []).map((ch: any) => ({
          id: ch.id,
          chapter: ch.attributes?.chapter || '1',
          title: ch.attributes?.title || `Chapter ${ch.attributes?.chapter || '1'}`,
          pages: ch.attributes?.pages || 0
        }));
        return {
          id,
          source: 'mangadex',
          title: 'Manga',
          chapters
        } as Comic;
      }
    } catch {}
    throw new Error('Failed to fetch comic details');
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

    const serverData = await safeFetchJson<any>(`${BASE_URL}/comics/chapter/${encodeURIComponent(source)}/${encodeURIComponent(chapterId)}`, { signal });
    if (serverData) {
      if (Array.isArray(serverData)) return serverData;
      if (Array.isArray(serverData.pages)) return serverData.pages;
    }

    // Direct MangaDex At-Home Server Fallback
    try {
      const res = await fetch(`https://api.mangadex.org/at-home/server/${chapterId}`, { signal });
      if (res.ok) {
        const data = await res.json();
        const baseUrl = data.baseUrl;
        const hash = data.chapter?.hash;
        const files = data.chapter?.data || [];
        return files.map((f: string, i: number) => ({
          pageNumber: i + 1,
          url: `${baseUrl}/data/${hash}/${f}`
        }));
      }
    } catch {}

    return [];
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
      if (res.ok) {
        const text = await res.text();
        if (text.startsWith('[') || text.startsWith('{')) {
          return JSON.parse(text);
        }
      }
    } catch {}

    // Direct AniList GraphQL Fallback for Cloudflare Pages
    try {
      const gql = `
        query {
          Page(page: 1, perPage: 25) {
            media(type: ANIME, sort: [TRENDING_DESC, POPULARITY_DESC], isAdult: false) {
              id
              title { romaji english native }
              coverImage { extraLarge large medium color }
              bannerImage
              description
              episodes
              status
              genres
              averageScore
              seasonYear
              format
              duration
            }
          }
        }
      `;
      const res = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ query: gql })
      });
      if (res.ok) {
        const d = await res.json();
        return d.data?.Page?.media || [];
      }
    } catch (err) {
      console.error('Anime trending AniList fallback error:', err);
    }
    return [];
  },

  async searchAnime(query: string): Promise<Anime[]> {
    try {
      const res = await fetch(`${BASE_URL}/anime/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const text = await res.text();
        if (text.startsWith('[') || text.startsWith('{')) {
          return JSON.parse(text);
        }
      }
    } catch {}

    // Direct AniList Search Fallback
    try {
      const gql = `
        query ($search: String) {
          Page(page: 1, perPage: 25) {
            media(type: ANIME, search: $search, isAdult: false) {
              id
              title { romaji english native }
              coverImage { extraLarge large medium color }
              bannerImage
              description
              episodes
              status
              genres
              averageScore
              seasonYear
              format
              duration
            }
          }
        }
      `;
      const res = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ query: gql, variables: { search: query } })
      });
      if (res.ok) {
        const d = await res.json();
        return d.data?.Page?.media || [];
      }
    } catch (err) {
      console.error('Anime search AniList fallback error:', err);
    }
    return [];
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
      if (res.ok) {
        const text = await res.text();
        if (text.startsWith('[') || text.startsWith('{')) {
          return JSON.parse(text);
        }
      }
    } catch {}

    // Direct TMDB Client-Side Fallback for Cloudflare Pages / Static Deployments
    try {
      const TMDB_KEY = '4e44d9029b1270a757cddc766a1bcb63';
      let tmdbUrl = `https://api.themoviedb.org/3/trending/all/day?api_key=${TMDB_KEY}`;
      const cat = category.toLowerCase();

      if (cat === 'tv') {
        tmdbUrl = `https://api.themoviedb.org/3/tv/popular?api_key=${TMDB_KEY}`;
      } else if (cat === 'movies' || cat === 'movie') {
        tmdbUrl = `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_KEY}&region=US`;
      } else if (cat.includes('marvel')) {
        tmdbUrl = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_KEY}&query=Marvel`;
      } else if (cat.includes('starwars')) {
        tmdbUrl = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_KEY}&query=Star%20Wars`;
      } else if (cat === 'action') {
        tmdbUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_KEY}&with_genres=28,878&sort_by=popularity.desc`;
      } else if (cat === 'netflix') {
        tmdbUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_KEY}&with_watch_providers=8&watch_region=US&sort_by=popularity.desc`;
      } else if (cat === 'disney') {
        tmdbUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_KEY}&with_watch_providers=337&watch_region=US&sort_by=popularity.desc`;
      } else if (cat === 'prime') {
        tmdbUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_KEY}&with_watch_providers=9&watch_region=US&sort_by=popularity.desc`;
      }

      const tmdbRes = await fetch(tmdbUrl);
      if (tmdbRes.ok) {
        const data = await tmdbRes.json();
        return (data.results || []).filter((r: any) => r.poster_path || r.backdrop_path);
      }
    } catch (err) {
      console.error('Media trending TMDB fallback error:', err);
    }
    return [];
  },

  async searchMedia(query: string): Promise<MediaItem[]> {
    try {
      const res = await fetch(`${BASE_URL}/media/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const text = await res.text();
        if (text.startsWith('[') || text.startsWith('{')) {
          return JSON.parse(text);
        }
      }
    } catch {}

    // Direct TMDB Search Fallback for Cloudflare Pages
    try {
      const TMDB_KEY = '4e44d9029b1270a757cddc766a1bcb63';
      const tmdbRes = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}&include_adult=false`);
      if (tmdbRes.ok) {
        const data = await tmdbRes.json();
        return (data.results || []).filter((r: any) => r.poster_path || r.backdrop_path);
      }
    } catch (err) {
      console.error('Media search TMDB fallback error:', err);
    }
    return [];
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
    const serverData = await safeFetchJson<Audiobook[]>(`${BASE_URL}/audiobooks/popular?category=${category}`);
    if (serverData && Array.isArray(serverData) && serverData.length > 0) {
      return serverData;
    }

    // Curated Studio Audiobooks Fallback for Cloudflare Pages / Static
    const curated: Audiobook[] = [
      {
        id: "hphallows",
        rawTitle: "Harry Potter and the Deathly Hallows - J.K. Rowling",
        title: "Harry Potter and the Deathly Hallows",
        author: "J.K. Rowling",
        narrator: "Jim Dale / Stephen Fry",
        cover: "https://is1-ssl.mzstatic.com/image/thumb/Publication221/v4/6c/58/6b/6c586b29-afa0-4595-80ea-12bf914e33e2/9781781105900.jpg/1200x1200bb.jpg",
        categories: ["Fantasy", "Young Adult"],
        genre: "Fantasy",
        duration: "21h 38m",
        durationSeconds: 77880,
        format: "M4B",
        bitrate: "128 Kbps",
        size: "650 MB",
        platform: "audiobay",
        infoHash: "05877f88450125c15cf01614742a781b0a5a3a79",
        description: "Harry Potter is leaving Privet Drive for the last time. But as the Dark Lord takes over the Ministry of Magic, Harry must locate and destroy the remaining Horcruxes."
      },
      {
        id: "projhailmary",
        rawTitle: "Project Hail Mary - Andy Weir",
        title: "Project Hail Mary",
        author: "Andy Weir",
        narrator: "Ray Porter",
        cover: "https://is1-ssl.mzstatic.com/image/thumb/Publication115/v4/71/84/02/718402f0-7b56-3a7a-6242-7ef6a72e817a/9781473582880.jpg/1200x1200bb.jpg",
        categories: ["Sci-Fi", "Bestseller"],
        genre: "Sci-Fi",
        duration: "16h 10m",
        durationSeconds: 58200,
        format: "M4B",
        bitrate: "128 Kbps",
        size: "480 MB",
        platform: "audiobay",
        infoHash: "2b0931d87e02e0b51a0293ec485d9fa5bb6f7cb1",
        description: "Ryland Grace is the sole survivor on a desperate, last-chance mission—and if he fails, humanity and the earth itself will perish."
      },
      {
        id: "dune1",
        rawTitle: "Dune - Frank Herbert",
        title: "Dune",
        author: "Frank Herbert",
        narrator: "Scott Brick, Orlagh Cassidy, Euan Morton",
        cover: "https://is1-ssl.mzstatic.com/image/thumb/Publication124/v4/d5/4b/f2/d54bf2ec-9a10-23a5-2965-0a3731110f0f/9781473501799.jpg/1200x1200bb.jpg",
        categories: ["Sci-Fi", "Classic"],
        genre: "Sci-Fi",
        duration: "21h 02m",
        durationSeconds: 75720,
        format: "M4B",
        bitrate: "96 Kbps",
        size: "820 MB",
        platform: "audiobay",
        infoHash: "5b54637da8c139db4cb89d9804c86e0c6a28ce40",
        description: "Set on the desert planet Arrakis, Dune is the story of the boy Paul Atreides, heir to a noble family tasked with ruling an inhospitable world."
      },
      {
        id: "thehobbit",
        rawTitle: "The Hobbit - J.R.R. Tolkien",
        title: "The Hobbit",
        author: "J.R.R. Tolkien",
        narrator: "Andy Serkis",
        cover: "https://is1-ssl.mzstatic.com/image/thumb/Publication115/v4/05/1f/ff/051fff0d-5bc3-a9d9-480a-9d9059f13e73/9780007525508.jpg/1200x1200bb.jpg",
        categories: ["Fantasy", "Adventure"],
        genre: "Fantasy",
        duration: "10h 25m",
        durationSeconds: 37500,
        format: "M4B",
        bitrate: "128 Kbps",
        size: "540 MB",
        platform: "audiobay",
        infoHash: "f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0",
        description: "Bilbo Baggins is a hobbit who enjoys a comfortable, unambitious life, until Gandalf and a company of thirteen dwarves arrive."
      },
      {
        id: "atomichabits",
        rawTitle: "Atomic Habits - James Clear",
        title: "Atomic Habits",
        author: "James Clear",
        narrator: "James Clear",
        cover: "https://is1-ssl.mzstatic.com/image/thumb/Publication124/v4/9f/fa/b1/9ffab177-c377-2e1d-84ad-e80629ec2e9e/9781473565425.jpg/1200x1200bb.jpg",
        categories: ["Self-Help", "Productivity"],
        genre: "Self-Help",
        duration: "5h 35m",
        durationSeconds: 20100,
        format: "M4B",
        bitrate: "128 Kbps",
        size: "260 MB",
        platform: "audiobay",
        infoHash: "b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1",
        description: "An Easy & Proven Way to Build Good Habits & Break Bad Ones."
      },
      {
        id: "1984george",
        rawTitle: "1984 - George Orwell",
        title: "1984",
        author: "George Orwell",
        narrator: "Simon Prebble",
        cover: "https://covers.openlibrary.org/b/id/8575708-L.jpg",
        categories: ["Classic", "Dystopian"],
        genre: "Classic",
        duration: "11h 22m",
        durationSeconds: 40920,
        format: "MP3",
        bitrate: "128 Kbps",
        size: "320 MB",
        platform: "audiobay",
        infoHash: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
        description: "Winston Smith lives in a world dictated by the Party and its ubiquitous leader, Big Brother."
      },
      {
        id: "ia_art_of_war_librivox",
        rawTitle: "The Art of War - Sun Tzu",
        title: "The Art of War",
        author: "Sun Tzu",
        narrator: "Moira Fogarty",
        cover: "https://archive.org/services/img/art_of_war_librivox",
        categories: ["Philosophy", "Strategy"],
        genre: "Philosophy",
        duration: "1h 12m",
        durationSeconds: 4320,
        format: "MP3",
        bitrate: "128 Kbps",
        platform: "archive",
        audioUrl: "https://archive.org/download/art_of_war_librivox/art_of_war_01-02_suntzu_64kb.mp3",
        description: "The Art of War is a Chinese military treatise written during the 6th century BC by Sun Tzu."
      },
      {
        id: "ia_adventures_sherlock_holmes_1011_librivox",
        rawTitle: "The Adventures of Sherlock Holmes - Arthur Conan Doyle",
        title: "The Adventures of Sherlock Holmes",
        author: "Arthur Conan Doyle",
        narrator: "David Clarke",
        cover: "https://archive.org/services/img/adventures_sherlock_holmes_1011_librivox",
        categories: ["Mystery", "Classic"],
        genre: "Mystery",
        duration: "10h 48m",
        durationSeconds: 38880,
        format: "MP3",
        bitrate: "128 Kbps",
        platform: "archive",
        audioUrl: "https://archive.org/download/adventures_sherlock_holmes_1011_librivox/adventuresofsherlockholmes_01_doyle_64kb.mp3",
        description: "A collection of twelve short stories featuring the master detective Sherlock Holmes and Dr. John Watson."
      }
    ];

    return curated;
  },

  async searchAudiobooks(query: string): Promise<Audiobook[]> {
    const serverData = await safeFetchJson<Audiobook[]>(`${BASE_URL}/audiobooks/search?q=${encodeURIComponent(query)}`);
    if (serverData && Array.isArray(serverData) && serverData.length > 0) {
      return serverData;
    }

    try {
      const q = encodeURIComponent(`mediatype:audio AND (collection:audio_bookspoetry OR collection:audio_book OR ${query}) AND ${query}`);
      const res = await fetch(`https://archive.org/advancedsearch.php?q=${q}&fl[]=identifier,title,creator,description,year,downloads&sort[]=downloads+desc&rows=25&output=json`);
      if (res.ok) {
        const data = await res.json();
        const docs = data.response?.docs || [];
        return docs.map((doc: any) => ({
          id: `ia_${doc.identifier}`,
          title: doc.title || 'Unknown Title',
          author: Array.isArray(doc.creator) ? doc.creator.join(', ') : (doc.creator || 'Classic Author'),
          cover: `https://archive.org/services/img/${doc.identifier}`,
          description: typeof doc.description === 'string' ? doc.description.slice(0, 300) : 'Archive Audiobook recording.',
          duration: 'Multi-track',
          genre: 'Audiobook',
          platform: 'archive'
        }));
      }
    } catch (err) {
      console.error('Audiobooks search archive fallback error:', err);
    }
    return [];
  },

  // 6. LIVE SPORTS API
  async getLiveSports(sport: string = 'all'): Promise<SportsMatch[]> {
    const serverData = await safeFetchJson<SportsMatch[]>(`${BASE_URL}/sports/live?sport=${sport}`);
    if (serverData && Array.isArray(serverData) && serverData.length > 0) {
      return serverData;
    }

    // Direct ESPN Scoreboard Client-Side Fallback for Cloudflare Pages
    try {
      const matches: SportsMatch[] = [];
      const urls: { url: string; league: string; sport: string }[] = [];

      if (sport === 'all' || sport === 'soccer') {
        urls.push({ url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard', league: 'Premier League', sport: 'soccer' });
        urls.push({ url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard', league: 'Champions League', sport: 'soccer' });
      }
      if (sport === 'all' || sport === 'rugby') {
        urls.push({ url: 'https://site.api.espn.com/apis/site/v2/sports/rugby/270559/scoreboard', league: 'United Rugby Championship', sport: 'rugby' });
      }

      for (const item of urls) {
        try {
          const res = await fetch(item.url);
          if (res.ok) {
            const d = await res.json();
            (d.events || []).slice(0, 6).forEach((ev: any) => {
              const comp = ev.competitions?.[0] || {};
              const home = comp.competitors?.find((c: any) => c.homeAway === 'home') || comp.competitors?.[0];
              const away = comp.competitors?.find((c: any) => c.homeAway === 'away') || comp.competitors?.[1];
              matches.push({
                id: ev.id || `espn_${Math.random()}`,
                sport: item.sport as any,
                league: item.league,
                homeTeam: {
                  name: home?.team?.displayName || 'Home Team',
                  logo: home?.team?.logo || 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/default-team-logo-500.png',
                  score: home?.score || '0'
                },
                awayTeam: {
                  name: away?.team?.displayName || 'Away Team',
                  logo: away?.team?.logo || 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/default-team-logo-500.png',
                  score: away?.score || '0'
                },
                status: comp.status?.type?.description || 'Upcoming',
                time: comp.status?.displayClock || comp.status?.type?.detail || 'LIVE',
                streamUrl: 'https://vidsrc.pm'
              });
            });
          }
        } catch {}
      }
      if (matches.length > 0) return matches;
    } catch (err) {
      console.error('ESPN live sports fallback error:', err);
    }
    return [];
  },

  async getSportsMatches(sport: string = 'all'): Promise<SportsMatch[]> {
    return this.getLiveSports(sport);
  },

  async searchSports(query: string): Promise<SportsMatch[]> {
    const serverData = await safeFetchJson<SportsMatch[]>(`${BASE_URL}/sports/search?q=${encodeURIComponent(query)}`);
    if (serverData && Array.isArray(serverData) && serverData.length > 0) {
      return serverData;
    }
    const all = await this.getLiveSports('all');
    const qLower = query.toLowerCase();
    return all.filter(
      (m) =>
        m.homeTeam.name.toLowerCase().includes(qLower) ||
        m.awayTeam.name.toLowerCase().includes(qLower) ||
        m.league.toLowerCase().includes(qLower)
    );
  },

  async searchSportsMatches(query: string): Promise<SportsMatch[]> {
    return this.searchSports(query);
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


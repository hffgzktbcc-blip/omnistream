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
    if (contentType.includes('text/html')) {
      return null;
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

    // Curated Studio Audiobooks with Direct High-Quality Streams
    const curated: Audiobook[] = [
      {
        id: "ia_serkishobbit",
        rawTitle: "The Hobbit - J.R.R. Tolkien (Read by Andy Serkis)",
        title: "The Hobbit",
        author: "J.R.R. Tolkien",
        narrator: "Andy Serkis",
        cover: "https://is1-ssl.mzstatic.com/image/thumb/Publication115/v4/05/1f/ff/051fff0d-5bc3-a9d9-480a-9d9059f13e73/9780007525508.jpg/1200x1200bb.jpg",
        categories: ["Fantasy", "Adventure"],
        genre: "Fantasy",
        duration: "10h 25m",
        durationSeconds: 37500,
        format: "MP3",
        bitrate: "128 Kbps",
        size: "540 MB",
        platform: "archive",
        audioUrl: "https://archive.org/download/serkishobbit/01%20Chapter%201%20-%20An%20Unexpected%20Party.mp3",
        description: "Bilbo Baggins enjoys a quiet, comfortable life, until the wizard Gandalf and a company of thirteen dwarves arrive on his doorstep. Read by Andy Serkis."
      },
      {
        id: "ia_dune-part-ii",
        rawTitle: "Dune - Frank Herbert",
        title: "Dune",
        author: "Frank Herbert",
        narrator: "Scott Brick & Full Cast",
        cover: "https://is1-ssl.mzstatic.com/image/thumb/Publication124/v4/d5/4b/f2/d54bf2ec-9a10-23a5-2965-0a3731110f0f/9781473501799.jpg/1200x1200bb.jpg",
        categories: ["Sci-Fi", "Classic"],
        genre: "Sci-Fi",
        duration: "21h 02m",
        durationSeconds: 75720,
        format: "MP3",
        bitrate: "128 Kbps",
        size: "820 MB",
        platform: "archive",
        audioUrl: "https://archive.org/download/dune-part-ii/Dune%2C%20Book%201%20-%20Part%2001.mp3",
        description: "Set on the desert planet Arrakis, Dune is the story of Paul Atreides, heir to a noble family tasked with ruling an inhospitable world."
      },
      {
        id: "ia_harry-potter_20240930",
        rawTitle: "Harry Potter and the Philosopher's Stone - J.K. Rowling",
        title: "Harry Potter and the Philosopher's Stone",
        author: "J.K. Rowling",
        narrator: "Stephen Fry",
        cover: "https://is1-ssl.mzstatic.com/image/thumb/Publication221/v4/6c/58/6b/6c586b29-afa0-4595-80ea-12bf914e33e2/9781781105900.jpg/1200x1200bb.jpg",
        categories: ["Fantasy", "Young Adult"],
        genre: "Fantasy",
        duration: "8h 18m",
        durationSeconds: 29880,
        format: "MP3",
        bitrate: "128 Kbps",
        size: "240 MB",
        platform: "archive",
        audioUrl: "https://archive.org/download/harry-potter_20240930/HP1/HP1%20-%20CH01%20Philosopher%27s%20Stone.mp3",
        description: "Harry Potter has never even heard of Hogwarts when the letters start dropping on the doormat at number four, Privet Drive. Complete unabridged narration by Stephen Fry."
      },
      {
        id: "ia_1984_20220119",
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
        platform: "archive",
        audioUrl: "https://archive.org/download/1984_20220119/1984-01.mp3",
        description: "Winston Smith toes the Party line, rewriting history to satisfy the Ministry of Truth. With every lie he writes, Winston comes to hate the Party that yearns for power."
      },
      {
        id: "ia_greatgatsby_1204_librivox",
        rawTitle: "The Great Gatsby - F. Scott Fitzgerald",
        title: "The Great Gatsby",
        author: "F. Scott Fitzgerald",
        narrator: "Frank Marcopolos",
        cover: "https://covers.openlibrary.org/b/id/8432047-L.jpg",
        categories: ["Classic", "Drama"],
        genre: "Classic",
        duration: "4h 50m",
        durationSeconds: 17400,
        format: "MP3",
        bitrate: "128 Kbps",
        size: "140 MB",
        platform: "archive",
        audioUrl: "https://archive.org/download/greatgatsby_1204_librivox/greatgatsby_01_fitzgerald_64kb.mp3",
        description: "The story of the mysteriously wealthy Jay Gatsby and his love for the beautiful Daisy Buchanan in Jazz Age New York."
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
        size: "290 MB",
        platform: "archive",
        audioUrl: "https://archive.org/download/adventures_sherlock_holmes_1011_librivox/adventuresofsherlockholmes_01_doyle_64kb.mp3",
        description: "A collection of twelve short stories featuring the master detective Sherlock Holmes and Dr. John Watson."
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
        size: "35 MB",
        platform: "archive",
        audioUrl: "https://archive.org/download/art_of_war_librivox/art_of_war_01-02_suntzu_64kb.mp3",
        description: "The Art of War is a Chinese military treatise written during the 6th century BC by Sun Tzu on military strategy and tactics."
      }
    ];

    return curated;
  },

  async searchAudiobooks(query: string): Promise<Audiobook[]> {
    const cleanQ = (query || '').trim();
    if (!cleanQ) return [];

    try {
      const serverData = await safeFetchJson<any>(`${BASE_URL}/audiobooks/search?q=${encodeURIComponent(cleanQ)}`);
      if (serverData) {
        if (Array.isArray(serverData) && serverData.length > 0) {
          return serverData;
        }
        if (Array.isArray(serverData.items) && serverData.items.length > 0) {
          return serverData.items;
        }
      }
    } catch {}

    // Fallback: Direct Apibay Torrent Swarm Search (Open CORS)
    try {
      const res = await fetch(`https://apibay.org/q.php?q=${encodeURIComponent(cleanQ)}&cat=100`);
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list) && list.length > 0 && list[0]?.id !== '0') {
          const DEFAULT_TRACKERS = [
            'wss://tracker.openwebtorrent.com',
            'wss://tracker.btorrent.xyz',
            'wss://tracker.fastcast.nz',
            'udp://tracker.opentrackr.org:1337/announce',
            'udp://open.stealth.si:80/announce',
            'udp://tracker.torrent.eu.org:451/announce',
            'udp://exodus.desync.com:6969/announce',
            'udp://opentor.org:2710/announce',
            'udp://tracker.dler.org:6969/announce',
            'udp://bt1.archive.org:6969/announce'
          ];
          const trParam = DEFAULT_TRACKERS.map(t => `&tr=${encodeURIComponent(t)}`).join('');

          return list
            .filter((item: any) => item.id !== '0' && item.info_hash && !item.info_hash.startsWith('00000000'))
            .map((item: any) => {
              const hash = item.info_hash.toLowerCase();
              let title = item.name;
              let author = 'Full Cast / Swarm';
              if (item.name.includes(' - ')) {
                const parts = item.name.split(' - ');
                title = parts[0].trim();
                author = parts.slice(1).join(' - ').trim();
              }
              const sizeBytes = parseInt(item.size, 10) || 0;
              const sizeFormatted = sizeBytes > 1024 * 1024 * 1024
                ? `${(sizeBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
                : `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;

              return {
                id: `wt_${hash}`,
                infoHash: hash,
                rawTitle: item.name,
                title,
                author,
                cover: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=400',
                categories: ['Audiobook', 'Swarm Edition'],
                format: 'M4B',
                size: sizeFormatted,
                seeders: parseInt(item.seeders, 10) || 0,
                magnet: `magnet:?xt=urn:btih:${hash}&dn=${encodeURIComponent(item.name)}${trParam}`,
                source: 'torrent',
                platform: 'torrent'
              };
            });
        }
      }
    } catch {}

    // Fallback: Archive.org (Open public domain & studio audiobooks)
    try {
      const q = encodeURIComponent(`title:(${cleanQ}) AND mediatype:(audio)`);
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
          duration: 'Multi-chapter',
          genre: 'Audiobook',
          platform: 'archive',
          audioUrl: `https://archive.org/download/${doc.identifier}`
        }));
      }
    } catch (err) {
      console.error('Audiobooks search archive fallback error:', err);
    }
    return [];
  },

  async getArchiveTracks(identifier: string): Promise<AudioTrack[]> {
    try {
      const cleanId = identifier.replace(/^ia_/, '').trim();
      const res = await fetch(`https://archive.org/metadata/${cleanId}/files`);
      if (!res.ok) return [];
      const data = await res.json();
      const files: any[] = data.result || [];
      const audioFiles = files.filter((f: any) =>
        f.name && !f.name.startsWith('.') && (
          f.name.toLowerCase().endsWith('.mp3') ||
          f.name.toLowerCase().endsWith('.m4b') ||
          f.name.toLowerCase().endsWith('.m4a') ||
          f.name.toLowerCase().endsWith('.ogg')
        )
      );

      return audioFiles.map((f: any, idx: number) => {
        const cleanName = f.title || f.name.replace(/^.*\//, '').replace(/\.(mp3|m4b|m4a|ogg)$/i, '');
        const sizeBytes = parseInt(f.size || '0', 10);
        const sizeFormatted = sizeBytes > 1024 * 1024
          ? `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
          : 'Audio Track';
        const streamUrl = `https://archive.org/download/${cleanId}/${encodeURI(f.name)}`;

        return {
          index: idx,
          name: cleanName,
          path: f.name,
          length: Math.round(parseFloat(f.length || '1800')),
          sizeFormatted,
          streamUrl,
          downloadUrl: streamUrl,
          isDebrid: false
        };
      });
    } catch (e) {
      console.warn('Failed to fetch archive tracks:', e);
      return [];
    }
  },

  // 6. LIVE SPORTS API
  async getLiveSports(sport: string = 'all'): Promise<SportsMatch[]> {
    const serverData = await safeFetchJson<SportsMatch[]>(`${BASE_URL}/sports/live?sport=${sport}`);
    if (serverData && Array.isArray(serverData) && serverData.length > 0) {
      return serverData;
    }

    const matches: SportsMatch[] = [];

    // 1. Direct Streamed.pk Global Live Matches API (Open CORS *, 100% working live streams)
    try {
      const categoryMap: Record<string, string[]> = {
        all: ['football', 'motor-sports', 'fight', 'basketball', 'rugby', 'cricket', 'american-football', 'tennis', 'hockey', 'golf'],
        soccer: ['football'],
        f1: ['motor-sports'],
        mma: ['fight'],
        basketball: ['basketball'],
        rugby: ['rugby'],
        cricket: ['cricket'],
        tennis: ['tennis'],
        football: ['american-football']
      };

      const targetCategories = categoryMap[sport] || [sport];
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const spkRes = await fetch('https://streamed.pk/api/matches/all', {
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (spkRes.ok) {
        const spkData = await spkRes.json();
        if (Array.isArray(spkData)) {
          const filteredSpk = spkData.filter((m: any) =>
            sport === 'all' ? true : targetCategories.includes(m.category)
          );

          filteredSpk.forEach((m: any) => {
            const homeName = m.teams?.home?.name || m.title?.split(' vs ')[0] || m.title || 'Home Team';
            const awayName = m.teams?.away?.name || m.title?.split(' vs ')[1] || 'Away Team';
            const homeLogo = m.teams?.home?.badge ? `https://streamed.pk${m.teams.home.badge.startsWith('/') ? '' : '/'}${m.teams.home.badge}` : undefined;
            const awayLogo = m.teams?.away?.badge ? `https://streamed.pk${m.teams.away.badge.startsWith('/') ? '' : '/'}${m.teams.away.badge}` : undefined;

            let mappedSport = 'soccer';
            if (m.category === 'motor-sports') mappedSport = 'f1';
            else if (m.category === 'fight') mappedSport = 'mma';
            else if (m.category === 'basketball') mappedSport = 'basketball';
            else if (m.category === 'rugby') mappedSport = 'rugby';
            else if (m.category === 'cricket') mappedSport = 'cricket';
            else if (m.category === 'tennis') mappedSport = 'tennis';
            else if (m.category === 'american-football') mappedSport = 'football';

            const isUpcoming = m.date && Date.now() < m.date;
            const statusDesc = isUpcoming ? 'Scheduled Broadcast' : 'LIVE Broadcasting';

            const defaultServers = [];
            if (Array.isArray(m.sources) && m.sources.length > 0) {
              const mainSrc = m.sources[0];
              defaultServers.push(
                { name: `⚡ Stream 1 (1080p HD • Main Live Feed)`, url: `https://embed.st/embed/${mainSrc.source}/${mainSrc.id}/1` },
                { name: `⚡ Stream 2 (HD • Backup Feed)`, url: `https://embed.st/embed/${mainSrc.source}/${mainSrc.id}/2` }
              );
            }

            matches.push({
              id: `spk_${m.id}`,
              sport: mappedSport as any,
              league: m.category === 'motor-sports' ? 'Formula 1 / Motorsport' : m.category === 'football' ? 'Premier League / European Football' : m.category.toUpperCase(),
              homeTeam: { name: homeName, logo: homeLogo, score: isUpcoming ? undefined : 'LIVE' },
              awayTeam: { name: awayName, logo: awayLogo, score: isUpcoming ? undefined : 'LIVE' },
              status: isUpcoming ? 'UPCOMING' : 'LIVE',
              time: m.date ? new Date(m.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (isUpcoming ? 'UPCOMING' : 'LIVE NOW'),
              statusText: m.popular ? `🔥 Featured Live Stream • ${statusDesc}` : `HD Live Broadcast • ${statusDesc}`,
              poster: m.poster ? `https://streamed.pk${m.poster.startsWith('/') ? '' : '/'}${m.poster}` : undefined,
              sources: m.sources,
              servers: defaultServers
            });
          });
        }
      }
    } catch (e) {
      console.warn('Streamed.pk sports fetch failed, falling back to ESPN scoreboard:', e);
    }

    // 2. Direct ESPN Scoreboard Client-Side Fallback for Extra Fixtures & Real-Time Scores
    try {
      const urls: { url: string; league: string; sport: string }[] = [];

      if (sport === 'all' || sport === 'soccer') {
        urls.push({ url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard', league: 'Premier League', sport: 'soccer' });
        urls.push({ url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard', league: 'Champions League', sport: 'soccer' });
        urls.push({ url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/scoreboard', league: 'La Liga', sport: 'soccer' });
      }
      if (sport === 'all' || sport === 'f1') {
        urls.push({ url: 'https://site.api.espn.com/apis/site/v2/sports/racing/f1/scoreboard', league: 'Formula 1', sport: 'f1' });
      }
      if (sport === 'all' || sport === 'mma') {
        urls.push({ url: 'https://site.api.espn.com/apis/site/v2/sports/mma/ufc/scoreboard', league: 'UFC Championship', sport: 'mma' });
      }
      if (sport === 'all' || sport === 'basketball') {
        urls.push({ url: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard', league: 'NBA Basketball', sport: 'basketball' });
      }
      if (sport === 'all' || sport === 'rugby') {
        urls.push({ url: 'https://site.api.espn.com/apis/site/v2/sports/rugby/270559/scoreboard', league: 'United Rugby Championship', sport: 'rugby' });
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const responses = await Promise.allSettled(
        urls.map((u) =>
          fetch(u.url, { signal: controller.signal })
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => ({ ...u, data }))
            .catch(() => null)
        )
      );
      clearTimeout(timeoutId);

      for (const res of responses) {
        if (res.status !== 'fulfilled' || !res.value?.data) continue;
        const { sport: itemSport, league: itemLeague, data } = res.value;
        const events = data.events || [];

        events.slice(0, 6).forEach((ev: any) => {
          const comp = ev.competitions?.[0] || {};
          const competitors = comp.competitors || [];

          let homeName = 'Home Team';
          let homeLogo = 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/default-team-logo-500.png';
          let homeScore = '0';

          let awayName = 'Away Team';
          let awayLogo = 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/default-team-logo-500.png';
          let awayScore = '0';

          if (itemSport === 'f1') {
            homeName = ev.name || 'Formula 1 Grand Prix';
            homeLogo = 'https://a.espncdn.com/combiner/i?img=/i/leaguelogos/racing/500/f1.png';
            homeScore = 'F1';
            awayName = comp.venue?.fullName || 'Circuit / Race Day';
            awayLogo = 'https://a.espncdn.com/i/teamlogos/racing/500/f1.png';
            awayScore = 'LIVE';
          } else if (itemSport === 'mma') {
            const f1 = competitors[0]?.athlete?.displayName || ev.name?.split(' vs ')[0] || 'Challenger 1';
            const f2 = competitors[1]?.athlete?.displayName || ev.name?.split(' vs ')[1] || 'Challenger 2';
            homeName = f1;
            homeLogo = 'https://a.espncdn.com/combiner/i?img=/i/leaguelogos/mma/500/ufc.png';
            homeScore = competitors[0]?.winner ? 'WIN' : '';
            awayName = f2;
            awayLogo = 'https://a.espncdn.com/combiner/i?img=/i/leaguelogos/mma/500/ufc.png';
            awayScore = competitors[1]?.winner ? 'WIN' : '';
          } else {
            const home = competitors.find((c: any) => c.homeAway === 'home') || competitors[0];
            const away = competitors.find((c: any) => c.homeAway === 'away') || competitors[1];
            homeName = home?.team?.displayName || 'Home Team';
            homeLogo = home?.team?.logo || homeLogo;
            homeScore = home?.score || '0';
            awayName = away?.team?.displayName || 'Away Team';
            awayLogo = away?.team?.logo || awayLogo;
            awayScore = away?.score || '0';
          }

          const statusDesc = comp.status?.type?.description || 'Upcoming';
          const isLiveNow = comp.status?.type?.state === 'in' || statusDesc.toLowerCase().includes('in progress') || statusDesc.toLowerCase().includes('live');
          const isFinished = comp.status?.type?.state === 'post' || statusDesc.toLowerCase().includes('final');

          // Only add if not duplicate with streamed.pk match
          const alreadyHas = matches.some((m) =>
            m.homeTeam.name.toLowerCase().includes(homeName.toLowerCase()) ||
            homeName.toLowerCase().includes(m.homeTeam.name.toLowerCase())
          );

          if (!alreadyHas) {
            matches.push({
              id: ev.id || `espn_${itemSport}_${Math.random()}`,
              sport: itemSport as any,
              league: itemLeague,
              homeTeam: { name: homeName, logo: homeLogo, score: homeScore },
              awayTeam: { name: awayName, logo: awayLogo, score: awayScore },
              status: isLiveNow ? 'LIVE' : isFinished ? 'FINISHED' : 'UPCOMING',
              time: comp.status?.displayClock || comp.status?.type?.detail || (isLiveNow ? 'LIVE NOW' : 'UPCOMING'),
              statusText: `${statusDesc} • ${itemLeague}`,
              servers: [
                { name: `⚡ StrikeOut Live Match Feed (${homeName} vs ${awayName})`, url: 'https://strikeout.im' },
                { name: `⚡ CricFree Global Stream (${homeName})`, url: 'https://cricfree.live' },
                { name: `⚡ SportLemons Live Feed`, url: 'https://sportlemons.net' }
              ]
            });
          }
        });
      }
    } catch (err) {
      console.error('ESPN live sports fallback error:', err);
    }

    return matches;
  },

  async getMatchStreams(sources: { source: string; id: string }[]): Promise<{ name: string; url: string; badge: string }[]> {
    const streams: { name: string; url: string; badge: string }[] = [];
    if (!sources || !Array.isArray(sources) || sources.length === 0) return streams;

    try {
      for (const src of sources.slice(0, 3)) {
        const res = await fetch(`https://streamed.pk/api/stream/${src.source}/${src.id}`);
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list)) {
            list.forEach((item: any, idx: number) => {
              if (item.embedUrl) {
                streams.push({
                  name: `⚡ Stream ${item.streamNo || idx + 1} (${item.hd ? '1080p HD' : 'SD'} • ${item.language || 'Main Feed'})`,
                  url: item.embedUrl,
                  badge: item.hd ? '1080p HD' : 'Live Stream'
                });
              }
            });
          }
        }
      }
    } catch (e) {
      console.error('Error fetching stream embed URLs:', e);
    }
    return streams;
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


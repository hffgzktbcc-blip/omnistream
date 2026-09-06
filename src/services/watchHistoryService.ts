import { MediaItem } from '../types/media';
import { Anime } from '../types/anime';
import { Comic } from '../types/comic';
import { Audiobook } from '../types/audiobook';

export type HistoryMediaType = 'movie' | 'tv' | 'anime' | 'comic' | 'audiobook';

export interface UnifiedHistoryItem {
  id: string;
  mediaType: HistoryMediaType;
  title: string;
  subtitle?: string;
  cover: string;
  year?: string | number;
  season?: number;
  episode?: number;
  chapterId?: string;
  trackIndex?: number;
  currentTime?: number;
  duration?: number;
  progressPercent?: number;
  lastWatchedAt: number;
  rawItem?: any;
}

const STORAGE_KEY = 'omnistream_unified_history_v1';

class WatchHistoryService {
  private getStore(): UnifiedHistoryItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private saveStore(items: UnifiedHistoryItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('Failed to save watch history:', e);
    }
  }

  public getRecent(limit: number = 10): UnifiedHistoryItem[] {
    const items = this.getStore();
    return items.sort((a, b) => (b.lastWatchedAt || 0) - (a.lastWatchedAt || 0)).slice(0, limit);
  }

  public getItem(id: string): UnifiedHistoryItem | undefined {
    return this.getStore().find((i) => i.id === id);
  }

  public saveMovie(item: MediaItem, progressPercent: number = 10): void {
    const title = item.title || item.name || 'Feature Film';
    const cover = item.poster_path
      ? item.poster_path.startsWith('http')
        ? item.poster_path
        : `https://image.tmdb.org/t/p/w500${item.poster_path}`
      : item.poster || '';
    const year = (item.release_date || item.first_air_date || '').slice(0, 4);

    const historyItem: UnifiedHistoryItem = {
      id: `movie_${item.id}`,
      mediaType: 'movie',
      title,
      subtitle: 'Feature Film',
      cover,
      year,
      progressPercent,
      lastWatchedAt: Date.now(),
      rawItem: item
    };

    this.upsert(historyItem);
  }

  public saveTv(
    item: MediaItem,
    season: number = 1,
    episode: number = 1,
    progressPercent: number = 10
  ): void {
    const title = item.name || item.title || 'TV Series';
    const cover = item.poster_path
      ? item.poster_path.startsWith('http')
        ? item.poster_path
        : `https://image.tmdb.org/t/p/w500${item.poster_path}`
      : item.poster || '';
    const year = (item.first_air_date || item.release_date || '').slice(0, 4);

    const historyItem: UnifiedHistoryItem = {
      id: `tv_${item.id}`,
      mediaType: 'tv',
      title,
      subtitle: `Season ${season} • Ep ${episode}`,
      cover,
      year,
      season,
      episode,
      progressPercent,
      lastWatchedAt: Date.now(),
      rawItem: item
    };

    this.upsert(historyItem);
  }

  public saveAnime(
    anime: Anime,
    episode: number = 1,
    audioType: 'sub' | 'dub' = 'sub',
    progressPercent: number = 10
  ): void {
    const title =
      typeof anime.title === 'string'
        ? anime.title
        : anime.title?.english || anime.title?.romaji || 'Anime Series';
    const cover =
      typeof anime.coverImage === 'string'
        ? anime.coverImage
        : anime.coverImage?.large || anime.coverImage?.medium || '';

    const historyItem: UnifiedHistoryItem = {
      id: `anime_${anime.id}`,
      mediaType: 'anime',
      title,
      subtitle: `Episode ${episode} (${audioType.toUpperCase()})`,
      cover,
      episode,
      progressPercent,
      lastWatchedAt: Date.now(),
      rawItem: anime
    };

    this.upsert(historyItem);
  }

  public saveComic(
    comic: Comic,
    chapterTitle: string,
    pageNumber: number = 1,
    totalPages: number = 20
  ): void {
    const percent = Math.min(100, Math.round((pageNumber / Math.max(1, totalPages)) * 100));
    const historyItem: UnifiedHistoryItem = {
      id: `comic_${comic.id}`,
      mediaType: 'comic',
      title: comic.title,
      subtitle: chapterTitle || `Page ${pageNumber}`,
      cover: comic.cover,
      progressPercent: percent,
      lastWatchedAt: Date.now(),
      rawItem: comic
    };

    this.upsert(historyItem);
  }

  public saveAudiobook(
    book: Audiobook,
    trackIndex: number = 0,
    currentTime: number = 0,
    duration: number = 0
  ): void {
    const percent = duration > 0 ? Math.min(100, Math.round((currentTime / duration) * 100)) : 0;
    const cover = book.cover?.startsWith('http')
      ? `/api/audiobooks/proxy-image?url=${encodeURIComponent(book.cover)}`
      : book.cover || '';

    const historyItem: UnifiedHistoryItem = {
      id: `audiobook_${book.id}`,
      mediaType: 'audiobook',
      title: book.title,
      subtitle: book.author ? `By ${book.author}` : 'Audiobook',
      cover,
      trackIndex,
      currentTime,
      duration,
      progressPercent: percent,
      lastWatchedAt: Date.now(),
      rawItem: book
    };

    this.upsert(historyItem);
  }

  private upsert(item: UnifiedHistoryItem): void {
    const items = this.getStore();
    const existingIdx = items.findIndex((i) => i.id === item.id);
    if (existingIdx >= 0) {
      items[existingIdx] = { ...items[existingIdx], ...item };
    } else {
      items.unshift(item);
    }
    // Cap at 40 recent items
    this.saveStore(items.slice(0, 40));
  }

  public removeItem(id: string): void {
    const items = this.getStore().filter((i) => i.id !== id);
    this.saveStore(items);
  }

  public clearAll(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }
}

export const watchHistoryService = new WatchHistoryService();

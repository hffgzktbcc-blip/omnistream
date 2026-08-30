import { Anime, AnimeWatchProgress, AnimeWatchStatus } from '../types/anime';

const STORAGE_KEY = 'omnistream_anime_watchlist_v2';
const AUDIO_PREF_KEY = 'omnistream_anime_audio_pref';

export const animeStorage = {
  // 1. Get all tracked anime items
  getWatchlist(): AnimeWatchProgress[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn('Failed to parse anime watchlist from localStorage:', e);
      return [];
    }
  },

  // 2. Get single anime progress
  getProgress(animeId: number): AnimeWatchProgress | undefined {
    const list = this.getWatchlist();
    return list.find((item) => item.animeId === animeId);
  },

  // 3. Update watch progress & status
  updateProgress(
    anime: Anime,
    episodeNumber: number,
    totalEpisodes: number = 12,
    audioType: 'sub' | 'dub' = 'sub',
    progressPercent: number = 0
  ): AnimeWatchProgress {
    const list = this.getWatchlist();
    const existingIdx = list.findIndex((item) => item.animeId === anime.id);

    const isFinished = episodeNumber >= totalEpisodes && progressPercent >= 90;
    const currentStatus: AnimeWatchStatus = isFinished ? 'completed' : 'watching';

    const item: AnimeWatchProgress = {
      animeId: anime.id,
      anime,
      episodeNumber,
      totalEpisodes,
      audioType,
      progressPercent,
      status: currentStatus,
      updatedAt: Date.now(),
      completed: isFinished
    };

    if (existingIdx >= 0) {
      list[existingIdx] = { ...list[existingIdx], ...item };
    } else {
      list.unshift(item);
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      // Asynchronously backup to server
      fetch('/api/anime/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item })
      }).catch(() => {});
    } catch (e) {
      console.warn('Failed to save anime progress:', e);
    }

    return item;
  },

  // 4. Update status tier directly (e.g. Plan to Watch, Dropped)
  updateStatus(anime: Anime, status: AnimeWatchStatus): void {
    const list = this.getWatchlist();
    const existingIdx = list.findIndex((item) => item.animeId === anime.id);

    if (existingIdx >= 0) {
      list[existingIdx].status = status;
      list[existingIdx].updatedAt = Date.now();
    } else {
      list.unshift({
        animeId: anime.id,
        anime,
        episodeNumber: 1,
        totalEpisodes: anime.episodes || 12,
        audioType: this.getAudioPreference(),
        status,
        updatedAt: Date.now()
      });
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Failed to update anime status:', e);
    }
  },

  // 5. Remove anime from watchlist
  removeFromWatchlist(animeId: number): void {
    const list = this.getWatchlist().filter((item) => item.animeId !== animeId);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Failed to remove anime from watchlist:', e);
    }
  },

  // 6. Audio Preference (Sub vs Dub)
  getAudioPreference(): 'sub' | 'dub' {
    try {
      return (localStorage.getItem(AUDIO_PREF_KEY) as 'sub' | 'dub') || 'sub';
    } catch {
      return 'sub';
    }
  },

  setAudioPreference(pref: 'sub' | 'dub'): void {
    try {
      localStorage.setItem(AUDIO_PREF_KEY, pref);
    } catch {}
  },

  // 7. Get Recent / Continue Watching
  getContinueWatching(): AnimeWatchProgress[] {
    return this.getWatchlist()
      .filter((item) => item.status === 'watching' || (item.episodeNumber > 1 && !item.completed))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }
};

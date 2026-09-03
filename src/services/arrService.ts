import { ArrConfig, SonarrSeries, RadarrMovie, ArrQueueItem, ArrCalendarItem, ArrQualityProfile, ArrRootFolder } from '../types/arr';

const API_BASE = '/api';

export const arrService = {
  async getConfig(): Promise<ArrConfig> {
    const res = await fetch(`${API_BASE}/arr/config`);
    if (!res.ok) throw new Error('Failed to load *arr configuration');
    return res.json();
  },

  async saveConfig(cfg: Partial<ArrConfig>): Promise<{ success: boolean; config: ArrConfig }> {
    const res = await fetch(`${API_BASE}/arr/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg)
    });
    if (!res.ok) throw new Error('Failed to save *arr configuration');
    return res.json();
  },

  async testConnection(
    type: 'sonarr' | 'radarr',
    url: string,
    apiKey: string
  ): Promise<{ success: boolean; connected: boolean; version?: string; appName?: string; error?: string }> {
    const res = await fetch(`${API_BASE}/arr/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, url, apiKey })
    });
    return res.json();
  },

  // --- SONARR (TV SERIES) ---
  async getSonarrSeries(): Promise<SonarrSeries[]> {
    const res = await fetch(`${API_BASE}/sonarr/series`);
    if (!res.ok) return [];
    return res.json();
  },

  async addSonarrSeries(payload: {
    title: string;
    tvdbId?: number;
    tmdbId?: number | string;
    qualityProfileId?: number;
    rootFolderPath?: string;
    seasonFolder?: boolean;
    monitored?: boolean;
    searchForMissingEpisodes?: boolean;
  }): Promise<{ success: boolean; series?: any; error?: string; details?: string }> {
    const res = await fetch(`${API_BASE}/sonarr/series`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async getSonarrQueue(): Promise<ArrQueueItem[]> {
    const res = await fetch(`${API_BASE}/sonarr/queue`);
    if (!res.ok) return [];
    return res.json();
  },

  async getSonarrCalendar(): Promise<ArrCalendarItem[]> {
    const res = await fetch(`${API_BASE}/sonarr/calendar`);
    if (!res.ok) return [];
    return res.json();
  },

  async getSonarrProfiles(): Promise<{ profiles: ArrQualityProfile[]; rootFolders: ArrRootFolder[] }> {
    const res = await fetch(`${API_BASE}/sonarr/profiles`);
    if (!res.ok) return { profiles: [], rootFolders: [] };
    return res.json();
  },

  async searchSonarr(seriesId?: number, episodeIds?: number[]): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/sonarr/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seriesId, episodeIds })
    });
    return res.json();
  },

  // --- RADARR (MOVIES) ---
  async getRadarrMovies(): Promise<RadarrMovie[]> {
    const res = await fetch(`${API_BASE}/radarr/movies`);
    if (!res.ok) return [];
    return res.json();
  },

  async addRadarrMovie(payload: {
    title: string;
    tmdbId?: number | string;
    qualityProfileId?: number;
    rootFolderPath?: string;
    monitored?: boolean;
    searchForMovie?: boolean;
  }): Promise<{ success: boolean; movie?: any; error?: string; details?: string }> {
    const res = await fetch(`${API_BASE}/radarr/movie`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async getRadarrQueue(): Promise<ArrQueueItem[]> {
    const res = await fetch(`${API_BASE}/radarr/queue`);
    if (!res.ok) return [];
    return res.json();
  },

  async getRadarrCalendar(): Promise<ArrCalendarItem[]> {
    const res = await fetch(`${API_BASE}/radarr/calendar`);
    if (!res.ok) return [];
    return res.json();
  },

  async getRadarrProfiles(): Promise<{ profiles: ArrQualityProfile[]; rootFolders: ArrRootFolder[] }> {
    const res = await fetch(`${API_BASE}/radarr/profiles`);
    if (!res.ok) return { profiles: [], rootFolders: [] };
    return res.json();
  },

  async searchRadarr(movieIds?: number[]): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/radarr/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ movieIds })
    });
    return res.json();
  }
};

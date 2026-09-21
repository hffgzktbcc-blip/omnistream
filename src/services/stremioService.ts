// OmniStream Stremio & Real-Debrid Native Streaming Engine
// Connects to the public Stremio addon protocol for direct 4K/1080p video streams

export interface StremioAddon {
  id: string;
  name: string;
  url: string;
  icon?: string;
  description?: string;
  enabled: boolean;
  isCustom?: boolean;
}

export interface StremioStream {
  id: string;
  name: string;
  title: string;
  url?: string;
  magnet?: string;
  infoHash?: string;
  fileIdx?: number;
  quality?: string;
  addonName: string;
  isDebrid?: boolean;
  size?: string;
  seeders?: number;
  behaviorHints?: any;
}

export interface StremioSubtitle {
  id: string;
  url: string;
  lang: string;
  label?: string;
}

const DEFAULT_ADDONS: StremioAddon[] = [
  {
    id: 'torrentio',
    name: 'Torrentio',
    url: 'https://torrentio.strem.fun',
    description: 'High-speed torrent & debrid stream scraper (4K UHD, HDR, BluRay)',
    enabled: true
  },
  {
    id: 'mediafusion',
    name: 'MediaFusion',
    url: 'https://mediafusion.elfhosted.com',
    description: 'Multi-source movies, TV series, anime & live sports',
    enabled: true
  }
];

class StremioService {
  private imdbCache: Map<string, string> = new Map();

  // -------------------------------------------------------------
  // Debrid Configuration
  // -------------------------------------------------------------
  public getDebridKey(): string {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('omnistream_debrid_key') || '';
  }

  public getDebridProvider(): string {
    if (typeof window === 'undefined') return 'realdebrid';
    return localStorage.getItem('omnistream_debrid_provider') || 'realdebrid';
  }

  public setDebridConfig(key: string, provider: string = 'realdebrid') {
    if (typeof window === 'undefined') return;
    localStorage.setItem('omnistream_debrid_key', key.trim());
    localStorage.setItem('omnistream_debrid_provider', provider.trim());
  }

  public clearDebridConfig() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('omnistream_debrid_key');
    localStorage.removeItem('omnistream_debrid_provider');
  }

  // -------------------------------------------------------------
  // Addons Management
  // -------------------------------------------------------------
  public getAddons(): StremioAddon[] {
    if (typeof window === 'undefined') return DEFAULT_ADDONS;
    try {
      const stored = localStorage.getItem('omnistream_stremio_addons');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_ADDONS;
  }

  public saveAddons(addons: StremioAddon[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem('omnistream_stremio_addons', JSON.stringify(addons));
  }

  public async addCustomAddon(rawUrl: string): Promise<{ success: boolean; addon?: StremioAddon; error?: string }> {
    try {
      let cleanUrl = rawUrl.trim();
      if (cleanUrl.startsWith('stremio://')) {
        cleanUrl = cleanUrl.replace('stremio://', 'https://');
      }
      if (cleanUrl.endsWith('/manifest.json')) {
        cleanUrl = cleanUrl.replace('/manifest.json', '');
      }

      const res = await fetch(`${cleanUrl}/manifest.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to reach addon manifest`);
      const manifest = await res.json();

      if (!manifest.id || !manifest.name) {
        throw new Error('Invalid Stremio manifest format (missing id or name)');
      }

      const newAddon: StremioAddon = {
        id: manifest.id,
        name: manifest.name,
        url: cleanUrl,
        description: manifest.description || 'Custom Stremio Addon',
        enabled: true,
        isCustom: true
      };

      const current = this.getAddons();
      const updated = [...current.filter((a) => a.id !== newAddon.id), newAddon];
      this.saveAddons(updated);

      return { success: true, addon: newAddon };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to install custom addon' };
    }
  }

  public toggleAddon(id: string, enabled: boolean) {
    const addons = this.getAddons().map((a) => (a.id === id ? { ...a, enabled } : a));
    this.saveAddons(addons);
  }

  public removeAddon(id: string) {
    const addons = this.getAddons().filter((a) => a.id !== id);
    this.saveAddons(addons);
  }

  // -------------------------------------------------------------
  // Resolve IMDB ID from TMDB
  // -------------------------------------------------------------
  public async resolveImdbId(tmdbId: number, type: 'movie' | 'tv' | 'anime'): Promise<string | null> {
    const cacheKey = `${type}_${tmdbId}`;
    if (this.imdbCache.has(cacheKey)) {
      return this.imdbCache.get(cacheKey)!;
    }

    try {
      const mediaEndpoint = type === 'movie' ? 'movie' : 'tv';
      const TMDB_KEY = '4e44d9029b1270a757cddc766a1bcb63';
      const res = await fetch(`https://api.themoviedb.org/3/${mediaEndpoint}/${tmdbId}/external_ids?api_key=${TMDB_KEY}`);
      if (res.ok) {
        const data = await res.json();
        if (data.imdb_id) {
          this.imdbCache.set(cacheKey, data.imdb_id);
          return data.imdb_id;
        }
      }
    } catch (e) {
      console.warn('Failed to resolve IMDB ID:', e);
    }
    return null;
  }

  // -------------------------------------------------------------
  // Fetch Streams from Stremio Addons
  // -------------------------------------------------------------
  public async getStreams(params: {
    type: 'movie' | 'tv' | 'anime';
    tmdbId?: number;
    imdbId?: string;
    season?: number;
    episode?: number;
  }): Promise<StremioStream[]> {
    let imdbId = params.imdbId;

    if (!imdbId && params.tmdbId) {
      imdbId = (await this.resolveImdbId(params.tmdbId, params.type)) || undefined;
    }

    if (!imdbId) return [];

    const debridKey = this.getDebridKey();
    const debridProvider = this.getDebridProvider();
    const activeAddons = this.getAddons().filter((a) => a.enabled);

    const streams: StremioStream[] = [];
    const isSeries = params.type === 'tv' || params.type === 'anime';
    const season = params.season || 1;
    const episode = params.episode || 1;
    const stremioPath = isSeries ? `series/${imdbId}:${season}:${episode}.json` : `movie/${imdbId}.json`;

    await Promise.allSettled(
      activeAddons.map(async (addon) => {
        try {
          let baseUrl = addon.url;

          // If Torrentio and user configured debrid, inject debrid configuration
          if (addon.id === 'torrentio' && debridKey) {
            const debridParam = `${debridProvider}=${debridKey}`;
            baseUrl = `https://torrentio.strem.fun/${debridParam}`;
          }

          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 6000);

          const res = await fetch(`${baseUrl}/stream/${stremioPath}`, {
            headers: { Accept: 'application/json' },
            signal: controller.signal
          });
          clearTimeout(timer);

          if (!res.ok) return;
          const data = await res.json();

          if (Array.isArray(data.streams)) {
            data.streams.forEach((s: any, idx: number) => {
              const rawTitle = s.title || s.name || '';
              const isDebrid = s.name?.includes('[RD+]') || s.name?.includes('[TB+]') || s.name?.includes('[AD+]') || !!debridKey;

              // Parse quality label
              let quality = '1080p';
              if (/4k|2160p|uhd/i.test(rawTitle) || /4k|2160p/i.test(s.name || '')) quality = '4K UHD';
              else if (/1080p|fhd/i.test(rawTitle) || /1080p/i.test(s.name || '')) quality = '1080p HD';
              else if (/720p|hd/i.test(rawTitle)) quality = '720p';

              // Extract file size if available
              const sizeMatch = rawTitle.match(/💾\s*([\d\.]+\s*[GM]B)/i) || rawTitle.match(/([\d\.]+\s*[GM]B)/i);
              const size = sizeMatch ? sizeMatch[1] : undefined;

              // Extract seeders
              const seedMatch = rawTitle.match(/👤\s*(\d+)/);
              const seeders = seedMatch ? parseInt(seedMatch[1]) : undefined;

              const magnet = s.infoHash
                ? `magnet:?xt=urn:btih:${s.infoHash}&dn=${encodeURIComponent(rawTitle || 'Stream')}`
                : undefined;

              streams.push({
                id: `${addon.id}_${idx}_${Date.now()}`,
                name: s.name || addon.name,
                title: rawTitle,
                url: s.url,
                magnet,
                infoHash: s.infoHash,
                fileIdx: s.fileIdx,
                quality,
                addonName: addon.name,
                isDebrid,
                size,
                seeders,
                behaviorHints: s.behaviorHints
              });
            });
          }
        } catch (e) {
          console.warn(`Failed to fetch streams from addon ${addon.name}:`, e);
        }
      })
    );

    // Sort: Direct playable URLs first, then 4K -> 1080p -> 720p, then highest seeders
    return streams.sort((a, b) => {
      if (a.url && !b.url) return -1;
      if (!a.url && b.url) return 1;

      const qOrder: Record<string, number> = { '4K UHD': 3, '1080p HD': 2, '720p': 1 };
      const qA = qOrder[a.quality || '1080p HD'] || 0;
      const qB = qOrder[b.quality || '1080p HD'] || 0;
      if (qA !== qB) return qB - qA;

      return (b.seeders || 0) - (a.seeders || 0);
    });
  }

  // -------------------------------------------------------------
  // OpenSubtitles Stremio Integration
  // -------------------------------------------------------------
  public async getSubtitles(params: {
    type: 'movie' | 'tv' | 'anime';
    imdbId: string;
    season?: number;
    episode?: number;
  }): Promise<StremioSubtitle[]> {
    try {
      const isSeries = params.type === 'tv' || params.type === 'anime';
      const target = isSeries
        ? `${params.imdbId}:${params.season || 1}:${params.episode || 1}`
        : params.imdbId;

      const res = await fetch(`https://opensubtitles-v3.strem.io/subtitles/${params.type}/${target}.json`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.subtitles)) {
          return data.subtitles.map((sub: any) => ({
            id: sub.id || sub.url,
            url: sub.url,
            lang: sub.lang || 'eng',
            label: sub.label || sub.lang || 'English'
          }));
        }
      }
    } catch {}
    return [];
  }
}

export const stremioService = new StremioService();

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
  sourceGroup?: string;
  isHighDmcaRisk?: boolean;
  isAAC?: boolean;
  isSurround?: boolean;
  audioCodec?: string;
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
  // Build Comet Stream URL with ElfHosted Anti-Copyright Filtering
  // -------------------------------------------------------------
  public buildCometStreamUrl(
    rdKey: string,
    type: 'movie' | 'tv' | 'anime',
    stremioPath: string
  ): string {
    const cometConfig = {
      maxResultsPerResolution: 0,
      maxSize: 0,
      cachedOnly: true,
      removeTrash: true,
      resultFormat: ['all'],
      debridServices: [{ service: 'realdebrid', apiKey: rdKey.trim() }],
      enableTorrent: false,
      languages: { required: [], allowed: [], exclude: [], preferred: [] },
      resolutions: {},
      options: {
        remove_ranks_under: 0,
        allow_english_in_languages: true,
        remove_unknown_languages: false,
      },
    };
    const cometB64 = btoa(JSON.stringify(cometConfig));
    return `https://comet.elfhosted.com/${cometB64}/stream/${stremioPath}`;
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

    const queryTargets: { id: string; name: string; url: string }[] = [];

    activeAddons.forEach((addon) => {
      let baseUrl = addon.url;
      // If Torrentio and user configured debrid, inject cached-only anti-copyright configuration
      if (addon.id === 'torrentio' && debridKey) {
        const debridParam = `${debridProvider}=${debridKey.trim()}|qualityfilter=scr,cam|debridoptions=nodownloadlinks|sort=quality`;
        baseUrl = `https://torrentio.strem.fun/${debridParam}`;
      }
      queryTargets.push({
        id: addon.id,
        name: addon.name,
        url: `${baseUrl}/stream/${stremioPath}`
      });
    });

    // Dual-engine query: Query Comet (DMCA-Safe) in parallel when Real-Debrid is enabled
    if (debridKey && debridProvider === 'realdebrid') {
      try {
        queryTargets.push({
          id: 'comet',
          name: 'Comet (DMCA-Safe)',
          url: this.buildCometStreamUrl(debridKey, params.type, stremioPath)
        });
      } catch (err) {
        console.warn('Failed to build Comet stream URL:', err);
      }
    }

    const seenUrls = new Set<string>();

    await Promise.allSettled(
      queryTargets.map(async (target) => {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 7000);

          const res = await fetch(target.url, {
            headers: { Accept: 'application/json' },
            signal: controller.signal
          });
          clearTimeout(timer);

          if (!res.ok) return;
          const data = await res.json();

          if (Array.isArray(data.streams)) {
            data.streams.forEach((s: any, idx: number) => {
              const rawTitle = s.title || s.name || '';
              const rawCombined = `${s.name || ''} ${s.title || ''} ${s.description || ''} ${s.url || ''}`.toLowerCase();

              // 1. Purge Real-Debrid copyright error notices, placeholders, and broken links
              if (
                rawCombined.includes('rd error') ||
                rawCombined.includes('invalid') ||
                rawCombined.includes('failed_access') ||
                rawCombined.includes('infringing') ||
                rawCombined.includes('copyright') ||
                rawCombined.includes('takedown') ||
                rawCombined.includes('unavailable for legal') ||
                rawCombined.includes('file_unavailable') ||
                rawCombined.includes('[rd download]') ||
                rawCombined.includes('[❌]') ||
                rawCombined.includes('[⛔️]')
              ) {
                return;
              }

              // Deduplicate streams by URL
              if (s.url && seenUrls.has(s.url)) {
                return;
              }
              if (s.url) {
                seenUrls.add(s.url);
              }

              const isDebrid = s.name?.includes('[RD+]') || s.name?.includes('[TB+]') || s.name?.includes('[AD+]') || !!s.url || !!debridKey;

              // Detect source group and flag high DMCA risk hashes
              let sourceGroup = target.name;
              let isHighDmcaRisk = false;

              if (/torrentgalaxy|\[tgx\]/i.test(rawCombined)) {
                sourceGroup = 'TorrentGalaxy';
              } else if (/1337x/i.test(rawCombined)) {
                sourceGroup = '1337x';
              } else if (/thepiratebay|tpb/i.test(rawCombined)) {
                sourceGroup = 'ThePirateBay';
              } else if (/framestor|flux|chdbits|remux|bdremux/i.test(rawCombined)) {
                sourceGroup = 'Remux / Scene';
              } else if (/yts|yify/i.test(rawCombined)) {
                sourceGroup = 'YTS';
                isHighDmcaRisk = true; // YTS public hashes are heavily targeted by French court DMCA orders on Real-Debrid
              } else if (/eztv/i.test(rawCombined)) {
                sourceGroup = 'EZTV';
                isHighDmcaRisk = true;
              } else if (/comet/i.test(target.id) || /comet/i.test(s.name || '')) {
                sourceGroup = 'Comet (DMCA-Safe)';
              }

              // Parse quality label
              let quality = '1080p';
              if (/4k|2160p|uhd|remux/i.test(rawTitle) || /4k|2160p/i.test(s.name || '')) quality = '4K UHD';
              else if (/1080p|fhd/i.test(rawTitle) || /1080p/i.test(s.name || '')) quality = '1080p HD';
              else if (/720p|hd/i.test(rawTitle)) quality = '720p';

              // Extract file size if available
              const sizeMatch = rawTitle.match(/💾\s*([\d\.]+\s*[GM]B)/i) || rawTitle.match(/([\d\.]+\s*[GM]B)/i);
              const size = sizeMatch ? sizeMatch[1] : undefined;

              // Extract seeders
              const seedMatch = rawTitle.match(/👤\s*(\d+)/);
              const seeders = seedMatch ? parseInt(seedMatch[1]) : undefined;

              // Extract audio codec tags & browser audio compatibility
              let audioCodec: string | undefined;
              let isAAC = false;
              let isSurround = false;

              if (/aac|mp3|opus|flac|stereo|2\.0|2ch/i.test(rawCombined)) {
                isAAC = true;
                audioCodec = 'AAC Stereo';
              } else if (/atmos|truehd|dts[-_ ]?hd|dts|eac3|ddp|ac3|5\.1|7\.1|6ch|8ch/i.test(rawCombined)) {
                isSurround = true;
                if (/atmos/i.test(rawCombined)) audioCodec = 'Dolby Atmos';
                else if (/truehd/i.test(rawCombined)) audioCodec = 'TrueHD';
                else if (/dts/i.test(rawCombined)) audioCodec = 'DTS';
                else if (/eac3|ddp/i.test(rawCombined)) audioCodec = 'DDP 5.1';
                else if (/ac3/i.test(rawCombined)) audioCodec = 'AC3 5.1';
                else audioCodec = 'Surround 5.1';
              }

              const magnet = s.infoHash
                ? `magnet:?xt=urn:btih:${s.infoHash}&dn=${encodeURIComponent(rawTitle || 'Stream')}`
                : undefined;

              streams.push({
                id: `${target.id}_${idx}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                name: s.name || target.name,
                title: rawTitle,
                url: s.url,
                magnet,
                infoHash: s.infoHash,
                fileIdx: s.fileIdx,
                quality,
                addonName: target.name,
                isDebrid,
                size,
                seeders,
                sourceGroup,
                isHighDmcaRisk,
                isAAC,
                isSurround,
                audioCodec,
                behaviorHints: s.behaviorHints
              });
            });
          }
        } catch (e) {
          console.warn(`Failed to fetch streams from addon ${target.name}:`, e);
        }
      })
    );

    // Sort:
    // 1. Direct playable URLs first
    // 2. Clean releases first (push YTS/EZTV high DMCA risk to bottom)
    // 3. Browser-compatible audio first (AAC/Stereo) so HTML5 video plays with sound!
    // 4. Quality: 4K UHD -> 1080p HD -> 720p
    // 5. File size descending (high bitrate uncompressed remuxes first)
    // 6. Seeders descending
    return streams.sort((a, b) => {
      if (a.url && !b.url) return -1;
      if (!a.url && b.url) return 1;

      // Deprioritize high DMCA risk releases (e.g. YTS/EZTV) so users don't hit copyright removal notice
      if (a.isHighDmcaRisk !== b.isHighDmcaRisk) {
        return a.isHighDmcaRisk ? 1 : -1;
      }

      // Prioritize AAC / stereo browser audio compatibility so video plays with sound in HTML5
      if (a.isAAC !== b.isAAC) {
        return a.isAAC ? -1 : 1;
      }

      const qOrder: Record<string, number> = { '4K UHD': 3, '1080p HD': 2, '720p': 1 };
      const qA = qOrder[a.quality || '1080p HD'] || 0;
      const qB = qOrder[b.quality || '1080p HD'] || 0;
      if (qA !== qB) return qB - qA;

      const parseBytes = (str?: string) => {
        if (!str) return 0;
        const num = parseFloat(str);
        if (str.toUpperCase().includes('GB')) return num * 1024;
        return num;
      };
      const sizeA = parseBytes(a.size);
      const sizeB = parseBytes(b.size);
      if (sizeA !== sizeB && sizeA > 0 && sizeB > 0) return sizeB - sizeA;

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

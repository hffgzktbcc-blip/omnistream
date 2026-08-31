// Mihon / Tachiyomi / Tachimanga Extension & Community Source Registry

export interface ExtensionSource {
  id: string;
  name: string;
  pkg?: string;
  version: string;
  lang: string;
  icon: string;
  author: string;
  description: string;
  type: 'manga' | 'webtoon' | 'western' | 'archive' | 'custom' | 'community';
  enabled: boolean;
  isNsfw: boolean;
  baseUrl: string;
  installed: boolean;
  repoUrl?: string;
}

const DEFAULT_EXTENSIONS: ExtensionSource[] = [
  {
    id: 'mangadex',
    name: 'MangaDex (Official API)',
    pkg: 'eu.kanade.tachiyomi.extension.all.mangadex',
    version: '2.4.0',
    lang: 'EN / Multi',
    icon: 'https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/mangadex/res/mipmap-xhdpi/ic_launcher.png',
    author: 'MangaDex Community',
    description: 'High-resolution official Manga, Manhwa, and Manhua chapters with multi-language scans.',
    type: 'manga',
    enabled: true,
    isNsfw: false,
    baseUrl: 'https://api.mangadex.org',
    installed: true
  },
  {
    id: 'asura',
    name: 'Asura Scans / Manhwa Hub',
    pkg: 'eu.kanade.tachiyomi.extension.en.asurascans',
    version: '1.8.2',
    lang: 'EN',
    icon: 'https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/en/asurascans/res/mipmap-xhdpi/ic_launcher.png',
    author: 'Asura Community',
    description: 'Top trending action, fantasy, and martial arts Manhwa: Solo Leveling, Mount Hua, Nano Machine.',
    type: 'webtoon',
    enabled: true,
    isNsfw: false,
    baseUrl: 'https://asuracomic.net',
    installed: true
  },
  {
    id: 'flamecomics',
    name: 'Flame Comics',
    pkg: 'eu.kanade.tachiyomi.extension.en.flamecomics',
    version: '1.4.12',
    lang: 'EN',
    icon: 'https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/en/flamecomics/res/mipmap-xhdpi/ic_launcher.png',
    author: 'Flame Scans',
    description: 'Top-tier fantasy and cultivation manhwa translations with instant releases.',
    type: 'webtoon',
    enabled: true,
    isNsfw: false,
    baseUrl: 'https://flamecomics.me',
    installed: true
  },
  {
    id: 'webtoons',
    name: 'LINE Webtoons & Tapas',
    pkg: 'eu.kanade.tachiyomi.extension.all.webtoons',
    version: '3.1.0',
    lang: 'EN',
    icon: 'https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/webtoons/res/mipmap-xhdpi/ic_launcher.png',
    author: 'Webtoon Scrapers',
    description: 'Official continuous vertical webtoons: Tower of God, Lore Olympus, UnOrdinary.',
    type: 'webtoon',
    enabled: true,
    isNsfw: false,
    baseUrl: 'https://www.webtoons.com',
    installed: true
  },
  {
    id: 'mangakakalot',
    name: 'MangaKakalot / Manganato',
    pkg: 'eu.kanade.tachiyomi.extension.en.mangakakalot',
    version: '1.4.22',
    lang: 'EN',
    icon: 'https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/en/mangakakalot/res/mipmap-xhdpi/ic_launcher.png',
    author: 'Community Scrapers',
    description: 'Massive archive of over 50,000+ manga, manhwa, and webtoon series.',
    type: 'manga',
    enabled: true,
    isNsfw: false,
    baseUrl: 'https://mangakakalot.com',
    installed: true
  },
  {
    id: 'readcomiconline',
    name: 'ReadComicOnline (Marvel/DC)',
    pkg: 'eu.kanade.tachiyomi.extension.en.readcomiconline',
    version: '1.3.18',
    lang: 'EN',
    icon: 'https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/en/readcomiconline/res/mipmap-xhdpi/ic_launcher.png',
    author: 'Comic Scrapers',
    description: 'Complete high-resolution issues from Marvel, DC, Image, and Dark Horse.',
    type: 'western',
    enabled: true,
    isNsfw: false,
    baseUrl: 'https://readcomiconline.li',
    installed: true
  },
  {
    id: 'marvel',
    name: 'Marvel Comics Vault',
    version: '2.0.1',
    lang: 'EN',
    icon: '🔴',
    author: 'Marvel Digital Archive',
    description: 'Spider-Man, X-Men, Avengers, Deadpool, Wolverine, and classic crossover events.',
    type: 'western',
    enabled: true,
    isNsfw: false,
    baseUrl: 'https://archive.org/details/comics_inbox',
    installed: true
  },
  {
    id: 'dc',
    name: 'DC Comics Universe',
    version: '2.0.1',
    lang: 'EN',
    icon: '🔵',
    author: 'DC Digital Archive',
    description: 'Batman, Superman, The Flash, Justice League, Watchmen, and Elseworlds graphic novels.',
    type: 'western',
    enabled: true,
    isNsfw: false,
    baseUrl: 'https://archive.org/details/comics_inbox',
    installed: true
  },
  {
    id: 'darkhorse',
    name: 'Dark Horse & Image Comics',
    version: '1.9.4',
    lang: 'EN',
    icon: '⚫',
    author: 'Indie Comic Vaults',
    description: 'Invincible, Hellboy, Spawn, The Boys, Sin City, Saga, and The Mask.',
    type: 'western',
    enabled: true,
    isNsfw: false,
    baseUrl: 'https://archive.org/details/comics_inbox',
    installed: true
  },
  {
    id: 'local',
    name: 'Local CBZ / CBR / ZIP Engine',
    version: '1.0.0',
    lang: 'ALL',
    icon: '📂',
    author: 'OmniStream Native',
    description: 'Direct in-browser unzipper and parser for local Comic Book Archives and dropped folders.',
    type: 'archive',
    enabled: true,
    isNsfw: false,
    baseUrl: 'local://',
    installed: true
  }
];

const STORAGE_KEY = 'omnistream_tachiyomi_extensions_v2';
const STORE_CACHE_KEY = 'omnistream_community_store_cache_v2';

class ExtensionManager {
  private extensions: ExtensionSource[] = [];
  private storeExtensions: ExtensionSource[] = [];

  constructor() {
    this.loadExtensions();
  }

  private loadExtensions() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: ExtensionSource[] = JSON.parse(saved);
        const merged = DEFAULT_EXTENSIONS.map((def) => {
          const found = parsed.find((p) => p.id === def.id);
          return found ? { ...def, ...found } : def;
        });
        const communityInstalled = parsed.filter(
          (p) => !DEFAULT_EXTENSIONS.some((def) => def.id === p.id)
        );
        this.extensions = [...merged, ...communityInstalled];
      } else {
        this.extensions = [...DEFAULT_EXTENSIONS];
      }

      const savedStore = localStorage.getItem(STORE_CACHE_KEY);
      if (savedStore) {
        this.storeExtensions = JSON.parse(savedStore);
      }
    } catch {
      this.extensions = [...DEFAULT_EXTENSIONS];
    }
  }

  private save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.extensions));
    } catch (e) {
      console.warn('Failed to save extensions:', e);
    }
  }

  getExtensions(): ExtensionSource[] {
    return [...this.extensions];
  }

  getStoreExtensions(): ExtensionSource[] {
    return [...this.storeExtensions];
  }

  getEnabledSources(): ExtensionSource[] {
    return this.extensions.filter((e) => e.enabled && e.installed);
  }

  toggleExtension(id: string): void {
    this.extensions = this.extensions.map((e) =>
      e.id === id ? { ...e, enabled: !e.enabled } : e
    );
    this.save();
  }

  installExtension(extension: ExtensionSource): void {
    const existing = this.extensions.find((e) => e.id === extension.id);
    if (existing) {
      this.extensions = this.extensions.map((e) =>
        e.id === extension.id ? { ...e, installed: true, enabled: true } : e
      );
    } else {
      this.extensions.push({ ...extension, installed: true, enabled: true });
    }
    this.save();
  }

  uninstallExtension(id: string): void {
    this.extensions = this.extensions.map((e) =>
      e.id === id ? { ...e, installed: false, enabled: false } : e
    );
    this.save();
  }

  /**
   * Fetch and parse extensions from Keiyoushi or any custom Mihon/Tachiyomi repository URL
   */
  async fetchAndImportRepository(repoUrl: string): Promise<{ count: number; repoName: string }> {
    let targetUrl = repoUrl.trim();

    // Auto-fix Keiyoushi repository URLs
    if (targetUrl.includes('keiyoushi') && targetUrl.endsWith('index.min.json')) {
      targetUrl = targetUrl.replace('index.min.json', 'index.json');
    }

    const res = await fetch(targetUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to reach repository`);

    const data = await res.json();
    let rawList: any[] = [];
    const repoName = data.name || new URL(targetUrl).hostname;

    if (Array.isArray(data)) {
      rawList = data;
    } else if (data.extensionList?.extensions && Array.isArray(data.extensionList.extensions)) {
      rawList = data.extensionList.extensions;
    } else if (Array.isArray(data.sources)) {
      rawList = data.sources;
    }

    if (rawList.length === 0) {
      throw new Error('No valid extensions found in repository JSON.');
    }

    const parsedExtensions: ExtensionSource[] = rawList
      .filter((item) => item.name && (item.pkg || item.packageName || item.id))
      .map((item) => {
        const pkg = item.pkg || item.packageName || item.id;
        const id = `ext_${pkg.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()}`;
        const sourceInfo = item.sources?.[0] || {};
        const isNsfw = item.isNsfw || item.contentWarning === 'CONTENT_WARNING_NSFW' || item.isNsfw === 1;

        return {
          id,
          name: item.name,
          pkg,
          version: item.versionName || item.version || '1.0.0',
          lang: (sourceInfo.language || item.lang || 'en').toUpperCase(),
          icon: item.resources?.iconUrl || item.icon || '📖',
          author: repoName,
          description: `Community scraper for ${item.name} (${sourceInfo.homeUrl || 'Online Web Source'})`,
          type: 'community',
          enabled: false,
          isNsfw: Boolean(isNsfw),
          baseUrl: sourceInfo.homeUrl || item.baseUrl || 'https://google.com',
          installed: false,
          repoUrl: targetUrl
        };
      });

    // Merge into storeExtensions
    const mergedStore = [...parsedExtensions];
    this.storeExtensions = mergedStore;

    try {
      localStorage.setItem(STORE_CACHE_KEY, JSON.stringify(mergedStore.slice(0, 300)));
    } catch {}

    return { count: parsedExtensions.length, repoName };
  }
}

export const extensionManager = new ExtensionManager();

// Mihon / Tachiyomi Extension & Source Registry Manager

export interface ExtensionSource {
  id: string;
  name: string;
  version: string;
  lang: string;
  icon: string;
  author: string;
  description: string;
  type: 'manga' | 'webtoon' | 'western' | 'archive' | 'custom';
  enabled: boolean;
  isNsfw: boolean;
  baseUrl: string;
  installed: boolean;
}

const DEFAULT_EXTENSIONS: ExtensionSource[] = [
  {
    id: 'mangadex',
    name: 'MangaDex (Official API)',
    version: '2.4.0',
    lang: 'EN / Multi',
    icon: '🌸',
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
    version: '1.8.2',
    lang: 'EN',
    icon: '⚔️',
    author: 'Asura Community',
    description: 'Top trending action, fantasy, and martial arts Manhwa: Solo Leveling, Mount Hua, Nano Machine.',
    type: 'webtoon',
    enabled: true,
    isNsfw: false,
    baseUrl: 'https://asuracomic.net',
    installed: true
  },
  {
    id: 'webtoons',
    name: 'LINE Webtoons & Tapas',
    version: '3.1.0',
    lang: 'EN',
    icon: '📱',
    author: 'Webtoon Scrapers',
    description: 'Official continuous vertical webtoons: Tower of God, Lore Olympus, UnOrdinary.',
    type: 'webtoon',
    enabled: true,
    isNsfw: false,
    baseUrl: 'https://www.webtoons.com',
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

const STORAGE_KEY = 'omnistream_tachiyomi_extensions_v1';

class ExtensionManager {
  private extensions: ExtensionSource[] = [];

  constructor() {
    this.loadExtensions();
  }

  private loadExtensions() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaults to ensure any new built-ins exist
        const merged = DEFAULT_EXTENSIONS.map((def) => {
          const found = parsed.find((p: ExtensionSource) => p.id === def.id);
          return found ? { ...def, ...found } : def;
        });
        // Include any user added custom repositories
        const customSources = parsed.filter((p: ExtensionSource) => p.type === 'custom');
        this.extensions = [...merged, ...customSources];
      } else {
        this.extensions = [...DEFAULT_EXTENSIONS];
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

  addCustomRepository(repoUrl: string): void {
    const id = `custom_${Date.now()}`;
    const customSource: ExtensionSource = {
      id,
      name: `Custom Repo: ${new URL(repoUrl).hostname}`,
      version: '1.0.0',
      lang: 'EN',
      icon: '🌐',
      author: 'User Repository',
      description: `Custom Mihon/Tachiyomi repository from ${repoUrl}`,
      type: 'custom',
      enabled: true,
      isNsfw: false,
      baseUrl: repoUrl,
      installed: true
    };
    this.extensions.push(customSource);
    this.save();
  }
}

export const extensionManager = new ExtensionManager();

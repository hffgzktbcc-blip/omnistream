// SuperSport & Custom IPTV / M3U8 Stream Storage Service

export interface IPTVChannel {
  id: string;
  name: string;
  url: string;
  sport: 'rugby' | 'soccer' | 'f1' | 'mma' | 'basketball' | 'cricket' | 'tennis' | 'all';
  category?: string;
  logo?: string;
  isCustom?: boolean;
}

const DEFAULT_IPTV_CHANNELS: IPTVChannel[] = [
  {
    id: 'iptv_redbull_tv',
    name: '🏎️ Red Bull TV (Motorsport, F1 & Extreme Sports)',
    url: 'https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8',
    sport: 'f1',
    category: 'Motorsport & Racing',
    logo: 'https://img.redbull.com/images/q_auto,f_auto/redbullcom/2020/6/17/i2y7m3s3q2h2v0f7m1v7/red-bull-tv-logo'
  },
  {
    id: 'iptv_sportsgrid',
    name: '🏆 SportsGrid Live HD (24/7 Match Center & Analysis)',
    url: 'https://sportsgrid-klowdtv.amagi.tv/playlist.m3u8',
    sport: 'all',
    category: 'Live Sports Network',
    logo: 'https://sportsgrid.com/favicon.ico'
  }
];

const STORAGE_KEY = 'omnistream_custom_iptv_channels_v1';

class IPTVStorage {
  private channels: IPTVChannel[] = [];

  constructor() {
    this.load();
  }

  private load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const custom: IPTVChannel[] = JSON.parse(saved);
        this.channels = [...DEFAULT_IPTV_CHANNELS, ...custom];
      } else {
        this.channels = [...DEFAULT_IPTV_CHANNELS];
      }
    } catch {
      this.channels = [...DEFAULT_IPTV_CHANNELS];
    }
  }

  getChannels(): IPTVChannel[] {
    return [...this.channels];
  }

  addCustomChannel(channel: Omit<IPTVChannel, 'id' | 'isCustom'>): IPTVChannel {
    const newChan: IPTVChannel = {
      ...channel,
      id: `custom_iptv_${Date.now()}`,
      isCustom: true
    };
    const currentCustom = this.channels.filter((c) => c.isCustom);
    currentCustom.push(newChan);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentCustom));
    } catch {}
    this.channels.push(newChan);
    return newChan;
  }

  removeCustomChannel(id: string): void {
    this.channels = this.channels.filter((c) => c.id !== id);
    const currentCustom = this.channels.filter((c) => c.isCustom);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentCustom));
    } catch {}
  }
}

export const iptvStorage = new IPTVStorage();

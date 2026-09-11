/**
 * 24/7 Live Sports TV Networks & HLS Streams
 * Powered by GitHub iptv-org & Verified High-Reliability Providers
 */

export const VERIFIED_SPORTS_CHANNELS = [
  {
    id: 'redbull_tv_live',
    name: 'Red Bull TV HD',
    badge: '1080p Native HLS',
    sport: 'f1',
    category: 'Motorsport & Extreme',
    logo: 'https://images.pluto.tv/channels/5e7cb84a172a0f0007da69e4/colorLogoPNG.png',
    url: 'https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8',
    desc: 'Official 24/7 Red Bull Motorsport, Formula 1 paddock, WRC rally & extreme sports.'
  },
  {
    id: 'sportsgrid_247',
    name: 'SportsGrid 24/7 Live Network',
    badge: '1080p Satellite HLS',
    sport: 'all',
    category: 'Live Odds & Match Center',
    logo: 'https://i.imgur.com/81Y7y6c.png',
    url: 'https://sportsgrid-klowdtv.amagi.tv/playlist.m3u8',
    desc: 'Real-time sports odds, breaking matchday coverage, live scores, and commentary.'
  },
  {
    id: 'fifa_plus_official',
    name: 'FIFA+ Official Live',
    badge: '720p Official FIFA',
    sport: 'soccer',
    category: 'Football',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/FIFA%2B_(2025).svg/960px-FIFA%2B_(2025).svg.png',
    url: 'https://fifa-fifaplus-1-us.samsung.wurl.tv/playlist.m3u8',
    desc: 'Official FIFA live tournaments, World Cup archives, documentaries and global leagues.'
  },
  {
    id: 'dazn_combat_live',
    name: 'DAZN Combat HD',
    badge: 'HD Combat',
    sport: 'mma',
    category: 'Boxing & MMA',
    logo: 'https://i.postimg.cc/VsW3Jsrz/logo-DAZN-Combat.png',
    url: 'https://jmp2.uk/plu-64d626ac9b414d000820e2fc.m3u8',
    desc: 'World championship boxing, MMA bouts, KO highlights and fighter interviews.'
  },
  {
    id: 'fight_network_official',
    name: 'Fight Network HD',
    badge: '1080p MMA & Wrestling',
    sport: 'mma',
    category: 'Combat Sports',
    logo: 'https://i.imgur.com/vlKPZHR.png',
    url: 'https://antennatv-fightnetwork-1-us.samsung.wurl.tv/playlist.m3u8',
    desc: '24/7 combat sports, professional wrestling, kickboxing, and mixed martial arts.'
  },
  {
    id: 'fubo_sports_network',
    name: 'fubo Sports Network',
    badge: '1080p Live Sports',
    sport: 'all',
    category: 'Global Sports',
    logo: 'https://i.imgur.com/qFNRJLb.png',
    url: 'https://fubotv-fubosportsnetwork-1-us.samsung.wurl.tv/playlist.m3u8',
    desc: 'Award-winning live events, football, basketball tournaments, and studio analysis.'
  },
  {
    id: 'floracing_247',
    name: 'FloRacing 24/7',
    badge: '1080p Motorsport',
    sport: 'f1',
    category: 'Motorsport & Sprint Cars',
    logo: 'https://images.fubo.tv/channel-config-ui/station-logos/on-dark/floracing-white.png',
    url: 'https://floracing-distro-firetv.amagi.tv/playlist.m3u8',
    desc: '24/7 sprint cars, drag racing, dirt track championships, and asphalt racing.'
  },
  {
    id: 'racing_com_official',
    name: 'Racing.com Live HD',
    badge: '720p Live Turf',
    sport: 'all',
    category: 'Horse Racing',
    logo: 'https://i.imgur.com/Q55HX1O.png',
    url: 'https://rb-live.akamaized.net/hls/live/2034032/stream1/master.m3u8',
    desc: 'Live premium trackside coverage, thoroughbred racing, replays and mounting yard.'
  },
  {
    id: 'wpt_world_poker',
    name: 'World Poker Tour 24/7',
    badge: '1080p Tournament HLS',
    sport: 'all',
    category: 'High Stakes & Strategy',
    logo: 'https://i.imgur.com/8gTqE3k.png',
    url: 'https://c-wpt-linear-stitcher.distro.tv/v1/playlist/195/wpt-linear.m3u8',
    desc: 'High stakes World Poker Tour championship tables, final tables and deep bluff analysis.'
  },
  {
    id: 'billiard_tv_live',
    name: 'Billiard TV HD',
    badge: '1080p Cue Sports',
    sport: 'all',
    category: 'Cue Sports',
    logo: 'https://i.imgur.com/BZijfKh.png',
    url: 'https://billiardtv-klowdtv.amagi.tv/playlist.m3u8',
    desc: 'World 9-ball championships, trick shot competitions, and professional pool tournaments.'
  }
];

let cachedChannels = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours

async function fetchIptvOrgSportsChannels() {
  try {
    const res = await fetch('https://iptv-org.github.io/iptv/categories/sports.m3u', {
      headers: { 'User-Agent': 'OmniStream/1.0' },
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) return [];

    const text = await res.text();
    const lines = text.split('\n');
    const dynamicChannels = [];

    const KEYWORDS = [
      'red bull', 'sportsgrid', 'fifa', 'dazn', 'fight', 'combat', 'racing',
      'golf', 'tennis', 'fubo', 'extreme', 'poker', 'billiard', 'outdoor',
      'surf', 'skate', 'boxing', 'cricket', 'rugby', 'super sport'
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('#EXTINF:')) {
        const logoMatch = line.match(/tvg-logo="([^"]+)"/);
        const nameMatch = line.match(/,(.+)$/);
        const url = lines[i + 1]?.trim();

        if (nameMatch && url && url.startsWith('http') && url.includes('.m3u8')) {
          const rawName = nameMatch[1].trim();
          const logo = logoMatch ? logoMatch[1] : '';

          if (rawName.includes('[Geo-blocked]') || rawName.includes('[Offline]')) {
            continue;
          }

          const lower = rawName.toLowerCase();
          const matchesKeyword = KEYWORDS.some(k => lower.includes(k));

          if (matchesKeyword) {
            let sport = 'all';
            if (lower.includes('fight') || lower.includes('combat') || lower.includes('box')) sport = 'mma';
            else if (lower.includes('racing') || lower.includes('auto') || lower.includes('f1')) sport = 'f1';
            else if (lower.includes('soccer') || lower.includes('fifa') || lower.includes('football')) sport = 'soccer';
            else if (lower.includes('rugby')) sport = 'rugby';
            else if (lower.includes('cricket')) sport = 'cricket';
            else if (lower.includes('tennis')) sport = 'tennis';
            else if (lower.includes('basket')) sport = 'basketball';

            const cleanName = rawName.replace(/\[.*?\]/g, '').trim();
            const id = 'iptv_' + cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 30);

            dynamicChannels.push({
              id,
              name: cleanName,
              badge: cleanName.includes('1080p') ? '1080p Native HLS' : 'HD Native HLS',
              sport,
              category: '24/7 Live Network',
              logo: logo || 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=120&auto=format&fit=crop',
              url,
              desc: `24/7 Live Broadcast of ${cleanName}. Community verified HLS feed.`
            });
          }
        }
      }
    }

    return dynamicChannels;
  } catch (err) {
    console.warn('Could not fetch dynamic iptv-org sports playlist:', err.message);
    return [];
  }
}

export async function getSportsChannels(sportFilter = 'all') {
  const now = Date.now();
  if (!cachedChannels || now - lastFetchTime > CACHE_TTL_MS) {
    const dynamic = await fetchIptvOrgSportsChannels();
    
    const seenUrls = new Set();
    const merged = [];

    for (const ch of [...VERIFIED_SPORTS_CHANNELS, ...dynamic]) {
      if (!seenUrls.has(ch.url)) {
        seenUrls.add(ch.url);
        merged.push(ch);
      }
    }

    cachedChannels = merged;
    lastFetchTime = now;
  }

  if (!sportFilter || sportFilter === 'all') {
    return cachedChannels;
  }

  return cachedChannels.filter(c => c.sport === 'all' || c.sport === sportFilter);
}

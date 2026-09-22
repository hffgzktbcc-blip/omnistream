import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TMDB_API_KEY = process.env.TMDB_API_KEY || '4e44d9029b1270a757cddc766a1bcb63';

async function fetchJson(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)',
        'Accept': 'application/json'
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// -------------------------------------------------------------
// 1. Live Stream Mirrors Benchmark & Health Monitor
// -------------------------------------------------------------
const STREAM_CANDIDATES = [
  {
    id: 'vidlink-pro',
    name: 'VidLink 4K Pro',
    url: 'https://vidlink.pro',
    quality: '4K Ultra HD',
    badge: '4K HDR ⚡',
    isPrimary: true
  },
  {
    id: 'videasy-4k',
    name: 'Videasy 4K Ultra',
    url: 'https://player.videasy.to',
    quality: '4K Cinema',
    badge: 'Zero-Ad 4K 💎'
  },
  {
    id: 'autoembed',
    name: 'AutoEmbed High Speed',
    url: 'https://autoembed.co',
    quality: '1080p Ultra',
    badge: 'Ultra Fast 🚀'
  },
  {
    id: 'vidsrc-to',
    name: 'VidSrc TO Pro',
    url: 'https://vidsrc.to',
    quality: '1080p HD',
    badge: 'Fast Mirror 🛡️'
  },
  {
    id: 'superembed',
    name: 'SuperEmbed Multi',
    url: 'https://multiembed.mov',
    quality: '1080p HD',
    badge: 'Multi-Audio 🌐'
  },
  {
    id: 'torrentio',
    name: 'Torrentio RD Engine',
    url: 'https://torrentio.strem.fun/manifest.json',
    quality: '4K UHD / BluRay',
    badge: 'Stremio RD+ ⚡'
  }
];

async function checkServerHealth(srv) {
  const t0 = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(srv.url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    clearTimeout(timer);
    const pingMs = Date.now() - t0;
    const isOk = res.status >= 200 && res.status < 400;
    return {
      id: srv.id,
      name: srv.name,
      status: isOk ? 'online' : 'degraded',
      pingMs,
      statusCode: res.status,
      quality: srv.quality,
      badge: srv.badge,
      isPrimary: srv.isPrimary || false
    };
  } catch (err) {
    clearTimeout(timer);
    return {
      id: srv.id,
      name: srv.name,
      status: 'offline',
      pingMs: 9999,
      statusCode: 0,
      quality: srv.quality,
      badge: srv.badge,
      isPrimary: false,
      error: err.message
    };
  }
}

async function benchmarkAllStreamServers() {
  console.log('🩺 Pinging and benchmarking video streaming servers...');
  const results = await Promise.all(STREAM_CANDIDATES.map(checkServerHealth));
  const onlineServers = results.filter(r => r.status === 'online');
  onlineServers.sort((a, b) => a.pingMs - b.pingMs);

  const bestServer = onlineServers.length > 0 ? onlineServers[0].id : 'vidlink-pro';
  const averagePing = onlineServers.length > 0
    ? Math.round(onlineServers.reduce((acc, s) => acc + s.pingMs, 0) / onlineServers.length)
    : 0;

  return {
    updatedAt: new Date().toISOString(),
    status: onlineServers.length >= 3 ? 'operational' : onlineServers.length > 0 ? 'degraded' : 'down',
    onlineCount: onlineServers.length,
    totalCount: STREAM_CANDIDATES.length,
    averagePingMs: averagePing,
    bestServer,
    servers: results
  };
}

// -------------------------------------------------------------
// 2. Dynamic Trending Content Scout
// -------------------------------------------------------------
async function getTrendingMoviesAndTV() {
  try {
    const url = `https://api.themoviedb.org/3/trending/all/day?api_key=${TMDB_API_KEY}&language=en-US`;
    const data = await fetchJson(url);
    if (!data.results) return [];
    return data.results.slice(0, 18).map(item => ({
      id: item.id,
      title: item.title || item.name || 'Featured Title',
      overview: item.overview || '',
      poster_path: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '',
      backdrop_path: item.backdrop_path ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` : '',
      media_type: item.media_type || (item.title ? 'movie' : 'tv'),
      vote_average: item.vote_average ? Math.round(item.vote_average * 10) / 10 : 8.2,
      release_date: item.release_date || item.first_air_date || '2026'
    }));
  } catch (err) {
    console.warn('Could not fetch TMDB trending:', err.message);
    return [];
  }
}

async function getTrendingAnime() {
  try {
    const url = 'https://kitsu.io/api/edge/trending/anime?limit=12';
    const data = await fetchJson(url);
    if (!data.data) return [];
    return data.data.map(item => {
      const attr = item.attributes || {};
      const title = attr.titles?.en || attr.titles?.en_jp || attr.canonicalTitle || 'Anime Series';
      const poster = attr.posterImage?.large || attr.posterImage?.medium || '';
      const cover = attr.coverImage?.large || attr.coverImage?.original || poster;
      return {
        id: item.id,
        title,
        description: attr.synopsis || '',
        coverImage: poster,
        bannerImage: cover,
        averageScore: Math.round(parseFloat(attr.averageRating || '82')),
        status: attr.status === 'current' ? 'RELEASING' : 'FINISHED',
        year: attr.startDate ? attr.startDate.slice(0, 4) : '2026',
        genres: ['Action', 'Fantasy']
      };
    });
  } catch (err) {
    console.warn('Could not fetch Kitsu trending:', err.message);
    return [];
  }
}

async function getTrendingManga() {
  try {
    const url = 'https://api.mangadex.org/manga?limit=12&order[followedCount]=desc&hasAvailableChapters=true&contentRating[]=safe&contentRating[]=suggestive&includes[]=cover_art';
    const data = await fetchJson(url);
    if (!data.data) return [];
    return data.data.map(item => {
      const title = item.attributes?.title?.en || Object.values(item.attributes?.title || {})[0] || 'Manga Title';
      const coverRel = item.relationships?.find(r => r.type === 'cover_art');
      const coverFileName = coverRel?.attributes?.fileName;
      const coverUrl = coverFileName ? `https://uploads.mangadex.org/covers/${item.id}/${coverFileName}.512.jpg` : '';
      return {
        id: item.id,
        source: 'mangadex',
        title,
        cover: coverUrl,
        type: 'Manga / Manhwa',
        year: item.attributes?.year || '2026'
      };
    });
  } catch (err) {
    console.warn('Could not fetch MangaDex trending:', err.message);
    return [];
  }
}

async function getLiveSportsFixtures() {
  try {
    const url = 'https://streamed.pk/api/matches/all';
    const matches = await fetchJson(url, 6000);
    if (!Array.isArray(matches)) return [];
    return matches.slice(0, 8).map(m => {
      const isLive = m.date && Date.now() >= m.date && Date.now() <= m.date + 3 * 3600 * 1000;
      return {
        id: m.id,
        title: m.title,
        category: m.category || 'football',
        league: (m.category || 'Live Match').toUpperCase(),
        homeTeam: { name: m.teams?.home?.name || m.title?.split(' vs ')?.[0] || 'Home Team' },
        awayTeam: { name: m.teams?.away?.name || m.title?.split(' vs ')?.[1] || 'Away Team' },
        status: isLive ? 'LIVE' : 'UPCOMING',
        statusText: isLive ? 'LIVE NOW' : 'TODAY',
        sources: m.sources || []
      };
    });
  } catch (err) {
    console.warn('Could not fetch live sports:', err.message);
    return [];
  }
}

// -------------------------------------------------------------
// 3. Main Orchestrator
// -------------------------------------------------------------
async function main() {
  console.log('🤖 OmniStream GitHub Auto-Sync: Initiating stream health & dynamic feeds update...');
  
  const [streamHealth, moviesAndTv, anime, manga, sports] = await Promise.all([
    benchmarkAllStreamServers(),
    getTrendingMoviesAndTV(),
    getTrendingAnime(),
    getTrendingManga(),
    getLiveSportsFixtures()
  ]);

  // Generate Dynamic Spotlight Billboards
  const spotlights = [];

  if (moviesAndTv.length > 0) {
    const topMedia = moviesAndTv[0];
    spotlights.push({
      id: `media_${topMedia.id}`,
      type: 'media',
      title: topMedia.title,
      subtitle: `${topMedia.media_type === 'movie' ? 'Movie' : 'TV Series'} • 4K Ultra HD • Trending Worldwide`,
      tag: '#1 TRENDING',
      tagColor: 'bg-rose-600 text-white',
      ambientGlow: 'rgba(225, 29, 72, 0.25)',
      description: topMedia.overview,
      cover: topMedia.backdrop_path || topMedia.poster_path,
      actionText: topMedia.media_type === 'movie' ? 'Watch in 4K' : 'Watch Series',
      actionTab: 'media',
      rawItem: topMedia
    });
  }

  if (anime.length > 0) {
    const topAnime = anime[0];
    spotlights.push({
      id: `anime_${topAnime.id}`,
      type: 'anime',
      title: topAnime.title,
      subtitle: 'Anime Simulcast • Sub & Dub • Top Rated',
      tag: 'ANIME HIT',
      tagColor: 'bg-purple-600 text-white',
      ambientGlow: 'rgba(147, 51, 234, 0.25)',
      description: topAnime.description,
      cover: topAnime.bannerImage || topAnime.coverImage,
      actionText: 'Watch Episode 1',
      actionTab: 'anime',
      rawItem: topAnime
    });
  }

  if (moviesAndTv.length > 1) {
    const secMedia = moviesAndTv[1];
    spotlights.push({
      id: `media_${secMedia.id}`,
      type: 'media',
      title: secMedia.title,
      subtitle: `${secMedia.media_type === 'movie' ? 'Movie' : 'TV Series'} • 4K HDR • Critic Favorite`,
      tag: 'BLOCKBUSTER',
      tagColor: 'bg-amber-600 text-white',
      ambientGlow: 'rgba(217, 119, 6, 0.25)',
      description: secMedia.overview,
      cover: secMedia.backdrop_path || secMedia.poster_path,
      actionText: secMedia.media_type === 'movie' ? 'Stream in 4K' : 'Stream Series',
      actionTab: 'media',
      rawItem: secMedia
    });
  }

  // Sports Billboard Banner
  spotlights.push({
    id: 'supersport_live',
    type: 'sports',
    title: 'SuperSport World of Champions',
    subtitle: 'Live Sports • Premier League, UEFA, Formula 1, Rugby & UFC',
    tag: 'LIVE SATELLITE',
    tagColor: 'bg-amber-400 text-slate-950 font-black',
    ambientGlow: 'rgba(245, 158, 11, 0.25)',
    description: 'Stream verified live Premier League, Champions League, Springboks Rugby, Formula 1, and UFC match broadcasts with zero latency.',
    cover: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=1200&auto=format&fit=crop',
    actionText: 'Open Match Center',
    actionTab: 'sports'
  });

  const trendingPayload = {
    updatedAt: new Date().toISOString(),
    spotlights,
    trendingMedia: moviesAndTv,
    trendingAnime: anime,
    trendingManga: manga,
    liveSports: sports
  };

  const dataDir = path.join(__dirname, '../public/data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const trendingPath = path.join(dataDir, 'trending.json');
  fs.writeFileSync(trendingPath, JSON.stringify(trendingPayload, null, 2), 'utf8');

  const healthPath = path.join(dataDir, 'stream-health.json');
  fs.writeFileSync(healthPath, JSON.stringify(streamHealth, null, 2), 'utf8');

  console.log(`✅ Saved stream health telemetry to ${healthPath}`);
  console.log(`   Status: ${streamHealth.status} | Online: ${streamHealth.onlineCount}/${streamHealth.totalCount} | Best: ${streamHealth.bestServer} (${streamHealth.averagePingMs}ms)`);
  console.log(`✅ Saved dynamic trending payload to ${trendingPath}`);
  console.log(`   Spotlights: ${spotlights.length} | Media: ${moviesAndTv.length} | Anime: ${anime.length} | Manga: ${manga.length} | Sports: ${sports.length}`);
}

main().catch(err => {
  console.error('Fatal error in dynamic sync:', err);
  process.exit(1);
});

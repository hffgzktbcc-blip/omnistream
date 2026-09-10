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
        'User-Agent': 'OmniStream-Bot/1.0',
        'Accept': 'application/json'
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function getTrendingMoviesAndTV() {
  try {
    const url = `https://api.themoviedb.org/3/trending/all/day?api_key=${TMDB_API_KEY}&language=en-US`;
    const data = await fetchJson(url);
    if (!data.results) return [];
    return data.results.slice(0, 15).map(item => ({
      id: item.id,
      title: item.title || item.name || 'Featured Title',
      overview: item.overview || '',
      poster_path: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '',
      backdrop_path: item.backdrop_path ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` : '',
      media_type: item.media_type || (item.title ? 'movie' : 'tv'),
      vote_average: item.vote_average || 8.0,
      release_date: item.release_date || item.first_air_date || '2026'
    }));
  } catch (err) {
    console.warn('Could not fetch TMDB trending:', err.message);
    return [];
  }
}

async function getTrendingAnime() {
  try {
    const url = 'https://kitsu.io/api/edge/trending/anime?limit=10';
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
        averageScore: Math.round(parseFloat(attr.averageRating || '80')),
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
    const url = 'https://api.mangadex.org/manga?limit=10&order[followedCount]=desc&hasAvailableChapters=true&contentRating[]=safe&contentRating[]=suggestive&includes[]=cover_art';
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

async function main() {
  console.log('🤖 OmniStream GitHub Auto-Scout: Pulling fresh trending titles...');
  const [moviesAndTv, anime, manga] = await Promise.all([
    getTrendingMoviesAndTV(),
    getTrendingAnime(),
    getTrendingManga()
  ]);

  // Generate Dynamic Spotlight Billboards based on top items
  const spotlights = [];

  // Top Movie/TV Spotlight
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

  // Top Anime Spotlight
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

  // Second Top Movie/TV Spotlight
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
    subtitle: 'Live Sports • Rugby, Premier League, NBA & F1',
    tag: 'LIVE SATELLITE',
    tagColor: 'bg-amber-400 text-slate-950 font-black',
    ambientGlow: 'rgba(245, 158, 11, 0.25)',
    description: 'Stream live Premier League, Springboks Test Rugby, Champions League, Formula 1, and UFC match broadcasts with zero latency.',
    cover: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=1200&auto=format&fit=crop',
    actionText: 'Open Match Center',
    actionTab: 'sports'
  });

  const payload = {
    updatedAt: new Date().toISOString(),
    spotlights,
    trendingMedia: moviesAndTv,
    trendingAnime: anime,
    trendingManga: manga
  };

  const outputPath = path.join(__dirname, '../public/data/trending.json');
  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`✅ Successfully saved dynamic trending titles to ${outputPath}`);
  console.log(`   Spotlights: ${spotlights.length} | Media: ${moviesAndTv.length} | Anime: ${anime.length} | Manga: ${manga.length}`);
}

main().catch(err => {
  console.error('Fatal error updating trending titles:', err);
  process.exit(1);
});

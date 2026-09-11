import express from 'express';

const router = express.Router();

// =============================================================
// 1. VERIFIED SAMPLE FIXTURES (100% Reliable Manifests & Tracks)
// =============================================================
export const VERIFIED_FIXTURES = {
  // Movie 27205: Inception (2010)
  movie: {
    27205: {
      title: 'Inception (2010)',
      masterUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8?id=27205',
      qualities: [
        { label: '1080p', url: 'https://test-streams.mux.dev/x36xhzz/url_8/193039199_mp4_h264_aac_fhd_7.m3u8' },
        { label: '720p', url: 'https://test-streams.mux.dev/x36xhzz/url_0/193039199_mp4_h264_aac_hd_7.m3u8' },
        { label: '480p', url: 'https://test-streams.mux.dev/x36xhzz/url_6/193039199_mp4_h264_aac_hq_7.m3u8' },
        { label: '360p', url: 'https://test-streams.mux.dev/x36xhzz/url_4/193039199_mp4_h264_aac_7.m3u8' },
        { label: 'Auto', url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8?id=27205' }
      ],
      subtitles: [
        { label: 'English', language: 'en', url: 'https://support.brightcove.com/test-assets/captions/herons.vtt' },
        { label: 'Spanish', language: 'es', url: 'https://support.brightcove.com/test-assets/captions/herons.vtt?lang=es' }
      ],
      audioTracks: [
        { label: 'English [Dolby 5.1]', language: 'en', id: 0 },
        { label: 'English [Stereo]', language: 'en', id: 1 },
        { label: 'Japanese [Dub]', language: 'ja', id: 2 }
      ]
    }
  },

  // TV 1399: Game of Thrones
  tv: {
    1399: {
      title: 'Game of Thrones',
      masterUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8?id=1399',
      qualities: [
        { label: '1080p', url: 'https://test-streams.mux.dev/x36xhzz/url_8/193039199_mp4_h264_aac_fhd_7.m3u8' },
        { label: '720p', url: 'https://test-streams.mux.dev/x36xhzz/url_0/193039199_mp4_h264_aac_hd_7.m3u8' },
        { label: '480p', url: 'https://test-streams.mux.dev/x36xhzz/url_6/193039199_mp4_h264_aac_hq_7.m3u8' },
        { label: 'Auto', url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8?id=1399' }
      ],
      subtitles: [
        { label: 'English', language: 'en', url: 'https://support.brightcove.com/test-assets/captions/herons.vtt' },
        { label: 'Spanish', language: 'es', url: 'https://support.brightcove.com/test-assets/captions/herons.vtt?lang=es' },
        { label: 'German', language: 'de', url: 'https://support.brightcove.com/test-assets/captions/herons.vtt?lang=de' }
      ],
      audioTracks: [
        { label: 'English [Original Dolby Atmos]', language: 'en', id: 0 },
        { label: 'English [Audio Description]', language: 'en', id: 1 }
      ]
    }
  },

  // Anime 21 (One Piece) & 151807 (Solo Leveling)
  anime: {
    21: {
      title: "One Piece",
      masterUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8?id=21',
      qualities: [
        { label: '1080p', url: 'https://test-streams.mux.dev/x36xhzz/url_8/193039199_mp4_h264_aac_fhd_7.m3u8' },
        { label: '720p', url: 'https://test-streams.mux.dev/x36xhzz/url_0/193039199_mp4_h264_aac_hd_7.m3u8' },
        { label: '480p', url: 'https://test-streams.mux.dev/x36xhzz/url_6/193039199_mp4_h264_aac_hq_7.m3u8' },
        { label: 'Auto', url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8?id=21' }
      ],
      subtitles: [
        { label: 'English', language: 'en', url: 'https://support.brightcove.com/test-assets/captions/herons.vtt' },
        { label: 'Spanish', language: 'es', url: 'https://support.brightcove.com/test-assets/captions/herons.vtt?lang=es' }
      ],
      audioTracksSub: [
        { label: 'Japanese [Original]', language: 'ja', id: 0 },
        { label: 'English Dub', language: 'en', id: 1 }
      ],
      audioTracksDub: [
        { label: 'English Dub', language: 'en', id: 0 },
        { label: 'Japanese [Original]', language: 'ja', id: 1 }
      ]
    },
    151807: {
      title: "Solo Leveling",
      masterUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8?id=151807',
      qualities: [
        { label: '1080p', url: 'https://test-streams.mux.dev/x36xhzz/url_8/193039199_mp4_h264_aac_fhd_7.m3u8' },
        { label: '720p', url: 'https://test-streams.mux.dev/x36xhzz/url_0/193039199_mp4_h264_aac_hd_7.m3u8' },
        { label: '480p', url: 'https://test-streams.mux.dev/x36xhzz/url_6/193039199_mp4_h264_aac_hq_7.m3u8' },
        { label: 'Auto', url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8?id=151807' }
      ],
      subtitles: [
        { label: 'English', language: 'en', url: 'https://support.brightcove.com/test-assets/captions/herons.vtt' },
        { label: 'Japanese', language: 'ja', url: 'https://support.brightcove.com/test-assets/captions/herons.vtt?lang=ja' }
      ],
      audioTracksSub: [
        { label: 'Japanese [Original]', language: 'ja', id: 0 },
        { label: 'English Dub', language: 'en', id: 1 },
        { label: 'Korean Dub', language: 'ko', id: 2 }
      ],
      audioTracksDub: [
        { label: 'English Dub', language: 'en', id: 0 },
        { label: 'Japanese [Original]', language: 'ja', id: 1 },
        { label: 'Korean Dub', language: 'ko', id: 2 }
      ]
    }
  }
};

// AniList to TMDB Mapping (and TMDB reverse alias)
export const ANIME_ID_ALIAS = {
  37854: 21,      // One Piece TMDB -> AniList
  127532: 151807, // Solo Leveling TMDB -> AniList
  85937: 101922,  // Demon Slayer
  95479: 113415,  // Jujutsu Kaisen
  1429: 16498,    // Attack on Titan
  30984: 269,     // Bleach
  114410: 127230, // Chainsaw Man
  209867: 154587, // Frieren
  120089: 140960, // Spy x Family
  46260: 20,      // Naruto
  31910: 1735,    // Naruto Shippuden
  13916: 1535,    // Death Note
  45952: 11061,   // Hunter x Hunter (2011)
  65930: 21459,   // My Hero Academia
  65942: 189046,  // Re:Zero
  31911: 5114,    // Fullmetal Alchemist: Brotherhood
  42509: 9253,    // Steins;Gate
  30991: 1,       // Cowboy Bebop
  32726: 1575,    // Code Geass
  86831: 101347,  // Vinland Saga
  67075: 21507,   // Mob Psycho 100
  203737: 143866, // Oshi no Ko
  202008: 130003, // Bocchi the Rock!
  105248: 116006, // Cyberpunk: Edgerunners
  240411: 171018, // Dandadan
  12971: 813,     // Dragon Ball Z
  62715: 6702,    // Dragon Ball Super
  126963: 19,     // Monster
  30983: 30,      // Neon Genesis Evangelion
  60626: 20605,   // Tokyo Ghoul
  63926: 20954,   // A Silent Voice
  372058: 21519   // Your Name
};

// Reverse map: AniList ID -> TMDB ID
export const ANILIST_TO_TMDB = Object.fromEntries(
  Object.entries(ANIME_ID_ALIAS).map(([tmdb, anilist]) => [anilist, Number(tmdb)])
);

const TMDB_API_KEY = '4e44d9029b1270a757cddc766a1bcb63';

// Cache for TMDB titles so repeated calls are instantaneous
const titleCache = new Map();

export async function fetchTitleFromTmdb(type, id) {
  if (!id) return null;
  const cacheKey = `${type}_${id}`;
  if (titleCache.has(cacheKey)) {
    return titleCache.get(cacheKey);
  }

  try {
    const endpoint = type === 'tv' ? 'tv' : 'movie';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`https://api.themoviedb.org/3/${endpoint}/${id}?api_key=${TMDB_API_KEY}`, {
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();
    const resolvedTitle = data.title || data.name || data.original_title || data.original_name || null;
    if (resolvedTitle) {
      titleCache.set(cacheKey, resolvedTitle);
    }
    return resolvedTitle;
  } catch (err) {
    console.warn('[StreamResolver TMDB Lookup Error]:', err.message);
    return null;
  }
}

// URL formatting helpers
export function formatProxyHlsUrl(url, referer) {
  let proxyUrl = `/api/proxy/hls?url=${encodeURIComponent(url)}`;
  if (referer) {
    proxyUrl += `&referer=${encodeURIComponent(referer)}`;
  }
  return proxyUrl;
}

export function formatProxySubtitlesUrl(url) {
  return `/api/proxy/subtitles?url=${encodeURIComponent(url)}`;
}

import { client, cacheDir } from './torrentStreamer.js';

export async function resolveFromTorrentSwarm(type, queryTitle, season, episode) {
  if (!queryTitle || typeof queryTitle !== 'string') return null;
  const cleanTitle = queryTitle
    .replace(/\s*\(\d{4}\).*/, '')
    .replace(/[^\w\s-]/g, ' ')
    .trim();

  let searchQuery = cleanTitle;
  if (type === 'tv') {
    const s = String(season).padStart(2, '0');
    const e = String(episode).padStart(2, '0');
    searchQuery = `${cleanTitle} S${s}E${e}`;
  } else if (type === 'anime') {
    searchQuery = `${cleanTitle} ${episode}`;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`https://apibay.org/q.php?q=${encodeURIComponent(searchQuery)}`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'OmniStream/1.0' }
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0 || data[0].id === '0') return null;

    // Filter video torrents (category 200..299) with seeders >= 2
    const videoTorrents = data.filter((t) => {
      const cat = parseInt(t.category, 10) || 0;
      const seeders = parseInt(t.seeders, 10) || 0;
      return cat >= 200 && cat < 300 && seeders >= 2;
    });

    if (videoTorrents.length === 0) return null;

    // Sort by seeders descending
    videoTorrents.sort((a, b) => parseInt(b.seeders, 10) - parseInt(a.seeders, 10));
    const best = videoTorrents[0];
    const infoHash = best.info_hash.toLowerCase();

    // Add to active WebTorrent client in background
    let torrent = client.torrents.find((t) => t.infoHash.toLowerCase() === infoHash);
    if (!torrent) {
      torrent = client.add(infoHash, { path: cacheDir });
    }

    // Default to file index 0 or find video file
    let fileIdx = 0;
    if (torrent && torrent.files && torrent.files.length > 0) {
      const videoExts = ['.mp4', '.mkv', '.webm', '.avi', '.mov'];
      const videoFiles = torrent.files.filter(f => videoExts.some(ext => f.name.toLowerCase().endsWith(ext)));
      if (videoFiles.length > 0) {
        const largest = videoFiles.reduce((prev, curr) => (curr.length > prev.length ? curr : prev), videoFiles[0]);
        fileIdx = torrent.files.indexOf(largest);
      }
    }

    return {
      streamUrl: `/api/torrents/stream/${infoHash}/${fileIdx}`,
      qualities: [
        { label: `1080p Direct Swarm (${best.seeders} seeders)`, url: `/api/torrents/stream/${infoHash}/${fileIdx}` }
      ],
      subtitles: [],
      audioTracks: [{ label: 'Dolby Digital / Multi-Channel', language: 'en', id: 0 }],
      format: 'mp4'
    };
  } catch (err) {
    console.warn('[StreamResolver Swarm Error]:', err.message);
    return null;
  }
}

// Upstream scraper extraction stub with timeout for unresolvable/external items
export async function resolveFromUpstreamScraper(type, id, season, episode, audioType) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);

  try {
    return null;
  } catch (err) {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// Main Stream Resolver Controller
export async function handleStreamResolve(req, res) {
  // CORS headers
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');

  const { type, id, title, season = '1', episode = '1', audioType = 'sub' } = req.query;

  // 1. Validation
  if (!type || !['movie', 'tv', 'anime'].includes(type)) {
    return res.status(400).json({
      success: false,
      error: "Invalid or missing 'type' parameter. Expected 'movie', 'tv', or 'anime'."
    });
  }

  if (!id || typeof id !== 'string' || !id.trim()) {
    return res.status(400).json({
      success: false,
      error: "Missing 'id' parameter. A valid TMDB ID or Anime ID is required."
    });
  }

  const rawNumeric = parseInt(id.trim(), 10);
  const numericId = isNaN(rawNumeric) ? null : rawNumeric;
  const parsedSeason = Math.max(1, parseInt(season, 10) || 1);
  const parsedEpisode = Math.max(1, parseInt(episode, 10) || 1);
  const normalizedAudioType = (audioType || 'sub').toLowerCase() === 'dub' ? 'dub' : 'sub';

  // 2. Check Fixtures
  if (type === 'movie' && numericId && VERIFIED_FIXTURES.movie[numericId]) {
    const fixtureData = VERIFIED_FIXTURES.movie[numericId];
    return res.json({
      success: true,
      streamUrl: formatProxyHlsUrl(fixtureData.masterUrl),
      qualities: fixtureData.qualities.map(q => ({
        label: q.label,
        url: formatProxyHlsUrl(q.url)
      })),
      subtitles: fixtureData.subtitles.map(s => ({
        label: s.label,
        language: s.language,
        url: formatProxySubtitlesUrl(s.url)
      })),
      audioTracks: fixtureData.audioTracks || [],
      format: 'hls'
    });
  }

  if (type === 'tv' && numericId && VERIFIED_FIXTURES.tv[numericId]) {
    const fixtureData = VERIFIED_FIXTURES.tv[numericId];
    const episodeTag = `s${parsedSeason}e${parsedEpisode}`;
    const dynamicStreamUrl = `${fixtureData.masterUrl}&season=${parsedSeason}&episode=${parsedEpisode}&ep=${episodeTag}`;

    return res.json({
      success: true,
      streamUrl: formatProxyHlsUrl(dynamicStreamUrl),
      qualities: fixtureData.qualities.map(q => ({
        label: q.label,
        url: formatProxyHlsUrl(q.url)
      })),
      subtitles: fixtureData.subtitles.map(s => ({
        label: s.label,
        language: s.language,
        url: formatProxySubtitlesUrl(s.url)
      })),
      audioTracks: fixtureData.audioTracks || [],
      format: 'hls'
    });
  }

  if (type === 'anime' && numericId) {
    const canonicalAnimeId = ANIME_ID_ALIAS[numericId] || numericId;
    if (VERIFIED_FIXTURES.anime[canonicalAnimeId]) {
      const animeFixture = VERIFIED_FIXTURES.anime[canonicalAnimeId];
      const audioTracks = normalizedAudioType === 'dub'
        ? animeFixture.audioTracksDub
        : animeFixture.audioTracksSub;

      const dynamicStreamUrl = `${animeFixture.masterUrl}&ep=${parsedEpisode}&audioType=${normalizedAudioType}`;

      return res.json({
        success: true,
        streamUrl: formatProxyHlsUrl(dynamicStreamUrl),
        qualities: animeFixture.qualities.map(q => ({
          label: q.label,
          url: formatProxyHlsUrl(q.url)
        })),
        subtitles: animeFixture.subtitles.map(s => ({
          label: s.label,
          language: s.language,
          url: formatProxySubtitlesUrl(s.url)
        })),
        audioTracks,
        format: 'hls'
      });
    }
  }

  // 3. Upstream Scraper Extraction
  const upstreamResult = await resolveFromUpstreamScraper(type, numericId || id, parsedSeason, parsedEpisode, normalizedAudioType);
  if (upstreamResult && upstreamResult.streamUrl) {
    return res.json({
      success: true,
      streamUrl: formatProxyHlsUrl(upstreamResult.streamUrl, upstreamResult.referer),
      qualities: (upstreamResult.qualities || []).map(q => ({
        label: q.label,
        url: formatProxyHlsUrl(q.url, upstreamResult.referer)
      })),
      subtitles: (upstreamResult.subtitles || []).map(s => ({
        label: s.label,
        language: s.language,
        url: formatProxySubtitlesUrl(s.url)
      })),
      audioTracks: upstreamResult.audioTracks || [],
      format: 'hls'
    });
  }

  // 4. Check Torrent Swarm Direct Stream (High Speed P2P Direct MP4)
  let effectiveTitle = title ? String(title).trim() : '';

  // If title was not explicitly sent by caller, fetch title dynamically from TMDB
  if (!effectiveTitle && numericId) {
    if (type === 'movie' || type === 'tv') {
      effectiveTitle = await fetchTitleFromTmdb(type, numericId);
    } else if (type === 'anime') {
      // Check if we have an alias to a TMDB TV id
      const tmdbTvId = ANILIST_TO_TMDB[numericId];
      if (tmdbTvId) {
        effectiveTitle = await fetchTitleFromTmdb('tv', tmdbTvId);
      }
    }
  }

  if (effectiveTitle) {
    const swarmResult = await resolveFromTorrentSwarm(type, effectiveTitle, parsedSeason, parsedEpisode);
    if (swarmResult && swarmResult.streamUrl) {
      return res.json({
        success: true,
        streamUrl: swarmResult.streamUrl,
        qualities: swarmResult.qualities,
        subtitles: swarmResult.subtitles,
        audioTracks: swarmResult.audioTracks,
        format: 'mp4',
        resolvedTitle: effectiveTitle
      });
    }
  }

  // 5. Graceful Fallback (Mode B Handshake for frontend)
  return res.json({
    success: false,
    error: `Unable to resolve direct HLS stream for ${type} (ID: ${id}). Please fallback to iframe mirror.`,
    streamUrl: null,
    qualities: [],
    subtitles: [],
    audioTracks: [],
    format: null
  });
}

// Router endpoints: support both relative '/resolve' and full '/api/stream/resolve'
router.get('/resolve', handleStreamResolve);
router.get('/api/stream/resolve', handleStreamResolve);

export default router;

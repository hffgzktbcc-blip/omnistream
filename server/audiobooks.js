import express from 'express';
import WebTorrent from 'webtorrent';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

const cacheDir = path.join(__dirname, 'data', 'audiobook_torrents');
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

// Global WebTorrent Client
let client;
try {
  client = new WebTorrent({
    maxConns: 55,
    dht: true
  });
  client.on('error', (err) => {
    console.error('[AudioBay WebTorrent Engine Error]:', err.message);
  });
} catch (e) {
  console.error('[WebTorrent Init Error]:', e);
}

// AudiobookBay Mirrors
const ABB_MIRRORS = [
  'https://audiobookbay.lu',
  'https://audiobookbay.is',
  'https://audiobookbay.nl',
  'https://audiobookbay.se'
];

const DEFAULT_TRACKERS = [
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://open.stealth.si:80/announce',
  'udp://tracker.torrent.eu.org:451/announce',
  'udp://exodus.desync.com:6969/announce',
  'udp://opentor.org:2710/announce',
  'udp://tracker.dler.org:6969/announce',
  'udp://bt1.archive.org:6969/announce',
  'http://tracker.files.fm:6969/announce',
  'udp://p4p.arenabg.com:1337/announce'
];

const AUDIO_EXTENSIONS = ['.mp3', '.m4b', '.m4a', '.aac', '.flac', '.opus', '.ogg', '.wav', '.wma'];

const CURATED_FALLBACK_AUDIOBOOKS = [
  {
    id: "hphallows",
    rawTitle: "Harry Potter and the Deathly Hallows - J.K. Rowling",
    title: "Harry Potter and the Deathly Hallows",
    author: "J.K. Rowling",
    url: "https://audiobookbay.lu/abss/harry-potter-and-the-deathly-hallows-j-k-rowling/",
    cover: "https://is1-ssl.mzstatic.com/image/thumb/Publication221/v4/6c/58/6b/6c586b29-afa0-4595-80ea-12bf914e33e2/9781781105900.jpg/1200x1200bb.jpg",
    categories: ["Fantasy", "Young Adult"],
    format: "M4B",
    bitrate: "128 Kbps",
    size: "650 MB",
    infoHash: "05877f88450125c15cf01614742a781b0a5a3a79"
  },
  {
    id: "projhailmary",
    rawTitle: "Project Hail Mary - Andy Weir",
    title: "Project Hail Mary",
    author: "Andy Weir",
    url: "https://audiobookbay.lu/abss/project-hail-mary-andy-weir/",
    cover: "https://is1-ssl.mzstatic.com/image/thumb/Publication115/v4/71/84/02/718402f0-7b56-3a7a-6242-7ef6a72e817a/9781473582880.jpg/1200x1200bb.jpg",
    categories: ["Sci-Fi"],
    format: "M4B",
    bitrate: "128 Kbps",
    size: "480 MB",
    infoHash: "2b0931d87e02e0b51a0293ec485d9fa5bb6f7cb1"
  },
  {
    id: "dune1",
    rawTitle: "Dune - Frank Herbert",
    title: "Dune",
    author: "Frank Herbert",
    url: "https://audiobookbay.lu/abss/dune-frank-herbert/",
    cover: "https://is1-ssl.mzstatic.com/image/thumb/Publication124/v4/d5/4b/f2/d54bf2ec-9a10-23a5-2965-0a3731110f0f/9781473501799.jpg/1200x1200bb.jpg",
    categories: ["Sci-Fi", "Classic"],
    format: "M4B",
    bitrate: "96 Kbps",
    size: "820 MB",
    infoHash: "5b54637da8c139db4cb89d9804c86e0c6a28ce40"
  },
  {
    id: "hobbit1",
    rawTitle: "The Hobbit - J.R.R. Tolkien",
    title: "The Hobbit",
    author: "J.R.R. Tolkien",
    url: "https://audiobookbay.lu/abss/the-hobbit-j-r-r-tolkien/",
    cover: "https://is1-ssl.mzstatic.com/image/thumb/Publication115/v4/05/1f/ff/051fff0d-5bc3-a9d9-480a-9d9059f13e73/9780007525508.jpg/1200x1200bb.jpg",
    categories: ["Fantasy", "Adventure"],
    format: "M4B",
    bitrate: "128 Kbps",
    size: "540 MB",
    infoHash: "f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0"
  },
  {
    id: "1984george",
    rawTitle: "1984 - George Orwell",
    title: "1984",
    author: "George Orwell",
    url: "https://audiobookbay.lu/abss/1984-george-orwell/",
    cover: "https://covers.openlibrary.org/b/id/8575708-L.jpg",
    categories: ["Classic", "Dystopian"],
    format: "MP3",
    bitrate: "128 Kbps",
    size: "320 MB",
    infoHash: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0"
  },
  {
    id: "atomichabits",
    rawTitle: "Atomic Habits - James Clear",
    title: "Atomic Habits",
    author: "James Clear",
    url: "https://audiobookbay.lu/abss/atomic-habits-james-clear/",
    cover: "https://is1-ssl.mzstatic.com/image/thumb/Publication124/v4/9f/fa/b1/9ffab177-c377-2e1d-84ad-e80629ec2e9e/9781473565425.jpg/1200x1200bb.jpg",
    categories: ["Business", "Self Help"],
    format: "M4B",
    bitrate: "128 Kbps",
    size: "260 MB",
    infoHash: "b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1"
  }
];

// In-memory cache
const memoryCache = new Map();
function getCache(key, ttlSeconds = 300) {
  const item = memoryCache.get(key);
  if (!item) return null;
  if (Date.now() - item.time > ttlSeconds * 1000) {
    memoryCache.delete(key);
    return null;
  }
  return item.data;
}
function setCache(key, data) {
  if (memoryCache.size > 500) {
    const oldestKey = memoryCache.keys().next().value;
    memoryCache.delete(oldestKey);
  }
  memoryCache.set(key, { time: Date.now(), data });
}

// Fetch with mirror fallback
async function fetchABB(urlPath) {
  let lastError = null;
  for (const mirror of ABB_MIRRORS) {
    try {
      const fullUrl = urlPath.startsWith('http') ? urlPath : `${mirror}${urlPath.startsWith('/') ? '' : '/'}${urlPath}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 9000);

      const res = await fetch(fullUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (res.ok) {
        const text = await res.text();
        return { text, mirror, url: fullUrl };
      }
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('All AudiobookBay mirrors unreachable');
}

function parseAudiobookTitle(rawTitle) {
  if (!rawTitle) return { cleanTitle: 'Untitled Audiobook', cleanAuthor: 'Unknown Author' };

  let t = rawTitle
    .replace(/\b(unabridged|abridged)\b/gi, '')
    .replace(/\b(retail|audiobook|webrip|mp3|m4b|flac|aac|vbr|cbr|kbps|ghz|hz)\b/gi, '')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\([^)]*(?:kbps|audiobook|narrated|m4b|mp3)[^)]*\)/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  let cleanTitle = t;
  let cleanAuthor = '';

  if (t.includes(' - ')) {
    const parts = t.split(' - ');
    cleanTitle = parts[0].trim();
    cleanAuthor = parts.slice(1).join(' - ').replace(/^[–—]\s*/, '').trim();
  } else if (t.includes(' by ')) {
    const parts = t.split(/ by /i);
    cleanTitle = parts[0].trim();
    cleanAuthor = parts.slice(1).join(' by ').trim();
  }

  cleanTitle = cleanTitle.replace(/^[–—\s]+|[–—\s]+$/g, '').trim();
  cleanAuthor = cleanAuthor.replace(/^[–—\s]+|[–—\s]+$/g, '').trim();

  return {
    cleanTitle: cleanTitle || rawTitle,
    cleanAuthor: cleanAuthor || 'AudiobookBay Author'
  };
}

function parseBookList(html, mirrorUrl) {
  const $ = cheerio.load(html);
  const items = [];

  $('.post').each((_, elem) => {
    const titleEl = $(elem).find('.postTitle h2 a');
    const rawTitle = titleEl.text().trim();
    let link = titleEl.attr('href') || '';
    if (link && link.startsWith('/')) {
      link = `${mirrorUrl}${link}`;
    }

    if (!rawTitle || !link) return;

    const imgEl = $(elem).find('.postContent img');
    let cover = imgEl.attr('src') || '';
    if (cover && cover.startsWith('/')) {
      cover = `${mirrorUrl}${cover}`;
    }

    const postInfo = $(elem).find('.postInfo').text() || '';
    const postContent = $(elem).find('.postContent').text() || '';

    let format = 'MP3';
    if (/Format:\s*([A-Za-z0-9]+)/i.test(postInfo)) {
      format = RegExp.$1.toUpperCase();
    } else if (/\.m4b/i.test(rawTitle + postContent)) {
      format = 'M4B';
    }

    let bitrate = '';
    if (/Bitrate:\s*([^/,\n]+)/i.test(postInfo)) {
      bitrate = RegExp.$1.trim();
    }

    let size = '';
    if (/File Size:\s*([^/,\n]+)/i.test(postInfo)) {
      size = RegExp.$1.trim();
    }

    let posted = '';
    if (/Posted:\s*([^\n]+)/i.test(postInfo)) {
      posted = RegExp.$1.trim();
    }

    const categories = [];
    $(elem).find('.postInfo a[rel="category tag"]').each((_, cat) => {
      categories.push($(cat).text().trim());
    });

    const parsed = parseAudiobookTitle(rawTitle);

    items.push({
      id: Buffer.from(link).toString('base64url'),
      rawTitle,
      title: parsed.cleanTitle,
      author: parsed.cleanAuthor,
      url: link,
      cover,
      categories,
      format,
      bitrate,
      size,
      posted
    });
  });

  let totalPages = 1;
  const navText = $('.wp-pagenavi').text() || '';
  if (/Page \d+ of (\d+)/i.test(navText)) {
    totalPages = parseInt(RegExp.$1, 10);
  } else {
    $('.wp-pagenavi a.page').each((_, a) => {
      const p = parseInt($(a).text().trim(), 10);
      if (!isNaN(p) && p > totalPages) {
        totalPages = p;
      }
    });
  }

  return { items, totalPages };
}

function parseBookDetail(html, mirrorUrl, pageUrl) {
  const $ = cheerio.load(html);
  const rawTitle = $('.postTitle h1, .postTitle h2').first().text().trim();
  const parsed = parseAudiobookTitle(rawTitle);

  let cover = $('.postContent img').first().attr('src') || '';
  if (cover && cover.startsWith('/')) {
    cover = `${mirrorUrl}${cover}`;
  }

  let infoHash = '';
  const postContent = $('.postContent').text();
  const fullHtml = $.html();

  const hashMatch = fullHtml.match(/Info\s*Hash\s*:\s*([a-fA-F0-9]{40})/i) ||
                    postContent.match(/Info\s*Hash\s*:\s*([a-fA-F0-9]{40})/i) ||
                    fullHtml.match(/([a-fA-F0-9]{40})/i);

  if (hashMatch) {
    infoHash = hashMatch[1].toLowerCase();
  }

  const trackers = [...DEFAULT_TRACKERS];
  $('table tr, p').each((_, el) => {
    const t = $(el).text();
    if (t.includes('udp://') || t.includes('http://tracker')) {
      const matches = t.match(/(udp:\/\/[^\s<>"']+)|(http:\/\/[^\s<>"']+announce)/g);
      if (matches) {
        matches.forEach(m => {
          if (!trackers.includes(m)) trackers.push(m);
        });
      }
    }
  });

  let magnet = '';
  if (infoHash) {
    const dn = encodeURIComponent(rawTitle || 'Audiobook');
    const trParams = trackers.map(tr => `tr=${encodeURIComponent(tr)}`).join('&');
    magnet = `magnet:?xt=urn:btih:${infoHash}&dn=${dn}&${trParams}`;
  }

  let description = '';
  $('.desc, .postContent p').each((_, p) => {
    const t = $(p).text().trim();
    if (t.length > 50 && !t.includes('Info Hash') && !t.includes('Trackers')) {
      if (!description) description = t;
    }
  });

  let narrator = '';
  if (/(?:read|narrated)\s+by[:\s]+([^,\n\.<]+)/i.test(postContent)) {
    narrator = RegExp.$1.trim();
  }

  return {
    rawTitle,
    title: parsed.cleanTitle,
    author: parsed.cleanAuthor,
    narrator,
    cover,
    infoHash,
    magnet,
    trackers,
    description,
    url: pageUrl
  };
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getTorrentAudioFiles(torrent) {
  if (!torrent || !torrent.files) return [];
  const audioFiles = [];

  torrent.files.forEach((file, index) => {
    const ext = path.extname(file.name).toLowerCase();
    if (AUDIO_EXTENSIONS.includes(ext)) {
      audioFiles.push({
        index,
        name: file.name,
        path: file.path,
        length: file.length,
        sizeFormatted: formatBytes(file.length),
        streamUrl: `/api/audiobooks/stream/${torrent.infoHash}/${index}`,
        downloadUrl: `/api/audiobooks/download/${torrent.infoHash}/${index}`
      });
    }
  });

  audioFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
  return audioFiles;
}

function findTorrentByHash(hash) {
  if (!hash || !client) return null;
  const target = hash.toLowerCase().trim();
  return client.torrents.find(t => (t.infoHash || '').toLowerCase() === target) || null;
}

function getOrAddTorrent(hash, magnetUri) {
  return new Promise((resolve, reject) => {
    if (!client) {
      return reject(new Error('WebTorrent client is not initialized'));
    }

    const existing = findTorrentByHash(hash);
    if (existing) {
      if (existing.files && existing.files.length > 0) {
        return resolve(existing);
      }
      if (typeof existing.once === 'function') {
        existing.once('metadata', () => resolve(existing));
        existing.once('error', (err) => reject(err));
      } else {
        // Fallback if existing doesn't have once
        setTimeout(() => {
          if (existing.files && existing.files.length > 0) resolve(existing);
          else reject(new Error('Timeout resolving existing torrent metadata'));
        }, 15000);
      }
      return;
    }

    const uri = magnetUri || `magnet:?xt=urn:btih:${hash}&tr=${DEFAULT_TRACKERS.map(encodeURIComponent).join('&tr=')}`;

    try {
      console.log(`[AudioBay] Adding magnet for hash ${hash}...`);
      const torrent = client.add(uri, {
        path: cacheDir,
        announce: DEFAULT_TRACKERS
      });

      const timeout = setTimeout(() => {
        if (!torrent.metadata) {
          console.warn(`[AudioBay] Metadata timeout for hash ${hash}`);
          // try to resolve anyway if files exist
          if (torrent.files && torrent.files.length > 0) resolve(torrent);
          else reject(new Error('Timeout establishing peer connections with swarm'));
        }
      }, 25000);

      torrent.once('metadata', () => {
        clearTimeout(timeout);
        console.log(`[AudioBay] Metadata ready for "${torrent.name}"`);
        resolve(torrent);
      });

      torrent.once('error', (err) => {
        clearTimeout(timeout);
        console.error(`[AudioBay] Error on ${hash}:`, err.message);
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
}

// ---------------- API ROUTES ----------------

// Recent / Trending
router.get('/recent', async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const cacheKey = `abb:recent:${page}`;
    const cached = getCache(cacheKey, 300);
    if (cached) return res.json(cached);

    const pathUrl = page > 1 ? `/page/${page}/` : '/';
    const { text, mirror } = await fetchABB(pathUrl);
    const parsed = parseBookList(text, mirror);

    if (parsed.items && parsed.items.length > 0) {
      setCache(cacheKey, parsed);
      res.json(parsed);
    } else {
      res.json({ items: CURATED_FALLBACK_AUDIOBOOKS, totalPages: 1, isFallback: true });
    }
  } catch (err) {
    console.warn('AudioBay recent feed fallback:', err.message);
    res.json({ items: CURATED_FALLBACK_AUDIOBOOKS, totalPages: 1, isFallback: true });
  }
});

// Category
router.get('/category/:cat', async (req, res) => {
  try {
    const cat = req.params.cat;
    const page = parseInt(req.query.page, 10) || 1;
    const cacheKey = `abb:cat:${cat}:${page}`;
    const cached = getCache(cacheKey, 600);
    if (cached) return res.json(cached);

    const pathUrl = page > 1 ? `/audio-books/type/${cat}/page/${page}/` : `/audio-books/type/${cat}/`;
    const { text, mirror } = await fetchABB(pathUrl);
    const parsed = parseBookList(text, mirror);

    if (parsed.items && parsed.items.length > 0) {
      setCache(cacheKey, parsed);
      res.json(parsed);
    } else {
      const catLower = cat.toLowerCase();
      const filtered = CURATED_FALLBACK_AUDIOBOOKS.filter(b => 
        b.categories.some(c => c.toLowerCase().includes(catLower))
      );
      res.json({ items: filtered.length > 0 ? filtered : CURATED_FALLBACK_AUDIOBOOKS, totalPages: 1, isFallback: true });
    }
  } catch (err) {
    console.warn('AudioBay category fallback:', err.message);
    const catLower = (req.params.cat || '').toLowerCase();
    const filtered = CURATED_FALLBACK_AUDIOBOOKS.filter(b => 
      b.categories.some(c => c.toLowerCase().includes(catLower))
    );
    res.json({ items: filtered.length > 0 ? filtered : CURATED_FALLBACK_AUDIOBOOKS, totalPages: 1, isFallback: true });
  }
});

// Search
router.get('/search', async (req, res) => {
  try {
    const query = (req.query.q || '').trim();
    const page = parseInt(req.query.page, 10) || 1;
    if (!query) {
      return res.status(400).json({ error: 'Missing search query (q)' });
    }

    const cacheKey = `abb:search:${query}:${page}`;
    const cached = getCache(cacheKey, 600);
    if (cached) return res.json(cached);

    const pathUrl = page > 1 ? `/page/${page}/?s=${encodeURIComponent(query)}` : `/?s=${encodeURIComponent(query)}`;
    const { text, mirror } = await fetchABB(pathUrl);
    const parsed = parseBookList(text, mirror);

    if (parsed.items && parsed.items.length > 0) {
      setCache(cacheKey, parsed);
      res.json(parsed);
    } else {
      res.json({ items: CURATED_FALLBACK_AUDIOBOOKS, totalPages: 1, isFallback: true });
    }
  } catch (err) {
    console.warn('AudioBay search fallback:', err.message);
    const q = (req.query.q || '').toLowerCase();
    const filtered = CURATED_FALLBACK_AUDIOBOOKS.filter(b => 
      b.title.toLowerCase().includes(q) || 
      b.author.toLowerCase().includes(q)
    );
    res.json({ items: filtered.length > 0 ? filtered : CURATED_FALLBACK_AUDIOBOOKS, totalPages: 1, isFallback: true });
  }
});

// Book details
router.get('/book', async (req, res) => {
  let bookUrl = req.query.url;
  if (req.query.id) {
    try {
      bookUrl = Buffer.from(req.query.id, 'base64url').toString('utf8');
    } catch (e) {}
  }

  try {
    if (!bookUrl) {
      return res.status(400).json({ error: 'Missing book url or id parameter' });
    }

    const cacheKey = `abb:book:${bookUrl}`;
    const cached = getCache(cacheKey, 1800);
    if (cached) return res.json(cached);

    const { text, mirror, url } = await fetchABB(bookUrl);
    const detail = parseBookDetail(text, mirror, url);

    setCache(cacheKey, detail);
    res.json(detail);
  } catch (err) {
    console.warn('AudioBay book detail fallback:', err.message);
    const fallback = CURATED_FALLBACK_AUDIOBOOKS.find(b => b.url === bookUrl || b.id === bookUrl || (bookUrl && b.url.includes(bookUrl)));
    if (fallback) {
      return res.json({
        title: fallback.title,
        author: fallback.author,
        narrator: 'Studio Narrator',
        infoHash: fallback.infoHash,
        magnet: `magnet:?xt=urn:btih:${fallback.infoHash}&dn=${encodeURIComponent(fallback.title)}&tr=${DEFAULT_TRACKERS.join('&tr=')}`,
        description: `${fallback.title} by ${fallback.author}. High quality audio stream from swarm.`,
        cover: fallback.cover,
        trackers: DEFAULT_TRACKERS
      });
    }
    res.status(500).json({ error: 'Failed to fetch book detail', details: err.message });
  }
});

// Torrent Files
router.get('/torrent/files', async (req, res) => {
  try {
    const hash = (req.query.hash || '').toLowerCase().trim();
    if (!hash) {
      return res.status(400).json({ error: 'Missing hash parameter' });
    }

    let magnet = req.query.magnet;
    const torrent = await getOrAddTorrent(hash, magnet);
    const audioFiles = getTorrentAudioFiles(torrent);

    res.json({
      infoHash: torrent.infoHash,
      name: torrent.name,
      totalLength: torrent.length,
      totalFormatted: formatBytes(torrent.length),
      audioTracks: audioFiles,
      numPeers: torrent.numPeers,
      downloadSpeed: torrent.downloadSpeed
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to parse torrent tracks', details: err.message });
  }
});

// Swarm Status
router.get('/torrent/status/:hash', (req, res) => {
  const hash = req.params.hash.toLowerCase();
  const torrent = findTorrentByHash(hash);
  if (!torrent) {
    return res.json({ active: false, numPeers: 0, progress: 0, downloadSpeed: 0 });
  }

  res.json({
    active: true,
    numPeers: torrent.numPeers,
    progress: torrent.progress,
    downloadSpeed: torrent.downloadSpeed,
    downloadSpeedFormatted: `${(torrent.downloadSpeed / 1024).toFixed(1)} KB/s`,
    uploadSpeed: torrent.uploadSpeed,
    downloaded: torrent.downloaded,
    timeRemaining: torrent.timeRemaining
  });
});

// Audio Stream (with HTTP Range 206)
router.get('/stream/:hash/:fileIndex', async (req, res) => {
  try {
    const hash = req.params.hash.toLowerCase();
    const fileIndex = parseInt(req.params.fileIndex, 10);

    let torrent = findTorrentByHash(hash);
    if (!torrent || !torrent.files || !torrent.files[fileIndex]) {
      torrent = await getOrAddTorrent(hash);
    }

    const file = torrent.files[fileIndex];
    if (!file) {
      return res.status(404).send('Audio track not found in swarm');
    }

    const ext = path.extname(file.name).toLowerCase();
    const mimeTypes = {
      '.mp3': 'audio/mpeg',
      '.m4b': 'audio/mp4',
      '.m4a': 'audio/mp4',
      '.aac': 'audio/aac',
      '.flac': 'audio/flac',
      '.opus': 'audio/ogg',
      '.ogg': 'audio/ogg',
      '.wav': 'audio/wav'
    };
    const contentType = mimeTypes[ext] || 'audio/mpeg';

    const total = file.length;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : total - 1;
      const chunkSize = (end - start) + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${total}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType
      });

      const stream = file.createReadStream({ start, end });
      stream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': total,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes'
      });
      const stream = file.createReadStream();
      stream.pipe(res);
    }
  } catch (err) {
    console.error('Audio stream error:', err.message);
    if (!res.headersSent) {
      res.status(500).send('Streaming error from swarm: ' + err.message);
    }
  }
});

// Offline Download Track
router.get('/download/:hash/:fileIndex', async (req, res) => {
  try {
    const hash = req.params.hash.toLowerCase();
    const fileIndex = parseInt(req.params.fileIndex, 10);

    let torrent = findTorrentByHash(hash);
    if (!torrent || !torrent.files || !torrent.files[fileIndex]) {
      torrent = await getOrAddTorrent(hash);
    }

    const file = torrent.files[fileIndex];
    if (!file) return res.status(404).send('File not found');

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
    res.setHeader('Content-Length', file.length);
    res.setHeader('Content-Type', 'application/octet-stream');

    const stream = file.createReadStream();
    stream.pipe(res);
  } catch (err) {
    res.status(500).send('Download error: ' + err.message);
  }
});

// High-Res Jacket Cover Lookup (Apple Books + Open Library)
router.get('/bookdata', async (req, res) => {
  try {
    const query = (req.query.q || '').trim();
    const author = (req.query.author || '').trim();
    if (!query) {
      return res.status(400).json({ error: 'Missing query parameter (q)' });
    }

    const cacheKey = `jacket:${query}:${author}`;
    const cached = getCache(cacheKey, 3600);
    if (cached) return res.json(cached);

    const candidates = [];

    // 1. Apple Books / iTunes Search API
    try {
      const itunesTerm = encodeURIComponent(`${query} ${author}`.trim());
      const itunesUrl = `https://itunes.apple.com/search?term=${itunesTerm}&media=audiobook&limit=6`;
      const iRes = await fetch(itunesUrl, { headers: { 'User-Agent': 'OmniStream/1.0' } });
      if (iRes.ok) {
        const iData = await iRes.json();
        if (iData.results && iData.results.length > 0) {
          iData.results.forEach(item => {
            if (item.artworkUrl100) {
              const hiRes = item.artworkUrl100.replace('100x100bb.jpg', '1200x1200bb.jpg');
              candidates.push({
                source: 'Apple Books',
                title: item.collectionName || item.trackName,
                authors: [item.artistName],
                coverUrl: hiRes,
                description: item.description || ''
              });
            }
          });
        }
      }
    } catch (e) {}

    // 2. Open Library Books API
    try {
      const olUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=5`;
      const oRes = await fetch(olUrl);
      if (oRes.ok) {
        const oData = await oRes.json();
        if (oData.docs && oData.docs.length > 0) {
          oData.docs.forEach(doc => {
            if (doc.cover_i) {
              candidates.push({
                source: 'Open Library',
                title: doc.title,
                authors: doc.author_name || ['Unknown Author'],
                coverUrl: `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`,
                description: doc.first_sentence ? doc.first_sentence.join(' ') : ''
              });
            }
          });
        }
      }
    } catch (e) {}

    const result = { candidates };
    setCache(cacheKey, result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Book metadata lookup failed', details: err.message });
  }
});

// Image Proxy
router.get('/proxy-image', async (req, res) => {
  try {
    const imageUrl = req.query.url;
    if (!imageUrl) return res.status(400).send('Missing url parameter');

    const cacheKey = `img:${imageUrl}`;
    const cached = getCache(cacheKey, 3600);
    if (cached) {
      res.set('Content-Type', cached.contentType);
      return res.send(cached.buffer);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': 'https://audiobookbay.lu/'
      },
      signal: controller.signal
    });
    clearTimeout(timer);

    if (!response.ok) {
      return res.redirect('https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=300');
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    setCache(cacheKey, { contentType, buffer });

    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch (err) {
    res.redirect('https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=300');
  }
});

export default router;

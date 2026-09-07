import express from 'express';
import WebTorrent from 'webtorrent';
import path from 'path';
import fs from 'fs';
import pump from 'pump';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

export const cacheDir = path.join(__dirname, 'data', 'video_torrents');
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

// ── WebTorrent Client with WebRTC + BitTorrent trackers ──────────────────────
export const client = new WebTorrent({
  maxConns: 85,
  dht: true,
  webSeeds: true
});

client.on('error', (err) => {
  console.error('[WebTorrent Engine Error]:', err.message);
});

const DEFAULT_TRACKERS = [
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://open.stealth.si:80/announce',
  'udp://tracker.torrent.eu.org:451/announce',
  'udp://explodie.org:6969/announce',
  'udp://tracker.coppersurfer.tk:6969/announce',
  'udp://tracker.empire-js.us:1337/announce',
  'udp://tracker.dler.org:6969/announce',
  'udp://bt1.archive.org:6969/announce',
  'wss://tracker.openwebtorrent.com',
  'wss://tracker.btorrent.xyz',
  'wss://tracker.fastcast.nz'
];

function buildMagnet(infoHash, name) {
  const trParams = DEFAULT_TRACKERS.map((t) => `tr=${encodeURIComponent(t)}`).join('&');
  return `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(name || 'Torrent')}&${trParams}`;
}

function getCategoryName(cat) {
  const num = parseInt(cat, 10);
  if (num >= 100 && num < 200) return 'Audio';
  if (num >= 200 && num < 300) return 'Video';
  if (num >= 300 && num < 400) return 'Applications';
  if (num >= 400 && num < 500) return 'Games';
  return 'Other';
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// In-memory cache for search
const searchCache = new Map();

// ── 1. Search Torrents (ThePirateBay / apibay backend) ────────────────────────
router.get('/search', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) {
    return res.status(400).json({ error: 'Missing search query parameter (q)' });
  }

  const cacheKey = `search:${q.toLowerCase()}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.time < 300000) {
    return res.json(cached.data);
  }

  try {
    const response = await fetch(`https://apibay.org/q.php?q=${encodeURIComponent(q)}`, {
      headers: { 'User-Agent': 'OmniStream/1.0' }
    });

    if (!response.ok) throw new Error(`Apibay responded with ${response.status}`);
    const data = await response.json();

    const filtered = Array.isArray(data)
      ? data.filter((item) => item.id !== '0' && item.info_hash && !item.info_hash.startsWith('00000000'))
      : [];

    const results = filtered.map((item) => {
      const sizeBytes = parseInt(item.size, 10) || 0;
      return {
        id: item.id,
        name: item.name,
        infoHash: item.info_hash.toLowerCase(),
        size: sizeBytes,
        sizeFormatted: formatBytes(sizeBytes),
        seeders: parseInt(item.seeders, 10) || 0,
        leechers: parseInt(item.leechers, 10) || 0,
        category: getCategoryName(item.category),
        magnet: buildMagnet(item.info_hash, item.name)
      };
    });

    results.sort((a, b) => b.seeders - a.seeders);

    searchCache.set(cacheKey, { time: Date.now(), data: results });
    res.json(results);
  } catch (err) {
    console.error('[Torrent Search Error]:', err.message);
    res.status(500).json({ error: 'Failed to search torrents: ' + err.message });
  }
});

// ── 2. Add / Resolve Torrent ──────────────────────────────────────────────────
router.post('/add', (req, res) => {
  const { torrentId } = req.body || {};
  if (!torrentId) {
    return res.status(400).json({ error: 'Missing torrentId (magnet or hash)' });
  }

  try {
    // Check if torrent is already loaded
    const existing = client.torrents.find((t) =>
      t.infoHash.toLowerCase() === torrentId.toLowerCase() ||
      (t.magnetURI && t.magnetURI.includes(torrentId))
    );

    if (existing) {
      return res.json({
        success: true,
        infoHash: existing.infoHash,
        name: existing.name || 'Resolving metadata...',
        alreadyExists: true
      });
    }

    const torrent = client.add(torrentId, {
      path: cacheDir,
      announce: DEFAULT_TRACKERS,
      destroyStoreOnDestroy: true
    });

    torrent.on('error', (err) => {
      console.warn(`[Torrent Swarm Error] ${torrent.infoHash}:`, err.message);
    });

    res.json({
      success: true,
      infoHash: torrent.infoHash,
      name: torrent.name || 'Connecting to peers...'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 3. Active Torrents List & Swarm Status ────────────────────────────────────
router.get('/list', (req, res) => {
  const list = client.torrents.map((t) => ({
    infoHash: t.infoHash,
    name: t.name || 'Resolving metadata...',
    length: t.length || 0,
    lengthFormatted: formatBytes(t.length || 0),
    downloaded: t.downloaded || 0,
    downloadSpeed: t.downloadSpeed || 0,
    downloadSpeedFormatted: `${(t.downloadSpeed / 1024 / 1024).toFixed(1)} MB/s`,
    uploadSpeed: t.uploadSpeed || 0,
    progress: Math.round((t.progress || 0) * 100),
    numPeers: t.numPeers || 0,
    ready: Boolean(t.name && t.files && t.files.length),
    files: (t.files || []).map((f, idx) => ({
      index: idx,
      name: f.name,
      path: f.path,
      length: f.length,
      sizeFormatted: formatBytes(f.length),
      streamUrl: `/api/torrents/stream/${t.infoHash}/${idx}`
    }))
  }));

  res.json(list);
});

// ── 4. Swarm Status for Single Torrent ────────────────────────────────────────
router.get('/status/:infoHash', (req, res) => {
  const hash = req.params.infoHash.toLowerCase();
  const t = client.torrents.find((tor) => tor.infoHash.toLowerCase() === hash);

  if (!t) {
    return res.status(404).json({ error: 'Torrent not found' });
  }

  res.json({
    infoHash: t.infoHash,
    name: t.name || 'Connecting...',
    length: t.length || 0,
    lengthFormatted: formatBytes(t.length || 0),
    downloaded: t.downloaded || 0,
    downloadSpeed: t.downloadSpeed || 0,
    downloadSpeedFormatted: `${(t.downloadSpeed / 1024 / 1024).toFixed(1)} MB/s`,
    uploadSpeed: t.uploadSpeed || 0,
    progress: Math.round((t.progress || 0) * 100),
    numPeers: t.numPeers || 0,
    ready: Boolean(t.name && t.files && t.files.length),
    files: (t.files || []).map((f, idx) => ({
      index: idx,
      name: f.name,
      path: f.path,
      length: f.length,
      sizeFormatted: formatBytes(f.length),
      streamUrl: `/api/torrents/stream/${t.infoHash}/${idx}`
    }))
  });
});

// ── 5. Stream Video / Audio with HTTP Range 206 Support ───────────────────────
router.get('/stream/:infoHash/:fileIndex', (req, res) => {
  const hash = req.params.infoHash.toLowerCase();
  const fileIndex = parseInt(req.params.fileIndex, 10);

  const t = client.torrents.find((tor) => tor.infoHash.toLowerCase() === hash);
  if (!t || !t.files || !t.files[fileIndex]) {
    return res.status(404).send('File not found in active swarm');
  }

  const file = t.files[fileIndex];

  // Prioritize pieces for this specific video file
  if (typeof file.select === 'function') {
    file.select();
  }

  const ext = path.extname(file.name).toLowerCase();
  const mimeTypes = {
    '.mp4': 'video/mp4',
    '.mkv': 'video/webm',
    '.webm': 'video/webm',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime',
    '.mp3': 'audio/mpeg',
    '.m4a': 'audio/mp4',
    '.m4b': 'audio/mp4'
  };
  const contentType = mimeTypes[ext] || 'video/mp4';

  const total = file.length;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : total - 1;
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${total}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });

    const stream = file.createReadStream({ start, end });
    pump(stream, res);

    req.on('close', () => {
      if (stream && typeof stream.destroy === 'function') {
        stream.destroy();
      }
    });
  } else {
    res.writeHead(200, {
      'Content-Length': total,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Access-Control-Allow-Origin': '*'
    });

    const stream = file.createReadStream();
    pump(stream, res);

    req.on('close', () => {
      if (stream && typeof stream.destroy === 'function') {
        stream.destroy();
      }
    });
  }
});

// ── 6. Remove / Clean up Torrent ──────────────────────────────────────────────
router.delete('/remove/:infoHash', (req, res) => {
  const hash = req.params.infoHash.toLowerCase();
  const t = client.torrents.find((tor) => tor.infoHash.toLowerCase() === hash);

  if (t) {
    t.destroy({ destroyStore: true }, () => {
      res.json({ success: true, message: `Removed torrent ${hash}` });
    });
  } else {
    res.status(404).json({ error: 'Torrent not found' });
  }
});

export default router;

import fs from 'fs';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), 'data_audiobook_settings.json');

// Default in-memory config
let config = {
  realDebridKey: '',
  torboxKey: '',
  audiobookshelfUrl: '',
  audiobookshelfToken: '',
  localFolder: '',
  enableDebridAutoResolve: true
};

// Load saved settings
try {
  if (fs.existsSync(SETTINGS_FILE)) {
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf8');
    config = { ...config, ...JSON.parse(raw) };
  }
} catch (e) {
  console.warn('Could not load audiobook settings:', e.message);
}

export function getAudiobookSettings() {
  return config;
}

export function saveAudiobookSettings(newSettings) {
  config = { ...config, ...newSettings };
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(config, null, 2));
  } catch (e) {
    console.error('Failed to save audiobook settings:', e);
  }
  return config;
}

// ---------------------------------------------------------------------------
// 1. AudiobookBay (ABB) Scraper
// ---------------------------------------------------------------------------
export async function searchAudiobookBay(query) {
  if (!query || !query.trim()) return [];
  const cleanQ = query.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();

  try {
    const url = `https://audiobookbay.lu/?s=${encodeURIComponent(cleanQ)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    if (!res.ok) return [];
    const html = await res.text();

    const matches = [...html.matchAll(/<div class="postTitle">[\s\S]*?<h2><a href="([^"]+)"[^>]*>(.*?)<\/a>/gi)];

    const results = [];
    for (const m of matches.slice(0, 10)) {
      const postUrl = m[1].startsWith('http') ? m[1] : `https://audiobookbay.lu${m[1]}`;
      const title = m[2].replace(/<[^>]+>/g, '').trim();

      results.push({
        id: `abb_${Buffer.from(postUrl).toString('base64').slice(0, 16)}`,
        title,
        postUrl,
        cover: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=600&auto=format&fit=crop',
        description: `Full unabridged commercial audiobook on AudiobookBay. Streamable via Real-Debrid / Torbox.`,
        platform: 'abb',
        isDebrid: true
      });
    }

    return results;
  } catch (e) {
    console.warn('ABB search error:', e.message);
    return [];
  }
}

export async function getAudiobookBayDetails(postUrl) {
  try {
    const res = await fetch(postUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    if (!res.ok) return null;
    const html = await res.text();

    const hashMatch = html.match(/Info Hash:?<\/td>\s*<td>([a-fA-F0-9]{40})/i) || html.match(/([a-fA-F0-9]{40})/);
    const coverMatch = html.match(/<div class="postContent">[\s\S]*?<img src="([^"]+)"/i);
    const descMatch = html.match(/<div class="desc">([\s\S]*?)<\/div>/i);
    const formatMatch = html.match(/Format:?<\/td>\s*<td>(.*?)<\/td>/i);
    const sizeMatch = html.match(/File Size:?<\/td>\s*<td>(.*?)<\/td>/i);
    const trackers = [...html.matchAll(/<tr><td>Tracker:?<\/td><td>(.*?)<\/td><\/tr>/gi)].map(t => t[1].trim());

    if (!hashMatch) return null;
    const infoHash = hashMatch[1];
    const defaultTrackers = [
      'http://tracker.coppersurfer.tk:6969/announce',
      'udp://tracker.opentrackr.org:1337/announce',
      'udp://open.stealth.si:80/announce',
      'udp://tracker.torrent.eu.org:451/announce'
    ];
    const allTrackers = [...new Set([...trackers, ...defaultTrackers])];
    const trackerParams = allTrackers.map(t => `&tr=${encodeURIComponent(t)}`).join('');
    const magnet = `magnet:?xt=urn:btih:${infoHash}&dn=Audiobook${trackerParams}`;

    return {
      infoHash,
      magnet,
      cover: coverMatch ? coverMatch[1] : null,
      format: formatMatch ? formatMatch[1].replace(/<[^>]+>/g, '').trim() : 'M4B / MP3',
      size: sizeMatch ? sizeMatch[1].replace(/<[^>]+>/g, '').trim() : 'Unknown',
      description: descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : ''
    };
  } catch (e) {
    console.warn('ABB details error:', e.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// 2. Real-Debrid & Torbox Unrestrict API
// ---------------------------------------------------------------------------
export async function unrestrictWithRealDebrid(magnet, apiKey) {
  const token = apiKey || config.realDebridKey;
  if (!token) throw new Error('Real-Debrid API Key not configured');

  // 1. Add Magnet
  const addRes = await fetch('https://api.real-debrid.com/rest/1.0/torrents/addMagnet', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: `magnet=${encodeURIComponent(magnet)}`
  });

  if (!addRes.ok) {
    const errText = await addRes.text();
    throw new Error(`Real-Debrid addMagnet failed: ${errText}`);
  }

  const addData = await addRes.json();
  const torrentId = addData.id;

  // 2. Select All Files
  await fetch(`https://api.real-debrid.com/rest/1.0/torrents/selectFiles/${torrentId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'files=all'
  });

  // 3. Get Torrent Info & Links
  const infoRes = await fetch(`https://api.real-debrid.com/rest/1.0/torrents/info/${torrentId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const infoData = await infoRes.json();

  if (!infoData.links || infoData.links.length === 0) {
    return {
      status: infoData.status,
      progress: infoData.progress,
      message: 'Torrent is caching on Real-Debrid cloud servers.'
    };
  }

  // 4. Unrestrict links to get direct high-speed HTTP streams
  const streamLinks = [];
  for (const link of infoData.links.slice(0, 10)) {
    const unres = await fetch('https://api.real-debrid.com/rest/1.0/unrestrict/link', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `link=${encodeURIComponent(link)}`
    });
    if (unres.ok) {
      const uData = await unres.json();
      streamLinks.push({
        id: uData.id,
        filename: uData.filename,
        filesize: uData.filesize,
        downloadUrl: uData.download,
        streamUrl: uData.streamable ? uData.download : uData.download,
        mimeType: uData.mimeType
      });
    }
  }

  return {
    status: 'ready',
    links: streamLinks,
    filename: infoData.filename,
    bytes: infoData.bytes
  };
}

export async function unrestrictWithTorbox(magnet, apiKey) {
  const token = apiKey || config.torboxKey;
  if (!token) throw new Error('Torbox API Key not configured');

  const addRes = await fetch('https://api.torbox.app/v1/api/torrents/createtorrent', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ magnet })
  });

  if (!addRes.ok) {
    const err = await addRes.text();
    throw new Error(`Torbox create torrent failed: ${err}`);
  }

  const data = await addRes.json();
  const torrentId = data.data?.torrent_id;

  return {
    status: 'queued',
    torrentId,
    message: 'Torrent added to Torbox cloud.'
  };
}

// ---------------------------------------------------------------------------
// 3. Local Audiobooks Scanner & Streamer
// ---------------------------------------------------------------------------
export function scanLocalAudiobooksFolder(targetDir) {
  const dir = targetDir || config.localFolder;
  if (!dir || !fs.existsSync(dir)) return [];

  const results = [];

  function scan(currentPath, depth = 0) {
    if (depth > 5) return;
    try {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;
        const fullPath = path.join(currentPath, entry.name);
        if (entry.isDirectory()) {
          scan(fullPath, depth + 1);
        } else if (entry.isFile() && /\.(m4b|mp3|m4a|aac|flac|opus|ogg)$/i.test(entry.name)) {
          const stats = fs.statSync(fullPath);
          const ext = path.extname(entry.name).toLowerCase();
          const cleanName = entry.name.replace(/\.[^/.]+$/, '').replace(/^[0-9]+[_\s-]+/, '');

          const parts = fullPath.split(path.sep);
          const parentDir = parts.length > 2 ? parts[parts.length - 2] : '';
          const grandParentDir = parts.length > 3 ? parts[parts.length - 3] : '';

          let author = 'Local Library';
          let title = cleanName;

          if (parentDir && parentDir !== path.basename(dir)) {
            if (grandParentDir && grandParentDir !== path.basename(dir)) {
              author = grandParentDir;
              title = `${parentDir} - ${cleanName}`;
            } else {
              title = parentDir;
            }
          }

          results.push({
            id: `local_${Buffer.from(fullPath).toString('base64').slice(0, 20)}`,
            title,
            author,
            format: ext.replace('.', '').toUpperCase(),
            filename: entry.name,
            filePath: fullPath,
            sizeBytes: stats.size,
            sizeFormatted: `${(stats.size / (1024 * 1024)).toFixed(1)} MB`,
            modified: stats.mtime,
            audioUrl: `/api/audiobooks/local/stream?path=${encodeURIComponent(fullPath)}`,
            cover: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=600&auto=format&fit=crop',
            platform: 'local',
            isLocal: true
          });
        }
      }
    } catch (e) {
      console.warn('Local scan error on:', currentPath, e.message);
    }
  }

  scan(dir);
  return results;
}

// ---------------------------------------------------------------------------
// 4. Audiobookshelf Server Sync
// ---------------------------------------------------------------------------
export async function syncAudiobookshelf(serverUrl, apiToken) {
  const url = (serverUrl || config.audiobookshelfUrl || '').replace(/\/+$/, '');
  const token = apiToken || config.audiobookshelfToken;

  if (!url || !token) {
    throw new Error('Audiobookshelf Server URL and API Token are required.');
  }

  const libRes = await fetch(`${url}/api/libraries`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!libRes.ok) throw new Error(`Failed to reach Audiobookshelf: HTTP ${libRes.status}`);
  const libData = await libRes.json();
  const libraries = libData.libraries || [];

  const allBooks = [];

  for (const lib of libraries) {
    if (lib.mediaType !== 'book') continue;
    const itemsRes = await fetch(`${url}/api/libraries/${lib.id}/items?limit=100`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!itemsRes.ok) continue;
    const itemsData = await itemsRes.json();
    const items = itemsData.results || [];

    for (const it of items) {
      const media = it.media || {};
      const metadata = media.metadata || {};
      const chapters = (media.chapters || []).map((ch, idx) => ({
        id: `abs_ch_${idx + 1}`,
        title: ch.title || `Chapter ${idx + 1}`,
        startTime: ch.start || 0,
        endTime: ch.end,
        duration: ch.end ? `${Math.round((ch.end - ch.start) / 60)}m` : undefined
      }));

      const primaryAudioFile = media.audioFiles?.[0];
      const directAudioUrl = primaryAudioFile ? `${url}/api/items/${it.id}/file/${primaryAudioFile.ino}?token=${token}` : '';

      allBooks.push({
        id: `abs_${it.id}`,
        title: metadata.title || it.id,
        author: metadata.authorName || 'Audiobookshelf Author',
        narrator: metadata.narratorName || 'Audiobookshelf Narrator',
        duration: media.duration ? `${Math.floor(media.duration / 3600)}h ${Math.floor((media.duration % 3600) / 60)}m` : 'Full Audio',
        durationSeconds: Math.round(media.duration) || 3600,
        cover: `${url}/api/items/${it.id}/cover?token=${token}`,
        description: metadata.description || 'Synced from your Audiobookshelf server.',
        audioUrl: directAudioUrl,
        chapters: chapters.length > 0 ? chapters : undefined,
        platform: 'audiobookshelf',
        isAudiobookshelf: true
      });
    }
  }

  return allBooks;
}

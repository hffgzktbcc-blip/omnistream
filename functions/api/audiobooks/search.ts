import { MASTER_AUDIOBOOKS } from './data';

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

const DEFAULT_TRACKERS = [
  'wss://tracker.openwebtorrent.com',
  'wss://tracker.btorrent.xyz',
  'wss://tracker.fastcast.nz',
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://open.stealth.si:80/announce',
  'udp://tracker.torrent.eu.org:451/announce',
  'udp://exodus.desync.com:6969/announce',
  'udp://opentor.org:2710/announce',
  'udp://tracker.dler.org:6969/announce',
  'udp://bt1.archive.org:6969/announce'
];

function generateBookSvgCover(title: string, author?: string): string {
  const safeTitle = (title || 'Audiobook').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').slice(0, 32);
  const safeAuthor = (author || 'Unabridged Edition').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').slice(0, 24);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#18181b"/>
        <stop offset="50%" stop-color="#27272a"/>
        <stop offset="100%" stop-color="#09090b"/>
      </linearGradient>
      <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#f59e0b"/>
        <stop offset="100%" stop-color="#d97706"/>
      </linearGradient>
    </defs>
    <rect width="400" height="400" rx="16" fill="url(#g)"/>
    <rect x="16" y="16" width="368" height="368" rx="12" fill="none" stroke="rgba(245,158,11,0.3)" stroke-width="1.5"/>
    <rect x="28" y="28" width="6" height="344" rx="3" fill="url(#accent)" opacity="0.7"/>
    <circle cx="200" cy="130" r="42" fill="rgba(245,158,11,0.1)"/>
    <path d="M182 120 C182 110, 218 110, 218 120 V145 C218 155, 182 155, 182 145 Z" fill="#f59e0b" opacity="0.9"/>
    <circle cx="180" cy="140" r="10" fill="#f59e0b"/>
    <circle cx="220" cy="140" r="10" fill="#f59e0b"/>
    <text x="200" y="220" text-anchor="middle" fill="#f4f4f5" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="20" font-weight="700">${safeTitle}</text>
    <text x="200" y="260" text-anchor="middle" fill="#a1a1aa" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="14" font-weight="500">${safeAuthor}</text>
    <text x="200" y="335" text-anchor="middle" fill="#f59e0b" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" font-weight="800" letter-spacing="3">AUDIOBOOK</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function cleanReleaseForSearch(raw: string): string {
  let clean = raw.trim();
  clean = clean.replace(/\.(mp3|m4b|m4a|aac|flac|opus|ogg|zip|rar)$/i, '');
  clean = clean.replace(/\[[^\]]*\]/g, ' ');
  clean = clean.replace(/\((mp3|m4b|m4a|aac|flac|unabridged|abridged|vbr|\d+kbps|\d{4}|read by[^)]*)\)/gi, ' ');
  clean = clean.replace(/\b(unabridged|abridged|audiobooks?|320kbps|128kbps|64kbps|vbr|cbr|retail|web-dl)\b/gi, ' ');
  clean = clean.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
  return clean;
}

function parseTitleAuthor(raw: string): { title: string; author: string } {
  let clean = raw.trim();
  clean = clean.replace(/\.(mp3|m4b|m4a|aac|flac|opus|ogg|zip|rar)$/i, '');
  clean = clean.replace(/\[(mp3|m4b|m4a|aac|flac|opus|ogg)[^\]]*\]/gi, '');
  clean = clean.replace(/\((mp3|m4b|m4a|aac|flac|opus|ogg)[^\)]*\)/gi, '');
  clean = clean.replace(/\b(audiobooks?|unabridged|abridged)\b/gi, '');
  clean = clean.replace(/\s+/g, ' ').trim();

  if (clean.includes(' - ')) {
    const parts = clean.split(' - ');
    // Handle Author - Title format common on torrent swarms
    return { title: parts[1]?.trim() || parts[0].trim(), author: parts[0].trim() };
  }
  if (/\s+by\s+/i.test(clean)) {
    const parts = clean.split(/\s+by\s+/i);
    return { title: parts[0].trim(), author: parts.slice(1).join(' by ').trim() };
  }
  return { title: clean, author: 'Swarm Edition' };
}

function formatBytes(bytes: number): string {
  if (!bytes || isNaN(bytes)) return 'Audio Swarm';
  if (bytes > 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function enrichBook(item: any) {
  if (
    item.cover &&
    !item.cover.includes('unsplash.com') &&
    !item.cover.startsWith('data:image/svg') &&
    item.author &&
    item.author !== 'Full Cast / Swarm' &&
    item.author !== 'AudioBookBay' &&
    item.author !== 'Swarm Edition'
  ) {
    return;
  }

  const queryTerm = cleanReleaseForSearch(item.rawTitle || item.name || item.title || '');
  if (!queryTerm) return;

  // 1. Try iTunes Audiobook API for official HD artwork & blurb
  try {
    const itunesRes = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(queryTerm)}&media=audiobook&limit=1`,
      { headers: { 'User-Agent': 'OmniStream/1.0' } }
    );
    if (itunesRes.ok) {
      const itunesData: any = await itunesRes.json();
      if (itunesData.results && itunesData.results.length > 0) {
        const r = itunesData.results[0];
        if (r.collectionName) item.title = r.collectionName;
        if (r.artistName) item.author = r.artistName;
        if (r.artworkUrl100) item.cover = r.artworkUrl100.replace('100x100bb', '600x600bb');
        if (r.description && !item.description) item.description = r.description;
        if (r.primaryGenreName) item.categories = ['Audiobook', r.primaryGenreName];
        return;
      }
    }
  } catch {}

  // 2. Try Open Library for book cover
  try {
    const olRes = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(queryTerm)}&limit=1`, {
      headers: { 'User-Agent': 'OmniStream/1.0' }
    });
    if (olRes.ok) {
      const olData: any = await olRes.json();
      const doc = olData.docs?.[0];
      if (doc) {
        if (doc.title && (!item.title || item.title === item.rawTitle)) {
          item.title = doc.title;
        }
        if (doc.author_name?.[0] && (!item.author || item.author === 'Swarm Edition')) {
          item.author = doc.author_name[0];
        }
        if (doc.cover_i) {
          item.cover = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
          return;
        }
      }
    }
  } catch {}

  // 3. Fallback to clean SVG badge (Never use generic coffee cup photo)
  if (!item.cover || item.cover.includes('unsplash.com')) {
    item.cover = generateBookSvgCover(item.title, item.author);
  }
}

export async function onRequestGet(context: any) {
  const { request } = context;
  const urlObj = new URL(request.url);
  const q = (urlObj.searchParams.get('q') || '').trim();

  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=300'
  };

  if (!q) {
    return new Response(JSON.stringify({ items: MASTER_AUDIOBOOKS, totalPages: 1 }), {
      status: 200,
      headers: corsHeaders
    });
  }

  const queryLower = q.toLowerCase();
  const queryTokens = queryLower.split(/\s+/).filter(t => t.length > 1);

  // 1. Multi-token match across curated MASTER_AUDIOBOOKS
  const masterMatches = MASTER_AUDIOBOOKS.filter((book) => {
    const haystack = `${book.title} ${book.author} ${book.narrator || ''} ${book.categories.join(' ')} ${book.description || ''}`.toLowerCase();
    if (haystack.includes(queryLower)) return true;
    if (queryTokens.length > 0 && queryTokens.every(token => haystack.includes(token))) return true;
    return false;
  });

  const trackersParam = DEFAULT_TRACKERS.map(t => `&tr=${encodeURIComponent(t)}`).join('');
  const torrentItems: any[] = [];
  const abbItems: any[] = [];

  // 2. Query Apibay Audiobooks (The Pirate Bay Category 102: Audio - Audio books)
  const apibayPromise = (async () => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      
      // Query cat=102 (Audio books only, prevents music albums/bands from leaking)
      const res = await fetch(`https://apibay.org/q.php?q=${encodeURIComponent(q)}&cat=102`, {
        headers: { 'User-Agent': 'OmniStream/1.0' },
        signal: controller.signal
      });
      clearTimeout(timer);

      let list = res.ok ? await res.json() : [];
      
      // If multi-word query had 0 results, try a broader query
      if ((!Array.isArray(list) || list.length === 0 || list[0]?.id === '0') && queryTokens.length > 2) {
        const relaxedQ = queryTokens.slice(0, 2).join(' ');
        try {
          const rRes = await fetch(`https://apibay.org/q.php?q=${encodeURIComponent(relaxedQ)}&cat=102`, {
            headers: { 'User-Agent': 'OmniStream/1.0' }
          });
          if (rRes.ok) {
            const rList = await rRes.json();
            if (Array.isArray(rList) && rList.length > 0 && rList[0]?.id !== '0') {
              list = rList;
            }
          }
        } catch {}
      }

      if (Array.isArray(list)) {
        const valid = list.filter(item => item.id !== '0' && item.info_hash && !item.info_hash.startsWith('00000000'));
        for (const item of valid) {
          const hash = item.info_hash.toLowerCase();
          const parsed = parseTitleAuthor(item.name);
          const sizeBytes = parseInt(item.size, 10) || 0;
          const seeders = parseInt(item.seeders, 10) || 0;

          torrentItems.push({
            id: `wt_${hash}`,
            infoHash: hash,
            name: item.name,
            rawTitle: item.name,
            title: parsed.title,
            author: parsed.author,
            cover: generateBookSvgCover(parsed.title, parsed.author),
            categories: ['Audiobook', 'Swarm Edition'],
            format: 'M4B',
            bitrate: 'P2P Audio',
            size: formatBytes(sizeBytes),
            sizeBytes,
            seeders,
            leechers: parseInt(item.leechers, 10) || 0,
            magnet: `magnet:?xt=urn:btih:${hash}&dn=${encodeURIComponent(item.name)}${trackersParam}`,
            source: 'torrent',
            platform: 'torrent'
          });
        }
      }
    } catch (e: any) {
      console.warn('Apibay edge query error:', e.message);
    }
  })();

  // 3. Query AudioBookBay Live Mirror
  const abbPromise = (async () => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6500);

      const res = await fetch(`https://audiobookbay.lu/?s=${encodeURIComponent(q)}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
        },
        signal: controller.signal
      });
      clearTimeout(timer);

      if (res.ok) {
        const html = await res.text();
        const postRegex = /<div class="post">([\s\S]*?)<\/div><\/div>/g;
        let match;
        while ((match = postRegex.exec(html)) !== null) {
          const postHtml = match[1];
          const titleMatch = postHtml.match(/<div class="postTitle"><h2><a href="([^"]+)"[^>]*>([^<]+)<\/a><\/h2>/i);
          if (!titleMatch) continue;

          const link = titleMatch[1].startsWith('http') ? titleMatch[1] : `https://audiobookbay.lu${titleMatch[1]}`;
          const rawTitle = titleMatch[2].trim();
          const parsed = parseTitleAuthor(rawTitle);

          const imgMatch = postHtml.match(/<img[^>]+src="([^"]+)"/i);
          const cover = imgMatch ? imgMatch[1] : generateBookSvgCover(parsed.title, parsed.author);

          const formatMatch = postHtml.match(/Format:\s*<span[^>]*>([^<]+)<\/span>/i);
          const format = formatMatch ? formatMatch[1].trim() : 'M4B';

          const sizeMatch = postHtml.match(/File Size:\s*<span[^>]*>([^<]+)<\/span>\s*([A-Za-z]+)?/i);
          const size = sizeMatch ? `${sizeMatch[1]} ${sizeMatch[2] || 'MB'}`.trim() : 'Audiobook';

          abbItems.push({
            id: btoa(link).replace(/[^a-zA-Z0-9]/g, '').slice(0, 24),
            rawTitle,
            title: parsed.title,
            author: parsed.author,
            url: link,
            cover,
            categories: ['Audiobook', 'AudioBookBay'],
            format: format.toUpperCase(),
            size,
            source: 'audiobookbay',
            platform: 'audiobookbay'
          });
        }
      }
    } catch (e: any) {
      console.warn('AudioBookBay edge search error:', e.message);
    }
  })();

  // 4. Query Internet Archive Audio Collection
  const iaItems: any[] = [];
  const iaPromise = (async () => {
    try {
      const qClean = q.replace(/audiobooks?/gi, '').trim();
      const iaUrl = `https://archive.org/advancedsearch.php?q=(${encodeURIComponent(qClean)})+AND+mediatype:(audio)&fl[]=identifier,title,creator,description,downloads&sort[]=downloads+desc&rows=8&output=json`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(iaUrl, { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        const data: any = await res.json();
        const docs = data.response?.docs || [];
        for (const doc of docs) {
          if (!doc.identifier) continue;
          iaItems.push({
            id: `ia_${doc.identifier}`,
            title: doc.title || qClean,
            author: Array.isArray(doc.creator) ? doc.creator.join(', ') : (doc.creator || 'Archive Studio Recording'),
            cover: `https://archive.org/services/img/${doc.identifier}`,
            description: typeof doc.description === 'string' ? doc.description.slice(0, 300) : 'Archive.org Studio Audiobook',
            categories: ['Audiobook', 'Archive Cloud'],
            format: 'MP3',
            size: 'Cloud Stream',
            source: 'archive',
            platform: 'archive',
            audioUrl: `https://archive.org/download/${doc.identifier}`
          });
        }
      }
    } catch (e: any) {
      console.warn('Archive edge search error:', e.message);
    }
  })();

  await Promise.allSettled([apibayPromise, abbPromise, iaPromise]);

  // Combine items: Exact curated matches first, then Swarm torrents, ABB, and Archive
  const combined: any[] = [];
  const seenKeys = new Set<string>();

  const addUnique = (item: any) => {
    const key = (item.infoHash || `${item.title}_${item.id}`).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (key && !seenKeys.has(key)) {
      seenKeys.add(key);
      combined.push(item);
    }
  };

  masterMatches.forEach(addUnique);
  torrentItems.forEach(addUnique);
  abbItems.forEach(addUnique);
  iaItems.forEach(addUnique);

  // If still empty, fall back to master library items matching any token
  if (combined.length === 0 && queryTokens.length > 0) {
    MASTER_AUDIOBOOKS.forEach(b => {
      const text = `${b.title} ${b.author}`.toLowerCase();
      if (queryTokens.some(tok => text.includes(tok))) {
        addUnique(b);
      }
    });
  }

  // 5. Enrich up to 20 items in parallel chunks of 5 with Apple Books / Open Library artwork
  const BATCH_SIZE = 5;
  const toEnrich = combined.slice(0, 20);
  for (let i = 0; i < toEnrich.length; i += BATCH_SIZE) {
    const chunk = toEnrich.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(chunk.map((item) => enrichBook(item)));
  }

  return new Response(
    JSON.stringify({
      items: combined,
      totalPages: 1,
      query: q,
      totalCount: combined.length
    }),
    {
      status: 200,
      headers: corsHeaders
    }
  );
}

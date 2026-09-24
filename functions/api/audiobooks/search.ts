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

function parseTitleAuthor(raw: string): { title: string; author: string } {
  let clean = raw.trim();
  clean = clean.replace(/\[(mp3|m4b|m4a|aac|flac|opus|ogg)[^\]]*\]/gi, '');
  clean = clean.replace(/\((mp3|m4b|m4a|aac|flac|opus|ogg)[^\)]*\)/gi, '');
  clean = clean.replace(/\b(audiobooks?|unabridged|abridged)\b/gi, '');
  clean = clean.replace(/\s+/g, ' ').trim();

  if (clean.includes(' - ')) {
    const parts = clean.split(' - ');
    return { title: parts[0].trim(), author: parts.slice(1).join(' - ').trim() };
  }
  if (/\s+by\s+/i.test(clean)) {
    const parts = clean.split(/\s+by\s+/i);
    return { title: parts[0].trim(), author: parts.slice(1).join(' by ').trim() };
  }
  return { title: clean, author: 'Full Cast / Swarm' };
}

function formatBytes(bytes: number): string {
  if (!bytes || isNaN(bytes)) return 'Audio Swarm';
  if (bytes > 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

  // 1. Multi-token match across MASTER_AUDIOBOOKS
  const masterMatches = MASTER_AUDIOBOOKS.filter((book) => {
    const haystack = `${book.title} ${book.author} ${book.narrator || ''} ${book.categories.join(' ')} ${book.description || ''}`.toLowerCase();
    if (haystack.includes(queryLower)) return true;
    if (queryTokens.length > 0 && queryTokens.every(token => haystack.includes(token))) return true;
    return false;
  });

  const trackersParam = DEFAULT_TRACKERS.map(t => `&tr=${encodeURIComponent(t)}`).join('');
  const torrentItems: any[] = [];
  const abbItems: any[] = [];

  // 2. Query Apibay Audio Category (The Pirate Bay Category 100)
  const apibayPromise = (async () => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      
      // Try exact query first
      const res = await fetch(`https://apibay.org/q.php?q=${encodeURIComponent(q)}&cat=100`, {
        headers: { 'User-Agent': 'OmniStream/1.0' },
        signal: controller.signal
      });
      clearTimeout(timer);

      let list = res.ok ? await res.json() : [];
      
      // If specific multi-word query had 0 results, try a broader query (e.g. "harry potter full cast" -> "harry potter cast" or "harry potter")
      if ((!Array.isArray(list) || list.length === 0 || list[0]?.id === '0') && queryTokens.length > 2) {
        const relaxedQ = queryTokens.slice(0, 2).join(' ');
        try {
          const rRes = await fetch(`https://apibay.org/q.php?q=${encodeURIComponent(relaxedQ)}&cat=100`, {
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
            cover: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=400',
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
          const cover = imgMatch ? imgMatch[1] : '';

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

  // 4. Query Internet Archive Audio Collection (Instant HTTP chapter streaming)
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

  // Combine items: Swarm torrents first (so specific searches get exact swarm/full cast matches), then master matches, ABB, and Archive
  const combined: any[] = [];
  const seenKeys = new Set<string>();

  const addUnique = (item: any) => {
    const key = (item.infoHash || `${item.title}_${item.id}`).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (key && !seenKeys.has(key)) {
      seenKeys.add(key);
      combined.push(item);
    }
  };

  torrentItems.forEach(addUnique);
  masterMatches.forEach(addUnique);
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

  // 5. Enrich top 6 items missing covers with Apple Books / iTunes artwork
  const enrichPromises = combined.slice(0, 6).map(async (book) => {
    if (!book.cover || book.cover.includes('unsplash.com') || book.cover === '') {
      try {
        const searchTerm = `${book.title} ${book.author !== 'Full Cast / Swarm' ? book.author : ''}`.trim();
        const itunesRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&media=audiobook&limit=1`, {
          headers: { 'User-Agent': 'OmniStream/1.0' }
        });
        if (itunesRes.ok) {
          const data: any = await itunesRes.json();
          if (data.results && data.results.length > 0) {
            const r = data.results[0];
            if (r.artworkUrl100) {
              book.cover = r.artworkUrl100.replace('100x100bb', '600x600bb');
            }
            if (book.author === 'Full Cast / Swarm' && r.artistName) {
              book.author = r.artistName;
            }
          }
        }
      } catch {}
    }
  });

  await Promise.allSettled(enrichPromises);

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


export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

function cleanTitle(filename: string): { title: string; author: string } {
  let clean = (filename || 'Audiobook').trim();
  clean = clean.replace(/\.(mp3|m4b|m4a|aac|flac|opus|ogg|zip|rar)$/i, '');
  clean = clean.replace(/\[[^\]]*\]/g, ' ');
  clean = clean.replace(/\((mp3|m4b|m4a|unabridged|abridged|\d+kbps)[^)]*\)/gi, ' ');
  clean = clean.replace(/\b(unabridged|abridged|audiobooks?|320kbps|128kbps|64kbps)\b/gi, ' ');
  clean = clean.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();

  if (clean.includes(' - ')) {
    const parts = clean.split(' - ');
    return { title: parts[1]?.trim() || parts[0].trim(), author: parts[0].trim() };
  }
  return { title: clean, author: 'Debrid Vault' };
}

function generateBookSvg(title: string, author: string): string {
  const safeTitle = (title || 'Audiobook').replace(/&/g, '&amp;').slice(0, 32);
  const safeAuthor = (author || 'Debrid Cloud').replace(/&/g, '&amp;').slice(0, 24);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400"><defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#18181b"/><stop offset="100%" stop-color="#09090b"/></linearGradient></defs><rect width="400" height="400" rx="16" fill="url(#bg)"/><rect x="16" y="16" width="368" height="368" rx="12" fill="none" stroke="rgba(245,158,11,0.3)" stroke-width="1.5"/><circle cx="200" cy="130" r="36" fill="rgba(245,158,11,0.15)"/><text x="200" y="220" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-size="20" font-weight="bold">${safeTitle}</text><text x="200" y="260" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="14">${safeAuthor}</text><text x="200" y="335" text-anchor="middle" fill="#f59e0b" font-family="sans-serif" font-size="11" font-weight="bold" letter-spacing="3">DEBRID VAULT</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export async function onRequestPost(context: any) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  try {
    const { request } = context;
    const body = await request.json();
    const { apiKey, provider = 'realdebrid' } = body;

    if (!apiKey) {
      return new Response(JSON.stringify({ success: false, items: [], error: 'Missing Debrid API key' }), {
        status: 400,
        headers: corsHeaders
      });
    }

    const VIDEO_PATTERNS = /\b(1080p|2160p|720p|480p|s\d{2}e\d{2}|complete\.season|season\.\d+|bluray|web-dl|x264|x265|hevc|repack)\b/i;

    if (provider === 'torbox') {
      const res = await fetch('https://api.torbox.app/v1/api/torrents/mylist', {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      if (!res.ok) {
        return new Response(JSON.stringify({ success: false, items: [], error: `Torbox error (${res.status})` }), {
          status: 200,
          headers: corsHeaders
        });
      }
      const data: any = await res.json();
      const list = data.data || [];
      const books = list
        .filter((t: any) => !VIDEO_PATTERNS.test(t.name || ''))
        .map((t: any) => {
          const { title, author } = cleanTitle(t.name);
          const hash = (t.hash || '').toLowerCase();
          return {
            id: `wt_${hash || t.id}`,
            infoHash: hash,
            rawTitle: t.name,
            title,
            author,
            cover: generateBookSvg(title, author),
            categories: ['Audiobook', 'Debrid Vault'],
            format: 'M4B',
            size: `${((t.size || 0) / (1024 * 1024)).toFixed(1)} MB`,
            source: 'torrent',
            platform: 'torrent'
          };
        });

      return new Response(JSON.stringify({ success: true, items: books }), {
        status: 200,
        headers: corsHeaders
      });
    } else {
      // Real-Debrid Vault
      const res = await fetch('https://api.real-debrid.com/rest/1.0/torrents?limit=100', {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      if (!res.ok) {
        return new Response(JSON.stringify({ success: false, items: [], error: `Real-Debrid error (${res.status})` }), {
          status: 200,
          headers: corsHeaders
        });
      }
      const list = await res.json();
      if (!Array.isArray(list)) {
        return new Response(JSON.stringify({ success: true, items: [] }), {
          status: 200,
          headers: corsHeaders
        });
      }

      const books = list
        .filter((t: any) => !VIDEO_PATTERNS.test(t.filename || ''))
        .map((t: any) => {
          const { title, author } = cleanTitle(t.filename);
          const hash = (t.hash || '').toLowerCase();
          return {
            id: `wt_${hash || t.id}`,
            infoHash: hash,
            rawTitle: t.filename,
            title,
            author,
            cover: generateBookSvg(title, author),
            categories: ['Audiobook', 'Debrid Vault'],
            format: 'M4B',
            size: `${((t.bytes || 0) / (1024 * 1024)).toFixed(1)} MB`,
            source: 'torrent',
            platform: 'torrent'
          };
        });

      // Quick parallel enrichment of top 6 books with iTunes/Audible
      const enrichSlice = books.slice(0, 6);
      await Promise.allSettled(
        enrichSlice.map(async (book) => {
          try {
            const itunesRes = await fetch(
              `https://itunes.apple.com/search?term=${encodeURIComponent(book.title)}&media=audiobook&limit=1`,
              { headers: { 'User-Agent': 'OmniStream/1.0' } }
            );
            if (itunesRes.ok) {
              const itData: any = await itunesRes.json();
              const r = itData.results?.[0];
              if (r) {
                if (r.collectionName) book.title = r.collectionName;
                if (r.artistName) book.author = r.artistName;
                if (r.artworkUrl100) book.cover = r.artworkUrl100.replace('100x100bb', '600x600bb');
              }
            }
          } catch {}
        })
      );

      return new Response(JSON.stringify({ success: true, items: books }), {
        status: 200,
        headers: corsHeaders
      });
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, items: [], error: err.message || 'Vault error' }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

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

export async function onRequestGet(context: any) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=600'
  };

  const { request } = context;
  const url = new URL(request.url);
  const bookUrl = url.searchParams.get('url') || '';
  const bookId = url.searchParams.get('id') || '';

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
  const trackersParam = DEFAULT_TRACKERS.map(t => `&tr=${encodeURIComponent(t)}`).join('');

  const isHex40 = (str?: string) => !!str && /^[a-fA-F0-9]{40}$/.test(str.trim());
  const targetHash = isHex40(bookId)
    ? bookId.toLowerCase()
    : bookId?.startsWith('wt_') && isHex40(bookId.replace('wt_', ''))
    ? bookId.replace('wt_', '').toLowerCase()
    : '';

  // 1. Direct WebTorrent ID or infoHash
  if (targetHash) {
    const title = url.searchParams.get('title') || 'Audiobook Swarm';
    return new Response(
      JSON.stringify({
        id: `wt_${targetHash}`,
        infoHash: targetHash,
        title,
        author: url.searchParams.get('author') || 'Full Cast / Swarm',
        cover: url.searchParams.get('cover') || '',
        magnet: `magnet:?xt=urn:btih:${targetHash}&dn=${encodeURIComponent(title)}${trackersParam}`,
        format: 'M4B',
        source: 'torrent'
      }),
      { headers }
    );
  }

  const titleParam = (url.searchParams.get('title') || '').toLowerCase().trim();

  // 2. Check MASTER_AUDIOBOOKS by id, url, or title
  const matched = MASTER_AUDIOBOOKS.find(
    (b) =>
      (bookId && (b.id === bookId || bookId.includes(b.id))) ||
      (bookUrl && (b.url === bookUrl || bookUrl.includes(b.id) || b.url.includes(bookUrl))) ||
      (titleParam && (b.title.toLowerCase() === titleParam || b.title.toLowerCase().includes(titleParam)))
  );

  if (matched) {
    return new Response(
      JSON.stringify({
        ...matched,
        magnet: `magnet:?xt=urn:btih:${matched.infoHash}&dn=${encodeURIComponent(matched.title)}${trackersParam}`
      }),
      { headers }
    );
  }

  // 3. Scrape AudioBookBay if external URL
  if (bookUrl && (bookUrl.includes('audiobookbay') || bookUrl.startsWith('http'))) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(bookUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        signal: controller.signal
      });
      clearTimeout(timer);

      if (res.ok) {
        const html = await res.text();
        const hashMatch = html.match(/Info\s*Hash\s*:\s*<\/td>\s*<td[^>]*>\s*([a-fA-F0-9]{40})\s*<\/td>/i) ||
                          html.match(/<td>\s*Info\s*Hash:\s*<\/td>\s*<td>\s*([a-fA-F0-9]{40})\s*<\/td>/i) ||
                          html.match(/([a-fA-F0-9]{40})/i);
        const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i) || html.match(/<title>([^<]+)<\/title>/i);
        const imgMatch = html.match(/<div class="postContent">[\s\S]*?<img[^>]+src="([^"]+)"/i);

        if (hashMatch) {
          const infoHash = hashMatch[1].toLowerCase();
          const rawTitle = titleMatch ? titleMatch[1].replace(/Audiobook.*$/i, '').trim() : 'Audiobook';
          const cover = imgMatch ? imgMatch[1] : '';

          return new Response(
            JSON.stringify({
              id: bookId || btoa(rawTitle).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16),
              title: rawTitle,
              author: 'AudioBookBay',
              cover,
              infoHash,
              magnet: `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(rawTitle)}${trackersParam}`,
              format: 'M4B',
              source: 'torrent'
            }),
            { headers }
          );
        }
      }
    } catch {
      // Ignore
    }
  }

  // 4. Secondary Swarm Search via Apibay (cat=100 audiobooks) by Title
  const searchTitle = url.searchParams.get('title') || url.searchParams.get('rawTitle') || '';
  if (searchTitle) {
    try {
      const cleanQ = searchTitle.replace(/Audiobook.*$/i, '').replace(/ - .*$/, '').trim();
      const apibayRes = await fetch(`https://apibay.org/q.php?q=${encodeURIComponent(cleanQ)}&cat=100`);
      if (apibayRes.ok) {
        const results = await apibayRes.json();
        if (Array.isArray(results) && results.length > 0 && results[0].id !== '0' && results[0].info_hash) {
          const top = results[0];
          const infoHash = top.info_hash.toLowerCase();
          return new Response(
            JSON.stringify({
              id: `wt_${infoHash}`,
              title: searchTitle,
              author: url.searchParams.get('author') || 'Swarm Release',
              cover: url.searchParams.get('cover') || '',
              infoHash,
              magnet: `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(searchTitle)}${trackersParam}`,
              format: 'M4B',
              source: 'torrent'
            }),
            { headers }
          );
        }
      }
    } catch {}
  }

  // 5. Explicit 404 (Never disguise missing audiobooks as Harry Potter!)
  return new Response(
    JSON.stringify({
      error: 'Audiobook swarm not found for this title',
      success: false
    }),
    { status: 404, headers }
  );
}

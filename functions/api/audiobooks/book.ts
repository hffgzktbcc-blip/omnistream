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

  // 1. Check MASTER_AUDIOBOOKS
  const matched = MASTER_AUDIOBOOKS.find(
    (b) =>
      (bookId && (b.id === bookId || bookId.includes(b.id))) ||
      (bookUrl && (b.url === bookUrl || bookUrl.includes(b.id) || b.url.includes(bookUrl)))
  );

  if (matched) {
    return new Response(
      JSON.stringify({
        ...matched,
        magnet: `magnet:?xt=urn:btih:${matched.infoHash}&dn=${encodeURIComponent(matched.title)}`
      }),
      { headers }
    );
  }

  // 2. Scrape AudioBookBay if external URL
  if (bookUrl && (bookUrl.includes('audiobookbay') || bookUrl.startsWith('http'))) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4500);
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
        const hashMatch = html.match(/<td>\s*Info Hash:\s*<\/td>\s*<td>\s*([a-fA-F0-9]{40})\s*<\/td>/i);
        const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
        const imgMatch = html.match(/<div class="postContent">[\s\S]*?<img[^>]+src="([^"]+)"/i);

        if (hashMatch) {
          const infoHash = hashMatch[1].toLowerCase();
          const rawTitle = titleMatch ? titleMatch[1].trim() : 'Audiobook';
          const cover = imgMatch ? imgMatch[1] : '';

          return new Response(
            JSON.stringify({
              id: bookId || btoa(rawTitle).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16),
              title: rawTitle,
              author: 'AudioBookBay',
              cover,
              infoHash,
              magnet: `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(rawTitle)}`,
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

  // Fallback to first master book
  const fallback = MASTER_AUDIOBOOKS[0];
  return new Response(
    JSON.stringify({
      ...fallback,
      magnet: `magnet:?xt=urn:btih:${fallback.infoHash}&dn=${encodeURIComponent(fallback.title)}`
    }),
    { headers }
  );
}

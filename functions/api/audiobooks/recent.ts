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
  const { request } = context;
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);

  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=600'
  };

  // Try scraping AudioBookBay recent if reachable
  const ABB_MIRRORS = ['https://audiobookbay.lu', 'https://audiobookbay.me'];
  const fetchSingleMirror = async (mirror: string) => {
    const fullUrl = page > 1 ? `${mirror}/page/${page}/` : `${mirror}/`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(fullUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      signal: controller.signal
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  };

  try {
    const html = await Promise.any(ABB_MIRRORS.map((m) => fetchSingleMirror(m)));
    const items: any[] = [];
    const postMatches = html.match(/<div class="post">([\s\S]*?)<\/div><!-- \.post -->/gi) || [];

    for (const post of postMatches) {
      const titleMatch = post.match(/<h2><a href="([^"]+)"[^>]*>([^<]+)<\/a><\/h2>/i);
      const imgMatch = post.match(/<img[^>]+src="([^"]+)"/i);
      const descMatch = post.match(/<p class="postContent">([\s\S]*?)<\/p>/i);
      const infoMatch = post.match(/<p class="postInfo">([\s\S]*?)<\/p>/i);

      if (titleMatch) {
        const bookUrl = titleMatch[1];
        const rawTitle = titleMatch[2].trim();
        const cover = imgMatch ? imgMatch[1] : '';
        const infoText = infoMatch ? infoMatch[1] : '';

        const formatMatch = infoText.match(/Format:\s*<span>([^<]+)<\/span>/i);
        const format = formatMatch ? formatMatch[1].trim() : 'M4B';

        const bitrateMatch = infoText.match(/Bitrate:\s*<span>([^<]+)<\/span>/i);
        const bitrate = bitrateMatch ? bitrateMatch[1].trim() : '128 Kbps';

        let cleanTitle = rawTitle;
        let cleanAuthor = 'AudiobookBay';
        if (rawTitle.includes(' – ') || rawTitle.includes(' - ')) {
          const split = rawTitle.split(/ – | - /);
          cleanTitle = split[0].trim();
          cleanAuthor = split.slice(1).join(' - ').trim();
        }

        items.push({
          id: btoa(cleanTitle).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16),
          rawTitle,
          title: cleanTitle,
          author: cleanAuthor,
          url: bookUrl,
          cover,
          format,
          bitrate,
          size: '500 MB',
          categories: ['Audiobook', 'Bestsellers'],
          source: 'torrent'
        });
      }
    }

    if (items.length > 0) {
      return new Response(JSON.stringify({ items, totalPages: 10 }), {
        status: 200,
        headers: corsHeaders
      });
    }
  } catch {
    // Fall back to Master Audiobooks
  }

  return new Response(JSON.stringify({ items: MASTER_AUDIOBOOKS, totalPages: 1, isFallback: true }), {
    status: 200,
    headers: corsHeaders
  });
}

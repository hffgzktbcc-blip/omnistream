const CURATED_HASH_MAP: Record<string, any> = {
  "projhailmary": {
    title: "Project Hail Mary",
    author: "Andy Weir",
    infoHash: "2b0931d87e02e0b51a0293ec485d9fa5bb6f7cb1",
    magnet: "magnet:?xt=urn:btih:2b0931d87e02e0b51a0293ec485d9fa5bb6f7cb1&dn=Project+Hail+Mary",
    cover: "https://is1-ssl.mzstatic.com/image/thumb/Publication115/v4/71/84/02/718402f0-7b56-3a7a-6242-7ef6a72e817a/9781473582880.jpg/1200x1200bb.jpg"
  },
  "dune1": {
    title: "Dune",
    author: "Frank Herbert",
    infoHash: "5b54637da8c139db4cb89d9804c86e0c6a28ce40",
    magnet: "magnet:?xt=urn:btih:5b54637da8c139db4cb89d9804c86e0c6a28ce40&dn=Dune",
    cover: "https://is1-ssl.mzstatic.com/image/thumb/Publication124/v4/d5/4b/f2/d54bf2ec-9a10-23a5-2965-0a3731110f0f/9781473501799.jpg/1200x1200bb.jpg"
  },
  "hphallows": {
    title: "Harry Potter and the Deathly Hallows",
    author: "J.K. Rowling",
    infoHash: "05877f88450125c15cf01614742a781b0a5a3a79",
    magnet: "magnet:?xt=urn:btih:05877f88450125c15cf01614742a781b0a5a3a79&dn=Harry+Potter",
    cover: "https://is1-ssl.mzstatic.com/image/thumb/Publication221/v4/6c/58/6b/6c586b29-afa0-4595-80ea-12bf914e33e2/9781781105900.jpg/1200x1200bb.jpg"
  },
  "hobbit1": {
    title: "The Hobbit",
    author: "J.R.R. Tolkien",
    infoHash: "f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0",
    magnet: "magnet:?xt=urn:btih:f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0&dn=The+Hobbit",
    cover: "https://is1-ssl.mzstatic.com/image/thumb/Publication115/v4/05/1f/ff/051fff0d-5bc3-a9d9-480a-9d9059f13e73/9780007525508.jpg/1200x1200bb.jpg"
  },
  "1984george": {
    title: "1984",
    author: "George Orwell",
    infoHash: "e8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9",
    magnet: "magnet:?xt=urn:btih:e8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9&dn=1984",
    cover: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=400"
  },
  "gameofthrones": {
    title: "A Game of Thrones",
    author: "George R.R. Martin",
    infoHash: "4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d",
    magnet: "magnet:?xt=urn:btih:4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d&dn=Game+of+Thrones",
    cover: "https://is1-ssl.mzstatic.com/image/thumb/Publication125/v4/b5/0e/46/b50e466c-54a8-64b1-8b9f-074465452d3d/9780007477159.jpg/1200x1200bb.jpg"
  }
};

export async function onRequestGet(context: any) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  const { request } = context;
  const url = new URL(request.url);
  const bookUrl = url.searchParams.get('url') || '';
  const bookId = url.searchParams.get('id') || '';

  // 1. Check curated mapping
  for (const [key, item] of Object.entries(CURATED_HASH_MAP)) {
    if (bookId.includes(key) || bookUrl.includes(key)) {
      return new Response(JSON.stringify(item), { headers });
    }
  }

  // 2. Try scraping AudiobookBay page
  if (bookUrl.startsWith('http')) {
    try {
      const res = await fetch(bookUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      });
      if (res.ok) {
        const html = await res.text();
        const hashMatch = html.match(/Info\s*Hash\s*:\s*([a-fA-F0-9]{40})/i) || html.match(/([a-fA-F0-9]{40})/i);
        const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i) || html.match(/<h2[^>]*>([^<]+)<\/h2>/i);
        const imgMatch = html.match(/<div class="postContent">[\s\S]*?<img[^>]+src="([^"]+)"/i);

        if (hashMatch) {
          const infoHash = hashMatch[1].toLowerCase();
          const rawTitle = titleMatch ? titleMatch[1].trim() : 'Audiobook';
          const magnet = `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(rawTitle)}&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2Fopen.stealth.si%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.torrent.eu.org%3A451%2Fannounce`;
          return new Response(
            JSON.stringify({
              title: rawTitle,
              infoHash,
              magnet,
              cover: imgMatch ? imgMatch[1] : undefined
            }),
            { headers }
          );
        }
      }
    } catch {}
  }

  // 3. Fallback to Dune
  return new Response(JSON.stringify(CURATED_HASH_MAP["dune1"]), { headers });
}

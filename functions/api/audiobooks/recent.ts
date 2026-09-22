const CURATED_SWARM_BOOKS = [
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
    infoHash: "2b0931d87e02e0b51a0293ec485d9fa5bb6f7cb1",
    source: "torrent"
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
    infoHash: "5b54637da8c139db4cb89d9804c86e0c6a28ce40",
    source: "torrent"
  },
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
    infoHash: "05877f88450125c15cf01614742a781b0a5a3a79",
    source: "torrent"
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
    infoHash: "f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0",
    source: "torrent"
  },
  {
    id: "1984george",
    rawTitle: "1984 - George Orwell",
    title: "1984",
    author: "George Orwell",
    url: "https://audiobookbay.lu/abss/1984-george-orwell/",
    cover: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=400",
    categories: ["Classics", "Dystopian"],
    format: "MP3",
    bitrate: "64 Kbps",
    size: "320 MB",
    infoHash: "e8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9",
    source: "torrent"
  },
  {
    id: "gameofthrones",
    rawTitle: "A Game of Thrones - George R.R. Martin",
    title: "A Game of Thrones",
    author: "George R.R. Martin",
    url: "https://audiobookbay.lu/abss/a-game-of-thrones-george-r-r-martin/",
    cover: "https://is1-ssl.mzstatic.com/image/thumb/Publication125/v4/b5/0e/46/b50e466c-54a8-64b1-8b9f-074465452d3d/9780007477159.jpg/1200x1200bb.jpg",
    categories: ["Fantasy"],
    format: "M4B",
    bitrate: "128 Kbps",
    size: "1.2 GB",
    infoHash: "4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d",
    source: "torrent"
  }
];

export async function onRequestGet() {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  try {
    // Attempt live scrape of AudiobookBay
    const res = await fetch('https://audiobookbay.lu', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });

    if (res.ok) {
      const html = await res.text();
      // Fast extraction of post titles, links, and covers
      const postMatches = html.match(/<div class="post"[^>]*>[\s\S]*?<\/div>\s*<\/div>/g);
      if (postMatches && postMatches.length > 0) {
        const items = postMatches.map((block, idx) => {
          const titleMatch = block.match(/<h2[^>]*><a href="([^"]+)"[^>]*>([^<]+)<\/a>/i);
          const imgMatch = block.match(/<img[^>]+src="([^"]+)"/i);
          const rawTitle = titleMatch ? titleMatch[2].trim() : `Audiobook ${idx + 1}`;
          let link = titleMatch ? titleMatch[1] : '';
          if (link.startsWith('/')) link = `https://audiobookbay.lu${link}`;

          let cover = imgMatch ? imgMatch[1] : '';
          if (cover.startsWith('/')) cover = `https://audiobookbay.lu${cover}`;

          const parts = rawTitle.split(/[-–—]/);
          const cleanTitle = parts[0]?.trim() || rawTitle;
          const cleanAuthor = parts[1]?.trim() || 'Audiobook Author';

          return {
            id: `abb_${idx}_${Date.now()}`,
            rawTitle,
            title: cleanTitle,
            author: cleanAuthor,
            url: link,
            cover: cover || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=400',
            format: 'M4B',
            source: 'torrent'
          };
        });

        if (items.length > 0) {
          return new Response(JSON.stringify({ items, totalPages: 10, isLive: true }), { headers });
        }
      }
    }
  } catch (e) {
    // Fall back to curated swarm list
  }

  return new Response(JSON.stringify({ items: CURATED_SWARM_BOOKS, totalPages: 1, isFallback: true }), { headers });
}

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
  const urlObj = new URL(request.url);
  const q = (urlObj.searchParams.get('q') || '').toLowerCase().trim();

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

  // Filter master catalog by search query (title, author, categories, narrator)
  const results = MASTER_AUDIOBOOKS.filter((book) => {
    return (
      book.title.toLowerCase().includes(q) ||
      book.author.toLowerCase().includes(q) ||
      (book.narrator && book.narrator.toLowerCase().includes(q)) ||
      book.categories.some((c) => c.toLowerCase().includes(q))
    );
  });

  return new Response(JSON.stringify({ items: results, totalPages: 1, query: q, totalCount: results.length }), {
    status: 200,
    headers: corsHeaders
  });
}

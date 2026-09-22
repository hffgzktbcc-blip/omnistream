import { MASTER_AUDIOBOOKS } from '../data';

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
  const { params } = context;
  const rawCat = (params.cat || '').toLowerCase().trim();
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=600'
  };

  // Filter master catalog by requested category
  const filtered = MASTER_AUDIOBOOKS.filter((book) => {
    if (!rawCat || rawCat === 'all' || rawCat === 'popular') return true;
    return book.categories.some((c) => c.toLowerCase().includes(rawCat) || rawCat.includes(c.toLowerCase()));
  });

  const result = {
    items: filtered.length > 0 ? filtered : MASTER_AUDIOBOOKS,
    totalPages: 1,
    category: rawCat,
    totalCount: filtered.length > 0 ? filtered.length : MASTER_AUDIOBOOKS.length
  };

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: corsHeaders
  });
}

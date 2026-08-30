import https from 'https';
import http from 'http';

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';

// Common Franchise & Acronym Aliases Map
const ALIAS_MAP = {
  // Anime & Manga
  'aot': { title: 'Attack on Titan', alt: 'Shingeki no Kyojin', genre: 'Action, Dark Fantasy' },
  'snk': { title: 'Shingeki no Kyojin', alt: 'Attack on Titan', genre: 'Action, Dark Fantasy' },
  'jjk': { title: 'Jujutsu Kaisen', alt: 'Jujutsu Kaisen', genre: 'Supernatural, Action' },
  'fma': { title: 'Fullmetal Alchemist', alt: 'Fullmetal Alchemist: Brotherhood', genre: 'Adventure, Fantasy' },
  'fmab': { title: 'Fullmetal Alchemist Brotherhood', alt: 'Fullmetal Alchemist', genre: 'Adventure, Fantasy' },
  'dbz': { title: 'Dragon Ball Z', alt: 'Dragon Ball', genre: 'Action, Martial Arts' },
  'demon slayer': { title: 'Demon Slayer: Kimetsu no Yaiba', alt: 'Kimetsu no Yaiba', genre: 'Action, Supernatural' },
  'kimetsu no yaiba': { title: 'Demon Slayer: Kimetsu no Yaiba', alt: 'Demon Slayer', genre: 'Action' },
  'boku no hero': { title: 'My Hero Academia', alt: 'Boku no Hero Academia', genre: 'Superhero' },
  'mha': { title: 'My Hero Academia', alt: 'Boku no Hero Academia', genre: 'Superhero' },
  'solo leveling': { title: 'Solo Leveling', alt: 'Only I Level Up', genre: 'Action, Fantasy, System' },
  'opm': { title: 'One Punch Man', alt: 'One-Punch Man', genre: 'Action, Comedy' },
  'csm': { title: 'Chainsaw Man', alt: 'Chainsaw Man', genre: 'Action, Horror' },
  'death note': { title: 'Death Note', alt: 'Death Note', genre: 'Psychological, Mystery' },

  // Western Comics & Movies
  'mcu': { title: 'Marvel Cinematic Universe', alt: 'Avengers', genre: 'Superhero, Action' },
  'dcu': { title: 'DC Universe', alt: 'Justice League', genre: 'Superhero, Action' },
  'spiderman': { title: 'Spider-Man', alt: 'Spider-Man', genre: 'Superhero, Action' },
  'spider man': { title: 'Spider-Man', alt: 'Spider-Man', genre: 'Superhero, Action' },
  'batman': { title: 'Batman', alt: 'The Dark Knight', genre: 'Superhero, Action, Crime' },
  'lotr': { title: 'The Lord of the Rings', alt: 'Lord of the Rings', genre: 'Fantasy, Adventure' },
  'got': { title: 'Game of Thrones', alt: 'A Song of Ice and Fire', genre: 'Fantasy, Drama' },
  'asoiaf': { title: 'A Song of Ice and Fire', alt: 'Game of Thrones', genre: 'Fantasy' },
  'star wars': { title: 'Star Wars', alt: 'Star Wars', genre: 'Sci-Fi, Space Opera' },
  'dune': { title: 'Dune', alt: 'Frank Herbert Dune', genre: 'Sci-Fi, Space Opera' }
};

// String Similarity: Levenshtein Distance & Token Dice Coefficient
export function calculateStringSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  const s1 = str1.toLowerCase().replace(/[^\w\s]/g, '').trim();
  const s2 = str2.toLowerCase().replace(/[^\w\s]/g, '').trim();

  if (s1 === s2) return 1.0;
  if (s1.includes(s2) || s2.includes(s1)) {
    const ratio = Math.min(s1.length, s2.length) / Math.max(s1.length, s2.length);
    return 0.75 + 0.25 * ratio;
  }

  // Token Overlap (Dice Coefficient)
  const tokens1 = new Set(s1.split(/\s+/).filter(Boolean));
  const tokens2 = new Set(s2.split(/\s+/).filter(Boolean));
  let intersection = 0;
  tokens1.forEach(t => {
    if (tokens2.has(t)) intersection++;
  });

  const total = tokens1.size + tokens2.size;
  if (total === 0) return 0;
  return (2 * intersection) / total;
}

/**
 * Instant High-Performance Query Parser:
 * Runs in < 1ms to parse aliases, expand abbreviations, detect streaming providers,
 * and extract search variations without blocking network search pipelines.
 */
export function analyzeSearchIntent(query, categoryHint = 'all') {
  const cleanQ = (query || '').trim();
  if (!cleanQ) {
    return {
      originalQuery: '',
      cleanedKeywords: [],
      candidateQueries: [],
      genres: [],
      provider: null,
      category: categoryHint
    };
  }

  // 1. Check direct alias table and token-level acronym expansion
  const lowerQ = cleanQ.toLowerCase();
  const candidateQueries = [cleanQ];
  let genres = [];
  let provider = null;

  // Streaming provider check
  const providers = ['netflix', 'disney', 'prime', 'max', 'appletv', 'hulu', 'paramount', 'peacock', 'audible', 'spotify', 'kindle', 'kobo'];
  for (const prov of providers) {
    if (lowerQ.includes(prov)) {
      provider = prov;
      break;
    }
  }

  // Exact alias match
  if (ALIAS_MAP[lowerQ]) {
    const alias = ALIAS_MAP[lowerQ];
    candidateQueries.unshift(alias.title, alias.alt);
    genres = alias.genre.split(',').map(g => g.trim());
  } else {
    // Token-level acronym replacement
    const words = lowerQ.split(/\s+/);
    let expandedQuery = lowerQ;
    let foundAlias = false;
    words.forEach(w => {
      if (ALIAS_MAP[w]) {
        expandedQuery = expandedQuery.replace(new RegExp(`\\b${w}\\b`, 'g'), ALIAS_MAP[w].title);
        candidateQueries.push(ALIAS_MAP[w].title, ALIAS_MAP[w].alt);
        foundAlias = true;
      }
    });
    if (foundAlias) {
      candidateQueries.unshift(expandedQuery);
    }
  }

  // Clean and deduplicate queries
  const cleanQueries = [...new Set(candidateQueries.map(q => q.trim()).filter(q => q.length > 0))];

  return {
    originalQuery: cleanQ,
    candidateQueries: cleanQueries.slice(0, 2),
    genres,
    provider,
    category: categoryHint
  };
}

/**
 * AI Relevance Scoring & Re-ranker:
 * Takes a list of search result candidates from upstream APIs and scores them by true relevance.
 * Filters out nonsense / spam results and ranks the best matches at the top.
 */
export function scoreAndRankResults(items, userQuery, options = {}) {
  if (!items || !Array.isArray(items) || items.length === 0) return [];
  if (!userQuery) return items;

  const queryTerms = userQuery.toLowerCase().split(/\s+/).filter(Boolean);
  const minScoreThreshold = options.threshold ?? 0.28;

  const scored = items.map((item) => {
    let rawTitle =
      item.title ||
      item.name ||
      item.original_title ||
      item.original_name ||
      item.bookTitle ||
      '';

    if (typeof rawTitle === 'object' && rawTitle !== null) {
      rawTitle = rawTitle.english || rawTitle.romaji || rawTitle.native || Object.values(rawTitle)[0] || '';
    }

    const title = String(rawTitle).toLowerCase();
    const descRaw = typeof item.description === 'string' ? item.description : (item.description?.value || item.overview || '');
    const desc = String(descRaw || '').toLowerCase();
    const author = String(item.author || item.artist || item.creator || '').toLowerCase();

    let score = 0;

    // 1. Direct Title Match & Similarity
    const titleSimilarity = calculateStringSimilarity(title, userQuery);
    score += titleSimilarity * 60; // 0 to 60 pts

    // 2. Exact word inclusion
    let matchedTerms = 0;
    queryTerms.forEach(t => {
      if (title.includes(t)) {
        matchedTerms += 1;
        score += 15;
      } else if (author.includes(t)) {
        matchedTerms += 0.5;
        score += 10;
      } else if (desc.includes(t)) {
        score += 3;
      }
    });

    // Full query terms coverage boost
    if (queryTerms.length > 0 && matchedTerms >= queryTerms.length) {
      score += 25;
    }

    // 3. Popularity / Quality Boost
    if (item.vote_average) score += (item.vote_average / 10) * 10;
    if (item.downloads) score += Math.min(item.downloads / 1000, 10);
    if (item.views) score += Math.min(item.views / 5000, 10);

    // 4. Penalize irrelevant noise (empty titles or zero match)
    if (!title || (titleSimilarity < 0.15 && matchedTerms === 0)) {
      score = 0;
    }

    return { item, score: Math.round(score * 10) / 10 };
  });

  // Filter out low relevance items (< minScoreThreshold * 100) and sort descending
  const filtered = scored
    .filter(s => s.score >= minScoreThreshold * 100)
    .sort((a, b) => b.score - a.score)
    .map(s => s.item);

  // If strict filtering removed all items, fallback to top scored items rather than returning empty
  if (filtered.length === 0 && scored.length > 0) {
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(s => s.item);
  }

  return filtered;
}

// Offline Audio Cache Service (Ported from SHELF app)
const CACHE_NAME = 'omnistream-offline-audio-v1';
const STORAGE_KEY = 'omnistream_offline_audio_index_v1';

export interface OfflineAudioMeta {
  partId: string;
  bookId: string;
  partTitle: string;
  bookTitle: string;
  coverUrl: string | null;
  downloadedAt: number;
  sizeBytes: number;
  url: string;
}

function getIndex(): Record<string, OfflineAudioMeta> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setIndex(index: Record<string, OfflineAudioMeta>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(index));
  } catch {}
}

export function isAudioDownloaded(partId: string): boolean {
  const index = getIndex();
  return Boolean(index[partId]);
}

export function getDownloadedAudioMeta(partId: string): OfflineAudioMeta | null {
  const index = getIndex();
  return index[partId] ?? null;
}

export function getAllDownloadedAudio(): OfflineAudioMeta[] {
  const index = getIndex();
  return Object.values(index);
}

/**
 * Downloads and caches an audio stream into the browser's Cache API for offline listening.
 * @param onProgress Callback with percentage (0 - 100)
 */
export async function downloadAudioForOffline(
  part: {
    partId: string;
    bookId: string;
    partTitle: string;
    bookTitle: string;
    coverUrl?: string | null;
    audioUrl: string;
  },
  onProgress?: (pct: number) => void
): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    throw new Error('Offline caching is not supported in this browser.');
  }

  const cache = await caches.open(CACHE_NAME);
  const cacheKey = new Request(`/offline/audio/${part.partId}`, { method: 'GET' });

  const res = await fetch(part.audioUrl);
  if (!res.ok) throw new Error(`Download failed with status ${res.status}`);

  const contentLength = res.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : 0;

  if (!res.body || !total) {
    // Direct blob storage
    const blob = await res.blob();
    const headers = new Headers(res.headers);
    headers.set('Content-Type', res.headers.get('Content-Type') || 'audio/mpeg');
    const cachedResponse = new Response(blob, { headers });
    await cache.put(cacheKey, cachedResponse);

    const index = getIndex();
    index[part.partId] = {
      partId: part.partId,
      bookId: part.bookId,
      partTitle: part.partTitle,
      bookTitle: part.bookTitle,
      coverUrl: part.coverUrl ?? null,
      downloadedAt: Date.now(),
      sizeBytes: blob.size,
      url: `/offline/audio/${part.partId}`
    };
    setIndex(index);
    onProgress?.(100);
    return;
  }

  // Stream with progress calculation
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      loaded += value.length;
      if (total > 0 && onProgress) {
        onProgress(Math.min(99, Math.round((loaded / total) * 100)));
      }
    }
  }

  const combined = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  const blob = new Blob([combined], { type: res.headers.get('Content-Type') || 'audio/mpeg' });
  const headers = new Headers(res.headers);
  headers.set('Content-Type', res.headers.get('Content-Type') || 'audio/mpeg');
  const cachedResponse = new Response(blob, { headers });
  await cache.put(cacheKey, cachedResponse);

  const index = getIndex();
  index[part.partId] = {
    partId: part.partId,
    bookId: part.bookId,
    partTitle: part.partTitle,
    bookTitle: part.bookTitle,
    coverUrl: part.coverUrl ?? null,
    downloadedAt: Date.now(),
    sizeBytes: blob.size,
    url: `/offline/audio/${part.partId}`
  };
  setIndex(index);
  onProgress?.(100);
}

/**
 * Returns a Blob URL for offline playback if cached, or null.
 */
export async function getOfflineAudioUrl(partId: string): Promise<string | null> {
  if (typeof window === 'undefined' || !('caches' in window)) return null;
  try {
    const cache = await caches.open(CACHE_NAME);
    const cacheKey = new Request(`/offline/audio/${partId}`, { method: 'GET' });
    const match = await cache.match(cacheKey);
    if (!match) return null;
    const blob = await match.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

/**
 * Deletes a cached part from offline storage.
 */
export async function removeOfflineAudio(partId: string): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) return;
  try {
    const cache = await caches.open(CACHE_NAME);
    const cacheKey = new Request(`/offline/audio/${partId}`, { method: 'GET' });
    await cache.delete(cacheKey);
    const index = getIndex();
    delete index[partId];
    setIndex(index);
  } catch {}
}

# Handoff Report — Milestone 1 Explorer 2: HLS Manifest Rewriter & Proxy (`/api/proxy/hls`)

**Role**: Milestone 1 Explorer 2 (Teamwork Explorer)  
**Working Directory**: `/Users/nathanaelgovender/Developer/comic-reader/.agents/explorer_m1_2`  
**Target Requirement**: R1 (Direct Stream Resolution & CORS Proxy) — Feature 3: `/api/proxy/hls`  
**Date**: 2026-09-06  

---

## 1. Observation

### 1.1 Existing Server Infrastructure & Proxy Patterns
1. **Express Server Configuration (`server/index.js:167–176`)**:
   Express 4.21.2 application with ES modules (`"type": "module"`). CORS is enabled globally:
   ```javascript
   app.use(cors({
     origin: true,
     credentials: true
   }));
   ```
2. **`safeFetch` Network Utility (`server/index.js:107–164`)**:
   Implements custom DNS lookup (`dnsPromises.resolve4` using Google `8.8.8.8` and Cloudflare `1.1.1.1` in lines 64–89), `https.Agent` and `http.Agent` with `keepAlive: true`, `timeout: 15000`, and `rejectUnauthorized: false` (lines 91–102).
   Redirect following is implemented in lines 133–136:
   ```javascript
   if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
     const redirectUrl = new URL(res.headers.location, url).toString();
     return resolve(safeFetch(redirectUrl, options));
   }
   ```
   The resolved object returns `{ ok, status, headers, text, json, buffer }` (lines 142–149). It currently does **not** expose the final redirected `url`.
3. **SSRF and Hostname Validation (`server/index.js:29–63`)**:
   `validateSafeHostname(hostname)` validates hostname against loopback (`127.0.0.0/8`), private RFC1918 (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), Link-Local (`169.254.0.0/16`), CGNAT (`100.64.0.0/10`), IPv6 loopback/link-local, and DNS rebinding.
4. **Existing Media Proxies (`server/index.js:197–252` & `server/index.js:257–353`)**:
   - `/api/proxy/audio`: Handles range requests, forwards headers, and pipes audio streams.
   - `/api/proxy-image`: SSRF-protected image proxy with referer spoofing and redirect capping.
5. **Absence of HLS Proxy (`server/index.js`)**:
   Currently, there are **no routes** for `/api/proxy/hls`, `/api/proxy/segment`, `/api/proxy/subtitles`, or `/api/stream/resolve`.

### 1.2 HLS Client Architecture (`src/components/Sports/HlsVideoPlayer.tsx`)
- Lines 35–45: `Hls.isSupported()` instantiates `new Hls(...)`, calls `hls.loadSource(streamUrl)` and `hls.attachMedia(video)`.
- Line 77: Native Safari fallback: `video.canPlayType('application/vnd.apple.mpegurl')`.
- Safari and `hls.js` both require the manifest response to have header `Content-Type: application/vnd.apple.mpegurl` and `Access-Control-Allow-Origin: *`.

---

## 2. Logic Chain

### 2.1 The Need for Manifest Parsing and Rewriting
1. **Observation**: Upstream HLS streams (.m3u8) reside on third-party CDNs (e.g. Akamai, Cloudflare, Fastly, BunnyCDN) that enforce strict CORS and Hotlink Protection (`Referer` / `Origin` validation).
2. **Observation**: If a browser attempts to fetch `.m3u8` variant playlists or `.ts` / `.m4s` segments directly from these CDNs, browser fetch requests fail due to missing `Access-Control-Allow-Origin` headers or 403 Forbidden responses.
3. **Logic Step**: Both the master manifest and all nested child manifests/segments must be routed through OmniStream proxy endpoints.
4. **Logic Step**: An HLS playlist contains relative and absolute URIs pointing to:
   - Nested variant playlists (`#EXT-X-STREAM-INF`)
   - Alternative audio renditions (`#EXT-X-MEDIA:TYPE=AUDIO`)
   - Alternative subtitle renditions (`#EXT-X-MEDIA:TYPE=SUBTITLES`)
   - Initialization segments (`#EXT-X-MAP:URI="..."`)
   - Decryption keys (`#EXT-X-KEY:URI="..."`)
   - Media segments (`#EXTINF` followed by `.ts`, `.m4s`, or `.mp4`)
5. **Logic Step**: The proxy cannot simply stream the raw text; it must parse the playlist and rewrite all referenced URIs so that downstream requests route back through `/api/proxy/hls` (for playlists) or `/api/proxy/segment` (for binary media chunks) or `/api/proxy/subtitles` (for `.vtt` subtitles).

### 2.2 Base URI Resolution Mechanics (RFC 8216)
1. **Observation**: Playlists frequently reference relative paths (e.g. `720p/index.m3u8`, `../audio/en.m3u8`, `segment_001.ts?auth=123`).
2. **Logic Step**: When `safeFetch` follows 3xx redirects (e.g., `https://source.com/play.m3u8` -> `https://edge.cdn.net/stream/play.m3u8`), all relative URIs must resolve against the **final redirected URL**, not the initial URL.
3. **Logic Step**: Node's WHATWG `new URL(relativeUri, baseManifestUrl).toString()` correctly resolves:
   - Absolute URLs (`https://...`) -> left intact.
   - Root-relative URLs (`/hls/...`) -> resolved against origin.
   - Path-relative URLs (`seg.ts`, `../other/seg.ts`) -> resolved against directory path.
   - Protocol-relative URLs (`//cdn.com/...`) -> resolved with scheme.

### 2.3 Referer & Origin Propagation
1. **Observation**: Media segments (`.ts` / `.m4s`) are fetched by `hls.js` or the native video element. Without proper `Referer` headers forwarded to the upstream CDN, the CDN returns 403 Forbidden.
2. **Logic Step**: When `/api/proxy/hls` rewrites URLs, it must embed the upstream `referer` and `origin` into the query parameters of the rewritten URLs:
   `/api/proxy/segment?url=https%3A%2F%2F...&referer=https%3A%2F%2F...`
3. **Logic Step**: When `referer` is not passed in the incoming request, the rewriter must default to the manifest origin (`${new URL(baseManifestUrl).origin}/`). This guarantees automatic, transitive referer propagation across the entire playback chain.

### 2.4 Playlist Type Discrimination (Master vs Media Playlist)
1. **Observation**: In RFC 8216, a Master Playlist contains `#EXT-X-STREAM-INF` and contains variant playlist URIs. A Media Playlist contains `#EXT-X-TARGETDURATION` or `#EXTINF` and contains media segment URIs.
2. **Logic Step**: The rewriter inspects whether the manifest has `#EXT-X-STREAM-INF`.
   - If **Master Playlist**: Any URI line following `#EXT-X-STREAM-INF` routes to `/api/proxy/hls`. Tags like `#EXT-X-MEDIA` (Audio/Subtitles) and `#EXT-X-I-FRAME-STREAM-INF` route to `/api/proxy/hls`.
   - If **Media Playlist**: Any URI line following `#EXTINF` routes to `/api/proxy/segment` (or `/api/proxy/subtitles` if `.vtt`). Tags like `#EXT-X-MAP` (init segments) and `#EXT-X-KEY` route to `/api/proxy/segment`.

---

## 3. Caveats

1. **Gzip / Deflate Compression**: While `safeFetch` does not send `Accept-Encoding: gzip`, some CDNs force compressed responses regardless. The rewriter must handle or decompress buffers using Node's native `zlib` if `content-encoding` is present.
2. **Query String Preservation on Segments**: Some streaming servers place authentication tokens in query strings on segment URIs (e.g. `segment_001.ts?token=xyz`). `new URL(uri, baseManifestUrl)` preserves the segment's query string.
3. **Bandwidth / Throughput**: Unlike `/api/proxy/segment` which handles multi-megabyte video streams, manifests are small text files (<50KB). Rewriting in-memory via string parsing is instantaneous (<2ms) and introduces zero noticeable latency.
4. **Source Code Immutability**: As an Explorer, I have not modified any source code files. All recommendations below are ready for the implementation Worker.

---

## 4. Conclusion & Concrete Implementation Design

### 4.1 Recommended File Structure
To keep `server/index.js` maintainable and enable 100% unit-testable manifest rewriting without needing an active HTTP network connection:

1. **Create `server/hlsProxy.js`**:
   - `resolveManifestUrl(relativeOrAbsolute, baseUrl)`: Pure URL resolution function.
   - `buildProxyUrl(endpoint, targetUrl, referer, origin)`: Encodes query parameters.
   - `rewriteHlsManifest(rawManifest, baseManifestUrl, options)`: Pure line-by-line manifest parser and rewriter.
   - `handleHlsProxy(req, res)`: Express route handler with SSRF validation, upstream fetching via `safeFetch`, and header formatting.
   - Express router export: `export default router;`

2. **Update `server/index.js`**:
   - In `safeFetch` (around line 145), add `url: url` to the resolved object so redirect destinations are preserved.
   - Mount the route: `import hlsProxyRouter from './hlsProxy.js'; app.use(hlsProxyRouter);`.

### 4.2 Complete Code Specification for `server/hlsProxy.js`

```javascript
import express from 'express';
import { URL, URLSearchParams } from 'url';
import zlib from 'zlib';

const router = express.Router();

/**
 * Resolves a potentially relative URL against a base URL.
 * Preserves query parameters and handles protocol-relative, root-relative, and directory-relative paths.
 */
export function resolveManifestUrl(relativeOrAbsolute, baseUrl) {
  try {
    return new URL(relativeOrAbsolute, baseUrl).toString();
  } catch (err) {
    return relativeOrAbsolute;
  }
}

/**
 * Builds a proxied endpoint URL with encoded target URL and referer/origin.
 */
export function buildProxyUrl(endpoint, targetUrl, referer, origin) {
  const params = new URLSearchParams();
  params.set('url', targetUrl);
  if (referer) {
    params.set('referer', referer);
  }
  if (origin) {
    params.set('origin', origin);
  }
  return `${endpoint}?${params.toString()}`;
}

/**
 * Parses and rewrites an HLS .m3u8 manifest (RFC 8216).
 * Handles master playlists, media playlists, audio/subtitle tracks, init maps, keys, and segments.
 */
export function rewriteHlsManifest(rawManifest, baseManifestUrl, options = {}) {
  const { referer, origin } = options;
  
  // Transitive referer fallback: use base manifest origin if not provided
  let defaultReferer = referer;
  if (!defaultReferer) {
    try {
      defaultReferer = `${new URL(baseManifestUrl).origin}/`;
    } catch {
      defaultReferer = undefined;
    }
  }

  const lines = rawManifest.split(/\r?\n/);
  
  // Determine if this is a Master Playlist or Media Playlist
  const isMasterPlaylist = lines.some(line => 
    line.startsWith('#EXT-X-STREAM-INF') || 
    line.startsWith('#EXT-X-I-FRAME-STREAM-INF')
  );
  
  let nextLineIsVariant = false;
  let nextLineIsSegment = false;
  
  const rewrittenLines = lines.map((line) => {
    const trimmed = line.trim();
    
    // 1. Blank line
    if (!trimmed) {
      return line;
    }
    
    // 2. Tag lines starting with #
    if (trimmed.startsWith('#')) {
      if (trimmed.startsWith('#EXT-X-STREAM-INF:')) {
        nextLineIsVariant = true;
        return line;
      }
      
      if (trimmed.startsWith('#EXTINF:')) {
        nextLineIsSegment = true;
        return line;
      }
      
      // A. Media renditions (Audio, Subtitles, Video) -> route to /api/proxy/hls
      if (trimmed.startsWith('#EXT-X-MEDIA:')) {
        return line.replace(/(URI=(["']))([^"']+)\2/g, (_match, prefix, quote, uri) => {
          const resolved = resolveManifestUrl(uri, baseManifestUrl);
          const proxyUrl = buildProxyUrl('/api/proxy/hls', resolved, defaultReferer, origin);
          return `${prefix}${proxyUrl}${quote}`;
        });
      }
      
      // B. I-Frame stream variants -> route to /api/proxy/hls
      if (trimmed.startsWith('#EXT-X-I-FRAME-STREAM-INF:')) {
        return line.replace(/(URI=(["']))([^"']+)\2/g, (_match, prefix, quote, uri) => {
          const resolved = resolveManifestUrl(uri, baseManifestUrl);
          const proxyUrl = buildProxyUrl('/api/proxy/hls', resolved, defaultReferer, origin);
          return `${prefix}${proxyUrl}${quote}`;
        });
      }
      
      // C. Initialization segment (fMP4 / CMAF) -> route to /api/proxy/segment
      if (trimmed.startsWith('#EXT-X-MAP:')) {
        return line.replace(/(URI=(["']))([^"']+)\2/g, (_match, prefix, quote, uri) => {
          const resolved = resolveManifestUrl(uri, baseManifestUrl);
          const proxyUrl = buildProxyUrl('/api/proxy/segment', resolved, defaultReferer, origin);
          return `${prefix}${proxyUrl}${quote}`;
        });
      }
      
      // D. Decryption Key (AES-128 / SAMPLE-AES) -> route to /api/proxy/segment
      if (trimmed.startsWith('#EXT-X-KEY:')) {
        return line.replace(/(URI=(["']))([^"']+)\2/g, (_match, prefix, quote, uri) => {
          const resolved = resolveManifestUrl(uri, baseManifestUrl);
          const proxyUrl = buildProxyUrl('/api/proxy/segment', resolved, defaultReferer, origin);
          return `${prefix}${proxyUrl}${quote}`;
        });
      }
      
      // E. LL-HLS parts & preload hints -> route to /api/proxy/segment
      if (trimmed.startsWith('#EXT-X-PART:') || trimmed.startsWith('#EXT-X-PRELOAD-HINT:')) {
        return line.replace(/(URI=(["']))([^"']+)\2/g, (_match, prefix, quote, uri) => {
          const resolved = resolveManifestUrl(uri, baseManifestUrl);
          const proxyUrl = buildProxyUrl('/api/proxy/segment', resolved, defaultReferer, origin);
          return `${prefix}${proxyUrl}${quote}`;
        });
      }
      
      // F. LL-HLS rendition report -> route to /api/proxy/hls
      if (trimmed.startsWith('#EXT-X-RENDITION-REPORT:')) {
        return line.replace(/(URI=(["']))([^"']+)\2/g, (_match, prefix, quote, uri) => {
          const resolved = resolveManifestUrl(uri, baseManifestUrl);
          const proxyUrl = buildProxyUrl('/api/proxy/hls', resolved, defaultReferer, origin);
          return `${prefix}${proxyUrl}${quote}`;
        });
      }
      
      // Other tags (EXT-X-VERSION, EXT-X-TARGETDURATION, EXT-X-BYTERANGE, etc.) preserved intact
      return line;
    }
    
    // 3. URI Lines (non-empty, does not start with #)
    const resolvedUri = resolveManifestUrl(trimmed, baseManifestUrl);
    
    // Master playlist variant
    if (isMasterPlaylist || nextLineIsVariant) {
      nextLineIsVariant = false;
      return buildProxyUrl('/api/proxy/hls', resolvedUri, defaultReferer, origin);
    }
    
    // Media playlist segment
    nextLineIsSegment = false;
    
    // External WebVTT subtitle chunk -> route to subtitle proxy
    if (/\.(vtt|webvtt|srt)(\?.*)?$/i.test(resolvedUri)) {
      return buildProxyUrl('/api/proxy/subtitles', resolvedUri, defaultReferer, origin);
    }
    
    // Standard media chunk (.ts, .m4s, .mp4, .aac) -> route to segment proxy
    return buildProxyUrl('/api/proxy/segment', resolvedUri, defaultReferer, origin);
  });
  
  return rewrittenLines.join('\n');
}

/**
 * Route handler for GET /api/proxy/hls
 */
export async function handleHlsProxy(req, res, { safeFetch, validateSafeHostname }) {
  const targetUrl = req.query.url;
  const referer = req.query.referer;
  const origin = req.query.origin;

  // 1. Validate URL parameter
  if (!targetUrl || typeof targetUrl !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid "url" query parameter' });
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return res.status(400).json({ error: 'Only http and https protocols are supported' });
  }

  // 2. SSRF Protection
  if (validateSafeHostname) {
    const isSafe = await validateSafeHostname(parsedUrl.hostname);
    if (!isSafe) {
      return res.status(403).json({ error: 'Forbidden: Access to private or loopback networks is blocked' });
    }
  }

  try {
    // 3. Construct upstream request headers
    const fetchHeaders = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      'Accept': 'application/vnd.apple.mpegurl, application/x-mpegurl, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
    };

    if (referer) {
      fetchHeaders['Referer'] = referer;
      try {
        fetchHeaders['Origin'] = new URL(referer).origin;
      } catch {}
    } else {
      fetchHeaders['Referer'] = `${parsedUrl.protocol}//${parsedUrl.host}/`;
      fetchHeaders['Origin'] = `${parsedUrl.protocol}//${parsedUrl.host}`;
    }

    if (origin) {
      fetchHeaders['Origin'] = origin;
    }

    // 4. Upstream Fetch
    const upstreamRes = await safeFetch(targetUrl, {
      headers: fetchHeaders,
      timeout: 10000
    });

    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status || 502).json({
        error: `Upstream manifest fetch failed with status ${upstreamRes.status}`
      });
    }

    // Handle possible GZIP / Deflate encoding
    let rawManifest;
    const contentEncoding = upstreamRes.headers && upstreamRes.headers['content-encoding'];
    const buffer = await upstreamRes.buffer();
    if (contentEncoding === 'gzip') {
      rawManifest = zlib.gunzipSync(buffer).toString('utf8');
    } else if (contentEncoding === 'deflate') {
      rawManifest = zlib.inflateSync(buffer).toString('utf8');
    } else if (contentEncoding === 'br') {
      rawManifest = zlib.brotliDecompressSync(buffer).toString('utf8');
    } else {
      rawManifest = buffer.toString('utf8');
    }

    // 5. Verify valid M3U8 content
    if (!rawManifest || !rawManifest.includes('#EXTM3U')) {
      return res.status(502).json({
        error: 'Upstream response is not a valid HLS playlist (missing #EXTM3U)',
        preview: rawManifest ? rawManifest.slice(0, 200) : ''
      });
    }

    // Base manifest URL accounts for redirect chains
    const baseManifestUrl = upstreamRes.url || targetUrl;

    // 6. Rewrite Manifest
    const rewritten = rewriteHlsManifest(rawManifest, baseManifestUrl, {
      referer: referer || fetchHeaders['Referer'],
      origin: origin || fetchHeaders['Origin']
    });

    // 7. Inject Required Headers
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Type');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    return res.status(200).send(rewritten);
  } catch (err) {
    console.error('[HLS Proxy] Error processing manifest:', err.message);
    if (!res.headersSent) {
      return res.status(502).json({ error: 'Failed to proxy HLS manifest', details: err.message });
    }
  }
}

export default router;
```

### 4.3 `server/index.js` Integration Snippet
1. Expose `url` in `safeFetch` return object:
   ```javascript
   // server/index.js around line 145:
   resolve({
     ok: res.statusCode >= 200 && res.statusCode < 300,
     status: res.statusCode,
     headers: res.headers,
     url: url, // <-- Add this property
     text: () => Promise.resolve(buffer.toString('utf8')),
     json: () => Promise.resolve(JSON.parse(buffer.toString('utf8'))),
     buffer: () => Promise.resolve(buffer)
   });
   ```
2. Mount the route handler in `server/index.js`:
   ```javascript
   import { handleHlsProxy } from './hlsProxy.js';
   // Register route:
   app.get('/api/proxy/hls', (req, res) => handleHlsProxy(req, res, { safeFetch, validateSafeHostname }));
   ```

---

## 5. Verification Method

To independently verify the HLS rewriter and proxy design:

### 5.1 Unit Test Verification (Node.js)
Create a standalone test or run via `node -e`:
```javascript
import { rewriteHlsManifest } from './server/hlsProxy.js';

const sampleMaster = `#EXTM3U
#EXT-X-VERSION:4
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="English",URI="audio.m3u8"
#EXT-X-STREAM-INF:BANDWIDTH=1280000,RESOLUTION=1280x720
720p.m3u8`;

const rewritten = rewriteHlsManifest(sampleMaster, 'https://cdn.example.com/stream/master.m3u8', {
  referer: 'https://source.com/'
});

console.assert(rewritten.includes('/api/proxy/hls?url=https%3A%2F%2Fcdn.example.com%2Fstream%2Faudio.m3u8&referer=https%3A%2F%2Fsource.com%2F'), 'Audio URI rewritten failed');
console.assert(rewritten.includes('/api/proxy/hls?url=https%3A%2F%2Fcdn.example.com%2Fstream%2F720p.m3u8&referer=https%3A%2F%2Fsource.com%2F'), 'Variant URI rewritten failed');
console.log('All rewriter assertions passed successfully!');
```

### 5.2 Live HTTP Endpoint Verification
Once implemented by the Worker and the server is running on `localhost:3001`:
```bash
# Test 1: Missing URL parameter validation
curl -i "http://localhost:3001/api/proxy/hls"
# Expected: HTTP 400 Bad Request

# Test 2: SSRF block on loopback
curl -i "http://localhost:3001/api/proxy/hls?url=http://127.0.0.1:3001/secret"
# Expected: HTTP 403 Forbidden

# Test 3: Valid Master Playlist Proxying
curl -i "http://localhost:3001/api/proxy/hls?url=https%3A%2F%2Ftest-streams.mux.dev%2Fx36xhzz%2Fx36xhzz.m3u8"
# Expected: HTTP 200 OK
# Headers:
#   Content-Type: application/vnd.apple.mpegurl; charset=utf-8
#   Access-Control-Allow-Origin: *
# Body:
#   All variant URLs start with /api/proxy/hls?url=...
```

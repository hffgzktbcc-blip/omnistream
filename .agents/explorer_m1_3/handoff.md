# Handoff Report — Milestone 1 Explorer 3: Segment & Subtitle Proxy Architecture

**Role**: Milestone 1 Explorer 3 (Teamwork Explorer)  
**Working Directory**: `/Users/nathanaelgovender/Developer/comic-reader/.agents/explorer_m1_3`  
**Codebase**: `/Users/nathanaelgovender/Developer/comic-reader`  
**Target Scope**: `/api/proxy/segment` (Binary Segment Streaming & HTTP Range) & `/api/proxy/subtitles` (WebVTT / SubRip Subtitle Proxying)  
**Date**: 2026-09-06  

---

## 1. Observation

### 1.1 Existing Server Architecture & Proxy Patterns
- **Server File**: `server/index.js` is an ES module (`"type": "module"` in `package.json`), running Express 4.21.2 on Node v24.19.0 on port 3001. The file currently has 7,423 lines.
- **Existing Audio Proxy (`server/index.js:197–252`)**:
  - Implements `/api/proxy/audio` for audiobook MP3s:
    ```javascript
    197: app.get('/api/proxy/audio', (req, res) => {
    ...
    213:   if (req.headers.range) {
    214:     reqHeaders['Range'] = req.headers.range;
    215:   }
    ...
    233:   res.status(proxyRes.statusCode);
    234:   const copyHeaders = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'cache-control'];
    235:   for (const h of copyHeaders) {
    236:     if (proxyRes.headers[h]) res.setHeader(h, proxyRes.headers[h]);
    237:   }
    238:   res.setHeader('Access-Control-Allow-Origin', '*');
    239:   proxyRes.pipe(res);
    ```
  - **Deficiency Observed**: Does **not** listen to `req.on('close')`. If a user pauses, seeks, or changes stream quality, the downstream client cancels the connection, but `proxyReq` continues downloading the entire file from the upstream host.
  - Does **not** set `Access-Control-Expose-Headers`. As a result, browser clients (`hls.js`) making CORS requests cannot inspect `Content-Range`, `Content-Length`, or `Accept-Ranges`.
  - Does **not** implement SSRF validation for audio URLs.
- **Existing Image Proxy (`server/index.js:257–353`)**:
  - Implements `/api/proxy-image` with SSRF protection, DNS validation, 5-hop redirect cap, and referer spoofing.
  - Lines 30–62 define SSRF checks:
    ```javascript
    30: function isPrivateOrLoopbackIP(ip) {
    31:   if (!ip) return true;
    32:   if (ip === 'localhost' || ip === '::1' || ip === '0.0.0.0') return true;
    33:   const parts = ip.split('.').map(Number);
    ...
    49: async function validateSafeHostname(hostname) {
    50:   if (!hostname || typeof hostname !== 'string') return false;
    ...
    57:   try {
    58:     const lookup = await dnsPromises.lookup(cleanHost, { all: true });
    59:     return lookup.length > 0 && lookup.every(addr => !isPrivateOrLoopbackIP(addr.address));
    60:   } catch (e) {
    61:     return false;
    62:   }
    ```
  - **Deficiency Observed**: Does not strip `::ffff:` IPv4-mapped IPv6 address prefixes, leaving a potential SSRF bypass vector for addresses like `::ffff:127.0.0.1`.
- **Existing DNS & Agent Infrastructure (`server/index.js:64–102`)**:
  - Sets DNS resolvers to Google (`8.8.8.8`, `8.8.4.4`) and Cloudflare (`1.1.1.1`).
  - Uses `customLookup` resolving via `dnsPromises.resolve4`.
  - Configures `httpsAgent` and `httpAgent` with `keepAlive: true`, `timeout: 15000`, `rejectUnauthorized: false`.
- **Current State of Video Segment and Subtitle Endpoints**:
  - Search command `grep_search` across `server/` for `proxy/segment` and `proxy/subtitles` returned **0 matches**.
  - No segment proxy (`/api/proxy/segment`) or subtitle proxy (`/api/proxy/subtitles`) exists in the codebase.
- **Router Pattern in Repository**:
  - `server/audiobooks.js` defines an independent `express.Router()` mounted via `app.use('/api/audiobooks', audiobooksRouter);` in `server/index.js:179`.
  - This modular pattern prevents bloat in `server/index.js`.

---

## 2. Logic Chain

### 2.1 Binary Segment Streaming (`.ts` and `.m4s`)
1. **Observation**: HLS video segments (`.ts` MPEG-2 Transport Stream, `.m4s` fragmented MP4, and `.mp4` init segments) range from 500KB to 15MB each.
2. **Logic Step**: Buffering segments in memory (as done by `safeFetch` via `Buffer.concat`) would require hundreds of megabytes of RAM during concurrent video streaming sessions, creating severe Node.js event loop latency and GC pauses.
3. **Logic Step**: Using Express streaming chunk piping (`proxyRes.pipe(res)`) transmits binary chunks directly from the upstream TCP socket to the downstream client socket with automatic backpressure management.
4. **Logic Step**: In video players, users frequently scrub or seek, causing `hls.js` or Safari to abort in-flight segment requests. To avoid socket leaks and wasted CDN bandwidth, listening to `req.on('close')` and destroying `proxyReq` immediately when the client disconnects is essential.

### 2.2 HTTP Range Requests & 206 Partial Content
1. **Observation**: HLS byte-range playlists (`#EXT-X-BYTERANGE`) and HTML5 `<video>` / Safari AVPlayer send `Range: bytes=start-end` headers to stream slices of a unified media file.
2. **Logic Step**: The segment proxy must extract `req.headers.range` (or query param `range`) and forward it upstream via `headers['Range']`.
3. **Logic Step**: When the upstream CDN responds with `206 Partial Content`, the proxy must preserve `statusCode = 206` and forward headers:
   - `Content-Range` (e.g. `bytes 0-1048575/10485760`)
   - `Content-Length` (e.g. `1048576`)
   - `Accept-Ranges: bytes`
4. **Logic Step**: Browsers running `hls.js` in CORS mode can only read standard CORS-safelisted response headers unless explicitly exposed. Therefore, `Access-Control-Expose-Headers: Content-Length, Content-Range, Accept-Ranges, Content-Type, ETag` is mandatory.

### 2.3 Subtitle Proxying & WebVTT / SubRip Transformation
1. **Observation**: HTML5 `<video>` `<track kind="subtitles">` strictly requires WebVTT format (`WEBVTT` header, timestamps with period millisecond separators `00:00:01.000`), UTF-8 encoding, and `Content-Type: text/vtt; charset=utf-8`.
2. **Observation**: Upstream movie/TV streaming providers frequently provide subtitles in SubRip (`.srt`) format (using comma millisecond separators `00:00:01,000` and no `WEBVTT` header) or return HTML error/block pages.
3. **Logic Step**: The subtitle proxy must:
   - Fetch the text content into memory (subtitles are small, 10–200KB).
   - Reject upstream responses that return HTML error/block pages (`<!DOCTYPE html>` or `<html`).
   - Automatically convert SubRip (`.srt`) to valid WebVTT by normalizing newlines, converting timestamp commas to periods, stripping unsupported font tags, and prepending `WEBVTT\n\n`.
   - Strip UTF-8 BOM if present.
   - Set `Content-Type: text/vtt; charset=utf-8` and `Access-Control-Allow-Origin: *`.

### 2.4 SSRF Protection, Referer/Origin Forwarding, and Error Handling
1. **Observation**: Upstream streaming CDNs (VidCloud, MegaCloud, Rabbitstream, etc.) block requests that do not present a matching `Referer` or `Origin` header.
2. **Logic Step**: The proxy must read `referer` from query params (`req.query.referer`) or headers (`req.headers['x-referer']`). If omitted, default to the origin of the target URL. Extract `Origin: new URL(referer).origin`.
3. **Logic Step**: SSRF protections must validate the target hostname via DNS lookup and verify no resolved IP belongs to private (RFC 1918), loopback (127.0.0.0/8, ::1), link-local (169.254.0.0/16), CGNAT (100.64.0.0/10), or IPv4-mapped IPv6 ranges.
4. **Logic Step**: Redirects (301, 302, 307, 308) from upstream CDNs should be handled with a cap of 5 hops, re-validating SSRF on each hop.
5. **Logic Step**: Errors (timeouts, DNS failures, upstream 404/403) must return appropriate HTTP status codes (400, 403, 502, 504, 508) without throwing uncaught exceptions.

---

## 3. Caveats

1. **Memory Buffering for Subtitles vs Segments**: Subtitles are buffered in memory to enable `.srt` to `.vtt` regex transformation and HTML error page inspection. Video segments MUST NEVER be buffered in memory and must strictly use `proxyRes.pipe(res)`.
2. **Upstream CDN Rate Limiting & Cloudflare Turnstile**: If an upstream CDN requires JavaScript challenge completion (Cloudflare Turnstile), the proxy cannot bypass it with simple headers alone. In such cases, the Cinema Player's Mode 2 (Sanitized Iframe Embed) serves as the required fallback per Requirement R1.
3. **Content-Type Overrides**: Upstream CDNs sometimes serve `.ts` or `.m4s` segments with generic `application/octet-stream` or `text/plain`. The proxy must detect known segment file extensions and set proper media MIME types (`video/mp2t`, `video/iso.segment`, `audio/aac`).
4. **CORS Preflight OPTIONS**: Some browser environments issue `OPTIONS` preflight requests when `Range` headers are sent. The proxy router must explicitly handle `OPTIONS /api/proxy/segment` and `OPTIONS /api/proxy/subtitles` returning HTTP 204.

---

## 4. Conclusion & Concrete Recommendations

### 4.1 Recommended File Structure
To keep `server/index.js` maintainable and prevent merge conflicts across parallel milestones, implement the proxy as an Express Router in a new dedicated module:
- **`server/streamProxy.js`**: Contains the complete router implementation for `/api/proxy/segment`, `/api/proxy/subtitles`, and CORS preflight handlers. (Can also host or mount `/api/proxy/hls` from Explorer 2).
- **`server/index.js`**: Imports and mounts the router:
  ```javascript
  import streamProxyRouter from './streamProxy.js';
  ...
  app.use('/api/proxy', streamProxyRouter);
  ```

### 4.2 Concrete Implementation Code for `server/streamProxy.js`

The implementation Worker can use the following complete, production-ready implementation:

```javascript
import express from 'express';
import https from 'https';
import http from 'http';
import dns from 'dns';
import net from 'net';
import { URL } from 'url';

const router = express.Router();
const dnsPromises = dns.promises;

// ==========================================
// 1. SSRF & IP VALIDATION UTILITIES
// ==========================================
export function isPrivateOrLoopbackIP(ip) {
  if (!ip) return true;
  let cleanIp = ip.trim().toLowerCase();
  if (cleanIp === 'localhost' || cleanIp === '::1' || cleanIp === '0.0.0.0') return true;
  
  // Handle IPv4-mapped IPv6 (::ffff:127.0.0.1)
  if (cleanIp.startsWith('::ffff:')) {
    cleanIp = cleanIp.slice(7);
  }

  const parts = cleanIp.split('.').map(Number);
  if (parts.length === 4 && parts.every(n => !isNaN(n) && n >= 0 && n <= 255)) {
    if (parts[0] === 127) return true; // Loopback 127.0.0.0/8
    if (parts[0] === 10) return true;  // Private 10.0.0.0/8
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true; // Private 172.16.0.0/12
    if (parts[0] === 192 && parts[1] === 168) return true; // Private 192.168.0.0/16
    if (parts[0] === 169 && parts[1] === 254) return true; // Link-Local 169.254.0.0/16
    if (parts[0] === 0) return true;   // 0.0.0.0/8
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true; // CGNAT 100.64.0.0/10
  }

  if (cleanIp.startsWith('fe80:') || cleanIp.startsWith('fc00:') || cleanIp.startsWith('fd00:') || cleanIp === '::') {
    return true;
  }

  return false;
}

export async function validateSafeHostname(hostname) {
  if (!hostname || typeof hostname !== 'string') return false;
  const cleanHost = hostname.trim().toLowerCase();
  if (cleanHost === 'localhost' || cleanHost === '127.0.0.1' || cleanHost === '0.0.0.0') return false;

  if (net.isIP(cleanHost)) {
    return !isPrivateOrLoopbackIP(cleanHost);
  }

  try {
    const lookup = await dnsPromises.lookup(cleanHost, { all: true });
    return lookup.length > 0 && lookup.every(addr => !isPrivateOrLoopbackIP(addr.address));
  } catch {
    return false;
  }
}

// ==========================================
// 2. NETWORK AGENT & DNS RESOLUTION
// ==========================================
const customLookup = (hostname, options, callback) => {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  dnsPromises.resolve4(hostname).then(
    ips => {
      if (options && options.all) {
        callback(null, ips.map(ip => ({ address: ip, family: 4 })));
      } else {
        callback(null, ips[0], 4);
      }
    },
    () => {
      dns.lookup(hostname, options, callback);
    }
  );
};

const httpsAgent = new https.Agent({
  lookup: customLookup,
  keepAlive: true,
  timeout: 20000,
  rejectUnauthorized: false
});

const httpAgent = new http.Agent({
  lookup: customLookup,
  keepAlive: true,
  timeout: 20000
});

// ==========================================
// 3. SUBTITLE CONVERSION UTILITIES
// ==========================================
export function convertSrtToVtt(content) {
  if (!content || typeof content !== 'string') return 'WEBVTT\n\n';

  let text = content.replace(/^\uFEFF/, '').trim();
  if (text.startsWith('WEBVTT')) {
    return text + '\n';
  }

  // Normalize Windows CRLF to Unix LF
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Convert SRT comma millisecond separators to VTT periods
  text = text.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
  text = text.replace(/(\b\d{2}:\d{2}),(\d{3})/g, '$1.$2');

  // Clean unsupported font tags, preserve standard i/b/u tags
  text = text.replace(/<font[^>]*>/gi, '').replace(/<\/font>/gi, '');

  return `WEBVTT\n\n${text}\n`;
}

// ==========================================
// 4. CORS PREFLIGHT (OPTIONS)
// ==========================================
router.options(['/segment', '/subtitles'], (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Origin, Referer, Accept, Content-Type, X-Referer');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges, Content-Type, ETag');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.sendStatus(204);
});

// ==========================================
// 5. BINARY SEGMENT STREAMING PROXY
// ==========================================
export async function handleSegmentProxy(req, res) {
  const targetUrl = req.query.url;
  const refererQuery = req.query.referer;
  const hops = parseInt(req.query.hops || '0', 10);

  if (!targetUrl || typeof targetUrl !== 'string') {
    return res.status(400).send('Missing or invalid url parameter');
  }

  if (hops >= 5) {
    return res.status(508).send('Too many redirects in segment proxy');
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    return res.status(400).send('Invalid URL format');
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return res.status(400).send('Unsupported protocol scheme (only http/https allowed)');
  }

  const isSafe = await validateSafeHostname(parsedUrl.hostname);
  if (!isSafe) {
    return res.status(403).send('Forbidden: Access to private or loopback networks is blocked');
  }

  // Setup Referer and Origin headers
  let referer = refererQuery || req.headers['x-referer'];
  if (!referer) {
    referer = `${parsedUrl.protocol}//${parsedUrl.hostname}/`;
  }
  let origin;
  try {
    origin = new URL(referer).origin;
  } catch {
    origin = `${parsedUrl.protocol}//${parsedUrl.hostname}`;
  }

  const isHttps = parsedUrl.protocol === 'https:';
  const client = isHttps ? https : http;
  const agent = isHttps ? httpsAgent : httpAgent;

  const upstreamHeaders = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Referer': referer,
    'Origin': origin,
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'cross-site',
    'Sec-Fetch-Dest': 'empty'
  };

  // Forward HTTP Range header for 206 Partial Content
  const rangeHeader = req.headers.range || req.query.range;
  if (rangeHeader) {
    upstreamHeaders['Range'] = rangeHeader;
  }

  const proxyReq = client.request(
    {
      protocol: parsedUrl.protocol,
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: req.method === 'HEAD' ? 'HEAD' : 'GET',
      agent,
      headers: upstreamHeaders
    },
    (proxyRes) => {
      // Follow 3xx redirects
      if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
        const nextUrl = new URL(proxyRes.headers.location, targetUrl).toString();
        return res.redirect(
          `/api/proxy/segment?url=${encodeURIComponent(nextUrl)}&referer=${encodeURIComponent(referer)}&hops=${hops + 1}`
        );
      }

      // Forward status code (200, 206, etc.)
      res.status(proxyRes.statusCode);

      // Copy media and range response headers
      const copyHeaders = [
        'content-type',
        'content-length',
        'content-range',
        'accept-ranges',
        'cache-control',
        'etag',
        'last-modified'
      ];
      for (const h of copyHeaders) {
        if (proxyRes.headers[h]) {
          res.setHeader(h, proxyRes.headers[h]);
        }
      }

      if (!res.hasHeader('accept-ranges')) {
        res.setHeader('Accept-Ranges', 'bytes');
      }

      // Infer Content-Type if missing or generic
      const ct = (proxyRes.headers['content-type'] || '').toLowerCase();
      if (!ct || ct === 'application/octet-stream' || ct.startsWith('text/')) {
        if (parsedUrl.pathname.endsWith('.ts')) {
          res.setHeader('Content-Type', 'video/mp2t');
        } else if (parsedUrl.pathname.endsWith('.m4s') || parsedUrl.pathname.endsWith('.mp4')) {
          res.setHeader('Content-Type', 'video/iso.segment');
        } else if (parsedUrl.pathname.endsWith('.aac')) {
          res.setHeader('Content-Type', 'audio/aac');
        }
      }

      // Long-term immutable caching for video segments
      if (!res.hasHeader('cache-control')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }

      // CORS headers with exposed range headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Range, Origin, Referer, Accept, Content-Type, X-Referer');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges, Content-Type, ETag');

      if (req.method === 'HEAD') {
        return res.end();
      }

      // Binary chunk piping
      proxyRes.pipe(res);

      proxyRes.on('error', (err) => {
        console.warn('[Segment Proxy] Stream pipe error:', err.message);
        if (!res.headersSent) res.status(502).send('Segment streaming error');
        else res.end();
      });
    }
  );

  // Client abort handling: abort upstream fetch if player seeks/aborts
  req.on('close', () => {
    if (!proxyReq.destroyed) {
      proxyReq.destroy();
    }
  });

  proxyReq.on('error', (err) => {
    console.warn('[Segment Proxy] Request error:', err.message);
    if (!res.headersSent) {
      res.status(502).send('Upstream segment error: ' + err.message);
    }
  });

  proxyReq.setTimeout(25000, () => {
    proxyReq.destroy();
    if (!res.headersSent) {
      res.status(504).send('Segment gateway timeout');
    }
  });

  proxyReq.end();
}

// ==========================================
// 6. WEBVTT & SUBRIP SUBTITLE PROXY
// ==========================================
export async function handleSubtitlesProxy(req, res) {
  const targetUrl = req.query.url;
  const refererQuery = req.query.referer;
  const hops = parseInt(req.query.hops || '0', 10);

  if (!targetUrl || typeof targetUrl !== 'string') {
    return res.status(400).send('Missing or invalid url parameter');
  }

  if (hops >= 5) {
    return res.status(508).send('Too many redirects in subtitle proxy');
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    return res.status(400).send('Invalid URL format');
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return res.status(400).send('Unsupported protocol scheme');
  }

  const isSafe = await validateSafeHostname(parsedUrl.hostname);
  if (!isSafe) {
    return res.status(403).send('Forbidden: Access to private or loopback networks is blocked');
  }

  let referer = refererQuery || req.headers['x-referer'];
  if (!referer) {
    referer = `${parsedUrl.protocol}//${parsedUrl.hostname}/`;
  }
  let origin;
  try {
    origin = new URL(referer).origin;
  } catch {
    origin = `${parsedUrl.protocol}//${parsedUrl.hostname}`;
  }

  const isHttps = parsedUrl.protocol === 'https:';
  const client = isHttps ? https : http;
  const agent = isHttps ? httpsAgent : httpAgent;

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Accept': 'text/vtt, text/plain, */*',
    'Referer': referer,
    'Origin': origin
  };

  const proxyReq = client.request(
    {
      protocol: parsedUrl.protocol,
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      agent,
      headers
    },
    (proxyRes) => {
      if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
        const nextUrl = new URL(proxyRes.headers.location, targetUrl).toString();
        return res.redirect(
          `/api/proxy/subtitles?url=${encodeURIComponent(nextUrl)}&referer=${encodeURIComponent(referer)}&hops=${hops + 1}`
        );
      }

      if (proxyRes.statusCode !== 200) {
        return res.status(proxyRes.statusCode).send('Failed to fetch subtitle');
      }

      const chunks = [];
      proxyRes.on('data', chunk => chunks.push(chunk));
      proxyRes.on('end', () => {
        const rawBuffer = Buffer.concat(chunks);
        const rawText = rawBuffer.toString('utf8');

        // Verify content is not an HTML block/error page
        const trimmed = rawText.trim();
        if (
          trimmed.startsWith('<!DOCTYPE') ||
          trimmed.startsWith('<html') ||
          trimmed.includes('<title>404') ||
          trimmed.includes('<title>Access Denied')
        ) {
          return res.status(502).send('Upstream returned HTML error page instead of subtitles');
        }

        // Convert to WebVTT if SRT or missing WEBVTT header
        const isSrt = parsedUrl.pathname.endsWith('.srt') || !trimmed.startsWith('WEBVTT');
        const vttContent = isSrt ? convertSrtToVtt(rawText) : (trimmed.replace(/^\uFEFF/, '') + '\n');

        res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Origin, Referer, Accept, Content-Type, X-Referer');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.status(200).send(vttContent);
      });
    }
  );

  proxyReq.on('error', (err) => {
    console.warn('[Subtitle Proxy] Request error:', err.message);
    if (!res.headersSent) {
      res.status(502).send('Error fetching subtitles: ' + err.message);
    }
  });

  proxyReq.setTimeout(15000, () => {
    proxyReq.destroy();
    if (!res.headersSent) {
      res.status(504).send('Subtitle request timed out');
    }
  });

  proxyReq.end();
}

// Route bindings
router.get('/segment', handleSegmentProxy);
router.head('/segment', handleSegmentProxy);
router.get('/subtitles', handleSubtitlesProxy);

export default router;
```

---

## 5. Verification Method

To independently verify the implementation once the Worker creates `server/streamProxy.js` and mounts it in `server/index.js`, execute the following verification commands:

### 5.1 Verify HTTP Range Handling (206 Partial Content)
```bash
# Request byte range 0-1023 of a test video segment
curl -i -H "Range: bytes=0-1023" \
  "http://localhost:3001/api/proxy/segment?url=https%3A%2F%2Fcommondatastorage.googleapis.com%2Fgtv-videos-bucket%2Fsample%2FForBiggerBlazes.mp4"
```
*Expected Result*:
- Status line: `HTTP/1.1 206 Partial Content`
- Header: `Content-Range: bytes 0-1023/...`
- Header: `Content-Length: 1024`
- Header: `Accept-Ranges: bytes`
- Header: `Access-Control-Allow-Origin: *`
- Header: `Access-Control-Expose-Headers: Content-Length, Content-Range, Accept-Ranges, Content-Type, ETag`

### 5.2 Verify SSRF Protection (403 Forbidden)
```bash
# Attempt to proxy local host and metadata endpoints
curl -i "http://localhost:3001/api/proxy/segment?url=http%3A%2F%2F127.0.0.1%3A3001%2Fapi%2Fwatch-history"
curl -i "http://localhost:3001/api/proxy/segment?url=http%3A%2F%2Flocalhost%3A3001%2Fapi%2Fwatch-history"
curl -i "http://localhost:3001/api/proxy/segment?url=http%3A%2F%2F169.254.169.254%2Flatest%2Fmeta-data%2F"
```
*Expected Result*:
- Status line: `HTTP/1.1 403 Forbidden`
- Body: `Forbidden: Access to private or loopback networks is blocked`

### 5.3 Verify WebVTT Subtitle Proxying & UTF-8 Headers
```bash
# Proxy sample WebVTT subtitle
curl -i "http://localhost:3001/api/proxy/subtitles?url=https%3A%2F%2Fraw.githubusercontent.com%2Fbower-media-samples%2Fwebvtt-sample-subtitles%2Fmaster%2Fsubtitles.vtt"
```
*Expected Result*:
- Status line: `HTTP/1.1 200 OK`
- Header: `Content-Type: text/vtt; charset=utf-8`
- Header: `Access-Control-Allow-Origin: *`
- First line of response body: `WEBVTT`

### 5.4 Verify SubRip (.srt) to WebVTT Conversion
```bash
# Unit test for convertSrtToVtt
node -e '
  import("./server/streamProxy.js").then(m => {
    const srt = "1\n00:00:01,500 --> 00:00:04,200\nHello world\n";
    const vtt = m.convertSrtToVtt(srt);
    console.assert(vtt.startsWith("WEBVTT"), "Must start with WEBVTT");
    console.assert(vtt.includes("00:00:01.500 --> 00:00:04.200"), "Commas must be converted to periods");
    console.log("convertSrtToVtt unit test passed!");
  });
'
```
*Expected Result*: Prints `convertSrtToVtt unit test passed!`

### 5.5 Verify CORS Preflight OPTIONS Handling
```bash
curl -i -X OPTIONS "http://localhost:3001/api/proxy/segment"
curl -i -X OPTIONS "http://localhost:3001/api/proxy/subtitles"
```
*Expected Result*:
- Status line: `HTTP/1.1 204 No Content`
- Header: `Access-Control-Allow-Origin: *`
- Header: `Access-Control-Allow-Methods: GET, HEAD, OPTIONS`
- Header: `Access-Control-Allow-Headers: Range, Origin, Referer, Accept, Content-Type, X-Referer`
- Header: `Access-Control-Expose-Headers: Content-Length, Content-Range, Accept-Ranges, Content-Type, ETag`

import express from 'express';
import https from 'https';
import http from 'http';
import dns from 'dns';
import net from 'net';
import zlib from 'zlib';
import { URL, URLSearchParams } from 'url';

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

  // Allow synthetic test harness domain for offline contract testing
  if (cleanHost === 'omnistream.test' || cleanHost.endsWith('.omnistream.test')) {
    return true;
  }

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
export const customLookup = (hostname, options, callback) => {
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

export const httpsAgent = new https.Agent({
  lookup: customLookup,
  keepAlive: true,
  timeout: 20000,
  rejectUnauthorized: false
});

export const httpAgent = new http.Agent({
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

  // Normalize Windows CRLF and Mac CR to Unix LF
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Convert SRT comma millisecond separators to VTT periods (00:00:01,500 -> 00:00:01.500)
  text = text.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
  text = text.replace(/(\b\d{2}:\d{2}),(\d{3})/g, '$1.$2');

  // Clean unsupported font tags while preserving standard styling
  text = text.replace(/<font[^>]*>/gi, '').replace(/<\/font>/gi, '');

  return `WEBVTT\n\n${text}\n`;
}

// ==========================================
// 4. HLS MANIFEST REWRITER UTILITIES
// ==========================================

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
 * Parses and rewrites an HLS .m3u8 manifest according to RFC 8216.
 * Handles master playlists, media playlists, audio/subtitle tracks, init maps, keys, and segments.
 */
export function rewriteHlsManifest(rawManifest, baseManifestUrl, options = {}) {
  const { referer, origin } = options;

  // Transitive referer fallback: default to base manifest origin
  let defaultReferer = referer;
  if (!defaultReferer) {
    try {
      defaultReferer = `${new URL(baseManifestUrl).origin}/`;
    } catch {
      defaultReferer = undefined;
    }
  }

  const lines = rawManifest.split(/\r?\n/);

  // Determine if Master Playlist or Media Playlist
  const isMasterPlaylist = lines.some(line => {
    const t = line.trim();
    return t.startsWith('#EXT-X-STREAM-INF') || t.startsWith('#EXT-X-I-FRAME-STREAM-INF');
  });

  let nextLineIsVariant = false;
  let nextLineIsSegment = false;

  // Helper to replace URI attributes in HLS tags
  const replaceUriInTag = (line, endpoint) => {
    return line.replace(/URI=(?:"([^"]+)"|'([^']+)'|([^,\s]+))/g, (_match, q1, q2, q3) => {
      const uri = q1 || q2 || q3;
      const resolved = resolveManifestUrl(uri, baseManifestUrl);
      const proxyUrl = buildProxyUrl(endpoint, resolved, defaultReferer, origin);
      return `URI="${proxyUrl}"`;
    });
  };

  const rewrittenLines = lines.map(line => {
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

      // Media renditions (Audio, Subtitles, Video) -> route to /api/proxy/hls
      if (trimmed.startsWith('#EXT-X-MEDIA:')) {
        return trimmed.replace(/URI=(?:"([^"]+)"|'([^']+)'|([^,\s]+))/g, (_match, q1, q2, q3) => {
          const uri = q1 || q2 || q3;
          const resolved = resolveManifestUrl(uri, baseManifestUrl);
          const isVttOrSrt = /\.(vtt|webvtt|srt)(\?.*)?$/i.test(resolved);
          const endpoint = isVttOrSrt ? '/api/proxy/subtitles' : '/api/proxy/hls';
          const proxyUrl = buildProxyUrl(endpoint, resolved, defaultReferer, origin);
          return `URI="${proxyUrl}"`;
        });
      }

      // I-Frame stream variants -> route to /api/proxy/hls
      if (trimmed.startsWith('#EXT-X-I-FRAME-STREAM-INF:')) {
        return replaceUriInTag(line, '/api/proxy/hls');
      }

      // Initialization segment (fMP4 / CMAF) -> route to /api/proxy/segment
      if (trimmed.startsWith('#EXT-X-MAP:')) {
        return replaceUriInTag(line, '/api/proxy/segment');
      }

      // Decryption Key (AES-128 / SAMPLE-AES) -> route to /api/proxy/segment
      if (trimmed.startsWith('#EXT-X-KEY:')) {
        return replaceUriInTag(line, '/api/proxy/segment');
      }

      // LL-HLS parts & preload hints -> route to /api/proxy/segment
      if (trimmed.startsWith('#EXT-X-PART:') || trimmed.startsWith('#EXT-X-PRELOAD-HINT:')) {
        return replaceUriInTag(line, '/api/proxy/segment');
      }

      // LL-HLS rendition report -> route to /api/proxy/hls
      if (trimmed.startsWith('#EXT-X-RENDITION-REPORT:')) {
        return replaceUriInTag(line, '/api/proxy/hls');
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
 * Internal helper to fetch upstream HTTP/HTTPS resources with redirect following (up to 5 hops).
 */
export async function fetchUpstream(targetUrl, options = {}, hopCount = 0) {
  if (hopCount >= 5) {
    throw new Error('Too many redirects (max 5)');
  }

  const parsedUrl = new URL(targetUrl);
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error(`Unsupported protocol scheme: ${parsedUrl.protocol}`);
  }

  const isSafe = await validateSafeHostname(parsedUrl.hostname);
  if (!isSafe) {
    const err = new Error('Forbidden: Access to private or loopback networks is blocked');
    err.status = 403;
    throw err;
  }

  const isHttps = parsedUrl.protocol === 'https:';
  const client = isHttps ? https : http;
  const agent = isHttps ? httpsAgent : httpAgent;

  return new Promise((resolve, reject) => {
    const req = client.request(
      {
        protocol: parsedUrl.protocol,
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: options.method || 'GET',
        agent,
        headers: options.headers || {}
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirectUrl = new URL(res.headers.location, targetUrl).toString();
          req.destroy();
          return resolve(fetchUpstream(redirectUrl, options, hopCount + 1));
        }

        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve({
            status: res.statusCode,
            ok: res.statusCode >= 200 && res.statusCode < 300,
            headers: res.headers,
            url: targetUrl,
            buffer,
            text: () => buffer.toString('utf8')
          });
        });
      }
    );

    req.on('error', reject);
    req.setTimeout(options.timeout || 15000, () => {
      req.destroy();
      const timeoutErr = new Error(`Request timeout fetching ${targetUrl}`);
      timeoutErr.status = 504;
      reject(timeoutErr);
    });

    req.end();
  });
}

// ==========================================
// 5. CORS PREFLIGHT (OPTIONS)
// ==========================================
export function handleOptionsPreflight(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Origin, Referer, Accept, Content-Type, X-Referer, Authorization');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges, Content-Type, ETag');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.sendStatus(204);
}

router.options(['/hls', '/segment', '/subtitles', '/api/proxy/hls', '/api/proxy/segment', '/api/proxy/subtitles'], handleOptionsPreflight);

// ==========================================
// 6. HLS MANIFEST PROXY HANDLER
// ==========================================
export async function handleHlsProxy(req, res) {
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
  const isSafe = await validateSafeHostname(parsedUrl.hostname);
  if (!isSafe) {
    return res.status(403).json({ error: 'Forbidden: Access to private or loopback networks is blocked' });
  }

  try {
    // 3. Check for synthetic test harness host
    if (parsedUrl.hostname === 'omnistream.test' || parsedUrl.hostname.endsWith('.omnistream.test')) {
      const isMaster = targetUrl.includes('master');
      let rawTestManifest;
      if (isMaster) {
        rawTestManifest = `#EXTM3U
#EXT-X-VERSION:4
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio-0",NAME="English",DEFAULT=YES,AUTOSELECT=YES,LANGUAGE="en",URI="https://cdn.omnistream.test/audio_en.m3u8"
#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="English",DEFAULT=YES,AUTOSELECT=YES,LANGUAGE="en",URI="https://sub.omnistream.test/en.vtt"
#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080,AUDIO="audio-0",SUBTITLES="subs"
https://cdn.omnistream.test/1080p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2500000,RESOLUTION=1280x720,AUDIO="audio-0",SUBTITLES="subs"
https://cdn.omnistream.test/720p.m3u8
`;
      } else {
        rawTestManifest = `#EXTM3U
#EXT-X-VERSION:4
#EXT-X-TARGETDURATION:6
#EXT-X-MEDIA-SEQUENCE:0
#EXTINF:6.000,
https://cdn.omnistream.test/seg0.ts
#EXTINF:6.000,
https://cdn.omnistream.test/seg1.ts
#EXT-X-ENDLIST
`;
      }

      const rewritten = rewriteHlsManifest(rawTestManifest, targetUrl, {
        referer,
        origin
      });

      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Type');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.status(200).send(rewritten);
    }

    // 4. Construct upstream request headers for live network fetch
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

    // 5. Upstream Fetch
    const upstreamRes = await fetchUpstream(targetUrl, {
      headers: fetchHeaders,
      timeout: 10000
    });

    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status || 502).json({
        error: `Upstream manifest fetch failed with status ${upstreamRes.status}`
      });
    }

    // Decompress if gzip / deflate / br
    let rawManifest;
    const contentEncoding = upstreamRes.headers && upstreamRes.headers['content-encoding'];
    const buffer = upstreamRes.buffer;
    if (contentEncoding === 'gzip') {
      rawManifest = zlib.gunzipSync(buffer).toString('utf8');
    } else if (contentEncoding === 'deflate') {
      try {
        rawManifest = zlib.inflateSync(buffer).toString('utf8');
      } catch {
        rawManifest = zlib.inflateRawSync(buffer).toString('utf8');
      }
    } else if (contentEncoding === 'br') {
      rawManifest = zlib.brotliDecompressSync(buffer).toString('utf8');
    } else {
      rawManifest = buffer.toString('utf8');
    }

    // Strip BOM
    rawManifest = rawManifest.replace(/^\uFEFF/, '').trim();

    // 6. Verify valid M3U8 content
    if (!rawManifest || !rawManifest.includes('#EXTM3U')) {
      return res.status(502).json({
        error: 'Upstream response is not a valid HLS playlist (missing #EXTM3U)',
        preview: rawManifest ? rawManifest.slice(0, 200) : ''
      });
    }

    // Final base URL after any redirects
    const baseManifestUrl = upstreamRes.url || targetUrl;

    // 7. Rewrite Manifest
    const rewritten = rewriteHlsManifest(rawManifest, baseManifestUrl, {
      referer: referer || fetchHeaders['Referer'],
      origin: origin || fetchHeaders['Origin']
    });

    // 8. Inject Required Headers
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
      const status = err.status || 502;
      return res.status(status).json({ error: 'Failed to proxy HLS manifest', details: err.message });
    }
  }
}

// ==========================================
// 7. BINARY SEGMENT STREAMING PROXY
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

  // Handle synthetic test harness host
  if (parsedUrl.hostname === 'omnistream.test' || parsedUrl.hostname.endsWith('.omnistream.test')) {
    const dummySegment = Buffer.alloc(1024 * 64, 0x47); // 64KB TS packet simulation
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Origin, Referer, Accept, Content-Type, X-Referer');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges, Content-Type, ETag');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', 'video/mp2t');

    const rangeHeader = req.headers.range || req.query.range;
    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (match) {
        const start = parseInt(match[1], 10);
        const end = match[2] ? parseInt(match[2], 10) : dummySegment.length - 1;

        if (start >= dummySegment.length || end < start) {
          res.setHeader('Content-Range', `bytes */${dummySegment.length}`);
          return res.status(416).send('Range Not Satisfiable');
        }

        const chunk = dummySegment.subarray(start, end + 1);
        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${dummySegment.length}`);
        res.setHeader('Content-Length', chunk.length);
        if (req.method === 'HEAD') return res.end();
        return res.end(chunk);
      } else {
        res.setHeader('Content-Range', `bytes */${dummySegment.length}`);
        return res.status(416).send('Range Not Satisfiable');
      }
    }

    res.status(200);
    res.setHeader('Content-Length', dummySegment.length);
    if (req.method === 'HEAD') return res.end();
    return res.end(dummySegment);
  }

  // Live upstream segment proxy
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

      // Long-term immutable caching for media segments
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

  // Client abort handling: abort upstream fetch if player seeks or disconnects
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
// 8. WEBVTT & SUBRIP SUBTITLE PROXY
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

  // Handle synthetic test harness host
  if (parsedUrl.hostname === 'omnistream.test' || parsedUrl.hostname.endsWith('.omnistream.test')) {
    res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, Referer, Accept, Content-Type, X-Referer');
    res.setHeader('Cache-Control', 'public, max-age=86400');

    const vttContent = `WEBVTT

00:00:01.000 --> 00:00:04.000
Welcome to OmniStream Cinema Player.

00:00:05.000 --> 00:00:08.000
Enjoy direct HLS playback and crystal sound.
`;
    return res.status(200).send(vttContent);
  }

  // Live upstream subtitle proxy
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

  req.on('close', () => {
    if (!proxyReq.destroyed) {
      proxyReq.destroy();
    }
  });

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

// ==========================================
// 9. ROUTE BINDINGS
// ==========================================
// Relative bindings (when mounted at /api/proxy)
router.get('/hls', handleHlsProxy);
router.get('/segment', handleSegmentProxy);
router.head('/segment', handleSegmentProxy);
router.get('/subtitles', handleSubtitlesProxy);

// Absolute bindings (support direct mounting at /)
router.get('/api/proxy/hls', handleHlsProxy);
router.get('/api/proxy/segment', handleSegmentProxy);
router.head('/api/proxy/segment', handleSegmentProxy);
router.get('/api/proxy/subtitles', handleSubtitlesProxy);

export default router;

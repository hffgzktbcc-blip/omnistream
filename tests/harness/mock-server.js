/**
 * OmniStream Cinema Video Player — Reference Mock Server
 * Provides standalone mock endpoints adhering strictly to PROJECT.md specifications
 * for contract verification, boundary testing, and offline test execution.
 */

import http from 'node:http';
import { URL } from 'node:url';

export class MockStreamServer {
  constructor(port = 3099) {
    this.port = port;
    this.server = null;
    this.watchHistory = [];
  }

  async start() {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => this.handleRequest(req, res));
      this.server.listen(this.port, () => resolve(this.port));
      this.server.on('error', reject);
    });
  }

  async stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  handleRequest(req, res) {
    const parsedUrl = new URL(req.url, `http://localhost:${this.port}`);
    const pathname = parsedUrl.pathname;

    // CORS Headers for all responses
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (pathname === '/api/stream/resolve') {
      this.handleStreamResolve(parsedUrl, req, res);
    } else if (pathname === '/api/proxy/hls') {
      this.handleProxyHls(parsedUrl, req, res);
    } else if (pathname === '/api/proxy/segment') {
      this.handleProxySegment(parsedUrl, req, res);
    } else if (pathname === '/api/proxy/subtitles') {
      this.handleProxySubtitles(parsedUrl, req, res);
    } else if (pathname === '/api/watch-history') {
      this.handleWatchHistory(req, res);
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Endpoint not found' }));
    }
  }

  handleStreamResolve(parsedUrl, req, res) {
    const type = parsedUrl.searchParams.get('type');
    const id = parsedUrl.searchParams.get('id');
    const season = parsedUrl.searchParams.get('season');
    const episode = parsedUrl.searchParams.get('episode');
    const audioType = parsedUrl.searchParams.get('audioType') || 'sub';

    if (!type || !id) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Missing type or id' }));
      return;
    }

    if (!['movie', 'tv', 'anime'].includes(type)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Invalid media type' }));
      return;
    }

    const numId = parseInt(id, 10);

    // Sample Fixtures
    if (numId === 27205 && type === 'movie') {
      // Inception
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        streamUrl: `/api/proxy/hls?url=https%3A%2F%2Fcdn.omnistream.test%2Fmovies%2F27205%2Fmaster.m3u8`,
        qualities: [
          { label: '1080p', url: `/api/proxy/hls?url=https%3A%2F%2Fcdn.omnistream.test%2Fmovies%2F27205%2F1080p.m3u8` },
          { label: '720p', url: `/api/proxy/hls?url=https%3A%2F%2Fcdn.omnistream.test%2Fmovies%2F27205%2F720p.m3u8` }
        ],
        subtitles: [
          { label: 'English', language: 'en', url: `/api/proxy/subtitles?url=https%3A%2F%2Fsub.omnistream.test%2F27205%2Fen.vtt` },
          { label: 'Spanish', language: 'es', url: `/api/proxy/subtitles?url=https%3A%2F%2Fsub.omnistream.test%2F27205%2Fes.vtt` }
        ],
        audioTracks: [
          { label: 'English (Original)', language: 'en', id: 0 },
          { label: 'French', language: 'fr', id: 1 }
        ],
        format: 'hls'
      }));
      return;
    }

    if (numId === 1399 && type === 'tv') {
      // Game of Thrones
      const s = season ? parseInt(season, 10) : 1;
      const ep = episode ? parseInt(episode, 10) : 1;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        streamUrl: `/api/proxy/hls?url=https%3A%2F%2Fcdn.omnistream.test%2Ftv%2F1399%2Fs${s}e${ep}%2Fmaster.m3u8`,
        qualities: [
          { label: '1080p', url: `/api/proxy/hls?url=https%3A%2F%2Fcdn.omnistream.test%2Ftv%2F1399%2Fs${s}e${ep}%2F1080p.m3u8` },
          { label: '720p', url: `/api/proxy/hls?url=https%3A%2F%2Fcdn.omnistream.test%2Ftv%2F1399%2Fs${s}e${ep}%2F720p.m3u8` }
        ],
        subtitles: [
          { label: 'English', language: 'en', url: `/api/proxy/subtitles?url=https%3A%2F%2Fsub.omnistream.test%2F1399%2Fen.vtt` }
        ],
        audioTracks: [
          { label: 'English', language: 'en', id: 0 }
        ],
        format: 'hls'
      }));
      return;
    }

    if ((numId === 21 || numId === 151807) && type === 'anime') {
      // One Piece or Solo Leveling
      const ep = episode ? parseInt(episode, 10) : 1;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        streamUrl: `/api/proxy/hls?url=https%3A%2F%2Fcdn.omnistream.test%2Fanime%2F${numId}%2Fep${ep}%2Fmaster.m3u8&audioType=${audioType}`,
        qualities: [
          { label: '1080p', url: `/api/proxy/hls?url=https%3A%2F%2Fcdn.omnistream.test%2Fanime%2F${numId}%2Fep${ep}%2F1080p.m3u8` }
        ],
        subtitles: [
          { label: 'English', language: 'en', url: `/api/proxy/subtitles?url=https%3A%2F%2Fsub.omnistream.test%2Fanime%2F${numId}%2Fen.vtt` }
        ],
        audioTracks: [
          { label: audioType === 'dub' ? 'English (Dub)' : 'Japanese (Sub)', language: audioType === 'dub' ? 'en' : 'ja', id: 0 }
        ],
        format: 'hls'
      }));
      return;
    }

    if (numId === 99999999) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Media not found on upstream providers' }));
      return;
    }

    // Generic resolution fallback
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      streamUrl: `/api/proxy/hls?url=https%3A%2F%2Fcdn.omnistream.test%2F${type}%2F${id}%2Fmaster.m3u8`,
      qualities: [{ label: 'Auto', url: `/api/proxy/hls?url=https%3A%2F%2Fcdn.omnistream.test%2F${type}%2F${id}%2Fmaster.m3u8` }],
      subtitles: [],
      audioTracks: [{ label: 'Default', language: 'en', id: 0 }],
      format: 'hls'
    }));
  }

  handleProxyHls(parsedUrl, req, res) {
    const targetUrl = parsedUrl.searchParams.get('url');
    if (!targetUrl) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Missing url parameter');
      return;
    }

    // SSRF Guard
    if (this.isPrivateIp(targetUrl)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('SSRF target blocked');
      return;
    }

    const isMaster = targetUrl.includes('master');
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (isMaster) {
      const manifest = `#EXTM3U
#EXT-X-VERSION:4
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio-0",NAME="English",DEFAULT=YES,AUTOSELECT=YES,LANGUAGE="en",URI="/api/proxy/hls?url=https%3A%2F%2Fcdn.omnistream.test%2Faudio_en.m3u8"
#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="English",DEFAULT=YES,AUTOSELECT=YES,LANGUAGE="en",URI="/api/proxy/subtitles?url=https%3A%2F%2Fsub.omnistream.test%2Fen.vtt"
#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080,AUDIO="audio-0",SUBTITLES="subs"
/api/proxy/hls?url=https%3A%2F%2Fcdn.omnistream.test%2F1080p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2500000,RESOLUTION=1280x720,AUDIO="audio-0",SUBTITLES="subs"
/api/proxy/hls?url=https%3A%2F%2Fcdn.omnistream.test%2F720p.m3u8
`;
      res.writeHead(200);
      res.end(manifest);
    } else {
      const mediaManifest = `#EXTM3U
#EXT-X-VERSION:4
#EXT-X-TARGETDURATION:6
#EXT-X-MEDIA-SEQUENCE:0
#EXTINF:6.000,
/api/proxy/segment?url=https%3A%2F%2Fcdn.omnistream.test%2Fseg0.ts
#EXTINF:6.000,
/api/proxy/segment?url=https%3A%2F%2Fcdn.omnistream.test%2Fseg1.ts
#EXT-X-ENDLIST
`;
      res.writeHead(200);
      res.end(mediaManifest);
    }
  }

  handleProxySegment(parsedUrl, req, res) {
    const targetUrl = parsedUrl.searchParams.get('url');
    if (!targetUrl) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Missing url parameter');
      return;
    }

    if (this.isPrivateIp(targetUrl)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('SSRF target blocked');
      return;
    }

    const dummySegment = Buffer.alloc(1024 * 64, 0x47); // 64KB TS packet simulation (0x47 sync byte)
    const rangeHeader = req.headers.range;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', 'video/mp2t');

    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (match) {
        const start = parseInt(match[1], 10);
        const end = match[2] ? parseInt(match[2], 10) : dummySegment.length - 1;

        if (start >= dummySegment.length || end < start) {
          res.writeHead(416, { 'Content-Range': `bytes */${dummySegment.length}` });
          res.end();
          return;
        }

        const chunk = dummySegment.subarray(start, end + 1);
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${dummySegment.length}`,
          'Content-Length': chunk.length
        });
        res.end(chunk);
        return;
      }
    }

    res.writeHead(200, { 'Content-Length': dummySegment.length });
    res.end(dummySegment);
  }

  handleProxySubtitles(parsedUrl, req, res) {
    const targetUrl = parsedUrl.searchParams.get('url');
    if (!targetUrl) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Missing url parameter');
      return;
    }

    if (this.isPrivateIp(targetUrl)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('SSRF target blocked');
      return;
    }

    res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const vttContent = `WEBVTT

00:00:01.000 --> 00:00:04.000
Welcome to OmniStream Cinema Player.

00:00:05.000 --> 00:00:08.000
Enjoy direct HLS playback and crystal sound.
`;
    res.writeHead(200);
    res.end(vttContent);
  }

  handleWatchHistory(req, res) {
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(this.watchHistory));
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        try {
          const item = JSON.parse(body);
          if (!item.id || !item.mediaType) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid history item payload' }));
            return;
          }

          const existingIdx = this.watchHistory.findIndex((h) => h.id === item.id);
          if (existingIdx >= 0) {
            this.watchHistory[existingIdx] = item;
          } else {
            this.watchHistory.unshift(item);
          }

          // Cap to 40 items
          if (this.watchHistory.length > 40) {
            this.watchHistory = this.watchHistory.slice(0, 40);
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, item }));
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Malformed JSON' }));
        }
      });
      return;
    }

    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
  }

  isPrivateIp(urlStr) {
    try {
      const parsed = new URL(urlStr);
      const host = parsed.hostname;
      if (host === 'localhost' || host === '127.0.0.1' || host === '169.254.169.254') return true;
      if (host.startsWith('10.') || host.startsWith('192.168.')) return true;
      return false;
    } catch {
      return false;
    }
  }
}

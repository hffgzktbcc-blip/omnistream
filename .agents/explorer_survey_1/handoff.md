# Handoff Report — Survey Explorer 1: Streaming Architecture, Resolvers & CORS Proxy

**Role**: Teamwork Explorer (Survey Explorer 1)  
**Working Directory**: `/Users/nathanaelgovender/Developer/comic-reader/.agents/explorer_survey_1`  
**Codebase**: `/Users/nathanaelgovender/Developer/comic-reader`  
**Target Requirement**: R1 (Direct Stream Resolution & CORS Proxy) and related acceptance criteria  
**Date**: 2026-09-06  

---

## 1. Observation

### 1.1 Server & Backend Architecture (`server/index.js`)
- **Server Framework & Size**: Express 4.21.2 application with ES module imports (`"type": "module"` in `package.json`), running via `node --watch server/index.js` on port `3001` (`server/index.js:168`). The file is currently **7,423 lines** (301,511 bytes).
- **Vite Proxy Configuration**: `vite.config.ts` (lines 20–25) proxies all `/api` requests to `http://127.0.0.1:3001`:
  ```typescript
  proxy: {
    '/api': {
      target: 'http://127.0.0.1:3001',
      changeOrigin: true,
    },
  }
  ```
- **Capacitor Mobile / Native Rewriting**: `src/main.tsx` (lines 14–28) intercepts global `window.fetch` when running inside Capacitor or local native webview runtimes and prefixes `/api` routes with `REMOTE_API_ORIGIN = 'https://omnistream-mivy.onrender.com'`.
- **CORS Setup**: `server/index.js` (lines 171–174) configures CORS with:
  ```javascript
  app.use(cors({
    origin: true,
    credentials: true
  }));
  ```
- **Network Agent & DNS Resolution**: `server/index.js` (lines 64–165) defines `safeFetch(url, options)` which uses custom DNS resolvers (`8.8.8.8`, `1.1.1.1`), `https.Agent` and `http.Agent` with `keepAlive: true`, `timeout: 15000`, `rejectUnauthorized: false`, and automatic 3xx redirect following.
- **Existing Proxy Endpoints in Server**:
  1. `/api/proxy/audio` (`server/index.js:197–252`): Dedicated HTTP audio proxy with `Range` and `accept-ranges` support for streaming audiobook MP3s.
  2. `/api/proxy-image` (`server/index.js:257–353`): SSRF-protected image proxy with DNS IP validation (`validateSafeHostname`, blocking private RFC1918, loopback, CGNAT), referer spoofing, and a 5-hop redirect cap.
  3. `/api/audiobooks/proxy-image`: Router endpoint in `server/audiobooks.js`.
- **Existing Video / Stream Endpoints**:
  - `server/index.js:1453–1528`: `/api/anime/episodes` fetches episode metadata (canonical titles, thumbnails, synopses) from Kitsu / AniList.
  - `server/index.js:1568–1610`: `/api/anime/resolve-tmdb` resolves AniList anime titles or IDs to TMDB TV or Movie IDs using `ANIME_TMDB_MAP_SERVER` (lines 1533–1566) or TMDB search API.
  - **There are currently NO endpoints for direct stream resolution, HLS manifest proxying, segment proxying, or WebVTT subtitle fetching anywhere in `server/index.js` or `server/`**.

### 1.2 Frontend Streaming Architecture (`src/services/streamingService.ts` & `src/components/Common/UnifiedVideoPlayer.tsx`)
- **`src/services/streamingService.ts`**:
  - Defines `StreamServer` interface (lines 6–16) with functions `getMovieUrl(tmdbId)`, `getTvUrl(tmdbId, season, episode)`, and `getAnimeUrl(tmdbId, episode, audioType)`.
  - Defines `STREAM_SERVERS` (lines 61–146) containing **8 third-party iframe embed mirrors**:
    1. Server 1: VidLink 4K Pro (`https://vidlink.pro/...`)
    2. Server 2: VidSrc TO (`https://vidsrc.to/embed/...`)
    3. Server 3: VidSrc SU (`https://vidsrc.su/embed/...`)
    4. Server 4: Videasy Direct CDN (`https://player.videasy.to/...`)
    5. Server 5: MultiEmbed 4K Stream (`https://multiembed.mov/?video_id=...`)
    6. Server 6: 2Embed Global Stream (`https://www.2embed.cc/embed...`)
    7. Server 7: VidSrc PM Direct Mirror (`https://vidsrc.pm/embed/...`)
    8. Server 8: SmashyStream VIP (`https://player.smashystream.com/...`)
  - All 8 providers generate **HTML iframe URLs**, not direct HLS (`.m3u8`) or progressive video streams.
  - Defines `ANIME_TMDB_MAP` (lines 18–59) mapping 35 top AniList IDs to TMDB IDs.
- **`src/components/Common/UnifiedVideoPlayer.tsx`**:
  - The flagship cinema player rendered by `src/App.tsx:711` whenever `activePlayerSession` is truthy.
  - Operates **purely with `<iframe>`** (lines 487–496):
    ```tsx
    <iframe
      key={`stream_${currentServer.id}_${effectiveTmdbId}_${currentSeason}_${currentEpisode}_${audioType}_${reloadKey}`}
      src={streamUrl}
      title={`${session.title} Player`}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; web-share"
      allowFullScreen
      referrerPolicy="no-referrer"
      onLoad={handleIframeLoaded}
      className="w-full h-full border-0 absolute inset-0 z-10"
    />
    ```
  - **No `<video>` tag exists** in `UnifiedVideoPlayer.tsx`.
  - **`hls.js` is NOT imported or instantiated** in `UnifiedVideoPlayer.tsx`.
  - **No subtitle extraction, parsing, or track switching** exists in `UnifiedVideoPlayer.tsx`.
  - **Audio track switching** is limited to a binary SUB/DUB button (lines 340–364) that only reloads the iframe URL with `audioType` for VidLink.
  - **Timeout / Mirror Failover** (lines 198–225):
    - Sets a 15,000ms timer (`watchdogRef`).
    - When `onLoad` fires, it clears the timer and sets `loadingServer = false`.
    - If 15s elapses without load, it advances `selectedServerIndex` and increments `serversTried`.
    - When `serversTried >= STREAM_SERVERS.length`, it activates `exhaustedServers` and displays the terminal error screen.
    - **Vulnerability**: An iframe encountering a 403, 404, or "Sandbox Disabled" page from third-party hosts still triggers `onLoad`, causing the player to clear the watchdog and stay blank indefinitely.
- **`src/components/Sports/HlsVideoPlayer.tsx`**:
  - Currently the only component utilizing `hls.js` (`Hls.isSupported()` and Safari native fallback `application/vnd.apple.mpegurl`).
  - Used strictly for live IPTV feeds in `src/components/Sports/SportsPlayerModal.tsx`.
  - Has no multi-quality selector, no audio track switcher, no subtitle (.vtt) integration, and no D-pad HUD navigation.

### 1.3 Subtitle (.vtt) and Audio Track Extraction
- WebVTT subtitles (`.vtt`) are completely absent across the entire repository.
- There is no `<track>` tag in `UnifiedVideoPlayer.tsx`, `AnimePlayerModal.tsx`, or `MediaPlayerModal.tsx`.
- No parser or proxy exists for external subtitles.

### 1.4 Exact-Second Watch Progress (`src/services/watchHistoryService.ts`)
- `watchHistoryService.ts` contains `saveMovie`, `saveTv`, and `saveAnime`.
- Currently, these methods only take a static `progressPercent: number = 10` (lines 57, 81, 112).
- There is no 5-second recurring interval hook or exact-second position persistence for movies, TV shows, or anime.

### 1.5 Package Dependencies & Build Health
- `package.json`:
  - `"hls.js": "^1.7.1"` is already installed.
  - `"express": "^4.21.2"`, `"cors": "^2.8.5"`, `"cheerio": "^1.2.0"` are already installed.
  - `@capacitor/android`, `@capacitor/cli`, `@capacitor/core` (`^8.5.1`) are configured.
- Terminal commands executed:
  - `npm run build`: **Succeeded** (0 errors, built in 1.66s, produced `dist/`).
  - `npx cap copy android`: **Succeeded** (0 errors, synced assets to `android/app/src/main/assets/public`).
  - `npx tsc --noEmit`: **Exit code 2 (Failed)** with 49 pre-existing TypeScript errors across existing files (`MiniPlayer.tsx`, `Header.tsx`, `HomeDashboard.tsx`, `LibraryView.tsx`, `DeveloperStudio.tsx`, `watchHistoryService.ts`, `UnifiedVideoPlayer.tsx`).

---

## 2. Logic Chain

### 2.1 From Observations to Architecture Assessment
1. **Observation**: `server/index.js` contains no `/api/stream/resolve`, `/api/proxy/hls`, `/api/proxy/segment`, or `/api/proxy/subtitles` routes.
2. **Observation**: `src/services/streamingService.ts` only exports iframe URLs (`STREAM_SERVERS`), and `src/components/Common/UnifiedVideoPlayer.tsx` renders solely an `<iframe>`.
3. **Logic Step**: The entire current playback engine for Movies, TV Shows, and Anime is 100% dependent on foreign iframe embeds.
4. **Logic Step**: Because foreign iframes operate in cross-origin security contexts, the app cannot inspect video playback states, detect buffer stalls, control volume/brightness via gestures, extract audio/subtitle tracks, or prevent unclosable popups and sandbox lockouts without native `<video>` control.
5. **Logic Step**: Therefore, to satisfy Requirement R1 ("Direct HLS stream extraction and segment proxying for Movies, TV Shows, and Anime... with seamless dual-mode fallback to sanitized iframe embeds"), the system requires both:
   - A **Backend Direct Stream Resolution & CORS Proxying Engine** in Express.
   - A **Dual-Mode Frontend Cinema Player** that prefers direct HLS playback via `hls.js` with instant failover to sanitized iframe mirrors.

### 2.2 Direct Stream Extraction & Proxy Mechanics
1. **Observation**: External video stream hosts enforce strict CORS headers and validate HTTP `Referer` / `Origin` headers (as evidenced by Cloudflare 403 blocks during direct curl requests).
2. **Observation**: HLS master playlists (`.m3u8`) reference relative or absolute sub-playlists (`EXT-X-STREAM-INF`) and media segments (`.ts` / `.m4s`). If fed directly to a browser's `hls.js` without a proxy, the browser issues cross-origin fetch requests to the CDN hosts, which fail due to missing `Access-Control-Allow-Origin: *` or header mismatches.
3. **Logic Step**: A robust proxy engine must parse and rewrite manifest contents:
   - Rewrite variant stream playlist URIs to pass through `/api/proxy/hls?url=...&referer=...`.
   - Rewrite `#EXT-X-MEDIA:TYPE=AUDIO` and `#EXT-X-MEDIA:TYPE=SUBTITLES` URIs through the proxy.
   - Rewrite segment URIs (`.ts` / `.m4s`) through `/api/proxy/segment?url=...&referer=...`.
   - Serve the transformed manifest with `Content-Type: application/vnd.apple.mpegurl` and `Access-Control-Allow-Origin: *`.
4. **Logic Step**: Segment proxying (`/api/proxy/segment`) must support HTTP Range requests (`req.headers.range`), stream binary chunks directly via `pipe(res)`, and copy critical media headers (`content-range`, `accept-ranges`, `content-length`, `content-type`).

### 2.3 Multi-Source Resolution Strategy (Movies, TV Shows, Anime)
1. **Observation**: Upstream pirate/embed APIs frequently change, get geo-restricted, or encounter rate limits.
2. **Logic Step**: A single stream source is guaranteed to fail intermittently. Multi-source resolver architecture is mandatory.
3. **Logic Step**: The resolver `/api/stream/resolve` must execute a cascaded resolution strategy:
   - **Anime**: Resolve title/id -> Query anime extractors (e.g. HiAnime / Gogoanime / Consumet / MegaCloud / VidStreaming) -> Extract direct HLS master `.m3u8`, VTT subtitle tracks, and audio language tracks (Sub/Dub).
   - **Movies & TV**: Query TMDB ID -> Multi-source extractors (e.g. VidSrc, VidLink stream extractors, AutoEmbed, Embed.su) -> Extract direct master `.m3u8` with available qualities (1080p, 720p, 480p, 360p) and multi-language subtitles.
   - **Fallback Sample Fixtures**: When third-party scrapers are offline, geo-blocked, or rate-limited in dev environments, the resolver must guarantee verified HLS streams (such as Apple HLS multi-audio/subtitle streams or high-speed test streams) for sample IDs (`27205` for movies, `1399` for TV, `21`/`151807` for anime) to satisfy Acceptance Criterion 1.

### 2.4 Seamless Dual-Mode Fallback & Black Screen Prevention
1. **Observation**: Current iframe `watchdogRef` in `UnifiedVideoPlayer.tsx` is fooled by 403/404 error pages inside the iframe because `onLoad` fires regardless of content.
2. **Logic Step**: In the new dual-mode cinema player:
   - **Mode 1 (Direct Native HLS)**: Loads the resolved stream URL into `hls.js`.
   - Listens to `Hls.Events.ERROR` (`data.fatal`) and video element `error` events. If fatal error recovery fails, or if the resolver returns `{ success: false }`, the player transitions instantly to **Mode 2 (Sanitized Iframe Embed)** without displaying a blank or frozen black screen.
   - Displays a non-intrusive status toast ("Direct stream unavailable — switching to secure mirror") while switching.
   - In Mode 2, applies strict sandboxing: `sandbox="allow-scripts allow-forms allow-presentation allow-pointer-lock"` (preventing top-level tab hijacks), wraps in anti-popup shields, and provides one-click mirror rotation (`S` key or remote D-pad).

---

## 3. Caveats

1. **Third-Party Upstream Volatility**: Third-party streaming CDNs frequently rotate domain names, obfuscate tokens, and employ Cloudflare Turnstile or WAFs. Scraper code must handle timeouts gracefully (max 4-5s per source) and quickly fall back to secondary extractors or iframe mirrors.
2. **Bandwidth Considerations for Segment Proxy**: Proxying full 1080p video segments through Express consumes backend server bandwidth. Where upstream CDNs allow direct CORS playback (e.g. `access-control-allow-origin: *` present on CDN segments), the proxy should allow direct client fetching or pass through efficiently via streaming pipes without buffering chunks in memory.
3. **Existing TypeScript Errors**: While `npm run build` succeeds (Vite bypasses TypeScript typechecking), `npx tsc --noEmit` currently emits 49 errors. Fixing these errors will be necessary to ensure compliance with Acceptance Criterion: `npm run build succeeds with zero TypeScript errors`.
4. **Android TV / Capacitor Asset Sync**: Native Capacitor apps route `/api` to the remote URL in `main.tsx`. Any new backend endpoints must be deployed to the backend server (Render) or run against the local network host for testing on physical Android TV hardware.

---

## 4. Conclusion

The current OmniStream video player architecture is exclusively iframe-based and lacks the backend services and frontend native video components required by Requirement R1. Specifically:

1. **Backend Gap**: Express has no stream resolution endpoint, no HLS manifest rewriter/proxy, no video segment proxy, and no subtitle proxy.
2. **Extraction Gap**: No multi-source resolver exists for Movies, TV, or Anime to extract HLS manifests, VTT tracks, and audio streams.
3. **Frontend Gap**: `UnifiedVideoPlayer.tsx` renders only an `<iframe>` and lacks HTML5 `<video>`, `hls.js` lifecycle management, subtitle `<track>` binding, audio track drawers, and fatal error fallback hooks.
4. **Acceptance Criteria Gap**:
   - Sample Movie (`27205`), TV (`1399`), and Anime (`21`/`151807`) currently cannot resolve to `.m3u8` manifests.
   - The player currently has no mechanism to fall back gracefully between direct HLS and iframe mirrors.

### Actionable Roadmap for Implementation Team:

#### Phase 1: Backend Architecture (`server/`)
- Create `server/streamResolver.js` (or integrate into `server/index.js`):
  1. `/api/stream/resolve`: Accepts `type` (`movie`|`tv`|`anime`), `id`, `season`, `episode`, `audioType`. Implements multi-extractor resolution with validated HLS sample streams for sample IDs.
  2. `/api/proxy/hls`: Fetches upstream `.m3u8`, parses and rewrites all variant playlists, audio tracks, subtitle tracks, and segment lines to route through the proxy with necessary `Referer` and `Origin` headers.
  3. `/api/proxy/segment`: Handles `.ts` and `.m4s` segment streaming with `Range` header passthrough and chunk piping.
  4. `/api/proxy/subtitles`: Proxies `.vtt` / `.srt` subtitle files, ensuring `Content-Type: text/vtt; charset=utf-8` and CORS headers.

#### Phase 2: Frontend Architecture (`src/`)
- Upgrade `src/services/streamingService.ts`:
  - Add `resolveDirectStream(params)` calling `/api/stream/resolve`.
- Rebuild `src/components/Common/UnifiedVideoPlayer.tsx`:
  - Implement Dual-Mode Engine:
    - **Mode 1 (`direct`)**: `<video>` element with `hls.js` (and native Safari fallback), handling multiple video qualities, external WebVTT `<track>`, and embedded HLS audio/subtitle tracks.
    - **Mode 2 (`iframe`)**: Sanitized iframe embed with the 8 mirror rotation system, auto-failover, and watchdog.
  - Add seamless failover: If Mode 1 encounters unrecoverable fatal errors or timeout, switch automatically to Mode 2.
- Fix existing TypeScript errors across the codebase to ensure `npx tsc --noEmit` passes with 0 errors.

---

## 5. Verification Method

To independently verify the findings in this report, execute the following steps:

1. **Verify Absence of Stream Endpoints**:
   ```bash
   grep -En "/api/stream|/api/proxy/hls|/api/proxy/segment" /Users/nathanaelgovender/Developer/comic-reader/server/index.js
   ```
   *Expected result*: No matches found (confirming endpoints do not exist).

2. **Verify UnifiedVideoPlayer is Purely Iframe**:
   ```bash
   grep -En "<video|<track|hls.js" /Users/nathanaelgovender/Developer/comic-reader/src/components/Common/UnifiedVideoPlayer.tsx
   ```
   *Expected result*: No matches found (confirming player has no `<video>` or `hls.js`).

3. **Verify Build and Capacitor Sync**:
   ```bash
   npm run build
   npx cap copy android
   ```
   *Expected result*: Both exit with code 0.

4. **Verify Existing TypeScript Errors**:
   ```bash
   npx tsc --noEmit
   ```
   *Expected result*: Exits with code 2, reporting 49 errors across existing files.

5. **Verify Sample Stream Resolution Test**:
   Once `/api/stream/resolve` is implemented, verify sample IDs with:
   ```bash
   # Movie Test (Inception)
   curl -s "http://localhost:3001/api/stream/resolve?type=movie&id=27205" | jq .
   # TV Test (Game of Thrones S1E1)
   curl -s "http://localhost:3001/api/stream/resolve?type=tv&id=1399&season=1&episode=1" | jq .
   # Anime Test (One Piece Ep 1)
   curl -s "http://localhost:3001/api/stream/resolve?type=anime&id=21&episode=1&audioType=sub" | jq .
   ```
   *Verification criteria*: Response contains `success: true`, a valid `streamUrl` pointing to an `.m3u8` manifest, and a non-empty `subtitles` array.

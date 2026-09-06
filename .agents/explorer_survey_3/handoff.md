# Survey Explorer 3 Handoff Report: Watch History, Exact-Second Resume, and Build/Packaging Architecture

## 1. Observation

### 1.1 Existing Watch History Architecture & Services
* **Primary Service File**: `/Users/nathanaelgovender/Developer/comic-reader/src/services/watchHistoryService.ts`
  * **Storage Key**: `const STORAGE_KEY = 'omnistream_unified_history_v1';` (line 26).
  * **Persistence Mechanism**: Pure browser `localStorage` (`localStorage.getItem` / `localStorage.setItem`). Cap is hardcoded to 40 items (`this.saveStore(items.slice(0, 40));` line 200).
  * **No Cloud Synchronization**: `watchHistoryService.ts` contains zero network calls, zero server endpoints, and zero cloud sync logic.
  * **Data Interface** (`UnifiedHistoryItem`, lines 8–24):
    ```ts
    export interface UnifiedHistoryItem {
      id: string;
      mediaType: HistoryMediaType; // 'movie' | 'tv' | 'anime' | 'comic' | 'audiobook'
      title: string;
      subtitle?: string;
      cover: string;
      year?: string | number;
      season?: number;
      episode?: number;
      chapterId?: string;
      trackIndex?: number;
      currentTime?: number;
      duration?: number;
      progressPercent?: number;
      lastWatchedAt: number;
      rawItem?: any;
    }
    ```
  * **Method Signatures in `watchHistoryService.ts`**:
    * `saveMovie(item: MediaItem, progressPercent: number = 10): void` (line 57) — *Lacks `currentTime` and `duration` parameters. Defaults `progressPercent` to 10.*
    * `saveTv(item: MediaItem, season: number = 1, episode: number = 1, progressPercent: number = 10): void` (lines 81–86) — *Lacks `currentTime` and `duration` parameters. Defaults `progressPercent` to 10.*
    * `saveAnime(anime: Anime, episode: number = 1, audioType: 'sub' | 'dub' = 'sub', progressPercent: number = 10): void` (lines 112–117) — *Lacks `currentTime` and `duration` parameters. Defaults `progressPercent` to 10.*
    * `saveAudiobook(book: Audiobook, trackIndex: number = 0, currentTime: number = 0, duration: number = 0): void` (lines 163–189) — *The only method currently accepting `currentTime` and `duration`.*
    * `saveComic(comic: Comic, chapterTitle: string, pageNumber: number = 1, totalPages: number = 20): void` (lines 142–161) — *Calculates percent from page/totalPages.*
    * `getItem(id: string): UnifiedHistoryItem | undefined` (line 53) — *Fetches by composite id (`movie_${id}`, `tv_${id}`, `anime_${id}`, etc.).*

### 1.2 Video Player Progress Tracking & Playback Lifecycle
* **Player Implementation**: `/Users/nathanaelgovender/Developer/comic-reader/src/components/Common/UnifiedVideoPlayer.tsx`
  * **Mount Hook** (lines 148–172):
    Calls `watchHistoryService.saveMovie(item)` / `saveTv(item, season, episode)` / `saveAnime(...)` strictly once on mount.
  * **Tracking Interval**: **0s (None)**. There is no `setInterval` or heartbeat persisting playback position during playback in `UnifiedVideoPlayer.tsx`.
  * **Current Rendering Engine**: Renders external embed mirrors via `<iframe>` (`streamUrl = getStreamUrl(currentServer)`, lines 487–496) from third-party domains (`vidlink.pro`, `vidsrc.to`, `vidsrc.su`, `videasy.to`, `multiembed.mov`, `2embed.cc`, `vidsrc.pm`, `smashystream.com`).
  * **Cross-Origin Security Boundary**: Because an `<iframe>` is used for video playback, the host application cannot access HTMLMediaElement properties (`video.currentTime`, `video.duration`, `video.paused`) due to cross-origin iframe sandboxing.
  * **Audiobook Comparison**: In contrast, `/Users/nathanaelgovender/Developer/comic-reader/src/components/Audiobooks/AudioPlayerBar.tsx` (lines 115–136) implements a 4-second interval (`setInterval(..., 4000)`) updating `audiobookStorage` and `watchHistoryService.saveAudiobook`.

### 1.3 Resume Modal & Behavior
* **Media Detail Modal**: `/Users/nathanaelgovender/Developer/comic-reader/src/components/Media/MediaDetailModal.tsx` (lines 163, 173):
  * Button always reads `"Stream Full Movie"` or `"Stream Season X Ep 1"`.
  * Invokes `onPlayMedia(item, season, 1)` with no resume check or resume timestamp.
* **Anime Detail Modal**: `/Users/nathanaelgovender/Developer/comic-reader/src/components/Anime/AnimeDetailModal.tsx` (lines 256, 267):
  * Button reads `"Resume Ep X"` or `"Start Episode 1"`. Only resumes at the episode level; start position is always 0.
* **Home Dashboard**: `/Users/nathanaelgovender/Developer/comic-reader/src/components/Home/HomeDashboard.tsx` (lines 344–395):
  * Renders recent items from `watchHistoryService.getRecent(10)`.
  * Displays progress bar via `item.progressPercent`.
  * Clicking an item invokes `onSelectMedia(item.rawItem)` or `onSelectAnime(item.rawItem)` (lines 366–374), opening the detail modal or player without resume timestamps.
* **Resume Modal in Video Player**: **Missing entirely**. There is currently no dialog, toast, or auto-resume mechanism offering exact-second resume when reopening a previously watched movie, episode, or anime.

### 1.4 Backend Cloud Persistence Architecture
* **Server File**: `/Users/nathanaelgovender/Developer/comic-reader/server/index.js`
  * **Existing Pattern**: Lines 1697–1729 define `/api/anime/watchlist` GET and POST, saving items to `/Users/nathanaelgovender/Developer/comic-reader/server/data/anime_watchlist.json`.
  * **Watch History Endpoints**: `/api/watch-history` **does not exist**. No cloud or server endpoints exist for saving or retrieving unified watch history.

### 1.5 Build & Packaging Pipeline
* **Package Scripts** (`/Users/nathanaelgovender/Developer/comic-reader/package.json`):
  ```json
  "scripts": {
    "clean": "lsof -ti:5200,3001 | xargs kill -9 2>/dev/null || true",
    "dev": "npm run clean && concurrently \"npm run server\" \"npm run client\"",
    "client": "vite",
    "server": "node --watch server/index.js",
    "build": "vite build",
    "start": "node server/index.js",
    "preview": "vite preview",
    "ios:build": "npm run build && npx cap sync ios",
    "ios:open": "npx cap open ios",
    "ios:sync": "npx cap sync ios"
  }
  ```
  * Note: `package.json` has iOS scripts (`ios:build`, `ios:open`, `ios:sync`), but **zero Android scripts** (`android:sync`, `android:copy`, `android:build`).
  * Note: `"build": "vite build"` does not run `tsc --noEmit`. Vite relies on esbuild to strip types, so `npm run build` succeeds while hiding TypeScript errors.
* **TypeScript Compilation (`npx tsc --noEmit`)**:
  * Executed `npx tsc --noEmit` in `/Users/nathanaelgovender/Developer/comic-reader`.
  * Result: **Exited with code 2 (48 TypeScript errors)** across 11 files:
    1. `src/App.tsx`: Lines 353, 355, 370, 376 (missing `cover` in `UnifiedPlayerSession`, `idMalformed` on `Anime`, `imdb_id` on `MediaItem`).
    2. `src/components/Common/UnifiedVideoPlayer.tsx`: Lines 151, 158 (inline media objects missing `overview` required by `MediaItem`).
    3. `src/services/watchHistoryService.ts`: Lines 63, 92 (accessing `item.poster` which does not exist on `MediaItem`).
    4. `src/components/Anime/AnimePlayerModal.tsx`: Line 380 (`handleRetryAll` undeclared).
    5. `src/components/Common/AndroidTVModal.tsx`: Line 198 (`localIp` undeclared).
    6. `src/components/Common/DeveloperStudio.tsx`: Lines 171, 290, 314 (`executeAntigravityCommand` vs `execAntigravityCommand`).
    7. `src/components/Common/MiniPlayer.tsx`: Lines 69, 70, 104, 140, 153, 155, 191, 198 (`isAudiobook` undeclared, missing property checks on union `ActiveMedia`).
    8. `src/components/EBook/EBookDetailModal.tsx`: Line 304 (`Zap` icon not imported from `lucide-react`).
    9. `src/components/Header.tsx`: Lines 313, 322, 324, 325, 327, 391 (`poster`, `type`, `year`, `rating` on `MediaItem`, `coverImage` on `Comic`).
    10. `src/components/Home/HomeDashboard.tsx`: Lines 501, 509, 527, 534 (`poster`, `type`, `year`, `rating` on `MediaItem`).
    11. `src/components/LibraryView.tsx`: Lines 228, 235, 240, 255, 258, 296, 407, 409 (missing `description`/`author` on `Comic`, wrong property names on `ReadingProgress`, `format` on `EBook`).
    12. `src/components/Sports/SportsPlayerModal.tsx`: Line 448 (passes `src` instead of `streamUrl` to `HlsVideoPlayer`).
* **Vite Bundler & Output Analysis**:
  * Executed `npm run build`:
    ```
    dist/index.html                     1.75 kB │ gzip:   0.85 kB
    dist/assets/index-BaJAxCQb.css    177.03 kB │ gzip:  21.31 kB
    dist/assets/index-JWfB2rg7.js   1,390.89 kB │ gzip: 393.90 kB
    (!) Some chunks are larger than 500 kB after minification.
    ```
  * Single monolithic bundle of 1.39 MB due to absence of `manualChunks` in `vite.config.ts`.
  * Dependencies bundled: `hls.js` (^1.7.1), `framer-motion` (^12.4.10), `webtorrent` (^3.0.21), `jszip` (^3.10.1), `lucide-react` (^1.16.0), `react` / `react-dom` (^19.0.0).

### 1.6 Capacitor Configuration & Android Platform Assets
* **Capacitor Config**: `/Users/nathanaelgovender/Developer/comic-reader/capacitor.config.ts`:
  ```ts
  import type { CapacitorConfig } from '@capacitor/cli';
  const config: CapacitorConfig = {
    appId: 'com.omnistream.app',
    appName: 'OmniStream',
    webDir: 'dist',
    server: {
      androidScheme: 'https',
      cleartext: true
    },
    ios: {
      contentInset: 'always',
      preferredContentMode: 'mobile',
      scheme: 'OmniStream'
    }
  };
  export default config;
  ```
* **Android Manifest**: `/Users/nathanaelgovender/Developer/comic-reader/android/app/src/main/AndroidManifest.xml`:
  * Configured for Android TV with `<category android:name="android.intent.category.LEANBACK_LAUNCHER" />` (line 24).
  * Has `<uses-feature android:name="android.software.leanback" android:required="false" />` and `<uses-feature android:name="android.hardware.touchscreen" android:required="false" />` (lines 42–43).
  * Missing: `android:hardwareAccelerated="true"` in `<application>` / `<activity>`.
  * Missing: `android:usesCleartextTraffic="true"` in `<application>` (critical for local proxy streams).
* **Capacitor Sync Verification**:
  * Executed `npx cap copy android`:
    `✔ Copying web assets from dist to android/app/src/main/assets/public in 3.82ms`
    `✔ Creating capacitor.config.json in android/app/src/main/assets in 248.29μs`
    `✔ copy android in 17.19ms` (Exit code 0).
  * Executed `npx cap sync android`:
    `✔ Copying web assets from dist to android/app/src/main/assets/public in 3.57ms`
    `✔ Updating Android plugins in 1.46ms`
    `[info] Sync finished in 0.032s` (Exit code 0).

---

## 2. Logic Chain

### 2.1 Gap Analysis for Requirement R3 (Exact-Second Watch Progress & Resume)
1. **Observation 1.1**: `watchHistoryService.ts` methods `saveMovie`, `saveTv`, and `saveAnime` do not accept `currentTime` or `duration` parameters. They only accept `progressPercent` and default it to 10.
2. **Observation 1.2**: `UnifiedVideoPlayer.tsx` invokes `watchHistoryService` only once upon mount and does not contain any interval timer (`setInterval`). Furthermore, it loads external embed iframes, preventing access to the video element's playback clock.
3. **Logic Step**: To satisfy R3 ("Persist current playback position to the nearest second every 5 seconds"), the player must use an HTML5 `<video>` element with direct HLS stream playback (per R1/R2) and maintain a 5-second interval timer that reads `video.currentTime`, rounds it to the nearest integer second (`Math.round(video.currentTime)`), and passes it to `watchHistoryService`.
4. **Observation 1.1 & 1.4**: `watchHistoryService.ts` only writes to `localStorage` under `omnistream_unified_history_v1`. There is no cloud sync and no server route `/api/watch-history`.
5. **Logic Step**: To satisfy R3 ("into local and cloud watch history"), `server/index.js` must provide `GET /api/watch-history` and `POST /api/watch-history` (persisting to `server/data/watch_history.json`, mirroring the pattern in `/api/anime/watchlist`), and `watchHistoryService.ts` must dispatch asynchronous cloud persistence upon each save and merge cloud state on load.
6. **Observation 1.3**: When launching titles from `MediaDetailModal.tsx`, `AnimeDetailModal.tsx`, or `HomeDashboard.tsx`, `onPlayMedia` and `onPlayEpisode` start playback from 0:00. There is no resume modal or prompt.
7. **Logic Step**: To satisfy R3 ("automatically offering exact-second resume when re-opening any title"), `watchHistoryService` must expose a lookup method (e.g. `getResumePosition(mediaType, id, season, episode)`). The player or detail view must check this position and, if `currentTime > 5` and not finished, display an auto-resume modal/HUD offering "Resume from MM:SS" or "Start from Beginning", automatically seeking upon user confirmation or automatically seeking with an instant revert option.

### 2.2 Gap Analysis for Requirement R4 (Production Build & Native Packaging)
1. **Observation 1.5**: Running `npx tsc --noEmit` fails with 48 compilation errors across 11 files.
2. **Observation 1.5**: `"build": "vite build"` in `package.json` does not run type checking, allowing type regressions to pass silently. However, Acceptance Criterion 4 explicitly mandates: `npm run build succeeds with zero TypeScript errors`.
3. **Logic Step**: All 48 TypeScript errors must be resolved (updating missing fields in `UnifiedPlayerSession`, `Anime`, `MediaItem`, `ReadingProgress`, and fixing component type bugs), and the build script should run `tsc --noEmit && vite build` so that the build cannot succeed unless TypeScript check passes with zero errors.
4. **Observation 1.5**: Vite generates a single 1.39 MB JS bundle with a warning about chunks exceeding 500 kB.
5. **Logic Step**: Adding `rollupOptions.output.manualChunks` in `vite.config.ts` (splitting `hls.js`, `lucide-react`, `framer-motion`, and React) will eliminate bundler warnings and reduce initial script load time.
6. **Observation 1.5**: `package.json` contains iOS Capacitor scripts but lacks Android scripts (`android:sync`, `android:copy`, `android:build`).
7. **Logic Step**: Adding `"android:sync": "npm run build && npx cap sync android"`, `"android:copy": "npm run build && npx cap copy android"`, and `"android:build": "npm run build && npx cap copy android"` will streamline cross-platform releases.
8. **Observation 1.6**: `android/app/src/main/AndroidManifest.xml` lacks `android:hardwareAccelerated="true"` and `android:usesCleartextTraffic="true"`.
9. **Logic Step**: Enabling hardware acceleration and cleartext traffic in `AndroidManifest.xml` ensures optimal video decoding performance on Android TV and prevents CORS proxy/stream blocking.

---

## 3. Caveats
* **iframe vs Direct HLS**: While in iframe fallback mode (mirror embeds), `video.currentTime` cannot be extracted due to cross-origin policies. Exact-second tracking is only possible when the direct HLS stream is resolved and rendered in the native `<video>` element. When in iframe fallback mode, the player can only record that the title was opened (or track session duration as an approximation).
* **Cloud Auth & User Tenancy**: The existing `comic-reader` server is a single-tenant local/self-hosted Node.js service without per-user authentication. The cloud sync endpoint will persist to a centralized JSON store (`server/data/watch_history.json`), consistent with existing endpoints (`anime_watchlist.json`, `antigravity_dev_queue.json`).
* **Existing TypeScript Errors**: Some of the 48 TypeScript errors exist in unrelated components (e.g. `LibraryView.tsx`, `DeveloperStudio.tsx`, `EBookDetailModal.tsx`). While not strictly part of video playback, they must be resolved because Acceptance Criterion 4 specifies zero TypeScript errors for the full project build.

---

## 4. Conclusion & Actionable Implementation Plan

### A. Watch History Service Enhancements (`src/services/watchHistoryService.ts`)
1. Extend `UnifiedHistoryItem`:
   * Store `currentTime: number`, `duration: number`, `progressPercent: number`, `season?: number`, `episode?: number`, `updatedAt: number`.
2. Update Methods:
   * `saveMovie(item: MediaItem, currentTime?: number, duration?: number, progressPercent?: number): void`
   * `saveTv(item: MediaItem, season?: number, episode?: number, currentTime?: number, duration?: number, progressPercent?: number): void`
   * `saveAnime(anime: Anime, episode?: number, audioType?: 'sub' | 'dub', currentTime?: number, duration?: number, progressPercent?: number): void`
   * Round `currentTime` to nearest second (`Math.round(currentTime)`).
3. Add Query Methods:
   * `getResumePosition(mediaType: string, id: string | number, season?: number, episode?: number): { currentTime: number; duration: number; progressPercent: number; formattedTime: string } | null`
4. Implement Cloud Sync:
   * Asynchronous `POST /api/watch-history` on every save.
   * `syncWithCloud(): Promise<void>` on initialization (merges server and local history).

### B. Server Cloud Persistence (`server/index.js`)
1. Define `const WATCH_HISTORY_FILE = path.join(DATA_DIR, 'watch_history.json');`.
2. Add `GET /api/watch-history`: Return JSON list of history items.
3. Add `POST /api/watch-history`: Upsert items by composite ID and timestamp, write to disk.

### C. Player 5-Second Interval & Auto-Resume Behavior
1. In the Cinema Video Player (`UnifiedVideoPlayer.tsx` / native player component):
   * Run a 5-second interval timer while video is playing (`!video.paused`).
   * Read `video.currentTime`, compute percentage, invoke `watchHistoryService.save...`.
   * Also trigger save immediately on `pause`, `seeked`, and before component unmount (`useEffect` cleanup / `beforeunload`).
2. Auto-Resume Modal / Behavior:
   * On player mount, check `watchHistoryService.getResumePosition(...)`.
   * If `currentTime > 5` and `currentTime < duration - 15`:
     * Display a modal or TV-friendly HUD overlay:
       - Title: "Resume Playback?"
       - Subtitle: `Continue from ${formattedTime} or start from beginning`
       - Buttons: `[Resume at MM:SS]` (focused by default) and `[Start Over (0:00)]`.
     * If confirmed or on TV OK press, set `video.currentTime = savedTime`.

### D. Build & Packaging Fixes
1. Fix all 48 TypeScript compilation errors across `src/`:
   * Update `UnifiedPlayerSession` interface with optional `cover`, `imdbId`, `audioType`, `currentEpisodeTitle`.
   * Update `MediaItem` interface with `overview?: string`, `poster?: string`, `imdb_id?: string`, `type?: string`, `year?: string | number`, `rating?: number`.
   * Fix missing imports (`Zap` in `EBookDetailModal.tsx`, `localIp` fallback in `AndroidTVModal.tsx`, `handleRetryAll` in `AnimePlayerModal.tsx`).
   * Fix API method call in `DeveloperStudio.tsx` (`execAntigravityCommand`).
   * Fix prop name in `SportsPlayerModal.tsx` (`streamUrl={streamUrl}`).
   * Fix `MiniPlayer.tsx` and `LibraryView.tsx` typing issues.
2. Update `package.json`:
   * `"build": "tsc --noEmit && vite build"`
   * Add `"android:copy": "npm run build && npx cap copy android"`
   * Add `"android:sync": "npm run build && npx cap sync android"`
   * Add `"typecheck": "tsc --noEmit"`
3. Update `vite.config.ts`:
   * Configure `build.rollupOptions.output.manualChunks` to split `vendor-react`, `vendor-hls`, `vendor-icons`, `vendor-motion`.
4. Update `android/app/src/main/AndroidManifest.xml`:
   * Add `android:hardwareAccelerated="true"` and `android:usesCleartextTraffic="true"` to `<application>`.

---

## 5. Verification Method

To independently verify all findings and test fixes:

1. **TypeScript Typecheck Command**:
   ```bash
   cd /Users/nathanaelgovender/Developer/comic-reader
   npx tsc --noEmit
   ```
   * *Baseline Result*: Exits with code 2 (48 errors).
   * *Target Result*: Exits with code 0 (0 errors).

2. **Production Build Command**:
   ```bash
   cd /Users/nathanaelgovender/Developer/comic-reader
   npm run build
   ```
   * *Baseline Result*: Vite builds in 2.01s with chunks warning (`index-JWfB2rg7.js: 1,390.89 kB`).
   * *Target Result*: TypeScript check executes first and passes; Vite bundles cleanly with vendor chunk splitting and no >500 kB warnings.

3. **Capacitor Android Copy & Sync Commands**:
   ```bash
   cd /Users/nathanaelgovender/Developer/comic-reader
   npx cap copy android
   npx cap sync android
   ```
   * *Verification*: Confirms web assets from `dist/` copy into `android/app/src/main/assets/public/` and Capacitor Android plugins sync cleanly in under 0.05s.

4. **Watch History Persistence & Cloud Sync Verification**:
   * Inspect `localStorage.getItem('omnistream_unified_history_v1')` in browser devtools after playing sample title.
   * Send test HTTP requests:
     ```bash
     curl -s http://localhost:3001/api/watch-history
     curl -s -X POST http://localhost:3001/api/watch-history -H "Content-Type: application/json" -d '{"item":{"id":"movie_27205","mediaType":"movie","title":"Inception","currentTime":154,"duration":8880,"progressPercent":2,"lastWatchedAt":1725652800000}}'
     ```
     Verify response `{ success: true }` and file created at `server/data/watch_history.json`.

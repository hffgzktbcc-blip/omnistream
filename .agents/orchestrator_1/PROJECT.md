# Project: Cinema Video Player Integration for OmniStream

## Architecture
A dual-mode cross-platform cinema video playback architecture for OmniStream supporting web, iOS, Android, and Android TV (10-foot D-Pad interface).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          OmniStream Frontend                                │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    Unified Cinema Player                              │  │
│  │                                                                       │  │
│  │   ┌────────────────────────────────┐ ┌─────────────────────────────┐  │  │
│  │   │  Mode A: Direct HLS Cinema     │ │  Mode B: Sanitized Iframe   │  │  │
│  │   │  - HTML5 <video> + hls.js      │ │  - 8 Mirror Server Failover │  │  │
│  │   │  - Native Safari HLS fallback  │ │  - Focus Trap Shield        │  │  │
│  │   │  - Multi-quality & audio tracks│ │  - Sandboxed & popup guard  │  │  │
│  │   │  - WebVTT Subtitle rendering   │ │                             │  │  │
│  │   └────────────────────────────────┘ └─────────────────────────────┘  │  │
│  │                                                                       │  │
│  │   ┌───────────────────────────────────────────────────────────────┐   │  │
│  │   │                     Cinema HUD & Controls                     │   │  │
│  │   │ - 10-Foot D-Pad Remote: Seek ±10s, Play/Pause, Track Drawer   │   │  │
│  │   │ - Mobile Gestures: Double-tap seek, Volume/Brightness swipe   │   │  │
│  │   │ - Indicators: Animated Seek Bubble, Volume/Brightness meters   │   │  │
│  │   │ - System Bridges: Native PiP, AirPlay, Aspect Ratio toggle    │   │  │
│  │   └───────────────────────────────────────────────────────────────┘   │  │
│  │                                                                       │  │
│  │   ┌───────────────────────────────────────────────────────────────┐   │  │
│  │   │        Exact-Second Watch Progress & Resume (5s hook)         │   │  │
│  │   └───────────────────────────────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                       Services & Stores                               │  │
│  │  - watchHistoryService (Local + Cloud sync, getResumePosition)        │  │
│  │  - streamingService (resolveDirectStream, mirror rotation)            │  │
│  │  - tvNavigation (D-Pad key routing without iframe trapping)           │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTP API / CORS Proxy
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       OmniStream Backend (Express)                          │
│                                                                             │
│  - /api/stream/resolve: Resolves Movies, TV, Anime to HLS + tracks          │
│  - /api/proxy/hls: Rewrites master & media .m3u8 manifests with CORS        │
│  - /api/proxy/segment: Binary .ts/.m4s streaming with HTTP Range support    │
│  - /api/proxy/subtitles: WebVTT (.vtt) proxying with CORS headers           │
│  - /api/watch-history: Cloud watch history persistence (watch_history.json) │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---|---|---|---|
| 1 | Direct Stream Resolver Endpoint | `/api/stream/resolve` for Movies, TV, Anime returning valid HLS .m3u8, audio tracks, and .vtt subtitles | M1 | Survey 1 (R1) |
| 2 | Sample ID Verification Fixtures | Guaranteed HLS streams with audio/subtitles for sample IDs: Movie 27205, TV 1399, Anime 21/151807 | M1 | Survey 1 (R1) |
| 3 | HLS Manifest Rewriter & Proxy | `/api/proxy/hls` rewriting variant playlists, audio tracks, subtitles, and segments with CORS | M1 | Survey 1 (R1) |
| 4 | Binary Segment Streaming Proxy | `/api/proxy/segment` streaming .ts/.m4s chunks with HTTP Range request support | M1 | Survey 1 (R1) |
| 5 | WebVTT Subtitle Proxy | `/api/proxy/subtitles` proxying .vtt subtitle files with UTF-8 and CORS headers | M1 | Survey 1 (R1) |
| 6 | Direct HTML5 Video Player | HTML5 `<video>` element powered by `hls.js` with audio and subtitle track switching | M2 | Survey 2 (R2) |
| 7 | Native Safari HLS Fallback | Fallback to `video.canPlayType('application/vnd.apple.mpegurl')` on iOS/Safari | M2 | Survey 2 (R2) |
| 8 | Seamless Dual-Mode Fallback | Instant switch to sanitized iframe embed without black screens if direct stream fails | M2 | Survey 2 (R1/R2) |
| 9 | Iframe Focus Trap Prevention | Transparent focus shield preventing remote focus trapping inside foreign iframes | M2 | Survey 2 (R2) |
| 10 | 10-Foot D-Pad Left/Right Seek | Remote ArrowLeft/ArrowRight seek backward/forward ±10s with visible time indicator bubble | M2 | Survey 2 (R2) |
| 11 | 10-Foot D-Pad Center Play/Pause | Remote Enter / DPAD_CENTER toggles play and pause reliably | M2 | Survey 2 (R2) |
| 12 | 10-Foot D-Pad Track Drawer | Remote ArrowUp / ArrowDown opens accessible on-screen drawer to switch subtitles and audio | M2 | Survey 2 (R2) |
| 13 | Back to Exit Handler | Remote Escape / KEYCODE_BACK closes drawer if open, or exits player without trapping | M2 | Survey 2 (R2) |
| 14 | Mobile Double-Tap Seek Gestures | Double-tap left/right half triggers animated ±10s seek indicator | M2 | Survey 2 (R2) |
| 15 | Mobile Vertical Swipe Volume | Vertical swipe on right screen half adjusts volume with vertical HUD meter | M2 | Survey 2 (R2) |
| 16 | Mobile Vertical Swipe Brightness | Vertical swipe on left screen half adjusts brightness overlay with vertical HUD meter | M2 | Survey 2 (R2) |
| 17 | Aspect Ratio Toggling | Toggle video display between contain (16:9), cover (zoom), and fill (stretch) | M2 | Survey 2 (R2) |
| 18 | Native Picture-in-Picture & AirPlay | `requestPictureInPicture()` and `webkitShowPlaybackTargetPicker()` integration | M2 | Survey 2 (R2) |
| 19 | 5-Second Interval Watch Progress | Persist current playback position rounded to nearest second every 5s during active playback | M3 | Survey 3 (R3) |
| 20 | Local & Cloud Watch History Sync | `watchHistoryService` local storage + `/api/watch-history` backend sync (watch_history.json) | M3 | Survey 3 (R3) |
| 21 | Exact-Second Resume Behavior | Automatic exact-second resume prompt/modal when re-opening any previously watched title | M3 | Survey 3 (R3) |
| 22 | TypeScript Error Remediation | Resolve all 48 compilation errors across 11 files for clean `npx tsc --noEmit` pass | M4 | Survey 3 (R4) |
| 23 | Clean Production Build Verification | Ensure `npm run build` succeeds cleanly with zero TypeScript errors | M4 | Survey 3 (R4) |
| 24 | Capacitor Android Packaging & Sync | AndroidManifest TV hardware acceleration, cleartext traffic, clean `npx cap copy android` | M4 | Survey 3 (R4) |
| 25 | E2E Opaque-Box Test Suite | Comprehensive Tiers 1-4 test suite verifying all 24 features independently | M_E2E | Orchestrator Plan |
| 26 | Adversarial Hardening (Tier 5) | White-box adversarial testing and code path verification | M_ADV | Orchestrator Plan |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| M_E2E | E2E Testing Suite Track | Design test infrastructure, runner, and test suites across Tiers 1-4 | none | IN_PROGRESS |
| M1 | Direct Stream Resolution & CORS Proxy | Features 1–5: `/api/stream/resolve`, `/api/proxy/hls`, `/api/proxy/segment`, `/api/proxy/subtitles`, sample IDs | none | PLANNED |
| M2 | Cross-Platform Cinema Video Player & Controls | Features 6–18: HTML5/hls.js, Safari fallback, D-Pad HUD, mobile gestures, PiP/AirPlay, iframe fallback | M1 | PLANNED |
| M3 | Exact-Second Watch Progress & Resume | Features 19–21: 5s progress interval, local+cloud watch history, exact-second resume modal/prompt | M2 | PLANNED |
| M4 | Production Build & Native Packaging | Features 22–24: Resolve 48 TS errors, zero-error `npm run build`, Capacitor Android copy & manifest | M3 | PLANNED |
| M_FINAL | 100% E2E Pass & Adversarial Hardening | Features 25–26: Pass 100% of Tiers 1-4, Tier 5 Adversarial Coverage Hardening | M4, M_E2E | PLANNED |

## Interface Contracts

### Backend Stream Resolver ↔ Frontend Cinema Player
- **Endpoint**: `GET /api/stream/resolve?type={movie|tv|anime}&id={id}&season={season}&episode={episode}&audioType={sub|dub}`
- **Response**:
```json
{
  "success": true,
  "streamUrl": "/api/proxy/hls?url=https%3A%2F%2F...&referer=...",
  "qualities": [
    { "label": "1080p", "url": "/api/proxy/hls?url=..." },
    { "label": "720p", "url": "/api/proxy/hls?url=..." }
  ],
  "subtitles": [
    { "label": "English", "language": "en", "url": "/api/proxy/subtitles?url=..." }
  ],
  "audioTracks": [
    { "label": "English", "language": "en", "id": 0 },
    { "label": "Japanese", "language": "ja", "id": 1 }
  ],
  "format": "hls"
}
```

### Watch History Service ↔ Cloud Backend
- **Endpoint**: `GET /api/watch-history` -> returns array of `UnifiedHistoryItem`
- **Endpoint**: `POST /api/watch-history` -> accepts `UnifiedHistoryItem`, upserts into `server/data/watch_history.json`
- **Updated `watchHistoryService` Method Signatures**:
```typescript
saveMovie(item: MediaItem, currentTime?: number, duration?: number, progressPercent?: number): void;
saveTv(item: MediaItem, season?: number, episode?: number, currentTime?: number, duration?: number, progressPercent?: number): void;
saveAnime(anime: Anime, episode?: number, audioType?: 'sub' | 'dub', currentTime?: number, duration?: number, progressPercent?: number): void;
getResumePosition(mediaType: string, id: string | number, season?: number, episode?: number): {
  currentTime: number;
  duration: number;
  progressPercent: number;
  formattedTime: string;
} | null;
```

### Video Player ↔ TV Remote Navigation
- Event listeners for `keydown`:
  - `ArrowLeft` (37 / 21) -> seek `video.currentTime - 10`, display `<SeekIndicator delta={-10} />`
  - `ArrowRight` (39 / 22) -> seek `video.currentTime + 10`, display `<SeekIndicator delta={+10} />`
  - `Enter` (13 / 66 / 23) -> toggle `video.paused ? video.play() : video.pause()`
  - `ArrowUp` (38 / 19) / `ArrowDown` (40 / 20) -> open/close `<TrackDrawer />`
  - `Escape` / `KEYCODE_BACK` (4) -> if drawer open, close drawer; else close player.

## Code Layout
- Backend routes & services:
  - `server/streamResolver.js` (or `server/index.js`): Stream resolution, manifest rewriter, segment & subtitle proxy, watch history endpoints.
  - `server/data/watch_history.json`: Server-side watch history storage.
- Frontend services & types:
  - `src/services/streamingService.ts`: Stream resolution client, fallback iframe URL generator.
  - `src/services/watchHistoryService.ts`: Exact-second tracking, cloud sync, resume lookup.
  - `src/types/media.ts`: Updated type definitions for MediaItem, Anime, UnifiedHistoryItem.
- Frontend Player Components:
  - `src/components/Player/CinemaPlayer.tsx`: Dual-Mode player engine.
  - `src/components/Player/CinemaHUD.tsx`: 10-Foot TV and mobile control bar & indicators.
  - `src/components/Player/GestureOverlay.tsx`: Mobile touch zone detection.
  - `src/components/Player/TrackDrawer.tsx`: Audio & subtitle switching drawer.
  - `src/components/Player/SeekIndicator.tsx`: Animated seek bubble.
  - `src/components/Player/ResumePrompt.tsx`: Exact-second resume prompt.
  - `src/components/Common/UnifiedVideoPlayer.tsx`: Main player entry point delegating to CinemaPlayer.
- Tests & Verification:
  - `tests/e2e/`: E2E test suites (Tiers 1-4).
  - `tests/harness/`: Test runners and mock endpoints.

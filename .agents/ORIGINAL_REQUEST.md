# Original User Request

## Initial Request — 2026-09-06T19:52:42Z

Build and integrate a high-performance cross-platform Cinema Video Player for OmniStream with direct HLS stream extraction, a 10-foot Android TV D-Pad HUD, mobile touch gestures (iOS/Android), exact-second resume tracking, and native player hardware acceleration bridges.

Working directory: /Users/nathanaelgovender/Developer/comic-reader
Integrity mode: development

## Requirements

### R1. Direct Stream Resolution & CORS Proxy
Provide direct HLS (.m3u8) stream extraction and segment proxying for Movies, TV Shows, and Anime, extracting multi-quality video streams, external subtitles (.vtt), and multiple audio tracks. Maintain seamless dual-mode fallback to sanitized iframe embeds if a direct stream cannot be resolved or fails to load.

### R2. Cross-Platform Cinema Video Player & Controls
Implement a responsive HTML5 <video> player powered by hls.js with fallback to native Safari HLS. Provide full 10-foot D-Pad remote navigation for Android TV (Left/Right ±10s seek, Center Play/Pause, Up/Down audio and subtitle track drawer, Back to exit) without focus traps, and touch gestures for mobile devices (double-tap ±10s seek, vertical swipe for volume and brightness, aspect ratio toggle, native Picture-in-Picture, and AirPlay).

### R3. Exact-Second Watch Progress & Resume
Persist current playback position to the nearest second every 5 seconds into local and cloud watch history (watchHistoryService), automatically offering exact-second resume when re-opening any title.

### R4. Production Build & Native Packaging
Ensure the full application builds cleanly without TypeScript or bundler errors, syncs properly with Capacitor Android assets, and produces release-ready distributions.

## Acceptance Criteria

### Stream Extraction & Fallback
- [ ] Direct stream resolver endpoint returns valid HLS .m3u8 manifests with subtitle tracks for sample movie, TV, and anime IDs.
- [ ] Player automatically falls back to secondary iframe mirrors without black screens if a direct stream fails.

### TV & Remote Control Experience
- [ ] D-Pad Left and Right seek backward and forward by 10 seconds with visible time indicator.
- [ ] D-Pad Center/Enter toggles Play and Pause reliably.
- [ ] D-Pad Up or Down opens an accessible on-screen drawer to switch subtitles and audio tracks.
- [ ] Remote focus never gets trapped inside foreign iframes.

### Mobile & Gesture Controls
- [ ] Double-tapping left or right half of the screen triggers ±10s seek animation.
- [ ] Vertical swipe on right half controls volume; vertical swipe on left half controls brightness overlay.
- [ ] Picture-in-Picture (PiP) and AirPlay buttons activate native system features where supported.

### Verification & Packaging
- [ ] npm run build succeeds with zero TypeScript errors.
- [ ] Capacitor Android assets sync cleanly (npx cap copy android).

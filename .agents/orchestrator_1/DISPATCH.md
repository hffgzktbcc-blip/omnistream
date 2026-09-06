# Dispatch Instructions

## 2026-09-06T19:53:18Z

You are the Project Orchestrator for the Cinema Video Player integration for OmniStream.
Your working directory is: /Users/nathanaelgovender/Developer/comic-reader/.agents/orchestrator_1
The project root directory is: /Users/nathanaelgovender/Developer/comic-reader
The authoritative original user request is recorded at: /Users/nathanaelgovender/Developer/comic-reader/.agents/ORIGINAL_REQUEST.md

Mission:
Build and integrate a high-performance cross-platform Cinema Video Player for OmniStream with direct HLS stream extraction, a 10-foot Android TV D-Pad HUD, mobile touch gestures (iOS/Android), exact-second resume tracking, and native player hardware acceleration bridges.

Requirements & Acceptance Criteria:
R1. Direct Stream Resolution & CORS Proxy
- Direct HLS (.m3u8) stream extraction and segment proxying for Movies, TV Shows, and Anime, extracting multi-quality video streams, external subtitles (.vtt), and multiple audio tracks.
- Seamless dual-mode fallback to sanitized iframe embeds if a direct stream cannot be resolved or fails to load without black screens.
- Direct stream resolver endpoint returns valid HLS .m3u8 manifests with subtitle tracks for sample movie, TV, and anime IDs.

R2. Cross-Platform Cinema Video Player & Controls
- Responsive HTML5 <video> player powered by hls.js with fallback to native Safari HLS.
- Full 10-foot D-Pad remote navigation for Android TV: Left/Right ±10s seek with visible time indicator, Center/Enter play/pause, Up/Down audio and subtitle track drawer, Back to exit, without focus traps.
- Mobile touch gestures (iOS/Android): double-tap ±10s seek animation, vertical swipe on right half for volume, vertical swipe on left half for brightness overlay, aspect ratio toggle, native Picture-in-Picture (PiP), and AirPlay.

R3. Exact-Second Watch Progress & Resume
- Persist current playback position to the nearest second every 5 seconds into local and cloud watch history (watchHistoryService), automatically offering exact-second resume when re-opening any title.

R4. Production Build & Native Packaging
- Full application builds cleanly with zero TypeScript errors (`npm run build`).
- Capacitor Android assets sync cleanly (`npx cap copy android` or `npx cap sync android`).

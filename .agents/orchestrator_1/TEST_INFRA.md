# OmniStream Cinema Video Player — E2E Test Infrastructure Specification

## 1. Overview
The OmniStream Cinema Video Player E2E Test Suite is an opaque-box, requirement-driven testing harness designed to verify all 24 features of the Cinema Video Player integration across four distinct validation tiers.

The suite tests the complete contract spectrum: backend stream resolvers (`/api/stream/resolve`), proxying pipelines (`/api/proxy/hls`, `/api/proxy/segment`, `/api/proxy/subtitles`), 10-foot Android TV D-Pad spatial navigation, mobile touch gestures, dual-mode fallback, exact-second watch history synchronization (`/api/watch-history`), and native packaging scripts.

## 2. Directory & Component Layout
```
tests/
├── harness/
│   ├── contracts.js          # Canonical schemas, interface contracts, and format validators
│   ├── mock-server.js        # Reference mock server on port 3099 for offline/contract testing
│   ├── player-simulator.js   # Headless event-driven simulation of HTML5 video, HLS.js, D-Pad, touch
│   └── test-utils.js         # Assertion helpers, test runner, structured report formatting
├── e2e/
│   ├── tier1-feature-coverage.test.js    # Tier 1: 120 tests (>=5 tests per feature for F01-F24)
│   ├── tier2-boundary-corner.test.js     # Tier 2: 120 tests (>=5 boundary/adversarial tests for F01-F24)
│   ├── tier3-combinations.test.js        # Tier 3: 30 tests (pairwise cross-feature interactions)
│   ├── tier4-scenarios.test.js           # Tier 4: 15 tests (real-world end-to-end user workflows)
│   └── runner.js                         # Master CLI test runner with filtering and reporting
├── run-all.js                            # Root execution entry point
├── test-report.md                        # Generated markdown execution report
├── TEST_INFRA.md                         # This architecture specification
└── TEST_READY.md                         # Test readiness certificate & verification guide
```

## 3. Four-Tier Test Architecture

### Tier 1: Feature Coverage (120 Tests)
- **Scope**: Every single feature from F01 through F24 has a minimum of 5 distinct test cases covering primary behavior (happy path).
- **Features Covered**:
  - `F01` (Direct Stream Resolver Endpoint): Movie, TV, and Anime stream resolution, format validation, qualities and subtitles arrays.
  - `F02` (Sample ID Verification Fixtures): Movie 27205, TV 1399, Anime 21 and 151807 guaranteed streams and subtitles.
  - `F03` (HLS Manifest Rewriter & Proxy): `application/vnd.apple.mpegurl` headers, CORS `*`, `#EXTM3U`, rewritten stream variants and segments.
  - `F04` (Binary Segment Streaming Proxy): Binary `.ts` streaming, `Range` requests (HTTP 206), `Content-Range`, `Accept-Ranges: bytes`, byte lengths.
  - `F05` (WebVTT Subtitle Proxy): `text/vtt; charset=utf-8`, CORS `*`, `WEBVTT` signature, cue timings (`-->`), text payloads.
  - `F06` (Direct HTML5 Video Player): `direct-hls` mode defaults, HLS URL loading, audio/subtitle track switching, play/pause state transitions.
  - `F07` (Native Safari HLS Fallback): MIME detection (`application/vnd.apple.mpegurl`), direct source loading, duration handling, tracks.
  - `F08` (Seamless Dual-Mode Fallback): Mode A to Mode B transition, initial primary mirror (`vidlink-pro`), mirror rotation, exhaustion.
  - `F09` (Iframe Focus Trap Prevention): Focus shield mounting, keydown event capture, window event bubbling, host focus retention.
  - `F10` (10-Foot D-Pad Left/Right Seek): ArrowLeft/Right seek ±10s, Android DPAD_LEFT (21) / DPAD_RIGHT (22), seek indicator bubble.
  - `F11` (10-Foot D-Pad Center Play/Pause): Enter (13), DPAD_CENTER (23), NUMPAD_ENTER (66), event emission.
  - `F12` (10-Foot D-Pad Track Drawer): ArrowUp (38), ArrowDown (40), audio tracks, subtitle tracks ('Off' selection).
  - `F13` (Back to Exit Handler): Escape (27), KEYCODE_BACK (4), close drawer if open, exit player if closed, progress flush.
  - `F14` (Mobile Double-Tap Seek Gestures): Double tap left half (-10s), right half (+10s), seek ripple, 300ms window, touch lifecycle.
  - `F15` (Mobile Vertical Swipe Volume): Swipe up/down on right half, volume HUD meter, integer percent (0-100), mute at 0.
  - `F16` (Mobile Vertical Swipe Brightness): Swipe up/down on left half, brightness HUD meter, integer percent (10-100), event emission.
  - `F17` (Aspect Ratio Toggling): Mode cycle (contain -> cover -> fill -> contain), event emission, styling binding.
  - `F18` (Native Picture-in-Picture & AirPlay): `requestPictureInPicture()`, `exitPictureInPicture()`, events, AirPlay picker.
  - `F19` (5-Second Interval Watch Progress): 5000ms timer, nearest-second rounding, pause/resume halts, percent calculation.
  - `F20` (Local & Cloud Watch History Sync): `UnifiedHistoryItem` schema, `POST /api/watch-history`, `GET /api/watch-history`, upsert by ID, 40 item cap.
  - `F21` (Exact-Second Resume Behavior): Eligibility check (> 5s and < 95%), `MM:SS` format, confirm resume seek, start over seek to 0.
  - `F22` (TypeScript Error Remediation): `UnifiedHistoryItem` interface, `MediaItem` interface, `tsconfig.json`, target compatibility.
  - `F23` (Clean Production Build Verification): Build script in `package.json`, `vite.config.ts`, `dist/index.html`, `dist/assets/` output.
  - `F24` (Capacitor Android Packaging & Sync): `capacitor.config.ts`, `LEANBACK_LAUNCHER`, `INTERNET` permission, Android public assets.

### Tier 2: Boundary & Corner Cases (120 Tests)
- **Scope**: Minimum 5 boundary, edge condition, stress, and security tests per feature across all 24 features.
- **Highlights**:
  - SSRF Protection: Blocks loopback (`127.0.0.1`), LAN (`10.0.0.1`, `192.168.1.1`), and cloud metadata (`169.254.169.254`) with HTTP 403.
  - HTTP Range Boundary: Out-of-bounds (`bytes=9999999-`) and inverted ranges return HTTP 416 Range Not Satisfiable. Single-byte requests return exact 1 byte.
  - Seek Clamping: Backward seek when `currentTime < 10` clamps strictly to `0`; forward seek past duration clamps to `duration`.
  - Rapid Input Accumulation: 3 rapid D-Pad seeks accumulate delta (+30s); rapid Enter toggles handle state debounce cleanly.
  - Volume & Brightness Boundaries: Volume clamped [0.0, 1.0]; Brightness clamped [0.1, 1.0] preventing screen blackout; horizontal gestures ignored.
  - Resume Boundaries: Content <= 5s ignored; content >= 95% treated as completed; dismiss via Escape retains 0s.
  - Cloud History Boundaries: Malformed JSON returns 400; missing ID returns 400; concurrent posts serialize cleanly.

### Tier 3: Cross-Feature Combinations (30 Tests)
- **Scope**: Pairwise combinatorial testing of feature interactions.
- **Key Intersections**:
  - Resolver + Manifest Proxy (`F01+F03`)
  - Manifest Proxy + Segment Proxy with Range (`F03+F04`)
  - Resolver + WebVTT Subtitle Proxy (`F01+F05`)
  - Direct Stream + Dual-Mode Fallback (`F06+F08`)
  - Dual-Mode Fallback + Focus Shield (`F08+F09`)
  - Focus Shield + TV D-Pad Seek (`F09+F10`)
  - D-Pad Play/Pause + 5s Progress Heartbeat (`F11+F19`)
  - Track Drawer + WebVTT Subtitle Proxy (`F12+F05`)
  - Track Drawer + Back Key Dismissal (`F12+F13`)
  - Mobile Touch Seek + 5s Progress Sync (`F14+F19`)
  - Mobile Volume Swipe + HTML5 Video Binding (`F15+F06`)
  - Brightness Swipe + Aspect Ratio Overlay (`F16+F17`)
  - Native PiP + Active Progress Heartbeat (`F18+F19`)
  - Active Progress + Cloud History Upsert (`F19+F20`)
  - Cloud History + Resume Prompt Lookup (`F20+F21`)
  - Resume Confirm + HTML5 Video Seek (`F21+F06`)
  - Anime Sub/Dub + Track Drawer Audio Choices (`F01+F12`)
  - TV Season/Episode + Watch History Composite ID (`F01+F20`)
  - Iframe Fallback + Back to Exit Handler (`F08+F13`)
  - D-Pad Seek during Buffer Stall (`F10+F06`)
  - Subtitle Active + Aspect Ratio Cycle (`F05+F17`)
  - Safari Native HLS + Resume Seeking (`F07+F21`)
  - Production Build + Capacitor Android Copy (`F23+F24`)
  - TypeScript Config + Production Bundler (`F22+F23`)
  - Cleartext Config + Local Stream Resolver (`F24+F01`)
  - History 40-item Quota Management (`F20+F20`)
  - Mobile Double-Tap + D-Pad Seek Interleaving (`F14+F10`)
  - Fullscreen Toggle + Focus Shield Resizing (`F09+F17`)

### Tier 4: Real-World Application Scenarios (15 Tests)
- **Scope**: End-to-end user workflows under authentic operating conditions.
- **Workflows**:
  - `SCN01`: Complete Movie Playback Lifecycle (resolve -> resume at 01:14:20 -> play -> seek +20s -> pause -> save -> exit).
  - `SCN02`: TV Series Binge Workflow (S01E01 played to 95% completion -> auto-progress to S01E02 at 0s).
  - `SCN03`: Anime Multi-Language & WebVTT Subtitle Workflow (sub -> open drawer -> pick English VTT -> toggle dub).
  - `SCN04`: Android TV 10-Foot Leanback Remote Flow (pure D-Pad: Center play, Right seek, Up drawer, Down close, Left seek, Back exit).
  - `SCN05`: Mobile Commute Workout (double-tap seek, right-side volume swipe, left-side brightness swipe, PiP toggle).
  - `SCN06`: Network Degradation & Stream Recovery (fatal network drop triggers Mode B fallback to mirror without black screen).
  - `SCN07`: Foreign Iframe Containment & Remote Escape (iframe redirect blocked by shield, Back key cleanly exits player).
  - `SCN08`: Multi-Device Cloud Sync & Resume Handshake (Device A saves 3520s to cloud; Device B fetches and prompts resume).
  - `SCN09`: Cold Start to Production Build & Native Packaging Pipeline (`package.json`, `dist/`, AndroidManifest validation).
  - `SCN10`: Subtitle Track Switching Under Aspect Ratio Cycles (Contain -> Cover -> Fill while subtitles remain positioned).
  - `SCN11`: Rapid Channel Surfing (opening 5 titles in rapid succession cleanly destroys previous instances).
  - `SCN12`: Offline Playback & Sync Reconnection (offline progress saves locally, syncs to cloud upon reconnection).
  - `SCN13`: Subtitle Encoding & Special Character Verification (WebVTT handles UTF-8, Japanese kanji, and cue timings).
  - `SCN14`: Audio Track Multi-Channel Fallback (seamless audio switching preserves currentTime without playback stutter).
  - `SCN15`: System Autoplay Policy Interception (browser blocks autoplay; player catches rejection and shows un-mute prompt).

## 4. Execution Modes & CLI Usage

### Standalone Mock Harness Mode (Default)
Spins up the built-in reference mock server on port `3099`, runs all 285 tests across Tiers 1-4, and shuts down cleanly.
```bash
node tests/e2e/runner.js
# or
node tests/run-all.js
```

### Live Server Mode
Runs the test suite against the live running Express application on port `3001`.
```bash
node tests/e2e/runner.js --live
```

### Tier-Specific Execution
Filter execution to specific tiers:
```bash
node tests/e2e/runner.js --tier=1
node tests/e2e/runner.js --tier=1,2
node tests/e2e/runner.js --tier=4
```

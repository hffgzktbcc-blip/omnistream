# Master Plan — Cinema Video Player Integration for OmniStream

## Objective
Deliver a high-performance cross-platform Cinema Video Player for OmniStream with direct HLS stream extraction, a 10-foot Android TV D-Pad HUD, mobile touch gestures, exact-second resume tracking, and native player bridges.

## Phases

### Phase 0: Survey & Codebase Investigation
- Spawn 3 parallel Explorers to inspect the repository at `/Users/nathanaelgovender/Developer/comic-reader`.
  - **Explorer 1 (Streams & Backend)**: Inspect existing streaming routes, proxies, extractors, video sources (Movies, TV, Anime), API endpoints.
  - **Explorer 2 (Player UI & Controls)**: Inspect existing video player components, hls.js setup, D-Pad / remote navigation hooks, mobile gesture handlers, subtitle/audio drawers.
  - **Explorer 3 (Persistence & Build/Native)**: Inspect `watchHistoryService`, progress tracking, resume logic, Capacitor config, Android assets, package.json build scripts.
- Synthesize all findings into `/Users/nathanaelgovender/Developer/comic-reader/PROJECT.md` with a complete Feature Inventory and Architecture.

### Phase 1: Dual-Track Initialization
- **E2E Testing Track**:
  - Test harness and runner for direct stream resolution, fallback, player controls, progress tracking, and build verification.
  - Test suites: Tier 1 (Feature Coverage), Tier 2 (Boundary & Corner Cases), Tier 3 (Combinatorial), Tier 4 (Real-World Scenarios).
  - Produces `TEST_INFRA.md` and `TEST_READY.md`.
- **Implementation Track**:
  - Module milestone definitions with interface contracts.

### Phase 2: Implementation Milestones
- **Milestone 1 (R1)**: Direct Stream Resolution & CORS Proxy (.m3u8 manifests, multi-quality, audio/subtitle extraction, iframe fallback).
- **Milestone 2 (R2)**: Cross-Platform Cinema Video Player & Controls (HTML5 + hls.js, 10-foot Android TV D-Pad HUD, mobile touch gestures, PiP, AirPlay).
- **Milestone 3 (R3)**: Exact-Second Watch Progress & Resume (`watchHistoryService`, 5s interval, exact-second resume modal/auto-resume).
- **Milestone 4 (R4)**: Production Build & Native Packaging (`npm run build` zero errors, Capacitor Android sync).

### Phase 3: Final Acceptance & Adversarial Hardening
- Phase 1: Pass 100% of E2E test suite (Tiers 1-4).
- Phase 2: Adversarial Coverage Hardening (Tier 5 Challenger loop).
- Final review, audit, and completion report to user.

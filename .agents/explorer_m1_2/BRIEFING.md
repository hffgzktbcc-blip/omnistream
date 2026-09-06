# BRIEFING — 2026-09-06T20:05:00Z

## Mission
Investigate and produce the concrete architectural design and implementation specifications for the HLS manifest rewriter & proxy endpoint (`/api/proxy/hls`).

## 🔒 My Identity
- Archetype: explorer
- Roles: investigation, synthesis
- Working directory: /Users/nathanaelgovender/Developer/comic-reader/.agents/explorer_m1_2
- Original parent: f0a3b5ce-139c-46a5-b0fb-c2a6aa7531f1
- Milestone: M1 (Direct Stream Resolution & CORS Proxy)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement or modify source code
- Files for content delivery (reports, handoffs, analysis), messages for coordination
- Keep handoff report self-contained with 5-component structure (Observation, Logic Chain, Caveats, Conclusion, Verification Method)

## Current Parent
- Conversation ID: f0a3b5ce-139c-46a5-b0fb-c2a6aa7531f1
- Updated: not yet

## Investigation State
- **Explored paths**:
  - `server/index.js` (safeFetch lines 64-165, CORS lines 171-174, proxies lines 197-353, SSRF validateSafeHostname lines 29-63)
  - `server/audiobooks.js` (router structure)
  - `src/components/Sports/HlsVideoPlayer.tsx` (hls.js usage and native Safari playback)
  - `.agents/orchestrator_1/PROJECT.md` & `.agents/ORIGINAL_REQUEST.md`
  - `.agents/explorer_survey_1/handoff.md`, `.agents/explorer_m1_1/DISPATCH.md`, `.agents/explorer_m1_3/DISPATCH.md`
- **Key findings**:
  - `safeFetch` follows redirects and buffers response; returning `url: url` resolves final redirect destination for relative URL calculation.
  - Manifest rewriting must bifurcate master playlists vs media playlists based on RFC 8216:
    - Master variants (`#EXT-X-STREAM-INF`, `#EXT-X-I-FRAME-STREAM-INF`) and media alternatives (`#EXT-X-MEDIA:TYPE=AUDIO/SUBTITLES`) route to `/api/proxy/hls`.
    - Media segments (`#EXTINF` lines, `#EXT-X-MAP`, `#EXT-X-KEY`, `#EXT-X-PART`) route to `/api/proxy/segment` (or `/api/proxy/subtitles` for `.vtt`).
  - Referer propagation: embedding `referer` into rewritten query strings ensures downstream segment requests satisfy CDN hotlinking protection.
  - Required headers: `Content-Type: application/vnd.apple.mpegurl; charset=utf-8`, `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Headers: *`.
- **Unexplored areas**:
  - None within Explorer 2 scope; complete design prepared for Worker.

## Key Decisions Made
- Recommended dedicated modular file `server/hlsProxy.js` exporting `rewriteHlsManifest` and `handleHlsProxy` for direct unit testability and clean architecture.

## Artifact Index
- `/Users/nathanaelgovender/Developer/comic-reader/.agents/explorer_m1_2/DISPATCH.md` — Dispatch directives
- `/Users/nathanaelgovender/Developer/comic-reader/.agents/explorer_m1_2/BRIEFING.md` — Persistent memory
- `/Users/nathanaelgovender/Developer/comic-reader/.agents/explorer_m1_2/progress.md` — Liveness heartbeat
- `/Users/nathanaelgovender/Developer/comic-reader/.agents/explorer_m1_2/handoff.md` — Final handoff report

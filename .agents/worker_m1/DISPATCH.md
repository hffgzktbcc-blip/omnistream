# Milestone 1 Worker Dispatch

## Target
Implement Milestone 1: Direct Stream Resolution & CORS Proxy (Requirement R1, Features 1–5).

## Context
Authoritative Request: /Users/nathanaelgovender/Developer/comic-reader/.agents/ORIGINAL_REQUEST.md
Project Scope Document: /Users/nathanaelgovender/Developer/comic-reader/.agents/orchestrator_1/PROJECT.md
Explorer Reports:
- /Users/nathanaelgovender/Developer/comic-reader/.agents/explorer_m1_1/handoff.md (Stream Resolver & Sample ID Fixtures)
- /Users/nathanaelgovender/Developer/comic-reader/.agents/explorer_m1_2/handoff.md (HLS Manifest Rewriter & Proxy)
- /Users/nathanaelgovender/Developer/comic-reader/.agents/explorer_m1_3/handoff.md (Segment Streaming & Subtitle Proxy)
Working Directory: /Users/nathanaelgovender/Developer/comic-reader/.agents/worker_m1
Role: teamwork_preview_worker

## File Write Ownership
The Worker exclusively owns and may modify/create:
- `server/streamResolver.js`
- `server/streamProxy.js` (including HLS manifest proxy, segment proxy, and subtitle proxy)
- `server/index.js` (mounting `/api/stream` and `/api/proxy`)
- `src/services/streamingService.ts` (adding `resolveDirectStream` client method and types)

## Requirements & Scope
1. Read ORIGINAL_REQUEST.md, PROJECT.md, and the three Explorer reports.
2. Implement `/api/stream/resolve`:
   - Support `type=movie`, `type=tv`, `type=anime`, `id`, `season`, `episode`, `audioType`.
   - Implement verified sample fixtures returning valid .m3u8 manifests with subtitle tracks for sample IDs: Movie 27205, TV 1399, Anime 21 and 151807.
   - Return structured response: `{ success, streamUrl, qualities, subtitles, audioTracks, format: 'hls' }`.
   - Implement scraper extraction fallback with timeout and graceful `{ success: false }` signal for unresolvable media.
3. Implement `/api/proxy/hls`:
   - Fetch upstream manifests, parse RFC 8216 playlists.
   - Rewrite master variant playlists, audio tracks, and subtitle tracks to `/api/proxy/hls`.
   - Rewrite media segments, init maps, and keys to `/api/proxy/segment`.
   - Resolve relative URLs against base manifest URL.
   - Propagate Referer/Origin headers.
   - Return `Content-Type: application/vnd.apple.mpegurl` and CORS headers.
4. Implement `/api/proxy/segment`:
   - Stream binary `.ts` and `.m4s` segments using chunk piping (`proxyRes.pipe(res)`).
   - Handle HTTP Range requests (`req.headers.range`), `206 Partial Content`, and expose headers.
   - Handle client aborts (`req.on('close')`) to prevent socket leaks.
5. Implement `/api/proxy/subtitles`:
   - Proxy `.vtt` subtitles with `Content-Type: text/vtt; charset=utf-8` and CORS headers.
   - Auto-convert SubRip (`.srt`) to WebVTT.
6. Verify your implementation by running tests, verifying endpoints with curl or node test scripts, ensuring the server runs without errors.
7. Write your handoff report to `/Users/nathanaelgovender/Developer/comic-reader/.agents/worker_m1/handoff.md`.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## 2026-09-06T20:08:29Z
You are the Milestone 1 Worker for the Cinema Video Player integration for OmniStream.
Your working directory is: /Users/nathanaelgovender/Developer/comic-reader/.agents/worker_m1
Codebase location: /Users/nathanaelgovender/Developer/comic-reader
Read your dispatch file at: /Users/nathanaelgovender/Developer/comic-reader/.agents/worker_m1/DISPATCH.md
Read the authoritative user request at: /Users/nathanaelgovender/Developer/comic-reader/.agents/ORIGINAL_REQUEST.md
Read the project scope at: /Users/nathanaelgovender/Developer/comic-reader/.agents/orchestrator_1/PROJECT.md
Read the three Explorer handoff reports:
- /Users/nathanaelgovender/Developer/comic-reader/.agents/explorer_m1_1/handoff.md
- /Users/nathanaelgovender/Developer/comic-reader/.agents/explorer_m1_2/handoff.md
- /Users/nathanaelgovender/Developer/comic-reader/.agents/explorer_m1_3/handoff.md

Your exclusive file write ownership:
- server/streamResolver.js
- server/streamProxy.js (or server/hlsProxy.js)
- server/index.js (mounting routes)
- src/services/streamingService.ts (adding resolveDirectStream helper and types)

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Task:
1. Implement the stream resolver, HLS manifest rewriter/proxy, segment streaming proxy, and subtitle proxy as designed by the Explorers.
2. Ensure endpoints handle sample IDs (Movie 27205, TV 1399, Anime 21 & 151807) with valid HLS manifests and subtitles.
3. Test your endpoints and ensure server starts cleanly without errors.
4. Write your complete handoff report to /Users/nathanaelgovender/Developer/comic-reader/.agents/worker_m1/handoff.md.
5. Once complete, send a message back to the orchestrator with your results.

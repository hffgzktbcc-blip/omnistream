# Milestone 1 Explorer 2 Dispatch

## Target
Milestone 1 — HLS Manifest Rewriter & Proxy (`/api/proxy/hls`) Architecture & Implementation Strategy.

## Context
Authoritative Request: /Users/nathanaelgovender/Developer/comic-reader/.agents/ORIGINAL_REQUEST.md
Project Scope Document: /Users/nathanaelgovender/Developer/comic-reader/.agents/orchestrator_1/PROJECT.md
Prior Survey Report: /Users/nathanaelgovender/Developer/comic-reader/.agents/explorer_survey_1/handoff.md
Working Directory: /Users/nathanaelgovender/Developer/comic-reader/.agents/explorer_m1_2
Role: teamwork_preview_explorer

## Task
1. Read ORIGINAL_REQUEST.md and PROJECT.md.
2. Investigate the implementation design for `/api/proxy/hls`:
   - Fetching upstream `.m3u8` master and variant playlists via safeFetch with necessary `Referer` / `User-Agent`.
   - Parsing and rewriting manifest lines:
     - Master playlist variants (`#EXT-X-STREAM-INF`) rewritten to proxy URLs.
     - Media groups (`#EXT-X-MEDIA:TYPE=AUDIO`, `#EXT-X-MEDIA:TYPE=SUBTITLES`) with `URI="..."` rewritten to proxy URLs.
     - Media segments (`.ts`, `.m4s`, `.mp4`) rewritten to `/api/proxy/segment` URLs.
     - Resolving relative URLs against the base manifest URI.
   - Injecting required CORS headers (`Access-Control-Allow-Origin: *`, `Access-Control-Allow-Headers: *`) and `Content-Type: application/vnd.apple.mpegurl`.
3. Provide concrete code structure and recommendation for the implementation Worker (do not modify source code yourself).
4. Write handoff report to /Users/nathanaelgovender/Developer/comic-reader/.agents/explorer_m1_2/handoff.md.

## 2026-09-06T20:02:36Z
You are Milestone 1 Explorer 2 for the Cinema Video Player integration.
Your working directory is: /Users/nathanaelgovender/Developer/comic-reader/.agents/explorer_m1_2
Codebase location: /Users/nathanaelgovender/Developer/comic-reader
Read your dispatch file at: /Users/nathanaelgovender/Developer/comic-reader/.agents/explorer_m1_2/DISPATCH.md
Read the authoritative user request at: /Users/nathanaelgovender/Developer/comic-reader/.agents/ORIGINAL_REQUEST.md
Read the project scope at: /Users/nathanaelgovender/Developer/comic-reader/.agents/orchestrator_1/PROJECT.md

Task:
1. Investigate the implementation design for `/api/proxy/hls`:
   - Fetching upstream .m3u8 playlists via safeFetch with Referer and User-Agent headers.
   - Parsing and rewriting manifest lines: master playlist variants, audio tracks, subtitle tracks, and media segments to route through proxy endpoints.
   - Resolving relative URLs against base manifest URI.
   - Adding required CORS headers and content type `application/vnd.apple.mpegurl`.
2. Provide concrete implementation recommendation and file structure for the implementation Worker (do not edit source code yourself).
3. Write handoff report to /Users/nathanaelgovender/Developer/comic-reader/.agents/explorer_m1_2/handoff.md and report back via send_message.

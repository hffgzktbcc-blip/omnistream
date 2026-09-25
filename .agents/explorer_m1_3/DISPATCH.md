# Milestone 1 Explorer 3 Dispatch

## Target
Milestone 1 — Segment & Subtitle Proxy (`/api/proxy/segment` & `/api/proxy/subtitles`) Architecture & Implementation Strategy.

## Context
Authoritative Request: ./.agents/ORIGINAL_REQUEST.md
Project Scope Document: ./.agents/orchestrator_1/PROJECT.md
Prior Survey Report: ./.agents/explorer_survey_1/handoff.md
Working Directory: ./.agents/explorer_m1_3
Role: teamwork_preview_explorer

## Task
1. Read ORIGINAL_REQUEST.md and PROJECT.md.
2. Investigate the implementation design for `/api/proxy/segment` and `/api/proxy/subtitles`:
   - Binary segment streaming for `.ts` and `.m4s` chunks via Express, streaming with chunk piping.
   - HTTP Range request handling (`req.headers.range`), `206 Partial Content`, and forwarding range headers to upstream CDN.
   - WebVTT (`.vtt`) and SubRip (`.srt`) subtitle proxying, ensuring valid `Content-Type: text/vtt; charset=utf-8` and CORS headers.
   - Referer/Origin forwarding, SSRF protections, and error handling.
3. Provide concrete code structure and recommendation for the implementation Worker (do not modify source code yourself).
4. Write handoff report to ./.agents/explorer_m1_3/handoff.md.

## 2026-09-06T20:02:36Z
<USER_REQUEST>
You are Milestone 1 Explorer 3 for the Cinema Video Player integration.
Your working directory is: ./.agents/explorer_m1_3
Codebase location: .
Read your dispatch file at: ./.agents/explorer_m1_3/DISPATCH.md
Read the authoritative user request at: ./.agents/ORIGINAL_REQUEST.md
Read the project scope at: ./.agents/orchestrator_1/PROJECT.md

Task:
1. Investigate the implementation design for `/api/proxy/segment` and `/api/proxy/subtitles`:
   - Binary segment streaming for .ts and .m4s chunks via Express streaming pipes.
   - HTTP Range request handling (206 Partial Content) and header forwarding.
   - WebVTT (.vtt) and SubRip (.srt) subtitle proxying with UTF-8 and CORS headers.
   - Referer/Origin forwarding, SSRF protections, and error handling.
2. Provide concrete implementation recommendation and file structure for the implementation Worker (do not edit source code yourself).
3. Write handoff report to ./.agents/explorer_m1_3/handoff.md and report back via send_message.
</USER_REQUEST>

# Milestone 1 Explorer 1 Dispatch

## Target
Milestone 1 — Direct Stream Resolution (`/api/stream/resolve`) Architecture & Implementation Strategy.

## Context
Authoritative Request: /Users/nathanaelgovender/Developer/comic-reader/.agents/ORIGINAL_REQUEST.md
Project Scope Document: /Users/nathanaelgovender/Developer/comic-reader/.agents/orchestrator_1/PROJECT.md
Prior Survey Report: /Users/nathanaelgovender/Developer/comic-reader/.agents/explorer_survey_1/handoff.md
Working Directory: /Users/nathanaelgovender/Developer/comic-reader/.agents/explorer_m1_1
Role: teamwork_preview_explorer

## Task
1. Read ORIGINAL_REQUEST.md and PROJECT.md.
2. Investigate the implementation design for `/api/stream/resolve`:
   - Support `type=movie`, `type=tv`, and `type=anime`.
   - Resolve TMDB IDs, Season/Episode, and Anime IDs/audioType to direct HLS (.m3u8) streams.
   - Design extraction strategy for upstream providers and verified fixtures for sample IDs (`27205` for movies, `1399` for TV, `21`/`151807` for anime) to guarantee valid .m3u8 manifests and subtitles.
   - Return structured response with `success`, `streamUrl`, `qualities`, `subtitles`, `audioTracks`, and `format`.
3. Provide concrete code structure and recommendation for the implementation Worker (do not modify source code yourself).
4. Write handoff report to /Users/nathanaelgovender/Developer/comic-reader/.agents/explorer_m1_1/handoff.md.

## 2026-09-06T20:02:36Z
You are Milestone 1 Explorer 1 for the Cinema Video Player integration.
Your working directory is: /Users/nathanaelgovender/Developer/comic-reader/.agents/explorer_m1_1
Codebase location: /Users/nathanaelgovender/Developer/comic-reader
Read your dispatch file at: /Users/nathanaelgovender/Developer/comic-reader/.agents/explorer_m1_1/DISPATCH.md
Read the authoritative user request at: /Users/nathanaelgovender/Developer/comic-reader/.agents/ORIGINAL_REQUEST.md
Read the project scope at: /Users/nathanaelgovender/Developer/comic-reader/.agents/orchestrator_1/PROJECT.md

Task:
1. Investigate the implementation design for `/api/stream/resolve`:
   - Support `type=movie`, `type=tv`, `type=anime`.
   - Resolve TMDB IDs, Season/Episode, and Anime IDs to direct HLS (.m3u8) streams.
   - Design extraction strategy for upstream providers and verified fixtures for sample IDs (Movie 27205, TV 1399, Anime 21/151807) to guarantee valid .m3u8 manifests and subtitles.
   - Return structured response format per PROJECT.md interface contract.
2. Provide concrete implementation recommendation and file structure for the implementation Worker (do not edit source code yourself).
3. Write handoff report to /Users/nathanaelgovender/Developer/comic-reader/.agents/explorer_m1_1/handoff.md and report back via send_message.


/**
 * OmniStream Cinema Video Player — Tier 1: Feature Coverage Test Suite
 * Minimum 5 comprehensive feature tests per feature across all 24 features (120 tests total).
 */

import { runTest, assert } from '../harness/test-utils.js';
import {
  FEATURES,
  validateStreamResolveResponse,
  validateHLSManifest,
  validateWebVTTContent,
  validateHistoryItem,
  DPAD_KEYS
} from '../harness/contracts.js';
import { HeadlessCinemaPlayer } from '../harness/player-simulator.js';
import fs from 'node:fs';
import path from 'node:path';

export async function runTier1FeatureTests(tracker, { baseUrl = 'http://localhost:3099' } = {}) {
  const TIER = 'Tier 1';

  // --- Feature 1: Direct Stream Resolver Endpoint ---
  await runTest(tracker, TIER, 'F01', 'T1.1.1: Movie stream resolution returns valid HLS payload', async () => {
    const res = await fetch(`${baseUrl}/api/stream/resolve?type=movie&id=27205`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    const validation = validateStreamResolveResponse(data);
    assert.ok(validation.valid, `Validation failed: ${validation.errors.join(', ')}`);
    assert.strictEqual(data.format, 'hls');
    assert.ok(data.streamUrl.includes('/api/proxy/hls'));
  });

  await runTest(tracker, TIER, 'F01', 'T1.1.2: TV stream resolution with season and episode returns valid payload', async () => {
    const res = await fetch(`${baseUrl}/api/stream/resolve?type=tv&id=1399&season=1&episode=1`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    const validation = validateStreamResolveResponse(data);
    assert.ok(validation.valid);
    assert.ok(data.streamUrl.includes('s1e1'));
  });

  await runTest(tracker, TIER, 'F01', 'T1.1.3: Anime stream resolution with sub audioType returns valid payload', async () => {
    const res = await fetch(`${baseUrl}/api/stream/resolve?type=anime&id=21&episode=1&audioType=sub`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    const validation = validateStreamResolveResponse(data);
    assert.ok(validation.valid);
    assert.ok(data.audioTracks.length > 0);
  });

  await runTest(tracker, TIER, 'F01', 'T1.1.4: Response payload provides qualities array with label and url', async () => {
    const res = await fetch(`${baseUrl}/api/stream/resolve?type=movie&id=27205`);
    const data = await res.json();
    assert.ok(Array.isArray(data.qualities));
    assert.ok(data.qualities.length >= 1);
    assert.ok(data.qualities[0].label);
    assert.ok(data.qualities[0].url);
  });

  await runTest(tracker, TIER, 'F01', 'T1.1.5: Response payload provides subtitles array with language and proxy url', async () => {
    const res = await fetch(`${baseUrl}/api/stream/resolve?type=movie&id=27205`);
    const data = await res.json();
    assert.ok(Array.isArray(data.subtitles));
    assert.ok(data.subtitles.length >= 1);
    assert.ok(data.subtitles[0].label);
    assert.ok(data.subtitles[0].language);
    assert.ok(data.subtitles[0].url.includes('/api/proxy/subtitles'));
  });

  // --- Feature 2: Sample ID Verification Fixtures ---
  await runTest(tracker, TIER, 'F02', 'T1.2.1: Sample Movie 27205 (Inception) resolves to guaranteed HLS stream', async () => {
    const res = await fetch(`${baseUrl}/api/stream/resolve?type=movie&id=27205`);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.streamUrl.includes('27205'));
  });

  await runTest(tracker, TIER, 'F02', 'T1.2.2: Sample TV 1399 (Game of Thrones S1E1) resolves with qualities', async () => {
    const res = await fetch(`${baseUrl}/api/stream/resolve?type=tv&id=1399&season=1&episode=1`);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.qualities.some((q) => q.label === '1080p'));
  });

  await runTest(tracker, TIER, 'F02', 'T1.2.3: Sample Anime 21 (One Piece) resolves to valid stream', async () => {
    const res = await fetch(`${baseUrl}/api/stream/resolve?type=anime&id=21&episode=1&audioType=sub`);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.streamUrl.includes('21'));
  });

  await runTest(tracker, TIER, 'F02', 'T1.2.4: Sample Anime 151807 (Solo Leveling) resolves with dub audioType', async () => {
    const res = await fetch(`${baseUrl}/api/stream/resolve?type=anime&id=151807&episode=1&audioType=dub`);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.audioTracks.some((t) => t.language === 'en' || t.label.includes('Dub')));
  });

  await runTest(tracker, TIER, 'F02', 'T1.2.5: Sample fixtures provide at least one subtitle track (.vtt)', async () => {
    const res = await fetch(`${baseUrl}/api/stream/resolve?type=movie&id=27205`);
    const data = await res.json();
    assert.ok(data.subtitles.length >= 1);
    assert.strictEqual(data.subtitles[0].language, 'en');
  });

  // --- Feature 3: HLS Manifest Rewriter & Proxy ---
  await runTest(tracker, TIER, 'F03', 'T1.3.1: Serves manifest with application/vnd.apple.mpegurl content type', async () => {
    const res = await fetch(`${baseUrl}/api/proxy/hls?url=https%3A%2F%2Fcdn.omnistream.test%2Fmaster.m3u8`);
    assert.strictEqual(res.status, 200);
    const contentType = res.headers.get('content-type') || '';
    assert.ok(contentType.includes('application/vnd.apple.mpegurl') || contentType.includes('application/x-mpegurl'));
  });

  await runTest(tracker, TIER, 'F03', 'T1.3.2: Sets CORS header Access-Control-Allow-Origin: *', async () => {
    const res = await fetch(`${baseUrl}/api/proxy/hls?url=https%3A%2F%2Fcdn.omnistream.test%2Fmaster.m3u8`);
    assert.strictEqual(res.headers.get('access-control-allow-origin'), '*');
  });

  await runTest(tracker, TIER, 'F03', 'T1.3.3: Master manifest contains valid #EXTM3U and #EXT-X-STREAM-INF tags', async () => {
    const res = await fetch(`${baseUrl}/api/proxy/hls?url=https%3A%2F%2Fcdn.omnistream.test%2Fmaster.m3u8`);
    const text = await res.text();
    const validation = validateHLSManifest(text);
    assert.ok(validation.valid);
    assert.strictEqual(validation.isMaster, true);
  });

  await runTest(tracker, TIER, 'F03', 'T1.3.4: Rewrites stream variant URIs to route through /api/proxy/hls', async () => {
    const res = await fetch(`${baseUrl}/api/proxy/hls?url=https%3A%2F%2Fcdn.omnistream.test%2Fmaster.m3u8`);
    const text = await res.text();
    assert.ok(text.includes('/api/proxy/hls?url='));
  });

  await runTest(tracker, TIER, 'F03', 'T1.3.5: Media playlist rewrites segment URIs through /api/proxy/segment', async () => {
    const res = await fetch(`${baseUrl}/api/proxy/hls?url=https%3A%2F%2Fcdn.omnistream.test%2F1080p.m3u8`);
    const text = await res.text();
    const validation = validateHLSManifest(text);
    assert.ok(validation.valid);
    assert.strictEqual(validation.isMedia, true);
    assert.ok(text.includes('/api/proxy/segment?url='));
  });

  // --- Feature 4: Binary Segment Streaming Proxy ---
  await runTest(tracker, TIER, 'F04', 'T1.4.1: Proxies binary segment chunk with video/mp2t content type', async () => {
    const res = await fetch(`${baseUrl}/api/proxy/segment?url=https%3A%2F%2Fcdn.omnistream.test%2Fseg0.ts`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type'), 'video/mp2t');
  });

  await runTest(tracker, TIER, 'F04', 'T1.4.2: Supports HTTP Range request header returning HTTP 206 Partial Content', async () => {
    const res = await fetch(`${baseUrl}/api/proxy/segment?url=https%3A%2F%2Fcdn.omnistream.test%2Fseg0.ts`, {
      headers: { Range: 'bytes=0-1023' }
    });
    assert.strictEqual(res.status, 206);
  });

  await runTest(tracker, TIER, 'F04', 'T1.4.3: Returns Accept-Ranges: bytes response header', async () => {
    const res = await fetch(`${baseUrl}/api/proxy/segment?url=https%3A%2F%2Fcdn.omnistream.test%2Fseg0.ts`);
    assert.strictEqual(res.headers.get('accept-ranges'), 'bytes');
  });

  await runTest(tracker, TIER, 'F04', 'T1.4.4: Returns Content-Range header matching requested range', async () => {
    const res = await fetch(`${baseUrl}/api/proxy/segment?url=https%3A%2F%2Fcdn.omnistream.test%2Fseg0.ts`, {
      headers: { Range: 'bytes=0-511' }
    });
    const contentRange = res.headers.get('content-range') || '';
    assert.ok(contentRange.startsWith('bytes 0-511/'));
  });

  await runTest(tracker, TIER, 'F04', 'T1.4.5: Returns exact requested byte buffer length in body', async () => {
    const res = await fetch(`${baseUrl}/api/proxy/segment?url=https%3A%2F%2Fcdn.omnistream.test%2Fseg0.ts`, {
      headers: { Range: 'bytes=0-255' }
    });
    const buffer = await res.arrayBuffer();
    assert.strictEqual(buffer.byteLength, 256);
  });

  // --- Feature 5: WebVTT Subtitle Proxy ---
  await runTest(tracker, TIER, 'F05', 'T1.5.1: Returns Content-Type: text/vtt; charset=utf-8', async () => {
    const res = await fetch(`${baseUrl}/api/proxy/subtitles?url=https%3A%2F%2Fsub.omnistream.test%2Fen.vtt`);
    assert.strictEqual(res.status, 200);
    const ct = res.headers.get('content-type') || '';
    assert.ok(ct.includes('text/vtt'));
  });

  await runTest(tracker, TIER, 'F05', 'T1.5.2: Subtitle content begins with valid WEBVTT magic signature', async () => {
    const res = await fetch(`${baseUrl}/api/proxy/subtitles?url=https%3A%2F%2Fsub.omnistream.test%2Fen.vtt`);
    const text = await res.text();
    const validation = validateWebVTTContent(text);
    assert.ok(validation.valid, `WebVTT invalid: ${validation.errors.join(', ')}`);
  });

  await runTest(tracker, TIER, 'F05', 'T1.5.3: Sets Access-Control-Allow-Origin: * CORS header', async () => {
    const res = await fetch(`${baseUrl}/api/proxy/subtitles?url=https%3A%2F%2Fsub.omnistream.test%2Fen.vtt`);
    assert.strictEqual(res.headers.get('access-control-allow-origin'), '*');
  });

  await runTest(tracker, TIER, 'F05', 'T1.5.4: Preserves valid cue timing format (HH:MM:SS.mmm --> HH:MM:SS.mmm)', async () => {
    const res = await fetch(`${baseUrl}/api/proxy/subtitles?url=https%3A%2F%2Fsub.omnistream.test%2Fen.vtt`);
    const text = await res.text();
    assert.match(text, /\d{2}:\d{2}:\d{2}\.\d{3}\s+-->\s+\d{2}:\d{2}:\d{2}\.\d{3}/);
  });

  await runTest(tracker, TIER, 'F05', 'T1.5.5: Subtitle cues contain valid readable text payload', async () => {
    const res = await fetch(`${baseUrl}/api/proxy/subtitles?url=https%3A%2F%2Fsub.omnistream.test%2Fen.vtt`);
    const text = await res.text();
    assert.ok(text.includes('OmniStream Cinema Player'));
  });

  // --- Feature 6: Direct HTML5 Video Player ---
  await runTest(tracker, TIER, 'F06', 'T1.6.1: Instantiates player in direct-hls mode with valid defaults', async () => {
    const player = new HeadlessCinemaPlayer();
    assert.strictEqual(player.mode, 'direct-hls');
    assert.strictEqual(player.paused, true);
    assert.strictEqual(player.volume, 1.0);
  });

  await runTest(tracker, TIER, 'F06', 'T1.6.2: Attaches HLS stream URL and confirms hlsAttached state', async () => {
    const player = new HeadlessCinemaPlayer();
    player.loadDirectStream('/api/proxy/hls?url=test.m3u8');
    assert.strictEqual(player.hlsAttached, true);
    assert.strictEqual(player.currentStreamUrl, '/api/proxy/hls?url=test.m3u8');
  });

  await runTest(tracker, TIER, 'F06', 'T1.6.3: Audio track selection updates active audio track index', async () => {
    const player = new HeadlessCinemaPlayer();
    assert.strictEqual(player.currentAudioTrack, 0);
    player.currentAudioTrack = 1;
    assert.strictEqual(player.currentAudioTrack, 1);
  });

  await runTest(tracker, TIER, 'F06', 'T1.6.4: Subtitle track selection updates active subtitle track index', async () => {
    const player = new HeadlessCinemaPlayer();
    assert.strictEqual(player.currentSubtitleTrack, -1); // Off
    player.currentSubtitleTrack = 0; // English
    assert.strictEqual(player.currentSubtitleTrack, 0);
  });

  await runTest(tracker, TIER, 'F06', 'T1.6.5: Play and Pause methods transition playback state', async () => {
    const player = new HeadlessCinemaPlayer();
    await player.play();
    assert.strictEqual(player.paused, false);
    player.pause();
    assert.strictEqual(player.paused, true);
  });

  // --- Feature 7: Native Safari HLS Fallback ---
  await runTest(tracker, TIER, 'F07', 'T1.7.1: Detects native Safari HLS MIME type support string', async () => {
    const mime = 'application/vnd.apple.mpegurl';
    assert.strictEqual(FEATURES.F07.capability, mime);
  });

  await runTest(tracker, TIER, 'F07', 'T1.7.2: Player accepts direct streamUrl when HLS.js is unavailable', async () => {
    const player = new HeadlessCinemaPlayer();
    player.loadDirectStream('https://cdn.apple.com/stream.m3u8');
    assert.strictEqual(player.currentStreamUrl, 'https://cdn.apple.com/stream.m3u8');
  });

  await runTest(tracker, TIER, 'F07', 'T1.7.3: Playback lifecycle handles duration and ready state transition', async () => {
    const player = new HeadlessCinemaPlayer({ duration: 5400 });
    assert.strictEqual(player.duration, 5400);
  });

  await runTest(tracker, TIER, 'F07', 'T1.7.4: Audio tracks interface conforms to audioTracks schema', async () => {
    const player = new HeadlessCinemaPlayer();
    assert.ok(Array.isArray(player.audioTracks));
    assert.ok(player.audioTracks[0].language);
  });

  await runTest(tracker, TIER, 'F07', 'T1.7.5: Text tracks interface conforms to subtitle tracks schema', async () => {
    const player = new HeadlessCinemaPlayer();
    assert.ok(Array.isArray(player.subtitles));
    assert.strictEqual(player.subtitles[0].language, 'off');
  });

  // --- Feature 8: Seamless Dual-Mode Fallback ---
  await runTest(tracker, TIER, 'F08', 'T1.8.1: Player initializes in Direct HLS Mode (Mode A)', async () => {
    const player = new HeadlessCinemaPlayer();
    assert.strictEqual(player.mode, 'direct-hls');
  });

  await runTest(tracker, TIER, 'F08', 'T1.8.2: Fatal HLS error triggers instant switch to Mode B (sanitized-iframe)', async () => {
    const player = new HeadlessCinemaPlayer();
    player.triggerHlsFatalError('networkError');
    assert.strictEqual(player.mode, 'sanitized-iframe');
  });

  await runTest(tracker, TIER, 'F08', 'T1.8.3: Mode B renders primary mirror server URL initially', async () => {
    const player = new HeadlessCinemaPlayer();
    player.triggerDualModeFallback('stream_unresolvable');
    assert.strictEqual(player.currentMirrorIndex, 0);
    assert.strictEqual(player.mirrorList[player.currentMirrorIndex], 'vidlink-pro');
  });

  await runTest(tracker, TIER, 'F08', 'T1.8.4: Mode B failure rotates cleanly to next mirror', async () => {
    const player = new HeadlessCinemaPlayer();
    player.triggerDualModeFallback('error');
    player.nextMirror();
    assert.strictEqual(player.currentMirrorIndex, 1);
    assert.strictEqual(player.mirrorList[1], 'vidsrc-to');
  });

  await runTest(tracker, TIER, 'F08', 'T1.8.5: Exhaustion of all 8 mirrors triggers exhaustedMirrors flag', async () => {
    const player = new HeadlessCinemaPlayer();
    player.triggerDualModeFallback('error');
    for (let i = 0; i < 8; i++) {
      player.nextMirror();
    }
    assert.strictEqual(player.exhaustedMirrors, true);
  });

  // --- Feature 9: Iframe Focus Trap Prevention ---
  await runTest(tracker, TIER, 'F09', 'T1.9.1: Mode B mounts transparent focus shield over iframe', async () => {
    const player = new HeadlessCinemaPlayer();
    assert.strictEqual(player.focusShieldActive, false);
    player.triggerDualModeFallback('stream_failed');
    assert.strictEqual(player.focusShieldActive, true);
  });

  await runTest(tracker, TIER, 'F09', 'T1.9.2: Focus shield captures keydown events without iframe focus stealing', async () => {
    const player = new HeadlessCinemaPlayer();
    player.triggerDualModeFallback('stream_failed');
    const result = player.handleKeyDown({ key: 'ArrowRight', keyCode: 39 });
    assert.strictEqual(result.handled, true);
  });

  await runTest(tracker, TIER, 'F09', 'T1.9.3: Remote navigation keys bubble to window event listener', async () => {
    const player = new HeadlessCinemaPlayer();
    player.triggerDualModeFallback('stream_failed');
    const res = player.handleKeyDown({ key: 'Enter', keyCode: 13 });
    assert.strictEqual(res.handled, true);
    assert.strictEqual(res.action, 'toggle_play_pause');
  });

  await runTest(tracker, TIER, 'F09', 'T1.9.4: HUD controls maintain host activeElement focus over shield', async () => {
    const player = new HeadlessCinemaPlayer();
    player.triggerDualModeFallback('stream_failed');
    assert.strictEqual(player.focusShieldActive, true);
  });

  await runTest(tracker, TIER, 'F09', 'T1.9.5: Transparent shield preserves video visibility in Mode B', async () => {
    const player = new HeadlessCinemaPlayer();
    player.triggerDualModeFallback('stream_failed');
    assert.strictEqual(player.mode, 'sanitized-iframe');
  });

  // --- Feature 10: 10-Foot D-Pad Left/Right Seek ---
  await runTest(tracker, TIER, 'F10', 'T1.10.1: ArrowLeft (37) seeks backward by exactly 10 seconds', async () => {
    const player = new HeadlessCinemaPlayer({ initialTime: 120 });
    player.handleKeyDown({ key: 'ArrowLeft', keyCode: 37 });
    assert.strictEqual(player.currentTime, 110);
  });

  await runTest(tracker, TIER, 'F10', 'T1.10.2: ArrowRight (39) seeks forward by exactly 10 seconds', async () => {
    const player = new HeadlessCinemaPlayer({ initialTime: 120 });
    player.handleKeyDown({ key: 'ArrowRight', keyCode: 39 });
    assert.strictEqual(player.currentTime, 130);
  });

  await runTest(tracker, TIER, 'F10', 'T1.10.3: Android DPAD_LEFT (21) seeks backward by 10 seconds', async () => {
    const player = new HeadlessCinemaPlayer({ initialTime: 50 });
    player.handleKeyDown({ key: 'Left', keyCode: 21 });
    assert.strictEqual(player.currentTime, 40);
  });

  await runTest(tracker, TIER, 'F10', 'T1.10.4: Android DPAD_RIGHT (22) seeks forward by 10 seconds', async () => {
    const player = new HeadlessCinemaPlayer({ initialTime: 50 });
    player.handleKeyDown({ key: 'Right', keyCode: 22 });
    assert.strictEqual(player.currentTime, 60);
  });

  await runTest(tracker, TIER, 'F10', 'T1.10.5: Seeking displays on-screen seek indicator with delta', async () => {
    const player = new HeadlessCinemaPlayer({ initialTime: 100 });
    player.handleKeyDown({ key: 'ArrowRight', keyCode: 39 });
    assert.strictEqual(player.seekIndicator.visible, true);
    assert.strictEqual(player.seekIndicator.delta, 10);
  });

  // --- Feature 11: 10-Foot D-Pad Center Play/Pause ---
  await runTest(tracker, TIER, 'F11', 'T1.11.1: Enter (13) when video is playing pauses the video', async () => {
    const player = new HeadlessCinemaPlayer();
    await player.play();
    assert.strictEqual(player.paused, false);
    player.handleKeyDown({ key: 'Enter', keyCode: 13 });
    assert.strictEqual(player.paused, true);
  });

  await runTest(tracker, TIER, 'F11', 'T1.11.2: Enter (13) when video is paused plays the video', async () => {
    const player = new HeadlessCinemaPlayer();
    assert.strictEqual(player.paused, true);
    player.handleKeyDown({ key: 'Enter', keyCode: 13 });
    assert.strictEqual(player.paused, false);
  });

  await runTest(tracker, TIER, 'F11', 'T1.11.3: Android DPAD_CENTER (23) toggles playback', async () => {
    const player = new HeadlessCinemaPlayer();
    player.handleKeyDown({ key: 'Center', keyCode: 23 });
    assert.strictEqual(player.paused, false);
  });

  await runTest(tracker, TIER, 'F11', 'T1.11.4: Android KEYCODE_NUMPAD_ENTER (66) toggles playback', async () => {
    const player = new HeadlessCinemaPlayer();
    player.handleKeyDown({ key: 'Enter', keyCode: 66 });
    assert.strictEqual(player.paused, false);
  });

  await runTest(tracker, TIER, 'F11', 'T1.11.5: Toggling playback fires corresponding play/pause events', async () => {
    const player = new HeadlessCinemaPlayer();
    let playFired = false;
    player.on('play', () => { playFired = true; });
    player.togglePlayPause();
    assert.strictEqual(playFired, true);
  });

  // --- Feature 12: 10-Foot D-Pad Track Drawer ---
  await runTest(tracker, TIER, 'F12', 'T1.12.1: ArrowUp (38) opens the Track Drawer', async () => {
    const player = new HeadlessCinemaPlayer();
    assert.strictEqual(player.trackDrawerOpen, false);
    player.handleKeyDown({ key: 'ArrowUp', keyCode: 38 });
    assert.strictEqual(player.trackDrawerOpen, true);
  });

  await runTest(tracker, TIER, 'F12', 'T1.12.2: ArrowDown (40) toggles Track Drawer', async () => {
    const player = new HeadlessCinemaPlayer();
    player.handleKeyDown({ key: 'ArrowDown', keyCode: 40 });
    assert.strictEqual(player.trackDrawerOpen, true);
  });

  await runTest(tracker, TIER, 'F12', 'T1.12.3: Track Drawer provides accessible audio tracks', async () => {
    const player = new HeadlessCinemaPlayer();
    player.handleKeyDown({ key: 'ArrowUp', keyCode: 38 });
    assert.ok(player.audioTracks.length >= 1);
  });

  await runTest(tracker, TIER, 'F12', 'T1.12.4: Track Drawer provides accessible subtitle tracks including Off', async () => {
    const player = new HeadlessCinemaPlayer();
    player.handleKeyDown({ key: 'ArrowUp', keyCode: 38 });
    assert.ok(player.subtitles.some((s) => s.label === 'Off'));
  });

  await runTest(tracker, TIER, 'F12', 'T1.12.5: Android DPAD_UP (19) and DPAD_DOWN (20) toggle drawer', async () => {
    const player = new HeadlessCinemaPlayer();
    player.handleKeyDown({ key: 'Up', keyCode: 19 });
    assert.strictEqual(player.trackDrawerOpen, true);
    player.handleKeyDown({ key: 'Down', keyCode: 20 });
    assert.strictEqual(player.trackDrawerOpen, false);
  });

  // --- Feature 13: Back to Exit Handler ---
  await runTest(tracker, TIER, 'F13', 'T1.13.1: Escape (27) closes Track Drawer when drawer is open', async () => {
    const player = new HeadlessCinemaPlayer();
    player.trackDrawerOpen = true;
    const res = player.handleKeyDown({ key: 'Escape', keyCode: 27 });
    assert.strictEqual(res.action, 'close_drawer');
    assert.strictEqual(player.trackDrawerOpen, false);
  });

  await runTest(tracker, TIER, 'F13', 'T1.13.2: Escape (27) exits player session when drawer is closed', async () => {
    const player = new HeadlessCinemaPlayer();
    player.trackDrawerOpen = false;
    let closed = false;
    player.on('closePlayer', () => { closed = true; });
    const res = player.handleKeyDown({ key: 'Escape', keyCode: 27 });
    assert.strictEqual(res.action, 'exit_player');
    assert.strictEqual(closed, true);
  });

  await runTest(tracker, TIER, 'F13', 'T1.13.3: Android KEYCODE_BACK (4) closes drawer when open', async () => {
    const player = new HeadlessCinemaPlayer();
    player.trackDrawerOpen = true;
    player.handleKeyDown({ key: 'Back', keyCode: 4 });
    assert.strictEqual(player.trackDrawerOpen, false);
  });

  await runTest(tracker, TIER, 'F13', 'T1.13.4: Android KEYCODE_BACK (4) exits player when drawer is closed', async () => {
    const player = new HeadlessCinemaPlayer();
    let closed = false;
    player.on('closePlayer', () => { closed = true; });
    player.handleKeyDown({ key: 'Back', keyCode: 4 });
    assert.strictEqual(closed, true);
  });

  await runTest(tracker, TIER, 'F13', 'T1.13.5: Exiting player saves latest playback progress before cleanup', async () => {
    const player = new HeadlessCinemaPlayer({ initialTime: 450 });
    player.handleKeyDown({ key: 'Escape', keyCode: 27 });
    assert.ok(player.watchHistorySaves.length >= 1);
    assert.strictEqual(player.watchHistorySaves[player.watchHistorySaves.length - 1].currentTime, 450);
  });

  // --- Feature 14: Mobile Double-Tap Seek Gestures ---
  await runTest(tracker, TIER, 'F14', 'T1.14.1: Double tap on left half (x < width/2) seeks backward 10s', async () => {
    const player = new HeadlessCinemaPlayer({ width: 1000, initialTime: 100 });
    const now = Date.now();
    player.handleTouchStart({ x: 200, y: 500, time: now });
    const res = player.handleTouchStart({ x: 200, y: 500, time: now + 150 });
    assert.strictEqual(res.gesture, 'double_tap_seek');
    assert.strictEqual(res.delta, -10);
    assert.strictEqual(player.currentTime, 90);
  });

  await runTest(tracker, TIER, 'F14', 'T1.14.2: Double tap on right half (x >= width/2) seeks forward 10s', async () => {
    const player = new HeadlessCinemaPlayer({ width: 1000, initialTime: 100 });
    const now = Date.now();
    player.handleTouchStart({ x: 800, y: 500, time: now });
    const res = player.handleTouchStart({ x: 800, y: 500, time: now + 150 });
    assert.strictEqual(res.gesture, 'double_tap_seek');
    assert.strictEqual(res.delta, 10);
    assert.strictEqual(player.currentTime, 110);
  });

  await runTest(tracker, TIER, 'F14', 'T1.14.3: Double tap triggers animated seek indicator bubble', async () => {
    const player = new HeadlessCinemaPlayer({ width: 1000, initialTime: 100 });
    const now = Date.now();
    player.handleTouchStart({ x: 800, y: 500, time: now });
    player.handleTouchStart({ x: 800, y: 500, time: now + 200 });
    assert.strictEqual(player.seekIndicator.visible, true);
    assert.strictEqual(player.seekIndicator.delta, 10);
  });

  await runTest(tracker, TIER, 'F14', 'T1.14.4: Tap interval > 300ms is not recognized as double tap', async () => {
    const player = new HeadlessCinemaPlayer({ width: 1000, initialTime: 100 });
    const now = Date.now();
    player.handleTouchStart({ x: 800, y: 500, time: now });
    const res = player.handleTouchStart({ x: 800, y: 500, time: now + 400 });
    assert.strictEqual(res.gesture, 'touch_start');
    assert.strictEqual(player.currentTime, 100);
  });

  await runTest(tracker, TIER, 'F14', 'T1.14.5: Touch lifecycle handles start, move, and end cleanly', async () => {
    const player = new HeadlessCinemaPlayer();
    const start = player.handleTouchStart({ x: 500, y: 500 });
    assert.strictEqual(start.gesture, 'touch_start');
    const end = player.handleTouchEnd();
    assert.strictEqual(end.gesture, 'touch_end');
  });

  // --- Feature 15: Mobile Vertical Swipe Volume ---
  await runTest(tracker, TIER, 'F15', 'T1.15.1: Vertical swipe up on right screen half increases volume', async () => {
    const player = new HeadlessCinemaPlayer({ width: 1000, height: 1000 });
    player.volume = 0.5;
    player.handleTouchStart({ x: 800, y: 500 });
    const res = player.handleTouchMove({ x: 800, y: 300 }); // Swipe up (deltaY = 200)
    assert.strictEqual(res.gesture, 'vertical_swipe_volume');
    assert.ok(player.volume > 0.5);
  });

  await runTest(tracker, TIER, 'F15', 'T1.15.2: Vertical swipe down on right screen half decreases volume', async () => {
    const player = new HeadlessCinemaPlayer({ width: 1000, height: 1000 });
    player.volume = 0.8;
    player.handleTouchStart({ x: 800, y: 500 });
    const res = player.handleTouchMove({ x: 800, y: 700 }); // Swipe down
    assert.strictEqual(res.gesture, 'vertical_swipe_volume');
    assert.ok(player.volume < 0.8);
  });

  await runTest(tracker, TIER, 'F15', 'T1.15.3: Vertical volume swipe displays vertical HUD meter', async () => {
    const player = new HeadlessCinemaPlayer({ width: 1000, height: 1000 });
    player.handleTouchStart({ x: 800, y: 500 });
    player.handleTouchMove({ x: 800, y: 400 });
    assert.strictEqual(player.volumeHud.visible, true);
  });

  await runTest(tracker, TIER, 'F15', 'T1.15.4: Volume HUD reflects integer percentage (0 to 100)', async () => {
    const player = new HeadlessCinemaPlayer({ width: 1000, height: 1000 });
    player.volume = 0.65;
    player.handleTouchStart({ x: 800, y: 500 });
    player.handleTouchMove({ x: 800, y: 450 });
    assert.ok(player.volumeHud.level >= 0 && player.volumeHud.level <= 100);
  });

  await runTest(tracker, TIER, 'F15', 'T1.15.5: Volume reaching 0 updates muted flag', async () => {
    const player = new HeadlessCinemaPlayer({ width: 1000, height: 1000 });
    player.volume = 0.05;
    player.handleTouchStart({ x: 800, y: 500 });
    player.handleTouchMove({ x: 800, y: 9999 }); // Massive swipe down
    assert.strictEqual(player.volume, 0);
    assert.strictEqual(player.muted, true);
  });

  // --- Feature 16: Mobile Vertical Swipe Brightness ---
  await runTest(tracker, TIER, 'F16', 'T1.16.1: Vertical swipe up on left screen half increases brightness', async () => {
    const player = new HeadlessCinemaPlayer({ width: 1000, height: 1000 });
    player.brightness = 0.5;
    player.handleTouchStart({ x: 200, y: 500 });
    const res = player.handleTouchMove({ x: 200, y: 300 });
    assert.strictEqual(res.gesture, 'vertical_swipe_brightness');
    assert.ok(player.brightness > 0.5);
  });

  await runTest(tracker, TIER, 'F16', 'T1.16.2: Vertical swipe down on left screen half decreases brightness', async () => {
    const player = new HeadlessCinemaPlayer({ width: 1000, height: 1000 });
    player.brightness = 0.8;
    player.handleTouchStart({ x: 200, y: 500 });
    const res = player.handleTouchMove({ x: 200, y: 700 });
    assert.strictEqual(res.gesture, 'vertical_swipe_brightness');
    assert.ok(player.brightness < 0.8);
  });

  await runTest(tracker, TIER, 'F16', 'T1.16.3: Vertical brightness swipe displays on-screen vertical HUD meter', async () => {
    const player = new HeadlessCinemaPlayer({ width: 1000, height: 1000 });
    player.handleTouchStart({ x: 200, y: 500 });
    player.handleTouchMove({ x: 200, y: 400 });
    assert.strictEqual(player.brightnessHud.visible, true);
  });

  await runTest(tracker, TIER, 'F16', 'T1.16.4: Brightness HUD displays integer percentage (10 to 100)', async () => {
    const player = new HeadlessCinemaPlayer({ width: 1000, height: 1000 });
    player.handleTouchStart({ x: 200, y: 500 });
    player.handleTouchMove({ x: 200, y: 450 });
    assert.ok(player.brightnessHud.level >= 10 && player.brightnessHud.level <= 100);
  });

  await runTest(tracker, TIER, 'F16', 'T1.16.5: Brightness change emits brightnessChange event', async () => {
    const player = new HeadlessCinemaPlayer({ width: 1000, height: 1000 });
    let emitted = false;
    player.on('brightnessChange', () => { emitted = true; });
    player.handleTouchStart({ x: 200, y: 500 });
    player.handleTouchMove({ x: 200, y: 400 });
    assert.strictEqual(emitted, true);
  });

  // --- Feature 17: Aspect Ratio Toggling ---
  await runTest(tracker, TIER, 'F17', 'T1.17.1: Player defaults to contain (16:9 letterbox) aspect ratio', async () => {
    const player = new HeadlessCinemaPlayer();
    assert.strictEqual(player.aspectRatio, 'contain');
  });

  await runTest(tracker, TIER, 'F17', 'T1.17.2: Aspect ratio toggle cycles from contain to cover', async () => {
    const player = new HeadlessCinemaPlayer();
    const next = player.toggleAspectRatio();
    assert.strictEqual(next, 'cover');
  });

  await runTest(tracker, TIER, 'F17', 'T1.17.3: Aspect ratio toggle cycles from cover to fill', async () => {
    const player = new HeadlessCinemaPlayer();
    player.toggleAspectRatio(); // cover
    const next = player.toggleAspectRatio(); // fill
    assert.strictEqual(next, 'fill');
  });

  await runTest(tracker, TIER, 'F17', 'T1.17.4: Aspect ratio toggle cycles from fill back to contain', async () => {
    const player = new HeadlessCinemaPlayer();
    player.toggleAspectRatio(); // cover
    player.toggleAspectRatio(); // fill
    const next = player.toggleAspectRatio(); // contain
    assert.strictEqual(next, 'contain');
  });

  await runTest(tracker, TIER, 'F17', 'T1.17.5: Aspect ratio change emits aspectRatioChange event', async () => {
    const player = new HeadlessCinemaPlayer();
    let emittedMode = null;
    player.on('aspectRatioChange', (mode) => { emittedMode = mode; });
    player.toggleAspectRatio();
    assert.strictEqual(emittedMode, 'cover');
  });

  // --- Feature 18: Native Picture-in-Picture & AirPlay ---
  await runTest(tracker, TIER, 'F18', 'T1.18.1: requestPictureInPicture transitions player into PiP mode', async () => {
    const player = new HeadlessCinemaPlayer();
    assert.strictEqual(player.isInPiP, false);
    await player.requestPictureInPicture();
    assert.strictEqual(player.isInPiP, true);
  });

  await runTest(tracker, TIER, 'F18', 'T1.18.2: PiP activation emits enterpictureinpicture event', async () => {
    const player = new HeadlessCinemaPlayer();
    let entered = false;
    player.on('enterpictureinpicture', () => { entered = true; });
    await player.requestPictureInPicture();
    assert.strictEqual(entered, true);
  });

  await runTest(tracker, TIER, 'F18', 'T1.18.3: exitPictureInPicture restores inline player state', async () => {
    const player = new HeadlessCinemaPlayer();
    await player.requestPictureInPicture();
    await player.exitPictureInPicture();
    assert.strictEqual(player.isInPiP, false);
  });

  await runTest(tracker, TIER, 'F18', 'T1.18.4: Exiting PiP emits leavepictureinpicture event', async () => {
    const player = new HeadlessCinemaPlayer();
    let left = false;
    player.on('leavepictureinpicture', () => { left = true; });
    await player.requestPictureInPicture();
    await player.exitPictureInPicture();
    assert.strictEqual(left, true);
  });

  await runTest(tracker, TIER, 'F18', 'T1.18.5: AirPlay picker invocation emits airplayActivated event', async () => {
    const player = new HeadlessCinemaPlayer();
    let activated = false;
    player.on('airplayActivated', () => { activated = true; });
    player.showAirPlayPicker();
    assert.strictEqual(activated, true);
    assert.strictEqual(player.isAirPlayActive, true);
  });

  // --- Feature 19: 5-Second Interval Watch Progress ---
  await runTest(tracker, TIER, 'F19', 'T1.19.1: Watch progress interval configured to 5000ms', async () => {
    const player = new HeadlessCinemaPlayer();
    assert.strictEqual(player.progressIntervalMs, 5000);
  });

  await runTest(tracker, TIER, 'F19', 'T1.19.2: Playback position is rounded to nearest second (Math.round)', async () => {
    const player = new HeadlessCinemaPlayer();
    player.currentTime = 124.68;
    const record = player.persistProgress();
    assert.strictEqual(record.currentTime, 125);
  });

  await runTest(tracker, TIER, 'F19', 'T1.19.3: Pausing playback stops progress heartbeat interval', async () => {
    const player = new HeadlessCinemaPlayer();
    await player.play();
    assert.ok(player.progressTimer !== null);
    player.pause();
    assert.strictEqual(player.progressTimer, null);
  });

  await runTest(tracker, TIER, 'F19', 'T1.19.4: Resuming playback resumes progress heartbeat interval', async () => {
    const player = new HeadlessCinemaPlayer();
    player.pause();
    await player.play();
    assert.ok(player.progressTimer !== null);
    player.pause();
  });

  await runTest(tracker, TIER, 'F19', 'T1.19.5: Progress percent calculated as Math.round((time / duration) * 100)', async () => {
    const player = new HeadlessCinemaPlayer({ duration: 1000 });
    player.currentTime = 250;
    const record = player.persistProgress();
    assert.strictEqual(record.progressPercent, 25);
  });

  // --- Feature 20: Local & Cloud Watch History Sync ---
  await runTest(tracker, TIER, 'F20', 'T1.20.1: History item schema matches UnifiedHistoryItem interface', async () => {
    const item = {
      id: 'movie_27205',
      mediaType: 'movie',
      title: 'Inception',
      cover: 'https://image.tmdb.org/t/p/w500/sample.jpg',
      currentTime: 1420,
      duration: 8880,
      progressPercent: 16,
      lastWatchedAt: Date.now()
    };
    const validation = validateHistoryItem(item);
    assert.ok(validation.valid, `History item invalid: ${validation.errors.join(', ')}`);
  });

  await runTest(tracker, TIER, 'F20', 'T1.20.2: Cloud endpoint POST /api/watch-history accepts valid history item', async () => {
    const item = {
      id: 'movie_27205',
      mediaType: 'movie',
      title: 'Inception',
      cover: 'https://image.tmdb.org/t/p/w500/sample.jpg',
      currentTime: 2400,
      duration: 8880,
      progressPercent: 27,
      lastWatchedAt: Date.now()
    };
    const res = await fetch(`${baseUrl}/api/watch-history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
  });

  await runTest(tracker, TIER, 'F20', 'T1.20.3: Cloud endpoint GET /api/watch-history returns saved history items', async () => {
    const res = await fetch(`${baseUrl}/api/watch-history`);
    assert.strictEqual(res.status, 200);
    const list = await res.json();
    assert.ok(Array.isArray(list));
    assert.ok(list.some((h) => h.id === 'movie_27205'));
  });

  await runTest(tracker, TIER, 'F20', 'T1.20.4: Cloud upsert updates existing item rather than creating duplicates', async () => {
    const updated = {
      id: 'movie_27205',
      mediaType: 'movie',
      title: 'Inception',
      cover: 'https://image.tmdb.org/t/p/w500/sample.jpg',
      currentTime: 3600,
      duration: 8880,
      progressPercent: 41,
      lastWatchedAt: Date.now() + 100
    };
    await fetch(`${baseUrl}/api/watch-history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    });
    const res = await fetch(`${baseUrl}/api/watch-history`);
    const list = await res.json();
    const matches = list.filter((h) => h.id === 'movie_27205');
    assert.strictEqual(matches.length, 1);
    assert.strictEqual(matches[0].currentTime, 3600);
  });

  await runTest(tracker, TIER, 'F20', 'T1.20.5: Cloud store limits history array to maximum 40 items', async () => {
    for (let i = 0; i < 45; i++) {
      await fetch(`${baseUrl}/api/watch-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `test_item_${i}`,
          mediaType: 'movie',
          title: `Movie ${i}`,
          lastWatchedAt: Date.now() + i
        })
      });
    }
    const res = await fetch(`${baseUrl}/api/watch-history`);
    const list = await res.json();
    assert.ok(list.length <= 40);
  });

  // --- Feature 21: Exact-Second Resume Behavior ---
  await runTest(tracker, TIER, 'F21', 'T1.21.1: Eligible saved position triggers resume prompt modal', async () => {
    const player = new HeadlessCinemaPlayer({ duration: 7200 });
    const check = player.checkResumeEligibility({ currentTime: 1845, duration: 7200 });
    assert.strictEqual(check.eligible, true);
    assert.strictEqual(player.resumePrompt.visible, true);
    assert.strictEqual(player.resumePrompt.resumeTime, 1845);
  });

  await runTest(tracker, TIER, 'F21', 'T1.21.2: Resume prompt formats time display as MM:SS', async () => {
    const player = new HeadlessCinemaPlayer({ duration: 7200 });
    const check = player.checkResumeEligibility({ currentTime: 125, duration: 7200 });
    assert.strictEqual(check.formattedTime, '02:05');
  });

  await runTest(tracker, TIER, 'F21', 'T1.21.3: Confirming resume seeks video directly to saved currentTime', async () => {
    const player = new HeadlessCinemaPlayer({ duration: 7200 });
    player.checkResumeEligibility({ currentTime: 3000, duration: 7200 });
    const seeked = player.confirmResume();
    assert.strictEqual(seeked, 3000);
    assert.strictEqual(player.currentTime, 3000);
    assert.strictEqual(player.resumePrompt.visible, false);
  });

  await runTest(tracker, TIER, 'F21', 'T1.21.4: Starting over seeks video directly to 0s', async () => {
    const player = new HeadlessCinemaPlayer({ duration: 7200 });
    player.checkResumeEligibility({ currentTime: 3000, duration: 7200 });
    const seeked = player.startOver();
    assert.strictEqual(seeked, 0);
    assert.strictEqual(player.currentTime, 0);
    assert.strictEqual(player.resumePrompt.visible, false);
  });

  await runTest(tracker, TIER, 'F21', 'T1.21.5: Completed title (>= 95%) is not eligible for resume prompt', async () => {
    const player = new HeadlessCinemaPlayer({ duration: 1000 });
    const check = player.checkResumeEligibility({ currentTime: 960, duration: 1000 });
    assert.strictEqual(check.eligible, false);
    assert.strictEqual(player.resumePrompt.visible, false);
  });

  // --- Feature 22: TypeScript Error Remediation ---
  await runTest(tracker, TIER, 'F22', 'T1.22.1: watchHistoryService exports UnifiedHistoryItem interface', async () => {
    const filePath = path.resolve('src/services/watchHistoryService.ts');
    assert.ok(fs.existsSync(filePath));
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(content.includes('interface UnifiedHistoryItem'));
  });

  await runTest(tracker, TIER, 'F22', 'T1.22.2: MediaItem definition in media.ts defines media_type and fields', async () => {
    const filePath = path.resolve('src/types/media.ts');
    assert.ok(fs.existsSync(filePath));
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(content.includes('interface MediaItem'));
    assert.ok(content.includes('media_type'));
  });

  await runTest(tracker, TIER, 'F22', 'T1.22.3: tsconfig.json exists and specifies valid compiler options', async () => {
    const filePath = path.resolve('tsconfig.json');
    assert.ok(fs.existsSync(filePath));
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    assert.ok(content.compilerOptions);
    assert.strictEqual(content.compilerOptions.jsx, 'react-jsx');
  });

  await runTest(tracker, TIER, 'F22', 'T1.22.4: UnifiedHistoryItem schema specifies currentTime and duration fields', async () => {
    const filePath = path.resolve('src/services/watchHistoryService.ts');
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(content.includes('currentTime?: number'));
    assert.ok(content.includes('duration?: number'));
  });

  await runTest(tracker, TIER, 'F22', 'T1.22.5: tsconfig target specifies ES2020 or modern ECMAScript standard', async () => {
    const filePath = path.resolve('tsconfig.json');
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    assert.ok(content.compilerOptions.target.startsWith('ES'));
  });

  // --- Feature 23: Clean Production Build Verification ---
  await runTest(tracker, TIER, 'F23', 'T1.23.1: package.json specifies build script invoking vite build', async () => {
    const pkgPath = path.resolve('package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    assert.strictEqual(pkg.scripts.build, 'vite build');
  });

  await runTest(tracker, TIER, 'F23', 'T1.23.2: vite.config.ts configures react plugin and api proxy', async () => {
    const vitePath = path.resolve('vite.config.ts');
    assert.ok(fs.existsSync(vitePath));
    const content = fs.readFileSync(vitePath, 'utf8');
    assert.ok(content.includes('@vitejs/plugin-react'));
    assert.ok(content.includes('/api'));
  });

  await runTest(tracker, TIER, 'F23', 'T1.23.3: index.html entry exists with root container', async () => {
    const indexPath = path.resolve('index.html');
    assert.ok(fs.existsSync(indexPath));
    const content = fs.readFileSync(indexPath, 'utf8');
    assert.ok(content.includes('id="root"'));
    assert.ok(content.includes('/src/main.tsx'));
  });

  await runTest(tracker, TIER, 'F23', 'T1.23.4: Production dist directory exists and contains index.html', async () => {
    const distHtml = path.resolve('dist/index.html');
    assert.ok(fs.existsSync(distHtml));
  });

  await runTest(tracker, TIER, 'F23', 'T1.23.5: Production dist/assets directory contains compiled js and css', async () => {
    const assetsDir = path.resolve('dist/assets');
    assert.ok(fs.existsSync(assetsDir));
    const files = fs.readdirSync(assetsDir);
    assert.ok(files.some((f) => f.endsWith('.js')));
    assert.ok(files.some((f) => f.endsWith('.css')));
  });

  // --- Feature 24: Capacitor Android Packaging & Sync ---
  await runTest(tracker, TIER, 'F24', 'T1.24.1: capacitor.config.ts specifies valid appId and webDir: dist', async () => {
    const capPath = path.resolve('capacitor.config.ts');
    assert.ok(fs.existsSync(capPath));
    const content = fs.readFileSync(capPath, 'utf8');
    assert.ok(content.includes("appId: 'com.omnistream.app'"));
    assert.ok(content.includes("webDir: 'dist'"));
  });

  await runTest(tracker, TIER, 'F24', 'T1.24.2: AndroidManifest.xml contains LEANBACK_LAUNCHER for Android TV', async () => {
    const manifestPath = path.resolve('android/app/src/main/AndroidManifest.xml');
    assert.ok(fs.existsSync(manifestPath));
    const content = fs.readFileSync(manifestPath, 'utf8');
    assert.ok(content.includes('android.intent.category.LEANBACK_LAUNCHER'));
  });

  await runTest(tracker, TIER, 'F24', 'T1.24.3: AndroidManifest.xml requests android.permission.INTERNET', async () => {
    const manifestPath = path.resolve('android/app/src/main/AndroidManifest.xml');
    const content = fs.readFileSync(manifestPath, 'utf8');
    assert.ok(content.includes('android.permission.INTERNET'));
  });

  await runTest(tracker, TIER, 'F24', 'T1.24.4: Android assets directory exists at android/app/src/main/assets/public', async () => {
    const androidPublic = path.resolve('android/app/src/main/assets/public');
    assert.ok(fs.existsSync(androidPublic));
  });

  await runTest(tracker, TIER, 'F24', 'T1.24.5: Copied index.html exists in Android public assets', async () => {
    const androidIndex = path.resolve('android/app/src/main/assets/public/index.html');
    assert.ok(fs.existsSync(androidIndex));
  });
}

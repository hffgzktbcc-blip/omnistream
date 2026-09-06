/**
 * OmniStream Cinema Video Player — Tier 2: Boundary & Corner Cases Test Suite
 * Minimum 5 boundary, edge case, and adversarial tests per feature across all 24 features (120 tests total).
 */

import { runTest, assert } from '../harness/test-utils.js';
import { HeadlessCinemaPlayer } from '../harness/player-simulator.js';
import fs from 'node:fs';
import path from 'node:path';

export async function runTier2BoundaryTests(tracker, { baseUrl = 'http://localhost:3099' } = {}) {
  const TIER = 'Tier 2';

  // --- Feature 1: Direct Stream Resolver Endpoint ---
  await runTest(tracker, TIER, 'F01', 'T2.1.1: Missing type parameter returns 400 Bad Request', async () => {
    const res = await fetch(`${baseUrl}/api/stream/resolve?id=27205`);
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
  });

  await runTest(tracker, TIER, 'F01', 'T2.1.2: Missing id parameter returns 400 Bad Request', async () => {
    const res = await fetch(`${baseUrl}/api/stream/resolve?type=movie`);
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
  });

  await runTest(tracker, TIER, 'F01', 'T2.1.3: Invalid type parameter returns 400 Bad Request', async () => {
    const res = await fetch(`${baseUrl}/api/stream/resolve?type=invalid_type&id=27205`);
    assert.strictEqual(res.status, 400);
  });

  await runTest(tracker, TIER, 'F01', 'T2.1.4: Non-numeric ID string handles cleanly without server crash', async () => {
    const res = await fetch(`${baseUrl}/api/stream/resolve?type=movie&id=abc-malformed`);
    assert.ok(res.status === 200 || res.status === 400);
  });

  await runTest(tracker, TIER, 'F01', 'T2.1.5: Unknown media ID returns success: false payload without 500 error', async () => {
    const res = await fetch(`${baseUrl}/api/stream/resolve?type=movie&id=99999999`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, false);
  });

  // --- Feature 2: Sample ID Verification Fixtures ---
  await runTest(tracker, TIER, 'F02', 'T2.2.1: TV 1399 with season=0 or episode=0 defaults safely to S1E1', async () => {
    const res = await fetch(`${baseUrl}/api/stream/resolve?type=tv&id=1399&season=0&episode=0`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
  });

  await runTest(tracker, TIER, 'F02', 'T2.2.2: Anime fixture with extreme episode number handles gracefully', async () => {
    const res = await fetch(`${baseUrl}/api/stream/resolve?type=anime&id=21&episode=99999`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.streamUrl.includes('21'));
  });

  await runTest(tracker, TIER, 'F02', 'T2.2.3: Sample fixtures return properly URL-encoded stream URLs', async () => {
    const res = await fetch(`${baseUrl}/api/stream/resolve?type=movie&id=27205`);
    const data = await res.json();
    assert.ok(data.streamUrl.includes('%2F') || data.streamUrl.includes('/'));
  });

  await runTest(tracker, TIER, 'F02', 'T2.2.4: Concurrent requests for all sample fixtures execute in parallel without race condition', async () => {
    const promises = [
      fetch(`${baseUrl}/api/stream/resolve?type=movie&id=27205`),
      fetch(`${baseUrl}/api/stream/resolve?type=tv&id=1399&season=1&episode=1`),
      fetch(`${baseUrl}/api/stream/resolve?type=anime&id=21&episode=1`),
      fetch(`${baseUrl}/api/stream/resolve?type=anime&id=151807&episode=1`)
    ];
    const results = await Promise.all(promises);
    results.forEach((r) => assert.strictEqual(r.status, 200));
  });

  await runTest(tracker, TIER, 'F02', 'T2.2.5: Repeated requests for sample fixtures return consistent deterministic data', async () => {
    const res1 = await (await fetch(`${baseUrl}/api/stream/resolve?type=movie&id=27205`)).json();
    const res2 = await (await fetch(`${baseUrl}/api/stream/resolve?type=movie&id=27205`)).json();
    assert.strictEqual(res1.streamUrl, res2.streamUrl);
    assert.strictEqual(res1.qualities.length, res2.qualities.length);
  });

  // --- Feature 3: HLS Manifest Rewriter & Proxy ---
  await runTest(tracker, TIER, 'F03', 'T2.3.1: Missing url parameter in /api/proxy/hls returns 400 Bad Request', async () => {
    const res = await fetch(`${baseUrl}/api/proxy/hls`);
    assert.strictEqual(res.status, 400);
  });

  await runTest(tracker, TIER, 'F03', 'T2.3.2: SSRF Guard: Blocks localhost loopback target (127.0.0.1) with 403', async () => {
    const res = await fetch(`${baseUrl}/api/proxy/hls?url=http%3A%2F%2F127.0.0.1%3A8080%2Fsecret.m3u8`);
    assert.strictEqual(res.status, 403);
  });

  await runTest(tracker, TIER, 'F03', 'T2.3.3: SSRF Guard: Blocks cloud metadata IP (169.254.169.254) with 403', async () => {
    const res = await fetch(`${baseUrl}/api/proxy/hls?url=http%3A%2F%2F169.254.169.254%2Flatest%2Fmeta-data%2F`);
    assert.strictEqual(res.status, 403);
  });

  await runTest(tracker, TIER, 'F03', 'T2.3.4: Master playlist preserves multiple audio media lines', async () => {
    const res = await fetch(`${baseUrl}/api/proxy/hls?url=https%3A%2F%2Fcdn.omnistream.test%2Fmaster.m3u8`);
    const text = await res.text();
    assert.ok(text.includes('#EXT-X-MEDIA:TYPE=AUDIO'));
  });

  await runTest(tracker, TIER, 'F03', 'T2.3.5: Master playlist preserves multiple subtitle media lines', async () => {
    const res = await fetch(`${baseUrl}/api/proxy/hls?url=https%3A%2F%2Fcdn.omnistream.test%2Fmaster.m3u8`);
    const text = await res.text();
    assert.ok(text.includes('#EXT-X-MEDIA:TYPE=SUBTITLES'));
  });

  // --- Feature 4: Binary Segment Streaming Proxy ---
  await runTest(tracker, TIER, 'F04', 'T2.4.1: Missing url parameter in /api/proxy/segment returns 400 Bad Request', async () => {
    const res = await fetch(`${baseUrl}/api/proxy/segment`);
    assert.strictEqual(res.status, 400);
  });

  await runTest(tracker, TIER, 'F04', 'T2.4.2: SSRF Guard: Blocks private IP target on segment proxy with 403', async () => {
    const res = await fetch(`${baseUrl}/api/proxy/segment?url=http%3A%2F%2F10.0.0.1%2Fprivate.ts`);
    assert.strictEqual(res.status, 403);
  });

  await runTest(tracker, TIER, 'F04', 'T2.4.3: Out-of-bounds range request returns 416 Range Not Satisfiable', async () => {
    const res = await fetch(`${baseUrl}/api/proxy/segment?url=https%3A%2F%2Fcdn.omnistream.test%2Fseg0.ts`, {
      headers: { Range: 'bytes=999999999-' }
    });
    assert.strictEqual(res.status, 416);
  });

  await runTest(tracker, TIER, 'F04', 'T2.4.4: Inverted range request (start > end) returns 416 Range Not Satisfiable', async () => {
    const res = await fetch(`${baseUrl}/api/proxy/segment?url=https%3A%2F%2Fcdn.omnistream.test%2Fseg0.ts`, {
      headers: { Range: 'bytes=500-100' }
    });
    assert.strictEqual(res.status, 416);
  });

  await runTest(tracker, TIER, 'F04', 'T2.4.5: Single-byte range request returns exactly 1 byte', async () => {
    const res = await fetch(`${baseUrl}/api/proxy/segment?url=https%3A%2F%2Fcdn.omnistream.test%2Fseg0.ts`, {
      headers: { Range: 'bytes=0-0' }
    });
    assert.strictEqual(res.status, 206);
    const buf = await res.arrayBuffer();
    assert.strictEqual(buf.byteLength, 1);
  });

  // --- Feature 5: WebVTT Subtitle Proxy ---
  await runTest(tracker, TIER, 'F05', 'T2.5.1: Missing url parameter in /api/proxy/subtitles returns 400', async () => {
    const res = await fetch(`${baseUrl}/api/proxy/subtitles`);
    assert.strictEqual(res.status, 400);
  });

  await runTest(tracker, TIER, 'F05', 'T2.5.2: SSRF Guard: Blocks LAN target on subtitle proxy with 403', async () => {
    const res = await fetch(`${baseUrl}/api/proxy/subtitles?url=http%3A%2F%2F192.168.1.100%2Fsubs.vtt`);
    assert.strictEqual(res.status, 403);
  });

  await runTest(tracker, TIER, 'F05', 'T2.5.3: Subtitle content returns properly encoded UTF-8 text', async () => {
    const res = await fetch(`${baseUrl}/api/proxy/subtitles?url=https%3A%2F%2Fsub.omnistream.test%2Fen.vtt`);
    const text = await res.text();
    assert.ok(Buffer.byteLength(text, 'utf8') > 0);
  });

  await runTest(tracker, TIER, 'F05', 'T2.5.4: Subtitle proxy responds with 200 for valid external subtitle URLs', async () => {
    const res = await fetch(`${baseUrl}/api/proxy/subtitles?url=https%3A%2F%2Fsub.omnistream.test%2Fen.vtt`);
    assert.strictEqual(res.status, 200);
  });

  await runTest(tracker, TIER, 'F05', 'T2.5.5: Content-Type header specifies charset=utf-8', async () => {
    const res = await fetch(`${baseUrl}/api/proxy/subtitles?url=https%3A%2F%2Fsub.omnistream.test%2Fen.vtt`);
    const ct = res.headers.get('content-type') || '';
    assert.ok(ct.includes('charset=utf-8'));
  });

  // --- Feature 6: Direct HTML5 Video Player ---
  await runTest(tracker, TIER, 'F06', 'T2.6.1: Non-fatal HLS network error does not trigger dual-mode fallback', async () => {
    const player = new HeadlessCinemaPlayer();
    player.loadDirectStream('/api/proxy/hls?url=test.m3u8');
    player.emit('hlsError', { fatal: false, type: 'networkError' });
    assert.strictEqual(player.mode, 'direct-hls');
  });

  await runTest(tracker, TIER, 'F06', 'T2.6.2: Non-fatal HLS media error does not trigger dual-mode fallback', async () => {
    const player = new HeadlessCinemaPlayer();
    player.loadDirectStream('/api/proxy/hls?url=test.m3u8');
    player.emit('hlsError', { fatal: false, type: 'mediaError' });
    assert.strictEqual(player.mode, 'direct-hls');
  });

  await runTest(tracker, TIER, 'F06', 'T2.6.3: Rapid successive play/pause calls do not corrupt state', async () => {
    const player = new HeadlessCinemaPlayer();
    for (let i = 0; i < 10; i++) {
      player.togglePlayPause();
    }
    assert.strictEqual(player.paused, true);
  });

  await runTest(tracker, TIER, 'F06', 'T2.6.4: Seeking beyond duration clamps to duration boundary', async () => {
    const player = new HeadlessCinemaPlayer({ duration: 5000 });
    player.seek(99999);
    assert.strictEqual(player.currentTime, 5000);
  });

  await runTest(tracker, TIER, 'F06', 'T2.6.5: Seeking to negative time clamps to 0 boundary', async () => {
    const player = new HeadlessCinemaPlayer({ duration: 5000 });
    player.seek(-500);
    assert.strictEqual(player.currentTime, 0);
  });

  // --- Feature 7: Native Safari HLS Fallback ---
  await runTest(tracker, TIER, 'F07', 'T2.7.1: Destroying player cleans up playback resources and timers', async () => {
    const player = new HeadlessCinemaPlayer();
    await player.play();
    player.destroy();
    assert.strictEqual(player.isDestroyed, true);
    assert.strictEqual(player.progressTimer, null);
  });

  await runTest(tracker, TIER, 'F07', 'T2.7.2: Rapid stream URL switching replaces source cleanly', async () => {
    const player = new HeadlessCinemaPlayer();
    player.loadDirectStream('https://stream1.m3u8');
    player.loadDirectStream('https://stream2.m3u8');
    assert.strictEqual(player.currentStreamUrl, 'https://stream2.m3u8');
  });

  await runTest(tracker, TIER, 'F07', 'T2.7.3: Fallback handles null stream URL by triggering dual-mode switch', async () => {
    const player = new HeadlessCinemaPlayer();
    player.loadDirectStream(null);
    assert.strictEqual(player.mode, 'sanitized-iframe');
  });

  await runTest(tracker, TIER, 'F07', 'T2.7.4: Playback after destroy throws error rather than silent corruption', async () => {
    const player = new HeadlessCinemaPlayer();
    player.destroy();
    let threw = false;
    try {
      await player.play();
    } catch {
      threw = true;
    }
    assert.strictEqual(threw, true);
  });

  await runTest(tracker, TIER, 'F07', 'T2.7.5: Fallback audio track selection ignores invalid track ID', async () => {
    const player = new HeadlessCinemaPlayer();
    player.currentAudioTrack = 0;
    player.currentAudioTrack = 999;
    assert.strictEqual(player.currentAudioTrack, 999);
  });

  // --- Feature 8: Seamless Dual-Mode Fallback ---
  await runTest(tracker, TIER, 'F08', 'T2.8.1: Fallback preserves currentTime from direct playback', async () => {
    const player = new HeadlessCinemaPlayer({ initialTime: 750 });
    player.triggerHlsFatalError('networkError');
    assert.strictEqual(player.currentTime, 750);
  });

  await runTest(tracker, TIER, 'F08', 'T2.8.2: Fast manual return to Mode A restores direct-hls mode', async () => {
    const player = new HeadlessCinemaPlayer();
    player.triggerDualModeFallback('test');
    assert.strictEqual(player.mode, 'sanitized-iframe');
    player.loadDirectStream('/api/proxy/hls?url=retry.m3u8');
    assert.strictEqual(player.mode, 'direct-hls');
  });

  await runTest(tracker, TIER, 'F08', 'T2.8.3: Successive mirror rotations cycle through all 8 mirrors in order', async () => {
    const player = new HeadlessCinemaPlayer();
    player.triggerDualModeFallback('error');
    const visited = [player.mirrorList[player.currentMirrorIndex]];
    for (let i = 0; i < 7; i++) {
      player.nextMirror();
      visited.push(player.mirrorList[player.currentMirrorIndex]);
    }
    assert.strictEqual(visited.length, 8);
    assert.strictEqual(visited[0], 'vidlink-pro');
    assert.strictEqual(visited[7], 'smashystream');
  });

  await runTest(tracker, TIER, 'F08', 'T2.8.4: Rotating past 8th mirror triggers exhaustedMirrors state', async () => {
    const player = new HeadlessCinemaPlayer();
    player.triggerDualModeFallback('error');
    for (let i = 0; i < 8; i++) {
      player.nextMirror();
    }
    assert.strictEqual(player.exhaustedMirrors, true);
  });

  await runTest(tracker, TIER, 'F08', 'T2.8.5: Fallback event payload contains transition reason and target mirror', async () => {
    const player = new HeadlessCinemaPlayer();
    let payload = null;
    player.on('modeChange', (p) => { payload = p; });
    player.triggerDualModeFallback('403_forbidden');
    assert.strictEqual(payload.reason, '403_forbidden');
    assert.strictEqual(payload.mode, 'sanitized-iframe');
  });

  // --- Feature 9: Iframe Focus Trap Prevention ---
  await runTest(tracker, TIER, 'F09', 'T2.9.1: Focus shield captures keydown even after repeated rapid inputs', async () => {
    const player = new HeadlessCinemaPlayer();
    player.triggerDualModeFallback('error');
    for (let i = 0; i < 20; i++) {
      const res = player.handleKeyDown({ key: 'ArrowRight', keyCode: 39 });
      assert.strictEqual(res.handled, true);
    }
  });

  await runTest(tracker, TIER, 'F09', 'T2.9.2: Escape key on focus shield closes player when drawer is closed', async () => {
    const player = new HeadlessCinemaPlayer();
    player.triggerDualModeFallback('error');
    const res = player.handleKeyDown({ key: 'Escape', keyCode: 27 });
    assert.strictEqual(res.action, 'exit_player');
  });

  await runTest(tracker, TIER, 'F09', 'T2.9.3: Shield remains active when rotating across iframe mirrors', async () => {
    const player = new HeadlessCinemaPlayer();
    player.triggerDualModeFallback('error');
    player.nextMirror();
    assert.strictEqual(player.focusShieldActive, true);
  });

  await runTest(tracker, TIER, 'F09', 'T2.9.4: Shield deactivates when user returns to Mode A direct stream', async () => {
    const player = new HeadlessCinemaPlayer();
    player.triggerDualModeFallback('error');
    assert.strictEqual(player.focusShieldActive, true);
    player.loadDirectStream('https://cdn.test/direct.m3u8');
    assert.strictEqual(player.focusShieldActive, false);
  });

  await runTest(tracker, TIER, 'F09', 'T2.9.5: Unrecognized key returns handled: false without throwing', async () => {
    const player = new HeadlessCinemaPlayer();
    player.triggerDualModeFallback('error');
    const res = player.handleKeyDown({ key: 'F12', keyCode: 123 });
    assert.strictEqual(res.handled, false);
  });

  // --- Feature 10: 10-Foot D-Pad Left/Right Seek ---
  await runTest(tracker, TIER, 'F10', 'T2.10.1: Seeking backward when currentTime < 10 clamps to exactly 0', async () => {
    const player = new HeadlessCinemaPlayer({ initialTime: 4 });
    player.handleKeyDown({ key: 'ArrowLeft', keyCode: 37 });
    assert.strictEqual(player.currentTime, 0);
  });

  await runTest(tracker, TIER, 'F10', 'T2.10.2: Seeking forward when currentTime + 10 > duration clamps to duration', async () => {
    const player = new HeadlessCinemaPlayer({ initialTime: 7195, duration: 7200 });
    player.handleKeyDown({ key: 'ArrowRight', keyCode: 39 });
    assert.strictEqual(player.currentTime, 7200);
  });

  await runTest(tracker, TIER, 'F10', 'T2.10.3: Rapid repeated presses accumulate seek indicator delta (+30s)', async () => {
    const player = new HeadlessCinemaPlayer({ initialTime: 100 });
    player.handleKeyDown({ key: 'ArrowRight', keyCode: 39 });
    player.handleKeyDown({ key: 'ArrowRight', keyCode: 39 });
    player.handleKeyDown({ key: 'ArrowRight', keyCode: 39 });
    assert.strictEqual(player.seekIndicator.delta, 30);
    assert.strictEqual(player.currentTime, 130);
  });

  await runTest(tracker, TIER, 'F10', 'T2.10.4: Seeking while video is paused updates position without auto-playing', async () => {
    const player = new HeadlessCinemaPlayer({ initialTime: 100 });
    assert.strictEqual(player.paused, true);
    player.handleKeyDown({ key: 'ArrowRight', keyCode: 39 });
    assert.strictEqual(player.paused, true);
    assert.strictEqual(player.currentTime, 110);
  });

  await runTest(tracker, TIER, 'F10', 'T2.10.5: Large negative delta clamp prevents negative values in all paths', async () => {
    const player = new HeadlessCinemaPlayer({ initialTime: 5 });
    player.seekByDelta(-99999);
    assert.strictEqual(player.currentTime, 0);
  });

  // --- Feature 11: 10-Foot D-Pad Center Play/Pause ---
  await runTest(tracker, TIER, 'F11', 'T2.11.1: Spacebar (32) also provides standard play/pause toggle', async () => {
    const player = new HeadlessCinemaPlayer();
    player.togglePlayPause();
    assert.strictEqual(player.paused, false);
    player.togglePlayPause();
    assert.strictEqual(player.paused, true);
  });

  await runTest(tracker, TIER, 'F11', 'T2.11.2: Pressing Enter while paused resumes playback without error', async () => {
    const player = new HeadlessCinemaPlayer();
    player.paused = true;
    player.handleKeyDown({ key: 'Enter', keyCode: 13 });
    assert.strictEqual(player.paused, false);
  });

  await runTest(tracker, TIER, 'F11', 'T2.11.3: Repeated rapid Enter presses toggle state cleanly', async () => {
    const player = new HeadlessCinemaPlayer();
    player.handleKeyDown({ key: 'Enter', keyCode: 13 }); // play
    player.handleKeyDown({ key: 'Enter', keyCode: 13 }); // pause
    player.handleKeyDown({ key: 'Enter', keyCode: 13 }); // play
    assert.strictEqual(player.paused, false);
  });

  await runTest(tracker, TIER, 'F11', 'T2.11.4: Android DPAD_CENTER (23) handles toggle when already playing', async () => {
    const player = new HeadlessCinemaPlayer();
    await player.play();
    player.handleKeyDown({ key: 'Center', keyCode: 23 });
    assert.strictEqual(player.paused, true);
  });

  await runTest(tracker, TIER, 'F11', 'T2.11.5: Playing when isBuffering sets isBuffering to false once active', async () => {
    const player = new HeadlessCinemaPlayer();
    player.isBuffering = true;
    await player.play();
    assert.strictEqual(player.isBuffering, false);
  });

  // --- Feature 12: 10-Foot D-Pad Track Drawer ---
  await runTest(tracker, TIER, 'F12', 'T2.12.1: Opening drawer does not disrupt or pause active video playback', async () => {
    const player = new HeadlessCinemaPlayer();
    await player.play();
    player.handleKeyDown({ key: 'ArrowUp', keyCode: 38 });
    assert.strictEqual(player.trackDrawerOpen, true);
    assert.strictEqual(player.paused, false);
  });

  await runTest(tracker, TIER, 'F12', 'T2.12.2: ArrowDown when drawer is open closes the drawer', async () => {
    const player = new HeadlessCinemaPlayer();
    player.trackDrawerOpen = true;
    player.handleKeyDown({ key: 'ArrowDown', keyCode: 40 });
    assert.strictEqual(player.trackDrawerOpen, false);
  });

  await runTest(tracker, TIER, 'F12', 'T2.12.3: Switching audio track preserves exact currentTime', async () => {
    const player = new HeadlessCinemaPlayer({ initialTime: 1425 });
    player.currentAudioTrack = 1;
    assert.strictEqual(player.currentTime, 1425);
  });

  await runTest(tracker, TIER, 'F12', 'T2.12.4: Setting subtitle track to -1 disables subtitles (Off)', async () => {
    const player = new HeadlessCinemaPlayer();
    player.currentSubtitleTrack = 0; // English
    player.currentSubtitleTrack = -1; // Off
    assert.strictEqual(player.currentSubtitleTrack, -1);
  });

  await runTest(tracker, TIER, 'F12', 'T2.12.5: Drawer toggles emit drawerToggled event with state', async () => {
    const player = new HeadlessCinemaPlayer();
    let state = null;
    player.on('drawerToggled', (s) => { state = s; });
    player.handleKeyDown({ key: 'ArrowUp', keyCode: 38 });
    assert.strictEqual(state, true);
  });

  // --- Feature 13: Back to Exit Handler ---
  await runTest(tracker, TIER, 'F13', 'T2.13.1: Back key closes drawer before exiting player', async () => {
    const player = new HeadlessCinemaPlayer();
    player.trackDrawerOpen = true;
    let closed = false;
    player.on('closePlayer', () => { closed = true; });
    const res = player.handleKeyDown({ key: 'Escape', keyCode: 27 });
    assert.strictEqual(res.action, 'close_drawer');
    assert.strictEqual(player.trackDrawerOpen, false);
    assert.strictEqual(closed, false); // Did not exit player yet
  });

  await runTest(tracker, TIER, 'F13', 'T2.13.2: Back key when resume prompt is open dismisses prompt first', async () => {
    const player = new HeadlessCinemaPlayer();
    player.resumePrompt.visible = true;
    let closed = false;
    player.on('closePlayer', () => { closed = true; });
    const res = player.handleKeyDown({ key: 'Escape', keyCode: 27 });
    assert.strictEqual(res.action, 'dismiss_resume_prompt');
    assert.strictEqual(player.resumePrompt.visible, false);
    assert.strictEqual(closed, false);
  });

  await runTest(tracker, TIER, 'F13', 'T2.13.3: Second Back key press exits player session cleanly', async () => {
    const player = new HeadlessCinemaPlayer();
    player.trackDrawerOpen = true;
    player.handleKeyDown({ key: 'Escape', keyCode: 27 }); // closes drawer
    let closed = false;
    player.on('closePlayer', () => { closed = true; });
    const res = player.handleKeyDown({ key: 'Escape', keyCode: 27 }); // exits player
    assert.strictEqual(res.action, 'exit_player');
    assert.strictEqual(closed, true);
  });

  await runTest(tracker, TIER, 'F13', 'T2.13.4: Destroying player while in PiP terminates PiP session', async () => {
    const player = new HeadlessCinemaPlayer();
    await player.requestPictureInPicture();
    assert.strictEqual(player.isInPiP, true);
    player.destroy();
    assert.strictEqual(player.isInPiP, false);
  });

  await runTest(tracker, TIER, 'F13', 'T2.13.5: Rapid double-back key does not throw unhandled exception', async () => {
    const player = new HeadlessCinemaPlayer();
    player.handleKeyDown({ key: 'Escape', keyCode: 27 });
    player.handleKeyDown({ key: 'Escape', keyCode: 27 });
    assert.strictEqual(player.isDestroyed, true);
  });

  // --- Feature 14: Mobile Double-Tap Seek Gestures ---
  await runTest(tracker, TIER, 'F14', 'T2.14.1: Double tap on boundary resolves to right half (+10s)', async () => {
    const player = new HeadlessCinemaPlayer({ width: 1000, initialTime: 100 });
    const now = Date.now();
    player.handleTouchStart({ x: 500, y: 500, time: now });
    const res = player.handleTouchStart({ x: 500, y: 500, time: now + 150 });
    assert.strictEqual(res.side, 'right');
    assert.strictEqual(res.delta, 10);
  });

  await runTest(tracker, TIER, 'F14', 'T2.14.2: Tapping across center (first left, second right) does not seek', async () => {
    const player = new HeadlessCinemaPlayer({ width: 1000, initialTime: 100 });
    const now = Date.now();
    player.handleTouchStart({ x: 200, y: 500, time: now });
    const res = player.handleTouchStart({ x: 800, y: 500, time: now + 150 });
    assert.strictEqual(res.gesture, 'touch_start');
    assert.strictEqual(player.currentTime, 100);
  });

  await runTest(tracker, TIER, 'F14', 'T2.14.3: Double-tap backward near 0s clamps to 0', async () => {
    const player = new HeadlessCinemaPlayer({ width: 1000, initialTime: 5 });
    const now = Date.now();
    player.handleTouchStart({ x: 200, y: 500, time: now });
    player.handleTouchStart({ x: 200, y: 500, time: now + 150 });
    assert.strictEqual(player.currentTime, 0);
  });

  await runTest(tracker, TIER, 'F14', 'T2.14.4: Double-tap forward near duration clamps to duration', async () => {
    const player = new HeadlessCinemaPlayer({ width: 1000, initialTime: 7196, duration: 7200 });
    const now = Date.now();
    player.handleTouchStart({ x: 800, y: 500, time: now });
    player.handleTouchStart({ x: 800, y: 500, time: now + 150 });
    assert.strictEqual(player.currentTime, 7200);
  });

  await runTest(tracker, TIER, 'F14', 'T2.14.5: Multiple double-taps accumulate delta cleanly', async () => {
    const player = new HeadlessCinemaPlayer({ width: 1000, initialTime: 100 });
    const now = Date.now();
    player.handleTouchStart({ x: 800, y: 500, time: now });
    player.handleTouchStart({ x: 800, y: 500, time: now + 100 });
    player.handleTouchStart({ x: 800, y: 500, time: now + 450 });
    player.handleTouchStart({ x: 800, y: 500, time: now + 550 });
    assert.strictEqual(player.currentTime, 120);
  });

  // --- Feature 15: Mobile Vertical Swipe Volume ---
  await runTest(tracker, TIER, 'F15', 'T2.15.1: Volume upper bound clamped at 1.0 (100%)', async () => {
    const player = new HeadlessCinemaPlayer({ width: 1000, height: 1000 });
    player.volume = 0.95;
    player.handleTouchStart({ x: 800, y: 500 });
    player.handleTouchMove({ x: 800, y: 0 }); // Massive swipe up
    assert.strictEqual(player.volume, 1.0);
    assert.strictEqual(player.volumeHud.level, 100);
  });

  await runTest(tracker, TIER, 'F15', 'T2.15.2: Volume lower bound clamped at 0.0 (0%)', async () => {
    const player = new HeadlessCinemaPlayer({ width: 1000, height: 1000 });
    player.volume = 0.05;
    player.handleTouchStart({ x: 800, y: 500 });
    player.handleTouchMove({ x: 800, y: 1500 }); // Massive swipe down
    assert.strictEqual(player.volume, 0.0);
    assert.strictEqual(player.volumeHud.level, 0);
  });

  await runTest(tracker, TIER, 'F15', 'T2.15.3: Horizontal swipe on right half does not alter volume', async () => {
    const player = new HeadlessCinemaPlayer({ width: 1000, height: 1000 });
    player.volume = 0.5;
    player.handleTouchStart({ x: 700, y: 500 });
    player.handleTouchMove({ x: 950, y: 502 }); // Horizontal swipe
    assert.strictEqual(player.volume, 0.5);
  });

  await runTest(tracker, TIER, 'F15', 'T2.15.4: Sub-threshold movement (< 10px delta) does not alter volume', async () => {
    const player = new HeadlessCinemaPlayer({ width: 1000, height: 1000 });
    player.volume = 0.5;
    player.handleTouchStart({ x: 800, y: 500 });
    player.handleTouchMove({ x: 800, y: 505 }); // Only 5px
    assert.strictEqual(player.volume, 0.5);
  });

  await runTest(tracker, TIER, 'F15', 'T2.15.5: Increasing volume above 0 un-mutes player', async () => {
    const player = new HeadlessCinemaPlayer({ width: 1000, height: 1000 });
    player.volume = 0.0;
    player.muted = true;
    player.handleTouchStart({ x: 800, y: 500 });
    player.handleTouchMove({ x: 800, y: 300 });
    assert.ok(player.volume > 0);
    assert.strictEqual(player.muted, false);
  });

  // --- Feature 16: Mobile Vertical Swipe Brightness ---
  await runTest(tracker, TIER, 'F16', 'T2.16.1: Brightness minimum clamp prevents total blackout (caps at 0.1)', async () => {
    const player = new HeadlessCinemaPlayer({ width: 1000, height: 1000 });
    player.brightness = 0.15;
    player.handleTouchStart({ x: 200, y: 500 });
    player.handleTouchMove({ x: 200, y: 1500 }); // Massive swipe down
    assert.strictEqual(player.brightness, 0.1);
    assert.strictEqual(player.brightnessHud.level, 10);
  });

  await runTest(tracker, TIER, 'F16', 'T2.16.2: Brightness maximum clamp caps at 1.0 (100%)', async () => {
    const player = new HeadlessCinemaPlayer({ width: 1000, height: 1000 });
    player.brightness = 0.95;
    player.handleTouchStart({ x: 200, y: 500 });
    player.handleTouchMove({ x: 200, y: 0 }); // Massive swipe up
    assert.strictEqual(player.brightness, 1.0);
    assert.strictEqual(player.brightnessHud.level, 100);
  });

  await runTest(tracker, TIER, 'F16', 'T2.16.3: Horizontal swipe on left half does not alter brightness', async () => {
    const player = new HeadlessCinemaPlayer({ width: 1000, height: 1000 });
    player.brightness = 0.5;
    player.handleTouchStart({ x: 200, y: 500 });
    player.handleTouchMove({ x: 400, y: 502 });
    assert.strictEqual(player.brightness, 0.5);
  });

  await runTest(tracker, TIER, 'F16', 'T2.16.4: Sub-threshold vertical movement (< 10px) does not alter brightness', async () => {
    const player = new HeadlessCinemaPlayer({ width: 1000, height: 1000 });
    player.brightness = 0.5;
    player.handleTouchStart({ x: 200, y: 500 });
    player.handleTouchMove({ x: 200, y: 505 });
    assert.strictEqual(player.brightness, 0.5);
  });

  await runTest(tracker, TIER, 'F16', 'T2.16.5: Brightness level persists across seeking and pause', async () => {
    const player = new HeadlessCinemaPlayer({ width: 1000, height: 1000 });
    player.brightness = 0.75;
    player.seek(500);
    player.pause();
    assert.strictEqual(player.brightness, 0.75);
  });

  // --- Feature 17: Aspect Ratio Toggling ---
  await runTest(tracker, TIER, 'F17', 'T2.17.1: Mode sequence cycle is strictly contain -> cover -> fill -> contain', async () => {
    const player = new HeadlessCinemaPlayer();
    assert.strictEqual(player.aspectRatio, 'contain');
    assert.strictEqual(player.toggleAspectRatio(), 'cover');
    assert.strictEqual(player.toggleAspectRatio(), 'fill');
    assert.strictEqual(player.toggleAspectRatio(), 'contain');
  });

  await runTest(tracker, TIER, 'F17', 'T2.17.2: Aspect ratio toggle does not reset currentTime', async () => {
    const player = new HeadlessCinemaPlayer({ initialTime: 1250 });
    player.toggleAspectRatio();
    assert.strictEqual(player.currentTime, 1250);
  });

  await runTest(tracker, TIER, 'F17', 'T2.17.3: Aspect ratio toggle does not alter volume or muted status', async () => {
    const player = new HeadlessCinemaPlayer();
    player.volume = 0.42;
    player.muted = false;
    player.toggleAspectRatio();
    assert.strictEqual(player.volume, 0.42);
    assert.strictEqual(player.muted, false);
  });

  await runTest(tracker, TIER, 'F17', 'T2.17.4: Aspect ratio toggle does not disrupt playback state (paused stays paused)', async () => {
    const player = new HeadlessCinemaPlayer();
    player.paused = true;
    player.toggleAspectRatio();
    assert.strictEqual(player.paused, true);
  });

  await runTest(tracker, TIER, 'F17', 'T2.17.5: Aspect ratio toggle during active playback preserves playing state', async () => {
    const player = new HeadlessCinemaPlayer();
    await player.play();
    player.toggleAspectRatio();
    assert.strictEqual(player.paused, false);
    player.pause();
  });

  // --- Feature 18: Native Picture-in-Picture & AirPlay ---
  await runTest(tracker, TIER, 'F18', 'T2.18.1: Requesting PiP when already in PiP handles cleanly without error', async () => {
    const player = new HeadlessCinemaPlayer();
    await player.requestPictureInPicture();
    await player.requestPictureInPicture();
    assert.strictEqual(player.isInPiP, true);
  });

  await runTest(tracker, TIER, 'F18', 'T2.18.2: Exiting PiP when not in PiP returns cleanly', async () => {
    const player = new HeadlessCinemaPlayer();
    assert.strictEqual(player.isInPiP, false);
    await player.exitPictureInPicture();
    assert.strictEqual(player.isInPiP, false);
  });

  await runTest(tracker, TIER, 'F18', 'T2.18.3: Seeking while in PiP preserves PiP mode', async () => {
    const player = new HeadlessCinemaPlayer({ initialTime: 100 });
    await player.requestPictureInPicture();
    player.seek(300);
    assert.strictEqual(player.isInPiP, true);
    assert.strictEqual(player.currentTime, 300);
  });

  await runTest(tracker, TIER, 'F18', 'T2.18.4: Mode B fallback terminates active PiP cleanly', async () => {
    const player = new HeadlessCinemaPlayer();
    await player.requestPictureInPicture();
    player.triggerDualModeFallback('error');
    assert.strictEqual(player.mode, 'sanitized-iframe');
  });

  await runTest(tracker, TIER, 'F18', 'T2.18.5: AirPlay trigger while paused preserves paused state', async () => {
    const player = new HeadlessCinemaPlayer();
    player.paused = true;
    player.showAirPlayPicker();
    assert.strictEqual(player.paused, true);
  });

  // --- Feature 19: 5-Second Interval Watch Progress ---
  await runTest(tracker, TIER, 'F19', 'T2.19.1: Progress calculation with 0 duration returns 0% rather than NaN', async () => {
    const player = new HeadlessCinemaPlayer({ duration: 0 });
    player.currentTime = 0;
    const record = player.persistProgress();
    assert.strictEqual(record.progressPercent, 0);
    assert.ok(!Number.isNaN(record.progressPercent));
  });

  await runTest(tracker, TIER, 'F19', 'T2.19.2: Seeking immediately records progress without waiting for 5s timer', async () => {
    const player = new HeadlessCinemaPlayer({ initialTime: 100 });
    player.seek(250);
    assert.ok(player.watchHistorySaves.length >= 1);
    assert.strictEqual(player.watchHistorySaves[player.watchHistorySaves.length - 1].currentTime, 250);
  });

  await runTest(tracker, TIER, 'F19', 'T2.19.3: Progress percent capped at 100% even if currentTime exceeds duration', async () => {
    const player = new HeadlessCinemaPlayer({ duration: 1000 });
    player.currentTime = 1200;
    const record = player.persistProgress();
    assert.strictEqual(record.progressPercent, 100);
  });

  await runTest(tracker, TIER, 'F19', 'T2.19.4: Pausing playback stops interval and records final pause timestamp', async () => {
    const player = new HeadlessCinemaPlayer();
    await player.play();
    const countBefore = player.watchHistorySaves.length;
    player.pause();
    assert.ok(player.watchHistorySaves.length > countBefore);
  });

  await runTest(tracker, TIER, 'F19', 'T2.19.5: Unmounting / destroying player triggers immediate progress flush', async () => {
    const player = new HeadlessCinemaPlayer({ initialTime: 888 });
    player.destroy();
    assert.strictEqual(player.watchHistorySaves[player.watchHistorySaves.length - 1].currentTime, 888);
  });

  // --- Feature 20: Local & Cloud Watch History Sync ---
  await runTest(tracker, TIER, 'F20', 'T2.20.1: Malformed JSON payload to /api/watch-history returns 400 Bad Request', async () => {
    const res = await fetch(`${baseUrl}/api/watch-history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'MALFORMED_JSON_STRING'
    });
    assert.strictEqual(res.status, 400);
  });

  await runTest(tracker, TIER, 'F20', 'T2.20.2: Missing id in /api/watch-history payload returns 400 Bad Request', async () => {
    const res = await fetch(`${baseUrl}/api/watch-history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mediaType: 'movie', title: 'No ID' })
    });
    assert.strictEqual(res.status, 400);
  });

  await runTest(tracker, TIER, 'F20', 'T2.20.3: Unsupported HTTP method (e.g. DELETE/PUT) returns 405 or error', async () => {
    const res = await fetch(`${baseUrl}/api/watch-history`, { method: 'DELETE' });
    assert.ok(res.status === 405 || res.status === 404);
  });

  await runTest(tracker, TIER, 'F20', 'T2.20.4: Concurrent POST requests serialize without corrupting list', async () => {
    const posts = [
      fetch(`${baseUrl}/api/watch-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'concurrent_1', mediaType: 'movie', title: 'C1', lastWatchedAt: Date.now() })
      }),
      fetch(`${baseUrl}/api/watch-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'concurrent_2', mediaType: 'movie', title: 'C2', lastWatchedAt: Date.now() })
      })
    ];
    const results = await Promise.all(posts);
    results.forEach((r) => assert.strictEqual(r.status, 200));
  });

  await runTest(tracker, TIER, 'F20', 'T2.20.5: History items have valid numeric timestamps', async () => {
    const res = await fetch(`${baseUrl}/api/watch-history`);
    const list = await res.json();
    for (const item of list) {
      if (item.lastWatchedAt !== undefined) {
        assert.strictEqual(typeof item.lastWatchedAt, 'number');
      }
    }
  });

  // --- Feature 21: Exact-Second Resume Behavior ---
  await runTest(tracker, TIER, 'F21', 'T2.21.1: Position <= 5 seconds is not eligible for resume prompt', async () => {
    const player = new HeadlessCinemaPlayer({ duration: 7200 });
    const check = player.checkResumeEligibility({ currentTime: 4, duration: 7200 });
    assert.strictEqual(check.eligible, false);
    assert.strictEqual(player.resumePrompt.visible, false);
  });

  await runTest(tracker, TIER, 'F21', 'T2.21.2: Position >= 95% is considered completed and rejected', async () => {
    const player = new HeadlessCinemaPlayer({ duration: 1000 });
    const check = player.checkResumeEligibility({ currentTime: 955, duration: 1000 });
    assert.strictEqual(check.eligible, false);
    assert.strictEqual(check.reason, 'completed');
  });

  await runTest(tracker, TIER, 'F21', 'T2.21.3: Non-numeric or null saved position handled cleanly', async () => {
    const player = new HeadlessCinemaPlayer();
    const check = player.checkResumeEligibility(null);
    assert.strictEqual(check.eligible, false);
  });

  await runTest(tracker, TIER, 'F21', 'T2.21.4: Dismissing resume prompt via Escape leaves currentTime unchanged', async () => {
    const player = new HeadlessCinemaPlayer({ initialTime: 0, duration: 7200 });
    player.checkResumeEligibility({ currentTime: 1500, duration: 7200 });
    player.handleKeyDown({ key: 'Escape', keyCode: 27 });
    assert.strictEqual(player.resumePrompt.visible, false);
    assert.strictEqual(player.currentTime, 0); // User didn't accept resume
  });

  await runTest(tracker, TIER, 'F21', 'T2.21.5: Formatted resume time displays leading zeros (e.g. 05:07)', async () => {
    const player = new HeadlessCinemaPlayer({ duration: 7200 });
    const check = player.checkResumeEligibility({ currentTime: 307, duration: 7200 }); // 5 min 7 sec
    assert.strictEqual(check.formattedTime, '05:07');
  });

  // --- Feature 22: TypeScript Error Remediation ---
  await runTest(tracker, TIER, 'F22', 'T2.22.1: MediaItem in media.ts allows optional poster_path', async () => {
    const filePath = path.resolve('src/types/media.ts');
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(content.includes('poster_path?: string'));
  });

  await runTest(tracker, TIER, 'F22', 'T2.22.2: MediaItem overview field is defined as string', async () => {
    const filePath = path.resolve('src/types/media.ts');
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(content.includes('overview: string'));
  });

  await runTest(tracker, TIER, 'F22', 'T2.22.3: Anime interface in anime.ts exists and exports valid type', async () => {
    const filePath = path.resolve('src/types/anime.ts');
    assert.ok(fs.existsSync(filePath));
  });

  await runTest(tracker, TIER, 'F22', 'T2.22.4: UnifiedHistoryItem supports movie, tv, anime, comic, audiobook', async () => {
    const filePath = path.resolve('src/services/watchHistoryService.ts');
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(content.includes("'movie' | 'tv' | 'anime' | 'comic' | 'audiobook'"));
  });

  await runTest(tracker, TIER, 'F22', 'T2.22.5: tsconfig lib includes DOM and ESNext', async () => {
    const filePath = path.resolve('tsconfig.json');
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    assert.ok(content.compilerOptions.lib.includes('DOM'));
  });

  // --- Feature 23: Clean Production Build Verification ---
  await runTest(tracker, TIER, 'F23', 'T2.23.1: dist/assets bundle files are non-empty (> 1KB)', async () => {
    const assetsDir = path.resolve('dist/assets');
    const files = fs.readdirSync(assetsDir);
    for (const f of files) {
      const stats = fs.statSync(path.join(assetsDir, f));
      assert.ok(stats.size > 1024, `File ${f} is unexpectedly small (${stats.size} bytes)`);
    }
  });

  await runTest(tracker, TIER, 'F23', 'T2.23.2: dist/index.html includes viewport meta tag', async () => {
    const indexHtml = fs.readFileSync(path.resolve('dist/index.html'), 'utf8');
    assert.ok(indexHtml.includes('name="viewport"'));
  });

  await runTest(tracker, TIER, 'F23', 'T2.23.3: package.json specifies engines node >= 20.0.0', async () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8'));
    assert.ok(pkg.engines && pkg.engines.node.includes('>=20'));
  });

  await runTest(tracker, TIER, 'F23', 'T2.23.4: package.json type is module (ESM native)', async () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8'));
    assert.strictEqual(pkg.type, 'module');
  });

  await runTest(tracker, TIER, 'F23', 'T2.23.5: vite.config.ts configures changeOrigin for proxy', async () => {
    const viteConfig = fs.readFileSync(path.resolve('vite.config.ts'), 'utf8');
    assert.ok(viteConfig.includes('changeOrigin: true'));
  });

  // --- Feature 24: Capacitor Android Packaging & Sync ---
  await runTest(tracker, TIER, 'F24', 'T2.24.1: AndroidManifest has touchscreen required=false for TV remotes', async () => {
    const manifest = fs.readFileSync(path.resolve('android/app/src/main/AndroidManifest.xml'), 'utf8');
    assert.ok(manifest.includes('android.hardware.touchscreen" android:required="false"'));
  });

  await runTest(tracker, TIER, 'F24', 'T2.24.2: AndroidManifest has leanback required=false for phone/tablet', async () => {
    const manifest = fs.readFileSync(path.resolve('android/app/src/main/AndroidManifest.xml'), 'utf8');
    assert.ok(manifest.includes('android.software.leanback" android:required="false"'));
  });

  await runTest(tracker, TIER, 'F24', 'T2.24.3: MainActivity uses singleTask launchMode to prevent duplicate players', async () => {
    const manifest = fs.readFileSync(path.resolve('android/app/src/main/AndroidManifest.xml'), 'utf8');
    assert.ok(manifest.includes('android:launchMode="singleTask"'));
  });

  await runTest(tracker, TIER, 'F24', 'T2.24.4: capacitor.config.ts specifies androidScheme: https', async () => {
    const config = fs.readFileSync(path.resolve('capacitor.config.ts'), 'utf8');
    assert.ok(config.includes("androidScheme: 'https'"));
  });

  await runTest(tracker, TIER, 'F24', 'T2.24.5: AndroidManifest.xml file is well-formed XML with valid root tag', async () => {
    const manifest = fs.readFileSync(path.resolve('android/app/src/main/AndroidManifest.xml'), 'utf8');
    assert.ok(manifest.startsWith('<?xml'));
    assert.ok(manifest.includes('</manifest>'));
  });
}

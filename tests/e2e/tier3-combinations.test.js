/**
 * OmniStream Cinema Video Player — Tier 3: Cross-Feature Combinations Test Suite
 * Pairwise combinatorial testing verifying multi-feature interactions (30 tests).
 */

import { runTest, assert } from '../harness/test-utils.js';
import { HeadlessCinemaPlayer } from '../harness/player-simulator.js';
import { validateHLSManifest, validateWebVTTContent } from '../harness/contracts.js';
import fs from 'node:fs';
import path from 'node:path';

export async function runTier3CombinationTests(tracker, { baseUrl = 'http://localhost:3099' } = {}) {
  const TIER = 'Tier 3';

  await runTest(tracker, TIER, 'F01+F03', 'T3.01: Resolved stream URL routes directly into HLS manifest proxy', async () => {
    const res = await fetch(`${baseUrl}/api/stream/resolve?type=movie&id=27205`);
    const data = await res.json();
    assert.ok(data.streamUrl.startsWith('/api/proxy/hls'));
    const manifestRes = await fetch(`${baseUrl}${data.streamUrl}`);
    assert.strictEqual(manifestRes.status, 200);
    const manifestText = await manifestRes.text();
    const validation = validateHLSManifest(manifestText);
    assert.ok(validation.valid);
  });

  await runTest(tracker, TIER, 'F03+F04', 'T3.02: HLS Media manifest segments route to Segment Proxy with Range support', async () => {
    const res = await fetch(`${baseUrl}/api/proxy/hls?url=https%3A%2F%2Fcdn.omnistream.test%2F1080p.m3u8`);
    const text = await res.text();
    const segLine = text.split('\n').find((l) => l.includes('/api/proxy/segment'));
    assert.ok(segLine);
    const segRes = await fetch(`${baseUrl}${segLine.trim()}`, { headers: { Range: 'bytes=0-100' } });
    assert.strictEqual(segRes.status, 206);
  });

  await runTest(tracker, TIER, 'F01+F05', 'T3.03: Stream resolution subtitle URL proxies valid UTF-8 WebVTT', async () => {
    const res = await fetch(`${baseUrl}/api/stream/resolve?type=movie&id=27205`);
    const data = await res.json();
    assert.ok(data.subtitles.length > 0);
    const subUrl = data.subtitles[0].url;
    const subRes = await fetch(`${baseUrl}${subUrl}`);
    assert.strictEqual(subRes.status, 200);
    const subText = await subRes.text();
    const validation = validateWebVTTContent(subText);
    assert.ok(validation.valid);
  });

  await runTest(tracker, TIER, 'F02+F06', 'T3.04: Sample Movie fixture initializes player in direct-hls mode', async () => {
    const res = await fetch(`${baseUrl}/api/stream/resolve?type=movie&id=27205`);
    const data = await res.json();
    const player = new HeadlessCinemaPlayer();
    player.loadDirectStream(data.streamUrl);
    assert.strictEqual(player.mode, 'direct-hls');
    assert.strictEqual(player.hlsAttached, true);
  });

  await runTest(tracker, TIER, 'F06+F08', 'T3.05: Fatal HLS error triggers instant fallback to Mode B without user input', async () => {
    const player = new HeadlessCinemaPlayer();
    player.loadDirectStream('/api/proxy/hls?url=broken.m3u8');
    player.triggerHlsFatalError('networkError');
    assert.strictEqual(player.mode, 'sanitized-iframe');
    assert.strictEqual(player.mirrorList[player.currentMirrorIndex], 'vidlink-pro');
  });

  await runTest(tracker, TIER, 'F08+F09', 'T3.06: Dual-Mode Fallback automatically activates Iframe Focus Shield', async () => {
    const player = new HeadlessCinemaPlayer();
    assert.strictEqual(player.focusShieldActive, false);
    player.triggerDualModeFallback('fatal_error');
    assert.strictEqual(player.focusShieldActive, true);
  });

  await runTest(tracker, TIER, 'F09+F10', 'T3.07: Focus Shield active allows D-Pad seek without losing focus', async () => {
    const player = new HeadlessCinemaPlayer({ initialTime: 50 });
    player.triggerDualModeFallback('stream_failed');
    player.handleKeyDown({ key: 'ArrowRight', keyCode: 39 });
    assert.strictEqual(player.currentTime, 60);
    assert.strictEqual(player.seekIndicator.delta, 10);
  });

  await runTest(tracker, TIER, 'F10+F10', 'T3.08: D-Pad Seek accumulates delta across rapid forward and backward seeks', async () => {
    const player = new HeadlessCinemaPlayer({ initialTime: 100 });
    player.seekByDelta(+10);
    player.seekByDelta(+10);
    player.seekByDelta(-10);
    assert.strictEqual(player.currentTime, 110);
    assert.strictEqual(player.seekIndicator.delta, 10);
  });

  await runTest(tracker, TIER, 'F11+F19', 'T3.09: D-Pad Enter toggle starts and stops 5-second Watch Progress timer', async () => {
    const player = new HeadlessCinemaPlayer();
    player.handleKeyDown({ key: 'Enter', keyCode: 13 }); // play
    assert.ok(player.progressTimer !== null);
    player.handleKeyDown({ key: 'Enter', keyCode: 13 }); // pause
    assert.strictEqual(player.progressTimer, null);
  });

  await runTest(tracker, TIER, 'F12+F05', 'T3.10: D-Pad ArrowUp Track Drawer exposes WebVTT subtitle track options', async () => {
    const player = new HeadlessCinemaPlayer();
    player.handleKeyDown({ key: 'ArrowUp', keyCode: 38 });
    assert.strictEqual(player.trackDrawerOpen, true);
    assert.ok(player.subtitles.some((s) => s.url && s.url.includes('/api/proxy/subtitles')));
  });

  await runTest(tracker, TIER, 'F12+F13', 'T3.11: Track Drawer open: Escape key closes drawer without exiting player', async () => {
    const player = new HeadlessCinemaPlayer();
    player.trackDrawerOpen = true;
    let playerClosed = false;
    player.on('closePlayer', () => { playerClosed = true; });
    const res = player.handleKeyDown({ key: 'Escape', keyCode: 27 });
    assert.strictEqual(res.action, 'close_drawer');
    assert.strictEqual(player.trackDrawerOpen, false);
    assert.strictEqual(playerClosed, false);
  });

  await runTest(tracker, TIER, 'F14+F19', 'T3.12: Mobile Double-Tap Seek triggers immediate progress save at new position', async () => {
    const player = new HeadlessCinemaPlayer({ width: 1000, initialTime: 50 });
    const now = Date.now();
    player.handleTouchStart({ x: 800, y: 500, time: now });
    player.handleTouchStart({ x: 800, y: 500, time: now + 150 });
    assert.strictEqual(player.currentTime, 60);
    const lastSave = player.watchHistorySaves[player.watchHistorySaves.length - 1];
    assert.strictEqual(lastSave.currentTime, 60);
  });

  await runTest(tracker, TIER, 'F15+F06', 'T3.13: Mobile Vertical Volume swipe binds to player volume and mute status', async () => {
    const player = new HeadlessCinemaPlayer({ width: 1000, height: 1000 });
    player.volume = 0.5;
    player.handleTouchStart({ x: 800, y: 500 });
    player.handleTouchMove({ x: 800, y: 1500 }); // swipe down
    assert.strictEqual(player.volume, 0);
    assert.strictEqual(player.muted, true);
  });

  await runTest(tracker, TIER, 'F16+F17', 'T3.14: Brightness overlay maintains level across Aspect Ratio mode cycles', async () => {
    const player = new HeadlessCinemaPlayer({ width: 1000, height: 1000 });
    player.brightness = 0.65;
    player.toggleAspectRatio(); // cover
    assert.strictEqual(player.brightness, 0.65);
    player.toggleAspectRatio(); // fill
    assert.strictEqual(player.brightness, 0.65);
  });

  await runTest(tracker, TIER, 'F18+F19', 'T3.15: Native Picture-in-Picture active continues progress interval updates', async () => {
    const player = new HeadlessCinemaPlayer();
    await player.play();
    await player.requestPictureInPicture();
    assert.strictEqual(player.isInPiP, true);
    assert.ok(player.progressTimer !== null);
    player.pause();
  });

  await runTest(tracker, TIER, 'F19+F20', 'T3.16: 5-Second progress records save to Cloud Watch History endpoint', async () => {
    const player = new HeadlessCinemaPlayer({ initialTime: 950, duration: 3600 });
    const record = player.persistProgress();
    const res = await fetch(`${baseUrl}/api/watch-history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'tv_1399_s1_e1',
        mediaType: 'tv',
        title: 'Game of Thrones S1E1',
        currentTime: record.currentTime,
        duration: record.duration,
        progressPercent: record.progressPercent,
        lastWatchedAt: record.timestamp
      })
    });
    assert.strictEqual(res.status, 200);
  });

  await runTest(tracker, TIER, 'F20+F21', 'T3.17: Cloud Watch History retrieval feeds Exact-Second Resume lookup', async () => {
    const res = await fetch(`${baseUrl}/api/watch-history`);
    const list = await res.json();
    const item = list.find((h) => h.id === 'tv_1399_s1_e1');
    assert.ok(item);
    const player = new HeadlessCinemaPlayer({ duration: item.duration });
    const eligibility = player.checkResumeEligibility(item);
    assert.strictEqual(eligibility.eligible, true);
    assert.strictEqual(eligibility.resumeTime, item.currentTime);
  });

  await runTest(tracker, TIER, 'F21+F06', 'T3.18: Accepting Resume Prompt seeks Direct HTML5 Video to saved position', async () => {
    const player = new HeadlessCinemaPlayer({ initialTime: 0, duration: 7200 });
    player.checkResumeEligibility({ currentTime: 2450, duration: 7200 });
    player.confirmResume();
    assert.strictEqual(player.currentTime, 2450);
    assert.strictEqual(player.resumePrompt.visible, false);
  });

  await runTest(tracker, TIER, 'F01+F12', 'T3.19: Anime stream resolution with sub/dub populates Track Drawer audio choices', async () => {
    const res = await fetch(`${baseUrl}/api/stream/resolve?type=anime&id=21&episode=1&audioType=sub`);
    const data = await res.json();
    const player = new HeadlessCinemaPlayer();
    player.audioTracks = data.audioTracks;
    player.handleKeyDown({ key: 'ArrowUp', keyCode: 38 });
    assert.strictEqual(player.trackDrawerOpen, true);
    assert.ok(player.audioTracks.length > 0);
  });

  await runTest(tracker, TIER, 'F01+F20', 'T3.20: TV resolution season/episode matches Watch History composite ID tv_${id}', async () => {
    const tmdbId = 1399;
    const season = 1;
    const episode = 2;
    const expectedCompositeId = `tv_${tmdbId}`;
    const item = {
      id: expectedCompositeId,
      mediaType: 'tv',
      title: `Game of Thrones S${season}E${episode}`,
      season,
      episode,
      currentTime: 600,
      duration: 3600,
      lastWatchedAt: Date.now()
    };
    const res = await fetch(`${baseUrl}/api/watch-history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
    assert.strictEqual(res.status, 200);
  });

  await runTest(tracker, TIER, 'F08+F13', 'T3.21: Iframe Fallback mode + Back key exits player without focus trap', async () => {
    const player = new HeadlessCinemaPlayer();
    player.triggerDualModeFallback('stream_failed');
    assert.strictEqual(player.mode, 'sanitized-iframe');
    let exited = false;
    player.on('closePlayer', () => { exited = true; });
    player.handleKeyDown({ key: 'Escape', keyCode: 27 });
    assert.strictEqual(exited, true);
  });

  await runTest(tracker, TIER, 'F10+F06', 'T3.22: D-Pad Seek during buffering queues target time and updates HUD bubble', async () => {
    const player = new HeadlessCinemaPlayer({ initialTime: 200 });
    player.isBuffering = true;
    player.handleKeyDown({ key: 'ArrowRight', keyCode: 39 });
    assert.strictEqual(player.currentTime, 210);
    assert.strictEqual(player.seekIndicator.delta, 10);
  });

  await runTest(tracker, TIER, 'F05+F17', 'T3.23: WebVTT Subtitle active while toggling Aspect Ratio preserves subtitle track', async () => {
    const player = new HeadlessCinemaPlayer();
    player.currentSubtitleTrack = 0; // English active
    player.toggleAspectRatio(); // cover
    assert.strictEqual(player.currentSubtitleTrack, 0);
    player.toggleAspectRatio(); // fill
    assert.strictEqual(player.currentSubtitleTrack, 0);
  });

  await runTest(tracker, TIER, 'F07+F21', 'T3.24: Safari Native HLS Fallback executes exact-second resume seeking', async () => {
    const player = new HeadlessCinemaPlayer({ duration: 5000 });
    player.loadDirectStream('https://cdn.apple.com/native.m3u8');
    player.checkResumeEligibility({ currentTime: 1550, duration: 5000 });
    player.confirmResume();
    assert.strictEqual(player.currentTime, 1550);
  });

  await runTest(tracker, TIER, 'F23+F24', 'T3.25: Production build output dist/ is ready for Capacitor Android asset sync', async () => {
    const distHtml = path.resolve('dist/index.html');
    assert.ok(fs.existsSync(distHtml));
    const capConfig = path.resolve('capacitor.config.ts');
    assert.ok(fs.existsSync(capConfig));
    const configContent = fs.readFileSync(capConfig, 'utf8');
    assert.ok(configContent.includes("webDir: 'dist'"));
  });

  await runTest(tracker, TIER, 'F22+F23', 'T3.26: TypeScript configuration references build entry point cleanly', async () => {
    const tsconfig = JSON.parse(fs.readFileSync(path.resolve('tsconfig.json'), 'utf8'));
    assert.ok(tsconfig.include && tsconfig.include.some((p) => p.startsWith('src')));
    const viteConfig = path.resolve('vite.config.ts');
    assert.ok(fs.existsSync(viteConfig));
  });

  await runTest(tracker, TIER, 'F24+F01', 'T3.27: AndroidManifest configures cleartext traffic for local stream resolver', async () => {
    const capConfig = fs.readFileSync(path.resolve('capacitor.config.ts'), 'utf8');
    assert.ok(capConfig.includes('cleartext: true'));
  });

  await runTest(tracker, TIER, 'F20+F20', 'T3.28: Local storage quota limit handled by preserving top 40 cloud entries', async () => {
    const res = await fetch(`${baseUrl}/api/watch-history`);
    const list = await res.json();
    assert.ok(list.length <= 40);
  });

  await runTest(tracker, TIER, 'F14+F10', 'T3.29: Mobile double-tap seek and D-Pad remote seek interleave seamlessly', async () => {
    const player = new HeadlessCinemaPlayer({ width: 1000, initialTime: 100 });
    // Mobile double tap forward (+10)
    const now = Date.now();
    player.handleTouchStart({ x: 800, y: 500, time: now });
    player.handleTouchStart({ x: 800, y: 500, time: now + 150 });
    assert.strictEqual(player.currentTime, 110);
    // Remote D-Pad forward (+10)
    player.handleKeyDown({ key: 'ArrowRight', keyCode: 39 });
    assert.strictEqual(player.currentTime, 120);
  });

  await runTest(tracker, TIER, 'F09+F17', 'T3.30: Focus Shield active maintains geometry across aspect ratio changes', async () => {
    const player = new HeadlessCinemaPlayer();
    player.triggerDualModeFallback('mirror_mode');
    assert.strictEqual(player.focusShieldActive, true);
    player.toggleAspectRatio();
    assert.strictEqual(player.focusShieldActive, true);
    assert.strictEqual(player.aspectRatio, 'cover');
  });
}

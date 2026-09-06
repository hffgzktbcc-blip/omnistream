/**
 * OmniStream Cinema Video Player — Headless Player State Machine Simulator
 * Simulates HTML5 <video>, hls.js lifecycle, 10-foot TV D-Pad navigation,
 * mobile touch gestures, dual-mode fallback, and 5s watch progress tracking.
 */

import { EventEmitter } from 'node:events';
import { DPAD_KEYS } from './contracts.js';

export class HeadlessCinemaPlayer extends EventEmitter {
  constructor(options = {}) {
    super();
    this.viewportWidth = options.width || 1920;
    this.viewportHeight = options.height || 1080;

    // Playback State
    this.currentTime = options.initialTime || 0;
    this.duration = options.duration || 7200; // 2 hour default movie
    this.paused = true;
    this.volume = 1.0;
    this.muted = false;
    this.playbackRate = 1.0;
    this.brightness = 1.0;
    this.aspectRatio = 'contain'; // 'contain' | 'cover' | 'fill'
    this.isBuffering = false;

    // Dual-Mode Engine State
    this.mode = 'direct-hls'; // 'direct-hls' (Mode A) | 'sanitized-iframe' (Mode B)
    this.currentMirrorIndex = 0;
    this.mirrorList = [
      'vidlink-pro', 'vidsrc-to', 'vidsrc-su', 'videasy',
      'multiembed', '2embed', 'vidsrc-pm', 'smashystream'
    ];
    this.exhaustedMirrors = false;
    this.focusShieldActive = false;

    // HLS & Tracks
    this.hlsAttached = false;
    this.currentStreamUrl = null;
    this.audioTracks = [
      { id: 0, label: 'English (Original)', language: 'en' },
      { id: 1, label: 'Japanese', language: 'ja' }
    ];
    this.currentAudioTrack = 0;
    this.subtitles = [
      { id: -1, label: 'Off', language: 'off' },
      { id: 0, label: 'English', language: 'en', url: '/api/proxy/subtitles?url=en.vtt' },
      { id: 1, label: 'Spanish', language: 'es', url: '/api/proxy/subtitles?url=es.vtt' }
    ];
    this.currentSubtitleTrack = -1; // Off by default

    // Remote Navigation & UI Overlays
    this.trackDrawerOpen = false;
    this.seekIndicator = { visible: false, delta: 0, targetTime: 0 };
    this.volumeHud = { visible: false, level: 100 };
    this.brightnessHud = { visible: false, level: 100 };
    this.resumePrompt = { visible: false, resumeTime: 0, formattedTime: '' };
    this.isDestroyed = false;
    this.isInPiP = false;
    this.isAirPlayActive = false;

    // Watch Progress Heartbeat (5-second interval)
    this.progressIntervalMs = 5000;
    this.progressTimer = null;
    this.watchHistorySaves = [];

    // Touch Gesture Tracking
    this.lastTap = null;
    this.touchStartPoint = null;
  }

  // --- Playback Engine ---

  async play() {
    if (this.isDestroyed) throw new Error('Player is destroyed');
    this.paused = false;
    this.isBuffering = false;
    this.emit('play');
    this.startProgressHeartbeat();
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
    this.emit('pause');
    this.stopProgressHeartbeat();
    this.persistProgress(); // Immediate persist on pause
  }

  togglePlayPause() {
    if (this.paused) {
      return this.play();
    } else {
      this.pause();
      return Promise.resolve();
    }
  }

  seek(targetTime) {
    const clamped = Math.max(0, Math.min(this.duration, targetTime));
    this.currentTime = Math.round(clamped);
    this.emit('seeked', this.currentTime);
    this.persistProgress(); // Immediate persist on seek
    return this.currentTime;
  }

  seekByDelta(delta) {
    const newTarget = this.currentTime + delta;
    this.seek(newTarget);

    // Update visible seek indicator bubble
    if (this.seekIndicator.visible) {
      this.seekIndicator.delta += delta;
    } else {
      this.seekIndicator = { visible: true, delta, targetTime: this.currentTime };
    }
    this.emit('seekIndicator', { ...this.seekIndicator });
    return this.currentTime;
  }

  // --- Dual-Mode Fallback & HLS Lifecycle ---

  loadDirectStream(streamUrl) {
    if (!streamUrl) {
      this.triggerDualModeFallback('Invalid stream URL');
      return;
    }
    this.mode = 'direct-hls';
    this.focusShieldActive = false;
    this.currentStreamUrl = streamUrl;
    this.hlsAttached = true;
    this.emit('hlsLoaded', streamUrl);
  }

  triggerHlsFatalError(errorType = 'networkError') {
    this.emit('hlsError', { fatal: true, type: errorType });
    this.triggerDualModeFallback(`HLS Fatal: ${errorType}`);
  }

  triggerDualModeFallback(reason) {
    this.mode = 'sanitized-iframe';
    this.hlsAttached = false;
    this.focusShieldActive = true; // Mount focus shield over iframe
    this.currentMirrorIndex = 0;
    this.emit('modeChange', { mode: 'sanitized-iframe', reason, mirror: this.mirrorList[0] });
  }

  nextMirror() {
    if (this.currentMirrorIndex < this.mirrorList.length - 1) {
      this.currentMirrorIndex += 1;
      this.emit('mirrorRotated', { index: this.currentMirrorIndex, mirror: this.mirrorList[this.currentMirrorIndex] });
    } else {
      this.exhaustedMirrors = true;
      this.emit('mirrorsExhausted');
    }
  }

  // --- 10-Foot D-Pad Remote Navigation ---

  handleKeyDown(event) {
    const { key, keyCode } = event;

    // ArrowLeft / DPAD_LEFT: Seek -10s
    if (key === 'ArrowLeft' || keyCode === DPAD_KEYS.ARROW_LEFT.keyCode || keyCode === DPAD_KEYS.ARROW_LEFT.androidCode) {
      this.seekByDelta(-10);
      return { handled: true, action: 'seek_backward_10s', currentTime: this.currentTime };
    }

    // ArrowRight / DPAD_RIGHT: Seek +10s
    if (key === 'ArrowRight' || keyCode === DPAD_KEYS.ARROW_RIGHT.keyCode || keyCode === DPAD_KEYS.ARROW_RIGHT.androidCode) {
      this.seekByDelta(+10);
      return { handled: true, action: 'seek_forward_10s', currentTime: this.currentTime };
    }

    // Enter / DPAD_CENTER / NUMPAD_ENTER: Toggle Play/Pause
    if (key === 'Enter' || keyCode === DPAD_KEYS.ENTER.keyCode || keyCode === DPAD_KEYS.ENTER.androidCode || keyCode === DPAD_KEYS.ENTER.numpadCode) {
      this.togglePlayPause();
      return { handled: true, action: 'toggle_play_pause', paused: this.paused };
    }

    // ArrowUp / DPAD_UP / ArrowDown / DPAD_DOWN: Track Drawer Toggle
    if (
      key === 'ArrowUp' || keyCode === DPAD_KEYS.ARROW_UP.keyCode || keyCode === DPAD_KEYS.ARROW_UP.androidCode ||
      key === 'ArrowDown' || keyCode === DPAD_KEYS.ARROW_DOWN.keyCode || keyCode === DPAD_KEYS.ARROW_DOWN.androidCode
    ) {
      this.trackDrawerOpen = !this.trackDrawerOpen;
      this.emit('drawerToggled', this.trackDrawerOpen);
      return { handled: true, action: 'toggle_track_drawer', isOpen: this.trackDrawerOpen };
    }

    // Escape / KEYCODE_BACK: Close drawer if open, else exit player
    if (key === 'Escape' || keyCode === DPAD_KEYS.ESCAPE.keyCode || keyCode === DPAD_KEYS.ESCAPE.androidCode) {
      if (this.trackDrawerOpen) {
        this.trackDrawerOpen = false;
        this.emit('drawerToggled', false);
        return { handled: true, action: 'close_drawer' };
      } else if (this.resumePrompt.visible) {
        this.resumePrompt.visible = false;
        return { handled: true, action: 'dismiss_resume_prompt' };
      } else {
        this.destroy();
        this.emit('closePlayer');
        return { handled: true, action: 'exit_player' };
      }
    }

    return { handled: false };
  }

  // --- Mobile Touch Gestures ---

  handleTouchStart({ x, y, time = Date.now() }) {
    this.touchStartPoint = { x, y, time };

    // Check double-tap
    if (this.lastTap && (time - this.lastTap.time) <= 300) {
      const isLeft = x < (this.viewportWidth / 2);
      const isSameSide = (this.lastTap.x < (this.viewportWidth / 2)) === isLeft;

      if (isSameSide) {
        const delta = isLeft ? -10 : +10;
        this.seekByDelta(delta);
        this.lastTap = null;
        return { gesture: 'double_tap_seek', side: isLeft ? 'left' : 'right', delta, currentTime: this.currentTime };
      }
    }

    this.lastTap = { x, y, time };
    return { gesture: 'touch_start' };
  }

  handleTouchMove({ x, y, time = Date.now() }) {
    if (!this.touchStartPoint) return { gesture: 'none' };
    const deltaY = this.touchStartPoint.y - y; // positive = swipe up
    const deltaX = x - this.touchStartPoint.x;

    // Verify vertical dominance
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 10) {
      const isRightSide = this.touchStartPoint.x >= (this.viewportWidth / 2);

      if (isRightSide) {
        // Volume Control (0.0 to 1.0)
        const step = (deltaY / this.viewportHeight);
        this.volume = Math.max(0.0, Math.min(1.0, Number((this.volume + step).toFixed(2))));
        this.muted = this.volume === 0;
        this.volumeHud = { visible: true, level: Math.round(this.volume * 100) };
        this.emit('volumeChange', this.volume);
        return { gesture: 'vertical_swipe_volume', volume: this.volume, percent: this.volumeHud.level };
      } else {
        // Brightness Control (0.1 to 1.0)
        const step = (deltaY / this.viewportHeight);
        this.brightness = Math.max(0.1, Math.min(1.0, Number((this.brightness + step).toFixed(2))));
        this.brightnessHud = { visible: true, level: Math.round(this.brightness * 100) };
        this.emit('brightnessChange', this.brightness);
        return { gesture: 'vertical_swipe_brightness', brightness: this.brightness, percent: this.brightnessHud.level };
      }
    }

    return { gesture: 'touch_move' };
  }

  handleTouchEnd() {
    this.touchStartPoint = null;
    return { gesture: 'touch_end' };
  }

  toggleAspectRatio() {
    const modes = ['contain', 'cover', 'fill'];
    const currentIdx = modes.indexOf(this.aspectRatio);
    this.aspectRatio = modes[(currentIdx + 1) % modes.length];
    this.emit('aspectRatioChange', this.aspectRatio);
    return this.aspectRatio;
  }

  // --- Picture-in-Picture & AirPlay ---

  async requestPictureInPicture() {
    this.isInPiP = true;
    this.emit('enterpictureinpicture');
    return true;
  }

  async exitPictureInPicture() {
    this.isInPiP = false;
    this.emit('leavepictureinpicture');
    return true;
  }

  showAirPlayPicker() {
    this.isAirPlayActive = true;
    this.emit('airplayActivated');
    return true;
  }

  // --- Watch History Heartbeat (5s interval) & Resume ---

  startProgressHeartbeat() {
    if (this.progressTimer) clearInterval(this.progressTimer);
    this.progressTimer = setInterval(() => {
      this.persistProgress();
    }, this.progressIntervalMs);
  }

  stopProgressHeartbeat() {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
  }

  persistProgress() {
    const roundedSeconds = Math.round(this.currentTime);
    const percent = this.duration > 0
      ? Math.min(100, Math.round((roundedSeconds / this.duration) * 100))
      : 0;

    const record = {
      currentTime: roundedSeconds,
      duration: Math.round(this.duration),
      progressPercent: percent,
      timestamp: Date.now()
    };

    this.watchHistorySaves.push(record);
    this.emit('progressPersisted', record);
    return record;
  }

  checkResumeEligibility(savedPosition) {
    if (!savedPosition || typeof savedPosition.currentTime !== 'number') {
      return { eligible: false };
    }

    const { currentTime, duration = this.duration } = savedPosition;
    const progressPercent = (currentTime / duration) * 100;

    // Eligible if watched > 5 seconds and not completed (< 95%)
    if (currentTime > 5 && progressPercent < 95) {
      const minutes = Math.floor(currentTime / 60);
      const seconds = Math.floor(currentTime % 60);
      const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

      this.resumePrompt = {
        visible: true,
        resumeTime: currentTime,
        formattedTime: formatted
      };
      return { eligible: true, resumeTime: currentTime, formattedTime: formatted };
    }

    return { eligible: false, reason: progressPercent >= 95 ? 'completed' : 'too_short' };
  }

  confirmResume() {
    if (this.resumePrompt.visible && this.resumePrompt.resumeTime > 0) {
      this.seek(this.resumePrompt.resumeTime);
      this.resumePrompt.visible = false;
      return this.currentTime;
    }
    return 0;
  }

  startOver() {
    this.seek(0);
    this.resumePrompt.visible = false;
    return 0;
  }

  destroy() {
    this.stopProgressHeartbeat();
    this.persistProgress();
    this.isDestroyed = true;
    this.hlsAttached = false;
    if (this.isInPiP) this.exitPictureInPicture();
    this.emit('destroyed');
  }
}

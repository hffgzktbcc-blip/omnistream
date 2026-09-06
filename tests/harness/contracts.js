/**
 * OmniStream Cinema Video Player — Interface Contracts & Schemas
 * Authoritative specification definitions for Tiers 1-4 E2E verification.
 */

export const FEATURES = {
  F01: { id: 'F01', name: 'Direct Stream Resolver Endpoint', milestone: 'M1', endpoint: '/api/stream/resolve' },
  F02: { id: 'F02', name: 'Sample ID Verification Fixtures', milestone: 'M1', sampleIds: { movie: 27205, tv: 1399, anime: [21, 151807] } },
  F03: { id: 'F03', name: 'HLS Manifest Rewriter & Proxy', milestone: 'M1', endpoint: '/api/proxy/hls' },
  F04: { id: 'F04', name: 'Binary Segment Streaming Proxy', milestone: 'M1', endpoint: '/api/proxy/segment' },
  F05: { id: 'F05', name: 'WebVTT Subtitle Proxy', milestone: 'M1', endpoint: '/api/proxy/subtitles' },
  F06: { id: 'F06', name: 'Direct HTML5 Video Player', milestone: 'M2', component: 'CinemaPlayer' },
  F07: { id: 'F07', name: 'Native Safari HLS Fallback', milestone: 'M2', capability: 'application/vnd.apple.mpegurl' },
  F08: { id: 'F08', name: 'Seamless Dual-Mode Fallback', milestone: 'M2', fallback: 'SanitizedIframe' },
  F09: { id: 'F09', name: 'Iframe Focus Trap Prevention', milestone: 'M2', component: 'FocusShield' },
  F10: { id: 'F10', name: '10-Foot D-Pad Left/Right Seek', milestone: 'M2', keys: ['ArrowLeft', 'ArrowRight'] },
  F11: { id: 'F11', name: '10-Foot D-Pad Center Play/Pause', milestone: 'M2', keys: ['Enter', 'DPAD_CENTER'] },
  F12: { id: 'F12', name: '10-Foot D-Pad Track Drawer', milestone: 'M2', keys: ['ArrowUp', 'ArrowDown'] },
  F13: { id: 'F13', name: 'Back to Exit Handler', milestone: 'M2', keys: ['Escape', 'KEYCODE_BACK'] },
  F14: { id: 'F14', name: 'Mobile Double-Tap Seek Gestures', milestone: 'M2', gesture: 'double-tap' },
  F15: { id: 'F15', name: 'Mobile Vertical Swipe Volume', milestone: 'M2', gesture: 'swipe-y-right' },
  F16: { id: 'F16', name: 'Mobile Vertical Swipe Brightness', milestone: 'M2', gesture: 'swipe-y-left' },
  F17: { id: 'F17', name: 'Aspect Ratio Toggling', milestone: 'M2', modes: ['contain', 'cover', 'fill'] },
  F18: { id: 'F18', name: 'Native Picture-in-Picture & AirPlay', milestone: 'M2', apis: ['requestPictureInPicture', 'webkitShowPlaybackTargetPicker'] },
  F19: { id: 'F19', name: '5-Second Interval Watch Progress', milestone: 'M3', intervalMs: 5000 },
  F20: { id: 'F20', name: 'Local & Cloud Watch History Sync', milestone: 'M3', endpoint: '/api/watch-history' },
  F21: { id: 'F21', name: 'Exact-Second Resume Behavior', milestone: 'M3', component: 'ResumePrompt' },
  F22: { id: 'F22', name: 'TypeScript Error Remediation', milestone: 'M4', command: 'npx tsc --noEmit' },
  F23: { id: 'F23', name: 'Clean Production Build Verification', milestone: 'M4', command: 'npm run build' },
  F24: { id: 'F24', name: 'Capacitor Android Packaging & Sync', milestone: 'M4', command: 'npx cap copy android' },
};

export const DPAD_KEYS = {
  ARROW_LEFT: { key: 'ArrowLeft', keyCode: 37, androidCode: 21 },
  ARROW_RIGHT: { key: 'ArrowRight', keyCode: 39, androidCode: 22 },
  ARROW_UP: { key: 'ArrowUp', keyCode: 38, androidCode: 19 },
  ARROW_DOWN: { key: 'ArrowDown', keyCode: 40, androidCode: 20 },
  ENTER: { key: 'Enter', keyCode: 13, androidCode: 23, numpadCode: 66 },
  ESCAPE: { key: 'Escape', keyCode: 27, androidCode: 4 },
};

/**
 * Validates stream resolver endpoint response format per PROJECT.md interface contract.
 */
export function validateStreamResolveResponse(data) {
  const errors = [];
  if (typeof data !== 'object' || data === null) {
    return { valid: false, errors: ['Response must be a non-null object'] };
  }

  if (typeof data.success !== 'boolean') {
    errors.push('data.success must be a boolean');
  }

  if (data.success) {
    if (typeof data.streamUrl !== 'string' || data.streamUrl.length === 0) {
      errors.push('data.streamUrl must be a non-empty string');
    }

    if (!Array.isArray(data.qualities)) {
      errors.push('data.qualities must be an array');
    } else {
      data.qualities.forEach((q, idx) => {
        if (!q.label || typeof q.url !== 'string') {
          errors.push(`qualities[${idx}] must contain label and url string`);
        }
      });
    }

    if (!Array.isArray(data.subtitles)) {
      errors.push('data.subtitles must be an array');
    } else {
      data.subtitles.forEach((s, idx) => {
        if (!s.label || typeof s.url !== 'string') {
          errors.push(`subtitles[${idx}] must contain label and url string`);
        }
      });
    }

    if (!Array.isArray(data.audioTracks)) {
      errors.push('data.audioTracks must be an array');
    }

    if (data.format !== 'hls') {
      errors.push(`data.format must be 'hls', got '${data.format}'`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates WebVTT subtitle text content.
 */
export function validateWebVTTContent(text) {
  const errors = [];
  if (typeof text !== 'string') {
    return { valid: false, errors: ['Content must be a string'] };
  }

  const trimmed = text.trim();
  if (!trimmed.startsWith('WEBVTT')) {
    errors.push('WebVTT content must begin with WEBVTT signature header');
  }

  const cuePattern = /(\d{2}:)?\d{2}:\d{2}\.\d{3}\s+-->\s+(\d{2}:)?\d{2}:\d{2}\.\d{3}/;
  if (!cuePattern.test(trimmed) && trimmed.split('\n').length > 2) {
    errors.push('WebVTT does not contain valid cue timing format');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates HLS Master / Media manifest structure.
 */
export function validateHLSManifest(text) {
  const errors = [];
  if (typeof text !== 'string') {
    return { valid: false, errors: ['Manifest must be a string'] };
  }

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0 || lines[0] !== '#EXTM3U') {
    errors.push('Manifest must begin with #EXTM3U');
  }

  const isMaster = lines.some((l) => l.startsWith('#EXT-X-STREAM-INF'));
  const isMedia = lines.some((l) => l.startsWith('#EXTINF'));

  if (!isMaster && !isMedia) {
    errors.push('Manifest must contain either #EXT-X-STREAM-INF (master) or #EXTINF (media)');
  }

  return { valid: errors.length === 0, errors, isMaster, isMedia };
}

/**
 * Validates UnifiedHistoryItem schema.
 */
export function validateHistoryItem(item) {
  const errors = [];
  if (!item || typeof item !== 'object') {
    return { valid: false, errors: ['History item must be an object'] };
  }

  if (typeof item.id !== 'string' || item.id.length === 0) {
    errors.push('item.id must be a non-empty string');
  }

  const validMediaTypes = ['movie', 'tv', 'anime', 'comic', 'audiobook'];
  if (!validMediaTypes.includes(item.mediaType)) {
    errors.push(`item.mediaType must be one of ${validMediaTypes.join(', ')}`);
  }

  if (typeof item.title !== 'string') {
    errors.push('item.title must be a string');
  }

  if (item.currentTime !== undefined && typeof item.currentTime !== 'number') {
    errors.push('item.currentTime must be a number');
  }

  if (item.duration !== undefined && typeof item.duration !== 'number') {
    errors.push('item.duration must be a number');
  }

  if (item.progressPercent !== undefined) {
    if (typeof item.progressPercent !== 'number' || item.progressPercent < 0 || item.progressPercent > 100) {
      errors.push('item.progressPercent must be a number between 0 and 100');
    }
  }

  if (typeof item.lastWatchedAt !== 'number') {
    errors.push('item.lastWatchedAt must be a numeric timestamp');
  }

  return { valid: errors.length === 0, errors };
}

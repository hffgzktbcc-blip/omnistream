export type SyncMark = {
  id: string;
  ebookId: string;
  partId: string;      // which audio track this mark belongs to
  timeSec: number;      // audio timestamp
  blockIndex: number;   // matching position in the parsed ebook text
  label?: string;
};

const SYNCMARK_STORAGE_PREFIX = 'omnistream_syncmarks_';

/**
 * Given sparse marks, interpolate a continuous position in either direction.
 */
export function blockAtTime(marks: SyncMark[], currentTime: number): number | null {
  if (!marks || marks.length === 0) return null;
  const sorted = [...marks].sort((a, b) => a.timeSec - b.timeSec);

  let prev = sorted[0];
  let next: SyncMark | null = null;
  for (const m of sorted) {
    if (m.timeSec <= currentTime) {
      prev = m;
    } else {
      next = m;
      break;
    }
  }

  if (!next) return prev.blockIndex; // past the last mark — hold position

  const span = next.timeSec - prev.timeSec;
  const frac = span > 0 ? (currentTime - prev.timeSec) / span : 0;
  return Math.round(prev.blockIndex + frac * (next.blockIndex - prev.blockIndex));
}

/**
 * Given a paragraph/block index, interpolate the exact audio second.
 */
export function timeAtBlock(marks: SyncMark[], blockIndex: number): number | null {
  if (!marks || marks.length === 0) return null;
  const sorted = [...marks].sort((a, b) => a.blockIndex - b.blockIndex);

  let prev = sorted[0];
  let next: SyncMark | null = null;
  for (const m of sorted) {
    if (m.blockIndex <= blockIndex) {
      prev = m;
    } else {
      next = m;
      break;
    }
  }

  if (!next) return prev.timeSec;

  const span = next.blockIndex - prev.blockIndex;
  const frac = span > 0 ? (blockIndex - prev.blockIndex) / span : 0;
  return prev.timeSec + frac * (next.timeSec - prev.timeSec);
}

/**
 * Generates synthetic baseline sync marks if no manual marks exist,
 * allowing instant proportional immersion reading across any book and audio.
 */
export function generateAutoSyncMarks(
  ebookId: string,
  partId: string,
  totalBlocks: number,
  audioDurationSec: number
): SyncMark[] {
  if (totalBlocks <= 0 || audioDurationSec <= 0) return [];
  const marks: SyncMark[] = [];
  const count = Math.min(Math.max(totalBlocks, 10), 50);

  for (let i = 0; i <= count; i++) {
    const frac = i / count;
    marks.push({
      id: `auto_${ebookId}_${i}`,
      ebookId,
      partId,
      timeSec: Math.round(frac * audioDurationSec),
      blockIndex: Math.round(frac * (totalBlocks - 1)),
      label: `Sync Point ${i + 1}`
    });
  }

  return marks;
}

export const syncMarkStorage = {
  getMarks(ebookId: string): SyncMark[] {
    try {
      const raw = localStorage.getItem(`${SYNCMARK_STORAGE_PREFIX}${ebookId}`);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  },

  saveMarks(ebookId: string, marks: SyncMark[]) {
    try {
      localStorage.setItem(`${SYNCMARK_STORAGE_PREFIX}${ebookId}`, JSON.stringify(marks));
    } catch (e) {}
  },

  addMark(mark: SyncMark) {
    const existing = this.getMarks(mark.ebookId);
    const updated = [...existing.filter(m => m.id !== mark.id), mark].sort((a, b) => a.timeSec - b.timeSec);
    this.saveMarks(mark.ebookId, updated);
    return updated;
  },

  deleteMark(ebookId: string, markId: string) {
    const existing = this.getMarks(ebookId);
    const updated = existing.filter(m => m.id !== markId);
    this.saveMarks(ebookId, updated);
    return updated;
  }
};

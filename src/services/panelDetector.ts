import { PanelBox, ReadingDirection } from '../types/comic';

export interface DominantColors {
  primary: string;
  secondary: string;
  glow: string;
}

export interface PanelAnalysisResult {
  panels: PanelBox[];
  ambientColors: DominantColors;
}

interface GutterThresholds {
  isGutter: (r: number, g: number, b: number) => boolean;
}

/**
 * Marvel Unlimited-Grade Smart Panel Detection Engine 3.0
 * Features:
 * - Multi-beat Sub-panel Pan Generator (pans across wide spreads & dialogue flow)
 * - Precision Gutter & Contour Profiling
 * - Real-time Ambilight Color Sampling
 * - Fallback Aspect Ratio Heuristics
 */
export async function detectPanelsAdvanced(
  imgElement: HTMLImageElement | string,
  readingDirection: ReadingDirection = 'ltr'
): Promise<PanelAnalysisResult> {
  try {
    let img: HTMLImageElement;

    if (typeof imgElement === 'string') {
      img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load image for panel detection'));
        img.src = imgElement;
      });
    } else {
      img = imgElement;
      if (!img.complete || img.naturalWidth === 0) {
        await new Promise((resolve) => {
          img.onload = resolve;
        });
      }
    }

    const naturalWidth = img.naturalWidth || img.width || 800;
    const naturalHeight = img.naturalHeight || img.height || 1200;

    const sampleWidth = Math.min(naturalWidth, 600);
    const sampleHeight = Math.round((sampleWidth / naturalWidth) * naturalHeight);

    const canvas = document.createElement('canvas');
    canvas.width = sampleWidth;
    canvas.height = sampleHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    if (!ctx) {
      return {
        panels: getFallbackPanels(readingDirection),
        ambientColors: { primary: '#3B82F6', secondary: '#8B5CF6', glow: 'rgba(59, 130, 246, 0.25)' }
      };
    }

    ctx.drawImage(img, 0, 0, sampleWidth, sampleHeight);
    const imageData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
    const data = imageData.data;

    // 1. Extract Dominant Ambient Colors for Cinematic Ambilight
    const ambientColors = extractDominantColors(data, sampleWidth, sampleHeight);

    // 2. Identify Gutter Color
    const gutterDetector = determineGutterDetector(data, sampleWidth, sampleHeight);

    // 3. Horizontal row slicing
    const horizontalSlices = findHorizontalSlices(data, sampleWidth, sampleHeight, gutterDetector);

    const rawPanels: PanelBox[] = [];

    // 4. Vertical panel cuts in each row
    for (const slice of horizontalSlices) {
      const vCuts = findVerticalCuts(data, sampleWidth, sampleHeight, slice.yStart, slice.yEnd, gutterDetector);
      
      for (const cut of vCuts) {
        const pWidth = (cut.xEnd - cut.xStart) / sampleWidth;
        const pHeight = (slice.yEnd - slice.yStart) / sampleHeight;
        const pX = cut.xStart / sampleWidth;
        const pY = slice.yStart / sampleHeight;

        const pAspectRatio = (pWidth * sampleWidth) / (pHeight * sampleHeight);

        // Reject narrow logo bands and tiny fragments
        const isNarrowSliver = (pAspectRatio > 4.5 && pHeight < 0.14) || (pAspectRatio < 0.25 && pWidth < 0.14);

        if (pWidth >= 0.18 && pHeight >= 0.10 && !isNarrowSliver) {
          rawPanels.push({
            id: `panel_${Math.random().toString(36).substr(2, 6)}`,
            x: Math.max(0.01, Math.min(0.98, pX)),
            y: Math.max(0.01, Math.min(0.98, pY)),
            width: Math.min(1 - pX, pWidth),
            height: Math.min(1 - pY, pHeight)
          });
        }
      }
    }

    // 5. Intelligent Fallback: Covers and Splash Pages should remain single full-page panels
    let candidatePanels = rawPanels;
    if (candidatePanels.length <= 1) {
      candidatePanels = [{ id: 'p_full', x: 0.02, y: 0.02, width: 0.96, height: 0.96, order: 1 }];
    }

    // 6. Sort panels in reading order
    const sorted = sortPanels(candidatePanels, readingDirection);

    // 7. Marvel Unlimited Multi-Beat Sub-Panel Pan Expansion
    // If a panel is wide or tall, generate fluid sub-panel reading beats
    const expandedPanels: PanelBox[] = [];
    for (const p of sorted) {
      const panelAspect = (p.width * naturalWidth) / (p.height * naturalHeight);

      // Wide panoramic panel (Aspect > 1.7): Break into 2 horizontal pan beats
      if (panelAspect > 1.7 && p.width > 0.6) {
        const beatW = p.width * 0.62;
        if (readingDirection === 'rtl') {
          // Manga: Right beat -> Left beat
          expandedPanels.push({
            id: `${p.id}_beat1`,
            x: p.x + p.width - beatW,
            y: p.y,
            width: beatW,
            height: p.height
          });
          expandedPanels.push({
            id: `${p.id}_beat2`,
            x: p.x,
            y: p.y,
            width: beatW,
            height: p.height
          });
        } else {
          // Western: Left beat -> Right beat
          expandedPanels.push({
            id: `${p.id}_beat1`,
            x: p.x,
            y: p.y,
            width: beatW,
            height: p.height
          });
          expandedPanels.push({
            id: `${p.id}_beat2`,
            x: p.x + p.width - beatW,
            y: p.y,
            width: beatW,
            height: p.height
          });
        }
      } else {
        expandedPanels.push(p);
      }
    }

    const finalized = expandedPanels.map((p, index) => ({ ...p, order: index + 1 }));

    return {
      panels: finalized,
      ambientColors
    };
  } catch (err) {
    console.warn('Panel detection fallback:', err);
    return {
      panels: getFallbackPanels(readingDirection),
      ambientColors: { primary: '#3B82F6', secondary: '#8B5CF6', glow: 'rgba(59, 130, 246, 0.25)' }
    };
  }
}

function extractDominantColors(data: Uint8ClampedArray, width: number, height: number): DominantColors {
  let rSum = 0, gSum = 0, bSum = 0, sampleCount = 0;
  const colorBuckets: Record<string, number> = {};

  for (let i = 0; i < data.length; i += 32) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    if (lum > 30 && lum < 230) {
      rSum += r;
      gSum += g;
      bSum += b;
      sampleCount++;

      const qr = Math.floor(r / 32) * 32;
      const qg = Math.floor(g / 32) * 32;
      const qb = Math.floor(b / 32) * 32;
      const key = `${qr},${qg},${qb}`;
      colorBuckets[key] = (colorBuckets[key] || 0) + 1;
    }
  }

  if (sampleCount === 0) {
    return { primary: '#3B82F6', secondary: '#6366F1', glow: 'rgba(59, 130, 246, 0.25)' };
  }

  let maxCount = 0;
  let topColor = '59,130,246';
  for (const [key, count] of Object.entries(colorBuckets)) {
    if (count > maxCount) {
      maxCount = count;
      topColor = key;
    }
  }

  const avgR = Math.round(rSum / sampleCount);
  const avgG = Math.round(gSum / sampleCount);
  const avgB = Math.round(bSum / sampleCount);

  return {
    primary: `rgb(${topColor})`,
    secondary: `rgb(${avgR}, ${avgG}, ${avgB})`,
    glow: `rgba(${topColor}, 0.35)`
  };
}

function determineGutterDetector(data: Uint8ClampedArray, width: number, height: number): GutterThresholds {
  let lightBorderPixels = 0;
  let darkBorderPixels = 0;

  const marginX = Math.floor(width * 0.04);
  const marginY = Math.floor(height * 0.04);

  for (let y = 0; y < height; y += 4) {
    for (let x = 0; x < width; x += 4) {
      if (x < marginX || x > width - marginX || y < marginY || y > height - marginY) {
        const idx = (y * width + x) * 4;
        const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        if (lum > 215) lightBorderPixels++;
        else if (lum < 45) darkBorderPixels++;
      }
    }
  }

  const isLightGutter = lightBorderPixels >= darkBorderPixels;

  if (isLightGutter) {
    return {
      isGutter: (r, g, b) => {
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        return lum > 210;
      }
    };
  } else {
    return {
      isGutter: (r, g, b) => {
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        return lum < 45;
      }
    };
  }
}

function findHorizontalSlices(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  detector: GutterThresholds
): Array<{ yStart: number; yEnd: number }> {
  const isGutterRow: boolean[] = [];

  for (let y = 0; y < height; y++) {
    let gutterCount = 0;
    const step = 2;
    const total = Math.floor(width / step);

    for (let x = 0; x < width; x += step) {
      const idx = (y * width + x) * 4;
      if (detector.isGutter(data[idx], data[idx + 1], data[idx + 2])) {
        gutterCount++;
      }
    }

    isGutterRow.push(gutterCount / total >= 0.76);
  }

  const slices: Array<{ yStart: number; yEnd: number }> = [];
  let inPanel = false;
  let currentStart = 0;

  for (let y = 0; y < height; y++) {
    if (!isGutterRow[y]) {
      if (!inPanel) {
        inPanel = true;
        currentStart = y;
      }
    } else {
      if (inPanel) {
        inPanel = false;
        if (y - currentStart > height * 0.07) {
          slices.push({ yStart: currentStart, yEnd: y });
        }
      }
    }
  }

  if (inPanel && height - currentStart > height * 0.07) {
    slices.push({ yStart: currentStart, yEnd: height });
  }

  if (slices.length === 0) {
    slices.push({ yStart: 0, yEnd: height });
  }

  return slices;
}

function findVerticalCuts(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  yStart: number,
  yEnd: number,
  detector: GutterThresholds
): Array<{ xStart: number; xEnd: number }> {
  const isGutterCol: boolean[] = [];
  const sliceHeight = yEnd - yStart;

  for (let x = 0; x < width; x++) {
    let gutterCount = 0;
    const step = 2;
    const total = Math.floor(sliceHeight / step);

    for (let y = yStart; y < yEnd; y += step) {
      const idx = (y * width + x) * 4;
      if (detector.isGutter(data[idx], data[idx + 1], data[idx + 2])) {
        gutterCount++;
      }
    }

    isGutterCol.push(gutterCount / total >= 0.80);
  }

  const cuts: Array<{ xStart: number; xEnd: number }> = [];
  let inPanel = false;
  let currentStart = 0;

  for (let x = 0; x < width; x++) {
    if (!isGutterCol[x]) {
      if (!inPanel) {
        inPanel = true;
        currentStart = x;
      }
    } else {
      if (inPanel) {
        inPanel = false;
        if (x - currentStart > width * 0.10) {
          cuts.push({ xStart: currentStart, xEnd: x });
        }
      }
    }
  }

  if (inPanel && width - currentStart > width * 0.10) {
    cuts.push({ xStart: currentStart, xEnd: width });
  }

  if (cuts.length === 0) {
    cuts.push({ xStart: 0, xEnd: width });
  }

  return cuts;
}

function sortPanels(panels: PanelBox[], direction: ReadingDirection): PanelBox[] {
  const rowThreshold = 0.08;
  const rows: PanelBox[][] = [];

  for (const panel of panels) {
    let placed = false;
    for (const row of rows) {
      const rowAvgY = row.reduce((sum, p) => sum + p.y, 0) / row.length;
      if (Math.abs(panel.y - rowAvgY) < rowThreshold) {
        row.push(panel);
        placed = true;
        break;
      }
    }
    if (!placed) {
      rows.push([panel]);
    }
  }

  rows.sort((a, b) => {
    const avgA = a.reduce((sum, p) => sum + p.y, 0) / a.length;
    const avgB = b.reduce((sum, p) => sum + p.y, 0) / b.length;
    return avgA - avgB;
  });

  const result: PanelBox[] = [];
  for (const row of rows) {
    if (direction === 'rtl') {
      row.sort((a, b) => b.x - a.x);
    } else {
      row.sort((a, b) => a.x - b.x);
    }
    result.push(...row);
  }

  return result;
}

function getFallbackPanels(direction: ReadingDirection): PanelBox[] {
  return [
    { id: 'fb_1', x: 0.04, y: 0.03, width: 0.92, height: 0.31, order: 1 },
    { id: 'fb_2', x: 0.04, y: 0.35, width: 0.92, height: 0.31, order: 2 },
    { id: 'fb_3', x: 0.04, y: 0.67, width: 0.92, height: 0.30, order: 3 }
  ];
}

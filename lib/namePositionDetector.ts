/**
 * Deterministic name-position detection for certificate templates.
 *
 * Pure geometry on OCR line boxes — no ML, no OpenCV, no template-specific
 * phrases, no underlines/separators. The insight: the participant name sits
 * in the LARGEST REASONABLE vertical gap between two consecutive OCR text
 * lines in the upper-middle area of the certificate, flanked by centered,
 * confidently-read text.
 *
 * Input/output coordinates are image pixels with a TOP-LEFT origin
 * (see lib/templateTypes.ts). Never throws — returns null when detection
 * is not confident, and the caller shows the manual fallback.
 */

import type { GapCandidate, NameRegion, OCRLine } from './templateTypes';

export interface DetectOptions {
  /**
   * Fraction of the gap height added above and below the gap to form the
   * final region (gives script-font ascenders/descenders room).
   * Default 0.15.
   */
  padding?: number;
  /** Minimum gap height as a fraction of image height. Default 0.02. */
  minGap?: number;
  /** Maximum gap height as a fraction of image height. Default 0.45. */
  maxGap?: number;
}

/** Overall detection score below which we refuse to auto-place the name. */
export const LOW_CONFIDENCE_THRESHOLD = 0.25;

/** Weighted-sum component weights (must match the spec: gap > alignment > position = confidence). */
const WEIGHT_GAP = 0.45;
const WEIGHT_ALIGNMENT = 0.25;
const WEIGHT_POSITION = 0.15;
const WEIGHT_CONFIDENCE = 0.15;

/** Ideal vertical band for the name, as fractions of image height. */
const IDEAL_BAND_TOP = 0.25;
const IDEAL_BAND_BOTTOM = 0.65;

interface ResolvedOptions {
  padding: number;
  minGap: number;
  maxGap: number;
}

function resolveOptions(options?: DetectOptions): ResolvedOptions {
  const padding = options?.padding;
  const minGap = options?.minGap;
  const maxGap = options?.maxGap;
  return {
    padding: typeof padding === 'number' && Number.isFinite(padding) && padding >= 0 ? padding : 0.15,
    minGap: typeof minGap === 'number' && Number.isFinite(minGap) && minGap >= 0 ? minGap : 0.02,
    maxGap: typeof maxGap === 'number' && Number.isFinite(maxGap) && maxGap > 0 ? maxGap : 0.45,
  };
}

/**
 * Drops OCR noise: empty text, low-confidence lines, and fragments narrower
 * than 3% of the image width (logo glyphs, borders, watermarks).
 */
function filterNoise(lines: OCRLine[], imageWidth: number): OCRLine[] {
  const minWidth = imageWidth * 0.03;
  return lines.filter((l) => {
    if (!l || !Number.isFinite(l.x) || !Number.isFinite(l.y) || !Number.isFinite(l.width) || !Number.isFinite(l.height)) {
      return false;
    }
    if (l.width <= 0 || l.height <= 0) return false;
    if (!l.text || l.text.trim().length === 0) return false;
    if (l.confidence < 40) return false;
    if (l.width < minWidth) return false;
    return true;
  });
}

/** Horizontal center of a line, in pixels. */
function lineCenterX(l: OCRLine): number {
  return l.x + l.width / 2;
}

/**
 * Scores every valid consecutive-line gap, best first. Exported for the
 * debug UI (/dev/name-detection) so admins can see WHY a region was chosen.
 */
export function scoreGapCandidates(
  rawLines: OCRLine[],
  imageWidth: number,
  imageHeight: number,
  options?: DetectOptions,
): GapCandidate[] {
  const candidates: GapCandidate[] = [];
  if (!Number.isFinite(imageWidth) || !Number.isFinite(imageHeight) || imageWidth <= 0 || imageHeight <= 0) {
    return candidates;
  }

  const { minGap, maxGap } = resolveOptions(options);
  const minGapPx = minGap * imageHeight;
  const maxGapPx = maxGap * imageHeight;

  // 1. Sort top-to-bottom and drop noise.
  const lines = filterNoise(rawLines, imageWidth).sort((a, b) => a.y - b.y);
  if (lines.length < 2) return candidates;

  for (let i = 0; i < lines.length - 1; i += 1) {
    const upper = lines[i];
    const lower = lines[i + 1];

    // 2. Consecutive-line vertical gap.
    const gapTop = upper.y + upper.height;
    const gapBottom = lower.y;
    const gapHeight = gapBottom - gapTop;

    // 3. Filter: negative (overlapping columns) / tiny / absurdly large gaps.
    if (gapHeight < minGapPx) continue;
    if (gapHeight > maxGapPx) continue;

    // 4a. Gap component (0.45): larger is better, capped at maxGap.
    // Excessive-gap penalty: a gap spanning >60% of the template is almost
    // never a name slot (blank margins/logos), even if maxGap was raised.
    let gapScore = Math.min(gapHeight / maxGapPx, 1);
    if (gapHeight > 0.6 * imageHeight) {
      const overshoot = (gapHeight - 0.6 * imageHeight) / (0.4 * imageHeight);
      gapScore *= Math.max(0.1, 1 - 1.5 * overshoot);
    }

    // 4b. Alignment component (0.25): flanking lines stacked on each other,
    // and their midpoint near the image's horizontal center.
    const centerDelta = Math.abs(lineCenterX(upper) - lineCenterX(lower)) / imageWidth;
    const stackScore = 1 - Math.min(centerDelta / 0.15, 1);
    const midX = (lineCenterX(upper) + lineCenterX(lower)) / 2;
    const centerScore = 1 - Math.min(Math.abs(midX / imageWidth - 0.5) / 0.5, 1);
    const alignmentScore = 0.6 * stackScore + 0.4 * centerScore;

    // 4c. Position component (0.15): gap center in the upper-middle band
    // (25–65% of height) is ideal; linear edge penalty toward top/bottom.
    const gapCenterY = (gapTop + gapBottom) / 2;
    const rel = gapCenterY / imageHeight;
    let positionScore: number;
    if (rel >= IDEAL_BAND_TOP && rel <= IDEAL_BAND_BOTTOM) {
      positionScore = 1;
    } else if (rel < IDEAL_BAND_TOP) {
      positionScore = Math.max(0, 1 - (IDEAL_BAND_TOP - rel) / IDEAL_BAND_TOP);
    } else {
      positionScore = Math.max(0, 1 - (rel - IDEAL_BAND_BOTTOM) / (1 - IDEAL_BAND_BOTTOM));
    }

    // 4d. Confidence component (0.15): mean OCR confidence of flanking lines.
    const confidenceScore = Math.min(Math.max((upper.confidence + lower.confidence) / 200, 0), 1);

    const score =
      WEIGHT_GAP * gapScore +
      WEIGHT_ALIGNMENT * alignmentScore +
      WEIGHT_POSITION * positionScore +
      WEIGHT_CONFIDENCE * confidenceScore;

    candidates.push({
      gapTop,
      gapBottom,
      gapHeight,
      score,
      upperLine: upper,
      lowerLine: lower,
      scores: {
        gap: gapScore,
        alignment: alignmentScore,
        position: positionScore,
        confidence: confidenceScore,
      },
    });
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates;
}

/**
 * Detects the region where the participant name belongs.
 * Returns the best-scoring reasonable gap as a NameRegion, or null when
 * there are no valid gaps or the best score is below the confidence
 * threshold (caller must show the manual fallback).
 */
export function detectNameRegion(
  rawLines: OCRLine[],
  imageWidth: number,
  imageHeight: number,
  options?: DetectOptions,
): NameRegion | null {
  const { padding } = resolveOptions(options);

  const candidates = scoreGapCandidates(rawLines, imageWidth, imageHeight, options);
  if (candidates.length === 0) return null;

  const best = candidates[0];
  if (best.score < LOW_CONFIDENCE_THRESHOLD) return null;

  // 5. Region = gap band, padded by `padding` fraction of the gap height on
  // each side, horizontally spanning the union of the flanking lines.
  const pad = padding * best.gapHeight;
  const regionTop = Math.max(0, best.gapTop - pad);
  const regionBottom = Math.min(imageHeight, best.gapBottom + pad);
  const regionLeft = Math.max(0, Math.min(best.upperLine.x, best.lowerLine.x));
  const regionRight = Math.min(imageWidth, Math.max(best.upperLine.x + best.upperLine.width, best.lowerLine.x + best.lowerLine.width));

  const height = regionBottom - regionTop;
  const width = regionRight - regionLeft;
  if (height <= 0 || width <= 0) return null;

  const centerX = (lineCenterX(best.upperLine) + lineCenterX(best.lowerLine)) / 2;
  const centerY = (best.gapTop + best.gapBottom) / 2;

  return {
    x: regionLeft,
    y: regionTop,
    width,
    height,
    centerX,
    centerY,
    confidence: best.score,
    upperLine: best.upperLine,
    lowerLine: best.lowerLine,
  };
}

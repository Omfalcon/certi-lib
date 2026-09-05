/**
 * Shared types for template OCR analysis and name-position detection.
 *
 * COORDINATE SYSTEMS (important):
 * - OCRLine and NameRegion use PIXEL coordinates with a TOP-LEFT origin
 *   (standard image space, as produced by Tesseract.js bounding boxes).
 * - SavedNameRegion uses NORMALIZED 0–1 coordinates (also top-left origin)
 *   so the region is resolution-independent: centerX = centerPx / imageWidth,
 *   centerY = centerPx / imageHeight. Stored in Supabase `settings` as JSON.
 * - At draw time, pdf-lib uses a BOTTOM-LEFT origin, so the saved
 *   normalized centerY is inverted and baseline-adjusted in
 *   lib/generateCertificate.ts (see the name-placement section there).
 */

/** A single OCR text line, in image pixels, top-left origin. */
export interface OCRLine {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Tesseract confidence 0–100. */
  confidence: number;
}

/** The detected (or manually set) region where the participant name belongs. Image pixels, top-left origin. */
export interface NameRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  /** Overall detection confidence 0–1 (manual = 1). */
  confidence: number;
  /** The OCR line directly above the gap, if any. */
  upperLine?: OCRLine;
  /** The OCR line directly below the gap, if any. */
  lowerLine?: OCRLine;
}

/** A scored vertical gap between two consecutive OCR lines. Pixels. */
export interface GapCandidate {
  gapTop: number;
  gapBottom: number;
  gapHeight: number;
  score: number;
  upperLine: OCRLine;
  lowerLine: OCRLine;
  /** Individual normalized 0–1 score components. */
  scores: {
    gap: number;
    position: number;
    alignment: number;
    confidence: number;
  };
}

/**
 * What gets persisted in Supabase settings (key: `template_name_region`)
 * and passed to the student download path. NORMALIZED 0–1, image space,
 * TOP-LEFT origin. centerX may be null meaning "keep horizontally centered".
 */
export interface SavedNameRegion {
  version: 1;
  method: 'auto' | 'manual';
  centerX: number | null;
  centerY: number;
  /**
   * Height of the detected text gap as a fraction of image height (0–1).
   * Used at draw time to cap the font size so the name fits inside the gap.
   * Null/absent for manual placements (no gap-fit cap).
   */
  gapHeight?: number | null;
  confidence: number | null;
  /** Dimensions of the image the region was measured on (diagnostic only). */
  imageWidth: number;
  imageHeight: number;
  savedAt: string;
}

/**
 * Client-side OCR wrapper around Tesseract.js.
 *
 * CLIENT-ONLY MODULE. tesseract.js is imported dynamically so this never
 * executes during server rendering (Next.js will not touch it on the server).
 * The dynamic import means the browser worker script, the WASM core and the
 * `eng` traineddata are fetched from the CDN only when an admin actually
 * analyzes a template — one OCR pass per template, never on the student
 * download path.
 *
 * All output coordinates are image pixels with a TOP-LEFT origin
 * (Tesseract bbox space). See lib/templateTypes.ts for the coordinate docs.
 */

import type { OCRLine } from './templateTypes';

/** Progress update from the Tesseract worker logger. `progress` is 0–1. */
export interface OCRProgress {
  status: string;
  progress: number;
}

/** Everything the name-position detector needs from one template image. */
export interface TemplateOCRResult {
  lines: OCRLine[];
  imageWidth: number;
  imageHeight: number;
}

/** Non-crashing, user-displayable OCR failure. */
export class OCRError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OCRError';
  }
}

/**
 * Reads the natural pixel dimensions of an image blob.
 * createImageBitmap is the cheapest decode path; falls back to an <img>
 * element for older browsers or exotic formats.
 */
async function getImageDimensions(file: Blob): Promise<{ width: number; height: number }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      const dims = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
      return dims;
    } catch {
      // fall through to the <img> path (e.g. unsupported mime)
    }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const dims = { width: img.naturalWidth, height: img.naturalHeight };
      URL.revokeObjectURL(url);
      resolve(dims);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new OCRError('Unsupported image file. Please upload a valid PNG or JPG template.'));
    };
    img.src = url;
  });
}

/**
 * Runs OCR on a template image and returns every recognized text line as an
 * OCRLine (pixels, top-left origin). The worker is created per analysis and
 * always terminated — Tesseract cannot be reliably reused after errors.
 */
export async function analyzeTemplateImage(
  file: Blob,
  onProgress?: (p: OCRProgress) => void,
): Promise<TemplateOCRResult> {
  if (typeof window === 'undefined') {
    throw new OCRError('OCR can only run in the browser.');
  }
  if (file.size === 0) {
    throw new OCRError('The uploaded template file is empty.');
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new OCRError('Template image is too large for analysis (max 8 MB).');
  }

  const { width: imageWidth, height: imageHeight } = await getImageDimensions(file);

  if (imageWidth < 100 || imageHeight < 100) {
    throw new OCRError(
      `Template image is too small to analyze (${imageWidth}×${imageHeight}px). Minimum is 100×100px.`,
    );
  }
  if (imageWidth * imageHeight > 40e6) {
    throw new OCRError(
      `Template image is too large to analyze (${imageWidth}×${imageHeight}px, max 40 MP).`,
    );
  }

  // Dynamic import: browser-only module, never evaluated during SSR.
  const Tesseract = await import('tesseract.js');

  let worker: Awaited<ReturnType<typeof Tesseract.createWorker>> | null = null;
  try {
    worker = await Tesseract.createWorker('eng', undefined, {
      logger: (m) => {
        if (onProgress && typeof m.progress === 'number') {
          onProgress({ status: m.status, progress: Math.max(0, Math.min(1, m.progress)) });
        }
      },
      errorHandler: (e: unknown) => {
        // Surfaced through the logger/recognize promise; logged for diagnosis only.
        console.error('[tesseract worker]', e);
      },
    });

    await worker.setParameters({
      user_defined_dpi: '300',
      tessedit_pageseg_mode: Tesseract.PSM.AUTO,
    });

    const { data } = await worker.recognize(file, {}, { text: true, blocks: true });

    const lines: OCRLine[] = [];
    const blocks = data.blocks ?? [];
    for (const block of blocks) {
      for (const paragraph of block.paragraphs ?? []) {
        for (const line of paragraph.lines ?? []) {
          const { bbox } = line;
          if (!bbox) continue;
          const x = Math.min(bbox.x0, bbox.x1);
          const y = Math.min(bbox.y0, bbox.y1);
          const w = Math.abs(bbox.x1 - bbox.x0);
          const h = Math.abs(bbox.y1 - bbox.y0);
          if (w <= 0 || h <= 0) continue; // degenerate bbox
          lines.push({
            text: (line.text ?? '').trim(),
            x,
            y,
            width: w,
            height: h,
            confidence: typeof line.confidence === 'number' ? line.confidence : 0,
          });
        }
      }
    }

    if (lines.length === 0) {
      throw new OCRError(
        'OCR found no readable text on this template. Detection needs at least two text lines with a blank gap between them.',
      );
    }

    return { lines, imageWidth, imageHeight };
  } catch (err) {
    if (err instanceof OCRError) throw err;
    if (err instanceof Error && /fetch|network|load|timeout/i.test(err.message)) {
      throw new OCRError(
        `Failed to download the OCR engine files: ${err.message}. Check your internet connection and try again.`,
      );
    }
    throw new OCRError(
      `OCR analysis failed: ${err instanceof Error ? err.message : 'unknown error'}. Try a different PNG or JPG template.`,
    );
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch {
        // best-effort cleanup; worker already died
      }
    }
  }
}

import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { adminRateLimiter, getClientIp } from '@/lib/rateLimiter';
import { sanitizeString, verifyAdminPassword, errorResponse, successResponse } from '@/lib/validation';
import type { SavedNameRegion } from '@/lib/templateTypes';

export const runtime = 'nodejs';

/**
 * Saves the detected/manual name region for the current certificate template
 * as JSON in the existing `settings` key-value table (no schema change).
 * Key: 'template_name_region'. Value: SavedNameRegion (normalized 0–1,
 * image space, top-left origin — see lib/templateTypes.ts).
 */

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Validates the region payload server-side. Must never trust client JSON.
 * Returns a clean SavedNameRegion or null when malformed.
 */
function validateRegion(raw: unknown): SavedNameRegion | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;

  const method = r.method;
  if (method !== 'auto' && method !== 'manual') return null;

  // centerY: mandatory, comfortably inside the page
  if (!isFiniteNumber(r.centerY) || r.centerY < 0.05 || r.centerY > 0.95) return null;

  // centerX: optional (null = horizontally centered at draw time)
  let centerX: number | null = null;
  if (r.centerX !== null && r.centerX !== undefined) {
    if (!isFiniteNumber(r.centerX) || r.centerX < 0 || r.centerX > 1) return null;
    centerX = r.centerX;
  }

  // gapHeight: optional (fraction of image height, no cap for manual placements)
  let gapHeight: number | null = null;
  if (r.gapHeight !== null && r.gapHeight !== undefined) {
    if (!isFiniteNumber(r.gapHeight) || r.gapHeight <= 0 || r.gapHeight > 1) return null;
    gapHeight = r.gapHeight;
  }

  // confidence: optional score 0–1
  let confidence: number | null = null;
  if (r.confidence !== null && r.confidence !== undefined) {
    if (!isFiniteNumber(r.confidence) || r.confidence < 0 || r.confidence > 1) return null;
    confidence = r.confidence;
  }

  const imageWidth = r.imageWidth;
  const imageHeight = r.imageHeight;
  if (!isFiniteNumber(imageWidth) || !isFiniteNumber(imageHeight) || imageWidth <= 0 || imageHeight <= 0) {
    return null;
  }

  const savedAt = typeof r.savedAt === 'string' && r.savedAt.length > 0 ? r.savedAt : new Date().toISOString();

  return {
    version: 1,
    method,
    centerX,
    centerY: r.centerY,
    gapHeight,
    confidence,
    imageWidth,
    imageHeight,
    savedAt,
  };
}

export async function POST(req: NextRequest) {
  // 1. Rate limiting
  const ip = getClientIp(req);
  try {
    await adminRateLimiter.consume(ip);
  } catch {
    return errorResponse('Too many requests. Please wait a moment.', 429);
  }

  // 2. Parse JSON body
  let body: { password?: unknown; region?: unknown };
  try {
    body = await req.json();
  } catch {
    return errorResponse('Invalid JSON body.', 400);
  }

  // 3. Admin password check
  const password = sanitizeString(body.password);
  if (!verifyAdminPassword(password)) {
    return errorResponse('Unauthorized. Invalid admin password.', 401);
  }

  // 4. Validate region payload
  const region = validateRegion(body.region);
  if (!region) {
    return errorResponse('Invalid name region payload.', 400);
  }

  // 5. Upsert into settings table (JSON string, TEXT column — no schema change)
  const { error } = await getSupabaseAdmin().from('settings').upsert({
    key: 'template_name_region',
    value: JSON.stringify(region),
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error('[save-name-region] Settings upsert error:', error.message);
    return errorResponse('Failed to save name region: ' + error.message, 500);
  }

  return successResponse({
    success: true,
    region,
    message: 'Name position saved successfully.',
  });
}

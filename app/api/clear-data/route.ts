import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { adminRateLimiter, getClientIp } from '@/lib/rateLimiter';
import { sanitizeString, verifyAdminRequest, errorResponse, successResponse } from '@/lib/validation';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  // 1. Rate limiting
  const ip = getClientIp(req);
  try {
    await adminRateLimiter.consume(ip);
  } catch {
    return errorResponse('Too many requests. Please wait a moment.', 429);
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // Body is optional if session cookie is present
  }

  const password = sanitizeString(body.password as string);

  if (!verifyAdminRequest(req, password)) {
    return errorResponse('Unauthorized. Invalid or expired admin session.', 401);
  }

  // Delete all participants
  const { error: deleteError } = await getSupabaseAdmin()
    .from('participants')
    .delete()
    .neq('id', 0);

  if (deleteError) {
    return errorResponse('Failed to clear participants.', 500);
  }

  // Remove template settings
  await getSupabaseAdmin()
    .from('settings')
    .delete()
    .in('key', ['last_upload', 'template_url']);

  // Remove from storage
  await getSupabaseAdmin().storage
    .from('certificates')
    .remove(['certificate-template.png']);

  return successResponse({ success: true, message: 'All data cleared.' });
}


import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { sanitizeString, verifyAdminPassword, errorResponse, successResponse } from '@/lib/validation';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse('Invalid request body.', 400);
  }

  const raw = body as Record<string, unknown>;
  const password = sanitizeString(raw.password as string);

  if (!verifyAdminPassword(password)) {
    return errorResponse('Unauthorized.', 401);
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
    .in('key', ['last_upload', 'template_url', 'template_name_region']);

  // Remove from storage
  await getSupabaseAdmin().storage
    .from('certificates')
    .remove(['certificate-template.png']);

  return successResponse({ success: true, message: 'All data cleared.' });
}


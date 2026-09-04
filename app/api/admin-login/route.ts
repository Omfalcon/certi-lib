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
    // Generic message — don't reveal whether password exists
    return errorResponse('Invalid credentials.', 401);
  }

  // Fetch stats for admin dashboard
  const [participantRes, settingsRes] = await Promise.all([
    getSupabaseAdmin().from('participants').select('id', { count: 'exact', head: true }),
    getSupabaseAdmin().from('settings').select('key, value'),
  ]);

  const settings = Object.fromEntries(
    (settingsRes.data ?? []).map((s) => [s.key, s.value])
  );

  return successResponse({
    authenticated: true,
    participantCount: participantRes.count ?? 0,
    lastUpload: settings['last_upload'] ?? null,
    templateUrl: settings['template_url'] ?? null,
  });
}


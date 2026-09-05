import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { sanitizeString, verifyAdminPassword, errorResponse, successResponse } from '@/lib/validation';
import type { SavedNameRegion } from '@/lib/templateTypes';

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

  let templateUrl = settings['template_url'] ?? null;
  if (!templateUrl) {
    const { data: urlData } = getSupabaseAdmin().storage
      .from('certificates')
      .getPublicUrl('certificate-template.png');
    templateUrl = urlData?.publicUrl ?? null;
  }

  // Saved name region (if any) for the active template, so the dashboard can
  // render its overlay without a second fetch. Malformed/missing → null.
  let nameRegion: SavedNameRegion | null = null;
  const regionValue = settings['template_name_region'];
  if (typeof regionValue === 'string' && regionValue.length > 0) {
    try {
      const parsed = JSON.parse(regionValue);
      if (parsed && typeof parsed === 'object' && typeof parsed.centerY === 'number') {
        nameRegion = parsed as SavedNameRegion;
      }
    } catch {
      nameRegion = null;
    }
  }

  return successResponse({
    authenticated: true,
    participantCount: participantRes.count ?? 0,
    lastUpload: settings['last_upload'] ?? null,
    templateUrl,
    nameRegion,
  });
}


import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { adminRateLimiter, getClientIp } from '@/lib/rateLimiter';
import {
  sanitizeString,
  verifyAdminPassword,
  verifyAdminRequest,
  createAdminSessionToken,
  setAdminSessionCookie,
  clearAdminSessionCookie,
  errorResponse,
  successResponse,
} from '@/lib/validation';

export const runtime = 'nodejs';

async function fetchDashboardData() {
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

  return {
    participantCount: participantRes.count ?? 0,
    lastUpload: settings['last_upload'] ?? null,
    templateUrl,
  };
}

/**
 * GET /api/admin-login
 * Validates active HttpOnly session cookie without needing password.
 */
export async function GET(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return successResponse({ authenticated: false });
  }

  const dashboardData = await fetchDashboardData();
  return successResponse({
    authenticated: true,
    ...dashboardData,
  });
}

/**
 * POST /api/admin-login
 * Handles Login (sets HttpOnly cookie) & Logout (clears HttpOnly cookie).
 */
export async function POST(req: NextRequest) {
  // 1. Rate limit login and session endpoints
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
    // Body is optional on logout or session check
  }

  const action = req.nextUrl.searchParams.get('action') || body.action;

  // Handle Logout
  if (action === 'logout') {
    const res = successResponse({ success: true, authenticated: false });
    clearAdminSessionCookie(res);
    return res;
  }

  // Handle Login
  const password = sanitizeString(body.password as string);

  if (!verifyAdminPassword(password)) {
    return errorResponse('Invalid credentials.', 401);
  }

  // Create signed HMAC-SHA256 session token
  const token = createAdminSessionToken();
  const dashboardData = await fetchDashboardData();

  const res = successResponse({
    authenticated: true,
    ...dashboardData,
  });

  // Set secure HttpOnly cookie
  setAdminSessionCookie(res, token);
  return res;
}


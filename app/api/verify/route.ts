import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyRateLimiter, getClientIp } from '@/lib/rateLimiter';
import {
  sanitizeString,
  isValidEmail,
  isValidSapId,
  errorResponse,
  successResponse,
} from '@/lib/validation';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  // 1. Rate limiting
  const ip = getClientIp(req);
  try {
    await verifyRateLimiter.consume(ip);
  } catch {
    return errorResponse('Too many requests. Please try again in a minute.', 429);
  }

  // 2. Parse and validate body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse('Invalid request body.', 400);
  }

  if (!body || typeof body !== 'object') {
    return errorResponse('Invalid request body.', 400);
  }

  const raw = body as Record<string, unknown>;
  const name = sanitizeString(raw.name);
  const email = sanitizeString(raw.email).toLowerCase();
  const sapid = sanitizeString(raw.sapid);

  if (!name || !email || !sapid) {
    return errorResponse('Name, email, and SAP ID are required.', 400);
  }

  if (!isValidEmail(email)) {
    return errorResponse('Invalid email address.', 400);
  }

  if (!isValidSapId(sapid)) {
    return errorResponse('Invalid SAP ID format.', 400);
  }

  // 3. Lookup participant — case-insensitive name & email, exact sapid
  const { data, error } = await getSupabaseAdmin()
    .from('participants')
    .select('name, email, sapid')
    .eq('sapid', sapid)
    .ilike('email', email)
    .ilike('name', name)
    .maybeSingle();

  if (error) {
    console.error('[verify] Supabase error:', error.message);
    return errorResponse('An internal error occurred. Please try again.', 500);
  }

  if (!data) {
    return errorResponse(
      'No matching participant found. Please check your name, email, and SAP ID.',
      404
    );
  }

  // 4. Log the download
  await getSupabaseAdmin().from('download_logs').insert({
    sapid: data.sapid,
    email: data.email,
    ip_address: ip,
  });

  // 5. Return the verified name (use DB-stored name for certificate)
  return successResponse({
    verified: true,
    name: data.name,
  });
}

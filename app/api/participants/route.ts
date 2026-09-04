import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { adminRateLimiter, getClientIp } from '@/lib/rateLimiter';
import {
  sanitizeString,
  isValidEmail,
  verifyAdminPassword,
  errorResponse,
  successResponse,
} from '@/lib/validation';

export const runtime = 'nodejs';

interface ParticipantActionBody {
  password?: string;
  action?: 'list' | 'add' | 'delete';
  id?: number | string;
  name?: string;
  email?: string;
  sapid?: string;
}

export async function POST(req: NextRequest) {
  // 1. Rate limiting
  const ip = getClientIp(req);
  try {
    await adminRateLimiter.consume(ip);
  } catch {
    return errorResponse('Too many requests. Please try again later.', 429);
  }

  // 2. Parse request body
  let body: ParticipantActionBody;
  try {
    body = await req.json();
  } catch {
    return errorResponse('Invalid JSON request body.', 400);
  }

  // 3. Admin Authentication
  const password = sanitizeString(body.password ?? '');
  if (!verifyAdminPassword(password)) {
    return errorResponse('Invalid credentials.', 401);
  }

  const action = body.action ?? 'list';

  // ----------------------------------------------------
  // ACTION: LIST PARTICIPANTS
  // ----------------------------------------------------
  if (action === 'list') {
    const { data, error } = await getSupabaseAdmin()
      .from('participants')
      .select('id, name, email, sapid, created_at')
      .order('id', { ascending: false })
      .limit(1000);

    if (error) {
      console.error('[participants:list] Error:', error.message);
      return errorResponse('Failed to fetch participants.', 500);
    }

    return successResponse({
      participants: data ?? [],
      count: data?.length ?? 0,
    });
  }

  // ----------------------------------------------------
  // ACTION: ADD INDIVIDUAL PARTICIPANT
  // ----------------------------------------------------
  if (action === 'add') {
    const name = sanitizeString(body.name ?? '');
    const email = sanitizeString(body.email ?? '').toLowerCase();
    const sapid = sanitizeString(body.sapid ?? '').trim();

    if (!name || !email || !sapid) {
      return errorResponse('Full Name, Email, and SAP ID are required.', 400);
    }

    if (!isValidEmail(email)) {
      return errorResponse('Invalid email address format.', 400);
    }

    const { data, error } = await getSupabaseAdmin()
      .from('participants')
      .upsert(
        { name, email, sapid },
        { onConflict: 'email,sapid' }
      )
      .select('id, name, email, sapid, created_at')
      .single();

    if (error) {
      console.error('[participants:add] Error:', error.message);
      return errorResponse('Failed to add participant. ' + error.message, 500);
    }

    return successResponse({
      message: `Participant "${name}" added successfully.`,
      participant: data,
    });
  }

  // ----------------------------------------------------
  // ACTION: DELETE INDIVIDUAL PARTICIPANT
  // ----------------------------------------------------
  if (action === 'delete') {
    const id = Number(body.id);
    if (!id || isNaN(id)) {
      return errorResponse('Valid participant ID is required.', 400);
    }

    const { error } = await getSupabaseAdmin()
      .from('participants')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[participants:delete] Error:', error.message);
      return errorResponse('Failed to delete participant.', 500);
    }

    return successResponse({
      message: 'Participant removed successfully.',
      id,
    });
  }

  return errorResponse('Unsupported action.', 400);
}

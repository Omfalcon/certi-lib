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
    let query = getSupabaseAdmin().from('participants').delete();

    if (body.id !== undefined && body.id !== null && body.id !== '') {
      const numId = Number(body.id);
      if (!isNaN(numId) && numId > 0) {
        query = query.eq('id', numId);
      } else {
        query = query.eq('id', body.id);
      }
    } else if (body.sapid) {
      query = query.eq('sapid', sanitizeString(body.sapid).trim());
    } else if (body.email) {
      query = query.eq('email', sanitizeString(body.email).toLowerCase());
    } else {
      return errorResponse('Valid participant ID, SAP ID, or email is required for deletion.', 400);
    }

    const { data: deletedRows, error } = await query.select('id, name, email, sapid');

    if (error) {
      console.error('[participants:delete] Supabase Error:', error.message);
      return errorResponse('Failed to delete participant from Supabase: ' + error.message, 500);
    }

    if (!deletedRows || deletedRows.length === 0) {
      return errorResponse('Participant not found in Supabase database.', 404);
    }

    return successResponse({
      message: `Participant "${deletedRows[0].name}" (${deletedRows[0].sapid}) removed successfully from Supabase.`,
      deleted: deletedRows[0],
    });
  }

  return errorResponse('Unsupported action.', 400);
}

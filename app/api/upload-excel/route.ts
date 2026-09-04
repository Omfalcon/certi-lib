import { NextRequest } from 'next/server';
import * as XLSX from 'xlsx';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { adminRateLimiter, getClientIp } from '@/lib/rateLimiter';
import { sanitizeString, verifyAdminPassword, errorResponse, successResponse } from '@/lib/validation';

export const runtime = 'nodejs';

// 10MB max file size
const MAX_FILE_SIZE = 10 * 1024 * 1024;

interface ParticipantRow {
  name: string;
  email: string;
  sapid: string;
}

export async function POST(req: NextRequest) {
  // 1. Rate limiting
  const ip = getClientIp(req);
  try {
    await adminRateLimiter.consume(ip);
  } catch {
    return errorResponse('Too many requests.', 429);
  }

  // 2. Parse form data
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return errorResponse('Invalid form data.', 400);
  }

  // 3. Verify admin password
  const password = sanitizeString(formData.get('password') as string);
  if (!verifyAdminPassword(password)) {
    return errorResponse('Unauthorized.', 401);
  }

  // 4. Get the file
  const file = formData.get('file') as File | null;
  if (!file) {
    return errorResponse('No file provided.', 400);
  }

  if (file.size > MAX_FILE_SIZE) {
    return errorResponse('File too large. Maximum 10MB allowed.', 400);
  }

  const allowedTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ];
  if (!allowedTypes.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
    return errorResponse('Only Excel files (.xlsx, .xls) are allowed.', 400);
  }

  // 5. Parse Excel
  const buffer = await file.arrayBuffer();
  let participants: ParticipantRow[];

  try {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
    });

    participants = rows
      .map((row) => ({
        name: sanitizeString(
          (row['name'] ?? row['Name'] ?? row['NAME'] ?? '') as string
        ),
        email: sanitizeString(
          (row['email'] ?? row['Email'] ?? row['EMAIL'] ?? '') as string
        ).toLowerCase(),
        sapid: sanitizeString(
          String(row['sapid'] ?? row['SapID'] ?? row['SAPID'] ?? row['sap_id'] ?? row['SAP ID'] ?? '')
        ),
      }))
      .filter((p) => p.name && p.email && p.sapid);
  } catch (err) {
    console.error('[upload-excel] Parse error:', err);
    return errorResponse('Failed to parse Excel file. Ensure columns: name, email, sapid', 400);
  }

  if (participants.length === 0) {
    return errorResponse(
      'No valid rows found. Excel must have columns: name, email, sapid',
      400
    );
  }

  // 6. Clear existing participants and insert new ones
  const { error: deleteError } = await getSupabaseAdmin()
    .from('participants')
    .delete()
    .neq('id', 0); // delete all

  if (deleteError) {
    console.error('[upload-excel] Delete error:', deleteError.message);
    return errorResponse('Failed to clear existing data.', 500);
  }

  const { error: insertError } = await getSupabaseAdmin()
    .from('participants')
    .insert(participants);

  if (insertError) {
    console.error('[upload-excel] Insert error:', insertError.message);
    return errorResponse('Failed to save participants.', 500);
  }

  // 7. Update settings with upload timestamp
  await getSupabaseAdmin().from('settings').upsert({
    key: 'last_upload',
    value: new Date().toISOString(),
  });

  return successResponse({
    success: true,
    count: participants.length,
    message: `Successfully uploaded ${participants.length} participants.`,
  });
}


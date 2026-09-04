import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { adminRateLimiter, getClientIp } from '@/lib/rateLimiter';
import { sanitizeString, verifyAdminPassword, errorResponse, successResponse } from '@/lib/validation';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const BUCKET = 'certificates';
const TEMPLATE_KEY = 'certificate-template.png';

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

  // 3. Admin password check
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
    return errorResponse('File too large. Maximum 5MB allowed.', 400);
  }

  const allowedMimes = ['image/png', 'image/jpeg', 'image/jpg'];
  if (!allowedMimes.includes(file.type)) {
    return errorResponse('Only PNG or JPG image files are allowed.', 400);
  }

  // 5. Delete existing template first
  await getSupabaseAdmin().storage.from(BUCKET).remove([TEMPLATE_KEY]);

  // 6. Upload to Supabase Storage
  const buffer = await file.arrayBuffer();
  const { error: uploadError } = await getSupabaseAdmin().storage
    .from(BUCKET)
    .upload(TEMPLATE_KEY, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    console.error('[upload-template] Upload error:', uploadError.message);
    return errorResponse('Failed to upload template.', 500);
  }

  // 7. Get the public URL
  const { data: urlData } = getSupabaseAdmin().storage
    .from(BUCKET)
    .getPublicUrl(TEMPLATE_KEY);

  // 8. Save URL to settings
  await getSupabaseAdmin().from('settings').upsert({
    key: 'template_url',
    value: urlData.publicUrl,
  });

  return successResponse({
    success: true,
    url: urlData.publicUrl,
    message: 'Certificate template uploaded successfully.',
  });
}


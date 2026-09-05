import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { adminRateLimiter, getClientIp } from '@/lib/rateLimiter';
import { sanitizeString, verifyAdminPassword, errorResponse, successResponse } from '@/lib/validation';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB
const BUCKET = 'certificates';

export async function POST(req: NextRequest) {
  // 1. Rate limiting
  const ip = getClientIp(req);
  try {
    await adminRateLimiter.consume(ip);
  } catch {
    return errorResponse('Too many requests. Please wait a moment.', 429);
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
    return errorResponse('Unauthorized. Invalid admin password.', 401);
  }

  // 4. Get the file
  const file = formData.get('file') as File | null;
  if (!file) {
    return errorResponse('No file provided.', 400);
  }

  if (file.size > MAX_FILE_SIZE) {
    return errorResponse('File too large. Maximum 8MB allowed.', 400);
  }

  const allowedMimes = ['image/png', 'image/jpeg', 'image/jpg'];
  if (!allowedMimes.includes(file.type)) {
    return errorResponse('Only PNG or JPG image files are allowed.', 400);
  }

  // 5. Ensure bucket exists
  try {
    const { data: buckets } = await getSupabaseAdmin().storage.listBuckets();
    if (!buckets?.some((b) => b.name === BUCKET)) {
      await getSupabaseAdmin().storage.createBucket(BUCKET, { public: true });
    }
  } catch (bucketErr) {
    console.warn('[upload-template] Storage bucket check notice:', bucketErr);
  }

  const ext = file.type.includes('jpeg') || file.name.endsWith('.jpg') || file.name.endsWith('.jpeg') ? 'jpg' : 'png';
  const timestamp = Date.now();
  const uniqueKey = `certificate-template-${timestamp}.${ext}`;
  const buffer = await file.arrayBuffer();

  // 6. Upload versioned template to Supabase Storage with no cache
  const { error: uploadError } = await getSupabaseAdmin().storage
    .from(BUCKET)
    .upload(uniqueKey, buffer, {
      contentType: file.type,
      cacheControl: '0',
      upsert: true,
    });

  if (uploadError) {
    console.error('[upload-template] Storage upload error:', uploadError.message);
    return errorResponse('Failed to upload template to Supabase Storage: ' + uploadError.message, 500);
  }

  // Also update standard 'certificate-template.png' in storage
  await getSupabaseAdmin().storage
    .from(BUCKET)
    .upload('certificate-template.png', buffer, {
      contentType: file.type,
      cacheControl: '0',
      upsert: true,
    })
    .catch((err) => console.warn('Standard template sync note:', err));

  // 7. Get the public URL for the newly uploaded template
  const { data: urlData } = getSupabaseAdmin().storage
    .from(BUCKET)
    .getPublicUrl(uniqueKey);

  const publicUrl = urlData.publicUrl;

  // 8. Save new template URL to Supabase settings table
  const { error: settingsError } = await getSupabaseAdmin().from('settings').upsert({
    key: 'template_url',
    value: publicUrl,
    updated_at: new Date().toISOString(),
  });

  if (settingsError) {
    console.error('[upload-template] Settings update error:', settingsError.message);
    return errorResponse('Template uploaded to Storage but failed to update settings: ' + settingsError.message, 500);
  }

  // 9. Remove any stale name-region config so it can never mismatch the new
  //    template. The admin's post-upload analysis saves a fresh region.
  //    Best-effort: a failed delete only warns, upload still succeeds.
  const { error: regionDeleteError } = await getSupabaseAdmin()
    .from('settings')
    .delete()
    .eq('key', 'template_name_region');
  if (regionDeleteError) {
    console.warn('[upload-template] Stale name-region cleanup note:', regionDeleteError.message);
  }

  return successResponse({
    success: true,
    url: publicUrl,
    message: 'Certificate template uploaded and synced to Supabase successfully.',
  });
}

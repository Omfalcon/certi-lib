import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('settings')
      .select('value, updated_at')
      .eq('key', 'template_url')
      .maybeSingle();

    if (error) {
      console.error('[template] Error reading settings:', error.message);
      return NextResponse.json({ error: 'Failed to retrieve template.' }, { status: 500 });
    }

    let templateUrl = data?.value;

    if (!templateUrl) {
      // Direct fallback to Supabase public storage certificates bucket
      const { data: urlData } = getSupabaseAdmin().storage
        .from('certificates')
        .getPublicUrl('certificate-template.png');
      templateUrl = urlData.publicUrl;
    }

    return NextResponse.json({
      templateUrl,
      updatedAt: data?.updated_at ?? null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

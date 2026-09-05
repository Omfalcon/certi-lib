import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import type { SavedNameRegion } from '@/lib/templateTypes';

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

    // Saved name region (if any) for the active template. Malformed/missing
    // value → null; the generator falls back to the legacy position.
    let nameRegion: SavedNameRegion | null = null;
    const { data: regionData } = await getSupabaseAdmin()
      .from('settings')
      .select('value')
      .eq('key', 'template_name_region')
      .maybeSingle();

    if (regionData?.value) {
      try {
        const parsed = JSON.parse(regionData.value);
        if (parsed && typeof parsed === 'object' && typeof parsed.centerY === 'number') {
          nameRegion = parsed as SavedNameRegion;
        }
      } catch {
        nameRegion = null;
      }
    }

    return NextResponse.json({
      templateUrl,
      updatedAt: data?.updated_at ?? null,
      nameRegion,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

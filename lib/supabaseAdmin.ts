import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabaseAdmin: SupabaseClient | null = null;

/**
 * Admin Supabase client — uses the service role key.
 * NEVER expose this to the browser. Only use in API routes (server-side).
 * Bypasses RLS strictly for authorized backend operations.
 *
 * Lazily instantiated so Next.js build does not fail when env vars are not set.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error('FATAL SECURITY ERROR: getSupabaseAdmin() cannot be called client-side.');
  }

  if (_supabaseAdmin) return _supabaseAdmin;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.'
    );
  }

  _supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _supabaseAdmin;
}

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  // Warn instead of crashing immediately so build/startup is smooth
  console.warn('Warning: Missing Supabase environment variables in lib/supabase.ts');
}

/**
 * Public Supabase client — safe to use in browser and server components.
 * Uses the anon key; RLS policies restrict data access.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

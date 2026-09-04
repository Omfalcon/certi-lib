-- =============================================
-- IEEE Certificate Portal - Supabase Schema
-- Run this in the Supabase SQL Editor
-- =============================================

-- Enable RLS
-- 1. Participants table
CREATE TABLE IF NOT EXISTS public.participants (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  sapid       TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (email, sapid)
);

-- 2. Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_participants_lookup
  ON public.participants (lower(name), lower(email), sapid);

-- 3. Row Level Security (only service role can write)
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;

-- No public SELECT — only service role reads (via API route)
-- This keeps participant data private
CREATE POLICY "No public access"
  ON public.participants
  FOR ALL
  TO anon
  USING (false);

-- 4. Audit log for downloads
CREATE TABLE IF NOT EXISTS public.download_logs (
  id           BIGSERIAL PRIMARY KEY,
  sapid        TEXT NOT NULL,
  email        TEXT NOT NULL,
  ip_address   TEXT,
  downloaded_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.download_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No public access on logs"
  ON public.download_logs
  FOR ALL
  TO anon
  USING (false);

-- 5. Certificate template metadata
CREATE TABLE IF NOT EXISTS public.settings (
  key    TEXT PRIMARY KEY,
  value  TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No public access on settings"
  ON public.settings
  FOR ALL
  TO anon
  USING (false);

-- 6. Storage bucket for certificate template
-- Run this AFTER creating the table above
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificates', 'certificates', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read on the certificates bucket
CREATE POLICY "Public read certificate template"
  ON storage.objects
  FOR SELECT
  TO anon
  USING (bucket_id = 'certificates');

-- Only service role can upload
CREATE POLICY "Service role upload"
  ON storage.objects
  FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'certificates');

CREATE POLICY "Service role delete"
  ON storage.objects
  FOR DELETE
  TO service_role
  USING (bucket_id = 'certificates');

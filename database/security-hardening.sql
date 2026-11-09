-- SHM Reports: database and storage access lockdown
-- Apply this migration in the Supabase SQL editor only after confirming that
-- all required online sync/read operations use the trusted server API.
--
-- The current Android/web client has the public anon key and currently writes
-- directly to Supabase. This migration intentionally removes that access.
-- Offline capture and local PDF generation remain available, but direct
-- client-side cloud sync/listing will stop until a user-authenticated server
-- sync endpoint is deployed. Never put REPORTS_API_KEY or service_role in APK.

BEGIN;

-- Remove the PostgREST-visible public schema from anonymous and authenticated
-- client roles. The server service_role retains its privileged access.
REVOKE USAGE ON SCHEMA public FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;

-- Enforce row-level security on the report/session tables as defense in depth.
ALTER TABLE IF EXISTS public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reports FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sessions FORCE ROW LEVEL SECURITY;

-- Do not silently grant client access to newly-created public objects.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

-- Make document buckets private, including buckets created before this patch.
UPDATE storage.buckets
SET public = false
WHERE id IN ('shm-reports', 'shm-sessions', 'reports-pdfs');

COMMIT;

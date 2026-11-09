-- SHM Reports: database and storage access lockdown
-- Apply this migration in the Supabase SQL editor AFTER confirming that
-- all document sync/read operations have been moved to the trusted server.
-- The current APK uses the public anon key directly for sync; applying this
-- migration will intentionally block those direct client-side operations
-- until a server-authenticated sync flow is deployed.

BEGIN;

ALTER TABLE IF EXISTS public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reports FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sessions FORCE ROW LEVEL SECURITY;

-- No anon/authenticated grants: browser/mobile clients cannot query or mutate
-- reports and sessions through the Supabase REST endpoint.
REVOKE ALL PRIVILEGES ON TABLE public.reports FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.sessions FROM anon, authenticated;

-- Ensure document buckets are private. Server-side service_role operations
-- continue to work; public object URLs will no longer be readable.
UPDATE storage.buckets
SET public = false
WHERE id IN ('shm-reports', 'shm-sessions');

COMMIT;

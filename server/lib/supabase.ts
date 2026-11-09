import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

/**
 * Server-only privileged client. Configuration is validated at request time
 * so client builds do not need (and must never receive) the service-role key.
 */
export function getSupabaseAdmin(): SupabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase server credentials are not configured");
  }

  if (!adminClient) {
    adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: { "X-Client-Info": "shm-reports-server" },
      },
    });
  }

  return adminClient;
}

export async function ensureBucketExists(bucketName: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
  if (listError) throw new Error("Unable to inspect Supabase storage buckets");

  if (!buckets?.some((bucket) => bucket.name === bucketName)) {
    const { error } = await supabaseAdmin.storage.createBucket(bucketName, {
      public: false,
    });
    if (error) throw new Error("Unable to create private storage bucket");
  }
}

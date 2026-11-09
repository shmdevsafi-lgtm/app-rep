import type { RequestHandler } from "express";
import { getSupabaseAdmin } from "../lib/supabase";

export const handleListReports: RequestHandler = async (_req, res) => {
  const supabaseAdmin = getSupabaseAdmin();
  const [reportsResult, sessionsResult] = await Promise.all([
    supabaseAdmin.from("reports").select("*").order("created_at", { ascending: false }).limit(500),
    supabaseAdmin.from("sessions").select("*").order("created_at", { ascending: false }).limit(500),
  ]);

  if (reportsResult.error || sessionsResult.error) {
    console.error("Documents listing failed:", reportsResult.error?.code, sessionsResult.error?.code);
    res.status(500).json({ error: "Impossible de récupérer les documents" });
    return;
  }

  res.json({
    reports: reportsResult.data || [],
    sessions: sessionsResult.data || [],
  });
};

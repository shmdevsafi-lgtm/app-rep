import type { RequestHandler } from "express";
import { getSupabaseAdmin } from "../lib/supabase";

export const handleGenerateSession: RequestHandler = async (req, res) => {
  const {
    title,
    dateTime,
    targetAudience,
    objective,
    methodology,
    location,
  } = req.body ?? {};

  if (
    typeof title !== "string" || !title.trim() ||
    typeof dateTime !== "string" ||
    typeof targetAudience !== "string" ||
    typeof objective !== "string" ||
    typeof methodology !== "string" ||
    typeof location !== "string"
  ) {
    res.status(400).json({ error: "Données de séance invalides" });
    return;
  }

  const { data, error } = await getSupabaseAdmin()
    .from("sessions")
    .insert({
      title: title.trim().slice(0, 200),
      date_time: dateTime,
      location: location.slice(0, 200),
      target_audience: targetAudience.slice(0, 2000),
      objective: objective.slice(0, 5000),
      methodology_original: methodology.slice(0, 20000),
      methodology_reformulated: methodology.slice(0, 20000),
    })
    .select()
    .single();

  if (error) {
    console.error("Database insert failed:", error.code);
    res.status(500).json({ error: "Impossible d'enregistrer la séance" });
    return;
  }

  res.status(201).json({ success: true, data });
};

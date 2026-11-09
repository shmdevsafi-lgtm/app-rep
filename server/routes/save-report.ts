import type { RequestHandler } from "express";
import { getSupabaseAdmin } from "../lib/supabase";

export const handleSaveReport: RequestHandler = async (req, res) => {
  const payload = req.body?.body && typeof req.body.body === "object"
    ? req.body.body
    : req.body;

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    res.status(400).json({ error: "Données de rapport invalides" });
    return;
  }

  const {
    id,
    title,
    location,
    date,
    time,
    objective,
    participants_boys,
    participants_girls,
    leaders_count,
    category,
    beneficiary,
    description_original,
    description_reformulated,
    evaluation_positive,
    evaluation_negative,
    recommendations,
    pdf_url,
  } = payload;

  const count = (value: unknown) => {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
  };

  const report = {
    ...(typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id) ? { id } : {}),
    title: typeof title === "string" && title.trim() ? title.trim().slice(0, 255) : "Sans titre",
    location: typeof location === "string" ? location.slice(0, 255) : null,
    created_at: typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? `${date}T00:00:00.000Z`
      : new Date().toISOString(),
    time: typeof time === "string" ? time.slice(0, 100) : null,
    objective: typeof objective === "string" ? objective.slice(0, 10000) : null,
    participants_boys: count(participants_boys),
    participants_girls: count(participants_girls),
    leaders_count: count(leaders_count),
    category: typeof category === "string" ? category.slice(0, 255) : null,
    beneficiary: typeof beneficiary === "string" ? beneficiary.slice(0, 255) : null,
    description_original: typeof description_original === "string" ? description_original.slice(0, 50000) : null,
    description_reformulated: typeof description_reformulated === "string" ? description_reformulated.slice(0, 50000) : null,
    evaluation_positive: typeof evaluation_positive === "string" ? evaluation_positive.slice(0, 20000) : null,
    evaluation_negative: typeof evaluation_negative === "string" ? evaluation_negative.slice(0, 20000) : null,
    recommendations: typeof recommendations === "string" ? recommendations.slice(0, 20000) : null,
    ...(typeof pdf_url === "string" && /^https:\/\//i.test(pdf_url) ? { pdf_url: pdf_url.slice(0, 2048) } : {}),
  };

  const { data: savedReport, error } = await getSupabaseAdmin()
    .from("reports")
    .upsert(report, { onConflict: "id" })
    .select()
    .single();

  if (error) {
    console.error("Report persistence failed:", error.code);
    res.status(500).json({ error: "Impossible d'enregistrer le rapport" });
    return;
  }

  res.status(200).json({ success: true, report: savedReport });
};

import "dotenv/config";
import express from "express";
import cors from "cors";
import { timingSafeEqual } from "node:crypto";
import { handleGenerateSession } from "./routes/generate-session";
import { handleSaveReport } from "./routes/save-report";
import { handleListReports } from "./routes/list-reports";

export function createServer() {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  const allowedOrigins = (process.env.CORS_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(cors({
    origin(origin, callback) {
      // Requests without Origin (health checks / same-origin server calls) are
      // not granted browser CORS access; the API key remains mandatory below.
      if (!origin) return callback(null, false);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Api-Key"],
    credentials: false,
    maxAge: 600,
  }));

  app.use(express.json({ limit: "1mb", type: "application/json" }));
  app.use(express.urlencoded({ extended: false, limit: "1mb" }));

  app.get("/api/ping", (_req, res) => {
    res.status(200).json({ message: "ok" });
  });

  // Fail closed: never expose service-role operations when the server secret
  // is absent. Do not accept secrets in query strings (URLs are logged).
  const requireApiKey: express.RequestHandler = (req, res, next) => {
    const expected = process.env.REPORTS_API_KEY;
    if (!expected) {
      res.status(503).json({ error: "API sécurisée non configurée" });
      return;
    }

    const provided = req.get("x-api-key");
    if (!provided) {
      res.status(401).json({ error: "Non autorisé" });
      return;
    }

    const expectedBuffer = Buffer.from(expected, "utf8");
    const providedBuffer = Buffer.from(provided, "utf8");
    if (
      expectedBuffer.length !== providedBuffer.length ||
      !timingSafeEqual(expectedBuffer, providedBuffer)
    ) {
      res.status(401).json({ error: "Non autorisé" });
      return;
    }

    next();
  };

  app.post("/api/generate-session", requireApiKey, handleGenerateSession);
  app.post("/api/save-report", requireApiKey, handleSaveReport);
  app.get("/api/reports", requireApiKey, handleListReports);

  return app;
}

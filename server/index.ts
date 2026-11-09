import "dotenv/config";
import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import { timingSafeEqual } from "node:crypto";
import { handleGenerateSession } from "./routes/generate-session";
import { handleSaveReport } from "./routes/save-report";
import { handleListReports } from "./routes/list-reports";

export function createServer() {
  const app = express();

  // Middleware
  app.disable("x-powered-by");
  app.set("trust proxy", true);
  app.use(cors({
    origin: (process.env.CORS_ORIGIN || "").split(",").map((o: string) => o.trim()).filter(Boolean),
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Api-Key"],
  }));
  app.use(express.json({ limit: "10mb", type: "*/*" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  app.use((req, _res, next) => {
    if (typeof req.body === "string") {
      try {
        req.body = JSON.parse(req.body);
      } catch {
        // Leave malformed bodies for the route validation to reject.
      }
    }
    next();
  });

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  const requireApiKey = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const key = process.env.REPORTS_API_KEY;
    if (!key) return res.status(503).json({ error: "Serveur non configuré" });
    const provided = req.headers["x-api-key"];
    if (typeof provided !== "string" || provided.length !== key.length ||
        !timingSafeEqual(Buffer.from(provided), Buffer.from(key))) {
      return res.status(401).json({ error: "Non autorise" });
    }
    return next();
  };

  app.post("/api/generate-session", requireApiKey, handleGenerateSession);
  app.post("/api/save-report", requireApiKey, handleSaveReport);
  app.get("/api/reports", requireApiKey, handleListReports);

  return app;
}

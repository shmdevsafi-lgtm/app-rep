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

  // Compare the five login fields against Netlify runtime environment variables.
  app.post("/api/login", (req, res) => {
    const lastName = process.env.AUTH_LAST_NAME;
    const firstName = process.env.AUTH_FIRST_NAME;
    const birthDate = process.env.AUTH_BIRTH_DATE;
    const pin = process.env.AUTH_PIN;
    const password = process.env.AUTH_PASSWORD;
    if ([lastName, firstName, birthDate, pin, password].some((v) => !v)) {
      return res.status(503).json({ ok: false, error: "Connexion non configurée" });
    }
    const body = req.body ?? {};
    const clean = (v: unknown) => typeof v === "string" ? v.trim() : "";
    const ok =
      clean(body.lastName).toLowerCase() === lastName!.trim().toLowerCase() &&
      clean(body.firstName).toLowerCase() === firstName!.trim().toLowerCase() &&
      clean(body.birthDate) === birthDate!.trim() &&
      clean(body.pin) === pin!.trim() &&
      typeof body.password === "string" && body.password === password;
    return res.json({ ok });
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

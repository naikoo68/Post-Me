import express from "express";
import mongoose from "./db/odm.js";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

// Patch Express so any async route handler / middleware that rejects forwards
// the error to the error handler (equivalent to `express-async-errors`).
import Layer from "express/lib/router/layer.js";
import Tenant from "./models/Tenant.js";
import { runUnscoped } from "./utils/tenantContext.js";
const origHandle = Layer.prototype.handle_request;
Layer.prototype.handle_request = function handleRequest(req, res, next) {
  try {
    const ret = origHandle.call(this, req, res, next);
    if (ret && typeof ret.catch === "function") ret.catch(next);
  } catch (err) {
    next(err);
  }
};
const origHandleErr = Layer.prototype.handle_error;
Layer.prototype.handle_error = function handleError(err, req, res, next) {
  try {
    const ret = origHandleErr.call(this, err, req, res, next);
    if (ret && typeof ret.catch === "function") ret.catch(next);
  } catch (e) {
    next(e);
  }
};

// Accounts, clients & content (the material that gets posted)
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import tenantRoutes from "./routes/tenantRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import contentRoutes from "./routes/contentRoutes.js";
import practiceRoutes from "./routes/practiceRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
// Social auto-posting & content generation
import facebookRoutes from "./routes/facebookRoutes.js";
import youtubeRoutes from "./routes/youtubeRoutes.js";
import socialProfileRoutes from "./routes/socialProfileRoutes.js";
import voiceStudioRoutes from "./routes/voiceStudioRoutes.js";
import { socialProfileMiddleware } from "./utils/socialProfile.js";
import { runDueFbSchedules, fbSchedulerStatus } from "./config/facebook.js";

import { notFound, errorHandler } from "./middleware/error.js";
import { isMailConfigured, verifyMail } from "./config/mailer.js";
import { isCloudinaryConfigured } from "./config/cloudinary.js";
import { protect, authorize } from "./middleware/auth.js";
import { resolveTenant } from "./middleware/tenant.js";
import { sanitizeRequest } from "./middleware/sanitizeRequest.js";

const app = express();

// Trust exactly one reverse-proxy hop (nginx) so rate limiting sees real IPs.
app.set("trust proxy", 1);

app.use(helmet());
app.use(compression());

// CORS: default-deny unknown browser origins. Allowed = CLIENT_URL +
// CORS_ALLOWED_ORIGINS, subdomains of CORS_ALLOWED_DOMAINS / PLATFORM_BASE_DOMAIN,
// and any registered client (tenant) custom domain. Requests without an Origin
// (curl, server-to-server) pass. Auth is a JWT header, never cookies.
const exactAllow = new Set(
  [process.env.CLIENT_URL, ...(process.env.CORS_ALLOWED_ORIGINS || "").split(",")]
    .map((o) => String(o || "").trim().replace(/\/$/, "").toLowerCase())
    .filter(Boolean)
);
const wildcardDomains = [
  ...(process.env.CORS_ALLOWED_DOMAINS || "").split(","),
  process.env.PLATFORM_BASE_DOMAIN || "",
]
  .map((d) => String(d || "").trim().toLowerCase().replace(/^\.*/, ""))
  .filter(Boolean);
const hostMatchesWildcard = (host) => wildcardDomains.some((d) => host === d || host.endsWith("." + d));

let tenantDomainCache = { at: 0, set: new Set() };
async function isRegisteredTenantHost(host) {
  if (Date.now() - tenantDomainCache.at > 60 * 1000) {
    try {
      const rows = await runUnscoped(() =>
        Tenant.find({ customDomain: { $exists: true, $ne: null } }).select("customDomain").lean()
      );
      tenantDomainCache = {
        at: Date.now(),
        set: new Set(rows.map((t) => String(t.customDomain || "").toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, ""))),
      };
    } catch { /* keep previous cache on a transient DB error */ }
  }
  return tenantDomainCache.set.has(host);
}

const corsOrigin = async (origin, callback) => {
  if (!origin) return callback(null, true);
  if (process.env.NODE_ENV === "development") return callback(null, true);
  let host;
  try { host = new URL(origin).hostname.toLowerCase(); } catch { return callback(new Error("Not allowed by CORS")); }
  const o = origin.replace(/\/$/, "").toLowerCase();
  if (exactAllow.has(o) || hostMatchesWildcard(host) || (await isRegisteredTenantHost(host))) {
    return callback(null, true);
  }
  console.warn(`[CORS] blocked request from origin: ${origin}`);
  return callback(new Error("Not allowed by CORS"));
};
app.use(cors({ origin: corsOrigin, credentials: false }));
// Restore endpoints attach their own larger JSON parser at the route level.
const RESTORE_PATHS = ["/api/practice/restore/start"];
const globalJson = express.json({ limit: "10mb" });
app.use((req, res, next) => (RESTORE_PATHS.includes(req.path) ? next() : globalJson(req, res, next)));
app.use(express.urlencoded({ extended: true }));
app.use(sanitizeRequest); // strip "$"/"." keys (NoSQL-injection guard)
if (process.env.NODE_ENV !== "test") app.use(morgan("dev"));

// Multi-tenancy: every Post Me client is a tenant with its own settings,
// social connections, schedules and content.
app.use(resolveTenant);

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50 });

// Health check. Also fires any due scheduled posts (throttled), so an external
// keep-alive ping keeps auto-posting running on hosts that sleep.
const DB_STATES = ["disconnected", "connected", "connecting", "disconnecting", "uninitialized"];
let lastSweep = 0;
app.get("/api/health", async (req, res) => {
  const now = Date.now();
  if (now - lastSweep > 60 * 1000) {
    lastSweep = now;
    runDueFbSchedules().catch(() => {});
  }

  const state = mongoose.connection?.readyState ?? 0;
  let dbStatus = DB_STATES[state] || "unknown";
  let dbOk = state === 1;
  if (state === 1 && mongoose.connection?.db?.admin) {
    try {
      await Promise.race([
        mongoose.connection.db.admin().ping(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("ping timeout")), 4000)),
      ]);
      dbOk = true;
    } catch {
      dbOk = false;
      dbStatus = "unreachable";
    }
  }

  res.status(dbOk ? 200 : 503).json({
    status: dbOk ? "ok" : "degraded",
    service: "post-me-api",
    db: dbStatus,
    dbOk,
    fbScheduler: fbSchedulerStatus,
    mailConfigured: isMailConfigured(),
    uploadConfigured: isCloudinaryConfigured(),
  });
});

app.get("/api/health/mail", protect, authorize("admin"), async (req, res) => res.json(await verifyMail()));

// Accounts, clients & content
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/tenants", tenantRoutes); // super-admin: manage Post Me clients
app.use("/api/settings", socialProfileMiddleware, settingsRoutes);
app.use("/api", contentRoutes); // streams/subjects/topics/questions = the posts' source content
app.use("/api/practice", practiceRoutes); // practice streams/subjects/topics/items (also a post source)
app.use("/api/upload", uploadRoutes);

// Social auto-posting & content generation
app.use("/api/facebook", socialProfileMiddleware, facebookRoutes); // FB/IG/Telegram schedules, reels, images
app.use("/api/youtube", socialProfileMiddleware, youtubeRoutes); // YouTube OAuth, Shorts, long videos
app.use("/api/voice-studio", socialProfileMiddleware, voiceStudioRoutes); // cloned-voice narration
app.use("/api/social-profiles", socialProfileRoutes); // cross-posting profiles

app.use(notFound);
app.use(errorHandler);

export default app;

import "dotenv/config";
// Register global model plugins (tenantId etc.) BEFORE app.js pulls in models.
import "./config/registerModelPlugins.js";
import app from "./app.js";
import connectDB from "./config/db.js";
import { ensureAdminFromEnv } from "./utils/ensureAdmin.js";
import { runDueFbSchedules } from "./config/facebook.js";
import { assertNodeEnv } from "./utils/env.js";

const PORT = process.env.PORT || 5000;

// Detached fatal errors: log, drain for a few seconds, exit non-zero. Run the
// container with `--restart always` so a fresh process replaces it.
let httpServer = null;
let shuttingDown = false;
function fatalShutdown(label, err) {
  console.error(`[${label}]`, err?.stack || err);
  if (shuttingDown) return;
  shuttingDown = true;
  const force = setTimeout(() => process.exit(1), 5000);
  force.unref();
  try {
    if (httpServer) httpServer.close(() => process.exit(1));
    else process.exit(1);
  } catch {
    process.exit(1);
  }
}
process.on("unhandledRejection", (reason) => fatalShutdown("unhandledRejection", reason));
process.on("uncaughtException", (err) => fatalShutdown("uncaughtException", err));

async function start() {
  assertNodeEnv();
  await connectDB();

  httpServer = app.listen(PORT, () => {
    console.log(`✔ Post Me API running on http://localhost:${PORT}`);
  });

  // Old rows without a social profile → main account (idempotent).
  import("./utils/socialProfile.js").then((m) => m.ensureProfileIdBackfill()).catch(() => {});

  // Scheduled auto-posting: check every minute for due schedules.
  setInterval(() => { runDueFbSchedules().catch(() => {}); }, 60 * 1000);

  // Long videos cut off by a restart: mark failed (with Retry) / re-queue.
  import("./config/longVideo.js")
    .then((m) => m.recoverInterruptedLongVideoJobs())
    .catch((e) => console.error("Long-video recovery skipped:", e?.message || e));

  // Create / recover the super-admin from ADMIN_EMAIL / ADMIN_PASSWORD.
  ensureAdminFromEnv().catch((e) => console.error("ensureAdmin skipped:", e.message));
}

start();

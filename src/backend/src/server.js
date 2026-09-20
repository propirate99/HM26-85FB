import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "./config/env.js";
import { connectDatabase } from "./config/database.js";
import { createApp } from "./app.js";
import { startEscalationJob } from "./jobs/escalation.job.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const portFilePath = path.resolve(__dirname, "../../.active-port");

const app = createApp();

function startServer(portToTry) {
  const server = app.listen(portToTry, () => {
    console.log(`CivicVerify API listening on :${portToTry}`);
    try {
      fs.writeFileSync(portFilePath, String(portToTry), "utf-8");
    } catch {}
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      const nextPort = portToTry + 1;
      console.warn(`[Server] Port ${portToTry} in use, trying port ${nextPort}...`);
      startServer(nextPort);
    } else {
      console.error("[Server] Fatal server error:", err.message);
      process.exit(1);
    }
  });
}

connectDatabase()
  .then(() => {
    startEscalationJob();
    startServer(env.port);
  })
  .catch((err) => {
    console.error("Database connection failed:", err.message);
    process.exit(1);
  });

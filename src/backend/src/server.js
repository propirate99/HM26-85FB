import { env } from "./config/env.js";
import { connectDatabase } from "./config/database.js";
import { createApp } from "./app.js";
import { startEscalationJob } from "./jobs/escalation.job.js";

const app = createApp();

function startServer(portToTry) {
  const server = app.listen(portToTry, () => {
    console.log(`CivicVerify API listening on :${portToTry}`);
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

import http from "node:http";
import env from "./config/env.js";
import connectDB, { disconnectDB } from "./config/db.js";
import app from "./app.js";
import logger from "./utils/logger.js";

const server = http.createServer(app);
let shuttingDown = false;

const shutdown = async (signal, exitCode = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info({ signal }, "Shutting down");

  const forceExit = setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
  forceExit.unref();

  server.close(async (error) => {
    if (error) {
      logger.error({ err: error }, "Failed to close HTTP server");
      exitCode = 1;
    }

    try {
      await disconnectDB();
    } catch (dbError) {
      logger.error({ err: dbError }, "Failed to close MongoDB connection");
      exitCode = 1;
    }

    clearTimeout(forceExit);
    process.exit(exitCode);
  });
};

const start = async () => {
  try {
    await connectDB();
    server.listen(env.PORT, () => {
      logger.info({ port: env.PORT, env: env.NODE_ENV }, "API listening");
    });
  } catch (error) {
    logger.fatal({ err: error }, "Failed to start API");
    process.exit(1);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("unhandledRejection", (reason) => {
  logger.fatal({ err: reason }, "Unhandled promise rejection");
  shutdown("unhandledRejection", 1);
});

process.on("uncaughtException", (error) => {
  logger.fatal({ err: error }, "Uncaught exception");
  shutdown("uncaughtException", 1);
});

start();

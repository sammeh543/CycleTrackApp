// CycleSense Server Entry Point
// (formerly CycleTrackApp)

console.log("SERVER STARTED");
console.log("STARTING SERVER INDEX");

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { config } from "./config";
import { ensureDataDirectory } from "./ensure-data-dir";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Top-level error handler for async startup errors
process.on("unhandledRejection", (reason) => {
  console.error("[FATAL] Unhandled Promise rejection:", reason);
  process.exit(1);
});
process.on("uncaughtException", (err) => {
  console.error("[FATAL] Uncaught Exception:", err);
  process.exit(1);
});

(async () => {
  try {
    // Ensure the data directory exists
    ensureDataDirectory();
    console.log("[DEBUG] Data directory ensured.");
    const server = await registerRoutes(app);
    console.log("[DEBUG] Routes registered.");

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error("[ERROR] Express error handler:", err);
      res.status(status).json({ message });
      throw err;
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      console.log("[DEBUG] Setting up Vite (development mode)...");
      await setupVite(app, server);
      console.log("[DEBUG] Vite setup complete.");
    } else {
      console.log("[DEBUG] Serving static files (production mode)...");
      serveStatic(app);
      console.log("[DEBUG] Static files served.");
    }

    // Use port from config or fallback to 5000
    // this serves both the API and the client
    const port = config.port || 5000;
    const host = config.host || "0.0.0.0";
    server.listen({
      port,
      host,
      reusePort: true,
    }, () => {
      log(`CycleSense serving at http://${host}:${port}`);
      log(`Data path: ${config.dataPath}`);
    }).on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`[FATAL] Port ${port} is already in use. Please free it or use a different port.`);
        process.exit(1);
      } else {
        throw err;
      }
    });
  } catch (err) {
    console.error("[FATAL] Startup error:", err);
    process.exit(1);
  }
})();

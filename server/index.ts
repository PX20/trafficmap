import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

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

(async () => {
  // Production environment validation
  function validateEnvironment() {
    const isProduction = process.env.NODE_ENV === 'production';
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Check critical environment variables
    const checks = {
      'DATABASE_URL': process.env.DATABASE_URL,
      'SESSION_SECRET': process.env.SESSION_SECRET,
      'STRIPE_SECRET_KEY': process.env.STRIPE_SECRET_KEY,
      'VAPID_PRIVATE_KEY': process.env.VAPID_PRIVATE_KEY,
      'REPLIT_DB_URL': process.env.REPLIT_DB_URL
    };

    let hasErrors = false;
    
    Object.entries(checks).forEach(([key, value]) => {
      if (value) {
        console.log(`✅ ${key}: configured`);
      } else {
        const level = ['DATABASE_URL', 'SESSION_SECRET'].includes(key) ? '❌' : '⚠️';
        console.log(`${level} ${key}: missing`);
        if (level === '❌' && isProduction) {
          hasErrors = true;
        }
      }
    });

    if (hasErrors) {
      console.error('💥 Critical environment variables missing in production!');
      process.exit(1);
    }
  }

  validateEnvironment();
  const server = await registerRoutes(app);

  // Health check endpoint for production monitoring
  app.get('/healthz', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    const requestId = req.headers['x-request-id'] || 'unknown';

    // Log error details for debugging (don't re-throw in production)
    console.error(`[ERROR ${requestId}] ${req.method} ${req.path} - Status: ${status}`);
    console.error(`[ERROR ${requestId}] Message: ${message}`);
    if (err.stack) {
      console.error(`[ERROR ${requestId}] Stack: ${err.stack}`);
    }

    res.status(status).json({ message });
    // DO NOT re-throw - this crashes production servers
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();

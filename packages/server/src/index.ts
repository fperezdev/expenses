import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "./auth";
import { sync } from "./sync";

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
  ASSETS: Fetcher;
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS for the PWA client
app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PATCH", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
}));

// Health check
app.get("/api/health", (c) => c.json({ status: "ok" }));

// Auth routes
app.route("/api/auth", auth);

// Sync routes (protected)
app.route("/api/sync", sync);

// SPA fallback: delegate to static assets
app.get("*", (c) => c.env.ASSETS.fetch(c.req.raw));

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: err.message, stack: err.stack }, 500);
});

export default app;

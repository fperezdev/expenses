import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "./auth";
import { sync } from "./sync";

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// COOP/COEP headers required for SQLite WASM OPFS
app.use("*", async (c, next) => {
  await next();
  c.res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  c.res.headers.set("Cross-Origin-Embedder-Policy", "require-corp");
});

// CORS for the PWA client
app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
}));

// Health check
app.get("/api/health", (c) => c.json({ status: "ok" }));

// Auth routes
app.route("/api/auth", auth);

// Sync routes (protected)
app.route("/api/sync", sync);

export default app;

import { Hono } from "hono";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { authMiddleware } from "./middleware";

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
};

const auth = new Hono<{ Bindings: Bindings; Variables: { userId: string } }>();

function getSecret(env: Bindings): Uint8Array {
  return new TextEncoder().encode(env.JWT_SECRET);
}

// POST /api/auth/register
auth.post("/register", async (c) => {
  const { email, password, timezone } = await c.req.json<{ email: string; password: string; timezone?: string }>();

  if (!email || !password) {
    return c.json({ error: "Email and password required", code: "VALIDATION" }, 400);
  }
  if (password.length < 6) {
    return c.json({ error: "Password must be at least 6 characters", code: "VALIDATION" }, 400);
  }

  // Check if user exists
  const existing = await c.env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
  if (existing) {
    return c.json({ error: "Email already registered", code: "DUPLICATE" }, 409);
  }

  const id = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(password, 10);
  const tz = timezone || "";

  await c.env.DB.prepare(
    "INSERT INTO users (id, email, password_hash, timezone) VALUES (?, ?, ?, ?)"
  ).bind(id, email, passwordHash, tz).run();

  const token = await new SignJWT({ sub: id, email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret(c.env));

  return c.json({ token, user: { id, email, timezone: tz, created_at: new Date().toISOString() } }, 201);
});

// POST /api/auth/login
auth.post("/login", async (c) => {
  const { email, password } = await c.req.json<{ email: string; password: string }>();

  if (!email || !password) {
    return c.json({ error: "Email and password required", code: "VALIDATION" }, 400);
  }

  const user = await c.env.DB.prepare(
    "SELECT id, email, password_hash, timezone, created_at FROM users WHERE email = ?"
  ).bind(email).first<{ id: string; email: string; password_hash: string; timezone: string; created_at: string }>();

  if (!user) {
    return c.json({ error: "Invalid email or password", code: "AUTH_FAILED" }, 401);
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return c.json({ error: "Invalid email or password", code: "AUTH_FAILED" }, 401);
  }

  const token = await new SignJWT({ sub: user.id, email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret(c.env));

  return c.json({ token, user: { id: user.id, email: user.email, timezone: user.timezone || "", created_at: user.created_at } });
});

// PATCH /api/auth/profile
auth.patch("/profile", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const { timezone } = await c.req.json<{ timezone: string }>();

  if (typeof timezone !== "string") {
    return c.json({ error: "Timezone is required", code: "VALIDATION" }, 400);
  }

  await c.env.DB.prepare(
    "UPDATE users SET timezone = ? WHERE id = ?"
  ).bind(timezone, userId).run();

  return c.json({ success: true, user: { id: userId, timezone } });
});

export { auth };

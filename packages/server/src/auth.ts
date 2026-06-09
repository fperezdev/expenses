import { Hono } from "hono";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
};

const auth = new Hono<{ Bindings: Bindings }>();

function getSecret(env: Bindings): Uint8Array {
  return new TextEncoder().encode(env.JWT_SECRET);
}

// POST /api/auth/register
auth.post("/register", async (c) => {
  const { email, password } = await c.req.json<{ email: string; password: string }>();

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

  await c.env.DB.prepare(
    "INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)"
  ).bind(id, email, passwordHash).run();

  const token = await new SignJWT({ sub: id, email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret(c.env));

  return c.json({ token, user: { id, email, created_at: new Date().toISOString() } }, 201);
});

// POST /api/auth/login
auth.post("/login", async (c) => {
  const { email, password } = await c.req.json<{ email: string; password: string }>();

  if (!email || !password) {
    return c.json({ error: "Email and password required", code: "VALIDATION" }, 400);
  }

  const user = await c.env.DB.prepare(
    "SELECT id, email, password_hash, created_at FROM users WHERE email = ?"
  ).bind(email).first<{ id: string; email: string; password_hash: string; created_at: string }>();

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

  return c.json({ token, user: { id: user.id, email: user.email, created_at: user.created_at } });
});

export { auth };

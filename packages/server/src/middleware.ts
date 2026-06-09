import type { Context, Next } from "hono";
import { jwtVerify } from "jose";

type Bindings = {
  JWT_SECRET: string;
};

export async function authMiddleware(
  c: Context<{ Bindings: Bindings; Variables: { userId: string } }>,
  next: Next
) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized", code: "AUTH_REQUIRED" }, 401);
  }

  const token = authHeader.slice(7);
  try {
    const secret = new TextEncoder().encode(c.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    c.set("userId", payload.sub as string);
    await next();
  } catch {
    return c.json({ error: "Invalid or expired token", code: "AUTH_FAILED" }, 401);
  }
}

import { createHash, timingSafeEqual } from "node:crypto";

const hash = (s) => createHash("sha256").update(String(s)).digest();

// Returns null when the request is allowed, or a Response to send back.
export function requireAdmin(req) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return Response.json({ error: "ADMIN_PASSWORD is not set in Netlify. Add it under Site configuration > Environment variables, then redeploy." }, { status: 500 });
  }
  const given = req.headers.get("x-admin-password") || "";
  if (!given || !timingSafeEqual(hash(given), hash(expected))) {
    return Response.json({ error: "Wrong password." }, { status: 401 });
  }
  return null;
}

import { requireAdmin } from "./_auth.mjs";

// POST /api/login -> 200 when the x-admin-password header is right
export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const denied = requireAdmin(req);
  if (denied) return denied;
  return Response.json({ ok: true });
};

export const config = { path: "/api/login" };

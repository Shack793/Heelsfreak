import { getStore } from "@netlify/blobs";
import { requireAdmin } from "./_auth.mjs";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

// POST /api/upload (admin only), body = image bytes -> { url: "/api/img/<key>" }
export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const denied = requireAdmin(req);
  if (denied) return denied;
  const type = (req.headers.get("content-type") || "").split(";")[0].trim();
  if (!TYPES[type]) return Response.json({ error: "Upload a JPG, PNG or WebP image." }, { status: 415 });
  const bytes = await req.arrayBuffer();
  if (!bytes.byteLength) return Response.json({ error: "The image is empty." }, { status: 400 });
  if (bytes.byteLength > MAX_BYTES) return Response.json({ error: "The image is larger than 5 MB." }, { status: 413 });
  const key = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${TYPES[type]}`;
  await getStore("heelsfreak-images").set(key, bytes, { metadata: { type } });
  return Response.json({ url: `/api/img/${key}` });
};

export const config = { path: "/api/upload" };

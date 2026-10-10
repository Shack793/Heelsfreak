import { getStore } from "@netlify/blobs";
import { requireAdmin } from "./_auth.mjs";

const MAX_BYTES = 4 * 1024 * 1024;

// GET  /api/store  -> the live store data (404 {empty:true} until the first publish)
// PUT  /api/store  -> replace the store data (admin only)
export default async (req) => {
  const blobs = getStore("heelsfreak");

  if (req.method === "GET") {
    const data = await blobs.get("store", { type: "json", consistency: "strong" });
    if (!data) return Response.json({ empty: true }, { status: 404, headers: { "cache-control": "no-store" } });
    return Response.json(data, { headers: { "cache-control": "no-store" } });
  }

  if (req.method === "PUT") {
    const denied = requireAdmin(req);
    if (denied) return denied;
    const text = await req.text();
    if (text.length > MAX_BYTES) return Response.json({ error: "Store data is too large. Upload photos instead of pasting them." }, { status: 413 });
    let data;
    try { data = JSON.parse(text); } catch { return Response.json({ error: "Store data is not valid JSON." }, { status: 400 }); }
    if (!data || typeof data.settings !== "object" || !Array.isArray(data.products)) {
      return Response.json({ error: "Store data is missing settings or products." }, { status: 400 });
    }
    const previous = await blobs.get("store", { type: "json", consistency: "strong" });
    if (previous) await blobs.setJSON("store-previous", previous);
    await blobs.setJSON("store", data);
    return Response.json({ ok: true, savedAt: new Date().toISOString() });
  }

  return new Response("Method not allowed", { status: 405, headers: { allow: "GET, PUT" } });
};

export const config = { path: "/api/store" };

import { getStore } from "@netlify/blobs";

// GET /api/img/<key> -> serves an uploaded product photo
export default async (req, context) => {
  const key = context.params.key;
  if (!key || !/^[a-z0-9-]+\.(jpg|png|webp)$/.test(key)) return new Response("Not found", { status: 404 });
  const entry = await getStore("heelsfreak-images").getWithMetadata(key, { type: "stream" });
  if (!entry) return new Response("Not found", { status: 404 });
  return new Response(entry.data, {
    headers: { "content-type": entry.metadata?.type || "image/jpeg", "cache-control": "public, max-age=31536000, immutable" }
  });
};

export const config = { path: "/api/img/:key" };

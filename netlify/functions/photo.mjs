import {
  json,
  corsHeaders,
  requireAdmin,
  getPhotoBytes,
  loadSites,
  findSiteById,
  listPhotoMetas,
} from "./lib/store.mjs";

export async function handler(event) {
  const origin = event.headers.origin || event.headers.Origin || "*";
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(origin), body: "" };
  }
  const denied = requireAdmin(event, origin);
  if (denied) return denied;
  if (event.httpMethod !== "GET") {
    return json(405, { error: "Method not allowed" }, origin);
  }
  try {
    const photoId = event.queryStringParameters?.id;
    const siteId = event.queryStringParameters?.siteId;
    if (!photoId || !siteId) {
      return json(400, { error: "id and siteId required" }, origin);
    }
    const { sites } = await loadSites();
    if (!findSiteById(sites, siteId)) {
      return json(404, { error: "Site not found" }, origin);
    }
    const photos = await listPhotoMetas(siteId);
    const meta = photos.find((p) => p.id === photoId);
    if (!meta) return json(404, { error: "Photo not found" }, origin);
    const file = await getPhotoBytes(meta.blobKey);
    if (!file) return json(404, { error: "Bytes missing" }, origin);
    return {
      statusCode: 200,
      headers: {
        "Content-Type": file.contentType || "image/jpeg",
        "Cache-Control": "private, max-age=3600",
        ...corsHeaders(origin),
      },
      isBase64Encoded: true,
      body: Buffer.from(file.data).toString("base64"),
    };
  } catch (err) {
    console.error(err);
    return json(500, { error: err.message || "Server error" }, origin);
  }
}

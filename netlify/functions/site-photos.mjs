import {
  json,
  corsHeaders,
  requireAdmin,
  ensureSeeded,
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
    await ensureSeeded();
    const siteId = event.queryStringParameters?.siteId;
    if (!siteId) return json(400, { error: "siteId required" }, origin);
    const { sites } = await loadSites();
    const site = findSiteById(sites, siteId);
    if (!site) return json(404, { error: "Site not found" }, origin);
    const photos = await listPhotoMetas(siteId);
    const byDate = {};
    for (const p of photos) {
      if (!byDate[p.date]) byDate[p.date] = [];
      byDate[p.date].push(p);
    }
    const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));
    return json(
      200,
      {
        site: {
          id: site.id,
          name: site.name,
          uploadToken: site.uploadToken,
        },
        dates: dates.map((d) => ({
          date: d,
          photos: byDate[d],
        })),
        photoCount: photos.length,
      },
      origin
    );
  } catch (err) {
    console.error(err);
    return json(500, { error: err.message || "Server error" }, origin);
  }
}

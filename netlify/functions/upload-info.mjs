import {
  json,
  corsHeaders,
  ensureSeeded,
  loadSites,
  findSiteByToken,
} from "./lib/store.mjs";

export async function handler(event) {
  const origin = event.headers.origin || event.headers.Origin || "*";
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(origin), body: "" };
  }
  if (event.httpMethod !== "GET") {
    return json(405, { error: "Method not allowed" }, origin);
  }
  try {
    await ensureSeeded();
    const token =
      event.queryStringParameters?.token ||
      event.queryStringParameters?.t ||
      "";
    if (!token) return json(400, { error: "token required" }, origin);
    const { sites } = await loadSites();
    const site = findSiteByToken(sites, token);
    if (!site) return json(404, { error: "Invalid upload link" }, origin);
    return json(200, { siteName: site.name, siteId: site.id }, origin);
  } catch (err) {
    console.error(err);
    return json(500, { error: err.message || "Server error" }, origin);
  }
}

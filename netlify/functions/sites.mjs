import {
  json,
  corsHeaders,
  requireAdmin,
  ensureSeeded,
  loadSites,
  saveSites,
  newId,
  listPhotoMetas,
} from "./lib/store.mjs";
import { randomBytes } from "node:crypto";

export async function handler(event) {
  const origin = event.headers.origin || event.headers.Origin || "*";
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(origin), body: "" };
  }
  const denied = requireAdmin(event, origin);
  if (denied) return denied;

  try {
    await ensureSeeded();

    if (event.httpMethod === "GET") {
      const { sites } = await loadSites();
      const withCounts = await Promise.all(
        sites.map(async (s) => {
          const photos = await listPhotoMetas(s.id);
          const dates = [...new Set(photos.map((p) => p.date))];
          const last = photos[0]?.uploadedAt || null;
          return {
            id: s.id,
            name: s.name,
            uploadToken: s.uploadToken,
            createdAt: s.createdAt,
            photoCount: photos.length,
            dateCount: dates.length,
            lastUploadAt: last,
          };
        })
      );
      return json(200, { sites: withCounts }, origin);
    }

    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      const name = String(body.name || "").trim();
      if (!name) return json(400, { error: "Name required" }, origin);
      const { sites } = await loadSites();
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 24) || "site";
      const site = {
        id: newId("site"),
        name,
        uploadToken: `${slug}-${randomBytes(16).toString("hex")}`,
        createdAt: new Date().toISOString(),
      };
      sites.push(site);
      await saveSites(sites, true);
      return json(201, { site }, origin);
    }

    if (event.httpMethod === "PATCH") {
      const body = JSON.parse(event.body || "{}");
      const { id, name } = body;
      if (!id || !name?.trim()) {
        return json(400, { error: "id and name required" }, origin);
      }
      const { sites } = await loadSites();
      const idx = sites.findIndex((s) => s.id === id);
      if (idx === -1) return json(404, { error: "Site not found" }, origin);
      sites[idx] = { ...sites[idx], name: String(name).trim() };
      await saveSites(sites, true);
      return json(200, { site: sites[idx] }, origin);
    }

    return json(405, { error: "Method not allowed" }, origin);
  } catch (err) {
    console.error(err);
    return json(500, { error: err.message || "Server error" }, origin);
  }
}

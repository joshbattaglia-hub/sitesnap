import { getStore } from "@netlify/blobs";
import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";

const STORE_NAME = "sitesnap";
const SITES_KEY = "sites-registry";
const PHOTO_META_PREFIX = "meta/";
const PHOTO_BYTES_PREFIX = "bytes/";

export const SEED_SITES = [
  {
    id: "site-mernda",
    name: "Demo Mernda",
    uploadToken: "mernda-928d4595a4868100d4a694d68971da38",
  },
  {
    id: "site-moe",
    name: "Demo Moe",
    uploadToken: "moe-5904b37bf247e4f13eee42e020460d6a",
  },
  {
    id: "site-lansvale",
    name: "Demo Lansvale",
    uploadToken: "lansvale-82728dcea797051eb416c6b251ba4fe6",
  },
];

export function getSnapStore() {
  const siteID =
    process.env.BLOBS_SITE_ID ||
    process.env.NETLIFY_SITE_ID ||
    process.env.SITE_ID;
  const token = process.env.BLOBS_TOKEN || process.env.NETLIFY_AUTH_TOKEN;

  if (siteID && token) {
    return getStore({
      name: STORE_NAME,
      siteID,
      token,
      consistency: "strong",
    });
  }

  return getStore({ name: STORE_NAME, consistency: "strong" });
}

export function melbourneDate(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Melbourne",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function newId(prefix = "id") {
  return `${prefix}-${randomBytes(8).toString("hex")}`;
}

export function corsHeaders(origin = "*") {
  return {
    "Access-Control-Allow-Origin": origin === "null" ? "*" : origin || "*",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  };
}

export function json(status, body, origin = "*", extraHeaders = {}) {
  return {
    statusCode: status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  };
}

export async function loadSites() {
  const store = getSnapStore();
  const raw = await store.get(SITES_KEY, { type: "json" });
  if (!raw || !Array.isArray(raw.sites)) {
    return { sites: [], seeded: false };
  }
  return { sites: raw.sites, seeded: !!raw.seeded };
}

export async function saveSites(sites, seeded = true) {
  const store = getSnapStore();
  await store.setJSON(SITES_KEY, {
    sites,
    seeded,
    updatedAt: new Date().toISOString(),
  });
}

export async function ensureSeeded() {
  const { sites, seeded } = await loadSites();
  if (sites.length > 0 || seeded) {
    return { sites, created: false };
  }
  const now = new Date().toISOString();
  const seededSites = SEED_SITES.map((s) => ({
    ...s,
    createdAt: now,
  }));
  await saveSites(seededSites, true);
  return { sites: seededSites, created: true };
}

export function findSiteByToken(sites, token) {
  return sites.find((s) => s.uploadToken === token) || null;
}

export function findSiteById(sites, id) {
  return sites.find((s) => s.id === id) || null;
}

export function photoMetaKey(siteId, date, photoId) {
  return `${PHOTO_META_PREFIX}${siteId}/${date}/${photoId}`;
}

export function photoBytesKey(siteId, date, photoId) {
  return `${PHOTO_BYTES_PREFIX}${siteId}/${date}/${photoId}`;
}

export async function listPhotoMetas(siteId) {
  const store = getSnapStore();
  const prefix = `${PHOTO_META_PREFIX}${siteId}/`;
  const listed = await store.list({ prefix });
  const blobs = listed?.blobs || [];
  const metas = [];
  for (const b of blobs) {
    const meta = await store.get(b.key, { type: "json" });
    if (meta) metas.push(meta);
  }
  metas.sort((a, b) => (b.uploadedAt || "").localeCompare(a.uploadedAt || ""));
  return metas;
}

export async function savePhoto({ siteId, date, photoId, bytes, contentType, note, originalFilename }) {
  const store = getSnapStore();
  const metaKey = photoMetaKey(siteId, date, photoId);
  const bytesKey = photoBytesKey(siteId, date, photoId);
  const uploadedAt = new Date().toISOString();
  const meta = {
    id: photoId,
    siteId,
    date,
    uploadedAt,
    note: note || "",
    originalFilename: originalFilename || "photo.jpg",
    blobKey: bytesKey,
    contentType: contentType || "image/jpeg",
  };
  await store.set(bytesKey, bytes, {
    metadata: { contentType: meta.contentType, siteId, date },
  });
  await store.setJSON(metaKey, meta);
  return meta;
}

export async function getPhotoBytes(bytesKey) {
  const store = getSnapStore();
  const result = await store.getWithMetadata(bytesKey, { type: "arrayBuffer" });
  if (!result || !result.data) return null;
  return {
    data: result.data,
    contentType: result.metadata?.contentType || "image/jpeg",
  };
}

function sessionSecret() {
  return process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "sitesnap-dev";
}

export function createSessionCookie() {
  const payload = {
    role: "admin",
    iat: Date.now(),
  };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", sessionSecret()).update(data).digest("base64url");
  const token = `${data}.${sig}`;
  const secure = process.env.NODE_ENV === "production" || !!process.env.NETLIFY;
  const parts = [
    `sitesnap_session=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=604800",
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function clearSessionCookie() {
  return "sitesnap_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0";
}

export function parseCookies(header = "") {
  const out = {};
  for (const part of String(header).split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

export function verifySession(event) {
  const cookies = parseCookies(
    event.headers.cookie || event.headers.Cookie || ""
  );
  const token = cookies.sitesnap_session;
  if (!token) return false;
  const [data, sig] = token.split(".");
  if (!data || !sig) return false;
  const expected = createHmac("sha256", sessionSecret()).update(data).digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    if (!timingSafeEqual(a, b)) return false;
  } catch {
    return false;
  }
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
    return payload?.role === "admin";
  } catch {
    return false;
  }
}

export function requireAdmin(event, origin) {
  if (!verifySession(event)) {
    return json(401, { error: "Unauthorized" }, origin);
  }
  return null;
}

export function checkAdminPassword(password) {
  const expected = process.env.ADMIN_PASSWORD || "";
  if (!expected || !password) return false;
  const a = Buffer.from(String(password));
  const b = Buffer.from(String(expected));
  if (a.length !== b.length) {
    // still do a compare to reduce timing leaks on length
    timingSafeEqual(Buffer.alloc(32), Buffer.alloc(32));
    return false;
  }
  return timingSafeEqual(a, b);
}

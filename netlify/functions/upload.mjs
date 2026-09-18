import {
  json,
  corsHeaders,
  ensureSeeded,
  loadSites,
  findSiteByToken,
  melbourneDate,
  newId,
  savePhoto,
} from "./lib/store.mjs";

function parseMultipart(event) {
  const contentType =
    event.headers["content-type"] || event.headers["Content-Type"] || "";
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) return null;
  const boundary = boundaryMatch[1] || boundaryMatch[2];
  const bodyBuf = event.isBase64Encoded
    ? Buffer.from(event.body || "", "base64")
    : Buffer.from(event.body || "", "utf8");

  const boundaryBuf = Buffer.from(`--${boundary}`);
  const parts = [];
  let start = indexOf(bodyBuf, boundaryBuf, 0);
  while (start !== -1) {
    const afterBoundary = start + boundaryBuf.length;
    if (bodyBuf[afterBoundary] === 0x2d && bodyBuf[afterBoundary + 1] === 0x2d) break;
    let contentStart = afterBoundary;
    if (bodyBuf[contentStart] === 0x0d && bodyBuf[contentStart + 1] === 0x0a) {
      contentStart += 2;
    }
    const next = indexOf(bodyBuf, boundaryBuf, contentStart);
    if (next === -1) break;
    let partEnd = next - 2; // strip \r\n before boundary
    if (partEnd < contentStart) partEnd = next;
    const part = bodyBuf.subarray(contentStart, partEnd);
    const headerEnd = indexOf(part, Buffer.from("\r\n\r\n"), 0);
    if (headerEnd !== -1) {
      const headerStr = part.subarray(0, headerEnd).toString("utf8");
      const data = part.subarray(headerEnd + 4);
      const nameMatch = headerStr.match(/name="([^"]+)"/i);
      const fileMatch = headerStr.match(/filename="([^"]*)"/i);
      const ctMatch = headerStr.match(/Content-Type:\s*([^\r\n]+)/i);
      parts.push({
        name: nameMatch?.[1] || "",
        filename: fileMatch?.[1],
        contentType: ctMatch?.[1]?.trim(),
        data,
      });
    }
    start = next;
  }
  return parts;
}

function indexOf(buf, search, from) {
  for (let i = from; i <= buf.length - search.length; i++) {
    let ok = true;
    for (let j = 0; j < search.length; j++) {
      if (buf[i + j] !== search[j]) {
        ok = false;
        break;
      }
    }
    if (ok) return i;
  }
  return -1;
}

export async function handler(event) {
  const origin = event.headers.origin || event.headers.Origin || "*";
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(origin), body: "" };
  }
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" }, origin);
  }
  try {
    await ensureSeeded();
    const parts = parseMultipart(event);
    if (!parts || !parts.length) {
      return json(400, { error: "Expected multipart form data" }, origin);
    }

    let token = "";
    let note = "";
    const files = [];
    for (const p of parts) {
      if (p.name === "token") token = p.data.toString("utf8").trim();
      else if (p.name === "note") note = p.data.toString("utf8").trim().slice(0, 500);
      else if (p.name === "photos" || p.name === "photo" || p.filename) {
        if (p.data?.length) files.push(p);
      }
    }

    if (!token) return json(400, { error: "token required" }, origin);
    if (!files.length) return json(400, { error: "At least one photo required" }, origin);

    const { sites } = await loadSites();
    const site = findSiteByToken(sites, token);
    if (!site) return json(404, { error: "Invalid upload link" }, origin);

    const date = melbourneDate();
    const saved = [];
    for (const f of files.slice(0, 20)) {
      const photoId = newId("photo");
      const meta = await savePhoto({
        siteId: site.id,
        date,
        photoId,
        bytes: f.data,
        contentType: f.contentType || "image/jpeg",
        note,
        originalFilename: f.filename || "photo.jpg",
      });
      saved.push({ id: meta.id, date: meta.date, uploadedAt: meta.uploadedAt });
    }

    return json(
      201,
      {
        ok: true,
        siteName: site.name,
        date,
        count: saved.length,
        photos: saved,
      },
      origin
    );
  } catch (err) {
    console.error(err);
    return json(500, { error: err.message || "Server error" }, origin);
  }
}

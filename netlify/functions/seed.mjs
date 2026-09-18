import {
  json,
  corsHeaders,
  ensureSeeded,
  verifySession,
  SEED_SITES,
} from "./lib/store.mjs";

export async function handler(event) {
  const origin = event.headers.origin || event.headers.Origin || "*";
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(origin), body: "" };
  }
  if (event.httpMethod !== "POST" && event.httpMethod !== "GET") {
    return json(405, { error: "Method not allowed" }, origin);
  }
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const isAdmin = verifySession(event);
    // boot=true allows first empty registry seed without cookie
    if (!isAdmin && !body.boot) {
      return json(401, { error: "Unauthorized" }, origin);
    }
    const result = await ensureSeeded();
    return json(
      200,
      {
        created: result.created,
        sites: result.sites.map((s) => ({
          id: s.id,
          name: s.name,
          uploadToken: s.uploadToken,
        })),
        seedTokens: SEED_SITES.map((s) => ({
          name: s.name,
          token: s.uploadToken,
        })),
      },
      origin
    );
  } catch (err) {
    console.error(err);
    return json(500, { error: err.message || "Server error" }, origin);
  }
}

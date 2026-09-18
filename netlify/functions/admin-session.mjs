import { json, corsHeaders, verifySession, ensureSeeded } from "./lib/store.mjs";

export async function handler(event) {
  const origin = event.headers.origin || event.headers.Origin || "*";
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(origin), body: "" };
  }
  if (event.httpMethod !== "GET") {
    return json(405, { error: "Method not allowed" }, origin);
  }
  const ok = verifySession(event);
  if (ok) {
    try {
      await ensureSeeded();
    } catch (e) {
      console.error("seed on session", e);
    }
  }
  return json(200, { authenticated: ok }, origin);
}

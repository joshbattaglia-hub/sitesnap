import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, type SiteSummary } from "../lib/api";

function formatLast(iso: string | null) {
  if (!iso) return "No uploads yet";
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.toLocaleDateString("en-AU", { timeZone: "Australia/Melbourne" }) ===
    now.toLocaleDateString("en-AU", { timeZone: "Australia/Melbourne" });
  if (sameDay) return "Last upload today";
  return `Last upload ${d.toLocaleDateString("en-AU", {
    timeZone: "Australia/Melbourne",
    day: "numeric",
    month: "short",
  })}`;
}

export default function AdminSitesPage() {
  const nav = useNavigate();
  const [sites, setSites] = useState<SiteSummary[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await api<{ sites: SiteSummary[] }>("sites");
      setSites(data.sites);
      setError("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load";
      if (msg.toLowerCase().includes("unauthorized")) {
        nav("/admin", { replace: true });
        return;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [nav]);

  useEffect(() => {
    load();
  }, [load]);

  async function logout() {
    await api("admin-logout", { method: "POST", body: "{}" });
    nav("/admin", { replace: true });
  }

  async function createSite(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await api("sites", {
        method: "POST",
        body: JSON.stringify({ name: newName.trim() }),
      });
      setNewName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <header className="app-header">
        <Link to="/admin/sites" className="brand">
          <span className="mark">SS</span> SiteSnap
        </Link>
        <div className="header-actions">
          <button className="btn" type="button" onClick={logout}>
            Log out
          </button>
        </div>
      </header>
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "28px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
          <h2 style={{ fontSize: 18 }}>Sites</h2>
        </div>

        <form onSubmit={createSite} style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          <input
            className="input"
            placeholder="New site name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            style={{ flex: 1, minWidth: 180 }}
          />
          <button className="btn primary" type="submit" disabled={creating || !newName.trim()}>
            + Create site
          </button>
        </form>

        {error && <div className="error-banner">{error}</div>}
        {loading && <p style={{ color: "var(--muted)" }}>Loading…</p>}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {sites.map((s) => (
            <Link
              key={s.id}
              to={`/admin/sites/${s.id}`}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "16px 18px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 600 }}>{s.name}</h3>
                <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                  {formatLast(s.lastUploadAt)} · {s.photoCount} photo{s.photoCount === 1 ? "" : "s"}
                </p>
              </div>
              <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>Open →</span>
            </Link>
          ))}
          {!loading && sites.length === 0 && (
            <p style={{ color: "var(--muted)" }}>No sites yet. Create one above.</p>
          )}
        </div>
      </main>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

export default function AdminLoginPage() {
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const s = await api<{ authenticated: boolean }>("admin-session");
        if (s.authenticated) nav("/admin/sites", { replace: true });
      } catch {
        /* ignore */
      } finally {
        setChecking(false);
      }
    })();
  }, [nav]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("admin-login", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      nav("/admin/sites", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  if (checking) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <p style={{ color: "var(--muted)" }}>Checking session…</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <form
        onSubmit={onSubmit}
        style={{
          width: "100%",
          maxWidth: 380,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: 32,
          boxShadow: "0 8px 24px rgba(0,0,0,.06)",
        }}
      >
        <div className="mark" style={{ marginBottom: 16 }}>SS</div>
        <h1 style={{ fontSize: 20, marginBottom: 6 }}>SiteSnap Admin</h1>
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 22 }}>
          Password to view sites and photos.
        </p>
        {error && <div className="error-banner">{error}</div>}
        <label className="field-label">Password</label>
        <input
          className="input"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ marginBottom: 16 }}
          required
        />
        <button className="btn primary" type="submit" disabled={busy} style={{ width: "100%", fontWeight: 700 }}>
          {busy ? "Entering…" : "Enter"}
        </button>
      </form>
    </div>
  );
}

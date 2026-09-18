import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: 32,
          boxShadow: "0 8px 24px rgba(0,0,0,.06)",
        }}
      >
        <div className="mark" style={{ marginBottom: 16 }}>SS</div>
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>SiteSnap</h1>
        <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 24 }}>
          Contractor daily fitout photo logger. Use your site upload link, or open admin.
        </p>
        <Link className="btn primary" to="/admin" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
          Admin login
        </Link>
      </div>
    </div>
  );
}

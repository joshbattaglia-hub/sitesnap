import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, type PhotoMeta } from "../lib/api";

type SiteDetail = {
  site: { id: string; name: string; uploadToken: string };
  dates: { date: string; photos: PhotoMeta[] }[];
  photoCount: number;
};

function formatDayLabel(dateStr: string) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Melbourne",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const d = new Date(`${dateStr}T12:00:00+10:00`);
  const pretty = d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    timeZone: "Australia/Melbourne",
  });
  if (dateStr === today) return `Today — ${pretty}`;
  return pretty;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-AU", {
    timeZone: "Australia/Melbourne",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function AdminDetailPage() {
  const { siteId = "" } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState<SiteDetail | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [lightbox, setLightbox] = useState<PhotoMeta | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api<SiteDetail>(`site-photos?siteId=${encodeURIComponent(siteId)}`);
      setData(res);
      setNameDraft(res.site.name);
      setError("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed";
      if (msg.toLowerCase().includes("unauthorized")) {
        nav("/admin", { replace: true });
        return;
      }
      setError(msg);
    }
  }, [siteId, nav]);

  useEffect(() => {
    load();
  }, [load]);

  function uploadUrl() {
    if (!data) return "";
    return `${window.location.origin}/u/${data.site.uploadToken}`;
  }

  async function copyLink() {
    const url = uploadUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      prompt("Copy upload link:", url);
    }
  }

  async function saveRename(e: React.FormEvent) {
    e.preventDefault();
    if (!nameDraft.trim() || !data) return;
    try {
      await api("sites", {
        method: "PATCH",
        body: JSON.stringify({ id: data.site.id, name: nameDraft.trim() }),
      });
      setRenaming(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rename failed");
    }
  }

  function photoSrc(p: PhotoMeta) {
    return `/api/photo?siteId=${encodeURIComponent(p.siteId)}&id=${encodeURIComponent(p.id)}`;
  }

  return (
    <div>
      <header className="app-header">
        <div className="brand" style={{ fontWeight: 600, fontSize: 14, color: "var(--muted)" }}>
          <Link to="/admin/sites" style={{ color: "var(--muted)", textDecoration: "none" }}>
            Sites
          </Link>
          {" / "}
          <strong style={{ color: "var(--text)" }}>{data?.site.name || "…"}</strong>
        </div>
        <div className="header-actions">
          <button className="btn" type="button" onClick={copyLink} disabled={!data}>
            {copied ? "Copied!" : "Copy upload link"}
          </button>
          <button className="btn" type="button" onClick={() => setRenaming((v) => !v)} disabled={!data}>
            Rename
          </button>
          <Link className="btn primary" to="/admin/sites" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
            All sites
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
        {error && <div className="error-banner">{error}</div>}

        {renaming && data && (
          <form onSubmit={saveRename} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <input className="input" value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} />
            <button className="btn primary" type="submit">Save</button>
          </form>
        )}

        <h1 style={{ fontSize: 22, marginBottom: 6 }}>{data?.site.name || "Loading…"}</h1>
        <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 12 }}>
          Upload link ready for contractors · {data?.photoCount ?? 0} photos
        </p>

        {data && (
          <div
            style={{
              background: "var(--accent-soft)",
              border: "1px solid var(--accent-dash)",
              borderRadius: 12,
              padding: "12px 14px",
              fontSize: 13,
              marginBottom: 22,
              wordBreak: "break-all",
            }}
          >
            <strong>Uploader:</strong> {uploadUrl()}
          </div>
        )}

        {!data && !error && <p style={{ color: "var(--muted)" }}>Loading…</p>}

        {data?.dates.map((day) => (
          <section key={day.date} style={{ marginBottom: 28 }}>
            <h2
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.4px",
                marginBottom: 12,
              }}
            >
              {formatDayLabel(day.date)}
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                gap: 10,
              }}
            >
              {day.photos.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setLightbox(p)}
                  style={{
                    aspectRatio: "1",
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    overflow: "hidden",
                    position: "relative",
                    padding: 0,
                    background: "#ccfbf1",
                  }}
                >
                  <img
                    src={photoSrc(p)}
                    alt={p.originalFilename}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      left: 8,
                      bottom: 8,
                      background: "rgba(0,0,0,.55)",
                      color: "#fff",
                      fontSize: 10,
                      padding: "3px 6px",
                      borderRadius: 6,
                    }}
                  >
                    {formatTime(p.uploadedAt)}
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}

        {data && data.dates.length === 0 && (
          <p style={{ color: "var(--muted)" }}>No photos yet. Share the upload link with contractors.</p>
        )}
      </main>

      {lightbox && (
        <div
          role="dialog"
          onClick={() => setLightbox(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.72)",
            display: "grid",
            placeItems: "center",
            padding: 24,
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 16,
              maxWidth: 720,
              width: "100%",
              padding: 16,
            }}
          >
            <img
              src={photoSrc(lightbox)}
              alt={lightbox.originalFilename}
              style={{ width: "100%", maxHeight: "70vh", objectFit: "contain", borderRadius: 12 }}
            />
            <p style={{ marginTop: 12, fontSize: 13, color: "var(--muted)" }}>
              {lightbox.originalFilename} · {new Date(lightbox.uploadedAt).toLocaleString("en-AU", { timeZone: "Australia/Melbourne" })}
            </p>
            {lightbox.note && <p style={{ marginTop: 6, fontSize: 14 }}>{lightbox.note}</p>}
            <button className="btn" type="button" onClick={() => setLightbox(null)} style={{ marginTop: 12 }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

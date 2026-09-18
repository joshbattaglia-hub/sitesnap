import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";

export default function UploaderPage() {
  const { token = "" } = useParams();
  const [siteName, setSiteName] = useState<string | null>(null);
  const [loadError, setLoadError] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api<{ siteName: string }>(
          `upload-info?token=${encodeURIComponent(token)}`
        );
        if (!cancelled) setSiteName(data.siteName);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Invalid link");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  function onPick(list: FileList | null) {
    if (!list) return;
    const next = Array.from(list).filter((f) => f.type.startsWith("image/"));
    setFiles((prev) => [...prev, ...next].slice(0, 20));
    setDone(false);
    setError("");
  }

  function clearFiles() {
    setFiles([]);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function submit() {
    if (!files.length || busy) return;
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("token", token);
      fd.append("note", note);
      for (const f of files) fd.append("photos", f, f.name);
      await api("upload", { method: "POST", body: fd });
      setDone(true);
      setFiles([]);
      setNote("");
      if (inputRef.current) inputRef.current.value = "";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  if (loadError) {
    return (
      <div className="uploader-shell">
        <div className="uploader-inner">
          <div className="brand-row">
            <div className="mark">SS</div>
            <div>
              <h1>SiteSnap</h1>
              <p>Upload</p>
            </div>
          </div>
          <div className="error-banner">{loadError}</div>
          <p style={{ color: "var(--muted)", fontSize: 14 }}>
            This link is invalid or expired. Ask your site manager for a new upload link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="uploader-shell">
      <div className="uploader-inner">
        <div className="brand-row">
          <div className="mark">SS</div>
          <div>
            <h1>SiteSnap</h1>
            <p>{siteName ? "Daily site photos" : "Loading…"}</p>
          </div>
        </div>

        {done && (
          <div className="success-banner">
            Photos uploaded. You can add more anytime.
          </div>
        )}
        {error && <div className="error-banner">{error}</div>}

        <label className="field-label">Site</label>
        <input className="input" value={siteName || ""} readOnly style={{ marginBottom: 20 }} />

        <label className="field-label">Photos</label>
        <button
          type="button"
          className="picker"
          onClick={() => inputRef.current?.click()}
          disabled={!siteName || busy}
        >
          {files.length === 0 ? (
            <>
              <div className="picker-icon">📷</div>
              <strong>Take or choose photos</strong>
              <span>Camera or gallery · up to 20</span>
            </>
          ) : (
            <>
              <strong>{files.length} photo{files.length === 1 ? "" : "s"} selected</strong>
              <span>Tap to add more</span>
              <div className="thumbs">
                {files.slice(0, 6).map((f, i) => (
                  <img key={i} src={URL.createObjectURL(f)} alt="" />
                ))}
              </div>
            </>
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          hidden
          onChange={(e) => onPick(e.target.files)}
        />

        {files.length > 0 && (
          <button type="button" className="btn ghost" onClick={clearFiles} style={{ marginTop: 8, width: "100%" }}>
            Clear selection
          </button>
        )}

        <label className="field-label" style={{ marginTop: 20 }}>Note (optional)</label>
        <textarea
          className="textarea"
          placeholder="Short note for the day…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          disabled={busy}
        />

        <button
          type="button"
          className="btn primary upload-btn"
          disabled={!files.length || busy || !siteName}
          onClick={submit}
        >
          {busy ? "Uploading…" : "Upload"}
        </button>
      </div>
      <style>{`
        .uploader-shell {
          min-height: 100vh;
          background: var(--bg);
          display: flex;
          justify-content: center;
        }
        .uploader-inner {
          width: 100%;
          max-width: 430px;
          min-height: 100vh;
          padding: 20px 20px 32px;
          display: flex;
          flex-direction: column;
        }
        .brand-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 28px;
        }
        .brand-row h1 { font-size: 18px; font-weight: 700; }
        .brand-row p { font-size: 12px; color: var(--muted); font-weight: 500; }
        .picker {
          flex: 1;
          min-height: 240px;
          border: 2px dashed var(--accent-dash);
          background: var(--accent-soft);
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 24px;
          color: var(--text);
          text-align: center;
        }
        .picker strong { font-size: 16px; }
        .picker span { font-size: 13px; color: var(--muted); }
        .picker-icon { font-size: 40px; margin-bottom: 4px; }
        .thumbs {
          display: flex;
          gap: 8px;
          margin-top: 12px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .thumbs img {
          width: 56px;
          height: 56px;
          object-fit: cover;
          border-radius: 10px;
          border: 1px solid var(--border);
        }
        .upload-btn {
          width: 100%;
          margin-top: 20px;
          font-size: 16px;
          font-weight: 700;
          padding: 16px;
          border-radius: 14px;
        }
      `}</style>
    </div>
  );
}

import { useEffect, useState, useRef } from "react";

function decodeBase64Utf8(base64) {
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch {
    try {
      return atob(base64);
    } catch {
      return "";
    }
  }
}

export function extractHtmlContent(rawUrlOrHtml) {
  if (!rawUrlOrHtml || typeof rawUrlOrHtml !== "string") return "";
  const trimmed = rawUrlOrHtml.trim();

  // If raw HTML string
  if (
    trimmed.startsWith("<!DOCTYPE") ||
    trimmed.startsWith("<html") ||
    (trimmed.startsWith("<") && trimmed.includes("</"))
  ) {
    return trimmed;
  }

  // If data URL
  if (trimmed.startsWith("data:")) {
    const comma = trimmed.indexOf(",");
    if (comma !== -1) {
      const meta = trimmed.slice(0, comma);
      const raw = trimmed.slice(comma + 1);
      if (meta.includes(";base64")) {
        return decodeBase64Utf8(raw);
      }
      return decodeURIComponent(raw);
    }
  }

  return "";
}

const simulationCache = new Map();

export function openSimulationInNewTab(url, existingContent) {
  if (!url && !existingContent) return;

  const trimmed = (url || "").trim();

  // 1. Direct content provided
  const content = existingContent || extractHtmlContent(trimmed);
  if (content) {
    try {
      const blob = new Blob([content], { type: "text/html;charset=utf-8" });
      const blobUrl = URL.createObjectURL(blob);
      simulationCache.set(trimmed, { text: content, blobUrl });
      const win = window.open(blobUrl, "_blank", "noopener,noreferrer");
      if (win) {
        setTimeout(() => URL.revokeObjectURL(blobUrl), 300000);
        return;
      }
    } catch (e) {
      console.warn("Could not open blob URL:", e);
    }
  }

  // 2. Already cached from viewer
  if (simulationCache.has(trimmed)) {
    const cached = simulationCache.get(trimmed);
    if (cached?.blobUrl) {
      const win = window.open(cached.blobUrl, "_blank", "noopener,noreferrer");
      if (win) return;
    }
  }

  // 3. Remote URL: Open tab synchronously first to bypass popup blocker, then stream HTML blob
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    const popup = window.open("about:blank", "_blank");
    if (popup) {
      try {
        popup.document.write(
          '<!DOCTYPE html><html><head><title>Loading Mechanism Simulation...</title></head><body style="background:#050811;color:#38bdf8;font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="text-align:center;"><div style="font-size:2.6rem;margin-bottom:12px;">⚙️</div><h2 style="margin:0 0 8px;color:#f8fafc;font-size:1.2rem;">Loading Simulation…</h2><p style="margin:0;color:#94a3b8;font-size:0.9rem;">Preparing interactive environment…</p></div></body></html>'
        );
      } catch {
        // Ignore document.write issues
      }
    }

    fetch(trimmed)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((html) => {
        const blob = new Blob([html], { type: "text/html;charset=utf-8" });
        const blobUrl = URL.createObjectURL(blob);
        simulationCache.set(trimmed, { text: html, blobUrl });
        if (popup && !popup.closed) {
          popup.location.replace(blobUrl);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 300000);
        } else {
          window.open(blobUrl, "_blank", "noopener,noreferrer");
        }
      })
      .catch((err) => {
        console.error("Could not fetch simulation to open in tab:", err);
        if (popup && !popup.closed) {
          try {
            popup.document.body.innerHTML =
              '<div style="text-align:center;padding:40px;color:#f87171;font-family:system-ui,-apple-system,sans-serif;"><h3>⚠️ Could not load simulation</h3><p style="color:#94a3b8;">The simulation file could not be retrieved from the server.</p></div>';
          } catch {
            // Ignore
          }
        }
      });
    return;
  }

  if (trimmed.startsWith("blob:")) {
    window.open(trimmed, "_blank", "noopener,noreferrer");
  }
}

export default function HtmlSimulationViewer({
  url,
  title = "Student Mechanism Simulation",
  reloadKey = 0,
  isFullscreen = false,
  minHeight = "580px",
  style = {},
  onContentReady,
}) {
  const initialContent = extractHtmlContent(url);
  const trimmedUrl = (url || "").trim();
  const cachedData = simulationCache.get(trimmedUrl);

  const [htmlContent, setHtmlContent] = useState(() => cachedData?.text || initialContent);
  const [blobUrl, setBlobUrl] = useState(() => cachedData?.blobUrl || "");
  const [loading, setLoading] = useState(
    () => Boolean(!cachedData && !initialContent && (trimmedUrl.startsWith("http://") || trimmedUrl.startsWith("https://")))
  );
  const [loadError, setLoadError] = useState(false);
  const activeBlobRef = useRef(null);

  useEffect(() => {
    setLoadError(false);

    if (!url || typeof url !== "string") {
      setHtmlContent("");
      setBlobUrl("");
      setLoading(false);
      return;
    }

    const trimmed = url.trim();

    // 0. Use memory cache if available and not reloading
    if (reloadKey === 0 && simulationCache.has(trimmed)) {
      const cached = simulationCache.get(trimmed);
      if (cached?.blobUrl) {
        setHtmlContent(cached.text);
        setBlobUrl(cached.blobUrl);
        setLoading(false);
        onContentReady?.(cached.text, cached.blobUrl);
        return;
      }
    }

    // 1. Direct or decoded HTML content
    const immediateContent = extractHtmlContent(trimmed);
    if (immediateContent) {
      setHtmlContent(immediateContent);
      try {
        if (activeBlobRef.current) URL.revokeObjectURL(activeBlobRef.current);
        const blob = new Blob([immediateContent], { type: "text/html;charset=utf-8" });
        const bUrl = URL.createObjectURL(blob);
        activeBlobRef.current = bUrl;
        simulationCache.set(trimmed, { text: immediateContent, blobUrl: bUrl });
        setBlobUrl(bUrl);
        onContentReady?.(immediateContent, bUrl);
      } catch {
        // use srcDoc fallback
      }
      setLoading(false);
      return;
    }

    // 2. Existing blob URL
    if (trimmed.startsWith("blob:")) {
      setBlobUrl(trimmed);
      setLoading(false);
      return;
    }

    // 3. Remote URL (Supabase storage or external)
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      let cancelled = false;
      setLoading(true);

      fetch(trimmed)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.text();
        })
        .then((text) => {
          if (cancelled) return;
          setHtmlContent(text);
          try {
            if (activeBlobRef.current) URL.revokeObjectURL(activeBlobRef.current);
            const blob = new Blob([text], { type: "text/html;charset=utf-8" });
            const bUrl = URL.createObjectURL(blob);
            activeBlobRef.current = bUrl;
            simulationCache.set(trimmed, { text, blobUrl: bUrl });
            setBlobUrl(bUrl);
            onContentReady?.(text, bUrl);
          } catch {
            // fallback to srcDoc only
          }
          setLoading(false);
        })
        .catch((err) => {
          if (cancelled) return;
          console.error("Failed to fetch simulation HTML:", err);
          setLoadError(true);
          setLoading(false);
        });

      return () => {
        cancelled = true;
      };
    }

    setLoading(false);
  }, [url, reloadKey]);

  useEffect(() => {
    return () => {
      if (activeBlobRef.current) {
        URL.revokeObjectURL(activeBlobRef.current);
      }
    };
  }, []);

  const hasExecutableContent = Boolean(htmlContent || blobUrl);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: isFullscreen ? "calc(100vh - 54px)" : minHeight,
        background: "#050811",
      }}
    >
      {(loading || !hasExecutableContent) && !loadError && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#050811",
            color: "#38bdf8",
            gap: 14,
            zIndex: 3,
          }}
        >
          <span style={{ fontSize: "2.4rem", animation: "spin 1.2s linear infinite" }}>⚙️</span>
          <span style={{ fontSize: "0.92rem", fontWeight: 600, letterSpacing: "0.02em" }}>
            Loading interactive mechanism simulation…
          </span>
        </div>
      )}

      {loadError && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#050811",
            color: "#94a3b8",
            gap: 12,
            padding: 24,
            textAlign: "center",
            zIndex: 3,
          }}
        >
          <span style={{ fontSize: "2.2rem" }}>⚠️</span>
          <h4 style={{ margin: 0, color: "#f8fafc", fontSize: "1rem" }}>
            Could not load simulation file
          </h4>
          <p style={{ margin: 0, fontSize: "0.85rem", maxWidth: 360, lineHeight: 1.5 }}>
            The mechanism simulation file could not be retrieved from the server.
          </p>
          <button
            type="button"
            className="secondary-btn secondary-btn--small"
            style={{ marginTop: 8 }}
            onClick={() => {
              setLoading(true);
              setLoadError(false);
              // Trigger reload
              const dummyKey = Date.now();
              setHtmlContent("");
              setBlobUrl("");
            }}
          >
            🔄 Try Again
          </button>
        </div>
      )}

      {hasExecutableContent && (
        <iframe
          key={`${blobUrl ? "blob" : "doc"}-${reloadKey}`}
          src={blobUrl || undefined}
          srcDoc={blobUrl ? undefined : (htmlContent || undefined)}
          title={title}
          sandbox="allow-scripts allow-popups allow-forms allow-same-origin allow-modals"
          style={{
            width: "100%",
            height: "100%",
            flex: 1,
            minHeight: isFullscreen ? "calc(100vh - 54px)" : minHeight,
            border: 0,
            display: "block",
            opacity: loading ? 0 : 1,
            transition: "opacity 0.25s ease",
            ...style,
          }}
          allow="accelerometer; autoplay; encrypted-media; gyroscope"
        />
      )}
    </div>
  );
}

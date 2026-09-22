import { useState, useEffect, useMemo, useRef, lazy, Suspense } from "react";
import { useMechanisms } from "../context/MechanismsContext.jsx";
import { tomCategoryMeta } from "../tom/tomConstants.js";

const Mechanism3DViewer = lazy(() => import("../tom/Mechanism3DViewer.jsx"));

function isSafeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return false;
  const trimmed = rawUrl.trim();
  if (trimmed.startsWith("javascript:") || trimmed.startsWith("vbscript:")) return false;
  if (trimmed.startsWith("data:text/html") || trimmed.startsWith("data:image/") || trimmed.startsWith("blob:")) return true;
  try {
    const parsed = new URL(trimmed, typeof window !== "undefined" ? window.location.href : "https://localhost");
    return (
      parsed.protocol === "https:" ||
      parsed.protocol === "http:" ||
      parsed.protocol === "blob:" ||
      (parsed.protocol === "data:" && (trimmed.startsWith("data:text/html") || trimmed.startsWith("data:image/")))
    );
  } catch {
    return false;
  }
}

function openHtmlInNewTab(url) {
  if (!url) return;
  const trimmed = url.trim();
  if (trimmed.startsWith("data:text/html")) {
    try {
      const commaIdx = trimmed.indexOf(",");
      if (commaIdx !== -1) {
        const meta = trimmed.slice(0, commaIdx);
        const raw = trimmed.slice(commaIdx + 1);
        const html = meta.includes(";base64") ? atob(raw) : decodeURIComponent(raw);
        const blob = new Blob([html], { type: "text/html" });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, "_blank", "noopener,noreferrer");
        return;
      }
    } catch (e) {
      console.error("Failed to open data URL in new tab:", e);
    }
  }
  window.open(trimmed, "_blank", "noopener,noreferrer");
}

/**
 * Focused, Clean Student Mechanism Showcase.
 * Strictly displays student-uploaded assets: interactive HTML animations and 3D CAD files.
 * Clutter, synthetic 2D canvases, and promotional sidebars have been removed.
 */
export default function StudentAnimationsPage({ onNavigate, initialMechanismId }) {
  const { mechanisms } = useMechanisms();
  const [selectedId, setSelectedId] = useState(initialMechanismId || null);
  const [reloadKey, setReloadKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeMediaMode, setActiveMediaMode] = useState("auto"); // "html" | "cad" | "auto"
  const containerRef = useRef(null);

  // Filter mechanisms that have student-uploaded HTML animation or CAD models
  const mechanismsWithUploads = useMemo(() => {
    return mechanisms.filter((m) => {
      const hasHtml = (m.html_animation_url && isSafeUrl(m.html_animation_url)) ||
        (m.animation_url && isSafeUrl(m.animation_url)) ||
        (Array.isArray(m.media) && m.media.some((row) => (row.file_type === "animation" || row.format === "html") && isSafeUrl(row.file_url)));
      const hasCad = (m.cad_model_url && isSafeUrl(m.cad_model_url)) ||
        (Array.isArray(m.media) && m.media.some((row) => (row.file_type === "cad" || /\.(stl|gltf|glb|obj)$/i.test(row.file_name || row.file_url || "")) && isSafeUrl(row.file_url)));
      return hasHtml || hasCad;
    });
  }, [mechanisms]);

  // Set default selected mechanism
  useEffect(() => {
    const hash = window.location.hash.replace(/^#\/?/, "");
    if (hash.startsWith("animation/") || hash.startsWith("animations/")) {
      const id = hash.split("/")[1];
      if (id) {
        setSelectedId(id);
        return;
      }
    }
    if (!selectedId && mechanismsWithUploads.length > 0) {
      setSelectedId(mechanismsWithUploads[0].id);
    } else if (!selectedId && mechanisms.length > 0) {
      setSelectedId(mechanisms[0].id);
    }
  }, [mechanismsWithUploads, mechanisms, selectedId]);

  // Listen to hash changes while on this page
  useEffect(() => {
    function onHashChange() {
      const hash = window.location.hash.replace(/^#\/?/, "");
      if (hash.startsWith("animation/") || hash.startsWith("animations/")) {
        const id = hash.split("/")[1];
        if (id) setSelectedId(id);
      }
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // Listen to fullscreen changes
  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const activeMechanism = useMemo(() => {
    return (
      mechanisms.find((m) => String(m.id) === String(selectedId)) ||
      mechanismsWithUploads[0] ||
      mechanisms[0] ||
      null
    );
  }, [mechanisms, selectedId, mechanismsWithUploads]);

  // Extract student HTML animation URL
  const htmlUrl = useMemo(() => {
    if (!activeMechanism) return null;
    if (activeMechanism.html_animation_url && isSafeUrl(activeMechanism.html_animation_url)) {
      return activeMechanism.html_animation_url.trim();
    }
    if (activeMechanism.animation_url && isSafeUrl(activeMechanism.animation_url)) {
      return activeMechanism.animation_url.trim();
    }
    const mediaHtml = activeMechanism.media?.find(
      (m) => (m.file_type === "animation" || m.format === "html") && isSafeUrl(m.file_url)
    );
    if (mediaHtml) return mediaHtml.file_url.trim();
    return null;
  }, [activeMechanism]);

  // Extract student CAD model URL
  const cadUrl = useMemo(() => {
    if (!activeMechanism) return null;
    if (activeMechanism.cad_model_url && isSafeUrl(activeMechanism.cad_model_url)) {
      return activeMechanism.cad_model_url.trim();
    }
    const cadMedia = activeMechanism.media?.find(
      (m) =>
        (m.file_type === "cad" ||
          /\.(stl|gltf|glb|obj)$/i.test(m.file_name || m.file_url || "")) &&
        isSafeUrl(m.file_url)
    );
    if (cadMedia) return cadMedia.file_url.trim();
    return null;
  }, [activeMechanism]);

  // Determine current display mode
  const currentMode = useMemo(() => {
    if (activeMediaMode === "html" && htmlUrl) return "html";
    if (activeMediaMode === "cad" && cadUrl) return "cad";
    if (htmlUrl) return "html";
    if (cadUrl) return "cad";
    return "none";
  }, [activeMediaMode, htmlUrl, cadUrl]);

  function handleToggleFullscreen() {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  function handleSelect(id) {
    setSelectedId(id);
    setReloadKey(0);
    setActiveMediaMode("auto");
    window.location.hash = `animation/${id}`;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const meta = activeMechanism ? tomCategoryMeta(activeMechanism.category) : null;

  return (
    <div
      className="student-animations-page"
      style={{
        width: "100%",
        maxWidth: 1300,
        margin: "0 auto",
        padding: "0 16px 60px",
      }}
    >
      {/* Top Navigation Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <button
          type="button"
          className="back-btn"
          onClick={() => onNavigate("repository")}
        >
          ← Back to Repository
        </button>

        <span
          className="submit-page-badge"
          style={{ borderColor: "rgba(56, 189, 248, 0.4)", color: "#38bdf8" }}
        >
          🏛 NMIET Mechanical Engineering · Student Works
        </span>
      </div>

      {/* Mechanism Selector Tabs / Pills */}
      {mechanisms.length > 1 && (
        <div
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            paddingBottom: 12,
            marginBottom: 20,
            scrollbarWidth: "thin",
          }}
        >
          {mechanisms.map((m) => {
            const hasUpload =
              m.html_animation_url ||
              m.animation_url ||
              m.cad_model_url ||
              (Array.isArray(m.media) &&
                m.media.some((row) =>
                  row.file_type === "animation" ||
                  row.file_type === "cad" ||
                  row.format === "html"
                ));
            const isSelected = String(m.id) === String(selectedId);
            const mMeta = tomCategoryMeta(m.category);

            return (
              <button
                key={m.id}
                type="button"
                onClick={() => handleSelect(m.id)}
                style={{
                  padding: "8px 14px",
                  borderRadius: "12px",
                  background: isSelected
                    ? "linear-gradient(135deg, rgba(56, 189, 248, 0.22), rgba(14, 165, 233, 0.1))"
                    : "rgba(255, 255, 255, 0.04)",
                  border: isSelected
                    ? "1px solid rgba(56, 189, 248, 0.5)"
                    : "1px solid rgba(255, 255, 255, 0.08)",
                  color: isSelected ? "#38bdf8" : "#cbd5e1",
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: "0.84rem",
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.2s ease",
                  boxShadow: isSelected
                    ? "0 4px 16px rgba(56, 189, 248, 0.2)"
                    : "none",
                }}
              >
                <span>{mMeta?.icon || "⚙️"}</span>
                <span>{m.name}</span>
                {hasUpload && (
                  <span
                    style={{
                      fontSize: "0.65rem",
                      padding: "1px 5px",
                      borderRadius: "6px",
                      background: "rgba(56, 189, 248, 0.2)",
                      color: "#38bdf8",
                      fontWeight: 700,
                    }}
                  >
                    FILE
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {mechanisms.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "80px 24px",
            borderRadius: 20,
            background: "rgba(11, 16, 28, 0.6)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <span style={{ fontSize: "3rem", display: "block", marginBottom: 16 }}>
            📭
          </span>
          <h3 style={{ color: "#f8fafc", margin: "0 0 8px" }}>
            No Mechanisms Submitted Yet
          </h3>
          <p
            style={{
              color: "#94a3b8",
              margin: "0 0 20px",
              maxWidth: 400,
              marginInline: "auto",
              lineHeight: 1.5,
            }}
          >
            Submit your kinematic mechanism project with your custom HTML animation or 3D CAD model.
          </p>
          <button
            type="button"
            className="primary-btn"
            onClick={() => onNavigate("submit")}
          >
            ➕ Submit a Mechanism →
          </button>
        </div>
      )}

      {/* Main Single-Stage Viewer (Zero Clutter) */}
      {activeMechanism && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Mechanism Title & Uploader Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              flexWrap: "wrap",
              gap: 12,
              paddingBottom: 4,
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span
                  style={{
                    fontSize: "0.74rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: meta?.color || "#38bdf8",
                  }}
                >
                  {meta?.icon} {activeMechanism.category || "Kinematic Mechanism"}
                </span>
                <span style={{ color: "rgba(255,255,255,0.3)" }}>·</span>
                <span style={{ fontSize: "0.78rem", color: "var(--muted, #94a3b8)" }}>
                  Uploaded by <strong style={{ color: "#e2e8f0" }}>{activeMechanism.student_name || "Unknown"}</strong>
                </span>
              </div>
              <h1
                style={{
                  fontSize: "clamp(1.4rem, 3vw, 2rem)",
                  fontWeight: 800,
                  color: "#f8fafc",
                  margin: 0,
                  letterSpacing: "-0.02em",
                }}
              >
                {activeMechanism.name}
              </h1>
            </div>

            {/* Toggle Between Uploaded HTML & CAD (if both present) */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              {htmlUrl && cadUrl && (
                <div
                  style={{
                    display: "flex",
                    background: "rgba(255,255,255,0.06)",
                    borderRadius: 10,
                    padding: 3,
                    gap: 3,
                  }}
                >
                  <button
                    type="button"
                    style={{
                      padding: "5px 12px",
                      borderRadius: 8,
                      border: 0,
                      background: currentMode === "html" ? "#38bdf8" : "transparent",
                      color: currentMode === "html" ? "#07070d" : "#94a3b8",
                      fontWeight: 700,
                      fontSize: "0.78rem",
                      cursor: "pointer",
                    }}
                    onClick={() => setActiveMediaMode("html")}
                  >
                    🌐 HTML Animation
                  </button>
                  <button
                    type="button"
                    style={{
                      padding: "5px 12px",
                      borderRadius: 8,
                      border: 0,
                      background: currentMode === "cad" ? "#38bdf8" : "transparent",
                      color: currentMode === "cad" ? "#07070d" : "#94a3b8",
                      fontWeight: 700,
                      fontSize: "0.78rem",
                      cursor: "pointer",
                    }}
                    onClick={() => setActiveMediaMode("cad")}
                  >
                    🧩 3D CAD Model
                  </button>
                </div>
              )}

              <button
                type="button"
                className="secondary-btn secondary-btn--small"
                style={{ fontSize: "0.8rem", padding: "6px 14px" }}
                onClick={() => {
                  window.location.hash = `mechanism/${activeMechanism.id}`;
                  onNavigate("repository");
                }}
              >
                View Full Specs →
              </button>
            </div>
          </div>

          {/* Full-Width Focused Stage */}
          <div
            ref={containerRef}
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              borderRadius: isFullscreen ? 0 : 18,
              overflow: "hidden",
              border: isFullscreen ? "none" : "1px solid rgba(56, 189, 248, 0.3)",
              background: "#050811",
              boxShadow: isFullscreen
                ? "none"
                : "0 16px 48px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(56, 189, 248, 0.15)",
              minHeight: isFullscreen ? "100vh" : "640px",
            }}
          >
            {/* Stage Controls Top Bar */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 18px",
                background: "rgba(10, 16, 28, 0.95)",
                borderBottom: "1px solid rgba(56, 189, 248, 0.2)",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "1.1rem" }}>
                  {currentMode === "html" ? "🌐" : currentMode === "cad" ? "🧩" : "📁"}
                </span>
                <strong style={{ color: "#f8fafc", fontSize: "0.9rem" }}>
                  {currentMode === "html"
                    ? "Student HTML Animation"
                    : currentMode === "cad"
                    ? "Student 3D CAD Model"
                    : "Student Media Viewer"}
                </strong>
                <span
                  style={{
                    fontSize: "0.68rem",
                    padding: "2px 8px",
                    borderRadius: "999px",
                    background: "rgba(56, 189, 248, 0.15)",
                    color: "#38bdf8",
                    fontWeight: 700,
                    fontFamily: "var(--font-mono, monospace)",
                  }}
                >
                  {currentMode === "html" ? "LIVE SIMULATION" : currentMode === "cad" ? "3D INTERACTIVE" : "STANDBY"}
                </span>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {currentMode === "html" && (
                  <button
                    type="button"
                    className="secondary-btn secondary-btn--small"
                    style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                    onClick={() => setReloadKey((k) => k + 1)}
                    title="Reload animation"
                  >
                    🔄 Reload
                  </button>
                )}

                <button
                  type="button"
                  className="secondary-btn secondary-btn--small"
                  style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                  onClick={handleToggleFullscreen}
                  title="Toggle full screen mode"
                >
                  {isFullscreen ? "⤓ Exit Fullscreen" : "⛶ Fullscreen"}
                </button>

                {currentMode === "html" && htmlUrl && isSafeUrl(htmlUrl) && (
                  <button
                    type="button"
                    className="primary-btn"
                    style={{ padding: "4px 12px", fontSize: "0.75rem" }}
                    onClick={() => openHtmlInNewTab(htmlUrl)}
                    title="Open simulation in a new browser tab"
                  >
                    Open in Tab ↗
                  </button>
                )}
              </div>
            </div>

            {/* Stage Body */}
            <div
              style={{
                width: "100%",
                flex: 1,
                minHeight: isFullscreen ? "calc(100vh - 54px)" : "580px",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                background: "#050811",
              }}
            >
              {currentMode === "html" && htmlUrl ? (
                <iframe
                  key={reloadKey}
                  src={htmlUrl}
                  title={`${activeMechanism.name} Student Animation`}
                  sandbox="allow-scripts allow-popups allow-forms allow-same-origin"
                  style={{
                    width: "100%",
                    height: "100%",
                    flex: 1,
                    minHeight: isFullscreen ? "calc(100vh - 54px)" : "580px",
                    border: 0,
                    display: "block",
                  }}
                  allow="accelerometer; autoplay; encrypted-media; gyroscope"
                />
              ) : currentMode === "cad" && cadUrl ? (
                <div style={{ width: "100%", height: "100%", flex: 1, minHeight: "580px" }}>
                  <Suspense
                    fallback={
                      <div
                        style={{
                          height: "100%",
                          minHeight: "580px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#94a3b8",
                        }}
                      >
                        Loading 3D CAD Viewer…
                      </div>
                    }
                  >
                    <Mechanism3DViewer url={cadUrl} />
                  </Suspense>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "60px 24px",
                    height: "100%",
                    flex: 1,
                    minHeight: "580px",
                    textAlign: "center",
                  }}
                >
                  <span style={{ fontSize: "3rem", marginBottom: 16 }}>📁</span>
                  <h3 style={{ color: "#f8fafc", margin: "0 0 8px", fontSize: "1.2rem" }}>
                    No HTML Animation or CAD Model Uploaded Yet
                  </h3>
                  <p
                    style={{
                      color: "#94a3b8",
                      fontSize: "0.88rem",
                      maxWidth: 420,
                      lineHeight: 1.5,
                      margin: "0 0 20px",
                    }}
                  >
                    {activeMechanism.student_name || "The student"} has not attached an interactive <code>.html</code> file or 3D CAD model (<code>.stl</code>, <code>.gltf</code>) to this project yet.
                  </p>
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={() => onNavigate("submit")}
                    style={{ fontSize: "0.82rem", padding: "8px 18px" }}
                  >
                    ➕ Upload Animation / CAD File →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Clean Student Notes & Working Principle (No Clingy Calculators) */}
          {(activeMechanism.working_principle || activeMechanism.detailed_description || activeMechanism.applications) && (
            <div
              style={{
                padding: "24px 28px",
                background: "rgba(11, 16, 28, 0.75)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "18px",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#f8fafc" }}>
                  Student Project Notes
                </h3>
                <span style={{ fontSize: "0.8rem", color: "var(--muted, #94a3b8)" }}>
                  {[activeMechanism.department || "Mechanical Engineering", activeMechanism.college || "NMIET", activeMechanism.academic_year].filter(Boolean).join(" · ")}
                </span>
              </div>

              {activeMechanism.working_principle && (
                <div>
                  <h4 style={{ margin: "0 0 6px", fontSize: "0.88rem", color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Working Principle
                  </h4>
                  <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text, #e2e8f0)", lineHeight: 1.6 }}>
                    {activeMechanism.working_principle}
                  </p>
                </div>
              )}

              {activeMechanism.detailed_description && activeMechanism.detailed_description !== activeMechanism.working_principle && (
                <div>
                  <h4 style={{ margin: "0 0 6px", fontSize: "0.88rem", color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Description
                  </h4>
                  <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text, #e2e8f0)", lineHeight: 1.6 }}>
                    {activeMechanism.detailed_description}
                  </p>
                </div>
              )}

              {activeMechanism.applications && (
                <div>
                  <h4 style={{ margin: "0 0 6px", fontSize: "0.88rem", color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Real-World Applications
                  </h4>
                  <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text, #e2e8f0)", lineHeight: 1.6 }}>
                    {activeMechanism.applications}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useMemo, useRef } from "react";
import { useMechanisms } from "../context/MechanismsContext.jsx";
import DofCalculatorWidget from "../tom/DofCalculatorWidget.jsx";
import MechanismPreview from "../tom/MechanismPreview.jsx";
import { tomCategoryMeta } from "../tom/tomConstants.js";

function isSafeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return false;
  try {
    const parsed = new URL(rawUrl.trim());
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Dedicated Full-Page View for Student Custom Animations & Virtual Labs.
 * Features expansive HTML simulation viewport and live side-by-side Grübler DOF Calculator.
 */
export default function StudentAnimationsPage({ onNavigate, initialMechanismId }) {
  const { mechanisms } = useMechanisms();
  const [selectedId, setSelectedId] = useState(initialMechanismId || null);
  const [reloadKey, setReloadKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);

  // Filter mechanisms that have a student HTML animation or custom animation
  const mechanismsWithAnim = useMemo(() => {
    return mechanisms.filter(
      (m) =>
        m.html_animation_url ||
        (m.animation_url && typeof m.animation_url === "string" && m.animation_url.toLowerCase().includes(".html")) ||
        (Array.isArray(m.media) && m.media.some((row) => row.file_type === "animation" || row.format === "html"))
    );
  }, [mechanisms]);

  // Set default selected mechanism
  useEffect(() => {
    // If URL hash has an ID, e.g. #animation/<id>
    const hash = window.location.hash.replace(/^#\/?/, "");
    if (hash.startsWith("animation/") || hash.startsWith("animations/")) {
      const id = hash.split("/")[1];
      if (id) {
        setSelectedId(id);
        return;
      }
    }
    if (!selectedId && mechanismsWithAnim.length > 0) {
      setSelectedId(mechanismsWithAnim[0].id);
    } else if (!selectedId && mechanisms.length > 0) {
      setSelectedId(mechanisms[0].id);
    }
  }, [mechanismsWithAnim, mechanisms, selectedId]);

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
    return mechanisms.find((m) => String(m.id) === String(selectedId)) || mechanismsWithAnim[0] || mechanisms[0] || null;
  }, [mechanisms, selectedId, mechanismsWithAnim]);

  const htmlUrl = useMemo(() => {
    if (!activeMechanism) return null;
    if (activeMechanism.html_animation_url) return activeMechanism.html_animation_url.trim();
    if (activeMechanism.animation_url && activeMechanism.animation_url.toLowerCase().includes(".html")) {
      return activeMechanism.animation_url.trim();
    }
    const mediaHtml = activeMechanism.media?.find(
      (m) => (m.file_type === "animation" || m.format === "html") && typeof m.file_url === "string" && m.file_url.includes(".html")
    );
    if (mediaHtml) return mediaHtml.file_url.trim();
    return null;
  }, [activeMechanism]);

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
    window.location.hash = `animation/${id}`;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const meta = activeMechanism ? tomCategoryMeta(activeMechanism.category) : null;

  return (
    <div
      className="student-animations-page"
      style={{
        width: "100%",
        maxWidth: 1400,
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

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            className="secondary-btn secondary-btn--small"
            onClick={() => onNavigate("vlab", "#vlab")}
          >
            🔬 4-Bar Virtual Lab →
          </button>
          <span className="submit-page-badge" style={{ borderColor: "rgba(56, 189, 248, 0.4)", color: "#38bdf8" }}>
            🌀 Student Custom Animation & Virtual Lab Studio
          </span>
        </div>
      </div>

      {/* Page Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: "1.6rem" }}>🌀</span>
          <h1
            style={{
              fontSize: "clamp(1.5rem, 3.5vw, 2.2rem)",
              fontWeight: 800,
              color: "#f8fafc",
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            Student Custom <span style={{ color: "#38bdf8" }}>Animation Studio</span>
          </h1>
        </div>
        <p style={{ color: "var(--muted, #94a3b8)", fontSize: "0.95rem", maxWidth: 840, margin: 0, lineHeight: 1.5 }}>
          Dedicated virtual lab environment for interactive student-developed kinematic mechanisms, HTML animations, and real-time Grübler mobility calculations.
        </p>
      </div>

      {/* Empty state when no mechanisms exist */}
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
          <span style={{ fontSize: "3rem", display: "block", marginBottom: 16 }}>📭</span>
          <h3 style={{ color: "#f8fafc", margin: "0 0 8px" }}>No Mechanisms Submitted Yet</h3>
          <p style={{ color: "#94a3b8", margin: "0 0 20px", maxWidth: 400, marginInline: "auto", lineHeight: 1.5 }}>
            Be the first to share your kinematic mechanism project! Submit your working model with photos, videos, and an interactive HTML animation.
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

      {/* Mechanism Selector Tabs / Pills */}
      {mechanisms.length > 1 && (
        <div
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            paddingBottom: 12,
            marginBottom: 24,
            scrollbarWidth: "thin",
          }}
        >
          {mechanisms.map((m) => {
            const hasHtml =
              m.html_animation_url ||
              (m.animation_url && m.animation_url.toLowerCase().includes(".html"));
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
                  boxShadow: isSelected ? "0 4px 16px rgba(56, 189, 248, 0.2)" : "none",
                }}
              >
                <span>{mMeta?.icon || "⚙️"}</span>
                <span>{m.name}</span>
                {hasHtml && (
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
                    HTML
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Main Side-by-Side Studio Workbench */}
      {activeMechanism && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
              gap: 22,
              alignItems: "stretch",
              marginBottom: 30,
            }}
          >
            {/* Left: Expansive Virtual Lab Simulation Viewer */}
            <div
              ref={containerRef}
              style={{
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                borderRadius: isFullscreen ? 0 : 18,
                overflow: "hidden",
                border: isFullscreen ? "none" : "1px solid rgba(56, 189, 248, 0.4)",
                background: "linear-gradient(135deg, rgba(10, 16, 28, 0.95), rgba(7, 10, 18, 0.98))",
                boxShadow: isFullscreen ? "none" : "0 14px 40px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(56, 189, 248, 0.2)",
                height: isFullscreen ? "100vh" : "100%",
                minHeight: isFullscreen ? "100vh" : "620px",
              }}
            >
              {/* Virtual Lab Header Bar */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 18px",
                  background: "rgba(10, 16, 28, 0.92)",
                  borderBottom: "1px solid rgba(56, 189, 248, 0.25)",
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: "1.3rem" }}>🌀</span>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <strong style={{ color: "#f8fafc", fontSize: "0.98rem" }}>
                        Student Custom Animation
                      </strong>
                      <span
                        style={{
                          fontSize: "0.68rem",
                          padding: "2px 8px",
                          borderRadius: "999px",
                          background: htmlUrl ? "rgba(56, 189, 248, 0.15)" : "rgba(251, 191, 36, 0.15)",
                          color: htmlUrl ? "#38bdf8" : "#fbbf24",
                          border: `1px solid ${htmlUrl ? "rgba(56, 189, 248, 0.35)" : "rgba(251, 191, 36, 0.35)"}`,
                          fontWeight: 700,
                          fontFamily: "var(--font-mono, monospace)",
                        }}
                      >
                        {htmlUrl ? "HTML VIRTUAL LAB" : "CANVAS SIMULATOR"}
                      </span>
                    </div>
                    <span style={{ fontSize: "0.76rem", color: "var(--muted, #94a3b8)" }}>
                      {activeMechanism.name} · Contributed by {activeMechanism.student_name || "Student"} ({activeMechanism.college || "NMIET Mechanical"})
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  {htmlUrl && (
                    <button
                      type="button"
                      className="secondary-btn secondary-btn--small"
                      style={{ padding: "5px 12px", fontSize: "0.76rem" }}
                      onClick={() => setReloadKey((k) => k + 1)}
                      title="Restart Animation"
                    >
                      🔄 Reload
                    </button>
                  )}
                  <button
                    type="button"
                    className="secondary-btn secondary-btn--small"
                    style={{
                      padding: "5px 12px",
                      fontSize: "0.76rem",
                      borderColor: "rgba(56, 189, 248, 0.4)",
                      color: "#38bdf8",
                    }}
                    onClick={handleToggleFullscreen}
                    title="Toggle full screen laboratory view"
                  >
                    {isFullscreen ? "⤓ Exit Fullscreen" : "⛶ Fullscreen Lab"}
                  </button>
                  {htmlUrl && isSafeUrl(htmlUrl) && (
                    <a
                      href={htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="primary-btn"
                      style={{
                        padding: "5px 14px",
                        fontSize: "0.76rem",
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                      title="Open in standalone tab"
                    >
                      Open in Tab ↗
                    </a>
                  )}
                </div>
              </div>

              {/* Viewport: Either Full HTML simulation or Canvas simulation */}
              <div
                style={{
                  width: "100%",
                  flex: 1,
                  minHeight: isFullscreen ? "calc(100vh - 58px)" : "540px",
                  height: isFullscreen ? "calc(100vh - 58px)" : "600px",
                  background: "#050811",
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {htmlUrl ? (
                  <iframe
                    key={reloadKey}
                    src={htmlUrl}
                    title={`${activeMechanism.name} Student Custom Animation`}
                    sandbox="allow-scripts allow-popups allow-forms allow-same-origin"
                    style={{ width: "100%", height: "100%", flex: 1, border: 0, display: "block" }}
                    allow="accelerometer; autoplay; encrypted-media; gyroscope"
                  />
                ) : (
                  <div style={{ padding: "16px", height: "100%", display: "flex", flexDirection: "column" }}>
                    <div style={{ flex: 1 }}>
                      <MechanismPreview mechanism={activeMechanism} />
                    </div>
                    <p style={{ margin: "10px 0 0", fontSize: "0.78rem", color: "var(--muted, #94a3b8)", textAlign: "center" }}>
                      💡 Tip: Student can upload custom <code>.html</code> virtual lab files directly in the mechanism submission form.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Side-by-Side Grübler Mobility Calculator & Kinematic Animation */}
            <div style={{ minWidth: 320, maxWidth: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
              <DofCalculatorWidget
                mechanism={activeMechanism}
                title="Kinematic Mobility & DOF Analysis"
              />

              {/* Kinematic Animation Motion Preview */}
              <div
                style={{
                  borderRadius: 18,
                  overflow: "hidden",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  background: "rgba(10, 16, 28, 0.9)",
                  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.45)",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 18px",
                    background: "rgba(15, 23, 42, 0.9)",
                    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: "1.2rem" }}>⚙️</span>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <strong style={{ color: "#f8fafc", fontSize: "0.95rem" }}>
                          Kinematic Animation
                        </strong>
                        <span
                          style={{
                            fontSize: "0.68rem",
                            padding: "2px 8px",
                            borderRadius: "999px",
                            background: "rgba(168, 85, 247, 0.15)",
                            color: "#c084fc",
                            border: "1px solid rgba(168, 85, 247, 0.35)",
                            fontWeight: 700,
                            fontFamily: "var(--font-mono, monospace)",
                          }}
                        >
                          MOTION MODEL
                        </span>
                      </div>
                      <span style={{ fontSize: "0.74rem", color: "var(--muted, #94a3b8)" }}>
                        Linkage motion &amp; joint path simulation
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ minHeight: "360px", flex: 1, position: "relative" }}>
                  <MechanismPreview mechanism={activeMechanism} />
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Technical Specs & Student Attribution */}
          <div
            style={{
              padding: "22px 24px",
              background: "rgba(11, 16, 28, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "18px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14, marginBottom: 16 }}>
              <div>
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: meta?.color || "#38bdf8",
                  }}
                >
                  {activeMechanism.category || "Kinematic Mechanism"}
                </span>
                <h3 style={{ margin: "4px 0 6px", fontSize: "1.3rem", color: "#f8fafc" }}>
                  {activeMechanism.name}
                </h3>
                <p style={{ margin: 0, color: "var(--muted, #94a3b8)", fontSize: "0.85rem" }}>
                  Uploaded by <strong style={{ color: "#e2e8f0" }}>{activeMechanism.student_name || "Unknown Student"}</strong>
                  {activeMechanism.team_members && ` (Team: ${activeMechanism.team_members})`}
                  {` · ${activeMechanism.department || "Mechanical Engineering"} · ${activeMechanism.college || "NMIET"}`}
                </p>
              </div>

              <button
                type="button"
                className="secondary-btn"
                onClick={() => {
                  window.location.hash = `mechanism/${activeMechanism.id}`;
                  onNavigate("repository");
                }}
                style={{ fontSize: "0.82rem", padding: "6px 14px" }}
              >
                View Full Mechanism Specs →
              </button>
            </div>

            {activeMechanism.working_principle && (
              <div style={{ marginBottom: 14 }}>
                <h4 style={{ margin: "0 0 4px", fontSize: "0.92rem", color: "#38bdf8" }}>Working Principle</h4>
                <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--text, #e2e8f0)", lineHeight: 1.5 }}>
                  {activeMechanism.working_principle}
                </p>
              </div>
            )}

            {activeMechanism.detailed_description && (
              <div>
                <h4 style={{ margin: "0 0 4px", fontSize: "0.92rem", color: "#38bdf8" }}>Description</h4>
                <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--text, #e2e8f0)", lineHeight: 1.5 }}>
                  {activeMechanism.detailed_description}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

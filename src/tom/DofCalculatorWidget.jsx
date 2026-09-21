import { useState, useMemo } from "react";

/**
 * Interactive Grübler / Kutzbach Planar Mobility Calculator Widget.
 * Automatically placed beside mechanism animations/simulations.
 * Formula: F = 3(L - 1) - 2J - H
 */
export default function DofCalculatorWidget({
  mechanism,
  title = "Grübler DOF Calculator",
  compact = false,
}) {
  const initialLinks = Number(mechanism?.num_links ?? mechanism?.links ?? 4);
  const initialJoints = Number(mechanism?.num_joints ?? mechanism?.joints ?? 4);
  const initialHigherPairs = Number(mechanism?.higher_pairs ?? mechanism?.higherPairs ?? 0);

  const [links, setLinks] = useState(initialLinks);
  const [joints, setJoints] = useState(initialJoints);
  const [higherPairs, setHigherPairs] = useState(initialHigherPairs);

  // Live Grübler equation calculation: F = 3*(L - 1) - 2*J - H
  const term1 = 3 * Math.max(0, links - 1);
  const term2 = 2 * Math.max(0, joints);
  const term3 = Math.max(0, higherPairs);
  const dof = term1 - term2 - term3;

  const classification = useMemo(() => {
    if (dof === 1) {
      return {
        label: "Constrained Mechanism",
        sub: "1 Degree of Freedom",
        badge: "1 DOF · Constrained",
        color: "#34d399",
        bg: "rgba(52, 211, 153, 0.12)",
        border: "rgba(52, 211, 153, 0.35)",
        desc: "Properly constrained mechanism. 1 independent motor/driver input produces determinate, repeatable output motion.",
        icon: "✓",
      };
    }
    if (dof > 1) {
      return {
        label: "Unconstrained / Multi-DOF",
        sub: `${dof} Degrees of Freedom`,
        badge: `${dof} DOF · Differential`,
        color: "#fbbf24",
        bg: "rgba(251, 191, 36, 0.12)",
        border: "rgba(251, 191, 36, 0.35)",
        desc: `System has ${dof} degrees of freedom. Requires ${dof} independent actuators/inputs to control full motion path (e.g. robotic arm / differential).`,
        icon: "⚡",
      };
    }
    if (dof === 0) {
      return {
        label: "Statically Determinate Structure",
        sub: "0 Degrees of Freedom",
        badge: "0 DOF · Rigid Frame",
        color: "#c084fc",
        bg: "rgba(192, 132, 252, 0.12)",
        border: "rgba(192, 132, 252, 0.35)",
        desc: "Rigid kinematic structure / truss. No relative movement possible without link or joint deformation.",
        icon: "🔒",
      };
    }
    return {
      label: "Statically Indeterminate Structure",
      sub: `${dof} Degrees of Freedom`,
      badge: `${dof} DOF · Redundant`,
      color: "#f87171",
      bg: "rgba(248, 113, 113, 0.12)",
      border: "rgba(248, 113, 113, 0.35)",
      desc: "Overconstrained / super-structure with redundant links or constraints. May experience internal preloading stresses.",
      icon: "⚠️",
    };
  }, [dof]);

  function resetToOriginal() {
    setLinks(initialLinks);
    setJoints(initialJoints);
    setHigherPairs(initialHigherPairs);
  }

  function applyPreset(l, j, h) {
    setLinks(l);
    setJoints(j);
    setHigherPairs(h);
  }

  const isModified =
    links !== initialLinks ||
    joints !== initialJoints ||
    higherPairs !== initialHigherPairs;

  return (
    <div
      className="dof-calc-widget"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        padding: "16px 18px",
        background: "rgba(11, 16, 28, 0.85)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(56, 189, 248, 0.25)",
        borderRadius: "16px",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.04)",
        color: "var(--text, #e2e8f0)",
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          paddingBottom: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "1.15rem" }}>🧮</span>
          <div>
            <h4
              style={{
                margin: 0,
                fontSize: "0.94rem",
                fontWeight: 700,
                color: "#f8fafc",
                letterSpacing: "0.01em",
              }}
            >
              {title}
            </h4>
            <span
              style={{
                fontSize: "0.72rem",
                color: "#38bdf8",
                fontFamily: "var(--font-mono, monospace)",
              }}
            >
              Grübler: F = 3(L - 1) - 2J - H
            </span>
          </div>
        </div>

        {isModified && (
          <button
            type="button"
            className="secondary-btn secondary-btn--small"
            onClick={resetToOriginal}
            style={{ padding: "3px 8px", fontSize: "0.7rem", height: "26px" }}
            title="Reset to submitted mechanism parameters"
          >
            ↺ Reset
          </button>
        )}
      </div>

      {/* Main Result Card */}
      <div
        style={{
          padding: "12px 14px",
          borderRadius: "12px",
          background: classification.bg,
          border: `1px solid ${classification.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "1.05rem" }}>{classification.icon}</span>
            <span
              style={{
                fontSize: "0.78rem",
                fontWeight: 700,
                color: classification.color,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {classification.label}
            </span>
          </div>
          <div
            style={{
              fontSize: "0.74rem",
              color: "rgba(226, 232, 240, 0.8)",
              marginTop: "2px",
              lineHeight: 1.3,
            }}
          >
            {classification.desc}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minWidth: "64px",
            padding: "6px 10px",
            borderRadius: "10px",
            background: "rgba(0, 0, 0, 0.35)",
            border: `1px solid ${classification.color}40`,
          }}
        >
          <span
            style={{
              fontSize: "1.45rem",
              fontWeight: 800,
              fontFamily: "var(--font-mono, monospace)",
              color: classification.color,
              lineHeight: 1,
            }}
          >
            {dof}
          </span>
          <span
            style={{
              fontSize: "0.64rem",
              fontWeight: 700,
              color: "rgba(255, 255, 255, 0.6)",
              textTransform: "uppercase",
              marginTop: "3px",
            }}
          >
            DOF (F)
          </span>
        </div>
      </div>

      {/* Interactive Parameter Controls */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {/* Links (L) */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 10px",
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            borderRadius: "10px",
          }}
        >
          <div>
            <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#f1f5f9" }}>
              Total Links (<span style={{ color: "#38bdf8", fontFamily: "monospace" }}>L</span>)
            </div>
            <span style={{ fontSize: "0.68rem", color: "var(--muted, #94a3b8)" }}>
              Includes 1 fixed ground link
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <button
              type="button"
              onClick={() => setLinks((v) => Math.max(1, v - 1))}
              className="secondary-btn"
              style={{ width: 28, height: 28, padding: 0, fontSize: "0.95rem", lineHeight: 1 }}
              title="Decrease links"
            >
              −
            </button>
            <input
              type="number"
              min="1"
              max="50"
              value={links}
              onChange={(e) => setLinks(Math.max(1, parseInt(e.target.value, 10) || 1))}
              style={{
                width: "44px",
                height: "28px",
                textAlign: "center",
                background: "rgba(0, 0, 0, 0.4)",
                border: "1px solid rgba(56, 189, 248, 0.3)",
                borderRadius: "6px",
                color: "#f8fafc",
                fontWeight: 700,
                fontFamily: "monospace",
                fontSize: "0.88rem",
              }}
            />
            <button
              type="button"
              onClick={() => setLinks((v) => v + 1)}
              className="secondary-btn"
              style={{ width: 28, height: 28, padding: 0, fontSize: "0.95rem", lineHeight: 1 }}
              title="Increase links"
            >
              +
            </button>
          </div>
        </div>

        {/* Lower Pairs / Joints (J) */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 10px",
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            borderRadius: "10px",
          }}
        >
          <div>
            <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#f1f5f9" }}>
              Simple Joints (<span style={{ color: "#34d399", fontFamily: "monospace" }}>J</span>)
            </div>
            <span style={{ fontSize: "0.68rem", color: "var(--muted, #94a3b8)" }}>
              Pin / Revolute / Slider pairs
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <button
              type="button"
              onClick={() => setJoints((v) => Math.max(0, v - 1))}
              className="secondary-btn"
              style={{ width: 28, height: 28, padding: 0, fontSize: "0.95rem", lineHeight: 1 }}
              title="Decrease joints"
            >
              −
            </button>
            <input
              type="number"
              min="0"
              max="50"
              value={joints}
              onChange={(e) => setJoints(Math.max(0, parseInt(e.target.value, 10) || 0))}
              style={{
                width: "44px",
                height: "28px",
                textAlign: "center",
                background: "rgba(0, 0, 0, 0.4)",
                border: "1px solid rgba(52, 211, 153, 0.3)",
                borderRadius: "6px",
                color: "#f8fafc",
                fontWeight: 700,
                fontFamily: "monospace",
                fontSize: "0.88rem",
              }}
            />
            <button
              type="button"
              onClick={() => setJoints((v) => v + 1)}
              className="secondary-btn"
              style={{ width: 28, height: 28, padding: 0, fontSize: "0.95rem", lineHeight: 1 }}
              title="Increase joints"
            >
              +
            </button>
          </div>
        </div>

        {/* Higher Pairs (H) */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 10px",
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            borderRadius: "10px",
          }}
        >
          <div>
            <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#f1f5f9" }}>
              Higher Pairs (<span style={{ color: "#fbbf24", fontFamily: "monospace" }}>H</span>)
            </div>
            <span style={{ fontSize: "0.68rem", color: "var(--muted, #94a3b8)" }}>
              Cam-follower / Gear mesh contact
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <button
              type="button"
              onClick={() => setHigherPairs((v) => Math.max(0, v - 1))}
              className="secondary-btn"
              style={{ width: 28, height: 28, padding: 0, fontSize: "0.95rem", lineHeight: 1 }}
              title="Decrease higher pairs"
            >
              −
            </button>
            <input
              type="number"
              min="0"
              max="50"
              value={higherPairs}
              onChange={(e) => setHigherPairs(Math.max(0, parseInt(e.target.value, 10) || 0))}
              style={{
                width: "44px",
                height: "28px",
                textAlign: "center",
                background: "rgba(0, 0, 0, 0.4)",
                border: "1px solid rgba(251, 191, 36, 0.3)",
                borderRadius: "6px",
                color: "#f8fafc",
                fontWeight: 700,
                fontFamily: "monospace",
                fontSize: "0.88rem",
              }}
            />
            <button
              type="button"
              onClick={() => setHigherPairs((v) => v + 1)}
              className="secondary-btn"
              style={{ width: 28, height: 28, padding: 0, fontSize: "0.95rem", lineHeight: 1 }}
              title="Increase higher pairs"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Step-by-Step Calculation Breakdown */}
      <div
        style={{
          padding: "10px 12px",
          background: "rgba(0, 0, 0, 0.4)",
          borderRadius: "10px",
          border: "1px solid rgba(255, 255, 255, 0.06)",
          fontFamily: "var(--font-mono, monospace)",
          fontSize: "0.76rem",
          color: "var(--muted, #cbd5e1)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
          <span>F = 3({links} - 1) - 2({joints}) - {higherPairs}</span>
          <span style={{ color: classification.color, fontWeight: 700 }}>= {dof} DOF</span>
        </div>
        <div style={{ fontSize: "0.7rem", color: "rgba(255, 255, 255, 0.5)" }}>
          3×({links - 1}) = {term1} &nbsp;│&nbsp; 2×({joints}) = {term2} &nbsp;│&nbsp; H = {term3}
        </div>
      </div>

      {/* Kinematic Topology Presets */}
      {!compact && (
        <div>
          <span
            style={{
              fontSize: "0.68rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--muted, #94a3b8)",
              display: "block",
              marginBottom: "6px",
            }}
          >
            Kinematic Presets:
          </span>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => applyPreset(4, 4, 0)}
              style={{
                fontSize: "0.7rem",
                padding: "3px 8px",
                borderRadius: "6px",
                background: links === 4 && joints === 4 && higherPairs === 0 ? "rgba(56, 189, 248, 0.25)" : "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(56, 189, 248, 0.3)",
                color: "#e2e8f0",
                cursor: "pointer",
              }}
            >
              Four-Bar (1 DOF)
            </button>
            <button
              type="button"
              onClick={() => applyPreset(4, 4, 0)}
              style={{
                fontSize: "0.7rem",
                padding: "3px 8px",
                borderRadius: "6px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(52, 211, 153, 0.3)",
                color: "#e2e8f0",
                cursor: "pointer",
              }}
            >
              Slider-Crank (1 DOF)
            </button>
            <button
              type="button"
              onClick={() => applyPreset(3, 2, 1)}
              style={{
                fontSize: "0.7rem",
                padding: "3px 8px",
                borderRadius: "6px",
                background: links === 3 && joints === 2 && higherPairs === 1 ? "rgba(251, 191, 36, 0.25)" : "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(251, 191, 36, 0.3)",
                color: "#e2e8f0",
                cursor: "pointer",
              }}
            >
              Cam-Follower (1 DOF)
            </button>
            <button
              type="button"
              onClick={() => applyPreset(5, 5, 0)}
              style={{
                fontSize: "0.7rem",
                padding: "3px 8px",
                borderRadius: "6px",
                background: links === 5 && joints === 5 && higherPairs === 0 ? "rgba(192, 132, 252, 0.25)" : "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(192, 132, 252, 0.3)",
                color: "#e2e8f0",
                cursor: "pointer",
              }}
            >
              Five-Bar (2 DOF)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

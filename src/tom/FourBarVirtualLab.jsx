import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  solveFourBar,
  classifyGrashof,
  drawNeonLink,
  drawPivotJoint,
  drawGroundHatch,
  drawEngineeringGrid,
  KINEMATIC_COLORS,
} from "./kinematicCanvasEngine.js";
import { useMechanisms } from "../context/MechanismsContext.jsx";

export default function FourBarVirtualLab({
  initialMechanism = null,
  initialLinks = null,
  onApply = null,
  standalone = false,
}) {
  // ─── CLOUD REPOSITORY MECHANISMS (from shared context) ────────────────────
  const { mechanisms: cloudMechanisms } = useMechanisms();
  const [userSelectedId, setUserSelectedId] = useState(null);

  const selectedMechId =
    userSelectedId ||
    (initialMechanism?.id
      ? String(initialMechanism.id)
      : cloudMechanisms[0]?.id
      ? String(cloudMechanisms[0].id)
      : "");

  // Current active mechanism model
  const activeMechanism = useMemo(() => {
    if (userSelectedId) {
      return cloudMechanisms.find((m) => String(m.id) === String(userSelectedId)) || null;
    }
    if (initialMechanism) {
      return initialMechanism;
    }
    return cloudMechanisms[0] || null;
  }, [userSelectedId, cloudMechanisms, initialMechanism]);

  // ─── FOUR-BAR LINKAGE PARAMETERS ──────────────────────────────────────────
  const [L1, setL1] = useState(Number(initialLinks?.L1 ?? initialLinks?.l1 ?? 4.0));
  const [L2, setL2] = useState(Number(initialLinks?.L2 ?? initialLinks?.l2 ?? 2.0));
  const [L3, setL3] = useState(Number(initialLinks?.L3 ?? initialLinks?.l3 ?? 4.5));
  const [L4, setL4] = useState(Number(initialLinks?.L4 ?? initialLinks?.l4 ?? 3.5));

  // Common animation state
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1.5);
  const [showTrace, setShowTrace] = useState(true);

  const canvasRef = useRef(null);
  const traceRef = useRef([]);
  const lastTimeRef = useRef(null);
  const angleInputRef = useRef(null);
  const angleTextRef = useRef(null);
  const isVisibleRef = useRef(true);

  // Ref snapshot for 60fps canvas loop
  const stateRef = useRef({
    L1,
    L2,
    L3,
    L4,
    theta: 0,
    running,
    speed,
    showTrace,
  });

  useEffect(() => {
    stateRef.current = {
      ...stateRef.current,
      L1,
      L2,
      L3,
      L4,
      running,
      speed,
      showTrace,
    };
  }, [L1, L2, L3, L4, running, speed, showTrace]);

  // Track visibility to pause requestAnimationFrame when offscreen or tab hidden
  useEffect(() => {
    const handleVis = () => {
      isVisibleRef.current = !document.hidden;
    };
    document.addEventListener("visibilitychange", handleVis);

    let observer = null;
    const canvasWrap = canvasRef.current?.parentElement;
    if (canvasWrap && window.IntersectionObserver) {
      observer = new IntersectionObserver(
        ([entry]) => {
          isVisibleRef.current = entry.isIntersecting && !document.hidden;
        },
        { threshold: 0.05 }
      );
      observer.observe(canvasWrap);
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVis);
      if (observer) observer.disconnect();
    };
  }, []);

  // Handle mechanism change from selector
  const handleSelectMechanism = (id) => {
    setUserSelectedId(id);
    traceRef.current = [];
    stateRef.current.theta = 0;
    if (angleInputRef.current) angleInputRef.current.value = 0;
    if (angleTextRef.current) angleTextRef.current.textContent = "0°";
    setRunning(true);
  };

  const handleReset = () => {
    setL1(4.0);
    setL2(2.0);
    setL3(4.5);
    setL4(3.5);
    stateRef.current.theta = 0;
    traceRef.current = [];
    if (angleInputRef.current) angleInputRef.current.value = 0;
    if (angleTextRef.current) angleTextRef.current.textContent = "0°";
    drawFrame();
  };

  const grashof = useMemo(() => classifyGrashof(L1, L2, L3, L4), [L1, L2, L3, L4]);

  // ─── CANVAS DRAWING ───────────────────────────────────────────────────────
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const s = stateRef.current;
    if (!s) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    if (width <= 0 || height <= 0 || !Number.isFinite(width) || !Number.isFinite(height)) return;

    ctx.save();
    ctx.scale(dpr, dpr);
    try {
      ctx.clearRect(0, 0, width, height);
      drawEngineeringGrid(ctx, width, height, 26);

      const maxSpan = Math.max(s.L1, s.L2 + s.L3 + s.L4, 6);
      const scale = Math.min(width, height) / (maxSpan * 2.3);
      const cx = width * 0.32;
      const cy = height * 0.58;
      const toCanvas = (x, y) => ({ x: cx + x * scale, y: cy - y * scale });

      const sol = solveFourBar(s.L1, s.L2, s.L3, s.L4, s.theta);

      if (!sol) {
        ctx.fillStyle = "#f87171";
        ctx.font = "bold 15px 'DM Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText(
          "⚠ Kinematic Limit Reached (No geometric closure at this angle)",
          width / 2,
          height / 2
        );
        return;
      }

      const { O2, O4, A, B, mu_deg } = sol;

      if (mu_deg !== undefined) {
        const isOptimal = mu_deg >= 40 && mu_deg <= 140;
        ctx.fillStyle = isOptimal ? "#38bdf8" : "#f87171";
        ctx.font = "bold 11px 'DM Mono', monospace";
        ctx.textAlign = "right";
        ctx.fillText(
          "Transmission Angle μ: " +
            mu_deg.toFixed(1) +
            "° (" +
            (isOptimal ? "Optimal" : "Low Advantage") +
            ")",
          width - 18,
          26
        );
      }

      const pO2 = toCanvas(O2.x, O2.y);
      const pO4 = toCanvas(O4.x, O4.y);
      const pA = toCanvas(A.x, A.y);
      const pB = toCanvas(B.x, B.y);

      // Coupler Curve Trace
      if (s.showTrace) {
        const midX = (A.x + B.x) / 2;
        const midY = (A.y + B.y) / 2;
        traceRef.current.push({ x: midX, y: midY });
        if (traceRef.current.length > 260) traceRef.current.shift();

        if (traceRef.current.length > 1) {
          ctx.beginPath();
          const start = toCanvas(traceRef.current[0].x, traceRef.current[0].y);
          ctx.moveTo(start.x, start.y);
          for (let i = 1; i < traceRef.current.length; i++) {
            const pt = toCanvas(traceRef.current[i].x, traceRef.current[i].y);
            ctx.lineTo(pt.x, pt.y);
          }
          ctx.strokeStyle = KINEMATIC_COLORS.trace;
          ctx.lineWidth = 2.2;
          ctx.stroke();
        }
      }

      // Ground frame
      ctx.beginPath();
      ctx.setLineDash([5, 5]);
      ctx.moveTo(pO2.x, pO2.y);
      ctx.lineTo(pO4.x, pO4.y);
      ctx.strokeStyle = KINEMATIC_COLORS.ground;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);

      // Crank orbit
      ctx.beginPath();
      ctx.arc(pO2.x, pO2.y, s.L2 * scale, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(56, 189, 248, 0.22)";
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Neon Links
      drawNeonLink(ctx, pO2, pA, KINEMATIC_COLORS.crank, "Crank (" + s.L2.toFixed(1) + ")", 6);
      drawNeonLink(ctx, pA, pB, KINEMATIC_COLORS.coupler, "Coupler (" + s.L3.toFixed(1) + ")", 6);
      drawNeonLink(ctx, pO4, pB, KINEMATIC_COLORS.output, "Follower (" + s.L4.toFixed(1) + ")", 6);

      // Ground Bearings & Pivot Pins
      drawGroundHatch(ctx, pO2);
      drawGroundHatch(ctx, pO4);
      drawPivotJoint(ctx, pO2, "O₂", KINEMATIC_COLORS.crank, 8);
      drawPivotJoint(ctx, pO4, "O₄", KINEMATIC_COLORS.output, 8);
      drawPivotJoint(ctx, pA, "A", KINEMATIC_COLORS.coupler, 7);
      drawPivotJoint(ctx, pB, "B", KINEMATIC_COLORS.coupler, 7);
    } catch (err) {
      console.error("Virtual Lab render error:", err);
      try {
        ctx.fillStyle = "#f87171";
        ctx.font = "bold 13px 'DM Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText(
          "⚠ Simulation error: " + (err?.message || "Check mechanism geometry"),
          width / 2,
          height / 2
        );
      } catch {
        /* ignore fallback render error */
      }
    } finally {
      ctx.restore();
    }
  }, []);

  // ─── 60FPS OPTIMIZED ANIMATION LOOP (0 React re-renders during playback) ───
  useEffect(() => {
    let animId;
    const animate = (time) => {
      if (lastTimeRef.current == null) lastTimeRef.current = time;
      const delta = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      if (!isVisibleRef.current) {
        animId = requestAnimationFrame(animate);
        return;
      }

      const s = stateRef.current;
      if (s.running) {
        const next = (s.theta + delta * 60 * s.speed) % 360;
        stateRef.current.theta = next;
        const rounded = Math.round(next);
        // Direct DOM update: buttery smooth 60fps with zero React component re-renders
        if (angleInputRef.current) angleInputRef.current.value = rounded;
        if (angleTextRef.current) angleTextRef.current.textContent = `${rounded}°`;
      }
      drawFrame();
      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [drawFrame]);

  // Handle window resizing
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(1, Math.floor((rect.width || 600) * dpr));
      const h = Math.max(1, Math.floor((rect.height || 440) * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      drawFrame();
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [drawFrame]);

  return (
    <div className={"vlab-shell" + (standalone ? " vlab-shell--standalone" : "")}>
      {/* ── TOP CLOUD REPOSITORY MECHANISM SELECTOR (only shown on standalone Virtual Lab page) ── */}
      {standalone ? (
        <div className="vlab-selector-bar">
          <span className="vlab-selector-label">📂 Select Mechanism:</span>
          <select
            className="vlab-select"
            value={selectedMechId}
            onChange={(e) => handleSelectMechanism(e.target.value)}
          >
            {cloudMechanisms.length === 0 ? (
              <option value="">Default Interactive Four-Bar Simulator</option>
            ) : (
              cloudMechanisms.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} {m.student_name ? `— By ${m.student_name}` : ""}
                </option>
              ))
            )}
          </select>

          <span className="vlab-repo-badge">
            ☁️ {cloudMechanisms.length} Models in Repository
          </span>
        </div>
      ) : (
        activeMechanism && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 18px",
              background: "rgba(15, 23, 42, 0.7)",
              borderRadius: "12px",
              border: "1px solid rgba(56, 189, 248, 0.25)",
              marginBottom: 16,
            }}
          >
            <span style={{ fontSize: "1.1rem" }}>🔬</span>
            <span style={{ fontSize: "0.88rem", color: "#f8fafc", fontWeight: 600 }}>
              Virtual Lab Simulation: <span style={{ color: "#38bdf8" }}>{activeMechanism.name}</span>
              {activeMechanism.student_name ? ` (Submitted by ${activeMechanism.student_name})` : ""}
            </span>
          </div>
        )
      )}

      {/* ── MAIN VLAB HEADER ── */}
      <div className="vlab-header">
        <div className="vlab-logo">⚙️</div>
        <div>
          <h3 className="vlab-title">
            {activeMechanism?.name || "Theory of Machines Virtual Lab"}
          </h3>
          <span className="vlab-subtitle">
            Four-Bar Linkage · Real-Time Motion Simulation · Path Tracing
          </span>
        </div>
        {onApply && (
          <button
            type="button"
            className="primary-btn"
            style={{ marginLeft: "auto" }}
            onClick={() => onApply({ L1, L2, L3, L4, grashof })}
          >
            Apply to Model
          </button>
        )}
      </div>

      <div className="vlab-grid">
        {/* ── LEFT CONTROLS PANEL ── */}
        <div className="vlab-panel vlab-panel--left">
          <span className="vlab-panel-label">Linkage Dimensions</span>

          <div className="vlab-slider-row">
            <div className="vlab-slider-top">
              <span className="vlab-link-name" style={{ color: KINEMATIC_COLORS.ground }}>
                L1 — Ground Frame
              </span>
              <strong className="vlab-val" style={{ color: KINEMATIC_COLORS.ground }}>
                {L1.toFixed(1)}
              </strong>
            </div>
            <div className="vlab-controls">
              <input
                type="range"
                min="1"
                max="8"
                step="0.1"
                value={L1}
                onChange={(e) => {
                  setL1(parseFloat(e.target.value) || 1);
                  traceRef.current = [];
                }}
                style={{ accentColor: KINEMATIC_COLORS.ground }}
              />
              <input
                type="number"
                min="1"
                max="8"
                step="0.1"
                value={L1}
                onChange={(e) => {
                  setL1(parseFloat(e.target.value) || 1);
                  traceRef.current = [];
                }}
                className="vlab-num-input"
              />
            </div>
          </div>

          <div className="vlab-slider-row">
            <div className="vlab-slider-top">
              <span className="vlab-link-name" style={{ color: KINEMATIC_COLORS.crank }}>
                L2 — Driver Crank
              </span>
              <strong className="vlab-val" style={{ color: KINEMATIC_COLORS.crank }}>
                {L2.toFixed(1)}
              </strong>
            </div>
            <div className="vlab-controls">
              <input
                type="range"
                min="0.5"
                max="8"
                step="0.1"
                value={L2}
                onChange={(e) => {
                  setL2(parseFloat(e.target.value) || 0.5);
                  traceRef.current = [];
                }}
                style={{ accentColor: KINEMATIC_COLORS.crank }}
              />
              <input
                type="number"
                min="0.5"
                max="8"
                step="0.1"
                value={L2}
                onChange={(e) => {
                  setL2(parseFloat(e.target.value) || 0.5);
                  traceRef.current = [];
                }}
                className="vlab-num-input"
              />
            </div>
          </div>

          <div className="vlab-slider-row">
            <div className="vlab-slider-top">
              <span className="vlab-link-name" style={{ color: KINEMATIC_COLORS.coupler }}>
                L3 — Coupler Link
              </span>
              <strong className="vlab-val" style={{ color: KINEMATIC_COLORS.coupler }}>
                {L3.toFixed(1)}
              </strong>
            </div>
            <div className="vlab-controls">
              <input
                type="range"
                min="0.5"
                max="8"
                step="0.1"
                value={L3}
                onChange={(e) => {
                  setL3(parseFloat(e.target.value) || 0.5);
                  traceRef.current = [];
                }}
                style={{ accentColor: KINEMATIC_COLORS.coupler }}
              />
              <input
                type="number"
                min="0.5"
                max="8"
                step="0.1"
                value={L3}
                onChange={(e) => {
                  setL3(parseFloat(e.target.value) || 0.5);
                  traceRef.current = [];
                }}
                className="vlab-num-input"
              />
            </div>
          </div>

          <div className="vlab-slider-row">
            <div className="vlab-slider-top">
              <span className="vlab-link-name" style={{ color: KINEMATIC_COLORS.output }}>
                L4 — Rocker / Follower
              </span>
              <strong className="vlab-val" style={{ color: KINEMATIC_COLORS.output }}>
                {L4.toFixed(1)}
              </strong>
            </div>
            <div className="vlab-controls">
              <input
                type="range"
                min="0.5"
                max="8"
                step="0.1"
                value={L4}
                onChange={(e) => {
                  setL4(parseFloat(e.target.value) || 0.5);
                  traceRef.current = [];
                }}
                style={{ accentColor: KINEMATIC_COLORS.output }}
              />
              <input
                type="number"
                min="0.5"
                max="8"
                step="0.1"
                value={L4}
                onChange={(e) => {
                  setL4(parseFloat(e.target.value) || 0.5);
                  traceRef.current = [];
                }}
                className="vlab-num-input"
              />
            </div>
          </div>

          <div className="vlab-divider" />

          {/* Kinematic Playback Controls */}
          <span className="vlab-panel-label">Motion Playback</span>
          <div className="vlab-slider-row">
            <div className="vlab-slider-top">
              <span className="vlab-link-name">Speed</span>
              <strong className="vlab-val" style={{ color: "var(--gold)" }}>
                {speed.toFixed(1)}x
              </strong>
            </div>
            <input
              type="range"
              min="0.2"
              max="3.5"
              step="0.1"
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              style={{ accentColor: "var(--gold)" }}
            />
          </div>

          <div className="vlab-btn-row">
            <button
              type="button"
              className={"vlab-btn " + (running ? "vlab-btn--pause" : "vlab-btn--play")}
              onClick={() => setRunning((r) => !r)}
            >
              {running ? "⏸ Pause" : "▶ Play"}
            </button>
            <button type="button" className="vlab-btn" onClick={handleReset}>
              ↺ Reset
            </button>
          </div>

          <label className="vlab-checkbox-label">
            <input
              type="checkbox"
              checked={showTrace}
              onChange={(e) => {
                setShowTrace(e.target.checked);
                if (!e.target.checked) traceRef.current = [];
              }}
            />
            Show Motion Path Trace
          </label>

          <div className="vlab-divider" />

          {/* Manual Angle Scrubber */}
          <span className="vlab-panel-label">Manual Angle Scrub (θ)</span>
          <input
            ref={angleInputRef}
            type="range"
            min="0"
            max="359"
            step="1"
            defaultValue={0}
            onChange={(e) => {
              setRunning(false);
              const val = parseInt(e.target.value, 10);
              stateRef.current.theta = val;
              stateRef.current.running = false;
              if (angleTextRef.current) angleTextRef.current.textContent = `${val}°`;
              drawFrame();
            }}
            style={{ width: "100%", accentColor: KINEMATIC_COLORS.crank }}
          />
          <div className="vlab-angle-readout">
            <span ref={angleTextRef}>0°</span>
          </div>
        </div>

        {/* ── CENTER CANVAS VIEW ── */}
        <div className="vlab-canvas-wrap">
          <canvas ref={canvasRef} className="vlab-canvas" />
        </div>

        {/* ── RIGHT ANALYSIS PANEL ── */}
        <div className="vlab-panel vlab-panel--right">
          <span className="vlab-panel-label">Mechanism Analysis</span>

          {/* Four-Bar Grashof Results */}
          <div
            className="vlab-result-card"
            style={{ borderColor: grashof.color, background: grashof.color + "15" }}
          >
            <span className="vlab-result-icon">{grashof.icon}</span>
            <h4 className="vlab-result-type" style={{ color: grashof.color }}>
              {grashof.type}
            </h4>
            <p className="vlab-result-desc">{grashof.description}</p>
          </div>

          <div className="vlab-badge">
            <span className="vlab-dot" style={{ background: grashof.color }} />
            <span style={{ color: grashof.color, fontWeight: 700 }}>{grashof.condition}</span>
          </div>

          <div className="vlab-divider" />

          <span className="vlab-panel-label">Mobility Condition</span>
          <div className="vlab-criterion-box">
            <div className="vlab-crit-formula">Shortest + Longest ≤ Sum of Others</div>
            <div
              className="vlab-crit-numbers"
              style={{ color: grashof.isGrashof ? "#4ade80" : "#f87171" }}
            >
              {grashof.sumSL.toFixed(1)} {grashof.isGrashof ? "≤" : ">"} {grashof.sumPQ.toFixed(1)}
            </div>
            <div className="vlab-crit-sub">
              S = {grashof.s.toFixed(1)} (Shortest), L = {grashof.l.toFixed(1)} (Longest)
            </div>
            <div
              className="vlab-crit-status"
              style={{ color: grashof.isGrashof ? "#4ade80" : "#f87171" }}
            >
              {grashof.isGrashof
                ? "✓ Continuous Rotation Possible"
                : "✗ Only Rocking Motion (Oscillating)"}
            </div>
          </div>

          <div className="vlab-divider" />

          {/* Selected Mechanism Metadata Card */}
          <span className="vlab-panel-label">Selected Model Details</span>
          <div
            style={{
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "14px",
              padding: "12px 14px",
              fontSize: "0.82rem",
              color: "var(--muted)",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            <strong style={{ color: "#f8fafc", fontSize: "0.92rem" }}>
              {activeMechanism?.name || "Mechanism Project"}
            </strong>
            <span style={{ color: "var(--gold, #fbbf24)", fontWeight: 600 }}>
              👤 By {activeMechanism?.student_name || "Department Project"}
            </span>
            {activeMechanism?.academic_year && (
              <span>
                🏫 {activeMechanism.academic_year} · {activeMechanism.college || "NMIET"}
              </span>
            )}
            <p style={{ margin: "4px 0 0 0", lineHeight: 1.4, color: "#cbd5e1" }}>
              {activeMechanism?.short_description ||
                activeMechanism?.detailed_description ||
                "Demonstrating motion transmission and kinematic geometry in the Theory of Machines lab."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

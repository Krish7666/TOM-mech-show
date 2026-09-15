import { useEffect, useRef, useState, useCallback } from "react";
import {
  solveFourBar,
  solveSliderCrank,
  solveQuickReturn,
  drawNeonLink,
  drawPivotJoint,
  drawGroundHatch,
  drawEngineeringGrid,
  KINEMATIC_COLORS,
} from "./kinematicCanvasEngine.js";
import { analyzeMechanism, camLift, smoothStep } from "./kinematics.js";

export default function MechanismPreview({ mechanism, analysis: explicitAnalysis }) {
  const [angle, setAngle] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [showTrace, setShowTrace] = useState(true);

  const canvasRef = useRef(null);
  const traceRef = useRef([]);
  const animFrameRef = useRef(null);
  const lastTimeRef = useRef(null);

  const analysis = explicitAnalysis || analyzeMechanism(mechanism);
  const canMove = analysis.status === "constrained" || analysis.status === "underconstrained";

  const category = (mechanism?.category || "").toLowerCase();
  const name = (mechanism?.name || "").toLowerCase();
  const isGear = category.includes("gear") || name.includes("gear");
  const isCam = category.includes("cam") || name.includes("cam");
  const isSteering = category.includes("steering") || name.includes("steering");
  const isPickAndPlace =
    mechanism?.mechanismType === "pick-and-place" ||
    name.includes("pick") ||
    name.includes("place");
  const isQuickReturn =
    category.includes("quick") ||
    name.includes("quick") ||
    name.includes("whitworth") ||
    name.includes("shaper");
  const isSliderCrank =
    !isPickAndPlace &&
    !isQuickReturn &&
    (category.includes("slider") ||
      name.includes("slider") ||
      category.includes("reciprocat") ||
      name.includes("piston") ||
      name.includes("crank-slider"));

  // State ref for animation loop
  const stateRef = useRef({ angle, isPlaying, speedMultiplier, canMove, showTrace });
  useEffect(() => {
    stateRef.current = { angle, isPlaying, speedMultiplier, canMove, showTrace };
  }, [angle, isPlaying, speedMultiplier, canMove, showTrace]);

  // ─── RENDERERS PER MECHANISM TOPOLOGY ───────────────────────────────────────

  const renderFourBarCanvas = (ctx, W, H, th, traceOn) => {
    const L1 = 4.0, L2 = 1.9, L3 = 4.4, L4 = 3.4;
    const maxSpan = L1 + L2 + L3;
    const scale = Math.min(W, H) / (maxSpan * 1.55);
    const cx = W * 0.32;
    const cy = H * 0.62;

    const toCanvas = (x, y) => ({ x: cx + x * scale, y: cy - y * scale });
    const sol = solveFourBar(L1, L2, L3, L4, th);
    if (!sol) return;

    const { O2, O4, A, B } = sol;
    const pO2 = toCanvas(O2.x, O2.y);
    const pO4 = toCanvas(O4.x, O4.y);
    const pA = toCanvas(A.x, A.y);
    const pB = toCanvas(B.x, B.y);

    // Coupler curve trace
    if (traceOn) {
      const midX = (A.x + B.x) / 2;
      const midY = (A.y + B.y) / 2;
      traceRef.current.push({ x: midX, y: midY });
      if (traceRef.current.length > 240) traceRef.current.shift();

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

    // Ground line
    ctx.beginPath();
    ctx.setLineDash([6, 5]);
    ctx.moveTo(pO2.x, pO2.y);
    ctx.lineTo(pO4.x, pO4.y);
    ctx.strokeStyle = KINEMATIC_COLORS.ground;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);

    // Crank rotation orbit
    ctx.beginPath();
    ctx.arc(pO2.x, pO2.y, L2 * scale, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(56, 189, 248, 0.2)";
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Links
    drawNeonLink(ctx, pO2, pA, KINEMATIC_COLORS.crank, "Crank", 5);
    drawNeonLink(ctx, pA, pB, KINEMATIC_COLORS.coupler, "Coupler", 5);
    drawNeonLink(ctx, pO4, pB, KINEMATIC_COLORS.output, "Follower", 5);

    // Grounds & Joints
    drawGroundHatch(ctx, pO2);
    drawGroundHatch(ctx, pO4);
    drawPivotJoint(ctx, pO2, "O₂", KINEMATIC_COLORS.crank, 7);
    drawPivotJoint(ctx, pO4, "O₄", KINEMATIC_COLORS.output, 7);
    drawPivotJoint(ctx, pA, "A", KINEMATIC_COLORS.coupler, 6);
    drawPivotJoint(ctx, pB, "B", KINEMATIC_COLORS.coupler, 6);
  };

  const renderSliderCrankCanvas = (ctx, W, H, th, traceOn) => {
    const R = 44;
    const L = 138;
    const cx = W * 0.28;
    const cy = H * 0.52;

    const sol = solveSliderCrank(R, L, th);
    const pO = { x: cx + sol.O.x, y: cy - sol.O.y };
    const pA = { x: cx + sol.A.x, y: cy - sol.A.y };
    const pB = { x: cx + sol.B.x, y: cy - sol.B.y };

    // Trace
    if (traceOn) {
      const mid = { x: (pA.x + pB.x) / 2, y: (pA.y + pB.y) / 2 };
      traceRef.current.push(mid);
      if (traceRef.current.length > 240) traceRef.current.shift();

      if (traceRef.current.length > 1) {
        ctx.beginPath();
        ctx.moveTo(traceRef.current[0].x, traceRef.current[0].y);
        for (let i = 1; i < traceRef.current.length; i++) {
          ctx.lineTo(traceRef.current[i].x, traceRef.current[i].y);
        }
        ctx.strokeStyle = KINEMATIC_COLORS.trace;
        ctx.lineWidth = 2.2;
        ctx.stroke();
      }
    }

    // Cylinder guide rails
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + 40, cy - 22);
    ctx.lineTo(cx + R + L + 40, cy - 22);
    ctx.moveTo(cx + 40, cy + 22);
    ctx.lineTo(cx + R + L + 40, cy + 22);
    ctx.stroke();

    // Stroke centerline
    ctx.beginPath();
    ctx.setLineDash([6, 5]);
    ctx.moveTo(cx - R - 20, cy);
    ctx.lineTo(cx + R + L + 50, cy);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.stroke();
    ctx.setLineDash([]);

    // Crank orbit
    ctx.beginPath();
    ctx.arc(pO.x, pO.y, R, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(56, 189, 248, 0.2)";
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Links
    drawNeonLink(ctx, pO, pA, KINEMATIC_COLORS.crank, "Crank", 5);
    drawNeonLink(ctx, pA, pB, KINEMATIC_COLORS.coupler, "Connecting Rod", 5);

    // Piston Block
    const pw = 48, ph = 34;
    ctx.fillStyle = "#1e293b";
    ctx.strokeStyle = KINEMATIC_COLORS.output;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(pB.x - pw / 2, pB.y - ph / 2, pw, ph, 6);
    ctx.fill();
    ctx.stroke();

    // Piston rings
    ctx.strokeStyle = "#64748b";
    ctx.beginPath();
    ctx.moveTo(pB.x - 12, pB.y - ph / 2);
    ctx.lineTo(pB.x - 12, pB.y + ph / 2);
    ctx.moveTo(pB.x + 12, pB.y - ph / 2);
    ctx.lineTo(pB.x + 12, pB.y + ph / 2);
    ctx.stroke();

    // Ground and pivots
    drawGroundHatch(ctx, pO);
    drawPivotJoint(ctx, pO, "Shaft", KINEMATIC_COLORS.crank, 7);
    drawPivotJoint(ctx, pA, "Crank Pin", KINEMATIC_COLORS.coupler, 6);
    drawPivotJoint(ctx, pB, "Wrist Pin", KINEMATIC_COLORS.output, 6);
  };

  const renderQuickReturnCanvas = (ctx, W, H, th) => {
    const r = 36;
    const h = 48;
    const leverLen = 138;
    const cx = W * 0.42;
    const cy = H * 0.72;

    const sol = solveQuickReturn(r, h, leverLen, th);
    const toC = (p) => ({ x: cx + p.x, y: cy - p.y });

    const pO1 = toC(sol.O1);
    const pO2 = toC(sol.O2);
    const pCrank = toC(sol.crankPin);
    const pTip = toC(sol.leverTip);
    const pRam = toC(sol.ramPin);

    // Ram Guide Rails
    const ramGuideY = cy - 45;
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 30, ramGuideY - 16);
    ctx.lineTo(cx + 200, ramGuideY - 16);
    ctx.moveTo(cx - 30, ramGuideY + 16);
    ctx.lineTo(cx + 200, ramGuideY + 16);
    ctx.stroke();

    // Crank orbit
    ctx.beginPath();
    ctx.arc(pO1.x, pO1.y, r, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(56, 189, 248, 0.2)";
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Slotted Lever (Link 3)
    drawNeonLink(ctx, pO2, pTip, KINEMATIC_COLORS.coupler, "Slotted Arm", 7);

    // Driver Crank (Link 2)
    drawNeonLink(ctx, pO1, pCrank, KINEMATIC_COLORS.crank, "Crank", 5);

    // Connecting Link to Ram (Link 4)
    drawNeonLink(ctx, pTip, pRam, KINEMATIC_COLORS.output, "Link", 4.5);

    // Sliding block on lever
    ctx.save();
    ctx.translate(pCrank.x, pCrank.y);
    ctx.rotate(-sol.leverAngle);
    ctx.fillStyle = "#334155";
    ctx.strokeStyle = KINEMATIC_COLORS.crank;
    ctx.lineWidth = 1.5;
    ctx.fillRect(-10, -10, 20, 20);
    ctx.strokeRect(-10, -10, 20, 20);
    ctx.restore();

    // Shaper Ram Tool
    ctx.fillStyle = "#1e293b";
    ctx.strokeStyle = KINEMATIC_COLORS.output;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(pRam.x - 24, pRam.y - 12, 48, 24, 4);
    ctx.fill();
    ctx.stroke();

    // Cutting tool bit
    ctx.fillStyle = KINEMATIC_COLORS.accent;
    ctx.beginPath();
    ctx.moveTo(pRam.x + 24, pRam.y);
    ctx.lineTo(pRam.x + 36, pRam.y + 14);
    ctx.lineTo(pRam.x + 18, pRam.y + 14);
    ctx.closePath();
    ctx.fill();

    // Ground & Pivots
    drawGroundHatch(ctx, pO1);
    drawGroundHatch(ctx, pO2);
    drawPivotJoint(ctx, pO1, "O₁", KINEMATIC_COLORS.crank, 6);
    drawPivotJoint(ctx, pO2, "O₂", KINEMATIC_COLORS.coupler, 7);
    drawPivotJoint(ctx, pCrank, "", "#ffffff", 4);
    drawPivotJoint(ctx, pTip, "", KINEMATIC_COLORS.output, 5);
    drawPivotJoint(ctx, pRam, "Ram", KINEMATIC_COLORS.output, 6);
  };

  const renderCamCanvas = (ctx, W, H, th) => {
    const cx = W * 0.5;
    const cy = H * 0.62;
    const angleRad = (th * Math.PI) / 180;
    const lift = 22 + camLift(angleRad) * 36;
    const followerY = cy - lift;

    // Cam Rotor
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angleRad);
    ctx.fillStyle = "#1e293b";
    ctx.strokeStyle = KINEMATIC_COLORS.crank;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, -48);
    ctx.bezierCurveTo(54, -48, 55, -8, 38, 34);
    ctx.bezierCurveTo(20, 68, -42, 48, -48, 10);
    ctx.bezierCurveTo(-54, -28, -28, -48, 0, -48);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Follower Roller & Stem
    drawNeonLink(ctx, { x: cx, y: followerY }, { x: cx, y: cy - 110 }, KINEMATIC_COLORS.output, "Follower", 5);

    // Roller wheel
    ctx.beginPath();
    ctx.arc(cx, followerY, 11, 0, Math.PI * 2);
    ctx.fillStyle = "#334155";
    ctx.fill();
    ctx.strokeStyle = KINEMATIC_COLORS.output;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Guide Bushing
    ctx.strokeStyle = "#64748b";
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 16, cy - 95, 32, 28);

    drawPivotJoint(ctx, { x: cx, y: cy }, "Cam Shaft", KINEMATIC_COLORS.crank, 7);
    drawPivotJoint(ctx, { x: cx, y: followerY }, "Roller", KINEMATIC_COLORS.output, 5);
  };

  const renderGearsCanvas = (ctx, W, H, th) => {
    const r1 = 46;
    const r2 = 68;
    const cx1 = W * 0.38;
    const cy1 = H * 0.5;
    const cx2 = cx1 + r1 + r2;
    const cy2 = cy1;

    const drawGearDisc = (x, y, r, teeth, rot, color) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);

      // Pitch Circle
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = "#1e293b";
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Teeth
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      for (let i = 0; i < teeth; i++) {
        const a = (i * 2 * Math.PI) / teeth;
        ctx.beginPath();
        ctx.moveTo(r * Math.cos(a), r * Math.sin(a));
        ctx.lineTo((r + 8) * Math.cos(a), (r + 8) * Math.sin(a));
        ctx.stroke();
      }

      // Hub & Spokes
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();
    };

    const rot1 = (th * Math.PI) / 180;
    const rot2 = -rot1 * (r1 / r2);

    drawGearDisc(cx1, cy1, r1, 14, rot1, KINEMATIC_COLORS.crank);
    drawGearDisc(cx2, cy2, r2, 21, rot2, KINEMATIC_COLORS.output);

    drawGroundHatch(ctx, { x: cx1, y: cy1 });
    drawGroundHatch(ctx, { x: cx2, y: cy2 });
    drawPivotJoint(ctx, { x: cx1, y: cy1 }, "Driver N₁", KINEMATIC_COLORS.crank, 7);
    drawPivotJoint(ctx, { x: cx2, y: cy2 }, "Driven N₂", KINEMATIC_COLORS.output, 7);
  };

  const renderSteeringCanvas = (ctx, W, H, th) => {
    const steerAngle = Math.sin((th * Math.PI) / 180) * 0.45;
    const cx = W * 0.5;
    const cy = H * 0.52;
    const track = 170;
    const shift = steerAngle * 28;

    const leftPivot = { x: cx - track / 2, y: cy };
    const rightPivot = { x: cx + track / 2, y: cy };

    // Tie-rod track
    drawNeonLink(ctx, { x: leftPivot.x + shift, y: cy + 30 }, { x: rightPivot.x + shift, y: cy + 30 }, KINEMATIC_COLORS.crank, "Steering Rack", 4.5);

    // Arms
    drawNeonLink(ctx, leftPivot, { x: leftPivot.x + shift, y: cy + 30 }, KINEMATIC_COLORS.coupler, "", 4);
    drawNeonLink(ctx, rightPivot, { x: rightPivot.x + shift, y: cy + 30 }, KINEMATIC_COLORS.coupler, "", 4);

    // Wheels
    const drawWheel = (p, turnAngle) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(turnAngle);
      ctx.fillStyle = "#1e293b";
      ctx.strokeStyle = KINEMATIC_COLORS.output;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(-8, -28, 16, 56, 6);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    };

    drawWheel(leftPivot, steerAngle * 1.15);
    drawWheel(rightPivot, steerAngle * 0.9);

    drawPivotJoint(ctx, leftPivot, "Kingpin L", KINEMATIC_COLORS.ground, 6);
    drawPivotJoint(ctx, rightPivot, "Kingpin R", KINEMATIC_COLORS.ground, 6);
  };

  const renderPickAndPlaceCanvas = (ctx, W, H, th) => {
    const cycle = (th % 360) / 360;
    const travelPhase = cycle < 0.5 ? smoothStep(cycle / 0.5) : 1 - smoothStep((cycle - 0.5) / 0.5);
    const pickupPhase = smoothStep((cycle - 0.18) / 0.14) - smoothStep((cycle - 0.42) / 0.14);
    const placePhase = smoothStep((cycle - 0.68) / 0.14) - smoothStep((cycle - 0.92) / 0.14);

    const travel = 40 + travelPhase * 110;
    const cx = W * 0.25;
    const cy = H * 0.55;
    const sliderX = cx + travel;
    const gripperLift = Math.max(0, pickupPhase, placePhase) * 32;

    // Guide Rails
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + 200, cy);
    ctx.stroke();

    // Arm Link
    drawNeonLink(ctx, { x: cx, y: cy + 35 }, { x: sliderX, y: cy }, KINEMATIC_COLORS.coupler, "Arm", 5);

    // Carriage Slider
    ctx.fillStyle = "#1e293b";
    ctx.strokeStyle = KINEMATIC_COLORS.output;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(sliderX - 18, cy - 14, 36, 28, 4);
    ctx.fill();
    ctx.stroke();

    // Gripper stem & fingers
    const gripY = cy + 24 - gripperLift;
    drawNeonLink(ctx, { x: sliderX, y: cy }, { x: sliderX, y: gripY }, KINEMATIC_COLORS.output, "", 3.5);

    // Cargo block
    ctx.fillStyle = KINEMATIC_COLORS.accent;
    ctx.fillRect(sliderX - 9, gripY + 4, 18, 14);

    drawGroundHatch(ctx, { x: cx, y: cy + 35 });
    drawPivotJoint(ctx, { x: cx, y: cy + 35 }, "Pivot", KINEMATIC_COLORS.crank, 6);
    drawPivotJoint(ctx, { x: sliderX, y: cy }, "Slide", KINEMATIC_COLORS.output, 5);
  };

  // ─── MASTER CANVAS DRAW LOOP ───────────────────────────────────────────────
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.width / dpr;
    const H = canvas.height / dpr;

    ctx.clearRect(0, 0, W, H);
    drawEngineeringGrid(ctx, W, H, 24);

    const { angle: th, showTrace: traceOn } = stateRef.current;

    if (isPickAndPlace) renderPickAndPlaceCanvas(ctx, W, H, th);
    else if (isGear) renderGearsCanvas(ctx, W, H, th);
    else if (isCam) renderCamCanvas(ctx, W, H, th);
    else if (isSteering) renderSteeringCanvas(ctx, W, H, th);
    else if (isSliderCrank) renderSliderCrankCanvas(ctx, W, H, th, traceOn);
    else if (isQuickReturn) renderQuickReturnCanvas(ctx, W, H, th);
    else renderFourBarCanvas(ctx, W, H, th, traceOn);
  }, [isPickAndPlace, isGear, isCam, isSteering, isSliderCrank, isQuickReturn]);

  // ─── ANIMATION FRAME LOOP ──────────────────────────────────────────────────
  useEffect(() => {
    let lastStateSync = 0;
    const loop = (time) => {
      if (lastTimeRef.current === null) lastTimeRef.current = time;
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      const { isPlaying: playing, canMove: movable, speedMultiplier: mult } = stateRef.current;

      if (movable && playing) {
        const next = (stateRef.current.angle + mult * dt * 75) % 360;
        stateRef.current.angle = next;
        if (time - lastStateSync > 80) {
          lastStateSync = time;
          setAngle(Math.round(next));
        }
      }

      drawCanvas();
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [drawCanvas]);

  // ─── RESIZE CANVAS HANDLER ─────────────────────────────────────────────────
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const wrap = canvas.parentElement;
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(300, rect.width) * dpr;
      canvas.height = Math.max(240, rect.height || 260) * dpr;
      const ctx = canvas.getContext("2d");
      ctx.scale(dpr, dpr);
      drawCanvas();
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [drawCanvas]);

  const statusClass = `mechanism-preview mechanism-preview--${analysis.status}`;

  return (
    <div className={statusClass}>
      <div className="mechanism-preview__header">
        <span>Kinematic Simulation</span>
        <strong>{analysis.title}</strong>
      </div>

      <div className="preview-controls">
        <button
          type="button"
          className={`preview-control-btn ${isPlaying ? "preview-control-btn--pause" : "preview-control-btn--play"}`}
          onClick={() => setIsPlaying((current) => !current)}
        >
          {isPlaying ? "⏸ Pause" : "▶ Play"}
        </button>

        <label className="preview-speed">
          <span>Speed</span>
          <select
            value={speedMultiplier}
            onChange={(event) => setSpeedMultiplier(Number(event.target.value))}
          >
            <option value="0.5">0.5x</option>
            <option value="1">1.0x</option>
            <option value="1.5">1.5x</option>
            <option value="2">2.0x</option>
          </select>
        </label>

        {(isSliderCrank || !isGear) && (
          <button
            type="button"
            className="secondary-btn secondary-btn--small"
            style={{ padding: "4px 10px", fontSize: "0.72rem" }}
            onClick={() => {
              setShowTrace((t) => !t);
              if (!showTrace) traceRef.current = [];
            }}
          >
            {showTrace ? "Hide Trace" : "Show Trace"}
          </button>
        )}
      </div>

      <div className="preview-canvas-wrap" style={{ position: "relative", width: "100%", height: 260, background: "#090d16", borderRadius: 14, overflow: "hidden" }}>
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
      </div>

      {/* Manual Crank Angle Scrubber */}
      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ font: "700 0.72rem var(--font-mono)", color: "var(--muted)", textTransform: "uppercase" }}>
          θ₂: {angle}°
        </span>
        <input
          type="range"
          min="0"
          max="359"
          value={angle}
          onChange={(e) => {
            setIsPlaying(false);
            const val = parseInt(e.target.value, 10);
            setAngle(val);
            stateRef.current.angle = val;
            drawCanvas();
          }}
          style={{ flex: 1, accentColor: KINEMATIC_COLORS.crank, height: 4 }}
        />
        <button
          type="button"
          className="secondary-btn secondary-btn--small"
          style={{ padding: "2px 8px", fontSize: "0.7rem" }}
          onClick={() => {
            setAngle(0);
            stateRef.current.angle = 0;
            traceRef.current = [];
          }}
        >
          Reset 0°
        </button>
      </div>

      <span className={`motion-stage__state motion-stage__state--${analysis.status}`} style={{ marginTop: 10 }}>
        {canMove ? "✓ Constrained Motion Active (1 DOF)" : "Motion Locked by Geometric Constraints"}
      </span>
    </div>
  );
}

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  solveFourBar,
  classifyGrashof,
  solveSliderCrank,
  solveQuickReturn,
  drawNeonLink,
  drawPivotJoint,
  drawGroundHatch,
  drawEngineeringGrid,
  KINEMATIC_COLORS,
} from "./kinematicCanvasEngine.js";
import { camLift } from "./kinematics.js";
import { fetchApprovedMechanisms } from "./tomApi.js";

export default function FourBarVirtualLab({
  initialMechanism = null,
  initialLinks = null,
  onApply = null,
  standalone = false,
}) {
  // ─── CLOUD REPOSITORY MECHANISMS ──────────────────────────────────────────
  const [cloudMechanisms, setCloudMechanisms] = useState([]);
  const [userSelectedId, setUserSelectedId] = useState(null);

  useEffect(() => {
    let active = true;
    async function loadCloudRepo() {
      const { data } = await fetchApprovedMechanisms();
      if (active && data) {
        setCloudMechanisms(data);
      }
    }
    loadCloudRepo();
    return () => { active = false; };
  }, []);

  const selectedMechId = userSelectedId || (initialMechanism?.id ? String(initialMechanism.id) : (cloudMechanisms[0]?.id ? String(cloudMechanisms[0].id) : ""));

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

  // Topology classification
  const mechType = useMemo(() => {
    if (!activeMechanism) return "fourbar";
    const cat = (activeMechanism.category || "").toLowerCase();
    const nm = (activeMechanism.name || "").toLowerCase();

    if (
      cat.includes("slider") ||
      nm.includes("slider") ||
      cat.includes("reciprocat") ||
      nm.includes("piston") ||
      nm.includes("crank-slider")
    ) {
      return "slidercrank";
    }
    if (
      cat.includes("quick") ||
      nm.includes("quick") ||
      nm.includes("whitworth") ||
      nm.includes("shaper")
    ) {
      return "quickreturn";
    }
    if (cat.includes("cam") || nm.includes("cam")) {
      return "cam";
    }
    if (cat.includes("gear") || nm.includes("gear")) {
      return "gear";
    }
    if (cat.includes("steering") || nm.includes("steering") || nm.includes("ackermann")) {
      return "steering";
    }
    return "fourbar";
  }, [activeMechanism]);

  // ─── MECHANISM SPECIFIC PARAMETERS ─────────────────────────────────────────
  // 1. Four-Bar Linkage
  const [L1, setL1] = useState(Number(initialLinks?.L1 ?? initialLinks?.l1 ?? 4.0));
  const [L2, setL2] = useState(Number(initialLinks?.L2 ?? initialLinks?.l2 ?? 2.0));
  const [L3, setL3] = useState(Number(initialLinks?.L3 ?? initialLinks?.l3 ?? 4.5));
  const [L4, setL4] = useState(Number(initialLinks?.L4 ?? initialLinks?.l4 ?? 3.5));

  // 2. Slider-Crank
  const [sliderR, setSliderR] = useState(44);
  const [sliderL, setSliderL] = useState(138);
  const [sliderOffset, setSliderOffset] = useState(0);

  // 3. Quick-Return
  const [qrR, setQrR] = useState(36);
  const [qrH, setQrH] = useState(48);
  const [qrLever, setQrLever] = useState(138);

  // 4. Cam-Follower
  const [camBaseR, setCamBaseR] = useState(40);
  const [camMaxLift, setCamMaxLift] = useState(36);

  // 5. Gear Train
  const [gearT1, setGearT1] = useState(20);
  const [gearT2, setGearT2] = useState(40);

  // 6. Steering
  const [steerL, setSteerL] = useState(120);
  const [steerW, setSteerW] = useState(60);

  // Common animation state
  const [theta, setTheta] = useState(0);
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1.5);
  const [showTrace, setShowTrace] = useState(true);

  const canvasRef = useRef(null);
  const traceRef = useRef([]);
  const lastTimeRef = useRef(null);

  // Ref snapshot for 60fps canvas loop
  const stateRef = useRef({
    mechType,
    L1, L2, L3, L4,
    sliderR, sliderL, sliderOffset,
    qrR, qrH, qrLever,
    camBaseR, camMaxLift,
    gearT1, gearT2,
    steerL, steerW,
    theta, running, speed, showTrace,
  });

  useEffect(() => {
    stateRef.current = {
      mechType,
      L1, L2, L3, L4,
      sliderR, sliderL, sliderOffset,
      qrR, qrH, qrLever,
      camBaseR, camMaxLift,
      gearT1, gearT2,
      steerL, steerW,
      theta, running, speed, showTrace,
    };
  }, [
    mechType,
    L1, L2, L3, L4,
    sliderR, sliderL, sliderOffset,
    qrR, qrH, qrLever,
    camBaseR, camMaxLift,
    gearT1, gearT2,
    steerL, steerW,
    theta, running, speed, showTrace,
  ]);

  // Handle mechanism change
  const handleSelectMechanism = (id) => {
    setUserSelectedId(id);
    traceRef.current = [];
    setTheta(0);
    setRunning(true);
  };

  const handleReset = () => {
    setL1(4.0);
    setL2(2.0);
    setL3(4.5);
    setL4(3.5);
    setSliderR(44);
    setSliderL(138);
    setSliderOffset(0);
    setQrR(36);
    setQrH(48);
    setQrLever(138);
    setCamBaseR(40);
    setCamMaxLift(36);
    setGearT1(20);
    setGearT2(40);
    setSteerL(120);
    setSteerW(60);
    setTheta(0);
    traceRef.current = [];
  };

  const grashof = useMemo(() => classifyGrashof(L1, L2, L3, L4), [L1, L2, L3, L4]);

  // ─── CANVAS DRAWING FUNCTIONS ──────────────────────────────────────────────
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const s = stateRef.current;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    ctx.save();
    ctx.scale(dpr, dpr);
    try {
      ctx.clearRect(0, 0, width, height);
      drawEngineeringGrid(ctx, width, height, 26);

    // 1. FOUR-BAR LINKAGE CANVAS
    if (s.mechType === "fourbar") {
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
        ctx.fillText("⚠ Kinematic Limit Reached (No geometric closure at this angle)", width / 2, height / 2);
        return;
      }

      const { O2, O4, A, B, mu_deg } = sol;

      if (mu_deg !== undefined) {
        const isOptimal = mu_deg >= 40 && mu_deg <= 140;
        ctx.fillStyle = isOptimal ? "#38bdf8" : "#f87171";
        ctx.font = "bold 11px 'DM Mono', monospace";
        ctx.textAlign = "right";
        ctx.fillText("Transmission Angle μ: " + mu_deg.toFixed(1) + "° (" + (isOptimal ? "Optimal" : "Low Advantage") + ")", width - 18, 26);
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
      return;
    }

    // 2. SLIDER-CRANK CANVAS
    if (s.mechType === "slidercrank") {
      const maxSpan = (s.sliderR + s.sliderL) * 1.35;
      const scale = Math.min(width, height) / Math.max(maxSpan, 120);
      const cx = width * 0.28;
      const cy = height * 0.52;

      const sol = solveSliderCrank(s.sliderR * scale, s.sliderL * scale, s.theta, s.sliderOffset * scale);
      const pO = { x: cx + sol.O.x, y: cy - sol.O.y };
      const pA = { x: cx + sol.A.x, y: cy - sol.A.y };
      const pB = { x: cx + sol.B.x, y: cy - sol.B.y };

      if (s.showTrace) {
        const mid = { x: (pA.x + pB.x) / 2, y: (pA.y + pB.y) / 2 };
        traceRef.current.push(mid);
        if (traceRef.current.length > 260) traceRef.current.shift();

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

      // Guide rails
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx + 30, cy - 24);
      ctx.lineTo(cx + (s.sliderR + s.sliderL) * scale + 45, cy - 24);
      ctx.moveTo(cx + 30, cy + 24);
      ctx.lineTo(cx + (s.sliderR + s.sliderL) * scale + 45, cy + 24);
      ctx.stroke();

      // Stroke centerline
      ctx.beginPath();
      ctx.setLineDash([6, 5]);
      ctx.moveTo(cx - s.sliderR * scale - 20, cy);
      ctx.lineTo(cx + (s.sliderR + s.sliderL) * scale + 60, cy);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.stroke();
      ctx.setLineDash([]);

      // Crank orbit
      ctx.beginPath();
      ctx.arc(pO.x, pO.y, s.sliderR * scale, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(56, 189, 248, 0.2)";
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Links
      drawNeonLink(ctx, pO, pA, KINEMATIC_COLORS.crank, "Crank (" + s.sliderR + ")", 6);
      drawNeonLink(ctx, pA, pB, KINEMATIC_COLORS.coupler, "Connecting Rod (" + s.sliderL + ")", 6);

      // Piston Block
      const pw = 52, ph = 36;
      ctx.fillStyle = "#1e293b";
      ctx.strokeStyle = KINEMATIC_COLORS.output;
      ctx.lineWidth = 2.5;
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

      drawGroundHatch(ctx, pO);
      drawPivotJoint(ctx, pO, "Crankshaft", KINEMATIC_COLORS.crank, 8);
      drawPivotJoint(ctx, pA, "Crank Pin", KINEMATIC_COLORS.coupler, 7);
      drawPivotJoint(ctx, pB, "Wrist Pin", KINEMATIC_COLORS.output, 7);
      return;
    }

    // 3. QUICK-RETURN CANVAS
    if (s.mechType === "quickreturn") {
      const scale = Math.min(width, height) / 280;
      const cx = width * 0.4;
      const cy = height * 0.72;

      const sol = solveQuickReturn(s.qrR * scale, s.qrH * scale, s.qrLever * scale, s.theta);
      const toC = (p) => ({ x: cx + p.x, y: cy - p.y });

      const pO1 = toC(sol.O1);
      const pO2 = toC(sol.O2);
      const pCrank = toC(sol.crankPin);
      const pTip = toC(sol.leverTip);
      const pRam = toC(sol.ramPin);

      // Guide rails
      const ramGuideY = cy - 45;
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 30, ramGuideY - 16);
      ctx.lineTo(cx + 210, ramGuideY - 16);
      ctx.moveTo(cx - 30, ramGuideY + 16);
      ctx.lineTo(cx + 210, ramGuideY + 16);
      ctx.stroke();

      // Crank orbit
      ctx.beginPath();
      ctx.arc(pO1.x, pO1.y, s.qrR * scale, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(56, 189, 248, 0.2)";
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      drawNeonLink(ctx, pO2, pTip, KINEMATIC_COLORS.coupler, "Slotted Arm", 7);
      drawNeonLink(ctx, pO1, pCrank, KINEMATIC_COLORS.crank, "Crank", 5);
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

      // Shaper Ram
      ctx.fillStyle = "#1e293b";
      ctx.strokeStyle = KINEMATIC_COLORS.output;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(pRam.x - 24, pRam.y - 12, 48, 24, 4);
      ctx.fill();
      ctx.stroke();

      // Tool bit
      ctx.fillStyle = KINEMATIC_COLORS.accent;
      ctx.beginPath();
      ctx.moveTo(pRam.x + 24, pRam.y);
      ctx.lineTo(pRam.x + 36, pRam.y + 14);
      ctx.lineTo(pRam.x + 18, pRam.y + 14);
      ctx.closePath();
      ctx.fill();

      drawGroundHatch(ctx, pO1);
      drawGroundHatch(ctx, pO2);
      drawPivotJoint(ctx, pO1, "O₁", KINEMATIC_COLORS.crank, 7);
      drawPivotJoint(ctx, pO2, "O₂", KINEMATIC_COLORS.coupler, 7);
      drawPivotJoint(ctx, pCrank, "", "#ffffff", 4);
      drawPivotJoint(ctx, pTip, "", KINEMATIC_COLORS.output, 5);
      drawPivotJoint(ctx, pRam, "Ram", KINEMATIC_COLORS.output, 6);
      return;
    }

    // 4. CAM-FOLLOWER CANVAS
    if (s.mechType === "cam") {
      const cx = width * 0.5;
      const cy = height * 0.62;
      const angleRad = (s.theta * Math.PI) / 180;
      const lift = s.camBaseR * 0.5 + camLift(angleRad) * s.camMaxLift;
      const followerY = cy - lift;

      // Rotating Cam Profile
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angleRad);
      ctx.fillStyle = "#1e293b";
      ctx.strokeStyle = KINEMATIC_COLORS.crank;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, -s.camBaseR * 1.2);
      ctx.bezierCurveTo(s.camBaseR * 1.35, -s.camBaseR * 1.2, s.camBaseR * 1.35, -s.camBaseR * 0.2, s.camBaseR * 0.95, s.camBaseR * 0.85);
      ctx.bezierCurveTo(s.camBaseR * 0.5, s.camBaseR * 1.7, -s.camBaseR * 1.05, s.camBaseR * 1.2, -s.camBaseR * 1.2, s.camBaseR * 0.25);
      ctx.bezierCurveTo(-s.camBaseR * 1.35, -s.camBaseR * 0.7, -s.camBaseR * 0.7, -s.camBaseR * 1.2, 0, -s.camBaseR * 1.2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Follower Stem
      drawNeonLink(ctx, { x: cx, y: followerY }, { x: cx, y: cy - 120 }, KINEMATIC_COLORS.output, "Follower", 5);

      // Roller wheel
      ctx.beginPath();
      ctx.arc(cx, followerY, 12, 0, Math.PI * 2);
      ctx.fillStyle = "#334155";
      ctx.fill();
      ctx.strokeStyle = KINEMATIC_COLORS.output;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Bushing
      ctx.strokeStyle = "#64748b";
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - 16, cy - 105, 32, 28);

      drawPivotJoint(ctx, { x: cx, y: cy }, "Cam Shaft", KINEMATIC_COLORS.crank, 8);
      drawPivotJoint(ctx, { x: cx, y: followerY }, "Roller", KINEMATIC_COLORS.output, 6);
      return;
    }

    // 5. GEAR TRAIN CANVAS
    if (s.mechType === "gear") {
      const m = 2.4;
      const r1 = s.gearT1 * m * 0.8;
      const r2 = s.gearT2 * m * 0.8;
      const cx1 = width * 0.38;
      const cy1 = height * 0.5;
      const cx2 = cx1 + r1 + r2;
      const cy2 = cy1;

      const rot1 = (s.theta * Math.PI) / 180;
      const rot2 = -rot1 * (s.gearT1 / s.gearT2);

      const drawGear = (x, y, r, teeth, rot, color, label) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);

        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = "#1e293b";
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Teeth
        for (let i = 0; i < teeth; i++) {
          const a = (i * 2 * Math.PI) / teeth;
          const tx = (r + 7) * Math.cos(a);
          const ty = (r + 7) * Math.sin(a);
          ctx.beginPath();
          ctx.arc(tx, ty, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
        }

        ctx.restore();
        drawPivotJoint(ctx, { x, y }, label, color, 8);
      };

      drawGear(cx1, cy1, r1, s.gearT1, rot1, KINEMATIC_COLORS.crank, "Driver (" + s.gearT1 + "T)");
      drawGear(cx2, cy2, r2, s.gearT2, rot2, KINEMATIC_COLORS.output, "Driven (" + s.gearT2 + "T)");

      // Pitch contact point
      ctx.beginPath();
      ctx.arc(cx1 + r1, cy1, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#f43f5e";
      ctx.fill();
      return;
    }

    // 6. STEERING CANVAS
    if (s.mechType === "steering") {
      const cx = width * 0.5;
      const cy = height * 0.5;
      const steerRad = ((s.theta % 60) - 30) * (Math.PI / 180);

      // Front axle
      drawNeonLink(ctx, { x: cx - s.steerW * 1.5, y: cy }, { x: cx + s.steerW * 1.5, y: cy }, KINEMATIC_COLORS.ground, "Front Axle", 6);

      // Kingpins and wheels
      const drawWheel = (wx, wy, angle, label) => {
        ctx.save();
        ctx.translate(wx, wy);
        ctx.rotate(angle);
        ctx.fillStyle = "#1e293b";
        ctx.strokeStyle = KINEMATIC_COLORS.output;
        ctx.lineWidth = 2;
        ctx.roundRect(-10, -26, 20, 52, 4);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        drawPivotJoint(ctx, { x: wx, y: wy }, label, KINEMATIC_COLORS.crank, 6);
      };

      drawWheel(cx - s.steerW * 1.5, cy, steerRad * 1.15, "Inner");
      drawWheel(cx + s.steerW * 1.5, cy, steerRad * 0.85, "Outer");
      return;
    }
  } finally {
    ctx.restore();
  }
}, []);

  // ─── 60FPS ANIMATION LOOP ──────────────────────────────────────────────────
  useEffect(() => {
    let animId;
    let lastSync = 0;
    const animate = (time) => {
      if (lastTimeRef.current == null) lastTimeRef.current = time;
      const delta = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      const s = stateRef.current;
      if (s.running) {
        const next = (s.theta + delta * 60 * s.speed) % 360;
        stateRef.current.theta = next;
        // Throttle React state update to ~10Hz to prevent 60 component re-renders per second
        if (time - lastSync > 100) {
          lastSync = time;
          setTheta(Math.round(next));
        }
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
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      drawFrame();
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [drawFrame]);

  return (
    <div className={"vlab-shell" + (standalone ? " vlab-shell--standalone" : "")}>
      {/* ── TOP CLOUD REPOSITORY MECHANISM SELECTOR ── */}
      <div className="vlab-selector-bar">
        <span className="vlab-selector-label">
          📂 Select Mechanism:
        </span>
        <select
          className="vlab-select"
          value={selectedMechId}
          onChange={(e) => handleSelectMechanism(e.target.value)}
        >
          {cloudMechanisms.length === 0 ? (
            <option value="">Loading repository mechanisms…</option>
          ) : (
            <>
              <optgroup label="Built-In Kinematic Models">
                {cloudMechanisms
                  .filter((m) => String(m.id).startsWith("builtin"))
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Student Submissions (Cloud Repository)">
                {cloudMechanisms
                  .filter((m) => !String(m.id).startsWith("builtin"))
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} — By {m.student_name || "Student"}
                    </option>
                  ))}
              </optgroup>
            </>
          )}
        </select>

        <div className="vlab-pills">
          <button
            type="button"
            className={"vlab-pill" + (mechType === "fourbar" ? " vlab-pill--active" : "")}
            onClick={() => {
              const fb = cloudMechanisms.find((m) => m.name?.toLowerCase().includes("four-bar")) || cloudMechanisms[0];
              if (fb) handleSelectMechanism(fb.id);
            }}
          >
            ⚙️ Four-Bar
          </button>
          <button
            type="button"
            className={"vlab-pill" + (mechType === "slidercrank" ? " vlab-pill--active" : "")}
            onClick={() => {
              const sc = cloudMechanisms.find((m) => m.name?.toLowerCase().includes("slider")) || cloudMechanisms[1];
              if (sc) handleSelectMechanism(sc.id);
            }}
          >
            🔩 Slider-Crank
          </button>
          <button
            type="button"
            className={"vlab-pill" + (mechType === "quickreturn" ? " vlab-pill--active" : "")}
            onClick={() => {
              const qr = cloudMechanisms.find((m) => m.name?.toLowerCase().includes("quick")) || cloudMechanisms[2];
              if (qr) handleSelectMechanism(qr.id);
            }}
          >
            ↩️ Quick-Return
          </button>
          <button
            type="button"
            className={"vlab-pill" + (mechType === "cam" ? " vlab-pill--active" : "")}
            onClick={() => {
              const cm = cloudMechanisms.find((m) => m.name?.toLowerCase().includes("cam"));
              if (cm) handleSelectMechanism(cm.id);
            }}
          >
            🔵 Cam & Follower
          </button>
          <button
            type="button"
            className={"vlab-pill" + (mechType === "gear" ? " vlab-pill--active" : "")}
            onClick={() => {
              const gr = cloudMechanisms.find((m) => m.name?.toLowerCase().includes("gear"));
              if (gr) handleSelectMechanism(gr.id);
            }}
          >
            🛠️ Gear Train
          </button>
        </div>

        <span className="vlab-repo-badge">
          ☁️ {cloudMechanisms.length} Models in Repository
        </span>
      </div>

      {/* ── MAIN VLAB HEADER ── */}
      <div className="vlab-header">
        <div className="vlab-logo">⚙️</div>
        <div>
          <h3 className="vlab-title">
            {activeMechanism?.name || "Theory of Machines Virtual Lab"}
          </h3>
          <span className="vlab-subtitle">
            Adjust Link Lengths · Real-Time Motion Simulation · Path Tracing
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
          <span className="vlab-panel-label">Mechanism Dimensions</span>

          {/* 1. Four-Bar Sliders */}
          {mechType === "fourbar" && (
            <>
              <div className="vlab-slider-row">
                <div className="vlab-slider-top">
                  <span className="vlab-link-name" style={{ color: KINEMATIC_COLORS.ground }}>L1 — Ground Frame</span>
                  <strong className="vlab-val" style={{ color: KINEMATIC_COLORS.ground }}>{L1.toFixed(1)}</strong>
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
                  <span className="vlab-link-name" style={{ color: KINEMATIC_COLORS.crank }}>L2 — Driver Crank</span>
                  <strong className="vlab-val" style={{ color: KINEMATIC_COLORS.crank }}>{L2.toFixed(1)}</strong>
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
                  <span className="vlab-link-name" style={{ color: KINEMATIC_COLORS.coupler }}>L3 — Coupler Link</span>
                  <strong className="vlab-val" style={{ color: KINEMATIC_COLORS.coupler }}>{L3.toFixed(1)}</strong>
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
                  <span className="vlab-link-name" style={{ color: KINEMATIC_COLORS.output }}>L4 — Rocker / Follower</span>
                  <strong className="vlab-val" style={{ color: KINEMATIC_COLORS.output }}>{L4.toFixed(1)}</strong>
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
            </>
          )}

          {/* 2. Slider-Crank Sliders */}
          {mechType === "slidercrank" && (
            <>
              <div className="vlab-slider-row">
                <div className="vlab-slider-top">
                  <span className="vlab-link-name" style={{ color: KINEMATIC_COLORS.crank }}>R — Crank Radius</span>
                  <strong className="vlab-val" style={{ color: KINEMATIC_COLORS.crank }}>{sliderR} mm</strong>
                </div>
                <input
                  type="range"
                  min="20"
                  max="70"
                  step="1"
                  value={sliderR}
                  onChange={(e) => setSliderR(parseInt(e.target.value, 10))}
                  style={{ accentColor: KINEMATIC_COLORS.crank }}
                />
              </div>

              <div className="vlab-slider-row">
                <div className="vlab-slider-top">
                  <span className="vlab-link-name" style={{ color: KINEMATIC_COLORS.coupler }}>L — Connecting Rod</span>
                  <strong className="vlab-val" style={{ color: KINEMATIC_COLORS.coupler }}>{sliderL} mm</strong>
                </div>
                <input
                  type="range"
                  min="80"
                  max="200"
                  step="1"
                  value={sliderL}
                  onChange={(e) => setSliderL(parseInt(e.target.value, 10))}
                  style={{ accentColor: KINEMATIC_COLORS.coupler }}
                />
              </div>

              <div className="vlab-slider-row">
                <div className="vlab-slider-top">
                  <span className="vlab-link-name" style={{ color: "var(--muted)" }}>Offset — Axis Offset</span>
                  <strong className="vlab-val">{sliderOffset} mm</strong>
                </div>
                <input
                  type="range"
                  min="-25"
                  max="25"
                  step="1"
                  value={sliderOffset}
                  onChange={(e) => setSliderOffset(parseInt(e.target.value, 10))}
                />
              </div>
            </>
          )}

          {/* 3. Quick-Return Sliders */}
          {mechType === "quickreturn" && (
            <>
              <div className="vlab-slider-row">
                <div className="vlab-slider-top">
                  <span className="vlab-link-name" style={{ color: KINEMATIC_COLORS.crank }}>r — Driver Crank</span>
                  <strong className="vlab-val" style={{ color: KINEMATIC_COLORS.crank }}>{qrR} mm</strong>
                </div>
                <input
                  type="range"
                  min="20"
                  max="50"
                  step="1"
                  value={qrR}
                  onChange={(e) => setQrR(parseInt(e.target.value, 10))}
                  style={{ accentColor: KINEMATIC_COLORS.crank }}
                />
              </div>

              <div className="vlab-slider-row">
                <div className="vlab-slider-top">
                  <span className="vlab-link-name" style={{ color: KINEMATIC_COLORS.ground }}>h — Center Distance</span>
                  <strong className="vlab-val" style={{ color: KINEMATIC_COLORS.ground }}>{qrH} mm</strong>
                </div>
                <input
                  type="range"
                  min="35"
                  max="70"
                  step="1"
                  value={qrH}
                  onChange={(e) => setQrH(parseInt(e.target.value, 10))}
                  style={{ accentColor: KINEMATIC_COLORS.ground }}
                />
              </div>

              <div className="vlab-slider-row">
                <div className="vlab-slider-top">
                  <span className="vlab-link-name" style={{ color: KINEMATIC_COLORS.coupler }}>L — Slotted Arm Length</span>
                  <strong className="vlab-val" style={{ color: KINEMATIC_COLORS.coupler }}>{qrLever} mm</strong>
                </div>
                <input
                  type="range"
                  min="100"
                  max="180"
                  step="1"
                  value={qrLever}
                  onChange={(e) => setQrLever(parseInt(e.target.value, 10))}
                  style={{ accentColor: KINEMATIC_COLORS.coupler }}
                />
              </div>
            </>
          )}

          {/* 4. Cam Sliders */}
          {mechType === "cam" && (
            <>
              <div className="vlab-slider-row">
                <div className="vlab-slider-top">
                  <span className="vlab-link-name" style={{ color: KINEMATIC_COLORS.crank }}>R₀ — Base Circle Radius</span>
                  <strong className="vlab-val" style={{ color: KINEMATIC_COLORS.crank }}>{camBaseR} mm</strong>
                </div>
                <input
                  type="range"
                  min="25"
                  max="55"
                  step="1"
                  value={camBaseR}
                  onChange={(e) => setCamBaseR(parseInt(e.target.value, 10))}
                  style={{ accentColor: KINEMATIC_COLORS.crank }}
                />
              </div>

              <div className="vlab-slider-row">
                <div className="vlab-slider-top">
                  <span className="vlab-link-name" style={{ color: KINEMATIC_COLORS.output }}>H — Maximum Follower Lift</span>
                  <strong className="vlab-val" style={{ color: KINEMATIC_COLORS.output }}>{camMaxLift} mm</strong>
                </div>
                <input
                  type="range"
                  min="20"
                  max="50"
                  step="1"
                  value={camMaxLift}
                  onChange={(e) => setCamMaxLift(parseInt(e.target.value, 10))}
                  style={{ accentColor: KINEMATIC_COLORS.output }}
                />
              </div>
            </>
          )}

          {/* 5. Gear Train Sliders */}
          {mechType === "gear" && (
            <>
              <div className="vlab-slider-row">
                <div className="vlab-slider-top">
                  <span className="vlab-link-name" style={{ color: KINEMATIC_COLORS.crank }}>T₁ — Driver Gear Teeth</span>
                  <strong className="vlab-val" style={{ color: KINEMATIC_COLORS.crank }}>{gearT1} T</strong>
                </div>
                <input
                  type="range"
                  min="12"
                  max="40"
                  step="1"
                  value={gearT1}
                  onChange={(e) => setGearT1(parseInt(e.target.value, 10))}
                  style={{ accentColor: KINEMATIC_COLORS.crank }}
                />
              </div>

              <div className="vlab-slider-row">
                <div className="vlab-slider-top">
                  <span className="vlab-link-name" style={{ color: KINEMATIC_COLORS.output }}>T₂ — Driven Gear Teeth</span>
                  <strong className="vlab-val" style={{ color: KINEMATIC_COLORS.output }}>{gearT2} T</strong>
                </div>
                <input
                  type="range"
                  min="20"
                  max="60"
                  step="1"
                  value={gearT2}
                  onChange={(e) => setGearT2(parseInt(e.target.value, 10))}
                  style={{ accentColor: KINEMATIC_COLORS.output }}
                />
              </div>
            </>
          )}

          {/* 6. Steering Sliders */}
          {mechType === "steering" && (
            <>
              <div className="vlab-slider-row">
                <div className="vlab-slider-top">
                  <span className="vlab-link-name" style={{ color: KINEMATIC_COLORS.ground }}>L — Wheelbase Length</span>
                  <strong className="vlab-val" style={{ color: KINEMATIC_COLORS.ground }}>{steerL} mm</strong>
                </div>
                <input
                  type="range"
                  min="80"
                  max="160"
                  step="2"
                  value={steerL}
                  onChange={(e) => setSteerL(parseInt(e.target.value, 10))}
                />
              </div>

              <div className="vlab-slider-row">
                <div className="vlab-slider-top">
                  <span className="vlab-link-name" style={{ color: KINEMATIC_COLORS.crank }}>W — Track Width</span>
                  <strong className="vlab-val" style={{ color: KINEMATIC_COLORS.crank }}>{steerW} mm</strong>
                </div>
                <input
                  type="range"
                  min="40"
                  max="80"
                  step="2"
                  value={steerW}
                  onChange={(e) => setSteerW(parseInt(e.target.value, 10))}
                />
              </div>
            </>
          )}

          <div className="vlab-divider" />

          {/* Kinematic Playback Controls */}
          <span className="vlab-panel-label">Motion Playback</span>
          <div className="vlab-slider-row">
            <div className="vlab-slider-top">
              <span className="vlab-link-name">Speed</span>
              <strong className="vlab-val" style={{ color: "var(--gold)" }}>{speed.toFixed(1)}x</strong>
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
            type="range"
            min="0"
            max="359"
            step="1"
            value={Math.round(theta)}
            onChange={(e) => {
              setRunning(false);
              const val = parseInt(e.target.value, 10);
              setTheta(val);
              stateRef.current.theta = val;
              drawFrame();
            }}
            style={{ width: "100%", accentColor: KINEMATIC_COLORS.crank }}
          />
          <div className="vlab-angle-readout">
            <span>{Math.round(theta)}°</span>
          </div>
        </div>

        {/* ── CENTER CANVAS VIEW ── */}
        <div className="vlab-canvas-wrap">
          <canvas ref={canvasRef} className="vlab-canvas" />
        </div>

        {/* ── RIGHT ANALYSIS PANEL ── */}
        <div className="vlab-panel vlab-panel--right">
          <span className="vlab-panel-label">Mechanism Analysis</span>

          {/* 1. Four-Bar Grashof Results */}
          {mechType === "fourbar" && (
            <>
              <div className="vlab-result-card" style={{ borderColor: grashof.color, background: grashof.color + "15" }}>
                <span className="vlab-result-icon">{grashof.icon}</span>
                <h4 className="vlab-result-type" style={{ color: grashof.color }}>{grashof.type}</h4>
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
                <div className="vlab-crit-numbers" style={{ color: grashof.isGrashof ? "#4ade80" : "#f87171" }}>
                  {grashof.sumSL.toFixed(1)} {grashof.isGrashof ? "≤" : ">"} {grashof.sumPQ.toFixed(1)}
                </div>
                <div className="vlab-crit-sub">
                  S = {grashof.s.toFixed(1)} (Shortest), L = {grashof.l.toFixed(1)} (Longest)
                </div>
                <div className="vlab-crit-status" style={{ color: grashof.isGrashof ? "#4ade80" : "#f87171" }}>
                  {grashof.isGrashof ? "✓ Continuous Rotation Possible" : "✗ Only Rocking Motion (Oscillating)"}
                </div>
              </div>
            </>
          )}

          {/* 2. Slider-Crank Analysis */}
          {mechType === "slidercrank" && (
            <>
              <div className="vlab-result-card" style={{ borderColor: "#38bdf8", background: "rgba(56, 189, 248, 0.1)" }}>
                <span className="vlab-result-icon">🔩</span>
                <h4 className="vlab-result-type" style={{ color: "#38bdf8" }}>Reciprocating Piston Motion</h4>
                <p className="vlab-result-desc">
                  Converts full 360° crank rotation into linear reciprocating stroke along the cylinder axis.
                </p>
              </div>

              <div className="vlab-criterion-box">
                <div className="vlab-crit-formula">Piston Stroke Length: 2R</div>
                <div className="vlab-crit-numbers" style={{ color: "#38bdf8" }}>
                  {(sliderR * 2)} mm Stroke
                </div>
                <div className="vlab-crit-sub">
                  Rod-to-Crank Ratio (λ): {(sliderL / sliderR).toFixed(2)}
                </div>
                <div className="vlab-crit-status" style={{ color: "#4ade80" }}>
                  ✓ Controlled 1-Way Motion (F = 1)
                </div>
              </div>
            </>
          )}

          {/* 3. Quick-Return Analysis */}
          {mechType === "quickreturn" && (
            <>
              <div className="vlab-result-card" style={{ borderColor: "#34d399", background: "rgba(52, 211, 153, 0.1)" }}>
                <span className="vlab-result-icon">↩️</span>
                <h4 className="vlab-result-type" style={{ color: "#34d399" }}>Quick-Return Shaper Mechanism</h4>
                <p className="vlab-result-desc">
                  Slow, high-torque forward cutting stroke combined with a rapid idle return stroke to maximize productivity.
                </p>
              </div>

              <div className="vlab-criterion-box">
                <div className="vlab-crit-formula">Quick Return Ratio (QRR)</div>
                <div className="vlab-crit-numbers" style={{ color: "#34d399" }}>
                  ~1.65 : 1 (Cutting to Return)
                </div>
                <div className="vlab-crit-sub">
                  Cutting Time: ~62% · Return Time: ~38%
                </div>
                <div className="vlab-crit-status" style={{ color: "#4ade80" }}>
                  ✓ High Working Efficiency
                </div>
              </div>
            </>
          )}

          {/* 4. Cam Analysis */}
          {mechType === "cam" && (
            <>
              <div className="vlab-result-card" style={{ borderColor: "#f472b6", background: "rgba(244, 114, 182, 0.1)" }}>
                <span className="vlab-result-icon">🔵</span>
                <h4 className="vlab-result-type" style={{ color: "#f472b6" }}>Radial Cam & Roller Follower</h4>
                <p className="vlab-result-desc">
                  Direct contact higher pair translating rotary shaft profile into specified linear follower lift profile.
                </p>
              </div>

              <div className="vlab-criterion-box">
                <div className="vlab-crit-formula">Peak Follower Lift</div>
                <div className="vlab-crit-numbers" style={{ color: "#f472b6" }}>
                  {camMaxLift} mm
                </div>
                <div className="vlab-crit-sub">
                  Motion Law: Simple Harmonic Motion (SHM)
                </div>
                <div className="vlab-crit-status" style={{ color: "#4ade80" }}>
                  ✓ Smooth Roller Contact
                </div>
              </div>
            </>
          )}

          {/* 5. Gear Train Analysis */}
          {mechType === "gear" && (
            <>
              <div className="vlab-result-card" style={{ borderColor: "#818cf8", background: "rgba(129, 140, 248, 0.1)" }}>
                <span className="vlab-result-icon">🛠️</span>
                <h4 className="vlab-result-type" style={{ color: "#818cf8" }}>Spur Gear Pair</h4>
                <p className="vlab-result-desc">
                  Positive engagement transmitting rotary power without slip between parallel shafts.
                </p>
              </div>

              <div className="vlab-criterion-box">
                <div className="vlab-crit-formula">Velocity Ratio (i = T₂ / T₁)</div>
                <div className="vlab-crit-numbers" style={{ color: "#818cf8" }}>
                  {(gearT2 / gearT1).toFixed(2)} : 1
                </div>
                <div className="vlab-crit-sub">
                  Torque Multiplication: {(gearT2 / gearT1).toFixed(2)}x
                </div>
                <div className="vlab-crit-status" style={{ color: "#4ade80" }}>
                  ✓ Constant Angular Velocity Ratio
                </div>
              </div>
            </>
          )}

          {/* 6. Steering Analysis */}
          {mechType === "steering" && (
            <>
              <div className="vlab-result-card" style={{ borderColor: "#a3e635", background: "rgba(163, 230, 53, 0.1)" }}>
                <span className="vlab-result-icon">🚗</span>
                <h4 className="vlab-result-type" style={{ color: "#a3e635" }}>Ackermann Steering</h4>
                <p className="vlab-result-desc">
                  Allows inside front wheel to turn sharper than outside wheel to prevent tire scrub during cornering.
                </p>
              </div>

              <div className="vlab-criterion-box">
                <div className="vlab-crit-formula">Ackermann Condition</div>
                <div className="vlab-crit-numbers" style={{ color: "#a3e635" }}>
                  cot(δₒ) - cot(δᵢ) = W / L
                </div>
                <div className="vlab-crit-sub">
                  Track/Wheelbase Ratio: {(steerW / steerL).toFixed(2)}
                </div>
                <div className="vlab-crit-status" style={{ color: "#4ade80" }}>
                  ✓ Pure Rolling Motion (No Scrub)
                </div>
              </div>
            </>
          )}

          <div className="vlab-divider" />

          {/* Selected Mechanism Metadata Card */}
          <span className="vlab-panel-label">Selected Model Details</span>
          <div style={{
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "14px",
            padding: "12px 14px",
            fontSize: "0.82rem",
            color: "var(--muted)",
            display: "flex",
            flexDirection: "column",
            gap: "6px"
          }}>
            <strong style={{ color: "#f8fafc", fontSize: "0.92rem" }}>
              {activeMechanism?.name || "Mechanism Project"}
            </strong>
            <span style={{ color: "var(--gold, #fbbf24)", fontWeight: 600 }}>
              👤 By {activeMechanism?.student_name || "Department Project"}
            </span>
            {activeMechanism?.academic_year && (
              <span>🏫 {activeMechanism.academic_year} · {activeMechanism.college || "NMIET"}</span>
            )}
            <p style={{ margin: "4px 0 0 0", lineHeight: 1.4, color: "#cbd5e1" }}>
              {activeMechanism?.short_description || activeMechanism?.detailed_description || "Demonstrating motion transmission and kinematic geometry in the Theory of Machines lab."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

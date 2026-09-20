/**
 * Kinematic Canvas Engine
 * Mathematical solvers and canvas rendering primitives for smooth 60fps mechanism simulation.
 */

export const KINEMATIC_COLORS = {
  bg: "#0b0f19",
  panel: "#121826",
  grid: "#1e2638",
  border: "rgba(255, 255, 255, 0.1)",
  text: "#f8fafc",
  muted: "#94a3b8",
  ground: "#818cf8", // Link 1 (Ground / Frame)
  crank: "#38bdf8",  // Link 2 (Input Crank)
  coupler: "#4ade80",// Link 3 (Coupler / Connecting Rod)
  output: "#fbbf24", // Link 4 (Output / Follower / Rocker / Slider)
  accent: "#f43f5e", // Cutting tool / special
  trace: "rgba(56, 189, 248, 0.45)",
};

/**
 * Solve planar Four-Bar linkage using Freudenstein's loop closure equations.
 * L1: Ground, L2: Crank (Input), L3: Coupler, L4: Follower (Output)
 * theta2_deg: Input crank angle in degrees
 */
export function solveFourBar(rawL1, rawL2, rawL3, rawL4, theta2_deg = 0) {
  const L1 = Number.isFinite(Number(rawL1)) && Number(rawL1) > 0 ? Number(rawL1) : 4.0;
  const L2 = Number.isFinite(Number(rawL2)) && Number(rawL2) > 0 ? Number(rawL2) : 2.0;
  const L3 = Number.isFinite(Number(rawL3)) && Number(rawL3) > 0 ? Number(rawL3) : 4.5;
  const L4 = Number.isFinite(Number(rawL4)) && Number(rawL4) > 0 ? Number(rawL4) : 3.5;

  const theta2 = ((Number(theta2_deg) || 0) * Math.PI) / 180;
  const A = 2 * L4 * (L2 * Math.cos(theta2) - L1);
  const B = -2 * L2 * L4 * Math.sin(theta2);
  const C = L1 * L1 + L2 * L2 + L4 * L4 - L3 * L3 - 2 * L1 * L2 * Math.cos(theta2);

  const disc = A * A + B * B - C * C;
  if (disc < 0) return null;

  let t;
  if (Math.abs(A + C) > 1e-7) {
    t = (-B + Math.sqrt(disc)) / (A + C);
  } else {
    const denom = -B - Math.sqrt(disc);
    t = Math.abs(denom) > 1e-7 ? (C - A) / denom : 0;
  }
  if (!Number.isFinite(t)) return null;
  const theta4 = 2 * Math.atan(t);
  const O2 = { x: 0, y: 0 };
  const O4 = { x: L1, y: 0 };
  const A_joint = { x: O2.x + L2 * Math.cos(theta2), y: O2.y + L2 * Math.sin(theta2) };
  const B_joint = { x: O4.x + L4 * Math.cos(theta4), y: O4.y + L4 * Math.sin(theta4) };
  const theta3 = Math.atan2(B_joint.y - A_joint.y, B_joint.x - A_joint.x);

  // Transmission angle mu between coupler (link 3) and output rocker (link 4)
  let mu_rad = Math.abs(theta4 - theta3);
  if (mu_rad > Math.PI) mu_rad = 2 * Math.PI - mu_rad;
  const mu_deg = (mu_rad * 180) / Math.PI;

  return { O2, O4, A: A_joint, B: B_joint, theta3, theta4, mu_deg };
}

/**
 * Cross-browser rounded rectangle drawing with fallback for browsers lacking ctx.roundRect.
 */
export function safeRoundRect(ctx, x, y, w, h, r = 4) {
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
  } else {
    const radius = Math.min(r || 0, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}

/**
 * Classify Four-Bar linkage mobility using Grashof's theorem (S + L <= P + Q).
 */
export function classifyGrashof(rawL1, rawL2, rawL3, rawL4) {
  const L1 = Number.isFinite(Number(rawL1)) && Number(rawL1) > 0 ? Number(rawL1) : 4.0;
  const L2 = Number.isFinite(Number(rawL2)) && Number(rawL2) > 0 ? Number(rawL2) : 2.0;
  const L3 = Number.isFinite(Number(rawL3)) && Number(rawL3) > 0 ? Number(rawL3) : 4.5;
  const L4 = Number.isFinite(Number(rawL4)) && Number(rawL4) > 0 ? Number(rawL4) : 3.5;

  const sorted = [
    { len: L1, id: "L1 Ground" },
    { len: L2, id: "L2 Crank" },
    { len: L3, id: "L3 Coupler" },
    { len: L4, id: "L4 Follower" },
  ].sort((a, b) => a.len - b.len);

  const s = sorted[0].len;
  const l = sorted[3].len;
  const p = sorted[1].len;
  const q = sorted[2].len;

  const sumSL = s + l;
  const sumPQ = p + q;
  const isGrashof = sumSL <= sumPQ;
  const isSpecial = Math.abs(sumSL - sumPQ) < 0.001;

  if (!isGrashof) {
    return {
      isGrashof: false,
      condition: "Non-Grashof (Triple Rocker)",
      type: "Double-Rocker",
      description: "No link can make a complete 360° rotation. Both input and output links only oscillate.",
      color: "#f87171",
      icon: "🔴",
      s, l, p, q, sumSL, sumPQ,
    };
  }

  if (isSpecial) {
    return {
      isGrashof: true,
      condition: "Special Grashof (Change-Point)",
      type: "Change-Point Linkage",
      description: "Links can become collinear (singular toggle position); behavior depends on inertia.",
      color: "#facc15",
      icon: "🟡",
      s, l, p, q, sumSL, sumPQ,
    };
  }

  if (Math.abs(s - L1) < 0.001) {
    return {
      isGrashof: true,
      condition: "Grashof Class I",
      type: "Double-Crank (Drag Link)",
      description: "Ground link is shortest. Both input crank and output link make full 360° rotations.",
      color: "#4ade80",
      icon: "🟢",
      s, l, p, q, sumSL, sumPQ,
    };
  }
  if (Math.abs(s - L2) < 0.001) {
    return {
      isGrashof: true,
      condition: "Grashof Class I",
      type: "Crank-Rocker",
      description: "Input crank makes continuous 360° rotation while output follower oscillates back and forth.",
      color: "#4ade80",
      icon: "🟢",
      s, l, p, q, sumSL, sumPQ,
    };
  }
  if (Math.abs(s - L4) < 0.001) {
    return {
      isGrashof: true,
      condition: "Grashof Class I",
      type: "Rocker-Crank",
      description: "Output link makes continuous 360° rotation while input crank oscillates.",
      color: "#4ade80",
      icon: "🟢",
      s, l, p, q, sumSL, sumPQ,
    };
  }

  return {
    isGrashof: true,
    condition: "Grashof Class I",
    type: "Grashof Double-Rocker",
    description: "Coupler is shortest. Both grounded links oscillate while coupler makes full rotations.",
    color: "#4ade80",
    icon: "🟢",
    s, l, p, q, sumSL, sumPQ,
  };
}

/**
 * Solve Slider-Crank kinematic positions.
 * R: Crank radius, L: Connecting rod length, theta_deg: Crank angle
 */
export function solveSliderCrank(rawR, rawL, theta_deg = 0, rawOffset = 0) {
  const R = Number.isFinite(Number(rawR)) && Number(rawR) > 0 ? Number(rawR) : 44;
  const L = Number.isFinite(Number(rawL)) && Number(rawL) > 0 ? Number(rawL) : 138;
  const offset = Number.isFinite(Number(rawOffset)) ? Number(rawOffset) : 0;
  const theta = ((Number(theta_deg) || 0) * Math.PI) / 180;
  const O = { x: 0, y: 0 };
  const A = { x: R * Math.cos(theta), y: R * Math.sin(theta) };
  const dy = A.y - offset;
  const underRad = Math.max(0, L * L - dy * dy);
  const xSlider = A.x + Math.sqrt(underRad);
  const B = { x: xSlider, y: offset };
  return { O, A, B, theta };
}

/**
 * Solve Quick-Return (Whitworth / Crank-Shaper) kinematics.
 * r: driver crank radius, h: distance between O1 and O2, leverLen: slotted arm length
 */
export function solveQuickReturn(rawR, rawH, rawLever, theta_deg = 0, ramLinkLen = 70, ramY = 45) {
  const r = Number.isFinite(Number(rawR)) && Number(rawR) > 0 ? Number(rawR) : 36;
  const h = Number.isFinite(Number(rawH)) && Number(rawH) > 0 ? Number(rawH) : 48;
  const leverLen = Number.isFinite(Number(rawLever)) && Number(rawLever) > 0 ? Number(rawLever) : 138;
  const theta = ((Number(theta_deg) || 0) * Math.PI) / 180;
  const O1 = { x: 0, y: h }; // Driver crank axis
  const O2 = { x: 0, y: 0 }; // Slotted lever axis
  const crankPin = {
    x: O1.x + r * Math.cos(theta),
    y: O1.y + r * Math.sin(theta),
  };

  const leverAngle = Math.atan2(crankPin.y - O2.y, crankPin.x - O2.x);
  const leverTip = {
    x: O2.x + leverLen * Math.cos(leverAngle),
    y: O2.y + leverLen * Math.sin(leverAngle),
  };

  const dy = leverTip.y - ramY;
  const dx = Math.sqrt(Math.max(1, ramLinkLen * ramLinkLen - dy * dy));
  const ramPin = { x: leverTip.x + dx, y: ramY };

  return { O1, O2, crankPin, leverTip, ramPin, leverAngle };
}

// ─── CANVAS DRAWING PRIMITIVES ───────────────────────────────────────────────

/** Draw a neon link with rounded caps and soft outer glow */
export function drawNeonLink(ctx, p1, p2, color, label, width = 6) {
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.stroke();
  ctx.shadowBlur = 0;

  if (label) {
    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2;
    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.font = "bold 11px 'DM Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(label, 0, -9);
    ctx.restore();
  }
}

/** Draw a mechanical pivot pin with outer rim and text label */
export function drawPivotJoint(ctx, p, label, color = "#ffffff", r = 7) {
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = "#0b0f19";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  if (label) {
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "bold 11px 'DM Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillText(label, p.x + r + 4, p.y - r - 2);
  }
}

/** Draw a mechanical ground bearing with hatched baseline */
export function drawGroundHatch(ctx, p) {
  ctx.beginPath();
  ctx.moveTo(p.x - 14, p.y + 12);
  ctx.lineTo(p.x + 14, p.y + 12);
  ctx.lineTo(p.x, p.y);
  ctx.closePath();
  ctx.fillStyle = "#1e293b";
  ctx.fill();
  ctx.strokeStyle = "#64748b";
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // 45° mechanical hatching lines
  for (let i = -12; i <= 12; i += 6) {
    ctx.beginPath();
    ctx.moveTo(p.x + i - 4, p.y + 13);
    ctx.lineTo(p.x + i + 4, p.y + 20);
    ctx.strokeStyle = "#64748b";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

/** Draw background engineering grid */
export function drawEngineeringGrid(ctx, width, height, step = 28) {
  ctx.strokeStyle = KINEMATIC_COLORS.grid;
  ctx.lineWidth = 0.8;
  for (let x = 0; x < width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

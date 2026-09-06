// ─── GRUBLER'S EQUATION (planar mechanisms) ────────────────────────────────────
// DOF = 3(L - 1) - 2J - H
export function calculateDof({ links, joints, higherPairs }) {
  const L = Number(links) || 0;
  const J = Number(joints) || 0;
  const H = Number(higherPairs) || 0;
  const result = 3 * (L - 1) - 2 * J - H;
  return {
    result,
    formula: `3(${L} - 1) - 2(${J}) - ${H}`,
    links: L, joints: J, higherPairs: H,
  };
}

/**
 * Classifies a DOF result into a plain-English verdict a student can act on.
 * Kept separate from calculateDof so the UI can show the raw number and the
 * interpretation independently.
 */
export function analyzeMechanism(inputs) {
  const calc = calculateDof(inputs);
  const { links, joints, higherPairs, result } = calc;

  if (links < 2 || joints < 0 || higherPairs < 0) {
    return {
      ...calc, status: "invalid", title: "Invalid input data",
      explanation: "Links and pair counts must be non-negative, and at least two links are needed for a planar mechanism.",
      recommendation: "Correct the input values before relying on this result.",
    };
  }
  if (result < 0) {
    return {
      ...calc, status: "overconstrained", title: "Over-constrained mechanism",
      explanation: "There are more constraints than independent motions. The mechanism may lock, bind, or require flexible parts to move.",
      recommendation: "Check for redundant joints, assembly interference, or an incorrect joint count.",
    };
  }
  if (result === 0) {
    return {
      ...calc, status: "locked", title: "Locked structure",
      explanation: "All available motion is removed by the constraints, so the mechanism behaves like a structure.",
      recommendation: "It will not move unless a joint or link constraint is changed.",
    };
  }
  if (result > 1) {
    return {
      ...calc, status: "underconstrained", title: "Under-constrained mechanism",
      explanation: `The mechanism has ${result} independent motions, so one input cannot fully control its movement.`,
      recommendation: "Add a constraint or account for additional inputs before operating it.",
    };
  }
  return {
    ...calc, status: "constrained", title: "Constrained mechanism",
    explanation: "The mechanism has one independent movement and can be driven by one input.",
    recommendation: "It should work as a controlled mechanism when the joints are assembled correctly.",
  };
}

/** Suggests a one-line motion caption. Purely a convenience default — the
 * form always leaves this editable rather than overwriting silently. */
export function suggestAnimationDescription({ name, category, mechanism_type }) {
  const n = (name || "This mechanism").trim() || "This mechanism";
  const cat = (category || "mechanism").toLowerCase();

  if (mechanism_type === "pick-and-place") {
    return `${n} shows a guided pickup-and-placement cycle: the input drives the transfer link, the gripper moves to the object, and the object is carried to the release position.`;
  }
  if (cat.includes("gear")) {
    return `${n} animates meshing gears transferring rotation and torque; tooth ratio controls the output speed and direction.`;
  }
  if (cat.includes("cam")) {
    return `${n} animates the cam rotation and the resulting follower rise, dwell, and return motion per the cam profile.`;
  }
  if (cat.includes("steering")) {
    return `${n} animates the steering input through the linkage and the coordinated turning of the connected wheels.`;
  }
  if (cat.includes("four-bar") || cat.includes("slider")) {
    return `${n} animates the crank rotation driving the coupler and output link through one full cycle.`;
  }
  return `${n} animates its ${cat} motion as the input link drives the connected members through a controlled movement path.`;
}

// ─── GEOMETRY HELPERS (used by MechanismPreview's SVG renderers) ──────────────
export function getCircleIntersection(first, second, firstRadius, secondRadius) {
  const dx = second.x - first.x;
  const dy = second.y - first.y;
  const distance = Math.hypot(dx, dy) || 1;
  const projection = (firstRadius ** 2 - secondRadius ** 2 + distance ** 2) / (2 * distance);
  const height = Math.sqrt(Math.max(0, firstRadius ** 2 - projection ** 2));
  const baseX = first.x + (projection * dx) / distance;
  const baseY = first.y + (projection * dy) / distance;
  return {
    x: baseX - (height * dy) / distance,
    y: baseY + (height * dx) / distance,
  };
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function smoothStep(value) {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

export function camLift(phase) {
  const cycle = (phase % (Math.PI * 2)) / (Math.PI * 2);
  if (cycle < 0.2) return smoothStep(cycle / 0.2);
  if (cycle < 0.5) return 1;
  if (cycle < 0.75) return 1 - smoothStep((cycle - 0.5) / 0.25);
  return 0;
}

/**
 * Which built-in SVG renderer (if any) applies to a mechanism.
 * Returns null when nothing matches — callers must show a neutral "no live
 * preview yet" state rather than silently rendering an unrelated animation.
 */
export function previewKindFor({ category, mechanism_type }) {
  if (mechanism_type === "pick-and-place") return "pick-and-place";
  const cat = (category || "").toLowerCase();
  if (cat.includes("gear")) return "gear";
  if (cat.includes("cam")) return "cam";
  if (cat.includes("steering")) return "steering";
  if (cat.includes("four-bar")) return "four-bar";
  return null;
}

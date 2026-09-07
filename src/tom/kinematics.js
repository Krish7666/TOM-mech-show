/**
 * Kinematics calculations and geometry helpers for Theory of Machines mechanisms.
 * Supports both local mechanism state and Supabase tom_mechanisms schema.
 */

export function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function smoothStep(value) {
  const limited = clamp(value, 0, 1);
  return limited * limited * (3 - 2 * limited);
}

export function camLift(phase) {
  const cycle = (phase % (Math.PI * 2)) / (Math.PI * 2);
  if (cycle < 0.2) return smoothStep(cycle / 0.2);
  if (cycle < 0.5) return 1;
  if (cycle < 0.75) return 1 - smoothStep((cycle - 0.5) / 0.25);
  return 0;
}

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

/**
 * Grübler / Kutzbach mobility equation for planar mechanisms:
 * DOF = 3(L - 1) - 2J - H
 */
export function calculateDof(mechanism) {
  const links = Number(
    mechanism?.dofInputs?.links ??
    mechanism?.links ??
    mechanism?.num_links ??
    4
  );
  const joints = Number(
    mechanism?.dofInputs?.joints ??
    mechanism?.joints ??
    mechanism?.num_joints ??
    4
  );
  const higherPairs = Number(
    mechanism?.dofInputs?.higherPairs ??
    mechanism?.higherPairs ??
    mechanism?.higher_pairs ??
    0
  );

  const result = 3 * (links - 1) - 2 * joints - higherPairs;

  return {
    result,
    formula: `3(${links} - 1) - 2(${joints}) - ${higherPairs}`,
    details: `${links} links, ${joints} joints, ${higherPairs} higher pairs`,
    links,
    joints,
    higherPairs,
  };
}

export function analyzeMechanism(mechanism) {
  const calculation = calculateDof(mechanism);
  const { links, joints, higherPairs } = calculation;
  let status = "constrained";
  let title = "Constrained mechanism";
  let explanation = "The mechanism has one independent movement and can be driven by one input.";
  let recommendation = "It should work as a controlled mechanism when the joints are assembled correctly.";

  if (links < 2 || joints < 0 || higherPairs < 0) {
    status = "invalid";
    title = "Invalid input data";
    explanation = "Links and pair counts must be non-negative, and at least two links are needed for a planar mechanism.";
    recommendation = "Correct the input values before relying on this result.";
  } else if (calculation.result < 0) {
    status = "overconstrained";
    title = "Over-constrained mechanism";
    explanation = "There are more constraints than independent motions. The mechanism may lock, bind, or require flexible parts to move.";
    recommendation = "Check for redundant joints, assembly interference, or an incorrect joint count.";
  } else if (calculation.result === 0) {
    status = "locked";
    title = "Locked structure";
    explanation = "All available motion is removed by the constraints, so the mechanism behaves like a structure.";
    recommendation = "It will not move unless a joint or link constraint is changed.";
  } else if (calculation.result > 1) {
    status = "underconstrained";
    title = "Under-constrained mechanism";
    explanation = `The mechanism has ${calculation.result} independent motions, so one input cannot fully control its movement.`;
    recommendation = "Add a constraint or account for additional inputs before operating it.";
  }

  return {
    ...calculation,
    status,
    title,
    explanation,
    recommendation,
  };
}

export function generateAnimationDescription(details) {
  const name = details?.name ? details.name.trim() : "This mechanism";
  const category = (details?.category || "mechanism").toLowerCase();
  const instructions = typeof details?.instructions === "string"
    ? details.instructions
    : Array.isArray(details?.instructions)
    ? details.instructions.join("\n")
    : "";
  const firstInstruction = instructions.split("\n").map((item) => item.trim()).find(Boolean);

  if (name.toLowerCase().includes("pick") || name.toLowerCase().includes("place")) {
    return `${name} shows a guided pickup and placement cycle: the input drives the transfer link, the gripper moves to the object, and the object is carried to the release position.`;
  }

  if (category.includes("gear")) {
    return `${name} animates meshing gears transferring rotation and torque. The gear sizes and tooth relationship control the output speed and direction.`;
  }

  if (category.includes("cam")) {
    return `${name} animates the cam rotation and the resulting follower rise, dwell, and return motion according to the cam profile.`;
  }

  if (category.includes("steering")) {
    return `${name} animates the steering input through the linkage and shows the coordinated turning of the connected wheels.`;
  }

  return `${name} animates its ${category} motion as the input link drives the connected members through a controlled movement path${firstInstruction ? `; ${firstInstruction.toLowerCase()}` : "."}`;
}

// ─── NORMALIZATION ───────────────────────────────────────────────────────────

/**
 * Normalises a raw mechanism object from any source (Supabase, localStorage,
 * or built-in) into the canonical shape the UI expects.
 */
export function normalizeMechanism(mechanism) {
  const links = Number(mechanism.num_links ?? mechanism.dofInputs?.links ?? 4);
  const joints = Number(mechanism.num_joints ?? mechanism.dofInputs?.joints ?? 4);
  const higherPairs = Number(mechanism.higher_pairs ?? mechanism.dofInputs?.higherPairs ?? 0);
  return {
    ...mechanism,
    num_links: links,
    num_joints: joints,
    higher_pairs: higherPairs,
    dofInputs: { links, joints, higherPairs },
    originalDofInputs: { links, joints, higherPairs },
    short_description: mechanism.short_description || mechanism.detailed_description || "",
    information: mechanism.detailed_description || mechanism.information || "",
    instructions: Array.isArray(mechanism.instructions)
      ? mechanism.instructions
      : mechanism.working_principle
      ? [mechanism.working_principle]
      : ["Rotate the input link slowly to observe kinematic motion."],
    video: mechanism.video || mechanism.external_links?.[0] || "",
    html_animation_url: mechanism.html_animation_url || mechanism.animation_url || "",
    animation_url: mechanism.html_animation_url || mechanism.animation_url || "",
    virtual_mechanism_url: mechanism.virtual_mechanism_url || "",
    image: mechanism.cover_image || mechanism.preview_image_url || mechanism.image || "",
  };
}

/**
 * Normalises a list of student-submitted mechanisms.
 * Filters out any legacy preloaded/builtin mechanisms and deduplicates by ID.
 */
export function normalizeMechanisms(items) {
  const filtered = (items || []).filter((m) => !String(m?.id || "").startsWith("builtin-"));
  const normalized = filtered.map(normalizeMechanism);
  const seenIds = new Set();
  const deduped = [];
  for (const item of normalized) {
    const key = String(item.id);
    if (!seenIds.has(key)) {
      seenIds.add(key);
      deduped.push(item);
    }
  }
  return deduped;
}

/**
 * Maps a normalised mechanism back into the shape used by the admin edit form.
 */
export function mechanismToForm(mechanism) {
  return {
    name: mechanism.name || "",
    category: mechanism.category || "Four-bar",
    student_name: mechanism.student_name || "",
    team_members: mechanism.team_members || mechanism.student_name || "",
    college: mechanism.college || "NMIET",
    department: mechanism.department || "Mechanical Engineering",
    short_description: mechanism.short_description || mechanism.detailed_description || "",
    information: mechanism.detailed_description || mechanism.information || "",
    dofFormula: mechanism.dofFormula || "DOF = 3(L - 1) - 2J - H",
    links: String(mechanism.num_links ?? mechanism.dofInputs?.links ?? 4),
    joints: String(mechanism.num_joints ?? mechanism.dofInputs?.joints ?? 4),
    higherPairs: String(mechanism.higher_pairs ?? mechanism.dofInputs?.higherPairs ?? 0),
    instructions: Array.isArray(mechanism.instructions)
      ? mechanism.instructions.join("\n")
      : mechanism.working_principle || "",
    video: mechanism.video || mechanism.external_links?.[0] || "",
    html_animation_url: mechanism.html_animation_url || mechanism.animation_url || "",
    animation_url: mechanism.html_animation_url || mechanism.animation_url || "",
    virtual_mechanism_url: mechanism.virtual_mechanism_url || "",
    image: mechanism.cover_image || mechanism.image || "",
  };
}

/** Blank form used when opening the admin add-mechanism panel. */
export const EMPTY_ADMIN_FORM = {
  name: "",
  category: "Four-bar",
  student_name: "",
  team_members: "",
  college: "NMIET",
  department: "Mechanical Engineering",
  short_description: "",
  information: "",
  dofFormula: "DOF = 3(L - 1) - 2J - H",
  links: "4",
  joints: "4",
  higherPairs: "0",
  instructions: "",
  video: "",
  html_animation_url: "",
  animation_url: "",
  virtual_mechanism_url: "",
  image: "",
};

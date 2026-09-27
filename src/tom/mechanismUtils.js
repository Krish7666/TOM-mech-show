// ─── NORMALIZATION ───────────────────────────────────────────────────────────

/**
 * Normalises a raw mechanism object from any source (Supabase, localStorage,
 * or built-in) into the canonical shape the UI expects.
 */
export function normalizeMechanism(mechanism) {
  if (!mechanism) return null;
  const links = Number(mechanism.num_links ?? mechanism.dofInputs?.links ?? 4);
  const joints = Number(mechanism.num_joints ?? mechanism.dofInputs?.joints ?? 4);
  const higherPairs = Number(mechanism.higher_pairs ?? mechanism.dofInputs?.higherPairs ?? 0);

  // Check additional_technical_details for stored JSON metadata
  let techMeta = {};
  if (typeof mechanism.additional_technical_details === "string" && mechanism.additional_technical_details.trim().startsWith("{")) {
    try {
      techMeta = JSON.parse(mechanism.additional_technical_details);
    } catch {
      // not JSON
    }
  }

  // Extract HTML animation, video, and virtual mechanism URLs
  let htmlAnim = mechanism.html_animation_url || mechanism.animation_url || techMeta.html_animation_url || techMeta.animation_url || "";
  let videoLink = mechanism.video || mechanism.video_url || techMeta.video_url || techMeta.video || "";
  let vmUrl = mechanism.virtual_mechanism_url || techMeta.virtual_mechanism_url || "";

  if (Array.isArray(mechanism.external_links)) {
    for (const link of mechanism.external_links) {
      if (typeof link !== "string") continue;
      const l = link.trim();
      if (!htmlAnim && (l.startsWith("data:text/html") || l.startsWith("blob:") || /\.(html|htm)($|\?)/i.test(l) || l.includes("/animations/"))) {
        htmlAnim = l;
      } else if (!videoLink && (l.includes("youtube.com") || l.includes("youtu.be") || l.includes("vimeo.com") || l.includes("loom.com") || /\.(mp4|webm|mov)$/i.test(l))) {
        videoLink = l;
      } else if (!vmUrl && (l.includes("simulator") || l.includes("vlab") || l.includes("geogebra"))) {
        vmUrl = l;
      }
    }
    // Fallback: If still no htmlAnim, check if any external link exists that wasn't identified as video or vm
    if (!htmlAnim && mechanism.external_links.length > 0) {
      const candidate = mechanism.external_links.find((l) => typeof l === "string" && l !== videoLink && l !== vmUrl);
      if (candidate) htmlAnim = candidate;
    }
  }

  return {
    ...mechanism,
    num_links: links,
    num_joints: joints,
    higher_pairs: higherPairs,
    dofInputs: { links, joints, higherPairs },
    originalDofInputs: { links, joints, higherPairs },
    short_description: mechanism.short_description || mechanism.detailed_description || "",
    information: mechanism.detailed_description || mechanism.information || "",
    detailed_description: mechanism.detailed_description || mechanism.information || mechanism.short_description || "",
    working_principle: mechanism.working_principle || mechanism.detailed_description || mechanism.short_description || "",
    applications: mechanism.applications || techMeta.applications || "",
    input_link: mechanism.input_link || "Link 1 (Driver)",
    output_link: mechanism.output_link || "Output / Rocker",
    motion_type: mechanism.motion_type || techMeta.motion_type || "Oscillating / Rocker",
    instructions: Array.isArray(mechanism.instructions)
      ? mechanism.instructions
      : mechanism.working_principle
      ? [mechanism.working_principle]
      : ["Rotate the input link slowly to observe kinematic motion."],
    video: videoLink,
    video_url: videoLink,
    html_animation_url: htmlAnim,
    animation_url: htmlAnim,
    virtual_mechanism_url: vmUrl,
    image: mechanism.cover_image || mechanism.preview_image_url || mechanism.image || "",
    cover_image: mechanism.cover_image || mechanism.preview_image_url || mechanism.image || "",
    background_image: mechanism.background_image || mechanism.bg_image_url || "",
  };
}

/**
 * Normalises a list of student-submitted mechanisms.
 * Filters out any legacy preloaded/builtin mechanisms and deduplicates by ID.
 */
export function normalizeMechanisms(items) {
  const filtered = (items || []).filter((m) => !String(m?.id || "").startsWith("builtin-"));
  const normalized = filtered.map(normalizeMechanism).filter(Boolean);
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
  if (!mechanism) return { ...EMPTY_ADMIN_FORM };
  const norm = normalizeMechanism(mechanism) || mechanism;
  return {
    id: norm.id,
    name: norm.name || "",
    category: norm.category || "Four-bar",
    student_name: norm.student_name || "",
    team_members: norm.team_members || norm.student_name || "",
    college: norm.college || "NMIET",
    department: norm.department || "Mechanical Engineering",
    academic_year: norm.academic_year || "TE Mech",
    short_description: norm.short_description || norm.detailed_description || "",
    detailed_description: norm.detailed_description || norm.information || "",
    description: norm.detailed_description || norm.short_description || "",
    working_principle: norm.working_principle || norm.detailed_description || "",
    applications: norm.applications || "",
    dofFormula: norm.dofFormula || "DOF = 3(L - 1) - 2J - H",
    num_links: String(norm.num_links ?? 4),
    num_joints: String(norm.num_joints ?? 4),
    higher_pairs: String(norm.higher_pairs ?? 0),
    links: String(norm.num_links ?? 4),
    joints: String(norm.num_joints ?? 4),
    higherPairs: String(norm.higher_pairs ?? 0),
    degrees_of_freedom: norm.degrees_of_freedom ?? 1,
    input_link: norm.input_link || "Link 1 (Driver)",
    output_link: norm.output_link || "Output / Rocker",
    motion_type: norm.motion_type || "Oscillating / Rocker",
    additional_technical_details: typeof norm.additional_technical_details === "string" ? norm.additional_technical_details : "",
    instructions: Array.isArray(norm.instructions)
      ? norm.instructions.join("\n")
      : norm.working_principle || "",
    video: norm.video || norm.video_url || "",
    video_url: norm.video || norm.video_url || "",
    html_animation_url: norm.html_animation_url || norm.animation_url || "",
    animation_url: norm.html_animation_url || norm.animation_url || "",
    virtual_mechanism_url: norm.virtual_mechanism_url || "",
    cover_image: norm.cover_image || norm.image || "",
    image: norm.cover_image || norm.image || "",
    background_image: norm.background_image || norm.bg_image_url || "",
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
  academic_year: "TE Mech",
  short_description: "",
  detailed_description: "",
  description: "",
  working_principle: "",
  applications: "",
  dofFormula: "DOF = 3(L - 1) - 2J - H",
  num_links: "4",
  num_joints: "4",
  higher_pairs: "0",
  links: "4",
  joints: "4",
  higherPairs: "0",
  degrees_of_freedom: 1,
  input_link: "Link 1 (Driver)",
  output_link: "Output / Rocker",
  motion_type: "Oscillating / Rocker",
  additional_technical_details: "",
  instructions: "",
  video: "",
  video_url: "",
  html_animation_url: "",
  animation_url: "",
  virtual_mechanism_url: "",
  cover_image: "",
  image: "",
  background_image: "",
};

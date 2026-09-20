// ─── TOM MECHANISM CATEGORIES ──────────────────────────────────────────────────
// Kept as an explicit list (rather than derived only from data) so the filter
// row stays stable even before any mechanisms of a category exist yet.
// Add new entries here to expand the taxonomy — the filter row and the form's
// category dropdown both read from this list.
export const TOM_CATEGORIES = [
  "Four-bar",
  "Slider-crank",
  "Quick-return",
  "Gear mechanisms",
  "Cam mechanisms",
  "Couplings",
  "Steering mechanisms",
  "Other",
];

export const TOM_CATEGORY_META = {
  "Four-bar":            { icon: "⚙️", color: "#38bdf8", bg: "rgba(56, 189, 248, 0.12)" },
  "Slider-crank":        { icon: "🔩", color: "#34d399", bg: "rgba(52, 211, 153, 0.12)" },
  "Quick-return":        { icon: "↩️", color: "#fbbf24", bg: "rgba(251, 191, 36, 0.12)" },
  "Gear mechanisms":     { icon: "🛠️", color: "#818cf8", bg: "rgba(129, 140, 248, 0.12)" },
  "Cam mechanisms":      { icon: "🔵", color: "#f472b6", bg: "rgba(244, 114, 182, 0.12)" },
  "Couplings":           { icon: "🔗", color: "#fb923c", bg: "rgba(251, 146, 60, 0.12)" },
  "Steering mechanisms": { icon: "🚗", color: "#a3e635", bg: "rgba(163, 230, 53, 0.12)" },
  "Other":               { icon: "🔬", color: "#c084fc", bg: "rgba(192, 132, 252, 0.12)" },
};

export function tomCategoryMeta(category) {
  return TOM_CATEGORY_META[category] || TOM_CATEGORY_META["Other"];
}

// ─── MEDIA TYPES ───────────────────────────────────────────────────────────────
// file_type values stored in tom_mechanism_media.file_type
export const MEDIA_TYPES = {
  image:         { label: "Images",       icon: "🖼️", tab: "Images" },
  video:         { label: "Working Video", icon: "🎬", tab: "Videos" },
  animation:     { label: "Animation",    icon: "🌀", tab: "Animation" },
  cad:           { label: "Technical File", icon: "📎", tab: "Documents" },
  document:      { label: "Document/PDF", icon: "📄", tab: "Documents" },
  drawing:       { label: "Engineering Drawing", icon: "📐", tab: "Images" },
  other:         { label: "Other File",   icon: "📎", tab: "Documents" },
};

export function mediaTypeMeta(type) {
  return MEDIA_TYPES[type] || MEDIA_TYPES.other;
}

// Accepted file extensions per upload slot (kept permissive; Supabase Storage
// enforces the real size limit).
export const ACCEPT = {
  image: "image/*",
  video: "video/*",
  document: "application/pdf,.doc,.docx,.ppt,.pptx,.txt,.zip",
  animation: ".html,.htm,video/*,image/gif,.mp4,.webm,.mov,.gif",
  animation_html: ".html,.htm,text/html",
  virtual_mechanism: ".html,.htm,.zip,.json,.js,*",
  drawing: "image/*,application/pdf",
  other: "*",
};


export const ACADEMIC_YEARS = [
  "SE Mech",
  "TE Mech",
  "BE Mech",
  "Faculty / Research",
  "Other",
];

export const MOTION_TYPES = [
  "Rotary to Linear",
  "Oscillating / Rocker",
  "Continuous Rotary",
  "Intermittent Motion",
  "Steering / Multi-Bar",
  "Other",
];

// ─── FORM SHAPES ────────────────────────────────────────────────────────────────
export const EMPTY_MECHANISM_FORM = {
  name: "",
  category: "Four-bar",
  description: "",
  num_links: "4",
  num_joints: "4",
  higher_pairs: "0",
  student_name: "",
  team_members: "",
  academic_year: "TE Mech",
  motion_type: "Oscillating / Rocker",
  video_url: "",
  html_animation_url: "",
  animation_url: "",
  virtual_mechanism_url: "",
  department: "Mechanical Engineering",
  college: "NMIET",
  admin_feedback: "",
};

export const MECHANISM_STATUS = {
  PENDING:  "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

// ─── BUILT-IN INTERACTIVE MODELS ──────────────────────────────────────────────
// All preloaded mechanisms removed — showcase displays student submissions only.
export const BUILTIN_MECHANISMS = [];



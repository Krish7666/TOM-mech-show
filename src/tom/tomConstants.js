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
  "Four-bar":            { icon: "⚙️", color: "#fbbf24" },
  "Slider-crank":        { icon: "🔩", color: "#38bdf8" },
  "Quick-return":        { icon: "↩️", color: "#34d399" },
  "Gear mechanisms":     { icon: "🛠️", color: "#818cf8" },
  "Cam mechanisms":      { icon: "🔵", color: "#f472b6" },
  "Couplings":           { icon: "🔗", color: "#fb923c" },
  "Steering mechanisms": { icon: "🚗", color: "#a3e635" },
  "Other":               { icon: "🔬", color: "#94a3b8" },
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
  cad:           { label: "CAD File",     icon: "🧩", tab: "CAD" },
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
  animation: "video/*,image/gif",
  drawing: "image/*,application/pdf",
  cad: ".dwg,.dxf,.step,.stp,.iges,.igs,.stl,.sldprt,.sldasm,.zip",
  document: "application/pdf,.doc,.docx",
  other: "*",
};

// ─── FORM SHAPES ────────────────────────────────────────────────────────────────
export const EMPTY_MECHANISM_FORM = {
  // Basic Information
  name: "",
  category: "",
  short_description: "",
  detailed_description: "",
  working_principle: "",
  applications: "",
  // Technical Information
  num_links: "",
  num_joints: "",
  num_higher_pairs: "",
  kinematic_pairs: "",
  degrees_of_freedom: "",
  input_link: "",
  output_link: "",
  additional_technical_details: "",
  mechanism_type: "",
  // Student Information
  student_name: "",
  team_members: "",
  department: "",
  college: "",
  academic_year: "",
  // External links (comma separated, optional)
  external_links: "",
  // Optional extras
  video_url: "",
  animation_description: "",
};

// Free-text hint values for the "Mechanism Type" field's datalist — this
// drives which built-in live-preview animation renders on the detail page.
// See tomKinematics.previewKindFor().
export const MECHANISM_TYPE_SUGGESTIONS = ["pick-and-place"];

export const MECHANISM_STATUS = {
  PENDING:  "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

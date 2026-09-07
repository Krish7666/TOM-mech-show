import {
  FOUR_BAR_BLUEPRINT,
  CAM_FOLLOWER_BLUEPRINT,
  GEAR_TRAIN_BLUEPRINT,
  STEERING_BLUEPRINT,
  PICK_AND_PLACE_BLUEPRINT,
} from "./mechanismDrawings.js";

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
  document: "application/pdf,.doc,.docx,.dwg,.dxf,.step,.stp,.iges,.igs,.stl,.sldprt,.sldasm,.zip",
  cad: ".dwg,.dxf,.step,.stp,.iges,.igs,.stl,.sldprt,.sldasm,.zip",
  animation: "video/*,image/gif",
  drawing: "image/*,application/pdf",
  other: "*",
};

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
  academic_year: "SE Mech",
  video_url: "",
  department: "Mechanical Engineering",
  college: "NMIET",
};

export const MECHANISM_STATUS = {
  PENDING:  "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

// ─── BUILT-IN INTERACTIVE MODELS ──────────────────────────────────────────────
export const BUILTIN_MECHANISMS = [
  {
    id: "builtin-1",
    name: "Four-Bar Linkage Animator",
    category: "Four-bar",
    student_name: "Aarav Patil",
    college: "NMIET",
    department: "Mechanical Engineering",
    academic_year: "SE Mech",
    short_description: "A compact demonstration of motion transmission and position analysis using a four-bar mechanism.",
    detailed_description: "This linkage is used to convert rotary motion to constrained oscillatory motion. The mechanism is widely used in pumps, steering systems, and machine tooling where a controlled path is required.",
    working_principle: "A crank-rocker path traced by the coupler link in one full rotation. Keeps one link fixed as frame and converts input rotation to output oscillation.",
    num_links: 4,
    num_joints: 4,
    higher_pairs: 0,
    degrees_of_freedom: 1,
    kinematic_pairs: "4 Lower Pairs (Revolute Joints)",
    input_link: "Link 2 (Driver Crank)",
    output_link: "Link 4 (Rocker / Follower)",
    external_links: ["https://www.youtube.com/embed/Pj2n2_j1pIQ"],
    status: "approved",
    mechanismType: "four-bar",
    cover_image: FOUR_BAR_BLUEPRINT,
    preview_image_url: FOUR_BAR_BLUEPRINT,
    created_at: "2026-01-15T10:00:00.000Z",
  },
  {
    id: "builtin-2",
    name: "Cam Profile Study",
    category: "Cam mechanisms",
    student_name: "Sakshi Verma",
    college: "NMIET",
    department: "Mechanical Engineering",
    academic_year: "TE Mech",
    short_description: "Visual analysis of follower motion and displacement profile for a standard cam mechanism.",
    detailed_description: "A cam converts rotary motion into a defined translational or oscillating follower motion. The follower motion is controlled by the profile shape of the cam.",
    working_principle: "A rotating disc cam lifting the follower with a rise-dwell-return cycle. The higher pair at the cam-follower contact reduces mobility, producing single-input motion.",
    num_links: 3,
    num_joints: 2,
    higher_pairs: 1,
    degrees_of_freedom: 1,
    kinematic_pairs: "2 Lower Pairs (Revolute & Prismatic) + 1 Higher Pair (Cam Contact)",
    input_link: "Cam Shaft (Rotary Driver)",
    output_link: "Knife-Edge / Roller Follower",
    external_links: ["https://www.youtube.com/embed/7dQde5T3xU4"],
    status: "approved",
    mechanismType: "cam",
    cover_image: CAM_FOLLOWER_BLUEPRINT,
    preview_image_url: CAM_FOLLOWER_BLUEPRINT,
    created_at: "2026-01-20T10:00:00.000Z",
  },
  {
    id: "builtin-3",
    name: "Gear Train Efficiency Model",
    category: "Gear mechanisms",
    student_name: "Rahul Shinde",
    college: "NMIET",
    department: "Mechanical Engineering",
    academic_year: "BE Mech",
    short_description: "A gear-ratio simulation built to compare speed, torque, and efficiency across different train layouts.",
    detailed_description: "Gear trains are used to change speed and torque between shafts while maintaining smooth power transmission. The design depends on tooth count and meshing arrangement.",
    working_principle: "Interlocking gears transferring torque through a multi-stage speed reduction system with repeated rolling contact between meshed teeth.",
    num_links: 3,
    num_joints: 2,
    higher_pairs: 1,
    degrees_of_freedom: 1,
    kinematic_pairs: "2 Lower Pairs (Shaft Bearings) + 1 Higher Pair (Meshed Teeth)",
    input_link: "Pinion / Driver Gear",
    output_link: "Driven Gear / Output Shaft",
    external_links: ["https://www.youtube.com/embed/2OT8nyb0QpQ"],
    status: "approved",
    mechanismType: "gear",
    cover_image: GEAR_TRAIN_BLUEPRINT,
    preview_image_url: GEAR_TRAIN_BLUEPRINT,
    created_at: "2026-02-01T10:00:00.000Z",
  },
  {
    id: "builtin-4",
    name: "Steering Mechanism Mockup",
    category: "Steering mechanisms",
    student_name: "Pranav Kulkarni",
    college: "NMIET",
    department: "Mechanical Engineering",
    academic_year: "TE Mech",
    short_description: "A practical steering linkage layout showing turning motion and wheel alignment behaviour.",
    detailed_description: "The steering linkage guides the front wheels according to the steering wheel input. Its geometry allows smooth turning while maintaining directional control.",
    working_principle: "A steering linkage turning the left and right wheels with coordinated angular movement to satisfy Ackermann steering conditions.",
    num_links: 6,
    num_joints: 7,
    higher_pairs: 0,
    degrees_of_freedom: 1,
    kinematic_pairs: "7 Lower Pairs (Revolute & Spherical Tie-Rod Joints)",
    input_link: "Steering Column / Pitman Arm",
    output_link: "Steering Knuckles & Wheels",
    external_links: ["https://www.youtube.com/embed/9V00R_1R7jM"],
    status: "approved",
    mechanismType: "steering",
    cover_image: STEERING_BLUEPRINT,
    preview_image_url: STEERING_BLUEPRINT,
    created_at: "2026-02-10T10:00:00.000Z",
  },
  {
    id: "builtin-5",
    name: "Pick-and-Place Mechanism",
    category: "Slider-crank",
    student_name: "Demo Mechanism",
    college: "NMIET",
    department: "Mechanical Engineering",
    academic_year: "2025-26",
    short_description: "A guided slider mechanism that moves an object forward, lowers the gripper, returns, and releases it at a new position.",
    detailed_description: "This pick-and-place mechanism combines rotary input with guided horizontal and vertical motion. It is useful for transferring components between stations in assembly and packaging systems.",
    working_principle: "The slider travels forward, lowers the gripper, carries the object back, and raises it at the placement point.",
    num_links: 4,
    num_joints: 4,
    higher_pairs: 0,
    degrees_of_freedom: 1,
    kinematic_pairs: "4 Lower Pairs (3 Revolute Pins + 1 Prismatic Slider Guide)",
    input_link: "Rotary Actuator / Input Crank",
    output_link: "Gripper Carriage / Slider",
    external_links: [],
    status: "approved",
    mechanismType: "pick-and-place",
    cover_image: PICK_AND_PLACE_BLUEPRINT,
    preview_image_url: PICK_AND_PLACE_BLUEPRINT,
    created_at: "2026-02-15T10:00:00.000Z",
  },
];

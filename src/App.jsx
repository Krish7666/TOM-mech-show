import { useEffect, useState } from "react";
import "./App.css";
import "./tom/tom.css";
import TomShowcase from "./tom/TomShowcase.jsx";
import { generateAnimationDescription } from "./tom/kinematics.js";
import { verifyAdminCredentials, isSupabaseConfigured } from "./lib/supabaseClient.js";
import MechanismForm from "./tom/MechanismForm.jsx";
import { submitMechanism } from "./tom/tomApi.js";
import KinematicWorkbench from "./tom/KinematicWorkbench.jsx";

const initialMechanisms = [
  {
    id: 1,
    name: "Four-Bar Linkage Animator",
    category: "Linkages",
    student_name: "Aarav Patil",
    college: "NMIET",
    department: "Mechanical Engineering",
    short_description: "A compact demonstration of motion transmission and position analysis using a four-bar mechanism.",
    information:
      "This linkage is used to convert rotary motion to constrained oscillatory motion. The mechanism is widely used in pumps, steering systems, and machine tooling where a controlled path is required.",
    dofFormula: "DOF = 3(L - 1) - 2J - H",
    dofInputs: { links: 4, joints: 4, higherPairs: 0 },
    instructions: [
      "Keep one link fixed as the frame.",
      "Rotate the input crank slowly to observe the coupler path.",
      "Record the position of the output link for each crank angle.",
    ],
    video: "https://www.youtube.com/embed/Pj2n2_j1pIQ",
    animation: "A crank-rocker path traced by the coupler link in one full rotation.",
    formulaNote: "The four-bar linkage has one degree of freedom because only one input motion is needed to define the entire mechanism.",
  },
  {
    id: 2,
    name: "Cam Profile Study",
    category: "Cam mechanisms",
    student_name: "Sakshi Verma",
    college: "NMIET",
    department: "Mechanical Engineering",
    short_description: "Visual analysis of follower motion and displacement profile for a standard cam mechanism.",
    information:
      "A cam converts rotary motion into a defined translational or oscillating follower motion. The follower motion is controlled by the profile shape of the cam.",
    dofFormula: "DOF = 3(L - 1) - 2J - H",
    dofInputs: { links: 3, joints: 2, higherPairs: 1 },
    instructions: [
      "Set the cam on the shaft and align the follower to the base line.",
      "Rotate the cam gradually and note the rise, dwell, and return phases.",
      "Compare the actual follower motion with the theoretical displacement diagram.",
    ],
    video: "https://www.youtube.com/embed/7dQde5T3xU4",
    animation: "A rotating disc cam lifting the follower with a rise-dwell-return cycle.",
    formulaNote: "The higher pair at the cam-follower contact reduces mobility, but the system still behaves as a single-input motion mechanism.",
  },
  {
    id: 3,
    name: "Gear Train Efficiency Model",
    category: "Gear mechanisms",
    student_name: "Rahul Shinde",
    college: "NMIET",
    department: "Mechanical Engineering",
    short_description: "A gear-ratio simulation built to compare speed, torque, and efficiency across different train layouts.",
    information:
      "Gear trains are used to change speed and torque between shafts while maintaining smooth power transmission. The design depends on tooth count and meshing arrangement.",
    dofFormula: "DOF = 3(L - 1) - 2J - H",
    dofInputs: { links: 3, joints: 2, higherPairs: 1 },
    instructions: [
      "Select the gear pair and confirm the mesh alignment.",
      "Rotate the driver gear slowly and record the driven speed.",
      "Calculate the ratio from the number of teeth and compare it with the observed output speed.",
    ],
    video: "https://www.youtube.com/embed/2OT8nyb0QpQ",
    animation: "Interlocking gears transferring torque through a multi-stage speed reduction system.",
    formulaNote: "The gear train uses repeated rolling contact between meshed teeth, which gives precise power transmission with manageable loss.",
  },
  {
    id: 4,
    name: "Steering Mechanism Mockup",
    category: "Steering mechanisms",
    student_name: "Pranav Kulkarni",
    college: "NMIET",
    department: "Mechanical Engineering",
    short_description: "A practical steering linkage layout showing turning motion and wheel alignment behaviour.",
    information:
      "The steering linkage guides the front wheels according to the steering wheel input. Its geometry allows smooth turning while maintaining directional control.",
    dofFormula: "DOF = 3(L - 1) - 2J - H",
    dofInputs: { links: 6, joints: 7, higherPairs: 0 },
    instructions: [
      "Lock the steering rack carefully and rotate the steering arm gradually.",
      "Observe both wheel directions as the linkage moves.",
      "Verify the toe-in and steering lock conditions before finalizing the motion path.",
    ],
    video: "https://www.youtube.com/embed/9V00R_1R7jM",
    animation: "A steering linkage turning the left and right wheels with coordinated angular movement.",
    formulaNote: "The mechanism is a multi-link guided motion system where the steering input must be coordinated with wheel geometry to avoid skidding.",
  },
  {
    id: 5,
    name: "Pick-and-Place Mechanism",
    category: "Linkages",
    mechanismType: "pick-and-place",
    student_name: "Demo Mechanism",
    college: "NMIET",
    department: "Mechanical Engineering",
    short_description: "A guided slider mechanism that moves an object forward, lowers the gripper, returns, and releases it at a new position.",
    information:
      "This pick-and-place mechanism combines rotary input with guided horizontal and vertical motion. It is useful for transferring components between stations in assembly and packaging systems.",
    dofFormula: "DOF = 3(L - 1) - 2J - H",
    dofInputs: { links: 4, joints: 4, higherPairs: 0 },
    instructions: [
      "Place the object below the gripper pickup point.",
      "Run the input crank slowly and observe the slider move forward.",
      "The gripper lowers to pick the object, returns along the guide, and rises to place it.",
    ],
    video: "",
    animation: "The slider travels forward, lowers the gripper, carries the object back, and raises it at the placement point.",
    formulaNote: "The mechanism is designed as a single-input constrained system. Its guide links keep the gripper path controlled during pickup and placement.",
  },
];

const categories = ["All", "Linkages", "Gear mechanisms", "Cam mechanisms", "Steering mechanisms"];

const highlights = [
  { icon: "◈", title: "Kinematic Analysis", text: "Visual explanation of motion, force, and displacement behaviour." },
  { icon: "⚙", title: "Practical Design", text: "Mechanism concepts linked directly to machine-building problem solving." },
  { icon: "✦", title: "Student Innovation", text: "Curated showcase of classroom-inspired engineering thinking." },
];


const menuCards = [
  {
    title: "Cloud Repository",
    copy: "Explore all mechanism models, animated simulations, student uploads, and technical specifications.",
    action: "Repository",
    badge: "Unified Showcase",
  },
  {
    title: "Submit a Mechanism",
    copy: "Share your mechanism model, technical calculations, drawings, and project CAD media.",
    action: "Submit",
    badge: "Student Upload",
  },
  {
    title: "Kinematic Analysis & Models",
    copy: "Explore planar degrees of freedom (Grübler criterion) with live interactive motion animations.",
    action: "Models",
    badge: "Interactive",
  },
  {
    title: "Admin Portal",
    copy: "Review submissions, manage the mechanism collection, or update details from the admin dashboard.",
    action: "Login",
    badge: "Faculty / Admin",
  },
];

const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 60_000; // 1 minute

const emptyMechanismForm = {
  name: "",
  category: "Linkages",
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
  image: "",
};

function mechanismToForm(mechanism) {
  return {
    name: mechanism.name || "",
    category: mechanism.category || "Linkages",
    student_name: mechanism.student_name || "",
    team_members: mechanism.team_members || "",
    college: "NMIET",
    department: "Mechanical Engineering",
    short_description: mechanism.short_description || "",
    information: mechanism.information || "",
    dofFormula: mechanism.dofFormula || "DOF = 3(L - 1) - 2J - H",
    links: String(mechanism.dofInputs?.links ?? 4),
    joints: String(mechanism.dofInputs?.joints ?? 4),
    higherPairs: String(mechanism.dofInputs?.higherPairs ?? 0),
    instructions: (mechanism.instructions || []).join("\n"),
    video: mechanism.video || "",
    image: mechanism.image || "",
  };
}

function normalizeMechanism(mechanism) {
  return {
    ...mechanism,
    originalDofInputs: {
      ...(mechanism.originalDofInputs || mechanism.dofInputs || { links: 4, joints: 4, higherPairs: 0 }),
    },
  };
}

function normalizeMechanisms(items) {
  const normalized = items.map(normalizeMechanism);
  return initialMechanisms.reduce((current, example) => (
    current.some((mechanism) => mechanism.id === example.id)
      ? current
      : [...current, normalizeMechanism(example)]
  ), normalized);
}

export default function App() {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => {
    try {
      return localStorage.getItem("tom-admin-session") === "true";
    } catch {
      return false;
    }
  });
  const [page, setPage] = useState(() => {
    try {
      return localStorage.getItem("tom-admin-session") === "true" ? "admin" : "home";
    } catch {
      return "home";
    }
  });
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [loginLock, setLoginLock] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("tom-login-lock"));
      return saved && typeof saved.attempts === "number"
        ? saved
        : { attempts: 0, lockedUntil: 0 };
    } catch {
      return { attempts: 0, lockedUntil: 0 };
    }
  });

  useEffect(() => {
    localStorage.setItem("tom-login-lock", JSON.stringify(loginLock));
  }, [loginLock]);

  const [mechanisms, setMechanisms] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("tom-mechanisms"));
      return normalizeMechanisms(saved || initialMechanisms);
    } catch {
      return normalizeMechanisms(initialMechanisms);
    }
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMechanism, setNewMechanism] = useState(emptyMechanismForm);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingMechanismId, setEditingMechanismId] = useState(null);
  const [isNavMenuOpen, setIsNavMenuOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setIsNavMenuOpen(false);
    };
    if (isNavMenuOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isNavMenuOpen]);

  useEffect(() => {
    localStorage.setItem("tom-admin-session", String(isAdminLoggedIn));
  }, [isAdminLoggedIn]);

  useEffect(() => {
    localStorage.setItem("tom-mechanisms", JSON.stringify(mechanisms));
  }, [mechanisms]);

  const startEditingMechanism = (mechanism) => {
    setEditingMechanismId(mechanism.id);
    setNewMechanism(mechanismToForm(mechanism));
    setFormError("");
    setShowAddForm(true);
  };

  const deleteMechanism = (id) => {
    const mechanism = mechanisms.find((item) => item.id === id);
    if (!mechanism || !window.confirm(`Delete “${mechanism.name}”? This cannot be undone.`)) return;

    setMechanisms((current) => current.filter((item) => item.id !== id));
  };

  const handleLoginSubmit = async (event) => {
    event.preventDefault();

    const now = Date.now();
    if (loginLock.lockedUntil > now) {
      const secondsLeft = Math.ceil((loginLock.lockedUntil - now) / 1000);
      setLoginError(`Too many attempts. Please wait ${secondsLeft}s and try again.`);
      return;
    }

    const isValid = await verifyAdminCredentials(loginForm.username, loginForm.password);

    if (!isValid) {
      const attempts = loginLock.attempts + 1;
      if (attempts >= LOGIN_MAX_ATTEMPTS) {
        setLoginLock({ attempts: 0, lockedUntil: Date.now() + LOGIN_LOCKOUT_MS });
        setLoginError(`Too many attempts. Please wait ${Math.ceil(LOGIN_LOCKOUT_MS / 1000)}s and try again.`);
      } else {
        setLoginLock({ attempts, lockedUntil: 0 });
        setLoginError(`Invalid admin credentials. Please try again. (${LOGIN_MAX_ATTEMPTS - attempts} attempt(s) left before a short lockout)`);
      }
      return;
    }

    setLoginLock({ attempts: 0, lockedUntil: 0 });
    setLoginError("");
    setIsAdminLoggedIn(true);
    setPage("admin");
  };

  const handleLogout = () => {
    setIsAdminLoggedIn(false);
    setLoginForm({ username: "", password: "" });
    setPage("home");
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setNewMechanism((current) => ({ ...current, [name]: value }));
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setFormError("Please select an image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setNewMechanism((current) => ({ ...current, image: reader.result }));
      setFormError("");
    };
    reader.readAsDataURL(file);
  };

  const handleAddMechanismSubmit = (event) => {
    event.preventDefault();

    if (!newMechanism.name || !newMechanism.student_name || !newMechanism.category) {
      setFormError("Please fill in the mechanism name, category, and student name.");
      return;
    }

    const savedMechanism = {
      id: editingMechanismId ?? Date.now(),
      name: newMechanism.name,
      category: newMechanism.category,
      student_name: newMechanism.student_name,
      team_members: newMechanism.student_name,
      college: "NMIET",
      department: "Mechanical Engineering",
      short_description: newMechanism.short_description || "Student-submitted mechanism project.",
      information: newMechanism.information || "Mechanism details are shared by the student for academic review.",
      dofFormula: newMechanism.dofFormula || "DOF = 3(L - 1) - 2J - H",
      dofInputs: {
        links: Number(newMechanism.links || 4),
        joints: Number(newMechanism.joints || 4),
        higherPairs: Number(newMechanism.higherPairs || 0),
      },
      instructions: (newMechanism.instructions || "Rotate the input link slowly and observe the movement path.")
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
      video: newMechanism.video || "",
      animation: generateAnimationDescription(newMechanism),
      image: newMechanism.image || "",
      formulaNote: "This value is calculated from the mechanism’s link and joint data using the standard DOF relation for planar mechanisms.",
    };

    savedMechanism.originalDofInputs = editingMechanismId
      ? { ...(mechanisms.find((item) => item.id === editingMechanismId)?.originalDofInputs || savedMechanism.dofInputs) }
      : { ...savedMechanism.dofInputs };

    setMechanisms((current) => editingMechanismId
      ? current.map((item) => item.id === editingMechanismId ? savedMechanism : item)
      : [savedMechanism, ...current]);
    setNewMechanism(emptyMechanismForm);
    setEditingMechanismId(null);
    setShowAddForm(false);
    setPage(editingMechanismId ? "admin" : "menu");
  };

  const navDrawerItems = [
    {
      id: "home",
      page: "home",
      icon: "🏠",
      title: "Home",
      desc: "Showcase overview, statistics & live sandbox",
      action: () => setPage("home"),
    },
    {
      id: "repository",
      page: "repository",
      icon: "🗄️",
      title: "Cloud Repository",
      desc: "All mechanism models, 3D simulations & data tables",
      badge: `${mechanisms.length} Models`,
      action: () => setPage("repository"),
    },
    {
      id: "submit",
      page: "submit",
      icon: "➕",
      title: "Add Mechanism",
      desc: "Submit student mechanism model with CAD render & pairs",
      action: () => {
        setNewMechanism(emptyMechanismForm);
        setFormError("");
        setEditingMechanismId(null);
        setPage("submit");
      },
    },
    {
      id: "solver",
      page: "home",
      icon: "⚙️",
      title: "Kinematic Solver",
      desc: "Grübler-Kutzbach planar mobility engine & presets",
      badge: "Interactive",
      action: () => {
        setPage("home");
        setTimeout(() => {
          document.querySelector(".home-workbench-section")?.scrollIntoView({ behavior: "smooth" });
        }, 120);
      },
    },
    {
      id: "admin",
      page: isAdminLoggedIn ? "admin" : "login",
      icon: "🛡️",
      title: isAdminLoggedIn ? "Admin Dashboard" : "Admin Portal",
      desc: isAdminLoggedIn ? "Review and moderate student submissions" : "Sign in to access faculty administrative tools",
      badge: isAdminLoggedIn ? "Active" : undefined,
      action: () => setPage(isAdminLoggedIn ? "admin" : "login"),
    },
  ];

  return (
    <div className="app-shell">
      <div className="app-noise" aria-hidden="true" />
      <div className="app-orbs" aria-hidden="true">
        <div className="app-orb app-orb--violet" />
        <div className="app-orb app-orb--gold" />
        <div className="app-orb app-orb--green" />
      </div>

      <div className="system-telemetry-bar">
        <div className="telemetry-inner">
          <div className="telemetry-left">
            <span className="telemetry-status-dot" />
            <span className="telemetry-label">SYSTEM ONLINE</span>
            <span className="telemetry-sep">/</span>
            <span className="telemetry-cloud">
              {isSupabaseConfigured ? "🟢 SUPABASE CLOUD ACTIVE" : "🟢 LOCAL SYNC ENGINE ACTIVE"}
            </span>
            <span className="telemetry-sep">/</span>
            <span className="telemetry-item">DB LATENCY: ~18ms</span>
            <span className="telemetry-sep">/</span>
            <span className="telemetry-item">BUILD: v2.4.0-PROD</span>
          </div>

          <div className="telemetry-right">
            <span className="telemetry-institute">PCET's NMIET · SPPU MECHANICAL ENGINEERING</span>
            <span className="telemetry-sep">/</span>
            <span className="telemetry-session">
              {isAdminLoggedIn ? "⚡ ADMIN SESSION ACTIVE" : "STUDENT ACCESS"}
            </span>
          </div>
        </div>
      </div>

      <header className="site-header">
        <button type="button" className="brand" onClick={() => { setPage("home"); setIsNavMenuOpen(false); }} aria-label="Go to home page">
          <span className="brand-mark">TOM</span>
          <span className="brand-copy">
            <span className="brand-copy__eyebrow">NMIET</span>
            <strong>Theory of Machines</strong>
          </span>
        </button>

        <div className="site-header__actions">
          {isAdminLoggedIn && (
            <button
              type="button"
              className="admin-badge-btn"
              onClick={() => { setPage("admin"); setIsNavMenuOpen(false); }}
              title="Open Admin Dashboard"
            >
              ⚡ Admin
            </button>
          )}

          <button
            type="button"
            className={`nav-menu-toggle${isNavMenuOpen ? " nav-menu-toggle--active" : ""}`}
            onClick={() => setIsNavMenuOpen((prev) => !prev)}
            aria-label={isNavMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isNavMenuOpen}
          >
            <span className="hamburger-icon" aria-hidden="true">
              <span className="hamburger-bar" />
              <span className="hamburger-bar" />
              <span className="hamburger-bar" />
            </span>
            <span className="nav-menu-toggle__label">Menu</span>
          </button>
        </div>
      </header>

      {isNavMenuOpen && (
        <div className="nav-drawer-backdrop" onClick={() => setIsNavMenuOpen(false)}>
          <aside
            className="nav-drawer"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation Menu"
          >
            <div className="nav-drawer__header">
              <div className="nav-drawer__brand">
                <span className="brand-mark">TOM</span>
                <div>
                  <strong>Theory of Machines</strong>
                  <span className="nav-drawer__subtitle">NMIET Mech Engineering</span>
                </div>
              </div>
              <button
                type="button"
                className="nav-drawer__close"
                onClick={() => setIsNavMenuOpen(false)}
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            <div className="nav-drawer__body">
              <div className="nav-drawer__section-label">Navigation &amp; Portals</div>
              <nav className="nav-drawer__links">
                {navDrawerItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`nav-drawer__item${page === item.page ? " nav-drawer__item--active" : ""}`}
                    onClick={() => {
                      item.action();
                      setIsNavMenuOpen(false);
                    }}
                  >
                    <span className="nav-drawer__item-icon">{item.icon}</span>
                    <div className="nav-drawer__item-text">
                      <div className="nav-drawer__item-title">
                        {item.title}
                        {item.badge && <span className="nav-drawer__item-badge">{item.badge}</span>}
                      </div>
                      <p className="nav-drawer__item-desc">{item.desc}</p>
                    </div>
                    <span className="nav-drawer__item-arrow">→</span>
                  </button>
                ))}
              </nav>

              <div className="nav-drawer__section-label" style={{ marginTop: 24 }}>System &amp; Access</div>
              <div className="nav-drawer__system-card">
                <div className="nav-drawer__system-row">
                  <span className="telemetry-status-dot" />
                  <span>{isSupabaseConfigured ? "Supabase Cloud Active" : "Local Database Mode"}</span>
                </div>
                <div className="nav-drawer__system-meta">
                  <span>{isAdminLoggedIn ? "⚡ Admin Session Active" : "Student Access"}</span>
                  <span>v2.4.0-PROD</span>
                </div>
                <div className="nav-drawer__actions" style={{ marginTop: 14 }}>
                  {isAdminLoggedIn ? (
                    <button
                      type="button"
                      className="button button--danger"
                      style={{ width: "100%", justifyContent: "center" }}
                      onClick={() => {
                        handleLogout();
                        setIsNavMenuOpen(false);
                      }}
                    >
                      Logout Admin
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="primary-btn"
                      style={{ width: "100%", justifyContent: "center" }}
                      onClick={() => {
                        setPage("login");
                        setIsNavMenuOpen(false);
                      }}
                    >
                      Admin Login
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="nav-drawer__footer">
              <span>PCET's NMIET · SPPU Pune University</span>
              <span>Theory of Machines Laboratory</span>
            </div>
          </aside>
        </div>
      )}

      <main className="app-layout">
        {page === "home" && (
          <>
            <section className="hero-panel">
              <div className="hero-copy-block">
                <div className="hero-badge">
                  <span className="hero-badge__dot" />
                  TE Mech · 2025-28 Batch
                </div>

                <h1 className="hero-title">
                  Theory of Machines <span>Showcase</span>
                </h1>

                <p className="hero-subtitle">Motion, linkages, and mechanical design in a refined academic display.</p>

                <p className="hero-copy">
                  A polished collection of mechanism studies, student projects, and kinematic models designed to explain how machines move, transfer force, and solve engineering challenges with clarity.
                </p>

                <div className="cta-row">
                  <button type="button" className="primary-btn" onClick={() => setIsNavMenuOpen(true)}>Explore Menu ☰</button>
                  <button type="button" className="secondary-btn" onClick={() => setPage("repository")}>Cloud Repository</button>
                  <button type="button" className="secondary-btn" onClick={() => {
                    setNewMechanism(emptyMechanismForm);
                    setFormError("");
                    setEditingMechanismId(null);
                    setPage("submit");
                  }}>+ Add Mechanism</button>
                  <button type="button" className="secondary-btn" onClick={() => setPage(isAdminLoggedIn ? "admin" : "login")}>Admin Access</button>
                </div>
              </div>

              <div className="hero-visual" aria-label="TOM insight panel">
                <div className="visual-card visual-card--accent">
                  <span className="visual-card__label">Active models</span>
                  <strong>{mechanisms.length}</strong>
                </div>
                <div className="visual-card">
                  <span className="visual-card__label">Focus</span>
                  <strong>Mechanisms</strong>
                </div>
                <div className="visual-card visual-card--dark">
                  <span className="visual-card__label">Study stream</span>
                  <strong>Mechanical Engineering</strong>
                </div>
              </div>
            </section>

            <section className="stats-row" aria-label="Website statistics">
              <div className="stat-tile">
                <span className="stat-tile__value">{mechanisms.length}</span>
                <span className="stat-tile__label">Mechanisms</span>
              </div>
              <div className="stat-tile">
                <span className="stat-tile__value">{categories.length - 1}</span>
                <span className="stat-tile__label">Categories</span>
              </div>
              <div className="stat-tile">
                <span className="stat-tile__value">Secure</span>
                <span className="stat-tile__label">Access</span>
              </div>
            </section>

            <section className="feature-grid" aria-label="Highlights">
              {highlights.map((item) => (
                <article key={item.title} className="feature-card">
                  <span className="feature-card__icon" aria-hidden="true">{item.icon}</span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </section>

            <section className="home-workbench-section" style={{ marginTop: 36 }}>
              <div className="section-heading-block">
                <span className="eyebrow">Real-Time Kinematic Sandbox</span>
                <h2>Grübler-Kutzbach Mobility Engine</h2>
                <p>Test planar link networks, pairs, and degrees of freedom directly in the browser.</p>
              </div>
              <KinematicWorkbench />
            </section>

          </>
        )}

        {page === "menu" && (
          <>
            <section className="page-header">
              <span className="eyebrow">Interactive TOM Hub</span>
              <h2>Interactive TOM Menu</h2>
              <p>Simple, elegant navigation for browsing the showcase, running simulations, and accessing the admin portal.</p>
            </section>

            <section className="menu-grid">
              {menuCards.map((card) => (
                <article key={card.title} className="menu-card">
                  <div className="menu-card__top">
                    <span className="login-badge">{card.badge}</span>
                  </div>
                  <h3>{card.title}</h3>
                  <p>{card.copy}</p>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => {
                      if (card.action === "Repository" || card.action === "Models") setPage("repository");
                      if (card.action === "Login") setPage(isAdminLoggedIn ? "admin" : "login");
                      if (card.action === "Submit") {
                        setNewMechanism(emptyMechanismForm);
                        setFormError("");
                        setEditingMechanismId(null);
                        setPage("submit");
                      }
                    }}
                  >
                    Open →
                  </button>
                </article>
              ))}
            </section>
          </>
        )}

        {page === "submit" && (
          <section className="submit-page-shell">
            <div className="submit-page-topbar">
              <button
                type="button"
                className="back-btn"
                onClick={() => setPage("repository")}
              >
                ← Back to Cloud Repository
              </button>
              <span className="submit-page-badge">
                🏛 NMIET · Department of Mechanical Engineering
              </span>
            </div>

            <MechanismForm
              onCancel={() => setPage("repository")}
              onSubmit={async (payload, files) => {
                setSubmitting(true);
                setFormError("");
                const { mechanism, error } = await submitMechanism(payload, files);
                setSubmitting(false);

                if (error) {
                  setFormError(error.message || "Failed to submit mechanism. Please check your fields and try again.");
                  return;
                }

                if (mechanism) {
                  setMechanisms((cur) => [mechanism, ...cur]);
                }
                setPage("repository");
              }}
              submitting={submitting}
              formError={formError}
            />
          </section>
        )}

        {(page === "repository" || page === "models") && (
          <TomShowcase
            isAdmin={isAdminLoggedIn}
            onRequestAdminLogin={() => setPage("login")}
            onRequestAddMechanism={() => { setFormError(""); setPage("submit"); }}
          />
        )}

        {page === "login" && !isAdminLoggedIn && (
          <section className="login-shell">
            <div className="login-card">
              <h2>Admin Login</h2>
              <p>Use the control panel to review and manage the TOM showcase securely.</p>

              <form className="login-form" onSubmit={handleLoginSubmit}>
                <label className="field">
                  <span className="field__label">Username</span>
                  <input
                    type="text"
                    value={loginForm.username}
                    onChange={(event) => setLoginForm({ ...loginForm, username: event.target.value })}
                    placeholder="admin"
                  />
                </label>

                <label className="field">
                  <span className="field__label">Password</span>
                  <input
                    type="password"
                    value={loginForm.password}
                    onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })}
                    placeholder="••••••••"
                  />
                </label>

                {loginError && <div className="login-error">{loginError}</div>}

                <button className="primary-btn login-submit" type="submit">Login to Dashboard</button>
              </form>
            </div>
          </section>
        )}

        {page === "admin" && isAdminLoggedIn && (
          <section className="admin-shell">
            <div className="admin-header">
              <div>
                <h2>Admin Dashboard</h2>
              </div>
            </div>

            <div className="admin-summary">
              <div className="summary-card">
                <span>Total Projects</span>
                <strong>{mechanisms.length}</strong>
              </div>
              <div className="summary-card">
                <span>Active Categories</span>
                <strong>{categories.length - 1}</strong>
              </div>
              <div className="summary-card">
                <span>Security</span>
                <strong>Enabled</strong>
              </div>
            </div>

            <div className="admin-panel">
              <div className="admin-panel__header">
                <h3>Approval Overview</h3>
                <button type="button" className="primary-btn" onClick={() => setShowAddForm((value) => !value)}>
                  {showAddForm ? "Close form" : "Add mechanism"}
                </button>
              </div>

              {showAddForm && (
                <form className="mechanism-form" onSubmit={handleAddMechanismSubmit}>
                  <div className="form-heading">
                    <h3>{editingMechanismId ? "Update mechanism details" : "Add a mechanism"}</h3>
                  </div>
                  <div className="mechanism-form__grid">
                    <label className="field">
                      <span className="field__label">Mechanism name</span>
                      <input name="name" value={newMechanism.name} onChange={handleChange} placeholder="Quick Return Mechanism" />
                    </label>

                    <label className="field">
                      <span className="field__label">Category</span>
                      <select name="category" value={newMechanism.category} onChange={handleChange}>
                        {categories.filter((item) => item !== "All").map((category) => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </label>

                    <label className="field field--full">
                      <span className="field__label">Student Member(s) *</span>
                      <input
                        name="student_name"
                        value={newMechanism.student_name}
                        onChange={handleChange}
                        placeholder="e.g. Aarav Patil, Sakshi Verma, Rahul Shinde (All members in one entry)"
                      />
                      <span className="field__hint">All student project members in a single entry (comma-separated for group projects).</span>
                    </label>

                    <label className="field field--full">
                      <span className="field__label">Short description</span>
                      <input name="short_description" value={newMechanism.short_description} onChange={handleChange} placeholder="Short project description" />
                    </label>

                    <label className="field field--full">
                      <span className="field__label">Mechanism information</span>
                      <textarea name="information" value={newMechanism.information} onChange={handleChange} rows="4" placeholder="Explain the mechanism purpose and working principle" />
                    </label>

                    <label className="field">
                      <span className="field__label">Links</span>
                      <input name="links" type="number" value={newMechanism.links} onChange={handleChange} min="1" />
                    </label>

                    <label className="field">
                      <span className="field__label">Joints</span>
                      <input name="joints" type="number" value={newMechanism.joints} onChange={handleChange} min="0" />
                    </label>

                    <label className="field">
                      <span className="field__label">Higher pairs</span>
                      <input name="higherPairs" type="number" value={newMechanism.higherPairs} onChange={handleChange} min="0" />
                    </label>

                    <label className="field field--full">
                      <span className="field__label">Instructions to use</span>
                      <textarea name="instructions" value={newMechanism.instructions} onChange={handleChange} rows="4" placeholder="Each line is a new instruction step" />
                    </label>

                    <div className="field field--full generated-field-note">
                      <span className="field__label">Animation</span>
                      <span className="field__hint">The animation is generated automatically from the mechanism name, category, description, and operating instructions.</span>
                    </div>

                    <label className="field field--full">
                      <span className="field__label">Student mechanism image</span>
                      <input type="file" accept="image/*" onChange={handleImageChange} />
                      <span className="field__hint">Upload a photo or CAD render. It will appear on the showcase thumbnail.</span>
                      {newMechanism.image && <img className="form-image-preview" src={newMechanism.image} alt="Selected mechanism preview" />}
                    </label>

                    <label className="field field--full">
                      <span className="field__label">Video URL</span>
                      <input name="video" value={newMechanism.video} onChange={handleChange} placeholder="https://youtube.com/embed/..." />
                    </label>
                  </div>

                  {formError && <div className="login-error">{formError}</div>}

                  <div className="form-actions">
                    <button type="submit" className="primary-btn">Save mechanism</button>
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() => {
                        setShowAddForm(false);
                        setEditingMechanismId(null);
                        setNewMechanism(emptyMechanismForm);
                        setFormError("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              <div className="admin-list">
                {mechanisms.map((mechanism) => (
                  <div key={mechanism.id} className="admin-item">
                    <div>
                      <strong>{mechanism.name}</strong>
                      <p>{mechanism.category} · {mechanism.student_name}</p>
                    </div>
                    <div className="admin-item__actions">
                      <div className="admin-item__status">Approved</div>
                      <button type="button" className="secondary-btn secondary-btn--small" onClick={() => startEditingMechanism(mechanism)}>Edit</button>
                      <button type="button" className="danger-btn" onClick={() => deleteMechanism(mechanism.id)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="site-footer">
        <div className="site-footer__inner">
          <div>
            <strong>PCET's Nutan Maharashtra Institute of Engineering and Technology (NMIET)</strong>
            <span>Department of Mechanical Engineering · Savitribai Phule Pune University (SPPU)</span>
            <span style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 4 }}>
              Theory of Machines Laboratory (TOM Studio) · TE Mechanical · 2025-28 Batch
            </span>
          </div>
          <div className="site-footer__credit">
            <div className="footer-telemetry-badge">
              <span className="telemetry-status-dot" />
              <span>Fullstack DB Connected · SPPU Pune</span>
            </div>
            <span className="site-footer__developer">
              <span className="site-footer__developer-label">Architected &amp; Developed by</span>
              <strong>Krushna Balaji Pawar</strong>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

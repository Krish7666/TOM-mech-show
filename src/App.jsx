import { useEffect, useState, useCallback } from "react";
import "./App.css";
import "./tom/tom.css";
import TomShowcase from "./tom/TomShowcase.jsx";
import { verifyAdminCredentials, isSupabaseConfigured } from "./lib/supabaseClient.js";
import MechanismForm from "./tom/MechanismForm.jsx";
import {
  submitMechanism,
  fetchApprovedMechanisms,
  fetchPendingMechanisms,
  approveMechanism,
  rejectMechanism,
  deleteMechanism as apiDeleteMechanism,
  updateMechanism as apiUpdateMechanism,
} from "./tom/tomApi.js";
import { BUILTIN_MECHANISMS, TOM_CATEGORIES } from "./tom/tomConstants.js";
import KinematicWorkbench from "./tom/KinematicWorkbench.jsx";
import FourBarVirtualLab from "./tom/FourBarVirtualLab.jsx";



const menuCards = [
  {
    title: "Mechanism Simulator Lab",
    copy: "Interactive four-bar simulator: adjust link lengths and watch how the mechanism moves in real time.",
    action: "VLab",
    badge: "Interactive Lab",
  },
  {
    title: "Mechanism Repository",
    copy: "Explore working mechanisms, student projects, photos, videos, and motion models.",
    action: "Repository",
    badge: "Showcase",
  },
  {
    title: "Submit a Mechanism",
    copy: "Share your mechanism project model, photos, description, and project files with the department.",
    action: "Submit",
    badge: "Student Upload",
  },
  {
    title: "Browse All Models",
    copy: "Browse the complete library of mechanical mechanisms and see how each one works.",
    action: "Models",
    badge: "Explore",
  },
  {
    title: "Admin Portal",
    copy: "Review and approve student submissions or manage the showcase.",
    action: "Login",
    badge: "Faculty / Admin",
  },
];

const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 60_000; // 1 minute

const emptyMechanismForm = {
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
  animation_url: "",
  virtual_mechanism_url: "",
  image: "",
};

function mechanismToForm(mechanism) {
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
      : (mechanism.working_principle || ""),
    video: mechanism.video || (mechanism.external_links && mechanism.external_links[0]) || "",
    animation_url: mechanism.animation_url || "",
    virtual_mechanism_url: mechanism.virtual_mechanism_url || "",
    image: mechanism.cover_image || mechanism.image || "",
  };
}

function normalizeMechanism(mechanism) {
  const links = Number(mechanism.num_links ?? mechanism.dofInputs?.links ?? 4);
  const joints = Number(mechanism.num_joints ?? mechanism.dofInputs?.joints ?? 4);
  const higherPairs = Number(mechanism.higher_pairs ?? mechanism.dofInputs?.higherPairs ?? 0);
  return {
    ...mechanism,
    num_links: links,
    num_joints: joints,
    higher_pairs: higherPairs,
    dofInputs: {
      links,
      joints,
      higherPairs,
    },
    originalDofInputs: {
      links,
      joints,
      higherPairs,
    },
    short_description: mechanism.short_description || mechanism.detailed_description || "",
    information: mechanism.detailed_description || mechanism.information || "",
    instructions: Array.isArray(mechanism.instructions)
      ? mechanism.instructions
      : (mechanism.working_principle ? [mechanism.working_principle] : ["Rotate the input link slowly to observe kinematic motion."]),
    video: mechanism.video || (mechanism.external_links && mechanism.external_links[0]) || "",
    animation_url: mechanism.animation_url || "",
    virtual_mechanism_url: mechanism.virtual_mechanism_url || "",
    image: mechanism.cover_image || mechanism.preview_image_url || mechanism.image || "",
  };
}

function normalizeMechanisms(items) {
  const normalized = (items || []).map(normalizeMechanism);
  const seenIds = new Set(normalized.map((m) => String(m.id)));
  const merged = [...normalized];
  for (const item of BUILTIN_MECHANISMS) {
    if (!seenIds.has(String(item.id))) {
      seenIds.add(String(item.id));
      merged.push(normalizeMechanism(item));
    }
  }
  return merged;
}

function getInitialPage() {
  try {
    const hash = window.location.hash.toLowerCase();
    if (hash.startsWith("#repository") || hash.startsWith("#mechanism/")) return "repository";
    if (hash.startsWith("#submit")) return "submit";
    if (hash.startsWith("#vlab") || hash.startsWith("#lab") || hash.startsWith("#virtual-lab")) return "vlab";
    if (hash.startsWith("#admin")) return localStorage.getItem("tom-admin-session") === "true" ? "admin" : "login";
    if (hash.startsWith("#login")) return "login";
    if (hash.startsWith("#menu")) return "menu";
    return "home";
  } catch {
    return "home";
  }
}

export default function App() {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => {
    try {
      return localStorage.getItem("tom-admin-session") === "true";
    } catch {
      return false;
    }
  });
  const [page, setPage] = useState(getInitialPage);
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

  const [mechanisms, setMechanisms] = useState(() => normalizeMechanisms(BUILTIN_MECHANISMS));
  const [pendingMechanisms, setPendingMechanisms] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMechanism, setNewMechanism] = useState(emptyMechanismForm);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingMechanismId, setEditingMechanismId] = useState(null);
  const [isNavMenuOpen, setIsNavMenuOpen] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4500);
  }, []);

  const navigateTo = useCallback((targetPage, customHash) => {
    setPage(targetPage);
    window.location.hash = customHash || targetPage;
  }, []);

  const refreshData = useCallback(async () => {
    try {
      const [appRes, pendRes] = await Promise.all([
        fetchApprovedMechanisms(),
        fetchPendingMechanisms(),
      ]);
      if (appRes?.data) {
        setMechanisms(normalizeMechanisms(appRes.data));
      }
      if (pendRes?.data) {
        setPendingMechanisms(pendRes.data.map(normalizeMechanism));
      }
    } catch (err) {
      console.error("Error refreshing mechanisms:", err);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([fetchApprovedMechanisms(), fetchPendingMechanisms()]).then(([appRes, pendRes]) => {
      if (!active) return;
      if (appRes?.data) setMechanisms(normalizeMechanisms(appRes.data));
      if (pendRes?.data) setPendingMechanisms(pendRes.data.map(normalizeMechanism));
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash.startsWith("#repository") || hash.startsWith("#mechanism/")) {
        setPage("repository");
      } else if (hash.startsWith("#submit")) {
        setPage("submit");
      } else if (hash.startsWith("#vlab") || hash.startsWith("#lab") || hash.startsWith("#virtual-lab")) {
        setPage("vlab");
      } else if (hash.startsWith("#admin")) {
        setPage(isAdminLoggedIn ? "admin" : "login");
      } else if (hash.startsWith("#login")) {
        setPage("login");
      } else if (hash.startsWith("#menu")) {
        setPage("menu");
      } else if (hash === "" || hash === "#home" || hash === "#") {
        setPage("home");
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [isAdminLoggedIn]);

  useEffect(() => {
    localStorage.setItem("tom-login-lock", JSON.stringify(loginLock));
  }, [loginLock]);

  useEffect(() => {
    localStorage.setItem("tom-admin-session", String(isAdminLoggedIn));
  }, [isAdminLoggedIn]);

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

  const startEditingMechanism = (mechanism) => {
    setEditingMechanismId(mechanism.id);
    setNewMechanism(mechanismToForm(mechanism));
    setFormError("");
    setShowAddForm(true);
  };

  const deleteMechanism = async (id) => {
    const mechanism = mechanisms.find((item) => String(item.id) === String(id));
    if (!mechanism) return;
    if (String(id).startsWith("builtin-")) {
      alert("Built-in core reference models cannot be deleted as they are part of the core syllabus.");
      return;
    }
    if (!window.confirm(`Delete "${mechanism.name}"? This cannot be undone.`)) return;

    await apiDeleteMechanism(id);
    await refreshData();
  };

  const handleApprovePending = async (id) => {
    await approveMechanism(id);
    await refreshData();
  };

  const handleRejectPending = async (id) => {
    if (!window.confirm("Are you sure you want to reject this submission?")) return;
    await rejectMechanism(id);
    await refreshData();
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
    navigateTo("admin");
  };

  const handleLogout = () => {
    setIsAdminLoggedIn(false);
    setLoginForm({ username: "", password: "" });
    navigateTo("home");
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

  const handleAddMechanismSubmit = async (event) => {
    event.preventDefault();

    if (!newMechanism.name || !newMechanism.student_name || !newMechanism.category) {
      setFormError("Please fill in the mechanism name, category, and student name.");
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      const payload = {
        name: newMechanism.name,
        category: newMechanism.category,
        student_name: newMechanism.student_name,
        team_members: newMechanism.team_members || newMechanism.student_name,
        college: newMechanism.college || "NMIET",
        department: newMechanism.department || "Mechanical Engineering",
        short_description: newMechanism.short_description || "Faculty/Admin added mechanism.",
        detailed_description: newMechanism.information || newMechanism.detailed_description || "",
        num_links: Number(newMechanism.links || 4),
        num_joints: Number(newMechanism.joints || 4),
        higher_pairs: Number(newMechanism.higherPairs || 0),
        instructions: (newMechanism.instructions || "")
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
        external_links: newMechanism.video ? [newMechanism.video] : [],
        cover_image: newMechanism.image || "",
        status: "approved",
      };

      if (editingMechanismId) {
        await apiUpdateMechanism(editingMechanismId, payload);
      } else {
        await submitMechanism(payload, {});
      }

      await refreshData();
      setNewMechanism(emptyMechanismForm);
      setEditingMechanismId(null);
      setShowAddForm(false);
    } catch (err) {
      setFormError(err.message || "Failed to save mechanism.");
    } finally {
      setSubmitting(false);
    }
  };

  const navDrawerItems = [
    {
      id: "home",
      page: "home",
      icon: "🏠",
      title: "Home",
      desc: "Showcase overview, kinematic mechanisms & simulator",
      action: () => navigateTo("home"),
    },
    {
      id: "repository",
      page: "repository",
      icon: "🗄️",
      title: "Cloud Repository",
      desc: "All mechanism models, kinematic simulations & data tables",
      badge: `${mechanisms.length} Models`,
      action: () => navigateTo("repository"),
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
        navigateTo("submit");
      },
    },
    {
      id: "vlab",
      page: "vlab",
      icon: "🔬",
      title: "Mechanism Simulator Lab",
      desc: "Adjust links and explore mechanism motion in real time",
      badge: "Interactive",
      action: () => navigateTo("vlab", "#vlab"),
    },
    {
      id: "admin",
      page: isAdminLoggedIn ? "admin" : "login",
      icon: "🛡️",
      title: isAdminLoggedIn ? "Admin Dashboard" : "Admin Portal",
      desc: isAdminLoggedIn ? "Review and moderate student submissions" : "Sign in to access faculty administrative tools",
      badge: isAdminLoggedIn ? "Active" : undefined,
      action: () => navigateTo(isAdminLoggedIn ? "admin" : "login"),
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
        <button type="button" className="brand" onClick={() => { navigateTo("home"); setIsNavMenuOpen(false); }} aria-label="Go to home page">
          <span className="brand-mark">TOM</span>
          <span className="brand-copy">
            <span className="brand-copy__eyebrow">NMIET</span>
            <strong>Theory of Machines</strong>
          </span>
        </button>

        <div className="site-header__actions">
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
                        navigateTo("login");
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
                  <button type="button" className="secondary-btn secondary-btn--cyan" onClick={() => navigateTo("vlab", "#vlab")}>
                    🔬 Four-Bar Virtual Lab
                  </button>
                  <button type="button" className="secondary-btn secondary-btn--purple" onClick={() => navigateTo("repository")}>
                    📚 Cloud Repository
                  </button>
                  <button type="button" className="secondary-btn secondary-btn--emerald" onClick={() => {
                    setNewMechanism(emptyMechanismForm);
                    setFormError("");
                    setEditingMechanismId(null);
                    navigateTo("submit");
                  }}>
                    ➕ Add Mechanism
                  </button>
                  <button type="button" className="secondary-btn secondary-btn--amber" onClick={() => navigateTo(isAdminLoggedIn ? "admin" : "login")}>
                    ⚡ Admin Access
                  </button>
                </div>
              </div>
            </section>


            <section className="home-workbench-section" style={{ marginTop: 36 }}>
              <div className="section-heading-block">
                <h2>Mechanism Simulator</h2>
                <p>Interactive tool to explore how adjusting links and joints changes mechanism movement.</p>
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
                      if (card.action === "VLab") navigateTo("vlab", "#vlab");
                      if (card.action === "Repository" || card.action === "Models") navigateTo("repository");
                      if (card.action === "Login") navigateTo(isAdminLoggedIn ? "admin" : "login");
                      if (card.action === "Submit") {
                        setNewMechanism(emptyMechanismForm);
                        setFormError("");
                        setEditingMechanismId(null);
                        navigateTo("submit");
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
                onClick={() => navigateTo("repository")}
              >
                ← Back to Cloud Repository
              </button>
              <span className="submit-page-badge">
                🏛 NMIET · Department of Mechanical Engineering
              </span>
            </div>

            <MechanismForm
              onCancel={() => navigateTo("repository")}
              onSubmit={async (payload, files) => {
                setSubmitting(true);
                setFormError("");
                const { error } = await submitMechanism(payload, files);
                setSubmitting(false);

                if (error) {
                  setFormError(error.message || "Failed to submit mechanism. Please check your fields and try again.");
                  return;
                }

                await refreshData();
                showToast("🎉 Mechanism published successfully to the Cloud Repository!");
                navigateTo("repository");
              }}
              submitting={submitting}
              formError={formError}
            />
          </section>
        )}

        {page === "vlab" && (
          <section className="vlab-page-shell" style={{ width: "100%", maxWidth: 1320, margin: "0 auto", padding: "0 12px 40px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
              <button
                type="button"
                className="back-btn"
                onClick={() => navigateTo("home")}
              >
                ← Back to Home
              </button>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  type="button"
                  className="secondary-btn secondary-btn--small"
                  onClick={() => navigateTo("repository")}
                >
                  Cloud Repository →
                </button>
                <span className="submit-page-badge">
                  🔬 Theory of Machines Virtual Lab · SPPU Mechanical Engineering
                </span>
              </div>
            </div>
            <FourBarVirtualLab standalone={true} />
          </section>
        )}

        {(page === "repository" || page === "models") && (
          <TomShowcase
            isAdmin={isAdminLoggedIn}
            onRequestAdminLogin={() => navigateTo("login")}
            onRequestAddMechanism={() => { setFormError(""); navigateTo("submit"); }}
          />
        )}

        {page === "login" && (
          isAdminLoggedIn ? (
            <section className="login-shell">
              <div className="login-card" style={{ textAlign: "center" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🛡️</div>
                <h2>Already Signed In</h2>
                <p>You are currently authenticated as an administrator.</p>
                <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24, flexWrap: "wrap" }}>
                  <button className="primary-btn" type="button" onClick={() => navigateTo("admin")}>
                    Open Admin Dashboard →
                  </button>
                  <button className="secondary-btn" type="button" onClick={handleLogout}>
                    Sign Out
                  </button>
                </div>
              </div>
            </section>
          ) : (
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
          )
        )}

        {page === "admin" && !isAdminLoggedIn && (
          <section className="login-shell">
            <div className="login-card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🔒</div>
              <h2>Authentication Required</h2>
              <p>You must sign in with administrator credentials to access the moderation dashboard.</p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24, flexWrap: "wrap" }}>
                <button className="primary-btn" type="button" onClick={() => navigateTo("login")}>
                  Sign In as Admin →
                </button>
                <button className="secondary-btn" type="button" onClick={() => navigateTo("home")}>
                  Back to Home
                </button>
              </div>
            </div>
          </section>
        )}

        {page === "admin" && isAdminLoggedIn && (
          <section className="admin-shell">
            <div className="admin-header">
              <div>
                <h2>Admin &amp; Moderation Dashboard</h2>
                <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "0.9rem" }}>
                  Manage verified curriculum mechanisms and moderate student project submissions.
                </p>
              </div>
              <button
                type="button"
                className="secondary-btn"
                onClick={handleLogout}
              >
                Sign Out
              </button>
            </div>

            <div className="admin-summary">
              <div className="summary-card">
                <span>Approved Models</span>
                <strong>{mechanisms.length}</strong>
              </div>
              <div className="summary-card">
                <span>Pending Review</span>
                <strong style={{ color: pendingMechanisms.length > 0 ? "var(--gold)" : "inherit" }}>
                  {pendingMechanisms.length}
                </strong>
              </div>
              <div className="summary-card">
                <span>Storage Backend</span>
                <strong>{isSupabaseConfigured ? "Supabase Cloud" : "Local Sync Engine"}</strong>
              </div>
            </div>

            {/* ── PENDING SUBMISSIONS QUEUE ── */}
            <div className="admin-panel" style={{ marginBottom: 28 }}>
              <div className="admin-panel__header">
                <div>
                  <h3>Student Submissions Pending Moderation</h3>
                  <span>{pendingMechanisms.length} awaiting faculty review</span>
                </div>
              </div>

              {pendingMechanisms.length === 0 ? (
                <div style={{
                  padding: "32px 20px",
                  textAlign: "center",
                  borderRadius: "16px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px dashed var(--border)",
                  color: "var(--muted)",
                  fontSize: "0.9rem"
                }}>
                  <span style={{ fontSize: "1.6rem", display: "block", marginBottom: 8 }}>✅</span>
                  <strong>All Submissions Cleared</strong>
                  <p style={{ margin: "6px 0 0", fontSize: "0.82rem" }}>
                    There are no pending submissions awaiting approval. Any newly submitted student models will appear here.
                  </p>
                </div>
              ) : (
                <div className="admin-list">
                  {pendingMechanisms.map((pending) => (
                    <div key={pending.id} className="admin-item" style={{ flexDirection: "column", alignItems: "stretch", gap: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                        <div>
                          <strong style={{ fontSize: "1.05rem" }}>{pending.name}</strong>
                          <p style={{ margin: "2px 0 0", color: "var(--muted)", fontSize: "0.85rem" }}>
                            {pending.category} · By {pending.student_name} ({pending.academic_year || "Student"}) · {pending.college || "NMIET"}
                          </p>
                        </div>
                        <span style={{
                          padding: "4px 10px",
                          borderRadius: 999,
                          background: "rgba(251,191,36,0.14)",
                          border: "1px solid rgba(251,191,36,0.3)",
                          color: "var(--gold)",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          textTransform: "uppercase"
                        }}>
                          Pending Review
                        </span>
                      </div>

                      <p style={{ margin: 0, color: "#cbd5e1", fontSize: "0.88rem", lineHeight: 1.5 }}>
                        {pending.short_description || pending.detailed_description || "No description provided."}
                      </p>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--muted)" }}>
                          Links: {pending.num_links ?? 4} | Joints: {pending.num_joints ?? 4} | Higher Pairs: {pending.higher_pairs ?? 0} | DOF: {pending.degrees_of_freedom ?? 1}
                        </span>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            type="button"
                            className="primary-btn"
                            style={{ minHeight: 36, padding: "0 14px", fontSize: "0.82rem" }}
                            onClick={() => handleApprovePending(pending.id)}
                          >
                            ✓ Approve
                          </button>
                          <button
                            type="button"
                            className="danger-btn"
                            style={{ minHeight: 36, padding: "0 14px", fontSize: "0.82rem" }}
                            onClick={() => handleRejectPending(pending.id)}
                          >
                            ✕ Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── APPROVED MECHANISM CATALOG ── */}
            <div className="admin-panel">
              <div className="admin-panel__header">
                <div>
                  <h3>Approved Mechanism Catalog</h3>
                  <span>{mechanisms.length} active models in repository</span>
                </div>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => {
                    setShowAddForm((prev) => !prev);
                    if (showAddForm) {
                      setEditingMechanismId(null);
                      setNewMechanism(emptyMechanismForm);
                    }
                  }}
                >
                  {showAddForm ? "Close Form" : "+ Add Mechanism"}
                </button>
              </div>

              {showAddForm && (
                <form className="mechanism-form" onSubmit={handleAddMechanismSubmit} style={{ marginBottom: 24, borderBottom: "1px solid var(--border)", paddingBottom: 24 }}>
                  <div className="form-heading">
                    <h3>{editingMechanismId ? "Update Mechanism Details" : "Add a Mechanism to Catalog"}</h3>
                  </div>
                  <div className="mechanism-form__grid">
                    <label className="field">
                      <span className="field__label">Mechanism Name *</span>
                      <input name="name" value={newMechanism.name} onChange={handleChange} placeholder="e.g. Quick Return Mechanism" required />
                    </label>

                    <label className="field">
                      <span className="field__label">Category *</span>
                      <select name="category" value={newMechanism.category} onChange={handleChange}>
                        {TOM_CATEGORIES.map((category) => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </label>

                    <label className="field field--full">
                      <span className="field__label">Student / Author Name(s) *</span>
                      <input
                        name="student_name"
                        value={newMechanism.student_name}
                        onChange={handleChange}
                        placeholder="e.g. Aarav Patil, Sakshi Verma (All members in one entry)"
                        required
                      />
                    </label>

                    <label className="field field--full">
                      <span className="field__label">Short Description</span>
                      <input name="short_description" value={newMechanism.short_description} onChange={handleChange} placeholder="Brief project overview" />
                    </label>

                    <label className="field field--full">
                      <span className="field__label">Working Principle &amp; Details</span>
                      <textarea name="information" value={newMechanism.information} onChange={handleChange} rows="3" placeholder="Explain the kinematic function and application" />
                    </label>

                    <label className="field">
                      <span className="field__label">Number of Links (L)</span>
                      <input name="links" type="number" value={newMechanism.links} onChange={handleChange} min="1" />
                    </label>

                    <label className="field">
                      <span className="field__label">Number of Lower Joints (J)</span>
                      <input name="joints" type="number" value={newMechanism.joints} onChange={handleChange} min="0" />
                    </label>

                    <label className="field">
                      <span className="field__label">Number of Higher Pairs (H)</span>
                      <input name="higherPairs" type="number" value={newMechanism.higherPairs} onChange={handleChange} min="0" />
                    </label>

                    <label className="field field--full">
                      <span className="field__label">Video / Embed URL</span>
                      <input name="video" value={newMechanism.video} onChange={handleChange} placeholder="https://youtube.com/watch?v=..." />
                    </label>

                    <label className="field field--full">
                      <span className="field__label">Mechanism Cover Image</span>
                      <input type="file" accept="image/*" onChange={handleImageChange} />
                      {newMechanism.image && <img className="form-image-preview" src={newMechanism.image} alt="Selected mechanism preview" style={{ marginTop: 8 }} />}
                    </label>
                  </div>

                  {formError && <div className="login-error" style={{ marginTop: 12 }}>{formError}</div>}

                  <div className="form-actions" style={{ marginTop: 16 }}>
                    <button type="submit" className="primary-btn" disabled={submitting}>
                      {submitting ? "Saving..." : editingMechanismId ? "Save Changes" : "Create Mechanism"}
                    </button>
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
                {mechanisms.map((mechanism) => {
                  const isBuiltIn = String(mechanism.id).startsWith("builtin-");
                  return (
                    <div key={mechanism.id} className="admin-item">
                      <div>
                        <strong>{mechanism.name}</strong>
                        <p style={{ margin: "2px 0 0", color: "var(--muted)", fontSize: "0.85rem" }}>
                          {mechanism.category} · By {mechanism.student_name || "Faculty / Core"}
                        </p>
                      </div>
                      <div className="admin-item__actions">
                        <span className="admin-item__status" style={{
                          background: isBuiltIn ? "rgba(56, 189, 248, 0.12)" : "rgba(34, 197, 94, 0.12)",
                          borderColor: isBuiltIn ? "rgba(56, 189, 248, 0.25)" : "rgba(34, 197, 94, 0.25)",
                          color: isBuiltIn ? "#38bdf8" : "#86efac"
                        }}>
                          {isBuiltIn ? "Core Reference" : "Approved"}
                        </span>
                        <button
                          type="button"
                          className="secondary-btn secondary-btn--small"
                          onClick={() => startEditingMechanism(mechanism)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="danger-btn"
                          disabled={isBuiltIn}
                          title={isBuiltIn ? "Core reference models cannot be deleted" : "Delete mechanism"}
                          onClick={() => deleteMechanism(mechanism.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
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

      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            bottom: "28px",
            right: "24px",
            zIndex: 9999,
            padding: "14px 22px",
            borderRadius: "14px",
            background: "linear-gradient(135deg, rgba(16, 185, 129, 0.95), rgba(5, 150, 105, 0.95))",
            color: "#ffffff",
            fontWeight: 600,
            fontSize: "0.9rem",
            boxShadow: "0 12px 32px rgba(16, 185, 129, 0.45)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 255, 255, 0.25)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            animation: "tomFadeIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          <span>{toast}</span>
          <button
            type="button"
            onClick={() => setToast("")}
            style={{
              background: "none",
              border: "none",
              color: "#fff",
              cursor: "pointer",
              fontSize: "1.2rem",
              lineHeight: 1,
              padding: "0 0 0 6px",
              opacity: 0.8,
            }}
            aria-label="Close notification"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

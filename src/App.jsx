import { useEffect, useState, useCallback, lazy, Suspense } from "react";
import "./App.css";
import "./tom/tom.css";
const TomShowcase = lazy(() => import("./tom/TomShowcase.jsx"));
import { verifyAdminCredentials, adminSignOut, isSupabaseConfigured } from "./lib/supabaseClient.js";
import { useMechanisms } from "./context/MechanismsContext.jsx";
const LoginPage = lazy(() => import("./pages/LoginPage.jsx"));
const AdminPage = lazy(() => import("./pages/AdminPage.jsx"));
const SubmitPage = lazy(() => import("./pages/SubmitPage.jsx"));
const VLabPage = lazy(() => import("./pages/VLabPage.jsx"));
const StudentAnimationsPage = lazy(() => import("./pages/StudentAnimationsPage.jsx"));
const KinematicWorkbench = lazy(() => import("./tom/KinematicWorkbench.jsx"));
const TomLogo3D = lazy(() => import("./components/TomLogo3D.jsx"));
import TomLogo from "./components/TomLogo.jsx";
import { version as APP_VERSION } from "../package.json";



// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const menuCards = [
  {
    title: "Mechanism Simulator Lab",
    copy: "Interactive four-bar simulator: adjust link lengths and watch how the mechanism moves in real time.",
    action: "VLab",
    badge: "Interactive Lab",
  },
  {
    title: "Explore Mechanisms",
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

function getInitialPage() {
  try {
    const hash = window.location.hash.toLowerCase();
    if (hash.startsWith("#repository") || hash.startsWith("#mechanism/")) return "repository";
    if (hash.startsWith("#submit")) return "submit";
    if (hash.startsWith("#animation") || hash.startsWith("#animations") || hash.startsWith("#student-animation") || hash.startsWith("#dof")) return "animations";
    if (hash.startsWith("#vlab") || hash.startsWith("#lab") || hash.startsWith("#virtual-lab")) return "vlab";
    if (hash.startsWith("#admin")) return localStorage.getItem("tom-admin-session") === "true" ? "admin" : "login";
    if (hash.startsWith("#login")) return "login";
    if (hash.startsWith("#menu")) return "menu";
    return "home";
  } catch {
    return "home";
  }
}

// ─── ROOT COMPONENT ──────────────────────────────────────────────────────────

export default function App() {
  // Mechanism data comes from context (single shared fetch)
  const { mechanisms } = useMechanisms();

  // ── Auth / routing state ────────────────────────────────────────────────
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => {
    try { return localStorage.getItem("tom-admin-session") === "true"; } catch { return false; }
  });
  const [page, setPage] = useState(getInitialPage);
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

  // ── UI state ────────────────────────────────────────────────────────────
  const [isNavMenuOpen, setIsNavMenuOpen] = useState(false);
  const [toast, setToast] = useState("");

  // ── Helpers ─────────────────────────────────────────────────────────────
  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4500);
  }, []);

  const navigateTo = useCallback((targetPage, customHash) => {
    setPage(targetPage);
    window.location.hash = customHash || targetPage;
  }, []);

  // ── Persistence effects ─────────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem("tom-login-lock", JSON.stringify(loginLock));
  }, [loginLock]);

  useEffect(() => {
    localStorage.setItem("tom-admin-session", String(isAdminLoggedIn));
  }, [isAdminLoggedIn]);

  // ── Hash-based routing ──────────────────────────────────────────────────
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash.startsWith("#repository") || hash.startsWith("#mechanism/")) {
        setPage("repository");
      } else if (hash.startsWith("#submit")) {
        setPage("submit");
      } else if (hash.startsWith("#animation") || hash.startsWith("#animations") || hash.startsWith("#student-animation") || hash.startsWith("#dof")) {
        setPage("animations");
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

  // ── Nav-drawer keyboard / scroll lock ──────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === "Escape") setIsNavMenuOpen(false); };
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

  // ── Auth handlers ───────────────────────────────────────────────────────
  const handleLoginSubmit = async (username, password) => {
    const now = Date.now();
    if (loginLock.lockedUntil > now) {
      const secondsLeft = Math.ceil((loginLock.lockedUntil - now) / 1000);
      setLoginError(`Too many attempts. Please wait ${secondsLeft}s and try again.`);
      return;
    }

    const authRes = await verifyAdminCredentials(username, password);

    if (!authRes?.success) {
      const attempts = loginLock.attempts + 1;
      if (attempts >= LOGIN_MAX_ATTEMPTS) {
        setLoginLock({ attempts: 0, lockedUntil: Date.now() + LOGIN_LOCKOUT_MS });
        setLoginError(`Too many attempts. Please wait ${Math.ceil(LOGIN_LOCKOUT_MS / 1000)}s and try again.`);
      } else {
        setLoginLock({ attempts, lockedUntil: 0 });
        setLoginError(
          authRes?.error || `Invalid admin credentials. (${LOGIN_MAX_ATTEMPTS - attempts} attempt(s) left before lockout)`
        );
      }
      return;
    }

    setLoginLock({ attempts: 0, lockedUntil: 0 });
    setLoginError("");
    setIsAdminLoggedIn(true);
    showToast(authRes.authMode === "supabase" ? "⚡ Signed in via Supabase Cloud Auth" : "⚡ Signed in via Admin Session");
    navigateTo("admin");
  };

  const handleLogout = async () => {
    await adminSignOut();
    setIsAdminLoggedIn(false);
    showToast("Signed out.");
    navigateTo("home");
  };

  // ── Nav drawer items ────────────────────────────────────────────────────
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
      title: "Explore Mechanisms",
      desc: "All mechanism models, kinematic simulations & data tables",
      badge: `${mechanisms.length} Models`,
      action: () => navigateTo("repository"),
    },
    {
      id: "submit",
      page: "submit",
      icon: "➕",
      title: "Add Mechanism",
      desc: "Submit student mechanism model with photos, video & linkage pairs",
      action: () => navigateTo("submit"),
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
      desc: isAdminLoggedIn
        ? "Review and moderate student submissions"
        : "Sign in to access faculty administrative tools",
      badge: isAdminLoggedIn ? "Active" : undefined,
      action: () => navigateTo(isAdminLoggedIn ? "admin" : "login"),
    },
  ];


  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="app-shell">
      {/* ── FIXED TOP NAVIGATION HEADER ── */}
      <header className="site-header">
        <div className="site-header__inner">
          <button
            type="button"
            className="brand"
            onClick={() => { navigateTo("home"); setIsNavMenuOpen(false); }}
            aria-label="Go to home page"
          >
            <span className="brand-mark">
              <TomLogo size={32} />
            </span>
            <span className="brand-copy">
              <span className="brand-copy__eyebrow">PCET's NMIET</span>
              <strong>Theory of Machines</strong>
            </span>
          </button>

          {/* Desktop Navigation Links */}
          <nav className="main-nav desktop-only-nav" aria-label="Main Navigation">
            <button
              type="button"
              className={`main-nav__button${page === "home" ? " main-nav__button--active" : ""}`}
              onClick={() => navigateTo("home")}
            >
              Home
            </button>
            <button
              type="button"
              className={`main-nav__button${page === "vlab" ? " main-nav__button--active" : ""}`}
              onClick={() => navigateTo("vlab", "#vlab")}
            >
              🔬 Virtual Lab
            </button>
            <button
              type="button"
              className={`main-nav__button${page === "repository" ? " main-nav__button--active" : ""}`}
              onClick={() => navigateTo("repository")}
            >
              📚 Explore Mechanisms
            </button>
            <button
              type="button"
              className={`main-nav__button${page === "submit" ? " main-nav__button--active" : ""}`}
              onClick={() => navigateTo("submit")}
            >
              ➕ Submit Project
            </button>
            <button
              type="button"
              className={`main-nav__button${page === "admin" || page === "login" ? " main-nav__button--active" : ""}`}
              onClick={() => navigateTo(isAdminLoggedIn ? "admin" : "login")}
            >
              {isAdminLoggedIn ? "⚡ Admin Dashboard" : "Admin Login"}
            </button>
          </nav>

          <div className="site-header__actions">
            {/* Hamburger Menu Toggle for Mobile */}
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
        </div>
      </header>

      {/* ── APP BODY CONTENT WRAPPER ── */}
      <div className="app-body-content">
      {/* ── NAV DRAWER ── */}
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
                <span className="brand-mark">
                  <TomLogo size={32} />
                </span>
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
                    onClick={() => { item.action(); setIsNavMenuOpen(false); }}
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
                  <span>v{APP_VERSION}</span>
                </div>
                <div className="nav-drawer__actions" style={{ marginTop: 14 }}>
                  {isAdminLoggedIn ? (
                    <button
                      type="button"
                      className="button button--danger"
                      style={{ width: "100%", justifyContent: "center" }}
                      onClick={() => { handleLogout(); setIsNavMenuOpen(false); }}
                    >
                      Logout Admin
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="primary-btn"
                      style={{ width: "100%", justifyContent: "center" }}
                      onClick={() => { navigateTo("login"); setIsNavMenuOpen(false); }}
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

      {/* ── MAIN ── */}
      <main className="app-layout">
        <Suspense fallback={<div style={{ padding: "40px", textAlign: "center", color: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", height: "50vh" }}>⚙️ Loading modules...</div>}>

        {/* HOME */}
        {page === "home" && (
          <div className="home-container">
            {/* HERO SECTION */}
            <section className="home-hero">
              <div className="home-hero__badge">
                <span className="home-hero__dot" />
                <span>PCET's NMIET · SPPU Department of Mechanical Engineering</span>
              </div>

              <h1 className="home-hero__title">
                Theory of Machines <span>Showcase</span>
              </h1>

              <p className="home-hero__subtitle">
                Interactive kinematic simulations, student mechanical innovations, and planar linkage analysis.
              </p>

              <p className="home-hero__copy">
                A dedicated academic portal for the Savitribai Phule Pune University (SPPU) Mechanical Engineering curriculum.
                Analyze four-bar planar linkages, verify Grashof mobility criteria, and explore student-built physical mechanism models.
              </p>

              <div className="home-hero__actions">
                <button
                  type="button"
                  className="primary-btn home-hero__cta-primary"
                  onClick={() => navigateTo("vlab", "#vlab")}
                >
                  🔬 Launch Four-Bar Virtual Lab →
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => navigateTo("repository")}
                >
                  📚 Explore Mechanisms ({mechanisms.length})
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => navigateTo("submit")}
                >
                  ➕ Submit Project
                </button>
              </div>
            </section>

            {/* CORE MODULES SECTION */}
            <section className="home-modules-section">
              <div className="home-section-header">
                <span className="home-section-tag">Laboratory Portals</span>
                <h2 className="home-section-title">Explore Theory of Machines Hub</h2>
                <p className="home-section-desc">
                  Explore interactive simulation tools, student mechanical projects, and academic resources.
                </p>
              </div>

              <div className="home-modules-grid">
                {/* PORTAL 1: VIRTUAL LAB */}
                <div className="home-module-card">
                  <div className="home-module-card__header">
                    <span className="home-module-card__icon">🔬</span>
                    <span className="home-module-card__badge home-module-card__badge--cyan">Simulation Lab</span>
                  </div>
                  <h3 className="home-module-card__title">Four-Bar Virtual Lab</h3>
                  <p className="home-module-card__copy">
                    Interactive real-time four-bar kinematic simulator. Adjust ground, crank, coupler, and rocker dimensions to observe dynamic continuous or oscillating motion.
                  </p>
                  <ul className="home-module-card__features">
                    <li>✓ Grashof criterion classification ($S+L \le P+Q$)</li>
                    <li>✓ Real-time transmission angle (&mu;) readout</li>
                    <li>✓ Continuous coupler curve path tracing at 60 FPS</li>
                  </ul>
                  <button
                    type="button"
                    className="primary-btn home-module-card__btn"
                    onClick={() => navigateTo("vlab", "#vlab")}
                  >
                    Open Virtual Lab →
                  </button>
                </div>

                {/* PORTAL 2: EXPLORE REPOSITORY */}
                <div className="home-module-card">
                  <div className="home-module-card__header">
                    <span className="home-module-card__icon">📚</span>
                    <span className="home-module-card__badge home-module-card__badge--purple">{mechanisms.length} Models Verified</span>
                  </div>
                  <h3 className="home-module-card__title">Explore Mechanisms</h3>
                  <p className="home-module-card__copy">
                    Browse the curated library of mechanical mechanisms designed by TE Mechanical students, complete with photo galleries, video demonstrations, and motion specifications.
                  </p>
                  <ul className="home-module-card__features">
                    <li>✓ Linkage pairs, joints, and mobility parameters</li>
                    <li>✓ Demonstration videos and high-res project photos</li>
                    <li>✓ Student creator attributions and year batches</li>
                  </ul>
                  <button
                    type="button"
                    className="secondary-btn home-module-card__btn"
                    onClick={() => navigateTo("repository")}
                  >
                    Browse Mechanism Models →
                  </button>
                </div>

                {/* PORTAL 3: STUDENT SUBMISSION */}
                <div className="home-module-card">
                  <div className="home-module-card__header">
                    <span className="home-module-card__icon">➕</span>
                    <span className="home-module-card__badge home-module-card__badge--emerald">Student Contribution</span>
                  </div>
                  <h3 className="home-module-card__title">Submit a Mechanism</h3>
                  <p className="home-module-card__copy">
                    Are you a student in the Theory of Machines lab? Document your physical model, upload photos and project reports, and submit it for faculty review.
                  </p>
                  <ul className="home-module-card__features">
                    <li>✓ Structured project submission workflow</li>
                    <li>✓ Automatic mobility calculation via Grübler's formula</li>
                    <li>✓ Faculty moderation and showcase publishing</li>
                  </ul>
                  <button
                    type="button"
                    className="secondary-btn home-module-card__btn"
                    onClick={() => navigateTo("submit")}
                  >
                    Submit Project Model →
                  </button>
                </div>
              </div>
            </section>

            {/* MOBILITY & DOF SIMULATOR SECTION */}
            <section className="home-workbench-section" style={{ marginTop: 40, marginBottom: 40 }}>
              <div className="home-section-header">
                <span className="home-section-tag">Interactive Mobility Engine</span>
                <h2 className="home-section-title">Mechanism Mobility &amp; DOF Calculator</h2>
                <p className="home-section-desc">
                  Explore how adjusting links, joints, and higher pairs changes mechanism degrees of freedom.
                </p>
              </div>
              <KinematicWorkbench />
            </section>

            {/* CURRICULUM FOUNDATIONS SECTION */}
            <section className="home-pillars-section">
              <div className="home-section-header">
                <span className="home-section-tag">SPPU Mechanical Engineering</span>
                <h2 className="home-section-title">Core Kinematic Foundations</h2>
                <p className="home-section-desc">
                  Rigorous engineering principles implemented directly into our kinematic simulation engines.
                </p>
              </div>

              <div className="home-pillars-grid">
                <div className="home-pillar-card">
                  <div className="home-pillar-card__icon">⚙️</div>
                  <h4>Grübler's Mobility Criterion</h4>
                  <p>
                    Degree of freedom calculated through <code>F = 3(n - 1) - 2j - h</code> to distinguish between rigid structures, constrained mechanisms (F = 1), and unconstrained chains.
                  </p>
                </div>
                <div className="home-pillar-card">
                  <div className="home-pillar-card__icon">📐</div>
                  <h4>Grashof Condition</h4>
                  <p>
                    Evaluates link lengths <code>S + L ≤ P + Q</code> to guarantee continuous 360° input crank rotation, classifying linkages into Crank-Rocker, Double-Crank, or Rocker-Rocker.
                  </p>
                </div>
                <div className="home-pillar-card">
                  <div className="home-pillar-card__icon">🎯</div>
                  <h4>Transmission Angle (&mu;)</h4>
                  <p>
                    Monitors the angle between the coupler and output rocker throughout the full cycle, ensuring optimum torque transfer and preventing dead-center locking.
                  </p>
                </div>
                <div className="home-pillar-card">
                  <div className="home-pillar-card__icon">🛡️</div>
                  <h4>Faculty Moderation</h4>
                  <p>
                    Every student project submission is reviewed, validated for kinematic accuracy, and approved by NMIET department faculty before public inclusion.
                  </p>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* MENU */}
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
                      if (card.action === "Animations") navigateTo("animations", "#animations");
                      if (card.action === "VLab") navigateTo("vlab", "#vlab");
                      if (card.action === "Repository" || card.action === "Models") navigateTo("repository");
                      if (card.action === "Login") navigateTo(isAdminLoggedIn ? "admin" : "login");
                      if (card.action === "Submit") navigateTo("submit");
                    }}
                  >
                    Open →
                  </button>
                </article>
              ))}
            </section>
          </>
        )}

        {/* STUDENT CUSTOM ANIMATIONS */}
        {page === "animations" && (
          <StudentAnimationsPage onNavigate={navigateTo} />
        )}

        {/* SUBMIT */}
        {page === "submit" && (
          <SubmitPage
            onNavigate={navigateTo}
            showToast={showToast}
          />
        )}

        {/* VIRTUAL LAB */}
        {page === "vlab" && (
          <VLabPage onNavigate={navigateTo} />
        )}

        {/* REPOSITORY */}
        {(page === "repository" || page === "models") && (
          <TomShowcase
            isAdmin={isAdminLoggedIn}
            onRequestAdminLogin={() => navigateTo("login")}
            onRequestAddMechanism={() => navigateTo("submit")}
          />
        )}


        {/* LOGIN */}
        {page === "login" && (
          <LoginPage
            isAdminLoggedIn={isAdminLoggedIn}
            loginError={loginError}
            loginLock={loginLock}
            onLoginSubmit={handleLoginSubmit}
            onLogout={handleLogout}
            onNavigate={navigateTo}
          />
        )}

        {/* ADMIN — unauthenticated guard */}
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

        {/* ADMIN — dashboard */}
        {page === "admin" && isAdminLoggedIn && (
          <AdminPage onLogout={handleLogout} onNavigate={navigateTo} showToast={showToast} />
        )}
        </Suspense>
      </main>

      {/* ── FOOTER ── */}
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

      {/* ── TOAST ── */}
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


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
      <div className="app-noise" aria-hidden="true" />
      <div className="app-orbs" aria-hidden="true">
        <div className="app-orb app-orb--violet" />
        <div className="app-orb app-orb--gold" />
        <div className="app-orb app-orb--green" />
      </div>

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
              <span className="brand-copy__eyebrow">NMIET</span>
              <strong>Theory of Machines</strong>
            </span>
          </button>

          <div className="site-header__actions">
            {/* Hamburger Menu Toggle */}
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
        {/* ── TELEMETRY BAR ── */}
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
              <span className="telemetry-item">BUILD: v{APP_VERSION}</span>
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
          <>
            {/* FIXED 3D BACKGROUND */}
            <div className="hero-3d-bg" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: -1, opacity: 1 }}>
              <Suspense fallback={<div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#38bdf8" }}>Loading Interactive Background...</div>}>
                <TomLogo3D />
              </Suspense>
            </div>

            <section className="hero-panel" style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative", minHeight: "80vh", justifyContent: "center", background: "transparent", border: "none", boxShadow: "none", maxWidth: "100%" }}>
              
              <div className="hero-copy-block" style={{ zIndex: 2, position: "relative", marginTop: 0, background: "rgba(3, 7, 18, 0.7)", padding: "2.5rem", borderRadius: "28px", backdropFilter: "blur(16px)", border: "1px solid rgba(255, 255, 255, 0.1)", maxWidth: "100%", width: "100%", overflow: "hidden", boxShadow: "0 12px 40px rgba(0,0,0,0.5)" }}>
                <div className="hero-badge" style={{ margin: "0 auto 1.5rem auto", background: "rgba(0,0,0,0.4)" }}>
                  <span className="hero-badge__dot" />
                  TE Mech · 2025-28 Batch
                </div>

                <h1 className="hero-title">
                  Theory of Machines <span>Showcase</span>
                </h1>

                <p className="hero-subtitle">Motion, linkages, and mechanical design in a refined academic display.</p>

                <p className="hero-copy">
                  A polished collection of mechanism studies, student projects, and kinematic models designed to explain
                  how machines move, transfer force, and solve engineering challenges with clarity.
                </p>

                <div className="cta-row">
                  <button type="button" className="primary-btn" onClick={() => setIsNavMenuOpen(true)}>
                    Explore Menu ☰
                  </button>
                  <button
                    type="button"
                    className="secondary-btn secondary-btn--cyan"
                    onClick={() => navigateTo("vlab", "#vlab")}
                  >
                    🔬 Four-Bar Virtual Lab
                  </button>
                  <button
                    type="button"
                    className="secondary-btn secondary-btn--purple"
                    onClick={() => navigateTo("repository")}
                  >
                    📚 Cloud Repository
                  </button>
                  <button
                    type="button"
                    className="secondary-btn secondary-btn--emerald"
                    onClick={() => navigateTo("submit")}
                  >
                    ➕ Add Mechanism
                  </button>
                  <button
                    type="button"
                    className="secondary-btn secondary-btn--amber"
                    onClick={() => navigateTo(isAdminLoggedIn ? "admin" : "login")}
                  >
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


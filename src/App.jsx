import { useEffect, useState } from "react";
import { ADMIN_KEY, ADMIN_PASSWORD, isSupabaseConfigured } from "./lib/supabaseClient";
import TomShowcase from "./tom/TomShowcase.jsx";
import "./App.css";
import "./tom/tom.css";

// ─── PARALLAX ORBS HOOK ───────────────────────────────────────────────────────
function useParallaxOrbs() {
  useEffect(() => {
    const violet = document.querySelector(".app-orb--violet");
    const gold   = document.querySelector(".app-orb--gold");
    const green  = document.querySelector(".app-orb--green");
    if (!violet || !gold || !green) return;

    const onMove = (e) => {
      const cx = (e.clientX / window.innerWidth  - 0.5) * 2;
      const cy = (e.clientY / window.innerHeight - 0.5) * 2;
      violet.style.transform = `translate(${cx * 24}px, ${cy * 18}px)`;
      gold.style.transform   = `translate(${cx * -18}px, ${cy * 12}px)`;
      green.style.transform  = `translate(${cx * 10}px, ${cy * -8}px)`;
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);
}

// ─── LOGIN MODAL ──────────────────────────────────────────────────────────────
function LoginModal({ loginPassword, setLoginPassword, loginError, onLogin, onClose }) {
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal__icon-wrap" aria-hidden="true">🔐</div>
        <h2 className="modal__title">Admin Login</h2>
        <p className="modal__subtitle">Enter your password to access the admin panel.</p>
        <div className="modal__form">
          <div className="modal__input-wrap">
            <input
              type="password"
              className="modal__input"
              placeholder="Admin password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onLogin()}
              autoFocus
            />
            <span className="modal__input-icon">🔑</span>
          </div>
          {loginError && <div className="modal__error">{loginError}</div>}
          <div className="modal__actions">
            <button type="button" className="button button--primary" onClick={onLogin}>
              Login
            </button>
            <button type="button" className="button button--ghost" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(() =>
    typeof window !== "undefined" && localStorage.getItem(ADMIN_KEY) === "true"
  );
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [toast, setToast] = useState("");

  useParallaxOrbs();

  function flash(message) {
    setToast(message);
    setTimeout(() => setToast(""), 3000);
  }

  function handleLogin() {
    setLoginError("");
    if (loginPassword === ADMIN_PASSWORD) {
      localStorage.setItem(ADMIN_KEY, "true");
      setIsAdmin(true);
      setShowLoginModal(false);
      setLoginPassword("");
      flash("Admin access granted!");
    } else {
      setLoginError("Incorrect password");
      setLoginPassword("");
    }
  }

  function handleLogout() {
    localStorage.removeItem(ADMIN_KEY);
    setIsAdmin(false);
    flash("Logged out.");
  }

  return (
    <>
      <div className="app-shell">
        {showLoginModal && !isAdmin && (
          <LoginModal
            loginPassword={loginPassword}
            setLoginPassword={setLoginPassword}
            loginError={loginError}
            onLogin={handleLogin}
            onClose={() => { setShowLoginModal(false); setLoginError(""); setLoginPassword(""); }}
          />
        )}

        <div className="app-noise" aria-hidden="true" />
        <div className="app-orbs" aria-hidden="true">
          <div className="app-orb app-orb--violet" />
          <div className="app-orb app-orb--gold" />
          <div className="app-orb app-orb--green" />
        </div>

        {/* ── FIXED TOP-RIGHT ADMIN NAV ──────────────────────────────────── */}
        <div className="top-nav">
          <div className="section-tabs" role="tablist" aria-label="TOM showcase">
            <span className="section-tab section-tab--active">⚙️ TOM Mechanism Showcase</span>
          </div>
          {isAdmin ? (
            <>
              <span className="admin-badge">⚡ Admin</span>
              <button className="button button--ghost top-nav__btn" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <button type="button" className="top-nav__login" onClick={() => setShowLoginModal(true)}>
              <span className="top-nav__login-icon">🔐</span>
              Admin Login
            </button>
          )}
        </div>

        <div className="app-layout">
          {toast && <div className="toast toast--success">{toast}</div>}

          {!isSupabaseConfigured && (
            <div style={{
              padding: "14px 20px", marginBottom: 16,
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 16, color: "#fca5a5", fontSize: "0.9rem",
            }}>
              ⚠️ Supabase isn't configured — add <code>VITE_SUPABASE_URL</code> and{" "}
              <code>VITE_SUPABASE_ANON</code> to your <code>.env</code> file, then restart the dev server.
            </div>
          )}

          <TomShowcase isAdmin={isAdmin} onRequestAdminLogin={() => setShowLoginModal(true)} />
        </div>
      </div>
    </>
  );
}

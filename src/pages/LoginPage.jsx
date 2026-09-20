import { useEffect, useState } from "react";

/**
 * Admin login page.
 * Manages its own form state; calls onLoginSubmit(username, password).
 * Lockout display is driven by the loginLock prop from App.jsx
 * (persisted to localStorage so it survives remounts).
 */
export default function LoginPage({
  isAdminLoggedIn,
  loginError,
  loginLock,
  onLoginSubmit,
  onLogout,
  onNavigate,
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (loginLock.lockedUntil <= now) return;
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [loginLock.lockedUntil, now]);

  const isLocked = loginLock.lockedUntil > now;

  function handleSubmit(e) {
    e.preventDefault();
    onLoginSubmit(username, password);
  }

  if (isAdminLoggedIn) {
    return (
      <section className="login-shell">
        <div className="login-card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🛡️</div>
          <h2>Already Signed In</h2>
          <p>You are currently authenticated as an administrator.</p>
          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              marginTop: 24,
              flexWrap: "wrap",
            }}
          >
            <button
              className="primary-btn"
              type="button"
              onClick={() => onNavigate("admin")}
            >
              Open Admin Dashboard →
            </button>
            <button className="secondary-btn" type="button" onClick={onLogout}>
              Sign Out
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="login-shell">
      <div className="login-card">
        <h2>Admin Login</h2>
        <p>Use the control panel to review and manage the TOM showcase securely.</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="field">
            <span className="field__label">Admin Email or Username</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="faculty@nmiet.edu.in or admin"
              autoComplete="username"
              disabled={isLocked}
            />
          </label>

          <label className="field">
            <span className="field__label">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={isLocked}
            />
          </label>

          {loginError && <div className="login-error">{loginError}</div>}

          <button
            className="primary-btn login-submit"
            type="submit"
            disabled={isLocked}
          >
            Login to Dashboard
          </button>
        </form>
      </div>
    </section>
  );
}

import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught application error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.hash = "#home";
      window.location.reload();
    }
  };

  handleClearCache = () => {
    try {
      localStorage.removeItem("tom-local-mechanisms");
      localStorage.removeItem("tom-login-lock");
    } catch {
      // ignore
    }
    window.location.hash = "#home";
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#07070d",
            color: "#e2e8f0",
            fontFamily: "'DM Sans', sans-serif",
            padding: "24px",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              maxWidth: "520px",
              width: "100%",
              padding: "36px 32px",
              borderRadius: "20px",
              background: "rgba(15, 18, 28, 0.95)",
              border: "1px solid rgba(248, 113, 113, 0.3)",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                margin: "0 auto 18px",
                borderRadius: "16px",
                background: "rgba(248, 113, 113, 0.12)",
                border: "1px solid rgba(248, 113, 113, 0.3)",
                display: "grid",
                placeItems: "center",
                fontSize: "30px",
              }}
            >
              ⚙️
            </div>

            <span
              style={{
                display: "inline-block",
                padding: "4px 12px",
                borderRadius: "999px",
                background: "rgba(248, 113, 113, 0.12)",
                border: "1px solid rgba(248, 113, 113, 0.25)",
                color: "#f87171",
                fontFamily: "'DM Mono', monospace",
                fontSize: "0.74rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: "12px",
              }}
            >
              System Safeguard Triggered
            </span>

            <h2 style={{ margin: "0 0 8px", fontSize: "1.45rem", color: "#f8fafc" }}>
              Showcase Encountered an Error
            </h2>

            <p style={{ margin: "0 0 20px", color: "#94a3b8", fontSize: "0.92rem", lineHeight: 1.5 }}>
              An unexpected issue occurred while rendering this view. Your saved mechanisms are secure.
            </p>

            {this.state.error?.message && (
              <pre
                style={{
                  textAlign: "left",
                  padding: "12px 14px",
                  borderRadius: "10px",
                  background: "rgba(0, 0, 0, 0.5)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  color: "#fca5a5",
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "0.78rem",
                  overflowX: "auto",
                  margin: "0 0 24px",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {this.state.error.message}
              </pre>
            )}

            <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  padding: "10px 22px",
                  borderRadius: "10px",
                  border: "none",
                  background: "linear-gradient(135deg, #0284c7, #4f46e5)",
                  color: "#ffffff",
                  fontWeight: 600,
                  fontSize: "0.88rem",
                  cursor: "pointer",
                }}
              >
                Reload Showcase
              </button>

              <button
                type="button"
                onClick={this.handleClearCache}
                style={{
                  padding: "10px 18px",
                  borderRadius: "10px",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  background: "rgba(255, 255, 255, 0.04)",
                  color: "#cbd5e1",
                  fontWeight: 500,
                  fontSize: "0.88rem",
                  cursor: "pointer",
                }}
              >
                Clear Local Cache &amp; Reset
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

import FourBarVirtualLab from "../tom/FourBarVirtualLab.jsx";
import ErrorBoundary from "../ErrorBoundary.jsx";

/**
 * Virtual Lab page shell — wraps FourBarVirtualLab with back/nav buttons.
 */
export default function VLabPage({ onNavigate }) {
  return (
    <section
      className="vlab-page-shell"
      style={{ width: "100%", maxWidth: 1320, margin: "0 auto", padding: "0 12px 40px" }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <button type="button" className="back-btn" onClick={() => onNavigate("home")}>
          ← Back to Home
        </button>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            type="button"
            className="secondary-btn secondary-btn--small"
            onClick={() => onNavigate("repository")}
          >
            Explore Mechanisms →
          </button>
          <span className="submit-page-badge">
            🔬 Theory of Machines Virtual Lab · SPPU Mechanical Engineering
          </span>
        </div>
      </div>

      <ErrorBoundary onReset={() => window.location.reload()}>
        <FourBarVirtualLab standalone={true} />
      </ErrorBoundary>
    </section>
  );
}

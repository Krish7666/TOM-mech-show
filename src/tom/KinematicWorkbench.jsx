import { useState } from "react";
import { analyzeMechanism } from "./kinematics";
import MechanismPreview from "./MechanismPreview";
import FourBarVirtualLab from "./FourBarVirtualLab";

const PRESETS = [
  { name: "Four-Bar Linkage", links: 4, joints: 4, higherPairs: 0, category: "Linkages" },
  { name: "Slider-Crank Linkage", links: 4, joints: 4, higherPairs: 0, category: "Slider-crank" },
  { name: "Cam & Roller Follower", links: 3, joints: 2, higherPairs: 1, category: "Cam mechanisms" },
  { name: "Gear Train (Meshed Pair)", links: 3, joints: 2, higherPairs: 1, category: "Gear mechanisms" },
  { name: "Ackermann Steering", links: 6, joints: 7, higherPairs: 0, category: "Steering mechanisms" },
  { name: "Five-Bar 2-DOF Linkage", links: 5, joints: 5, higherPairs: 0, category: "Robotics / Multi-DOF" },
  { name: "Rigid Triangular Truss", links: 3, joints: 3, higherPairs: 0, category: "Structure" },
];

export default function KinematicWorkbench({ initialMechanism = null, onApply = null }) {
  const [activeTool, setActiveTool] = useState("mobility"); // "mobility" | "vlab"
  const [links, setLinks] = useState(initialMechanism?.dofInputs?.links ?? initialMechanism?.links ?? initialMechanism?.num_links ?? 4);
  const [joints, setJoints] = useState(initialMechanism?.dofInputs?.joints ?? initialMechanism?.joints ?? initialMechanism?.num_joints ?? 4);
  const [higherPairs, setHigherPairs] = useState(initialMechanism?.dofInputs?.higherPairs ?? initialMechanism?.higherPairs ?? initialMechanism?.higher_pairs ?? 0);
  const [selectedPreset, setSelectedPreset] = useState("Four-Bar Linkage");

  const analysis = analyzeMechanism({
    links,
    joints,
    higherPairs,
    name: initialMechanism?.name || selectedPreset || "Custom Kinematic System",
    category: initialMechanism?.category || "Linkages",
  });

  const handlePresetSelect = (preset) => {
    setSelectedPreset(preset.name);
    setLinks(preset.links);
    setJoints(preset.joints);
    setHigherPairs(preset.higherPairs);
  };

  const handleReset = () => {
    setLinks(4);
    setJoints(4);
    setHigherPairs(0);
    setSelectedPreset("Four-Bar Linkage");
  };

  return (
    <div className="kinematic-workbench">
      <div className="workbench-header">
        <div>
          <h3 className="workbench-title">Movement &amp; Mobility Calculator</h3>
          <p className="workbench-subtitle">
            See how many independent motions a mechanism has based on its parts and joints.
          </p>
        </div>

        <div className="workbench-actions">
          <button type="button" className="secondary-btn secondary-btn--small" onClick={handleReset}>
            Reset (4 Links, 4 Joints)
          </button>
          {onApply && (
            <button
              type="button"
              className="primary-btn"
              onClick={() => onApply({ links, joints, higherPairs, analysis })}
            >
              Apply to Model
            </button>
          )}
        </div>
      </div>

      {/* ── WORKBENCH MODE SWITCHER ── */}
      <div style={{ display: "flex", gap: "10px", margin: "16px 0 20px 0", flexWrap: "wrap", alignItems: "center" }}>
        <button
          type="button"
          className={`button ${activeTool === "mobility" ? "button--primary" : "button--secondary"}`}
          style={{ fontSize: "0.85rem", padding: "8px 16px" }}
          onClick={() => setActiveTool("mobility")}
        >
          ⚙️ Mobility &amp; DOF Calculator
        </button>
        <button
          type="button"
          className={`button ${activeTool === "vlab" ? "button--primary" : "button--secondary"}`}
          style={{ fontSize: "0.85rem", padding: "8px 16px", borderColor: "rgba(56, 189, 248, 0.4)", color: activeTool === "vlab" ? "#fff" : "#38bdf8" }}
          onClick={() => setActiveTool("vlab")}
        >
          🔬 Four-Bar Virtual Lab (Grashof &amp; Coupler Curves)
        </button>
      </div>

      {activeTool === "vlab" ? (
        <div style={{ marginTop: 8 }}>
          <FourBarVirtualLab />
        </div>
      ) : (
        <>
          {/* ── PRESETS ──────────────────────────────────────────────────────── */}
          <div className="workbench-presets">
            <span className="workbench-presets__label">Quick Presets:</span>
            <div className="workbench-presets__list" style={{ display: "flex", flexWrap: "wrap", gap: "6px", width: "100%", alignItems: "center" }}>
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  className={`preset-pill${selectedPreset === preset.name ? " preset-pill--active" : ""}`}
                  onClick={() => handlePresetSelect(preset)}
                >
                  {preset.name}
                </button>
              ))}
              {selectedPreset === "Four-Bar Linkage" && (
                <button
                  type="button"
                  className="button button--secondary button--toolbar"
                  style={{ fontSize: "0.78rem", padding: "4px 12px", borderColor: "rgba(56, 189, 248, 0.4)", color: "#38bdf8", marginLeft: "auto" }}
                  onClick={() => setActiveTool("vlab")}
                >
                  🔬 Launch Four-Bar Virtual Lab →
                </button>
              )}
            </div>
          </div>

          {/* ── DUAL COLUMN WORKBENCH ────────────────────────────────────────── */}
          <div className="workbench-grid">
        {/* Controls Column */}
        <div className="workbench-controls-card">
          <h4 className="workbench-card-title">Linkage Parameters</h4>

          <div className="workbench-slider-group">
            <div className="slider-header">
              <label htmlFor="wb-links">Number of Parts / Links</label>
              <span className="slider-value">{links}</span>
            </div>
            <input
              id="wb-links"
              type="range"
              min="2"
              max="12"
              value={links}
              onChange={(e) => {
                setLinks(Number(e.target.value));
                setSelectedPreset("");
              }}
              className="workbench-slider"
            />
            <span className="slider-hint">Number of rigid bars or parts forming the mechanism.</span>
          </div>

          <div className="workbench-slider-group">
            <div className="slider-header">
              <label htmlFor="wb-joints">Number of Joints</label>
              <span className="slider-value">{joints}</span>
            </div>
            <input
              id="wb-joints"
              type="range"
              min="1"
              max="16"
              value={joints}
              onChange={(e) => {
                setJoints(Number(e.target.value));
                setSelectedPreset("");
              }}
              className="workbench-slider"
            />
            <span className="slider-hint">Pin or sliding joints connecting the parts together.</span>
          </div>

          <div className="workbench-slider-group">
            <div className="slider-header">
              <label htmlFor="wb-higher">Point Contacts (Gears / Cams)</label>
              <span className="slider-value">{higherPairs}</span>
            </div>
            <input
              id="wb-higher"
              type="range"
              min="0"
              max="6"
              value={higherPairs}
              onChange={(e) => {
                setHigherPairs(Number(e.target.value));
                setSelectedPreset("");
              }}
              className="workbench-slider"
            />
            <span className="slider-hint">Rolling or sliding contacts like gear teeth or cams.</span>
          </div>

          {/* Equation Breakdown Box */}
          <div className="equation-breakdown-box">
            <span className="equation-label">Movement Calculation</span>
            <div className="equation-formula">
              F = 3({links} - 1) - 2({joints}) - {higherPairs}
            </div>
            <div className="equation-steps">
              = 3({links - 1}) - {2 * joints} - {higherPairs} = <strong>{3 * (links - 1) - 2 * joints - higherPairs} DOF</strong>
            </div>
          </div>
        </div>

        {/* Real-Time Outcome & Kinematic Canvas */}
        <div className="workbench-result-card">
          <div className={`analysis-status analysis-status--${analysis.status}`} style={{ margin: 0 }}>
            <div>
              <span className="analysis-status__eyebrow">Mobility Classification</span>
              <h3>{analysis.title}</h3>
            </div>
            <div className="dof-result-badge">
              <span>DOF</span>
              <strong>{analysis.status === "invalid" ? "!" : analysis.result}</strong>
            </div>
            <p>{analysis.explanation}</p>
            <p className="analysis-status__recommendation">{analysis.recommendation}</p>
          </div>

          {/* Live Dynamic Mechanism Preview linked to equation */}
          <div className="workbench-simulation-wrap">
            <MechanismPreview
              mechanism={{
                name: initialMechanism?.name || selectedPreset || "Simulation",
                category: initialMechanism?.category || "Linkages",
                links,
                joints,
                higherPairs,
              }}
              analysis={analysis}
            />
          </div>
        </div>
      </div>
    </>
  )}
</div>
);
}

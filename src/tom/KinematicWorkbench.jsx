import { useState } from "react";
import { analyzeMechanism } from "./kinematics";
import MechanismPreview from "./MechanismPreview";

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
          <span className="eyebrow">Kinematic Engine</span>
          <h3 className="workbench-title">Grübler-Kutzbach Mobility Solver</h3>
          <p className="workbench-subtitle">
            Interactive parameter analysis for planar mechanical networks: <code>F = 3(L - 1) - 2J - H</code>
          </p>
        </div>

        <div className="workbench-actions">
          <button type="button" className="secondary-btn secondary-btn--small" onClick={handleReset}>
            Reset (L=4, J=4)
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

      {/* ── PRESETS ──────────────────────────────────────────────────────── */}
      <div className="workbench-presets">
        <span className="workbench-presets__label">Quick Presets:</span>
        <div className="workbench-presets__list">
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
        </div>
      </div>

      {/* ── DUAL COLUMN WORKBENCH ────────────────────────────────────────── */}
      <div className="workbench-grid">
        {/* Controls Column */}
        <div className="workbench-controls-card">
          <h4 className="workbench-card-title">Linkage Parameters</h4>

          <div className="workbench-slider-group">
            <div className="slider-header">
              <label htmlFor="wb-links">Number of Links (L)</label>
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
            <span className="slider-hint">Total rigid kinematic elements in the mechanism.</span>
          </div>

          <div className="workbench-slider-group">
            <div className="slider-header">
              <label htmlFor="wb-joints">Lower Pairs / Joints (J)</label>
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
            <span className="slider-hint">Pin, revolute, prismatic, and sliding surface joints (1 DOF each).</span>
          </div>

          <div className="workbench-slider-group">
            <div className="slider-header">
              <label htmlFor="wb-higher">Higher Pairs (H)</label>
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
            <span className="slider-hint">Cam-follower point contacts, rolling gear mesh (2 DOF each).</span>
          </div>

          {/* Equation Breakdown Box */}
          <div className="equation-breakdown-box">
            <span className="equation-label">Grübler Criterion Substitution</span>
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
    </div>
  );
}

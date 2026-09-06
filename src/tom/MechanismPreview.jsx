import { useEffect, useState } from "react";
import {
  analyzeMechanism, getCircleIntersection, clamp, smoothStep, camLift, previewKindFor,
} from "./tomKinematics";
import { updateMechanism } from "./tomApi";
import "./tomPreview.css";

function draftFromMechanism(mechanism) {
  return {
    links: mechanism.num_links ?? 4,
    joints: mechanism.num_joints ?? 4,
    higherPairs: mechanism.num_higher_pairs ?? 0,
  };
}

export default function MechanismPreview({ mechanism, isAdmin, onSaved }) {
  const [draft, setDraft] = useState(() => draftFromMechanism(mechanism));
  // Reset the draft whenever a different mechanism's registered values arrive
  // (e.g. after admin save, or navigating to a different mechanism) — tracked
  // during render per React's "adjusting state on prop change" pattern, so it
  // never triggers the cascading-render effect this used to cause.
  const [syncedFor, setSyncedFor] = useState(mechanism.id);
  if (syncedFor !== mechanism.id) {
    setSyncedFor(mechanism.id);
    setDraft(draftFromMechanism(mechanism));
  }
  const [saveMsg, setSaveMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const analysis = analyzeMechanism(draft);
  const kind = previewKindFor(mechanism);

  function handleInput(e) {
    const { name, value } = e.target;
    setDraft((cur) => ({ ...cur, [name]: Math.max(0, Number(value)) }));
    setSaveMsg("");
  }

  function resetDraft() {
    setDraft({
      links: mechanism.num_links ?? 4,
      joints: mechanism.num_joints ?? 4,
      higherPairs: mechanism.num_higher_pairs ?? 0,
    });
    setSaveMsg("Reset to this mechanism's registered values.");
  }

  async function saveDraft() {
    setSaving(true);
    const { error } = await updateMechanism(mechanism.id, {
      num_links: draft.links,
      num_joints: draft.joints,
      num_higher_pairs: draft.higherPairs,
      degrees_of_freedom: analysis.result,
    });
    setSaving(false);
    if (!error) {
      setSaveMsg("Saved — this mechanism's technical spec is updated.");
      onSaved?.({ ...mechanism, num_links: draft.links, num_joints: draft.joints, num_higher_pairs: draft.higherPairs, degrees_of_freedom: analysis.result });
    } else {
      setSaveMsg("Could not save — please try again.");
    }
  }

  return (
    <div className="calculation-panel">
      <div className="calculation-grid">
        <div className="calculation-box">
          <span>Formula</span>
          <strong style={{ fontSize: "0.95rem" }}>DOF = 3(L-1) - 2J - H</strong>
        </div>
        <div className="calculation-box calculation-box--result">
          <span>Result</span>
          <strong>{analysis.status === "invalid" ? "—" : analysis.result}</strong>
        </div>
      </div>

      <div className="editable-calculation">
        <div className="editable-calculation__header">
          <h3>Explore the constraints</h3>
          {isAdmin && (
            <div className="calculation-actions">
              <button type="button" className="button button--ghost" onClick={resetDraft}>Reset</button>
              <button type="button" className="button button--primary" onClick={saveDraft} disabled={saving || analysis.status === "invalid"}>
                {saving ? "Saving…" : "Save to mechanism"}
              </button>
            </div>
          )}
        </div>
        <div className="editable-inputs">
          <label className="field">
            <span className="field__label">Links (L)</span>
            <input className="field__control" name="links" type="number" min="0" value={draft.links} onChange={handleInput} disabled={!isAdmin} />
          </label>
          <label className="field">
            <span className="field__label">Joints (J)</span>
            <input className="field__control" name="joints" type="number" min="0" value={draft.joints} onChange={handleInput} disabled={!isAdmin} />
          </label>
          <label className="field">
            <span className="field__label">Higher Pairs (H)</span>
            <input className="field__control" name="higherPairs" type="number" min="0" value={draft.higherPairs} onChange={handleInput} disabled={!isAdmin} />
          </label>
        </div>
        {!isAdmin && (
          <p style={{ margin: "10px 0 0", color: "var(--muted-deep)", fontSize: "0.78rem" }}>
            Log in as admin to adjust and save these values — you can still see how the result changes below.
          </p>
        )}
        {saveMsg && <div className="save-message">{saveMsg}</div>}
      </div>

      <div className={`analysis-status analysis-status--${analysis.status}`}>
        <div>
          <span className="analysis-status__eyebrow">What happens with this DOF?</span>
          <h3>{analysis.title}</h3>
        </div>
        <strong>{analysis.status === "invalid" ? "!" : analysis.result}</strong>
        <p>{analysis.explanation}</p>
        <p className="analysis-status__recommendation">{analysis.recommendation}</p>
      </div>

      {kind ? (
        <LivePreview kind={kind} analysis={analysis} />
      ) : (
        <div className="mechanism-preview">
          <div className="mechanism-preview__header">
            <span>Live mechanism preview</span>
            <strong>Not available for this category yet</strong>
          </div>
          <p>
            An animated preview isn't built for "{mechanism.category}" mechanisms yet — the DOF result and
            explanation above are still accurate. Ask your admin to add a renderer for this category.
          </p>
        </div>
      )}
    </div>
  );
}

function LivePreview({ kind, analysis }) {
  const [angle, setAngle] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const canMove = analysis.status === "constrained" || analysis.status === "underconstrained";

  useEffect(() => {
    let frame;
    let last = performance.now();
    const rate = (analysis.status === "underconstrained" ? 0.0022 : 0.0012) * speed;
    const tick = (time) => {
      const elapsed = time - last;
      last = time;
      if (canMove && isPlaying) setAngle((a) => a + elapsed * rate);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [canMove, analysis.status, isPlaying, speed]);

  const statusClass = `mechanism-preview mechanism-preview--${analysis.status}`;

  return (
    <div className={statusClass}>
      <div className="mechanism-preview__header">
        <span>Live mechanism preview</span>
        <strong>{analysis.title}</strong>
      </div>
      <div className="preview-controls">
        <button type="button" className="preview-control-btn" onClick={() => setIsPlaying((p) => !p)}>
          {isPlaying ? "Pause" : "Play"}
        </button>
        <label className="preview-speed">
          <span>Speed</span>
          <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
            <option value="0.5">0.5x</option>
            <option value="1">1x</option>
            <option value="1.5">1.5x</option>
            <option value="2">2x</option>
          </select>
        </label>
      </div>
      <svg className="mechanism-preview__svg" viewBox="0 0 400 230" role="img" aria-label="Mechanism live animation">
        <line className="preview-axis" x1="35" y1="196" x2="365" y2="196" />
        {kind === "pick-and-place" && <PickAndPlace angle={angle} analysis={analysis} />}
        {kind === "gear" && <Gears angle={angle} analysis={analysis} />}
        {kind === "cam" && <Cam angle={angle} analysis={analysis} />}
        {kind === "steering" && <Steering angle={angle} />}
        {kind === "four-bar" && <FourBar angle={angle} analysis={analysis} />}
      </svg>
      <span className={`motion-stage__state motion-stage__state--${analysis.status}`}>
        {canMove ? "Moving from current DOF" : "Motion stopped by current constraints"}
      </span>
    </div>
  );
}

function FourBar({ angle, analysis }) {
  const inputLength = clamp(46 + analysis.links * 2, 48, 58);
  const couplerLength = clamp(122 + analysis.joints, 122, 132);
  const rockerLength = clamp(88 + analysis.higherPairs * 2, 88, 96);
  const left = { x: 120, y: 158 };
  const right = { x: 280, y: 158 };
  const input = { x: left.x + inputLength * Math.cos(angle), y: left.y + inputLength * Math.sin(angle) };
  const intersection = getCircleIntersection(input, right, couplerLength, rockerLength);
  const output = intersection.y < 158 ? intersection : { x: intersection.x, y: 2 * 158 - intersection.y };
  return (
    <>
      <line className="preview-link preview-link--fixed" x1={left.x} y1={left.y} x2={right.x} y2={right.y} />
      <line className="preview-link preview-link--input" x1={left.x} y1={left.y} x2={input.x} y2={input.y} />
      <line className="preview-link preview-link--coupler" x1={input.x} y1={input.y} x2={output.x} y2={output.y} />
      <line className="preview-link preview-link--output" x1={right.x} y1={right.y} x2={output.x} y2={output.y} />
      {[left, input, output, right].map((p, i) => <circle key={i} className="preview-joint" cx={p.x} cy={p.y} r="9" />)}
      <path className="preview-path" d="M 126 110 C 180 62, 246 66, 288 118" />
    </>
  );
}

function Gears({ angle, analysis }) {
  const firstTeeth = clamp(analysis.links * 3, 12, 20);
  const secondTeeth = clamp(analysis.joints * 3, 18, 28);
  const firstRadius = 32 + firstTeeth;
  const secondRadius = 32 + secondTeeth;
  const centerDistance = firstRadius + secondRadius;
  const firstCenter = { x: 200 - centerDistance / 2, y: 130 };
  const secondCenter = { x: 200 + centerDistance / 2, y: 130 };
  return (
    <>
      <g className="gear gear--first" transform={`translate(${firstCenter.x} ${firstCenter.y}) rotate(${angle * 57.3})`}>
        <circle r={firstRadius} />
        <circle className="gear__hub" r="10" />
        {Array.from({ length: firstTeeth }).map((_, i) => <line key={i} x1="0" y1={-firstRadius} x2="0" y2={-firstRadius - 7} transform={`rotate(${i * (360 / firstTeeth)})`} />)}
      </g>
      <g className="gear gear--second" transform={`translate(${secondCenter.x} ${secondCenter.y}) rotate(${-angle * 57.3 * (firstTeeth / secondTeeth)})`}>
        <circle r={secondRadius} />
        <circle className="gear__hub" r="10" />
        {Array.from({ length: secondTeeth }).map((_, i) => <line key={i} x1="0" y1={-secondRadius} x2="0" y2={-secondRadius - 7} transform={`rotate(${i * (360 / secondTeeth)})`} />)}
      </g>
    </>
  );
}

function Cam({ angle, analysis }) {
  const lift = 18 + camLift(angle) * clamp(26 + analysis.links * 2, 30, 46);
  const followerY = 104 - lift;
  return (
    <>
      <g transform={`translate(190 148) rotate(${angle * 57.3})`} className="cam-rotor">
        <path className="cam-profile" d="M 0 -48 C 54 -48, 55 -8, 38 34 C 20 68, -42 48, -48 10 C -54 -28, -28 -48, 0 -48 Z" />
        <circle className="gear__hub" r="10" />
      </g>
      <line className="preview-link preview-link--follower" x1="190" y1={followerY} x2="190" y2="104" />
      <circle className="preview-joint" cx="190" cy={followerY} r="9" />
      <line className="preview-link preview-link--fixed" x1="105" y1="196" x2="275" y2="196" />
    </>
  );
}

function Steering({ angle }) {
  const steeringInput = Math.sin(angle) * 0.55;
  const wheelbase = 112;
  const track = 126;
  const turnRadius = 245 / Math.max(0.25, Math.abs(steeringInput));
  const innerAngle = Math.atan(wheelbase / Math.max(30, turnRadius - track / 2));
  const outerAngle = Math.atan(wheelbase / (turnRadius + track / 2));
  const direction = steeringInput < 0 ? -1 : 1;
  const inner = direction * innerAngle;
  const outer = direction * outerAngle;
  const rackShift = steeringInput * 34;
  return (
    <>
      <line className="preview-link preview-link--fixed" x1="92" y1="72" x2="308" y2="72" />
      <line className="preview-link preview-link--fixed" x1="92" y1="176" x2="308" y2="176" />
      <line className="preview-link preview-link--rack" x1={112 + rackShift} y1="132" x2={288 + rackShift} y2="132" />
      <line className="preview-link preview-link--output" x1={112 + rackShift} y1="132" x2="92" y2="72" />
      <line className="preview-link preview-link--output" x1={288 + rackShift} y1="132" x2="308" y2="72" />
      <rect className="preview-wheel" x="85" y="43" width="14" height="58" rx="7" transform={`rotate(${outer * 57.3} 92 72)`} />
      <rect className="preview-wheel" x="301" y="43" width="14" height="58" rx="7" transform={`rotate(${-inner * 57.3} 308 72)`} />
      <text className="preview-label" x="200" y="214" textAnchor="middle">Ackermann steering geometry</text>
    </>
  );
}

function PickAndPlace({ angle, analysis }) {
  const cycle = (angle % (Math.PI * 2)) / (Math.PI * 2);
  const travelPhase = cycle < 0.5 ? smoothStep(cycle / 0.5) : 1 - smoothStep((cycle - 0.5) / 0.5);
  const pickupPhase = smoothStep((cycle - 0.18) / 0.14) - smoothStep((cycle - 0.42) / 0.14);
  const placePhase = smoothStep((cycle - 0.68) / 0.14) - smoothStep((cycle - 0.92) / 0.14);
  const travel = 48 + travelPhase * clamp(70 + analysis.links * 7, 78, 112);
  const sliderX = 104 + travel;
  const gripperLift = Math.max(0, pickupPhase, placePhase) * clamp(28 + analysis.joints * 2, 30, 42);
  return (
    <>
      <line className="preview-link preview-link--fixed" x1="72" y1="172" x2="328" y2="172" />
      <line className="preview-link preview-link--rack" x1="82" y1="128" x2="318" y2="128" />
      <line className="preview-link preview-link--input" x1="92" y1="172" x2={sliderX} y2="128" />
      <rect className="preview-slider" x={sliderX - 18} y="112" width="36" height="32" rx="8" />
      <line className="preview-link preview-link--output" x1={sliderX} y1="128" x2={sliderX} y2={176 - gripperLift} />
      <path className="preview-gripper" d={`M ${sliderX - 18} ${176 - gripperLift} L ${sliderX - 8} ${190 - gripperLift} M ${sliderX + 18} ${176 - gripperLift} L ${sliderX + 8} ${190 - gripperLift}`} />
      <rect className="preview-object" x={sliderX - 14} y={190 - gripperLift} width="28" height="20" rx="4" />
      <circle className="preview-joint" cx="92" cy="172" r="9" />
      <circle className="preview-joint" cx={sliderX} cy="128" r="9" />
    </>
  );
}

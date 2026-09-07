import { useEffect, useState } from "react";
import {
  clamp,
  smoothStep,
  camLift,
  getCircleIntersection,
  analyzeMechanism,
} from "./kinematics";

export default function MechanismPreview({ mechanism, analysis: explicitAnalysis }) {
  const [angle, setAngle] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);

  const analysis = explicitAnalysis || analyzeMechanism(mechanism);
  const canMove = analysis.status === "constrained" || analysis.status === "underconstrained";

  useEffect(() => {
    let frame;
    let lastTime = performance.now();
    const speed = (analysis.status === "underconstrained" ? 0.0022 : 0.0012) * speedMultiplier;

    const animate = (time) => {
      const elapsed = time - lastTime;
      lastTime = time;
      if (canMove && isPlaying) setAngle((current) => current + elapsed * speed);
      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [canMove, analysis.status, isPlaying, speedMultiplier]);

  const category = (mechanism?.category || "").toLowerCase();
  const name = (mechanism?.name || "").toLowerCase();
  const isGear = category.includes("gear") || name.includes("gear");
  const isCam = category.includes("cam") || name.includes("cam");
  const isSteering = category.includes("steering") || name.includes("steering");
  const isPickAndPlace =
    mechanism?.mechanismType === "pick-and-place" ||
    name.includes("pick") ||
    name.includes("place");
  const statusClass = `mechanism-preview mechanism-preview--${analysis.status}`;

  const renderFourBar = () => {
    const inputLength = 48;
    const couplerLength = 130;
    const rockerLength = 92;
    const left = { x: 120, y: 158 };
    const right = { x: 280, y: 158 };
    const input = {
      x: left.x + inputLength * Math.cos(angle),
      y: left.y + inputLength * Math.sin(angle),
    };
    const intersection = getCircleIntersection(input, right, couplerLength, rockerLength);
    const output =
      intersection.y < 158 ? intersection : { x: intersection.x, y: 2 * 158 - intersection.y };

    return (
      <>
        <line className="preview-link preview-link--fixed" x1={left.x} y1={left.y} x2={right.x} y2={right.y} />
        <line className="preview-link preview-link--input" x1={left.x} y1={left.y} x2={input.x} y2={input.y} />
        <line className="preview-link preview-link--coupler" x1={input.x} y1={input.y} x2={output.x} y2={output.y} />
        <line className="preview-link preview-link--output" x1={right.x} y1={right.y} x2={output.x} y2={output.y} />
        {[left, input, output, right].map((point, index) => (
          <circle key={index} className="preview-joint" cx={point.x} cy={point.y} r="9" />
        ))}
        <path className="preview-path" d="M 126 110 C 180 62, 246 66, 288 118" />
      </>
    );
  };

  const renderGears = () => {
    const firstTeeth = 12;
    const secondTeeth = 18;
    const modulePitch = 3.2;
    const firstRadius = firstTeeth * modulePitch;
    const secondRadius = secondTeeth * modulePitch;
    const centerDistance = firstRadius + secondRadius;
    const firstCenter = { x: 200 - centerDistance / 2, y: 130 };
    const secondCenter = { x: 200 + centerDistance / 2, y: 130 };
    return (
      <>
        <g
          className="gear gear--first"
          transform={`translate(${firstCenter.x} ${firstCenter.y}) rotate(${angle * 57.3})`}
        >
          <circle r={firstRadius} />
          <circle className="gear__hub" r="10" />
          {Array.from({ length: firstTeeth }).map((_, index) => (
            <line
              key={index}
              x1="0"
              y1={-firstRadius}
              x2="0"
              y2={-firstRadius - 7}
              transform={`rotate(${index * (360 / firstTeeth)})`}
            />
          ))}
        </g>
        <g
          className="gear gear--second"
          transform={`translate(${secondCenter.x} ${secondCenter.y}) rotate(${-angle * 57.3 * (firstTeeth / secondTeeth)})`}
        >
          <circle r={secondRadius} />
          <circle className="gear__hub" r="10" />
          {Array.from({ length: secondTeeth }).map((_, index) => (
            <line
              key={index}
              x1="0"
              y1={-secondRadius}
              x2="0"
              y2={-secondRadius - 7}
              transform={`rotate(${index * (360 / secondTeeth)})`}
            />
          ))}
        </g>
      </>
    );
  };

  const renderCam = () => {
    const lift = 18 + camLift(angle) * clamp(26 + (analysis.links || 3) * 2, 30, 46);
    const followerY = 104 - lift;
    return (
      <>
        <g transform={`translate(190 148) rotate(${angle * 57.3})`} className="cam-rotor">
          <path
            className="cam-profile"
            d="M 0 -48 C 54 -48, 55 -8, 38 34 C 20 68, -42 48, -48 10 C -54 -28, -28 -48, 0 -48 Z"
          />
          <circle className="gear__hub" r="10" />
        </g>
        <line className="preview-link preview-link--follower" x1="190" y1={followerY} x2="190" y2="104" />
        <circle className="preview-joint" cx="190" cy={followerY} r="9" />
        <line className="preview-link preview-link--fixed" x1="105" y1="196" x2="275" y2="196" />
      </>
    );
  };

  const renderSteering = () => {
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
        <rect
          className="preview-wheel"
          x="85"
          y="43"
          width="14"
          height="58"
          rx="7"
          transform={`rotate(${outer * 57.3} 92 72)`}
        />
        <rect
          className="preview-wheel"
          x="301"
          y="43"
          width="14"
          height="58"
          rx="7"
          transform={`rotate(${-inner * 57.3} 308 72)`}
        />
        <text className="preview-label" x="200" y="214" textAnchor="middle">
          Ackermann steering geometry
        </text>
      </>
    );
  };

  const renderPickAndPlace = () => {
    const cycle = (angle % (Math.PI * 2)) / (Math.PI * 2);
    const travelPhase = cycle < 0.5 ? smoothStep(cycle / 0.5) : 1 - smoothStep((cycle - 0.5) / 0.5);
    const pickupPhase = smoothStep((cycle - 0.18) / 0.14) - smoothStep((cycle - 0.42) / 0.14);
    const placePhase = smoothStep((cycle - 0.68) / 0.14) - smoothStep((cycle - 0.92) / 0.14);
    const travel = 48 + travelPhase * clamp(70 + (analysis.links || 4) * 7, 78, 112);
    const sliderX = 104 + travel;
    const gripperLift = Math.max(0, pickupPhase, placePhase) * clamp(28 + (analysis.joints || 4) * 2, 30, 42);
    return (
      <>
        <line className="preview-link preview-link--fixed" x1="72" y1="172" x2="328" y2="172" />
        <line className="preview-link preview-link--rack" x1="82" y1="128" x2="318" y2="128" />
        <line className="preview-link preview-link--input" x1="92" y1="172" x2={sliderX} y2="128" />
        <rect className="preview-slider" x={sliderX - 18} y="112" width="36" height="32" rx="8" />
        <line className="preview-link preview-link--output" x1={sliderX} y1="128" x2={sliderX} y2={176 - gripperLift} />
        <path
          className="preview-gripper"
          d={`M ${sliderX - 18} ${176 - gripperLift} L ${sliderX - 8} ${190 - gripperLift} M ${sliderX + 18} ${176 - gripperLift} L ${sliderX + 8} ${190 - gripperLift}`}
        />
        <rect className="preview-object" x={sliderX - 14} y={190 - gripperLift} width="28" height="20" rx="4" />
        <circle className="preview-joint" cx="92" cy="172" r="9" />
        <circle className="preview-joint" cx={sliderX} cy="128" r="9" />
      </>
    );
  };

  const animationText =
    mechanism?.animation ||
    (analysis ? `${mechanism?.name || "This mechanism"} demonstrates kinetic motion according to its degrees of freedom.` : "");

  return (
    <div className={statusClass}>
      <div className="mechanism-preview__header">
        <span>Live mechanism preview</span>
        <strong>{analysis.title}</strong>
      </div>
      <div className="preview-controls">
        <button
          type="button"
          className="preview-control-btn"
          onClick={() => setIsPlaying((current) => !current)}
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
        <label className="preview-speed">
          <span>Speed</span>
          <select
            value={speedMultiplier}
            onChange={(event) => setSpeedMultiplier(Number(event.target.value))}
          >
            <option value="0.5">0.5x</option>
            <option value="1">1x</option>
            <option value="1.5">1.5x</option>
            <option value="2">2x</option>
          </select>
        </label>
      </div>
      <svg
        className="mechanism-preview__svg"
        viewBox="0 0 400 230"
        role="img"
        aria-label={`${mechanism?.name || "Mechanism"} live animation`}
      >
        <line className="preview-axis" x1="35" y1="196" x2="365" y2="196" />
        {isPickAndPlace
          ? renderPickAndPlace()
          : isGear
          ? renderGears()
          : isCam
          ? renderCam()
          : isSteering
          ? renderSteering()
          : renderFourBar()}
      </svg>
      {animationText && <p>{animationText}</p>}
      <span className={`motion-stage__state motion-stage__state--${analysis.status}`}>
        {canMove ? "Moving from current DOF" : "Motion stopped by current constraints"}
      </span>
    </div>
  );
}

import { useId, useState } from "react";

/**
 * Theory of Machines (TOM) Brand Logo Component.
 * Renders an iconic mechanical engineering emblem:
 * - Kinematic diamond four-bar linkage with circular pivot joints
 * - Interlocking spur gear teeth at the center
 * - Glowing precision blueprint neon gradients (cyan #38bdf8, blue #818cf8, gold #fbbf24)
 * Supports image mode with seamless vector fallback.
 */
export default function TomLogo({ size = 38, className = "", useImage = true }) {
  const [imgError, setImgError] = useState(false);
  const uid = useId();
  const glowId = `tomCyanGlow${uid}`;
  const linkGradId = `tomLinkGrad${uid}`;
  const gearGradId = `tomGearGrad${uid}`;
  const pinGradId = `tomPinGrad${uid}`;

  if (useImage && !imgError) {
    return (
      <img
        src="/tom_logo.png"
        alt="Theory of Machines Logo"
        width={size}
        height={size}
        onError={() => setImgError(true)}
        className={`tom-brand-logo ${className}`}
        style={{
          width: size,
          height: size,
          objectFit: "cover",
          borderRadius: "10px",
          display: "block",
        }}
      />
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`tom-brand-logo-svg ${className}`}
      style={{ display: "block", overflow: "visible" }}
      aria-label="Theory of Machines Logo"
      role="img"
    >
      <title>Theory of Machines Logo</title>
      <defs>
        {/* Glow Filters */}
        <filter id={glowId} x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <linearGradient id={linkGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>

        <linearGradient id={gearGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>

        <radialGradient id={pinGradId} cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </radialGradient>
      </defs>

      {/* Blueprint Grid Crosshairs */}
      <g opacity="0.28" stroke="#38bdf8" strokeWidth="0.8">
        <line x1="10" y1="50" x2="90" y2="50" strokeDasharray="3 3" />
        <line x1="50" y1="10" x2="50" y2="90" strokeDasharray="3 3" />
        <circle cx="50" cy="50" r="38" fill="none" strokeDasharray="2 4" />
      </g>

      {/* Central Interlocking Spur Gear */}
      <g transform="translate(50, 50)" filter={`url(#${glowId})`}>
        {/* Gear Teeth (12 teeth) */}
        <path
          d="
            M -5,-26 L 5,-26 L 7,-20 L 13,-20 L 18,-24 L 24,-18 L 20,-13 L 20,-7 L 26,-5 L 26,5 L 20,7 L 20,13 L 24,18 L 18,24 L 13,20 L 7,20 L 5,26 L -5,26 L -7,20 L -13,20 L -18,24 L -24,18 L -20,13 L -20,7 L -26,5 L -26,-5 L -20,-7 L -20,-13 L -24,-18 L -18,-24 L -13,-20 L -7,-20 Z
          "
          fill={`url(#${gearGradId})`}
          stroke="#38bdf8"
          strokeWidth="1.2"
          opacity="0.9"
        />
        {/* Pitch Circle Accent */}
        <circle cx="0" cy="0" r="16" fill="none" stroke="#38bdf8" strokeWidth="1" strokeDasharray="2 2" opacity="0.7" />
        {/* Central Bore */}
        <circle cx="0" cy="0" r="8" fill="#0b0f19" stroke="#fbbf24" strokeWidth="1.6" />
        <circle cx="0" cy="0" r="3.5" fill="#fbbf24" />
      </g>

      {/* 4-Bar Kinematic Linkage Diamond Frame */}
      <g filter={`url(#${glowId})`}>
        {/* Outer Linkage Bars */}
        <polygon
          points="50,14 86,50 50,86 14,50"
          fill="none"
          stroke={`url(#${linkGradId})`}
          strokeWidth="3.2"
          strokeLinejoin="round"
        />

        {/* Inner Linkage Accent Lines */}
        <polygon
          points="50,21 79,50 50,79 21,50"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="1"
          strokeDasharray="4 3"
          opacity="0.6"
        />

        {/* 4 Kinematic Pivot Joints (Bearings) */}
        {/* Top Joint */}
        <circle cx="50" cy="14" r="6" fill="#0b0f19" stroke="#38bdf8" strokeWidth="2" />
        <circle cx="50" cy="14" r="3" fill={`url(#${pinGradId})`} />

        {/* Right Joint */}
        <circle cx="86" cy="50" r="6" fill="#0b0f19" stroke="#38bdf8" strokeWidth="2" />
        <circle cx="86" cy="50" r="3" fill={`url(#${pinGradId})`} />

        {/* Bottom Joint */}
        <circle cx="50" cy="86" r="6" fill="#0b0f19" stroke="#38bdf8" strokeWidth="2" />
        <circle cx="50" cy="86" r="3" fill={`url(#${pinGradId})`} />

        {/* Left Joint */}
        <circle cx="14" cy="50" r="6" fill="#0b0f19" stroke="#38bdf8" strokeWidth="2" />
        <circle cx="14" cy="50" r="3" fill={`url(#${pinGradId})`} />
      </g>
    </svg>
    );
}

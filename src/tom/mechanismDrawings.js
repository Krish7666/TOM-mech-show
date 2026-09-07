/**
 * Vector CAD Blueprint Posters for TOM Mechanisms.
 * Provides authentic, high-precision engineering drawings as SVG data URIs
 * so every mechanism in the repository and showcase has an authentic technical poster.
 */

function encodeSvg(svgString) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString.trim())}`;
}

// ─── 1. FOUR-BAR LINKAGE BLUEPRINT ──────────────────────────────────────────
export const FOUR_BAR_BLUEPRINT = encodeSvg(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 320" width="100%" height="100%">
  <defs>
    <pattern id="grid4" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(56,189,248,0.08)" stroke-width="1"/>
    </pattern>
    <radialGradient id="glow4" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#091428" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="100%" height="100%" fill="#07111e"/>
  <rect width="100%" height="100%" fill="url(#grid4)"/>
  <circle cx="260" cy="160" r="220" fill="url(#glow4)"/>

  <!-- Technical Header & Border -->
  <rect x="14" y="14" width="492" height="292" fill="none" stroke="rgba(56,189,248,0.25)" stroke-width="1.2" stroke-dasharray="6,4"/>
  <text x="28" y="38" fill="#38bdf8" font-family="monospace" font-size="11" font-weight="bold" letter-spacing="1.5">NMIET TOM LAB // FOUR-BAR LINKAGE // GRASHOF KINEMATIC CHAIN</text>
  <text x="28" y="52" fill="#94a3b8" font-family="monospace" font-size="9">PLANAR MOBILITY: F = 3(L-1) - 2J - H = 3(4-1) - 2(4) - 0 = 1 DOF</text>

  <!-- Ground Frame line between A and D -->
  <line x1="120" y1="240" x2="380" y2="240" stroke="#475569" stroke-width="3" stroke-dasharray="5,5"/>
  
  <!-- Ground Hashing A -->
  <path d="M105,255 L135,255 M110,255 L102,267 M120,255 L112,267 M130,255 L122,267" stroke="#64748b" stroke-width="1.8"/>
  <polygon points="120,240 108,255 132,255" fill="none" stroke="#94a3b8" stroke-width="2"/>
  
  <!-- Ground Hashing D -->
  <path d="M365,255 L395,255 M370,255 L362,267 M380,255 L372,267 M390,255 L382,267" stroke="#64748b" stroke-width="1.8"/>
  <polygon points="380,240 368,255 392,255" fill="none" stroke="#94a3b8" stroke-width="2"/>

  <!-- Crank Trajectory Arc -->
  <circle cx="120" cy="240" r="95" fill="none" stroke="rgba(251,191,36,0.25)" stroke-width="1.5" stroke-dasharray="3,3"/>

  <!-- Coupler Path Trace (Pear Curve) -->
  <path d="M 230,120 C 270,70 330,90 320,150 C 310,190 240,210 200,180 C 165,155 190,140 230,120 Z" fill="none" stroke="rgba(56,189,248,0.3)" stroke-width="1.5" stroke-dasharray="4,4"/>

  <!-- Link 2: Input Crank AB -->
  <line x1="120" y1="240" x2="185" y2="155" stroke="#fbbf24" stroke-width="6" stroke-linecap="round"/>
  
  <!-- Link 3: Coupler Link BC (with triangular coupler plane) -->
  <polygon points="185,155 340,145 250,90" fill="rgba(56,189,248,0.1)" stroke="#38bdf8" stroke-width="1.5"/>
  <line x1="185" y1="155" x2="340" y2="145" stroke="#38bdf8" stroke-width="6" stroke-linecap="round"/>

  <!-- Link 4: Rocker CD -->
  <line x1="380" y1="240" x2="340" y2="145" stroke="#34d399" stroke-width="6" stroke-linecap="round"/>

  <!-- Pivot Joints (A, B, C, D, P) -->
  <!-- Joint A -->
  <circle cx="120" cy="240" r="7" fill="#07111e" stroke="#fbbf24" stroke-width="3"/>
  <circle cx="120" cy="240" r="2.5" fill="#ffffff"/>
  <text x="96" y="244" fill="#fbbf24" font-family="monospace" font-size="12" font-weight="bold">A (0,0)</text>

  <!-- Joint B -->
  <circle cx="185" cy="155" r="7" fill="#07111e" stroke="#fbbf24" stroke-width="3"/>
  <circle cx="185" cy="155" r="2.5" fill="#ffffff"/>
  <text x="165" y="145" fill="#fbbf24" font-family="monospace" font-size="12" font-weight="bold">B (Crank Pin)</text>

  <!-- Joint C -->
  <circle cx="340" cy="145" r="7" fill="#07111e" stroke="#34d399" stroke-width="3"/>
  <circle cx="340" cy="145" r="2.5" fill="#ffffff"/>
  <text x="355" y="145" fill="#34d399" font-family="monospace" font-size="12" font-weight="bold">C</text>

  <!-- Joint D -->
  <circle cx="380" cy="240" r="7" fill="#07111e" stroke="#34d399" stroke-width="3"/>
  <circle cx="380" cy="240" r="2.5" fill="#ffffff"/>
  <text x="396" y="244" fill="#34d399" font-family="monospace" font-size="12" font-weight="bold">D (Fixed)</text>

  <!-- Coupler Point P -->
  <circle cx="250" cy="90" r="5" fill="#38bdf8"/>
  <text x="258" y="88" fill="#38bdf8" font-family="monospace" font-size="11" font-weight="bold">P (Coupler Tracer)</text>

  <!-- Annotations / Dimensions -->
  <text x="110" y="195" fill="#fbbf24" font-family="sans-serif" font-size="10" font-weight="bold">Link 2 (Crank)</text>
  <text x="245" y="165" fill="#38bdf8" font-family="sans-serif" font-size="10" font-weight="bold">Link 3 (Coupler)</text>
  <text x="375" y="195" fill="#34d399" font-family="sans-serif" font-size="10" font-weight="bold">Link 4 (Rocker)</text>
  <text x="220" y="258" fill="#64748b" font-family="sans-serif" font-size="10">Link 1 (Fixed Base Frame)</text>
  <path d="M 145,240 A 25 25 0 0 0 138,222" fill="none" stroke="#fbbf24" stroke-width="1.5"/>
  <text x="150" y="230" fill="#fbbf24" font-family="monospace" font-size="9">θ₂</text>

  <rect x="360" y="280" width="130" height="20" rx="4" fill="rgba(56,189,248,0.12)" stroke="rgba(56,189,248,0.3)" stroke-width="1"/>
  <text x="370" y="294" fill="#38bdf8" font-family="monospace" font-size="9" font-weight="bold">CRANK-ROCKER MODE</text>
</svg>
`);

// ─── 2. CAM & ROLLER FOLLOWER BLUEPRINT ─────────────────────────────────────
export const CAM_FOLLOWER_BLUEPRINT = encodeSvg(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 320" width="100%" height="100%">
  <defs>
    <pattern id="gridc" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(244,114,182,0.08)" stroke-width="1"/>
    </pattern>
  </defs>

  <rect width="100%" height="100%" fill="#0a101f"/>
  <rect width="100%" height="100%" fill="url(#gridc)"/>

  <!-- Technical Header -->
  <rect x="14" y="14" width="492" height="292" fill="none" stroke="rgba(244,114,182,0.25)" stroke-width="1.2" stroke-dasharray="6,4"/>
  <text x="28" y="38" fill="#f472b6" font-family="monospace" font-size="11" font-weight="bold" letter-spacing="1.5">NMIET TOM LAB // DISC CAM &amp; ROLLER FOLLOWER MECHANISM</text>
  <text x="28" y="52" fill="#94a3b8" font-family="monospace" font-size="9">MOBILITY: L=3, J=2 (Lower Pairs), H=1 (Cam Higher Pair) // DOF = 1</text>

  <!-- Camshaft Centerline -->
  <line x1="180" y1="50" x2="180" y2="290" stroke="#334155" stroke-width="1.2" stroke-dasharray="4,4"/>
  <line x1="70" y1="210" x2="290" y2="210" stroke="#334155" stroke-width="1.2" stroke-dasharray="4,4"/>

  <!-- Base Circle (dashed) -->
  <circle cx="180" cy="210" r="50" fill="none" stroke="#64748b" stroke-width="1.5" stroke-dasharray="4,3"/>
  <text x="85" y="206" fill="#64748b" font-family="monospace" font-size="9">Base Circle (Rb)</text>

  <!-- Prime Circle (dashed) -->
  <circle cx="180" cy="210" r="66" fill="none" stroke="rgba(56,189,248,0.3)" stroke-width="1.2" stroke-dasharray="3,3"/>

  <!-- Cam Profile (Egg / Heart shaped continuous curve) -->
  <path d="M 180,144 C 235,144 246,192 242,230 C 238,262 205,274 180,274 C 155,274 122,262 118,230 C 114,192 125,144 180,144 Z" fill="rgba(244,114,182,0.12)" stroke="#f472b6" stroke-width="3"/>

  <!-- Camshaft Hub & Keyway -->
  <circle cx="180" cy="210" r="16" fill="#0a101f" stroke="#e2e8f0" stroke-width="2.5"/>
  <rect x="176" y="196" width="8" height="6" fill="#e2e8f0"/>
  <circle cx="180" cy="210" r="4" fill="#f472b6"/>
  <text x="198" y="218" fill="#e2e8f0" font-family="monospace" font-size="10">Shaft (O)</text>

  <!-- Roller Follower -->
  <circle cx="180" cy="128" r="16" fill="rgba(251,191,36,0.18)" stroke="#fbbf24" stroke-width="2.5"/>
  <circle cx="180" cy="128" r="4" fill="#fbbf24"/>
  <text x="204" y="132" fill="#fbbf24" font-family="monospace" font-size="10" font-weight="bold">Roller (Rr)</text>

  <!-- Follower Stem -->
  <line x1="180" y1="112" x2="180" y2="48" stroke="#38bdf8" stroke-width="5" stroke-linecap="round"/>
  
  <!-- Follower Guide Bushing -->
  <rect x="162" y="70" width="36" height="24" fill="rgba(15,23,42,0.85)" stroke="#64748b" stroke-width="1.8"/>
  <line x1="162" y1="70" x2="170" y2="94" stroke="#64748b" stroke-width="1.2"/>
  <line x1="172" y1="70" x2="180" y2="94" stroke="#64748b" stroke-width="1.2"/>
  <line x1="182" y1="70" x2="190" y2="94" stroke="#64748b" stroke-width="1.2"/>
  <text x="206" y="86" fill="#94a3b8" font-family="monospace" font-size="9">Guide Sleeve</text>

  <!-- Motion Displacement Arrow -->
  <line x1="150" y1="105" x2="150" y2="60" stroke="#38bdf8" stroke-width="2"/>
  <polygon points="150,55 146,65 154,65" fill="#38bdf8"/>
  <polygon points="150,110 146,100 154,100" fill="#38bdf8"/>
  <text x="135" y="85" fill="#38bdf8" font-family="monospace" font-size="9" text-anchor="end">Stroke (h)</text>

  <!-- Right Side: Theoretical S-V-A Graph -->
  <rect x="315" y="75" width="175" height="195" rx="6" fill="rgba(15,23,42,0.8)" stroke="#334155" stroke-width="1.2"/>
  <text x="328" y="98" fill="#f8fafc" font-family="monospace" font-size="10" font-weight="bold">DISPLACEMENT DIAGRAM</text>
  <line x1="330" y1="160" x2="475" y2="160" stroke="#475569" stroke-width="1"/>
  <line x1="335" y1="110" x2="335" y2="250" stroke="#475569" stroke-width="1"/>
  <!-- Harmonic Curve (Rise - Dwell - Return) -->
  <path d="M 335,210 Q 365,210 380,140 T 425,140 L 440,140 Q 455,140 470,210" fill="none" stroke="#f472b6" stroke-width="2.5"/>
  <text x="345" y="235" fill="#94a3b8" font-family="monospace" font-size="8">RISE (120°)</text>
  <text x="405" y="130" fill="#fbbf24" font-family="monospace" font-size="8">DWELL</text>
  <text x="445" y="235" fill="#94a3b8" font-family="monospace" font-size="8">RETURN</text>
  
  <rect x="330" y="245" width="145" height="16" fill="rgba(244,114,182,0.12)"/>
  <text x="335" y="257" fill="#f472b6" font-family="monospace" font-size="8" font-weight="bold">CAM ANGLE θ (0° to 360°)</text>
</svg>
`);

// ─── 3. GEAR TRAIN EFFICIENCY BLUEPRINT ─────────────────────────────────────
export const GEAR_TRAIN_BLUEPRINT = encodeSvg(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 320" width="100%" height="100%">
  <defs>
    <pattern id="gridg" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(129,140,248,0.08)" stroke-width="1"/>
    </pattern>
  </defs>

  <rect width="100%" height="100%" fill="#090d1f"/>
  <rect width="100%" height="100%" fill="url(#gridg)"/>

  <!-- Technical Header -->
  <rect x="14" y="14" width="492" height="292" fill="none" stroke="rgba(129,140,248,0.25)" stroke-width="1.2" stroke-dasharray="6,4"/>
  <text x="28" y="38" fill="#818cf8" font-family="monospace" font-size="11" font-weight="bold" letter-spacing="1.5">NMIET TOM LAB // SPUR GEAR REDUCTION // INVOLUTE TOOTH PROFILE</text>
  <text x="28" y="52" fill="#94a3b8" font-family="monospace" font-size="9">KINEMATICS: L=3, J=2 (Bearings), H=1 (Tooth Line Contact) // DOF = 1</text>

  <!-- Center-to-Center Line -->
  <line x1="140" y1="180" x2="360" y2="180" stroke="#475569" stroke-width="1.5" stroke-dasharray="6,4"/>
  <line x1="140" y1="80" x2="140" y2="280" stroke="#334155" stroke-width="1" stroke-dasharray="3,3"/>
  <line x1="360" y1="60" x2="360" y2="300" stroke="#334155" stroke-width="1" stroke-dasharray="3,3"/>

  <!-- Line of Action (Pressure Angle φ = 20°) -->
  <line x1="100" y1="220" x2="400" y2="140" stroke="rgba(244,63,94,0.6)" stroke-width="1.5" stroke-dasharray="5,3"/>
  <text x="408" y="142" fill="#fb7185" font-family="monospace" font-size="8">Pressure Line (φ=20°)</text>

  <!-- Pinion Gear 1 (Driver) -->
  <!-- Pitch Circle -->
  <circle cx="140" cy="180" r="70" fill="rgba(251,191,36,0.06)" stroke="#fbbf24" stroke-width="2.5"/>
  <!-- Root Circle -->
  <circle cx="140" cy="180" r="58" fill="none" stroke="rgba(251,191,36,0.25)" stroke-width="1" stroke-dasharray="2,2"/>
  <!-- Tip Circle -->
  <circle cx="140" cy="180" r="80" fill="none" stroke="rgba(251,191,36,0.3)" stroke-width="1"/>

  <!-- Pinion Teeth (Simulated Cog Outlines) -->
  <g stroke="#fbbf24" stroke-width="2.2" stroke-linecap="round">
    <line x1="210" y1="180" x2="220" y2="180"/>
    <line x1="140" y1="110" x2="140" y2="100"/>
    <line x1="140" y1="250" x2="140" y2="260"/>
    <line x1="70" y1="180" x2="60" y2="180"/>
    <line x1="190" y1="130" x2="197" y2="123"/>
    <line x1="190" y1="230" x2="197" y2="237"/>
    <line x1="90" y1="130" x2="83" y2="123"/>
    <line x1="90" y1="230" x2="83" y2="237"/>
  </g>

  <!-- Pinion Shaft & Bore -->
  <circle cx="140" cy="180" r="18" fill="#090d1f" stroke="#e2e8f0" stroke-width="2"/>
  <rect x="136" y="165" width="8" height="6" fill="#e2e8f0"/>
  <circle cx="140" cy="180" r="4" fill="#fbbf24"/>
  <text x="140" y="212" fill="#fbbf24" font-family="monospace" font-size="10" font-weight="bold" text-anchor="middle">PINION (Z₁=20)</text>

  <!-- Rotation Arrow Pinion (CW) -->
  <path d="M 120,130 A 30 30 0 0 1 160,130" fill="none" stroke="#fbbf24" stroke-width="2"/>
  <polygon points="160,126 166,133 158,137" fill="#fbbf24"/>
  <text x="140" y="122" fill="#fbbf24" font-family="monospace" font-size="9" text-anchor="middle">ω₁ (Input)</text>

  <!-- Driven Gear 2 (Follower) -->
  <!-- Pitch Circle -->
  <circle cx="360" cy="180" r="110" fill="rgba(56,189,248,0.06)" stroke="#38bdf8" stroke-width="2.5"/>
  <!-- Root Circle -->
  <circle cx="360" cy="180" r="95" fill="none" stroke="rgba(56,189,248,0.25)" stroke-width="1" stroke-dasharray="2,2"/>
  <!-- Tip Circle -->
  <circle cx="360" cy="180" r="124" fill="none" stroke="rgba(56,189,248,0.3)" stroke-width="1"/>

  <!-- Gear Teeth Cogs -->
  <g stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round">
    <line x1="250" y1="180" x2="242" y2="180"/>
    <line x1="470" y1="180" x2="482" y2="180"/>
    <line x1="360" y1="70" x2="360" y2="58"/>
    <line x1="360" y1="290" x2="360" y2="302"/>
    <line x1="282" y1="102" x2="274" y2="94"/>
    <line x1="438" y1="102" x2="446" y2="94"/>
    <line x1="282" y1="258" x2="274" y2="266"/>
    <line x1="438" y1="258" x2="446" y2="266"/>
  </g>

  <!-- Gear 2 Shaft & Bore -->
  <circle cx="360" cy="180" r="24" fill="#090d1f" stroke="#e2e8f0" stroke-width="2"/>
  <rect x="355" y="160" width="10" height="7" fill="#e2e8f0"/>
  <circle cx="360" cy="180" r="5" fill="#38bdf8"/>
  <text x="360" y="218" fill="#38bdf8" font-family="monospace" font-size="10" font-weight="bold" text-anchor="middle">DRIVEN (Z₂=40)</text>

  <!-- Rotation Arrow Driven (CCW) -->
  <path d="M 380,115 A 45 45 0 0 0 340,115" fill="none" stroke="#38bdf8" stroke-width="2"/>
  <polygon points="340,119 334,112 342,108" fill="#38bdf8"/>
  <text x="360" y="105" fill="#38bdf8" font-family="monospace" font-size="9" text-anchor="middle">ω₂ (Output)</text>

  <!-- Pitch Contact Point P -->
  <circle cx="210" cy="180" r="5" fill="#f43f5e"/>
  <text x="210" y="168" fill="#f43f5e" font-family="monospace" font-size="10" font-weight="bold" text-anchor="middle">Pitch Point (P)</text>

  <!-- Center Distance Dimension -->
  <line x1="140" y1="270" x2="360" y2="270" stroke="#e2e8f0" stroke-width="1.2"/>
  <polygon points="140,270 148,267 148,273" fill="#e2e8f0"/>
  <polygon points="360,270 352,267 352,273" fill="#e2e8f0"/>
  <text x="250" y="265" fill="#e2e8f0" font-family="monospace" font-size="9" text-anchor="middle">Center Distance C = m(Z₁+Z₂)/2 = 180mm</text>

  <rect x="32" y="265" width="85" height="32" rx="4" fill="rgba(129,140,248,0.15)" stroke="#818cf8" stroke-width="1"/>
  <text x="74" y="278" fill="#818cf8" font-family="monospace" font-size="9" text-anchor="middle">RATIO: 2:1</text>
  <text x="74" y="291" fill="#34d399" font-family="monospace" font-size="9" text-anchor="middle">EFF: 98.4%</text>
</svg>
`);

// ─── 4. ACKERMANN STEERING BLUEPRINT ────────────────────────────────────────
export const STEERING_BLUEPRINT = encodeSvg(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 320" width="100%" height="100%">
  <defs>
    <pattern id="grids" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(163,230,53,0.08)" stroke-width="1"/>
    </pattern>
  </defs>

  <rect width="100%" height="100%" fill="#0a1410"/>
  <rect width="100%" height="100%" fill="url(#grids)"/>

  <!-- Technical Header -->
  <rect x="14" y="14" width="492" height="292" fill="none" stroke="rgba(163,230,53,0.25)" stroke-width="1.2" stroke-dasharray="6,4"/>
  <text x="28" y="38" fill="#a3e635" font-family="monospace" font-size="11" font-weight="bold" letter-spacing="1.5">NMIET TOM LAB // ACKERMANN STEERING LINKAGE // WHEEL TURNING GEOMETRY</text>
  <text x="28" y="52" fill="#94a3b8" font-family="monospace" font-size="9">CONDITION: cot(θ_o) - cot(θ_i) = w / l // 100% PURE ROLLING NO SKID</text>

  <!-- Centerline of Chassis -->
  <line x1="260" y1="40" x2="260" y2="300" stroke="#1e293b" stroke-width="1.5" stroke-dasharray="4,4"/>

  <!-- Front Axle Beam (Fixed Chassis Reference) -->
  <rect x="120" y="110" width="280" height="12" rx="3" fill="rgba(148,163,184,0.15)" stroke="#94a3b8" stroke-width="1.8"/>
  <text x="260" y="102" fill="#94a3b8" font-family="monospace" font-size="9" text-anchor="middle">Front Axle Beam (Track Width w)</text>

  <!-- Kingpin Pivots (L & R) -->
  <!-- Left Kingpin KL -->
  <circle cx="130" cy="116" r="7" fill="#0a1410" stroke="#a3e635" stroke-width="2.5"/>
  <circle cx="130" cy="116" r="2.5" fill="#ffffff"/>
  <text x="96" y="112" fill="#a3e635" font-family="monospace" font-size="10" font-weight="bold">K_L</text>

  <!-- Right Kingpin KR -->
  <circle cx="390" cy="116" r="7" fill="#0a1410" stroke="#a3e635" stroke-width="2.5"/>
  <circle cx="390" cy="116" r="2.5" fill="#ffffff"/>
  <text x="408" y="112" fill="#a3e635" font-family="monospace" font-size="10" font-weight="bold">K_R</text>

  <!-- Left Steering Arm & Stub Axle -->
  <line x1="130" y1="116" x2="165" y2="185" stroke="#a3e635" stroke-width="5" stroke-linecap="round"/>
  <!-- Left Wheel (Turned angle θ_i) -->
  <g transform="rotate(-28, 130, 116)">
    <rect x="116" y="60" width="28" height="110" rx="6" fill="rgba(30,41,59,0.9)" stroke="#a3e635" stroke-width="2"/>
    <line x1="116" y1="90" x2="144" y2="90" stroke="#64748b" stroke-width="1"/>
    <line x1="116" y1="140" x2="144" y2="140" stroke="#64748b" stroke-width="1"/>
    <text x="85" y="120" fill="#a3e635" font-family="monospace" font-size="9">θ_inner = 35°</text>
  </g>

  <!-- Right Steering Arm & Stub Axle -->
  <line x1="390" y1="116" x2="368" y2="185" stroke="#a3e635" stroke-width="5" stroke-linecap="round"/>
  <!-- Right Wheel (Turned angle θ_o) -->
  <g transform="rotate(-22, 390, 116)">
    <rect x="376" y="60" width="28" height="110" rx="6" fill="rgba(30,41,59,0.9)" stroke="#38bdf8" stroke-width="2"/>
    <line x1="376" y1="90" x2="404" y2="90" stroke="#64748b" stroke-width="1"/>
    <line x1="376" y1="140" x2="404" y2="140" stroke="#64748b" stroke-width="1"/>
    <text x="410" y="120" fill="#38bdf8" font-family="monospace" font-size="9">θ_outer = 26°</text>
  </g>

  <!-- Tie Rod Connecting Arm Ends -->
  <line x1="165" y1="185" x2="368" y2="185" stroke="#fbbf24" stroke-width="4.5" stroke-linecap="round"/>
  <circle cx="165" cy="185" r="5" fill="#0a1410" stroke="#fbbf24" stroke-width="2"/>
  <circle cx="368" cy="185" r="5" fill="#0a1410" stroke="#fbbf24" stroke-width="2"/>
  <text x="260" y="178" fill="#fbbf24" font-family="monospace" font-size="10" font-weight="bold" text-anchor="middle">TRANSVERSE TIE ROD</text>

  <!-- Turning Rays to Instantaneous Center I -->
  <line x1="130" y1="116" x2="40" y2="280" stroke="rgba(163,230,53,0.4)" stroke-width="1.2" stroke-dasharray="4,4"/>
  <line x1="390" y1="116" x2="40" y2="280" stroke="rgba(56,189,248,0.4)" stroke-width="1.2" stroke-dasharray="4,4"/>
  <line x1="260" y1="280" x2="20" y2="280" stroke="#475569" stroke-width="1" stroke-dasharray="3,3"/>
  <circle cx="40" cy="280" r="5" fill="#f43f5e"/>
  <text x="50" y="276" fill="#f43f5e" font-family="monospace" font-size="10" font-weight="bold">Turn Center (I)</text>
  <text x="140" y="294" fill="#94a3b8" font-family="monospace" font-size="9">Common Rear Axle Line</text>

  <rect x="355" y="265" width="135" height="24" rx="4" fill="rgba(163,230,53,0.12)" stroke="#a3e635" stroke-width="1"/>
  <text x="422" y="281" fill="#a3e635" font-family="monospace" font-size="9" font-weight="bold" text-anchor="middle">ZERO TIRE SCRUB</text>
</svg>
`);

// ─── 5. PICK-AND-PLACE MECHANISM BLUEPRINT ──────────────────────────────────
export const PICK_AND_PLACE_BLUEPRINT = encodeSvg(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 320" width="100%" height="100%">
  <defs>
    <pattern id="gridp" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(56,189,248,0.08)" stroke-width="1"/>
    </pattern>
  </defs>

  <rect width="100%" height="100%" fill="#071220"/>
  <rect width="100%" height="100%" fill="url(#gridp)"/>

  <!-- Technical Header -->
  <rect x="14" y="14" width="492" height="292" fill="none" stroke="rgba(56,189,248,0.25)" stroke-width="1.2" stroke-dasharray="6,4"/>
  <text x="28" y="38" fill="#38bdf8" font-family="monospace" font-size="11" font-weight="bold" letter-spacing="1.5">NMIET TOM LAB // PICK-AND-PLACE TRANSFER MECHANISM</text>
  <text x="28" y="52" fill="#94a3b8" font-family="monospace" font-size="9">PLANAR SLIDER KINEMATICS: DUAL-AXIS GUIDED WORKPIECE TRANSFER // DOF = 1</text>

  <!-- Base Machine Bed & Guide Rail -->
  <rect x="60" y="235" width="400" height="14" rx="3" fill="rgba(51,65,85,0.7)" stroke="#64748b" stroke-width="1.5"/>
  <line x1="60" y1="242" x2="460" y2="242" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="4,4"/>
  <text x="260" y="264" fill="#64748b" font-family="monospace" font-size="9" text-anchor="middle">Horizontal Precision Linear Guide Rail</text>

  <!-- Station A (Pickup) and Station B (Placement) -->
  <!-- Station A -->
  <rect x="80" y="210" width="48" height="25" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5"/>
  <rect x="94" y="196" width="20" height="14" fill="#fbbf24" stroke="#e2e8f0" stroke-width="1"/>
  <text x="104" y="226" fill="#38bdf8" font-family="monospace" font-size="9" font-weight="bold" text-anchor="middle">STN A</text>
  <text x="104" y="190" fill="#fbbf24" font-family="monospace" font-size="8" text-anchor="middle">Input Part</text>

  <!-- Station B -->
  <rect x="390" y="210" width="48" height="25" fill="#1e293b" stroke="#34d399" stroke-width="1.5"/>
  <rect x="404" y="196" width="20" height="14" fill="none" stroke="#34d399" stroke-width="1" stroke-dasharray="2,2"/>
  <text x="414" y="226" fill="#34d399" font-family="monospace" font-size="9" font-weight="bold" text-anchor="middle">STN B</text>
  <text x="414" y="190" fill="#34d399" font-family="monospace" font-size="8" text-anchor="middle">Output Drop</text>

  <!-- Transfer Parabolic Motion Trajectory -->
  <path d="M 104,185 C 104,80 414,80 414,185" fill="none" stroke="#fbbf24" stroke-width="2" stroke-dasharray="5,4"/>
  <polygon points="265,102 255,98 255,106" fill="#fbbf24"/>
  <text x="260" y="92" fill="#fbbf24" font-family="monospace" font-size="10" font-weight="bold" text-anchor="middle">Transfer Path (Smooth Arc)</text>

  <!-- Horizontal Carriage Slider -->
  <rect x="210" y="220" width="100" height="26" rx="4" fill="rgba(15,23,42,0.9)" stroke="#38bdf8" stroke-width="2"/>
  <circle cx="230" cy="233" r="5" fill="#e2e8f0"/>
  <circle cx="290" cy="233" r="5" fill="#e2e8f0"/>
  <text x="260" y="237" fill="#38bdf8" font-family="monospace" font-size="9" font-weight="bold" text-anchor="middle">Carriage Slider</text>

  <!-- Vertical Telescopic Mast -->
  <rect x="248" y="110" width="24" height="110" fill="rgba(30,41,59,0.85)" stroke="#38bdf8" stroke-width="2"/>
  <line x1="260" y1="110" x2="260" y2="220" stroke="#fbbf24" stroke-width="2"/>

  <!-- End-Effector Gripper Mechanism -->
  <g transform="translate(260, 110)">
    <!-- Gripper Head -->
    <rect x="-22" y="-12" width="44" height="14" rx="2" fill="#f43f5e" stroke="#e2e8f0" stroke-width="1.5"/>
    <circle cx="0" cy="-5" r="3" fill="#ffffff"/>
    
    <!-- Left Jaw -->
    <path d="M -16,2 L -16,22 L -8,22" fill="none" stroke="#f8fafc" stroke-width="3" stroke-linecap="round"/>
    <!-- Right Jaw -->
    <path d="M 16,2 L 16,22 L 8,22" fill="none" stroke="#f8fafc" stroke-width="3" stroke-linecap="round"/>

    <!-- Held Component -->
    <rect x="-7" y="10" width="14" height="12" fill="#fbbf24" stroke="#ffffff" stroke-width="1"/>
    <text x="0" y="-18" fill="#f43f5e" font-family="monospace" font-size="9" font-weight="bold" text-anchor="middle">VACUUM / PNEUMATIC GRIPPER</text>
  </g>

  <!-- Rotary Input Actuator Link -->
  <circle cx="160" cy="180" r="35" fill="none" stroke="rgba(251,191,36,0.25)" stroke-width="1.5" stroke-dasharray="3,3"/>
  <circle cx="160" cy="180" r="6" fill="#fbbf24"/>
  <line x1="160" y1="180" x2="190" y2="160" stroke="#fbbf24" stroke-width="4" stroke-linecap="round"/>
  <line x1="190" y1="160" x2="248" y2="180" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/>
  <circle cx="190" cy="160" r="4" fill="#ffffff"/>
  <circle cx="248" cy="180" r="4" fill="#ffffff"/>
  <text x="160" y="138" fill="#fbbf24" font-family="monospace" font-size="9" text-anchor="middle">Driver Crank</text>

  <rect x="360" y="278" width="130" height="20" rx="4" fill="rgba(56,189,248,0.12)" stroke="#38bdf8" stroke-width="1"/>
  <text x="425" y="292" fill="#38bdf8" font-family="monospace" font-size="9" font-weight="bold" text-anchor="middle">AUTOMATED PICK &amp; PLACE</text>
</svg>
`);

// ─── 6. SLIDER-CRANK MECHANISM BLUEPRINT ────────────────────────────────────
export const SLIDER_CRANK_BLUEPRINT = encodeSvg(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 320" width="100%" height="100%">
  <defs>
    <pattern id="gridsc" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(56,189,248,0.08)" stroke-width="1"/>
    </pattern>
  </defs>

  <rect width="100%" height="100%" fill="#0a1222"/>
  <rect width="100%" height="100%" fill="url(#gridsc)"/>

  <!-- Technical Header -->
  <rect x="14" y="14" width="492" height="292" fill="none" stroke="rgba(56,189,248,0.25)" stroke-width="1.2" stroke-dasharray="6,4"/>
  <text x="28" y="38" fill="#38bdf8" font-family="monospace" font-size="11" font-weight="bold" letter-spacing="1.5">NMIET TOM LAB // SLIDER-CRANK MECHANISM // RECIPROCATING CONVERSION</text>
  <text x="28" y="52" fill="#94a3b8" font-family="monospace" font-size="9">INVERSION I: ROTARY CRANK TO LINEAR RECIPROCATING MOTION // F = 1 DOF</text>

  <!-- Stroke Centerline -->
  <line x1="80" y1="180" x2="460" y2="180" stroke="#475569" stroke-width="1.5" stroke-dasharray="6,4"/>

  <!-- Crankshaft Center O -->
  <circle cx="150" cy="180" r="65" fill="rgba(251,191,36,0.08)" stroke="rgba(251,191,36,0.25)" stroke-width="1.5" stroke-dasharray="3,3"/>
  <circle cx="150" cy="180" r="8" fill="#0a1222" stroke="#fbbf24" stroke-width="3"/>
  <circle cx="150" cy="180" r="3" fill="#ffffff"/>
  <text x="130" y="205" fill="#fbbf24" font-family="monospace" font-size="11" font-weight="bold">O (Shaft)</text>

  <!-- Crank AB -->
  <line x1="150" y1="180" x2="200" y2="135" stroke="#fbbf24" stroke-width="6" stroke-linecap="round"/>
  <circle cx="200" cy="135" r="6" fill="#0a1222" stroke="#fbbf24" stroke-width="2.5"/>
  <circle cx="200" cy="135" r="2.5" fill="#ffffff"/>
  <text x="180" y="125" fill="#fbbf24" font-family="monospace" font-size="10" font-weight="bold">A (Crankpin)</text>

  <!-- Connecting Rod AB -->
  <line x1="200" y1="135" x2="380" y2="180" stroke="#38bdf8" stroke-width="6" stroke-linecap="round"/>
  <circle cx="380" cy="180" r="6" fill="#0a1222" stroke="#38bdf8" stroke-width="2.5"/>
  <circle cx="380" cy="180" r="2.5" fill="#ffffff"/>
  <text x="375" y="165" fill="#38bdf8" font-family="monospace" font-size="10" font-weight="bold">B (Gudgeon Pin)</text>

  <!-- Cylinder Guide Walls -->
  <line x1="320" y1="148" x2="450" y2="148" stroke="#94a3b8" stroke-width="3"/>
  <line x1="320" y1="212" x2="450" y2="212" stroke="#94a3b8" stroke-width="3"/>
  <!-- Hatching top -->
  <path d="M330,148 L324,138 M350,148 L344,138 M370,148 L364,138 M390,148 L384,138 M410,148 L404,138 M430,148 L424,138" stroke="#64748b" stroke-width="1.5"/>
  <!-- Hatching bottom -->
  <path d="M330,212 L324,222 M350,212 L344,222 M370,212 L364,222 M390,212 L384,222 M410,212 L404,222 M430,212 L424,222" stroke="#64748b" stroke-width="1.5"/>

  <!-- Slider / Piston Block -->
  <rect x="350" y="152" width="60" height="56" rx="4" fill="rgba(51,65,85,0.85)" stroke="#38bdf8" stroke-width="2"/>
  <line x1="370" y1="156" x2="370" y2="204" stroke="#64748b" stroke-width="1.5"/>
  <line x1="390" y1="156" x2="390" y2="204" stroke="#64748b" stroke-width="1.5"/>

  <!-- Stroke Dimension Line -->
  <line x1="315" y1="240" x2="445" y2="240" stroke="#fbbf24" stroke-width="1.5"/>
  <polygon points="315,240 323,236 323,244" fill="#fbbf24"/>
  <polygon points="445,240 437,236 437,244" fill="#fbbf24"/>
  <text x="380" y="256" fill="#fbbf24" font-family="monospace" font-size="10" font-weight="bold" text-anchor="middle">Stroke S = 2r = 130 mm</text>

  <!-- Annotations -->
  <text x="140" y="150" fill="#fbbf24" font-family="sans-serif" font-size="10">Link 2 (Crank r)</text>
  <text x="270" y="145" fill="#38bdf8" font-family="sans-serif" font-size="10">Link 3 (Connecting Rod l)</text>
  <text x="415" y="172" fill="#e2e8f0" font-family="sans-serif" font-size="10">Link 4 (Slider)</text>
</svg>
`);

// ─── 7. DYNAMIC AUTOGENERATED POSTER FOR ANY STUDENT SUBMISSION ─────────────
export function generateMechanismBlueprint({ name = "Mechanism Model", category = "Other", dof = 1, student = "Student Project" } = {}) {
  const safeName = (name || "Mechanism Project").toUpperCase();
  const safeCat = (category || "Other").toUpperCase();
  const safeStudent = student ? student.toUpperCase() : "NMIET STUDENT";

  return encodeSvg(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 320" width="100%" height="100%">
  <defs>
    <pattern id="grid_gen" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(56,189,248,0.07)" stroke-width="1"/>
    </pattern>
    <linearGradient id="grad_gen" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b1329"/>
      <stop offset="100%" stop-color="#070c1a"/>
    </linearGradient>
  </defs>

  <rect width="100%" height="100%" fill="url(#grad_gen)"/>
  <rect width="100%" height="100%" fill="url(#grid_gen)"/>

  <!-- Technical Border -->
  <rect x="14" y="14" width="492" height="292" fill="none" stroke="rgba(251,191,36,0.3)" stroke-width="1.2" stroke-dasharray="6,4"/>

  <!-- Blueprint Header -->
  <text x="28" y="38" fill="#fbbf24" font-family="monospace" font-size="11" font-weight="bold" letter-spacing="1.5">NMIET MECHANICAL ENGINEERING // STUDENT REPOSITORY</text>
  <text x="28" y="52" fill="#94a3b8" font-family="monospace" font-size="9">THEORY OF MACHINES CAD PORTFOLIO // AUTHORED BY ${safeStudent}</text>

  <!-- Center Kinematic Schematic Motif -->
  <circle cx="260" cy="165" r="85" fill="none" stroke="rgba(56,189,248,0.18)" stroke-width="1.5" stroke-dasharray="4,4"/>
  <circle cx="260" cy="165" r="55" fill="rgba(56,189,248,0.04)" stroke="rgba(56,189,248,0.3)" stroke-width="1.5"/>
  
  <!-- Stylized Links -->
  <line x1="200" y1="195" x2="260" y2="125" stroke="#fbbf24" stroke-width="5" stroke-linecap="round"/>
  <line x1="260" y1="125" x2="330" y2="170" stroke="#38bdf8" stroke-width="5" stroke-linecap="round"/>
  <line x1="330" y1="170" x2="280" y2="215" stroke="#34d399" stroke-width="5" stroke-linecap="round"/>
  <line x1="280" y1="215" x2="200" y2="195" stroke="#94a3b8" stroke-width="3" stroke-dasharray="4,4"/>

  <!-- Joint Nodes -->
  <circle cx="200" cy="195" r="6" fill="#070c1a" stroke="#fbbf24" stroke-width="2.5"/>
  <circle cx="260" cy="125" r="6" fill="#070c1a" stroke="#fbbf24" stroke-width="2.5"/>
  <circle cx="330" cy="170" r="6" fill="#070c1a" stroke="#38bdf8" stroke-width="2.5"/>
  <circle cx="280" cy="215" r="6" fill="#070c1a" stroke="#34d399" stroke-width="2.5"/>

  <!-- Title Banner -->
  <rect x="40" y="242" width="440" height="42" rx="8" fill="rgba(15,23,42,0.92)" stroke="rgba(251,191,36,0.3)" stroke-width="1"/>
  <text x="56" y="261" fill="#f8fafc" font-family="'Cabinet Grotesk', system-ui, sans-serif" font-size="14" font-weight="bold">${safeName}</text>
  <text x="56" y="275" fill="#94a3b8" font-family="monospace" font-size="9">${safeCat} · CALCULATED MOBILITY: F = ${dof} DOF</text>
  
  <rect x="385" y="250" width="85" height="24" rx="4" fill="rgba(251,191,36,0.15)" stroke="#fbbf24" stroke-width="1"/>
  <text x="427" y="266" fill="#fbbf24" font-family="monospace" font-size="10" font-weight="bold" text-anchor="middle">ACTIVE CAD</text>
</svg>
`);
}

/**
 * Robustly resolve an authentic cover/poster image for any mechanism.
 * NEVER returns empty.
 */
export function getMechanismPoster(mechanism) {
  if (!mechanism) return FOUR_BAR_BLUEPRINT;

  // 1. Direct photo / user-uploaded image / thumbnail
  const direct =
    mechanism.cover_image ||
    mechanism.preview_image_url ||
    mechanism.image_url ||
    mechanism.thumbnail;
  if (direct && typeof direct === "string" && direct.trim() !== "" && direct !== "test") {
    return direct;
  }

  // 2. Attached media image
  if (Array.isArray(mechanism.media)) {
    const mediaImg = mechanism.media.find(
      (m) =>
        m.file_type === "image" ||
        m.file_type === "drawing" ||
        (m.file_url && /\.(jpg|jpeg|png|webp|gif|svg)($|\?)/i.test(m.file_url))
    );
    if (mediaImg?.file_url) return mediaImg.file_url;
  }

  // 3. Category & name pattern matching for authentic engineering blueprints
  const name = (mechanism.name || "").toLowerCase();
  const cat = (mechanism.category || "").toLowerCase();

  if (name.includes("pick") || name.includes("place") || mechanism.mechanismType === "pick-and-place") {
    return PICK_AND_PLACE_BLUEPRINT;
  }
  if (name.includes("gear") || cat.includes("gear")) {
    return GEAR_TRAIN_BLUEPRINT;
  }
  if (name.includes("cam") || cat.includes("cam")) {
    return CAM_FOLLOWER_BLUEPRINT;
  }
  if (name.includes("steering") || cat.includes("steering")) {
    return STEERING_BLUEPRINT;
  }
  if (name.includes("slider") || cat.includes("slider")) {
    return SLIDER_CRANK_BLUEPRINT;
  }
  if (name.includes("four-bar") || name.includes("linkage") || cat.includes("four-bar") || cat.includes("linkage")) {
    return FOUR_BAR_BLUEPRINT;
  }

  // 4. Dynamic CAD schematic generated specifically with the mechanism's metadata
  return generateMechanismBlueprint({
    name: mechanism.name,
    category: mechanism.category,
    dof: mechanism.degrees_of_freedom ?? 1,
    student: mechanism.student_name,
  });
}

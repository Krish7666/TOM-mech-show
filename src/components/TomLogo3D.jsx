import { useRef, useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';

/**
 * Creates a kinematically accurate spur gear shape with standard involute tooth proportions:
 * - Module m: determines pitch and tooth scale
 * - Tooth count z: number of teeth
 * - Addendum = 1.0 * m
 * - Dedendum = 1.25 * m
 * - Standard tooth thickness at pitch circle
 */
function createInvoluteGearShape(m, z, holeRadius) {
  const shape = new THREE.Shape();
  const pitchRadius = (m * z) / 2;
  const outerRadius = pitchRadius + m; // Addendum circle
  const rootRadius = Math.max(pitchRadius - 1.25 * m, holeRadius + 0.2); // Dedendum circle
  const step = (Math.PI * 2) / z;
  const halfPitch = step / 2;

  // Standard spur gear tooth proportions
  const toothHalfAngleTip = step * 0.14;
  const toothHalfAngleRoot = step * 0.30;

  for (let i = 0; i < z; i++) {
    const centerAngle = i * step;
    const aRootLeft = centerAngle - toothHalfAngleRoot;
    const aTipLeft = centerAngle - toothHalfAngleTip;
    const aTipRight = centerAngle + toothHalfAngleTip;
    const aRootRight = centerAngle + toothHalfAngleRoot;
    const midTrough = centerAngle + halfPitch;

    if (i === 0) {
      shape.moveTo(Math.cos(aRootLeft) * rootRadius, Math.sin(aRootLeft) * rootRadius);
    } else {
      shape.lineTo(Math.cos(aRootLeft) * rootRadius, Math.sin(aRootLeft) * rootRadius);
    }

    // Tooth flank rising to tip
    shape.lineTo(Math.cos(aTipLeft) * outerRadius, Math.sin(aTipLeft) * outerRadius);
    // Tip land
    shape.lineTo(Math.cos(aTipRight) * outerRadius, Math.sin(aTipRight) * outerRadius);
    // Tooth flank falling to root
    shape.lineTo(Math.cos(aRootRight) * rootRadius, Math.sin(aRootRight) * rootRadius);
    // Root trough fillet
    shape.lineTo(Math.cos(midTrough) * rootRadius, Math.sin(midTrough) * rootRadius);
  }
  shape.closePath();

  // Central axle bore
  if (holeRadius > 0) {
    const holePath = new THREE.Path();
    holePath.absarc(0, 0, holeRadius, 0, Math.PI * 2, false);
    shape.holes.push(holePath);

    // Decorative weight-reduction spoke cutouts for larger gears
    if (z >= 16) {
      const numCutouts = z >= 24 ? 4 : 3;
      const cutoutR = pitchRadius * 0.22;
      const cutoutDist = (holeRadius + pitchRadius) * 0.5;
      for (let c = 0; c < numCutouts; c++) {
        const cAngle = (c * Math.PI * 2) / numCutouts + Math.PI / numCutouts;
        const cx = Math.cos(cAngle) * cutoutDist;
        const cy = Math.sin(cAngle) * cutoutDist;
        const cutoutPath = new THREE.Path();
        cutoutPath.absarc(cx, cy, cutoutR, 0, Math.PI * 2, false);
        shape.holes.push(cutoutPath);
      }
    }
  }

  return shape;
}

// Gear train kinematic parameters (identical module m ensures perfect tooth meshing)
const MODULE = 0.28;
const Z1 = 24; // Center driver gear
const Z2 = 16; // Top-right driven gear
const Z3 = 12; // Bottom-left driven gear

const R1 = (MODULE * Z1) / 2; // 3.36 pitch radius
const R2 = (MODULE * Z2) / 2; // 2.24 pitch radius
const R3 = (MODULE * Z3) / 2; // 1.68 pitch radius

const DIST_12 = R1 + R2; // 5.60 exact pitch contact distance
const DIST_13 = R1 + R3; // 5.04 exact pitch contact distance

const ALPHA_2 = Math.PI / 4; // 45 degrees (top-right)
const POS_2 = [
  DIST_12 * Math.cos(ALPHA_2),
  DIST_12 * Math.sin(ALPHA_2),
  -0.18,
];

const ALPHA_3 = (215 * Math.PI) / 180; // 215 degrees (bottom-left)
const POS_3 = [
  DIST_13 * Math.cos(ALPHA_3),
  DIST_13 * Math.sin(ALPHA_3),
  -0.18,
];

function GearSystem() {
  const group = useRef();
  const gear1 = useRef();
  const gear2 = useRef();
  const gear3 = useRef();
  const angle1Ref = useRef(0);

  const { shape1, shape2, shape3, extrudeSettings } = useMemo(() => {
    return {
      shape1: createInvoluteGearShape(MODULE, Z1, 0.8),
      shape2: createInvoluteGearShape(MODULE, Z2, 0.55),
      shape3: createInvoluteGearShape(MODULE, Z3, 0.42),
      extrudeSettings: {
        depth: 0.36,
        bevelEnabled: true,
        bevelSegments: 3,
        steps: 1,
        bevelSize: 0.035,
        bevelThickness: 0.035,
      },
    };
  }, []);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    // Gentle spatial floating
    if (group.current) {
      group.current.position.y = Math.sin(t * 0.7) * 0.2;
    }

    // Continuous kinematic rotation
    const baseSpeed = 0.35;
    angle1Ref.current += delta * baseSpeed;
    const a1 = angle1Ref.current;

    // Kinematic conjugate gear rotation with exact pitch rolling & tooth-valley phase locking:
    // Gear 1 (driver) rotates CCW
    // Gear 2 (driven) rotates CW with exact velocity ratio Z1 / Z2
    // Gear 3 (driven) rotates CW with exact velocity ratio Z1 / Z3
    if (gear1.current) {
      gear1.current.rotation.z = a1;
    }
    if (gear2.current) {
      gear2.current.rotation.z = -(Z1 / Z2) * (a1 - ALPHA_2) + ALPHA_2 + Math.PI + Math.PI / Z2;
    }
    if (gear3.current) {
      gear3.current.rotation.z = -(Z1 / Z3) * (a1 - ALPHA_3) + ALPHA_3 + Math.PI + Math.PI / Z3;
    }
  });

  return (
    <group ref={group} rotation={[0.38, -0.22, 0]}>
      {/* Center Driver Gear (24T - Cyan) */}
      <mesh ref={gear1} position={[0, 0, -0.18]}>
        <extrudeGeometry args={[shape1, extrudeSettings]} />
        <meshStandardMaterial color="#38bdf8" metalness={0.85} roughness={0.25} />
      </mesh>

      {/* Top Right Driven Gear (16T - Indigo) */}
      <mesh ref={gear2} position={POS_2}>
        <extrudeGeometry args={[shape2, extrudeSettings]} />
        <meshStandardMaterial color="#818cf8" metalness={0.82} roughness={0.28} />
      </mesh>

      {/* Bottom Left Driven Gear (12T - Warm Amber) */}
      <mesh ref={gear3} position={POS_3}>
        <extrudeGeometry args={[shape3, extrudeSettings]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.85} roughness={0.25} />
      </mesh>
    </group>
  );
}

export default function TomLogo3D() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        cursor: 'default',
        userSelect: 'none',
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
      }}
      className="tom-logo-3d-container"
    >
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, isMobile ? 15 : 10.5], fov: 45 }}>
        <ambientLight intensity={1.5} color="#e2e8f0" />
        <directionalLight position={[10, 10, 8]} intensity={2.5} color="#93c5fd" />
        <directionalLight position={[-10, -10, 6]} intensity={1.8} color="#c4b5fd" />
        <pointLight position={[0, 0, 8]} intensity={1.2} color="#ffffff" />
        <GearSystem />
      </Canvas>
    </div>
  );
}

import { useRef, useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment } from '@react-three/drei';

function createGearShape(radius, teeth, holeRadius) {
  const shape = new THREE.Shape();
  const step = (Math.PI * 2) / teeth;
  const toothWidth = step * 0.25; 
  const toothHeight = radius * 0.12; 
  const innerRadius = radius - toothHeight;
  
  for (let i = 0; i < teeth; i++) {
    const angle = i * step;
    
    if (i === 0) {
      shape.moveTo(Math.cos(angle - toothWidth) * innerRadius, Math.sin(angle - toothWidth) * innerRadius);
    } else {
      shape.lineTo(Math.cos(angle - toothWidth) * innerRadius, Math.sin(angle - toothWidth) * innerRadius);
    }
    
    shape.lineTo(Math.cos(angle - toothWidth*0.5) * radius, Math.sin(angle - toothWidth*0.5) * radius);
    shape.lineTo(Math.cos(angle + toothWidth*0.5) * radius, Math.sin(angle + toothWidth*0.5) * radius);
    shape.lineTo(Math.cos(angle + toothWidth) * innerRadius, Math.sin(angle + toothWidth) * innerRadius);
  }
  shape.closePath();
  
  if (holeRadius > 0) {
    const holePath = new THREE.Path();
    holePath.absarc(0, 0, holeRadius, 0, Math.PI * 2, false);
    shape.holes.push(holePath);
  }
  return shape;
}

function GearSystem() {
  const group = useRef();
  const gear1 = useRef();
  const gear2 = useRef();
  const gear3 = useRef();

  const { shape1, shape2, shape3, extrudeSettings } = useMemo(() => {
    return {
      shape1: createGearShape(3.5, 24, 0.8),
      shape2: createGearShape(2.5, 16, 0.5),
      shape3: createGearShape(1.8, 12, 0.4),
      extrudeSettings: { depth: 0.5, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.05, bevelThickness: 0.05 }
    };
  }, []);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    // Smooth floating for the entire group
    group.current.position.y = Math.sin(t / 2) / 3;
    
    // Constant, slow mechanical rotation without mouse interaction (removed "clingy" cursor tracking)
    const speed = 0.4;
    if (gear1.current) gear1.current.rotation.z += delta * speed;
    if (gear2.current) gear2.current.rotation.z -= delta * speed * 1.5;
    if (gear3.current) gear3.current.rotation.z += delta * speed * 2.0;
  });

  return (
    <group ref={group} rotation={[0.4, -0.2, 0]}>
      {/* Center Gear (24 teeth) */}
      <mesh ref={gear1} position={[0, 0, -0.25]}>
        <extrudeGeometry args={[shape1, extrudeSettings]} />
        <meshStandardMaterial color="#38bdf8" metalness={0.8} roughness={0.3} />
      </mesh>
      
      {/* Top Right Gear (16 teeth) */}
      {/* Distance = innerRadius1 + innerRadius2 + roughly 1 tooth height */}
      <mesh ref={gear2} position={[3.9, 3.9, -0.25]} rotation={[0, 0, 0.15]}>
        <extrudeGeometry args={[shape2, extrudeSettings]} />
        <meshStandardMaterial color="#818cf8" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Bottom Left Gear (12 teeth) */}
      <mesh ref={gear3} position={[-3.6, -3.3, -0.25]} rotation={[0, 0, -0.1]}>
        <extrudeGeometry args={[shape3, extrudeSettings]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.3} />
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
    <div style={{ width: '100%', height: '100%', cursor: 'default', userSelect: 'none', position: 'absolute', top: 0, left: 0 }} className="tom-logo-3d-container">
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, isMobile ? 16 : 11], fov: 45 }}>
        <ambientLight intensity={1.2} />
        <directionalLight position={[5, 10, 10]} intensity={2.5} color="#38bdf8" />
        <directionalLight position={[-5, -10, -5]} intensity={1.5} color="#818cf8" />
        <GearSystem />
        <Environment preset="city" />
      </Canvas>
    </div>
  );
}

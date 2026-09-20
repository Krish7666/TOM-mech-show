import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float, ContactShadows } from '@react-three/drei';

function MechanicalLogo() {
  const group = useRef();
  
  // Rotate the entire mechanism over time and slightly react to mouse
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    group.current.rotation.z = -t * 0.15; // Constant gear rotation
    group.current.position.y = Math.sin(t / 2) / 4;
    
    // Mouse interaction tilt
    const targetX = state.pointer.y * 0.4;
    const targetY = state.pointer.x * 0.4;
    group.current.rotation.x += (targetX - group.current.rotation.x) * 0.05;
    group.current.rotation.y += (targetY - group.current.rotation.y) * 0.05;
  });

  // Gear teeth generator
  const createTeeth = (radius, count, color) => {
    return Array.from({ length: count }).map((_, i) => {
      const angle = (i / count) * Math.PI * 2;
      return (
        <mesh key={i} position={[Math.cos(angle) * radius, Math.sin(angle) * radius, 0]} rotation={[0, 0, angle]}>
          <boxGeometry args={[0.4, 0.5, 0.4]} />
          <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
        </mesh>
      );
    });
  };

  return (
    <group ref={group}>
      {/* Background large gear */}
      <group position={[0, 0, -1]} rotation={[0, 0, Math.PI / 8]}>
        <mesh>
          <torusGeometry args={[3.5, 0.3, 16, 100]} />
          <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.3} />
        </mesh>
        {createTeeth(3.5, 24, "#334155")}
      </group>

      {/* Main Central Gear Ring */}
      <mesh>
        <torusGeometry args={[1.5, 0.2, 16, 100]} />
        <meshStandardMaterial color="#38bdf8" metalness={0.8} roughness={0.2} />
      </mesh>
      {createTeeth(1.5, 12, "#0ea5e9")}
      
      {/* Central Hub */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.3, 32]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.4, 32]} />
        <meshStandardMaterial color="#0b0f19" />
      </mesh>

      {/* Offset secondary gear */}
      <group position={[2.8, 2.8, 0]} rotation={[0, 0, -Math.PI / 4]}>
         <mesh>
          <torusGeometry args={[1.0, 0.15, 16, 50]} />
          <meshStandardMaterial color="#818cf8" metalness={0.8} roughness={0.2} />
        </mesh>
        {createTeeth(1.0, 8, "#6366f1")}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.9} />
        </mesh>
      </group>

      {/* Offset tertiary gear */}
      <group position={[-3.2, -1.5, 0]} rotation={[0, 0, Math.PI / 6]}>
         <mesh>
          <torusGeometry args={[1.2, 0.18, 16, 50]} />
          <meshStandardMaterial color="#10b981" metalness={0.8} roughness={0.2} />
        </mesh>
        {createTeeth(1.2, 10, "#059669")}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.4, 0.4, 0.2, 16]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.9} />
        </mesh>
      </group>

      {/* Kinematic Linkages */}
      <group>
        {/* Link from center to secondary */}
        <mesh position={[1.4, 1.4, 0.4]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[3.8, 0.2, 0.1]} />
          <meshStandardMaterial color="#818cf8" metalness={0.6} roughness={0.3} />
        </mesh>
        {/* Link from center to tertiary */}
        <mesh position={[-1.6, -0.75, 0.4]} rotation={[0, 0, Math.atan2(-1.5, -3.2)]}>
          <boxGeometry args={[3.5, 0.2, 0.1]} />
          <meshStandardMaterial color="#10b981" metalness={0.6} roughness={0.3} />
        </mesh>
        
        {/* Joints / Bearings */}
        {[[0, 0, 0.4], [2.8, 2.8, 0.4], [-3.2, -1.5, 0.4]].map((pos, idx) => (
          <mesh key={idx} position={pos} rotation={[Math.PI/2, 0, 0]}>
            <cylinderGeometry args={[0.25, 0.25, 0.2, 16]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.2} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export default function TomLogo3D() {
  return (
    <div style={{ width: '100%', height: '100%', cursor: 'grab', userSelect: 'none', position: 'absolute', top: 0, left: 0 }} className="tom-logo-3d-container">
      <Canvas camera={{ position: [0, 0, 10], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={1.5} color="#38bdf8" />
        <directionalLight position={[-5, -10, -5]} intensity={1} color="#818cf8" />
        <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.2}>
          <MechanicalLogo />
        </Float>
        <Environment preset="city" />
      </Canvas>
    </div>
  );
}

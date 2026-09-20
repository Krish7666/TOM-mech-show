import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float, ContactShadows } from '@react-three/drei';

function MechanicalLogo() {
  const group = useRef();
  
  // Rotate the entire mechanism over time and slightly react to mouse
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    group.current.rotation.z = -t * 0.2; // Constant gear rotation
    group.current.position.y = Math.sin(t / 1.5) / 10;
    
    // Mouse interaction tilt
    const targetX = state.pointer.y * 0.3;
    const targetY = state.pointer.x * 0.3;
    group.current.rotation.x += (targetX - group.current.rotation.x) * 0.1;
    group.current.rotation.y += (targetY - group.current.rotation.y) * 0.1;
  });

  // Gear teeth
  const teeth = useMemo(() => {
    const count = 12;
    return Array.from({ length: count }).map((_, i) => {
      const angle = (i / count) * Math.PI * 2;
      return (
        <mesh key={i} position={[Math.cos(angle) * 1.5, Math.sin(angle) * 1.5, 0]} rotation={[0, 0, angle]}>
          <boxGeometry args={[0.3, 0.4, 0.4]} />
          <meshStandardMaterial color="#0ea5e9" metalness={0.8} roughness={0.2} />
        </mesh>
      );
    });
  }, []);

  return (
    <group ref={group}>
      {/* Central Gear Ring */}
      <mesh>
        <torusGeometry args={[1.5, 0.2, 16, 100]} />
        <meshStandardMaterial color="#38bdf8" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Central Hub */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.3, 32]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.4, 32]} />
        <meshStandardMaterial color="#0b0f19" />
      </mesh>

      {/* Gear Teeth */}
      {teeth}

      {/* Kinematic Linkage (Outer frame) */}
      <group>
        {/* Top Left to Bottom Right */}
        <mesh position={[0, 0, 0.4]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[4.8, 0.15, 0.1]} />
          <meshStandardMaterial color="#818cf8" metalness={0.6} roughness={0.3} />
        </mesh>
        {/* Top Right to Bottom Left */}
        <mesh position={[0, 0, -0.4]} rotation={[0, 0, -Math.PI / 4]}>
          <boxGeometry args={[4.8, 0.15, 0.1]} />
          <meshStandardMaterial color="#818cf8" metalness={0.6} roughness={0.3} />
        </mesh>
        
        {/* Joints */}
        {[[-1.7, 1.7, 0.4], [1.7, -1.7, 0.4], [1.7, 1.7, -0.4], [-1.7, -1.7, -0.4]].map((pos, idx) => (
          <mesh key={idx} position={pos} rotation={[Math.PI/2, 0, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.2, 16]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.2} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export default function TomLogo3D() {
  return (
    <div style={{ width: '100%', height: '350px', cursor: 'grab', userSelect: 'none' }} className="tom-logo-3d-container">
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={1.5} color="#38bdf8" />
        <directionalLight position={[-5, -10, -5]} intensity={1} color="#818cf8" />
        <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
          <MechanicalLogo />
        </Float>
        <Environment preset="city" />
        <ContactShadows position={[0, -2.5, 0]} opacity={0.6} scale={10} blur={2} far={4} color="#000000" />
      </Canvas>
    </div>
  );
}

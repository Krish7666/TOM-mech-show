import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float } from '@react-three/drei';

function MechanicalLogo() {
  const group = useRef();
  
  // Rotate the gyroscope rings
  const ring1 = useRef();
  const ring2 = useRef();
  const ring3 = useRef();
  const core = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    
    // Smooth floating
    group.current.position.y = Math.sin(t / 2) / 3;
    
    // Mouse interaction tilt
    const targetX = state.pointer.y * 0.5;
    const targetY = state.pointer.x * 0.5;
    group.current.rotation.x += (targetX - group.current.rotation.x) * 0.05;
    group.current.rotation.y += (targetY - group.current.rotation.y) * 0.05;

    // Gyroscope ring rotations
    if (ring1.current) ring1.current.rotation.x = t * 0.4;
    if (ring2.current) ring2.current.rotation.y = t * 0.6;
    if (ring3.current) ring3.current.rotation.z = t * 0.8;
    if (core.current) {
      core.current.rotation.x = t;
      core.current.rotation.y = t * 1.2;
      // Pulse emissive intensity
      core.current.material.emissiveIntensity = 2 + Math.sin(t * 3) * 1.5;
    }
  });

  return (
    <group ref={group}>
      {/* Outer Ring */}
      <mesh ref={ring1}>
        <torusGeometry args={[3.5, 0.08, 16, 100]} />
        <meshStandardMaterial color="#38bdf8" metalness={0.9} roughness={0.1} emissive="#0ea5e9" emissiveIntensity={1.2} />
      </mesh>
      
      {/* Middle Ring */}
      <mesh ref={ring2} rotation={[Math.PI / 4, 0, 0]}>
        <torusGeometry args={[2.8, 0.12, 16, 100]} />
        <meshStandardMaterial color="#818cf8" metalness={0.8} roughness={0.2} emissive="#4f46e5" emissiveIntensity={1.5} />
      </mesh>

      {/* Inner Ring */}
      <mesh ref={ring3} rotation={[0, Math.PI / 4, 0]}>
        <torusGeometry args={[2.1, 0.05, 16, 100]} />
        <meshStandardMaterial color="#fbbf24" metalness={1} roughness={0} emissive="#d97706" emissiveIntensity={1.2} />
      </mesh>

      {/* Glowing Energy Core */}
      <mesh ref={core}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#ffffff" metalness={0.2} roughness={0.1} emissive="#38bdf8" emissiveIntensity={3} wireframe />
      </mesh>
      
      <mesh>
         <sphereGeometry args={[0.6, 32, 32]} />
         <meshStandardMaterial color="#0b0f19" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Abstract technical orbit lines */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[4.5, 4.52, 64]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.4} side={2} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <ringGeometry args={[5, 5.02, 64]} />
        <meshBasicMaterial color="#818cf8" transparent opacity={0.35} side={2} />
      </mesh>
    </group>
  );
}

export default function TomLogo3D() {
  return (
    <div style={{ width: '100%', height: '100%', cursor: 'grab', userSelect: 'none', position: 'absolute', top: 0, left: 0 }} className="tom-logo-3d-container">
      <Canvas camera={{ position: [0, 0, 7], fov: 45 }}>
        <ambientLight intensity={1.2} />
        <directionalLight position={[5, 10, 5]} intensity={2.5} color="#38bdf8" />
        <directionalLight position={[-5, -10, -5]} intensity={1.5} color="#818cf8" />
        <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.2}>
          <MechanicalLogo />
        </Float>
        <Environment preset="city" />
      </Canvas>
    </div>
  );
}

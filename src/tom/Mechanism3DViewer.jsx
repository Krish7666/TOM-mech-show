import React, { Suspense } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { Stage, OrbitControls, useGLTF } from '@react-three/drei';
import { STLLoader } from 'three-stdlib';
import * as THREE from 'three';

// STL Component
function STLModel({ url }) {
  const geom = useLoader(STLLoader, url);
  return (
    <mesh geometry={geom}>
      <meshStandardMaterial color="#818cf8" metalness={0.6} roughness={0.4} />
    </mesh>
  );
}

// GLTF Component
function GLTFModel({ url }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

export default function Mechanism3DViewer({ url }) {
  const isStl = url.toLowerCase().endsWith('.stl');
  const isGltf = url.toLowerCase().endsWith('.gltf') || url.toLowerCase().endsWith('.glb');

  if (!isStl && !isGltf) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
        <p>Unsupported 3D format.</p>
        <a href={url} target="_blank" rel="noopener noreferrer" className="secondary-btn">
          Download File
        </a>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '400px', backgroundColor: '#07070d', borderRadius: '12px', overflow: 'hidden' }}>
      <Canvas shadows dpr={[1, 2]} camera={{ fov: 50 }}>
        <Suspense fallback={null}>
          <Stage environment="city" intensity={0.6} adjustCamera>
            {isStl && <STLModel url={url} />}
            {isGltf && <GLTFModel url={url} />}
          </Stage>
        </Suspense>
        <OrbitControls makeDefault autoRotate autoRotateSpeed={1} enableZoom={true} />
      </Canvas>
    </div>
  );
}

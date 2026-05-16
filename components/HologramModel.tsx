import React, { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { MeshDistortMaterial, RoundedBox, Float, ContactShadows, Edges } from '@react-three/drei';
import * as THREE from 'three';

interface HologramProps {
  type: 'STRIKER' | 'GHOST' | 'TITAN';
}

const CharacterShape: React.FC<HologramProps> = ({ type }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  // Rotate slowly
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime) * 0.1;
    }
  });

  const getGeometryAndColor = () => {
    switch (type) {
      case 'TITAN':
        // A heavy, chunky cube representation
        return { color: '#78716c', element: <RoundedBox args={[2, 2.5, 2]} radius={0.1} /> };
      case 'GHOST':
        // A sleek, stealthy tetrahedron representation
        return { color: '#22d3ee', element: <coneGeometry args={[1.5, 3, 4]} /> };
      case 'STRIKER':
      default:
        // A standard tactical cylinder representation
        return { color: '#f97316', element: <cylinderGeometry args={[1, 1, 2.5, 8]} /> };
    }
  };

  const { color, element } = getGeometryAndColor();

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <mesh ref={meshRef}>
        {element}
        {/* Holographic Wireframe Material */}
        <MeshDistortMaterial
          color={color}
          envMapIntensity={1}
          clearcoat={1}
          clearcoatRoughness={0.1}
          metalness={0.8}
          roughness={0.2}
          wireframe={true}
          transparent={true}
          opacity={0.8}
          distort={type === 'GHOST' ? 0.3 : 0} // Ghost gets a glitchy effect
          speed={type === 'GHOST' ? 4 : 1}
        />
        <Edges scale={1.05} threshold={15} color={color} />
      </mesh>
    </Float>
  );
};

// Error Boundary to prevent R3F crashes from killing the whole app
class R3FErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn('[HologramModel] 3D render failed, falling back to 2D:', error.message);
  }

  render() {
    if (this.state.hasError) {
      // Graceful 2D fallback
      return (
        <div className="w-full h-full absolute inset-0 pointer-events-none z-0 flex items-center justify-center opacity-20">
          <div className="w-24 h-24 border-2 border-orange-500/30 rounded-lg rotate-45 animate-pulse"></div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const HologramModel: React.FC<HologramProps> = ({ type }) => {
  return (
    <div className="w-full h-full absolute inset-0 mix-blend-screen pointer-events-none z-0 opacity-80">
      <R3FErrorBoundary>
        <Suspense fallback={null}>
          <Canvas camera={{ position: [0, 0, 8], fov: 40 }}>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} color="#ffffff" />
            <pointLight position={[-10, -10, -10]} intensity={2} color="#f97316" />
            <CharacterShape type={type} />
            <ContactShadows position={[0, -2.5, 0]} opacity={0.4} scale={10} blur={2} far={4} color="#000000" />
          </Canvas>
        </Suspense>
      </R3FErrorBoundary>
      {/* Scanning Laser Effect Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent w-full h-[5%] animate-[scan_3s_ease-in-out_infinite]"></div>
    </div>
  );
};

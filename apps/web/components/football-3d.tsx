"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import { useRef, useMemo } from "react";
import * as THREE from "three";

function seededUnit(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function GlobeMesh() {
  const coreRef = useRef<THREE.Mesh>(null);
  const wire1Ref = useRef<THREE.Mesh>(null);
  const wire2Ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (coreRef.current) {
      coreRef.current.rotation.y += 0.004;
      coreRef.current.rotation.x = Math.sin(t * 0.3) * 0.06;
    }
    if (wire1Ref.current) {
      wire1Ref.current.rotation.y -= 0.003;
      wire1Ref.current.rotation.z += 0.001;
    }
    if (wire2Ref.current) {
      wire2Ref.current.rotation.y += 0.002;
      wire2Ref.current.rotation.x -= 0.001;
    }
  });

  return (
    <group>
      {/* Dark metallic core */}
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[1.4, 4]} />
        <meshStandardMaterial
          color="#08102a"
          emissive="#00e5ff"
          emissiveIntensity={0.09}
          roughness={0.75}
          metalness={0.55}
        />
      </mesh>

      {/* Primary cyan wireframe */}
      <mesh ref={wire1Ref}>
        <icosahedronGeometry args={[1.56, 2]} />
        <meshBasicMaterial color="#00e5ff" wireframe transparent opacity={0.18} />
      </mesh>

      {/* Secondary lime wireframe — counter-rotates */}
      <mesh ref={wire2Ref}>
        <octahedronGeometry args={[1.72, 3]} />
        <meshBasicMaterial color="#d3f340" wireframe transparent opacity={0.07} />
      </mesh>

      {/* Equatorial ring — cyan */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.88, 0.014, 8, 128]} />
        <meshBasicMaterial color="#00e5ff" transparent opacity={0.65} />
      </mesh>

      {/* Tilted accent ring — lime */}
      <mesh rotation={[Math.PI / 3.2, Math.PI / 5, 0]}>
        <torusGeometry args={[2.04, 0.007, 8, 128]} />
        <meshBasicMaterial color="#d3f340" transparent opacity={0.38} />
      </mesh>

      {/* Opposite accent ring — magenta */}
      <mesh rotation={[-Math.PI / 4, Math.PI / 3, Math.PI / 6]}>
        <torusGeometry args={[1.96, 0.005, 8, 128]} />
        <meshBasicMaterial color="#ff007f" transparent opacity={0.22} />
      </mesh>
    </group>
  );
}

function OrbitalParticles() {
  const pointsRef = useRef<THREE.Points>(null);

  const geometry = useMemo(() => {
    const count = 220;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 2.5 + seededUnit(i + 1) * 1.4;
      const theta = seededUnit(i + 501) * Math.PI * 2;
      const phi = Math.acos(2 * seededUnit(i + 1001) - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  useFrame(() => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += 0.0013;
      pointsRef.current.rotation.x += 0.0004;
    }
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial color="#4cd7f6" size={0.034} transparent opacity={0.72} sizeAttenuation />
    </points>
  );
}

function AnimatedLights() {
  const light1 = useRef<THREE.PointLight>(null);
  const light2 = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (light1.current) {
      light1.current.position.x = Math.sin(t * 0.5) * 5;
      light1.current.position.y = Math.cos(t * 0.3) * 3;
    }
    if (light2.current) {
      light2.current.position.x = Math.cos(t * 0.4) * 4;
      light2.current.position.z = Math.sin(t * 0.6) * 4;
    }
  });

  return (
    <>
      <pointLight ref={light1} color="#00e5ff" intensity={2.2} distance={14} />
      <pointLight ref={light2} color="#d3f340" intensity={1.4} distance={12} position={[0, -3, 4]} />
      <pointLight color="#ff007f" intensity={0.9} distance={9} position={[-4, 2, -3]} />
    </>
  );
}

export default function FootballScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 5.6], fov: 42 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 1.5]}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.18} />
      <AnimatedLights />
      <Stars radius={80} depth={60} count={2800} factor={3} saturation={0} fade speed={0.8} />
      <GlobeMesh />
      <OrbitalParticles />
    </Canvas>
  );
}

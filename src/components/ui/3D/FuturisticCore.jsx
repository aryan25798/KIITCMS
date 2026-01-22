// src/components/ui/3D/FuturisticCore.jsx
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

export const FuturisticCore = () => {
  const coreRef = useRef();
  const orbitersRef = useRef([]);

  // Animation loop
  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    // Rotate the core
    if (coreRef.current) {
      coreRef.current.rotation.y += 0.005;
      coreRef.current.rotation.x += 0.005;
    }

    // Move and rotate orbiters
    orbitersRef.current.forEach((orbiter, i) => {
      if (orbiter) {
        const angle = time * 0.5 + i * ((Math.PI * 2) / 5);
        const distance = 2.5 + Math.sin(time + i) * 0.2;
        orbiter.position.set(
          distance * Math.cos(angle),
          0,
          distance * Math.sin(angle)
        );
        orbiter.rotation.y += 0.02;
      }
    });
  });

  return (
    <group>
      {/* Core */}
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[1.5, 1]} />
        <meshStandardMaterial
          color="#00ffff"
          emissive="#00ffff"
          emissiveIntensity={0.5}
          wireframe
        />
      </mesh>

      {/* Orbiters */}
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => (orbitersRef.current[i] = el)}
        >
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial
            color="#ff00ff"
            emissive="#ff00ff"
            emissiveIntensity={0.8}
          />
        </mesh>
      ))}
    </group>
  );
};

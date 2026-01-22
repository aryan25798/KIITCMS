import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";

const FloatingRobot = () => {
  const mesh = useRef();

  useFrame((state, delta) => {
    mesh.current.rotation.y += delta * 0.2;
    mesh.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.5;
  });

  return (
    <mesh ref={mesh} scale={[1.2, 1.2, 1.2]}>
      <icosahedronGeometry args={[1, 1]} />
      <meshStandardMaterial color="#00ffff" metalness={0.6} roughness={0.2} wireframe />
    </mesh>
  );
};

export default FloatingRobot;
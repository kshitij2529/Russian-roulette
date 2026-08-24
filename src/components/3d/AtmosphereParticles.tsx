import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export const AtmosphereParticles: React.FC<{ count?: number }> = ({ count = 60 }) => {
  const pointsRef = useRef<THREE.Points>(null);

  const [positions] = React.useState(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Confine particles mainly within the light cone above the table
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 2.8;
      pos[i * 3] = Math.cos(angle) * radius;
      pos[i * 3 + 1] = 0.2 + Math.random() * 3.5;
      pos[i * 3 + 2] = Math.sin(angle) * radius;
    }
    return pos;
  });

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const pos = pointsRef.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 1] += delta * 0.08;
      pos[i * 3] += Math.sin(pos[i * 3 + 1] * 2 + i) * 0.002;
      if (pos[i * 3 + 1] > 3.8) {
        pos[i * 3 + 1] = 0.2;
      }
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        color="#fef08a"
        transparent
        opacity={0.35}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};

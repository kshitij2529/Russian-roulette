import React from "react";
import * as THREE from "three";

export const TableScene: React.FC<{ isSawedOff: boolean }> = ({ isSawedOff }) => {
  return (
    <group>
      {/* 1. Warm overhead spotLight directly above the table center */}
      <spotLight
        position={[0, 5, 0]}
        target-position={[0, 0, 0]}
        angle={0.6}
        penumbra={0.5}
        intensity={2.5}
        color="#fff4e0"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0001}
      />

      {/* 2. Subtle red/warm rim light from behind opponents for dramatic contrast */}
      <spotLight
        position={[0, 3, -5]}
        target-position={[0, 0.5, 0]}
        angle={0.9}
        penumbra={0.7}
        intensity={1.6}
        color="#ef4444"
      />
      <pointLight position={[0, 2.5, -4.5]} intensity={1.2} color="#f97316" distance={8} />

      {/* 3. The Circular Wooden Table (Centerpiece) */}
      <group position={[0, 0, 0]}>
        {/* Table Top Surface: cylinderGeometry args={[2.8, 2.8, 0.15, 32]} */}
        <mesh position={[0, 0, 0]} receiveShadow castShadow>
          <cylinderGeometry args={[2.8, 2.8, 0.15, 32]} />
          <meshStandardMaterial
            color="#1f1815"
            roughness={0.7}
            metalness={0.2}
          />
        </mesh>

        {/* Table Rim / Outer Trim */}
        <mesh position={[0, 0.05, 0]}>
          <torusGeometry args={[2.8, 0.04, 16, 48]} />
          <meshStandardMaterial
            color="#140e0c"
            roughness={0.8}
            metalness={0.3}
          />
        </mesh>

        {/* Center Metal Inlay / Sawed-off indicator ring */}
        <mesh position={[0, 0.076, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <ringGeometry args={[0.55, 0.59, 32]} />
          <meshStandardMaterial
            color={isSawedOff ? "#dc2626" : "#451a03"}
            roughness={0.5}
            metalness={0.5}
          />
        </mesh>

        {/* Pedestal Base */}
        <mesh position={[0, -0.65, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.55, 0.9, 1.15, 24]} />
          <meshStandardMaterial color="#120c0a" roughness={0.85} />
        </mesh>

        {/* Bottom Base Plate */}
        <mesh position={[0, -1.2, 0]} receiveShadow>
          <cylinderGeometry args={[1.6, 1.7, 0.1, 32]} />
          <meshStandardMaterial color="#0c0705" roughness={0.9} />
        </mesh>
      </group>

      {/* 4. Center Skulls Decoration (Replicating atmospheric reference) */}
      <group position={[0, 0.076, 0]}>
        {/* Center Skull */}
        <group position={[0, 0.08, -0.12]} rotation={[0.08, 0, 0]} scale={0.7}>
          <mesh castShadow receiveShadow>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshStandardMaterial color="#d6c7a1" roughness={0.75} />
          </mesh>
          <mesh position={[0, -0.09, 0.06]} castShadow>
            <boxGeometry args={[0.12, 0.09, 0.11]} />
            <meshStandardMaterial color="#cfbf97" roughness={0.8} />
          </mesh>
          <mesh position={[-0.045, -0.02, 0.12]}>
            <sphereGeometry args={[0.035, 8, 8]} />
            <meshBasicMaterial color="#0a0a0a" />
          </mesh>
          <mesh position={[0.045, -0.02, 0.12]}>
            <sphereGeometry args={[0.035, 8, 8]} />
            <meshBasicMaterial color="#0a0a0a" />
          </mesh>
          <mesh position={[0, -0.06, 0.125]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.018, 0.035, 3]} />
            <meshBasicMaterial color="#0a0a0a" />
          </mesh>
        </group>

        {/* Left Skull */}
        <group position={[-0.22, 0.07, 0.06]} rotation={[-0.1, -0.8, -0.1]} scale={0.6}>
          <mesh castShadow receiveShadow>
            <sphereGeometry args={[0.15, 14, 14]} />
            <meshStandardMaterial color="#c2b28c" roughness={0.8} />
          </mesh>
          <mesh position={[0, -0.09, 0.06]} castShadow>
            <boxGeometry args={[0.12, 0.09, 0.11]} />
            <meshStandardMaterial color="#baaa84" roughness={0.8} />
          </mesh>
          <mesh position={[-0.045, -0.02, 0.12]}>
            <sphereGeometry args={[0.035, 8, 8]} />
            <meshBasicMaterial color="#0a0a0a" />
          </mesh>
          <mesh position={[0.045, -0.02, 0.12]}>
            <sphereGeometry args={[0.035, 8, 8]} />
            <meshBasicMaterial color="#0a0a0a" />
          </mesh>
        </group>

        {/* Right Skull */}
        <group position={[0.22, 0.07, 0.06]} rotation={[-0.05, 0.75, 0.1]} scale={0.6}>
          <mesh castShadow receiveShadow>
            <sphereGeometry args={[0.15, 14, 14]} />
            <meshStandardMaterial color="#c5b690" roughness={0.8} />
          </mesh>
          <mesh position={[0, -0.09, 0.06]} castShadow>
            <boxGeometry args={[0.12, 0.09, 0.11]} />
            <meshStandardMaterial color="#beaf88" roughness={0.8} />
          </mesh>
          <mesh position={[-0.045, -0.02, 0.12]}>
            <sphereGeometry args={[0.035, 8, 8]} />
            <meshBasicMaterial color="#0a0a0a" />
          </mesh>
          <mesh position={[0.045, -0.02, 0.12]}>
            <sphereGeometry args={[0.035, 8, 8]} />
            <meshBasicMaterial color="#0a0a0a" />
          </mesh>
        </group>
      </group>

      {/* 5. Basement Ground Plane */}
      <mesh position={[0, -1.25, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial
          color="#0a0807"
          roughness={0.95}
          metalness={0.05}
        />
      </mesh>
    </group>
  );
};

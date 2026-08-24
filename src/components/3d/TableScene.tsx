import React from "react";
import * as THREE from "three";

export const TableScene: React.FC<{ isSawedOff: boolean }> = ({ isSawedOff }) => {
  return (
    <group>
      {/* 1. Dramatic Overhead Spotlight */}
      <spotLight
        position={[0, 4.8, 0]}
        target-position={[0, 0.45, 0]}
        angle={Math.PI / 4.2}
        penumbra={0.7}
        intensity={2.8}
        color="#fff1d0"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0001}
      />

      {/* Subtle secondary fill for eerie rim lighting */}
      <pointLight position={[0, 3.2, 0]} intensity={0.4} color="#f59e0b" distance={6} />
      <pointLight position={[0, -0.2, 0]} intensity={0.15} color="#1c1917" distance={4} />

      {/* Tension rim light from far behind */}
      <spotLight
        position={[0, 2.5, -5.5]}
        target-position={[0, 0.5, 0]}
        angle={Math.PI / 3}
        penumbra={0.9}
        intensity={0.35}
        color="#78350f"
      />

      {/* 2. The Main Circular Wooden Table (Centerpiece) */}
      <group position={[0, 0, 0]}>
        {/* Table Top Surface */}
        <mesh position={[0, 0.42, 0]} receiveShadow castShadow>
          <cylinderGeometry args={[2.2, 2.2, 0.12, 48]} />
          <meshStandardMaterial
            color="#2a1810"
            roughness={0.68}
            metalness={0.12}
          />
        </mesh>

        {/* Table Rim / Outer Ring Trim */}
        <mesh position={[0, 0.42, 0]}>
          <torusGeometry args={[2.2, 0.04, 16, 48]} />
          <meshStandardMaterial
            color="#1c100b"
            roughness={0.8}
            metalness={0.2}
          />
        </mesh>

        {/* Table Bevel Sub-ring */}
        <mesh position={[0, 0.35, 0]} receiveShadow>
          <cylinderGeometry args={[2.08, 1.95, 0.08, 36]} />
          <meshStandardMaterial color="#1a0f0a" roughness={0.9} />
        </mesh>

        {/* Heavy Table Central Pedestal Base */}
        <mesh position={[0, -0.3, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.45, 0.75, 1.3, 24]} />
          <meshStandardMaterial color="#140a06" roughness={0.9} />
        </mesh>

        {/* Table Base Plate */}
        <mesh position={[0, -0.92, 0]} receiveShadow>
          <cylinderGeometry args={[1.3, 1.4, 0.1, 32]} />
          <meshStandardMaterial color="#100805" roughness={0.9} />
        </mesh>

        {/* Center Metal Inlay / Blood Ring */}
        <mesh position={[0, 0.485, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <ringGeometry args={[0.5, 0.53, 32]} />
          <meshStandardMaterial
            color={isSawedOff ? "#991b1b" : "#451a03"}
            roughness={0.6}
            metalness={0.4}
          />
        </mesh>
      </group>

      {/* 3. Center Skulls Trio (Replicating reference visual) */}
      <group position={[0, 0.48, 0]}>
        {/* Center Skull */}
        <group position={[0, 0.07, -0.1]} rotation={[0.1, 0, 0]} scale={0.75}>
          {/* Cranium */}
          <mesh castShadow receiveShadow>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshStandardMaterial color="#d6c7a1" roughness={0.75} />
          </mesh>
          {/* Jaw / Maxilla */}
          <mesh position={[0, -0.09, 0.06]} castShadow>
            <boxGeometry args={[0.12, 0.09, 0.11]} />
            <meshStandardMaterial color="#cfbf97" roughness={0.8} />
          </mesh>
          {/* Eye sockets */}
          <mesh position={[-0.045, -0.02, 0.12]}>
            <sphereGeometry args={[0.035, 8, 8]} />
            <meshBasicMaterial color="#0a0a0a" />
          </mesh>
          <mesh position={[0.045, -0.02, 0.12]}>
            <sphereGeometry args={[0.035, 8, 8]} />
            <meshBasicMaterial color="#0a0a0a" />
          </mesh>
          {/* Nasal cavity */}
          <mesh position={[0, -0.06, 0.125]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.018, 0.035, 3]} />
            <meshBasicMaterial color="#0a0a0a" />
          </mesh>
        </group>

        {/* Left Angled Skull */}
        <group position={[-0.2, 0.06, 0.08]} rotation={[-0.1, -0.8, -0.1]} scale={0.65}>
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

        {/* Right Angled Skull */}
        <group position={[0.2, 0.06, 0.08]} rotation={[-0.05, 0.75, 0.1]} scale={0.65}>
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

      {/* 4. Grimy Basement Ground Plane */}
      <mesh position={[0, -0.98, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[25, 25]} />
        <meshStandardMaterial
          color="#0c0a09"
          roughness={0.95}
          metalness={0.05}
        />
      </mesh>
    </group>
  );
};

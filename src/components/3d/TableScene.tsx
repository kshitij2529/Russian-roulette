import React from "react";
import * as THREE from "three";

export const TableScene: React.FC<{ isSawedOff: boolean }> = ({ isSawedOff }) => {
  return (
    <group>
      {/* 1. Focused overhead spotLight pointing straight down onto center of the table */}
      <spotLight
        position={[0, 4.8, 0]}
        target-position={[0, 0, 0]}
        angle={0.58}
        penumbra={0.6}
        intensity={2.8}
        color="#fff5ea"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0001}
      />

      {/* 2. Red/warm rim light from behind opponents for underground dramatic contrast */}
      <spotLight
        position={[0, 2.6, -4.8]}
        target-position={[0, 0.4, -0.5]}
        angle={0.85}
        penumbra={0.7}
        intensity={1.4}
        color="#dc2626"
      />
      <pointLight position={[0, 2.2, -4.2]} intensity={0.8} color="#ea580c" distance={7} />

      {/* 3. The Circular Wooden Table (Centerpiece) */}
      <group position={[0, 0, 0]}>
        {/* Table Top Surface: cylinderGeometry args={[2.8, 2.8, 0.15, 32]} */}
        <mesh position={[0, 0, 0]} receiveShadow castShadow>
          <cylinderGeometry args={[2.8, 2.8, 0.15, 36]} />
          <meshStandardMaterial
            color="#1f1815"
            roughness={0.7}
            metalness={0.2}
          />
        </mesh>

        {/* Distinct inner wooden felt/inlay disc */}
        <mesh position={[0, 0.076, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[2.65, 36]} />
          <meshStandardMaterial
            color="#191311"
            roughness={0.8}
            metalness={0.1}
          />
        </mesh>

        {/* Table Outer Armrest Rim */}
        <mesh position={[0, 0.05, 0]}>
          <torusGeometry args={[2.8, 0.06, 16, 48]} />
          <meshStandardMaterial
            color="#120c0a"
            roughness={0.85}
            metalness={0.25}
          />
        </mesh>

        {/* Center Metal Inlay / Sawed-off indicator ring */}
        <mesh position={[0, 0.078, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <ringGeometry args={[0.55, 0.59, 32]} />
          <meshStandardMaterial
            color={isSawedOff ? "#ef4444" : "#451a03"}
            roughness={0.4}
            metalness={0.6}
          />
        </mesh>

        {/* Heavy Table Pedestal Column */}
        <mesh position={[0, -0.55, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.55, 0.85, 1.0, 24]} />
          <meshStandardMaterial color="#120c0a" roughness={0.85} metalness={0.2} />
        </mesh>

        {/* Heavy Base Footing planted on floor (y = -1.1) */}
        <mesh position={[0, -1.05, 0]} receiveShadow>
          <cylinderGeometry args={[1.5, 1.65, 0.1, 32]} />
          <meshStandardMaterial color="#0a0706" roughness={0.9} />
        </mesh>
      </group>

      {/* 4. Center Skulls Decoration */}
      <group position={[0, 0.078, 0]}>
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

      {/* 5. Underground Cellar Floor Plane (Grounds the entire scene) */}
      <mesh position={[0, -1.1, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[35, 35]} />
        <meshStandardMaterial
          color="#14110f"
          roughness={0.85}
          metalness={0.15}
        />
      </mesh>

      {/* Circular floor ring highlighting the table area on the ground */}
      <mesh position={[0, -1.095, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[3.2, 3.3, 40]} />
        <meshStandardMaterial
          color="#29201b"
          roughness={0.9}
        />
      </mesh>

      {/* Basement Wall in background for room depth and underground ambiance */}
      <mesh position={[0, 3.5, -9]} receiveShadow>
        <planeGeometry args={[40, 15]} />
        <meshStandardMaterial
          color="#0c0a09"
          roughness={0.95}
          metalness={0.05}
        />
      </mesh>
    </group>
  );
};

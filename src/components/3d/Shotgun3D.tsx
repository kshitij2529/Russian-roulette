import React, { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface Shotgun3DProps {
  targetPosition: [number, number, number] | null;
  pointAtSelf: boolean;
  isSawedOff: boolean;
  isFiring: boolean;
  shellFiredType: "live" | "blank" | null;
  activeShooterPosition?: [number, number, number] | null;
}

export const Shotgun3D: React.FC<Shotgun3DProps> = ({
  targetPosition,
  pointAtSelf,
  isSawedOff,
  isFiring,
  shellFiredType,
  activeShooterPosition,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const muzzleFlashRef = useRef<THREE.PointLight>(null);
  const smokeRef = useRef<THREE.Mesh>(null);
  const recoilOffset = useRef<number>(0);

  // Default camera position is approximately [0, 1.3, 3.2]
  const selfPosition = new THREE.Vector3(0, 1.1, 3.0);

  useEffect(() => {
    if (isFiring) {
      recoilOffset.current = 0.35;
    }
  }, [isFiring]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // Determine target aim point
    let aimTarget = new THREE.Vector3(0, 0.45, -2.5); // Default facing across table

    if (pointAtSelf) {
      aimTarget = selfPosition.clone();
    } else if (targetPosition) {
      aimTarget = new THREE.Vector3(targetPosition[0], targetPosition[1] + 0.3, targetPosition[2]);
    } else if (activeShooterPosition) {
      // Point from center toward shooter or target
      aimTarget = new THREE.Vector3(activeShooterPosition[0], activeShooterPosition[1] + 0.3, activeShooterPosition[2]);
    }

    // Calculate look orientation
    const currentPos = groupRef.current.position.clone();
    
    // Slight levitation/table resting height
    const baseHeight = 0.52;
    groupRef.current.position.y = baseHeight + Math.sin(Date.now() * 0.002) * 0.015;

    // Calculate rotation toward target
    const targetQuaternion = new THREE.Quaternion();
    const lookMatrix = new THREE.Matrix4();
    
    // In our model, the barrel points along +Z (or -Z)
    // We aim the gun barrel toward aimTarget
    lookMatrix.lookAt(currentPos, aimTarget, new THREE.Vector3(0, 1, 0));
    targetQuaternion.setFromRotationMatrix(lookMatrix);

    // Smoothly slerp towards aim rotation
    groupRef.current.quaternion.slerp(targetQuaternion, Math.min(delta * 6.5, 1.0));

    // Handle recoil animation
    if (recoilOffset.current > 0.001) {
      recoilOffset.current = THREE.MathUtils.lerp(recoilOffset.current, 0, delta * 8);
      // Kickback in opposite direction of aim
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(groupRef.current.quaternion);
      groupRef.current.position.addScaledVector(forward, -recoilOffset.current * 0.4);
      groupRef.current.rotation.x -= recoilOffset.current * 0.3;
    }

    // Muzzle flash decay
    if (muzzleFlashRef.current) {
      if (isFiring && shellFiredType === "live") {
        muzzleFlashRef.current.intensity = THREE.MathUtils.lerp(muzzleFlashRef.current.intensity, 0, delta * 12);
      } else {
        muzzleFlashRef.current.intensity = 0;
      }
    }

    if (smokeRef.current && isFiring) {
      smokeRef.current.scale.addScalar(delta * 2);
      const mat = smokeRef.current.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = Math.max(0, mat.opacity - delta * 2.5);
      }
    }
  });

  return (
    <group ref={groupRef} position={[0, 0.52, 0]}>
      {/* Muzzle flash light */}
      <pointLight
        ref={muzzleFlashRef}
        position={[0, 0.05, isSawedOff ? 0.65 : 1.25]}
        color={shellFiredType === "live" ? "#ff6b00" : "#60a5fa"}
        intensity={isFiring ? (shellFiredType === "live" ? 8 : 2) : 0}
        distance={4.5}
      />

      {/* Main Steel Receiver Body */}
      <mesh position={[0, 0.02, -0.05]} castShadow receiveShadow>
        <boxGeometry args={[0.07, 0.09, 0.35]} />
        <meshStandardMaterial
          color="#1e2022"
          metalness={0.85}
          roughness={0.3}
        />
      </mesh>

      {/* Ejection Port & Shell Chamber */}
      <mesh position={[0.036, 0.035, -0.02]}>
        <boxGeometry args={[0.005, 0.035, 0.09]} />
        <meshStandardMaterial
          color={isSawedOff ? "#b91c1c" : "#0f172a"}
          metalness={0.9}
          roughness={0.2}
        />
      </mesh>

      {/* Main Shotgun Barrel */}
      <mesh
        position={[0, 0.04, isSawedOff ? 0.35 : 0.65]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
      >
        <cylinderGeometry args={[0.022, 0.022, isSawedOff ? 0.5 : 1.1, 16]} />
        <meshStandardMaterial
          color="#18181b"
          metalness={0.92}
          roughness={0.25}
        />
      </mesh>

      {/* Underbarrel Magazine Tube */}
      <mesh
        position={[0, 0.005, isSawedOff ? 0.3 : 0.55]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
      >
        <cylinderGeometry args={[0.017, 0.017, isSawedOff ? 0.4 : 0.9, 16]} />
        <meshStandardMaterial
          color="#27272a"
          metalness={0.88}
          roughness={0.35}
        />
      </mesh>

      {/* Barrel Clamp / Ring */}
      <mesh position={[0, 0.023, isSawedOff ? 0.5 : 0.9]}>
        <boxGeometry args={[0.05, 0.065, 0.03]} />
        <meshStandardMaterial color="#3f3f46" metalness={0.9} roughness={0.4} />
      </mesh>

      {/* Wood / Polymer Forearm Pump */}
      <mesh position={[0, 0.005, 0.35]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.028, 0.028, 0.22, 12]} />
        <meshStandardMaterial
          color="#451a03"
          roughness={0.65}
          metalness={0.1}
        />
      </mesh>

      {/* Wooden Stock / Grip */}
      <mesh
        position={[0, -0.06, isSawedOff ? -0.28 : -0.42]}
        rotation={[isSawedOff ? -0.2 : -0.15, 0, 0]}
        castShadow
      >
        <boxGeometry args={[0.055, isSawedOff ? 0.12 : 0.16, isSawedOff ? 0.22 : 0.46]} />
        <meshStandardMaterial
          color="#381c0f"
          roughness={0.7}
          metalness={0.08}
        />
      </mesh>

      {/* Trigger Guard and Trigger */}
      <mesh position={[0, -0.045, 0.05]}>
        <boxGeometry args={[0.025, 0.04, 0.06]} />
        <meshStandardMaterial color="#18181b" metalness={0.9} roughness={0.3} />
      </mesh>

      {/* Sawed-Off Visual Enhancement Indicator */}
      {isSawedOff && (
        <group position={[0, 0.04, 0.6]}>
          <mesh>
            <torusGeometry args={[0.035, 0.008, 8, 16]} />
            <meshBasicMaterial color="#ef4444" />
          </mesh>
          <pointLight color="#ef4444" intensity={1.5} distance={0.8} />
        </group>
      )}

      {/* Muzzle Flash Geometry on Firing */}
      {isFiring && shellFiredType === "live" && (
        <mesh position={[0, 0.04, isSawedOff ? 0.65 : 1.25]}>
          <sphereGeometry args={[0.16, 12, 12]} />
          <meshBasicMaterial
            color="#fbbf24"
            transparent
            opacity={0.9}
          />
        </mesh>
      )}
    </group>
  );
};

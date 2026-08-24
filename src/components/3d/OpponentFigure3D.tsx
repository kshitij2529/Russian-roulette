import React, { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { Player } from "../../types";
import { Zap, Lock, Skull } from "lucide-react";

interface OpponentFigure3DProps {
  player: Player;
  position: [number, number, number];
  rotationY: number;
  isSelected: boolean;
  isCurrentTurn: boolean;
  isMyTurn: boolean;
  isHandcuffMode: boolean;
  onSelect: (playerId: string) => void;
}

export const OpponentFigure3D: React.FC<OpponentFigure3DProps> = ({
  player,
  position,
  rotationY,
  isSelected,
  isCurrentTurn,
  isMyTurn,
  isHandcuffMode,
  onSelect,
}) => {
  const [hovered, setHovered] = useState<boolean>(false);
  const figureGroupRef = useRef<THREE.Group>(null);
  const targetRingRef = useRef<THREE.Mesh>(null);

  const isDead = !player.isAlive || player.isSpectator;

  useFrame((_, delta) => {
    if (targetRingRef.current) {
      targetRingRef.current.rotation.z += delta * 1.5;
    }
    if (figureGroupRef.current && isCurrentTurn && !isDead) {
      // Subtle breathing motion for active player
      const breath = Math.sin(Date.now() * 0.003) * 0.015;
      figureGroupRef.current.position.y = position[1] + breath;
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (!isDead && isMyTurn) {
      onSelect(player.id);
    }
  };

  return (
    <group
      ref={figureGroupRef}
      position={position}
      rotation={[0, rotationY, 0]}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (!isDead) setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      {/* Target indicator ring on table edge when selected */}
      {isSelected && !isDead && (
        <mesh
          ref={targetRingRef}
          position={[0, 0.08, -0.65]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.22, 0.28, 32]} />
          <meshBasicMaterial
            color={isHandcuffMode ? "#eab308" : "#ef4444"}
            transparent
            opacity={0.85}
          />
        </mesh>
      )}

      {/* Active Turn Halo Ring */}
      {isCurrentTurn && !isDead && (
        <mesh position={[0, 1.45, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.22, 0.015, 12, 32]} />
          <meshBasicMaterial color="#f59e0b" />
        </mesh>
      )}

      {/* Wooden Chair grounded firmly on the floor (floor is at y = -1.1) */}
      <group position={[0, 0, 0.45]}>
        {/* Chair Seat at y = -0.5 */}
        <mesh position={[0, -0.5, 0]} receiveShadow castShadow>
          <boxGeometry args={[0.55, 0.06, 0.5]} />
          <meshStandardMaterial color="#1a0f0a" roughness={0.9} />
        </mesh>
        {/* Chair Backrest */}
        <mesh position={[0, -0.1, 0.22]} castShadow>
          <boxGeometry args={[0.52, 0.75, 0.05]} />
          <meshStandardMaterial color="#24140e" roughness={0.85} />
        </mesh>
        {/* Chair Legs touching floor at y = -1.1 */}
        <mesh position={[-0.22, -0.8, -0.18]} castShadow receiveShadow>
          <cylinderGeometry args={[0.025, 0.025, 0.6, 8]} />
          <meshStandardMaterial color="#140a06" roughness={0.9} />
        </mesh>
        <mesh position={[0.22, -0.8, -0.18]} castShadow receiveShadow>
          <cylinderGeometry args={[0.025, 0.025, 0.6, 8]} />
          <meshStandardMaterial color="#140a06" roughness={0.9} />
        </mesh>
        <mesh position={[-0.22, -0.8, 0.2]} castShadow receiveShadow>
          <cylinderGeometry args={[0.025, 0.025, 0.6, 8]} />
          <meshStandardMaterial color="#140a06" roughness={0.9} />
        </mesh>
        <mesh position={[0.22, -0.8, 0.2]} castShadow receiveShadow>
          <cylinderGeometry args={[0.025, 0.025, 0.6, 8]} />
          <meshStandardMaterial color="#140a06" roughness={0.9} />
        </mesh>
      </group>

      {/* 3D Character Bust / Seated Opponent Capsule */}
      <group
        position={[0, isDead ? -0.2 : 0, isDead ? -0.25 : 0]}
        rotation={[isDead ? 0.45 : (hovered ? -0.05 : 0), 0, 0]}
      >
        {/* Torso Capsule with Player Avatar Color */}
        <mesh position={[0, 0.15, 0.1]} castShadow receiveShadow>
          <capsuleGeometry args={[0.24, 0.48, 12, 16]} />
          <meshStandardMaterial
            color={isDead ? "#1c1917" : player.avatarColor || "#475569"}
            roughness={0.7}
            metalness={0.1}
          />
        </mesh>

        {/* Arms resting toward table */}
        <group position={[0, 0.22, -0.05]}>
          {/* Left Arm */}
          <mesh
            position={[-0.32, -0.08, -0.2]}
            rotation={[0.65, 0.2, -0.2]}
            castShadow
          >
            <cylinderGeometry args={[0.065, 0.055, 0.48, 12]} />
            <meshStandardMaterial
              color={isDead ? "#18181b" : player.avatarColor || "#475569"}
              roughness={0.7}
            />
          </mesh>
          {/* Left Hand on table */}
          <mesh position={[-0.28, -0.22, -0.42]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshStandardMaterial color={isDead ? "#52525b" : "#d4a373"} roughness={0.8} />
          </mesh>

          {/* Right Arm */}
          <mesh
            position={[0.32, -0.08, -0.2]}
            rotation={[0.65, -0.2, 0.2]}
            castShadow
          >
            <cylinderGeometry args={[0.065, 0.055, 0.48, 12]} />
            <meshStandardMaterial
              color={isDead ? "#18181b" : player.avatarColor || "#475569"}
              roughness={0.7}
            />
          </mesh>
          {/* Right Hand on table */}
          <mesh position={[0.28, -0.22, -0.42]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshStandardMaterial color={isDead ? "#52525b" : "#d4a373"} roughness={0.8} />
          </mesh>
        </group>

        {/* Head / Mask */}
        <group position={[0, 0.72, 0.06]}>
          <mesh castShadow>
            <sphereGeometry args={[0.18, 16, 16]} />
            <meshStandardMaterial
              color={isDead ? "#27272a" : "#e4d5b7"}
              roughness={0.8}
            />
          </mesh>

          {/* Porcelain Mask Front */}
          <mesh position={[0, -0.01, -0.12]} rotation={[0, Math.PI, 0]} castShadow>
            <sphereGeometry args={[0.16, 16, 16, 0, Math.PI, 0, Math.PI]} />
            <meshStandardMaterial
              color={isDead ? "#3f3f46" : "#f5f5f4"}
              roughness={0.4}
              metalness={0.15}
            />
          </mesh>

          {/* Eye Sockets */}
          <mesh position={[-0.055, 0.02, -0.16]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshBasicMaterial color="#09090b" />
          </mesh>
          <mesh position={[0.055, 0.02, -0.16]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshBasicMaterial color="#09090b" />
          </mesh>

          {/* Mask Mouth Slot */}
          <mesh position={[0, -0.06, -0.16]}>
            <boxGeometry args={[0.06, 0.008, 0.01]} />
            <meshBasicMaterial color="#18181b" />
          </mesh>
        </group>

        {/* Handcuff 3D Rings if handcuffed */}
        {player.isHandcuffed && !isDead && (
          <group position={[0, 0.05, -0.42]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.09, 0.022, 8, 16]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
            </mesh>
            <pointLight color="#38bdf8" intensity={0.6} distance={0.5} />
          </group>
        )}
      </group>

      {/* Compact, sleek nameplate directly above avatar containing Name, Health icons, and Item count */}
      <Html
        position={[0, 1.35, 0]}
        center
        distanceFactor={6.5}
        style={{ pointerEvents: isDead ? "none" : "auto" }}
      >
        <div
          onClick={handleClick}
          className={`select-none transition-all duration-150 cursor-pointer flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-lg backdrop-blur-md border text-center shadow-lg ${
            isSelected
              ? isHandcuffMode
                ? "bg-amber-950/90 border-amber-400 ring-2 ring-amber-400/80 scale-105"
                : "bg-red-950/95 border-red-500 ring-2 ring-red-500/80 scale-105"
              : hovered && isMyTurn && !isDead
              ? "bg-stone-900/90 border-stone-500 scale-105"
              : isCurrentTurn && !isDead
              ? "bg-amber-950/80 border-amber-500/70"
              : "bg-stone-950/85 border-stone-800/80"
          } ${isDead ? "opacity-35 grayscale" : ""}`}
        >
          {/* Top Line: Dot + Player Name + Handcuff icon */}
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: player.avatarColor || "#94a3b8" }}
            />
            <span className="font-mono font-bold text-[11px] text-stone-100 max-w-[90px] truncate">
              {player.name}
            </span>
            {player.isHandcuffed && !isDead && (
              <Lock className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
            )}
          </div>

          {/* Bottom Line: Health Icons & Item Count */}
          {!isDead ? (
            <div className="flex items-center gap-1.5 mt-0.5">
              {/* Health icons (Defib charges) */}
              <div className="flex items-center gap-0.5">
                {Array.from({ length: player.maxHealth || 4 }).map((_, i) => {
                  const isFull = i < player.health;
                  return (
                    <span
                      key={i}
                      className={`w-2.5 h-2.5 rounded-xs flex items-center justify-center text-[7px] ${
                        isFull
                          ? "bg-emerald-500 text-stone-950 font-bold"
                          : "bg-stone-800 text-stone-600"
                      }`}
                    >
                      <Zap className="w-2 h-2 fill-current" />
                    </span>
                  );
                })}
              </div>

              {/* Item Count */}
              {player.items && player.items.length > 0 && (
                <span className="text-[9px] font-mono text-stone-400 bg-stone-900/80 px-1 py-0.2 rounded border border-stone-800/80">
                  🎒 {player.items.length}
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[9px] font-mono text-red-500 font-bold uppercase tracking-wider">
              <Skull className="w-2.5 h-2.5" />
              <span>ELIMINATED</span>
            </div>
          )}
        </div>
      </Html>
    </group>
  );
};

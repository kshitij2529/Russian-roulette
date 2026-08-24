import React, { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { Player } from "../../types";
import { Zap, Lock, Skull, Crosshair } from "lucide-react";

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
      {/* Selection / Target Indicator Disc on Table */}
      {isSelected && !isDead && (
        <mesh
          ref={targetRingRef}
          position={[0, 0.49, -0.6]}
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
          <torusGeometry args={[0.24, 0.018, 12, 32]} />
          <meshBasicMaterial color="#f59e0b" />
        </mesh>
      )}

      {/* Wooden Chair behind player */}
      <group position={[0, -0.2, 0.45]}>
        {/* Chair Seat */}
        <mesh position={[0, -0.25, 0]} receiveShadow>
          <boxGeometry args={[0.55, 0.06, 0.5]} />
          <meshStandardMaterial color="#1a0f0a" roughness={0.9} />
        </mesh>
        {/* Chair Backrest */}
        <mesh position={[0, 0.15, 0.22]} castShadow>
          <boxGeometry args={[0.52, 0.7, 0.05]} />
          <meshStandardMaterial color="#24140e" roughness={0.85} />
        </mesh>
        {/* Chair Legs */}
        <mesh position={[-0.22, -0.6, -0.18]}>
          <cylinderGeometry args={[0.025, 0.025, 0.65, 8]} />
          <meshStandardMaterial color="#140a06" />
        </mesh>
        <mesh position={[0.22, -0.6, -0.18]}>
          <cylinderGeometry args={[0.025, 0.025, 0.65, 8]} />
          <meshStandardMaterial color="#140a06" />
        </mesh>
        <mesh position={[-0.22, -0.6, 0.2]}>
          <cylinderGeometry args={[0.025, 0.025, 0.65, 8]} />
          <meshStandardMaterial color="#140a06" />
        </mesh>
        <mesh position={[0.22, -0.6, 0.2]}>
          <cylinderGeometry args={[0.025, 0.025, 0.65, 8]} />
          <meshStandardMaterial color="#140a06" />
        </mesh>
      </group>

      {/* 3D Human Figure / Seated Opponent */}
      <group
        position={[0, isDead ? -0.1 : 0, isDead ? -0.25 : 0]}
        rotation={[isDead ? 0.45 : (hovered ? -0.05 : 0), 0, 0]}
      >
        {/* Torso / Clothes with Player Avatar Color */}
        <mesh position={[0, 0.35, 0.1]} castShadow receiveShadow>
          <capsuleGeometry args={[0.24, 0.48, 12, 16]} />
          <meshStandardMaterial
            color={isDead ? "#1c1917" : player.avatarColor || "#475569"}
            roughness={0.7}
            metalness={0.1}
          />
        </mesh>

        {/* Arms resting toward table */}
        <group position={[0, 0.38, -0.1]}>
          {/* Left Arm */}
          <mesh
            position={[-0.32, -0.05, -0.15]}
            rotation={[0.6, 0.2, -0.2]}
            castShadow
          >
            <cylinderGeometry args={[0.065, 0.055, 0.45, 12]} />
            <meshStandardMaterial
              color={isDead ? "#18181b" : player.avatarColor || "#475569"}
              roughness={0.7}
            />
          </mesh>
          {/* Left Hand on table */}
          <mesh position={[-0.28, -0.22, -0.32]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshStandardMaterial color={isDead ? "#52525b" : "#d4a373"} roughness={0.8} />
          </mesh>

          {/* Right Arm */}
          <mesh
            position={[0.32, -0.05, -0.15]}
            rotation={[0.6, -0.2, 0.2]}
            castShadow
          >
            <cylinderGeometry args={[0.065, 0.055, 0.45, 12]} />
            <meshStandardMaterial
              color={isDead ? "#18181b" : player.avatarColor || "#475569"}
              roughness={0.7}
            />
          </mesh>
          {/* Right Hand on table */}
          <mesh position={[0.28, -0.22, -0.32]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshStandardMaterial color={isDead ? "#52525b" : "#d4a373"} roughness={0.8} />
          </mesh>
        </group>

        {/* Head / Eerie Anonymous Mask (like reference photo) */}
        <group position={[0, 0.92, 0.06]}>
          {/* Head Base */}
          <mesh castShadow>
            <sphereGeometry args={[0.18, 16, 16]} />
            <meshStandardMaterial
              color={isDead ? "#27272a" : "#e4d5b7"}
              roughness={0.8}
            />
          </mesh>

          {/* Eerie White/Porcelain Mask front */}
          <mesh position={[0, -0.01, -0.12]} rotation={[0, Math.PI, 0]} castShadow>
            <sphereGeometry args={[0.16, 16, 16, 0, Math.PI, 0, Math.PI]} />
            <meshStandardMaterial
              color={isDead ? "#3f3f46" : "#f5f5f4"}
              roughness={0.4}
              metalness={0.15}
            />
          </mesh>

          {/* Mask Eye Sockets */}
          <mesh position={[-0.055, 0.02, -0.16]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshBasicMaterial color="#09090b" />
          </mesh>
          <mesh position={[0.055, 0.02, -0.16]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshBasicMaterial color="#09090b" />
          </mesh>

          {/* Mask Smile/Stitch */}
          <mesh position={[0, -0.06, -0.16]}>
            <boxGeometry args={[0.06, 0.008, 0.01]} />
            <meshBasicMaterial color="#18181b" />
          </mesh>
        </group>

        {/* Handcuff 3D Rings if handcuffed */}
        {player.isHandcuffed && !isDead && (
          <group position={[0, 0.16, -0.38]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.09, 0.022, 8, 16]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
            </mesh>
            <pointLight color="#38bdf8" intensity={0.6} distance={0.5} />
          </group>
        )}
      </group>

      {/* 2D Billboard HTML Badge floating above Opponent */}
      <Html
        position={[0, 1.48, 0]}
        center
        distanceFactor={6.2}
        style={{ pointerEvents: isDead ? "none" : "auto" }}
      >
        <div
          onClick={handleClick}
          className={`select-none transition-all duration-200 cursor-pointer flex flex-col items-center gap-1 p-2 rounded-xl backdrop-blur-md border ${
            isSelected
              ? isHandcuffMode
                ? "bg-amber-950/90 border-amber-400 ring-2 ring-amber-500 shadow-xl shadow-amber-950"
                : "bg-red-950/95 border-red-500 ring-2 ring-red-600 shadow-xl shadow-red-950 scale-105"
              : hovered && isMyTurn && !isDead
              ? "bg-stone-900/90 border-stone-600 shadow-lg scale-105"
              : isCurrentTurn
              ? "bg-amber-950/80 border-amber-500/80 shadow-lg"
              : "bg-stone-950/80 border-stone-800"
          } ${isDead ? "opacity-40 grayscale" : ""}`}
        >
          {/* Target Reticle Indicator on Selection */}
          {isSelected && !isDead && (
            <div className="flex items-center gap-1 text-[10px] font-black uppercase text-red-400 bg-red-900/50 px-2 py-0.5 rounded-full border border-red-500/60 animate-pulse">
              <Crosshair className="w-3 h-3" />
              <span>{isHandcuffMode ? "Handcuff Target" : "Target Locked"}</span>
            </div>
          )}

          {/* Turn Tag */}
          {isCurrentTurn && !isDead && !isSelected && (
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-900/40 px-2 py-0.5 rounded-full border border-amber-600/40 animate-pulse">
              Shooting Turn
            </div>
          )}

          {/* Player Name and Handcuff Tag */}
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/40"
              style={{ backgroundColor: player.avatarColor || "#94a3b8" }}
            />
            <span className="font-mono font-black text-xs text-white max-w-[120px] truncate">
              {player.name}
            </span>
            {player.isHandcuffed && !isDead && (
              <span title="Handcuffed (Skips next turn)">
                <Lock className="w-3 h-3 text-cyan-400" />
              </span>
            )}
          </div>

          {/* Health Charges (Pips) */}
          {!isDead ? (
            <div className="flex items-center gap-1 mt-0.5">
              {Array.from({ length: player.maxHealth || 4 }).map((_, i) => {
                const isFull = i < player.health;
                return (
                  <div
                    key={i}
                    className={`w-3.5 h-3.5 rounded-md flex items-center justify-center border text-[9px] transition-colors ${
                      isFull
                        ? "bg-emerald-600 border-emerald-400 text-white shadow-sm shadow-emerald-600/50"
                        : "bg-stone-900 border-stone-800 text-stone-700"
                    }`}
                  >
                    <Zap className="w-2.5 h-2.5 fill-current" />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[11px] font-mono text-red-500 font-bold">
              <Skull className="w-3.5 h-3.5" />
              <span>ELIMINATED</span>
            </div>
          )}

          {/* Opponent item count */}
          {!isDead && player.items && player.items.length > 0 && (
            <div className="text-[9px] font-mono text-stone-400">
              {player.items.length} item{player.items.length > 1 ? "s" : ""}
            </div>
          )}
        </div>
      </Html>
    </group>
  );
};

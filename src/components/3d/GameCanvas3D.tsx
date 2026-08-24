import React, { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { ActionOutcome, PublicRoomState } from "../../types";
import { TableScene } from "./TableScene";
import { Shotgun3D } from "./Shotgun3D";
import { OpponentFigure3D } from "./OpponentFigure3D";
import { AtmosphereParticles } from "./AtmosphereParticles";

interface GameCanvas3DProps {
  roomState: PublicRoomState;
  myPlayerId: string | null;
  selectedTargetId: string | null;
  pointAtSelf: boolean;
  isHandcuffMode: boolean;
  animatingShot: ActionOutcome | null;
  shotFiredEffect: "live" | "blank" | null;
  onSelectTarget: (playerId: string) => void;
}

// First-person POV camera controller calibrated for mobile landscape and desktop
const FirstPersonCameraController: React.FC<{
  isShaking: boolean;
  selectedTargetPos: [number, number, number] | null;
}> = ({ isShaking, selectedTargetPos }) => {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const shakeIntensity = useRef<number>(0);
  const { size } = useThree();

  // Responsive FOV based on aspect ratio to prevent clipping in mobile landscape or portrait
  const aspect = size.width / Math.max(size.height, 1);
  const targetFov = useMemo(() => {
    if (aspect > 1.8) return 46; // Wide mobile landscape
    if (aspect > 1.3) return 48; // Standard desktop/laptop
    if (aspect > 0.9) return 54; // Tablet / square
    return 62; // Portrait
  }, [aspect]);

  React.useEffect(() => {
    if (isShaking) {
      shakeIntensity.current = 0.08;
    }
  }, [isShaking]);

  useFrame((_, delta) => {
    if (!cameraRef.current) return;

    // Smoothly adapt FOV
    cameraRef.current.fov = THREE.MathUtils.lerp(cameraRef.current.fov, targetFov, delta * 5);
    cameraRef.current.updateProjectionMatrix();

    // Subtle first-person head sway
    const time = Date.now() * 0.0015;
    const swayX = Math.sin(time) * 0.012;
    const swayY = Math.cos(time * 1.5) * 0.01;

    // Camera recoil / impact shake
    let shakeX = 0;
    let shakeY = 0;
    if (shakeIntensity.current > 0.001) {
      shakeX = (Math.random() - 0.5) * shakeIntensity.current;
      shakeY = (Math.random() - 0.5) * shakeIntensity.current;
      shakeIntensity.current = THREE.MathUtils.lerp(shakeIntensity.current, 0, delta * 6);
    }

    // Position camera at eyes level [0, 2.4, 4.2] so full table & gun & arc are visible
    cameraRef.current.position.x = 0 + swayX + shakeX;
    cameraRef.current.position.y = 2.4 + swayY + shakeY;
    cameraRef.current.position.z = 4.2;

    // Base look target: center table [0, 0, 0] looking slightly downward
    const lookTarget = new THREE.Vector3(0, 0.05, 0);

    // If an opponent is targeted, glance subtly toward them
    if (selectedTargetPos) {
      lookTarget.x = selectedTargetPos[0] * 0.15;
      lookTarget.y = 0.1;
      lookTarget.z = selectedTargetPos[2] * 0.15;
    }

    cameraRef.current.lookAt(lookTarget);
  });

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault
      fov={50}
      near={0.1}
      far={100}
      position={[0, 2.4, 4.2]}
    />
  );
};

export const GameCanvas3D: React.FC<GameCanvas3DProps> = ({
  roomState,
  myPlayerId,
  selectedTargetId,
  pointAtSelf,
  isHandcuffMode,
  animatingShot,
  shotFiredEffect,
  onSelectTarget,
}) => {
  const isMyTurn = roomState.currentTurnPlayerId === myPlayerId && roomState.status === "playing";

  // Filter other players (everyone except local first-person player)
  const otherPlayers = useMemo(() => {
    return roomState.players.filter((p) => p.id !== myPlayerId);
  }, [roomState.players, myPlayerId]);

  // Position all opponents in a semi-circular arc on the opposite side of the table
  // (from angle -60 deg to +60 deg) at a radius of 2.9 units
  const opponentsWith3DPositions = useMemo(() => {
    const totalOthers = otherPlayers.length;
    if (totalOthers === 0) return [];

    const radius = 2.9;
    const minDeg = -60;
    const maxDeg = 60;

    return otherPlayers.map((player, index) => {
      let deg = 0;
      if (totalOthers === 1) {
        deg = 0; // Directly across the table
      } else {
        deg = minDeg + (index / (totalOthers - 1)) * (maxDeg - minDeg);
      }

      const rad = (deg * Math.PI) / 180;
      // Arc centered on opposite side (-Z axis)
      const x = radius * Math.sin(rad);
      const z = -radius * Math.cos(rad);
      const y = 0; // seated relative to table ground level

      // Rotation around Y so figure faces the center (0,0,0)
      const rotY = Math.atan2(x, z);

      return {
        player,
        position: [x, y, z] as [number, number, number],
        rotationY: rotY,
      };
    });
  }, [otherPlayers]);

  // Calculate target position vector for Shotgun aiming
  const target3DPosition = useMemo<[number, number, number] | null>(() => {
    if (!selectedTargetId) return null;
    const match = opponentsWith3DPositions.find((o) => o.player.id === selectedTargetId);
    return match ? match.position : null;
  }, [selectedTargetId, opponentsWith3DPositions]);

  // Active shooter position when someone else is shooting
  const activeShooter3DPosition = useMemo<[number, number, number] | null>(() => {
    if (!roomState.currentTurnPlayerId || roomState.currentTurnPlayerId === myPlayerId) {
      return null;
    }
    const match = opponentsWith3DPositions.find((o) => o.player.id === roomState.currentTurnPlayerId);
    return match ? match.position : null;
  }, [roomState.currentTurnPlayerId, myPlayerId, opponentsWith3DPositions]);

  return (
    <div className="relative w-full h-full min-h-[420px] bg-[#070605] select-none overflow-hidden rounded-3xl border border-stone-800 shadow-2xl">
      <Canvas
        shadows
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
        }}
      >
        {/* Background & subtle ambient fog */}
        <color attach="background" args={["#080706"]} />
        <fog attach="fog" args={["#080706", 8, 22]} />

        {/* First Person Camera (Position [0, 2.4, 4.2], looking down at center) */}
        <FirstPersonCameraController
          isShaking={!!animatingShot}
          selectedTargetPos={target3DPosition}
        />

        {/* Low ambient lighting (ambientLight intensity={0.2}) so chairs and players are dimly visible */}
        <ambientLight intensity={0.2} color="#ffffff" />

        {/* The Circular Wooden Table, Overhead Spotlight, Floor Plane & Skulls Centerpiece */}
        <TableScene isSawedOff={roomState.isSawedOff} />

        {/* Atmosphere Motes floating in the light cone */}
        <AtmosphereParticles count={55} />

        {/* Opponents seated in semi-circular arc (-60° to +60° at radius 2.9) */}
        {opponentsWith3DPositions.map(({ player, position, rotationY }) => (
          <OpponentFigure3D
            key={player.id}
            player={player}
            position={position}
            rotationY={rotationY}
            isSelected={selectedTargetId === player.id}
            isCurrentTurn={roomState.currentTurnPlayerId === player.id}
            isMyTurn={isMyTurn}
            isHandcuffMode={isHandcuffMode}
            onSelect={onSelectTarget}
          />
        ))}

        {/* The 3D Shotgun resting flat on table center at [0, 0.1, 0] */}
        <Shotgun3D
          targetPosition={target3DPosition}
          pointAtSelf={pointAtSelf}
          isSawedOff={roomState.isSawedOff}
          isFiring={!!animatingShot}
          shellFiredType={shotFiredEffect}
          activeShooterPosition={activeShooter3DPosition}
        />
      </Canvas>
    </div>
  );
};

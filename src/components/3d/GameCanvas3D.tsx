import React, { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { ActionOutcome, Player, PublicRoomState } from "../../types";
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

// First person POV camera controller with subtle breathing and recoil
const FirstPersonCameraController: React.FC<{
  isShaking: boolean;
  selectedTargetPos: [number, number, number] | null;
}> = ({ isShaking, selectedTargetPos }) => {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const shakeIntensity = useRef<number>(0);

  React.useEffect(() => {
    if (isShaking) {
      shakeIntensity.current = 0.08;
    }
  }, [isShaking]);

  useFrame((_, delta) => {
    if (!cameraRef.current) return;

    // Subtle first-person head sway
    const time = Date.now() * 0.0015;
    const swayX = Math.sin(time) * 0.015;
    const swayY = Math.cos(time * 1.5) * 0.012;

    // Camera recoil / impact shake
    let shakeX = 0;
    let shakeY = 0;
    if (shakeIntensity.current > 0.001) {
      shakeX = (Math.random() - 0.5) * shakeIntensity.current;
      shakeY = (Math.random() - 0.5) * shakeIntensity.current;
      shakeIntensity.current = THREE.MathUtils.lerp(shakeIntensity.current, 0, delta * 6);
    }

    cameraRef.current.position.x = swayX + shakeX;
    cameraRef.current.position.y = 1.25 + swayY + shakeY;
    cameraRef.current.position.z = 2.85;

    // Default look target: center table slightly elevated
    const lookTarget = new THREE.Vector3(0, 0.45, 0);

    // If an opponent is targeted, glance slightly toward them
    if (selectedTargetPos) {
      lookTarget.x = selectedTargetPos[0] * 0.15;
      lookTarget.y = 0.48 + selectedTargetPos[1] * 0.05;
      lookTarget.z = selectedTargetPos[2] * 0.15;
    }

    cameraRef.current.lookAt(lookTarget);
  });

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault
      fov={52}
      near={0.1}
      far={100}
      position={[0, 1.25, 2.85]}
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

  // Position opponents along the opposite arc of the circular table
  const opponentsWith3DPositions = useMemo(() => {
    const totalOthers = otherPlayers.length;
    if (totalOthers === 0) return [];

    const tableRadius = 2.35;
    
    // Spread opponents across an arc from PI * 0.4 to PI * 1.6
    const startAngle = Math.PI * 0.45;
    const endAngle = Math.PI * 1.55;
    const angleRange = endAngle - startAngle;

    return otherPlayers.map((player, index) => {
      let angle: number;
      if (totalOthers === 1) {
        angle = Math.PI; // Directly across the table
      } else {
        angle = startAngle + (index / (totalOthers - 1)) * angleRange;
      }

      // X and Z coordinates on the circle
      // Angle PI (180 deg) is at x = 0, z = -R (directly across)
      const x = Math.sin(angle) * tableRadius;
      const z = Math.cos(angle) * tableRadius;
      const y = 0.25;

      // Rotation angle facing center
      const rotY = angle + Math.PI;

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
    <div className="relative w-full h-full min-h-[480px] bg-black select-none overflow-hidden rounded-3xl border border-stone-800 shadow-2xl">
      <Canvas
        shadows
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
        }}
      >
        {/* Background is pitch black */}
        <color attach="background" args={["#030303"]} />
        <fog attach="fog" args={["#050505", 5, 18]} />

        {/* First Person Camera */}
        <FirstPersonCameraController
          isShaking={!!animatingShot}
          selectedTargetPos={target3DPosition}
        />

        {/* Ambient base darkness */}
        <ambientLight intensity={0.12} color="#1c1917" />

        {/* The Circular Wooden Table & Center Skulls */}
        <TableScene isSawedOff={roomState.isSawedOff} />

        {/* Motes / Atmosphere Particles floating in the light */}
        <AtmosphereParticles count={80} />

        {/* Opponents seated around the table */}
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

        {/* The 3D Shotgun in the Center */}
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

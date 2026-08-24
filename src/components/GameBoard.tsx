import React, { useState, useEffect } from "react";
import { ActionOutcome, ItemType, Player, PrivateItemResult, PublicRoomState } from "../types";
import { ITEM_DEFINITIONS } from "../utils/itemData";
import { sound } from "../utils/audio";
import { GameCanvas3D } from "./3d/GameCanvas3D";
import {
  Zap,
  Skull,
  ShieldAlert,
  Crosshair,
  HelpCircle,
  Volume2,
  VolumeX,
  Eye,
  Flame,
  RotateCcw,
  Search,
  PhoneCall,
  Cigarette,
  Beer,
  Scissors,
  Lock,
  Sparkles,
  Radio,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import confetti from "canvas-confetti";

interface GameBoardProps {
  roomState: PublicRoomState;
  myPlayerId: string | null;
  privateIntel: PrivateItemResult | null;
  onClearIntel: () => void;
  onAction: (action: "shoot_self" | "shoot_target", targetId?: string) => void;
  onUseItem: (itemType: ItemType, targetId?: string) => void;
  onPlayAgain: () => void;
  onLeaveRoom: () => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  roomState,
  myPlayerId,
  privateIntel,
  onClearIntel,
  onAction,
  onUseItem,
  onPlayAgain,
  onLeaveRoom,
}) => {
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [pointAtSelf, setPointAtSelf] = useState<boolean>(false);
  const [cuffModeActive, setCuffModeActive] = useState<boolean>(false);
  const [muted, setMuted] = useState<boolean>(sound.isMuted());
  const [animatingShot, setAnimatingShot] = useState<ActionOutcome | null>(null);
  const [shotFiredEffect, setShotFiredEffect] = useState<"live" | "blank" | null>(null);
  const [showRules, setShowRules] = useState<boolean>(false);
  const [hoveredItem, setHoveredItem] = useState<ItemType | null>(null);
  const [showLogsDrawer, setShowLogsDrawer] = useState<boolean>(false);

  const isMyTurn = roomState.currentTurnPlayerId === myPlayerId && roomState.status === "playing";
  const myPlayer = roomState.players.find((p) => p.id === myPlayerId);
  const isHost = roomState.hostId === myPlayerId;
  const isSpectator = myPlayer?.isSpectator || !myPlayer?.isAlive;

  // Alive opponents
  const aliveOpponents = roomState.players.filter(
    (p) => p.id !== myPlayerId && p.isAlive && !p.isSpectator
  );

  // Auto-select first alive opponent if current selection is invalid
  useEffect(() => {
    if (aliveOpponents.length > 0) {
      if (!selectedTargetId || !aliveOpponents.some((p) => p.id === selectedTargetId)) {
        setSelectedTargetId(aliveOpponents[0].id);
      }
    } else {
      setSelectedTargetId(null);
    }
  }, [aliveOpponents, selectedTargetId]);

  // Audio on turn change
  useEffect(() => {
    if (isMyTurn) {
      sound.playTurnStart();
    }
  }, [isMyTurn]);

  // Outcome animations & sound
  useEffect(() => {
    if (roomState.lastOutcome) {
      const outcome = roomState.lastOutcome;
      setAnimatingShot(outcome);

      if (outcome.shellType === "live") {
        setShotFiredEffect("live");
        sound.playGunshot();
        if (outcome.targetDied) {
          setTimeout(() => sound.playElimination(), 600);
        } else {
          setTimeout(() => sound.playDamage(), 200);
        }
      } else {
        setShotFiredEffect("blank");
        sound.playBlankClick();
      }

      const timer = setTimeout(() => {
        setShotFiredEffect(null);
        setAnimatingShot(null);
      }, 2600);

      return () => clearTimeout(timer);
    }
  }, [roomState.lastOutcome?.id]);

  // Victory Confetti
  useEffect(() => {
    if (roomState.status === "game_over" && roomState.winner) {
      sound.playVictory();
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#ef4444", "#f59e0b", "#10b981", "#3b82f6"],
      });
    }
  }, [roomState.status, roomState.winner?.id]);

  const toggleAudio = () => {
    const next = !muted;
    setMuted(next);
    sound.setMuted(next);
  };

  const handleShootSelf = () => {
    if (!isMyTurn) return;
    sound.playRackSlide();
    onAction("shoot_self");
    setPointAtSelf(false);
  };

  const handleShootSelectedTarget = () => {
    if (!isMyTurn || !selectedTargetId) return;
    const target = roomState.players.find((p) => p.id === selectedTargetId);
    if (!target || !target.isAlive) return;

    if (cuffModeActive) {
      if (target.isHandcuffed) return;
      onUseItem("handcuffs", selectedTargetId);
      setCuffModeActive(false);
      return;
    }

    sound.playRackSlide();
    onAction("shoot_target", selectedTargetId);
  };

  const handleSelect3DTarget = (targetId: string) => {
    setPointAtSelf(false);
    setSelectedTargetId(targetId);

    if (cuffModeActive && isMyTurn) {
      const target = roomState.players.find((p) => p.id === targetId);
      if (target && !target.isHandcuffed) {
        onUseItem("handcuffs", targetId);
        setCuffModeActive(false);
      }
    }
  };

  const handleItemClick = (itemType: ItemType) => {
    if (!isMyTurn) return;

    if (itemType === "handcuffs") {
      setCuffModeActive((prev) => !prev);
      return;
    }

    setCuffModeActive(false);
    onUseItem(itemType);
  };

  const getItemIcon = (type: ItemType, className: string = "w-4 h-4") => {
    switch (type) {
      case "magnifying_glass":
        return <Search className={className} />;
      case "burner_phone":
        return <PhoneCall className={className} />;
      case "cigarettes":
        return <Cigarette className={className} />;
      case "beer":
        return <Beer className={className} />;
      case "handsaw":
        return <Scissors className={className} />;
      case "handcuffs":
        return <Lock className={className} />;
      case "inverter":
        return <Zap className={className} />;
      default:
        return <Sparkles className={className} />;
    }
  };

  const currentTurnPlayer = roomState.players.find((p) => p.id === roomState.currentTurnPlayerId);
  const selectedTargetPlayer = roomState.players.find((p) => p.id === selectedTargetId);

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-4 text-stone-100 pb-8 font-sans selection:bg-red-900 selection:text-red-200">
      {/* 1. Top HUD Control Bar */}
      <div className="flex items-center justify-between bg-stone-900/90 border border-stone-800 backdrop-blur-md px-4 sm:px-6 py-2.5 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold tracking-wider text-red-500 uppercase flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 animate-pulse text-red-500" />
              TABLE {roomState.code}
            </span>
            <span className="text-xs px-2 py-0.5 rounded font-mono bg-stone-950 text-stone-300 border border-stone-800 font-bold">
              Round {roomState.roundNumber}
            </span>
          </div>

          {roomState.isSawedOff && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-red-950/90 text-red-400 border border-red-500 animate-pulse shadow-md shadow-red-900/40">
              <Scissors className="w-3 h-3" /> SAWED-OFF (2X DMG)
            </span>
          )}

          {isSpectator && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-stone-800 text-stone-300 border border-stone-700">
              <Eye className="w-3 h-3 text-red-400" /> Spectating
            </span>
          )}
        </div>

        {/* Chamber Shell Count Meter */}
        <div className="hidden md:flex items-center gap-4 px-3 py-1 bg-stone-950/90 rounded-xl border border-stone-800 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-3.5 rounded-xs bg-red-600 border border-red-400 shadow-sm" />
            <span className="font-bold text-red-400">{roomState.chamberInfo.liveCount} Live</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-3.5 rounded-xs bg-stone-400 border border-stone-200 shadow-sm" />
            <span className="font-bold text-stone-300">{roomState.chamberInfo.blankCount} Blank</span>
          </div>
          <span className="text-stone-500 font-medium">({roomState.chamberInfo.remainingShells} in chamber)</span>
        </div>

        {/* Audio / Rules / Leave */}
        <div className="flex items-center gap-2">
          <button
            id="btn-sound-toggle"
            onClick={toggleAudio}
            className="p-2 text-stone-400 hover:text-white hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
            title={muted ? "Unmute Audio" : "Mute Audio"}
          >
            {muted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
          <button
            id="btn-rules-game"
            onClick={() => setShowRules(true)}
            className="p-2 text-stone-400 hover:text-white hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
            title="Rules & Dossier"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <button
            id="btn-leave-game"
            onClick={onLeaveRoom}
            className="px-3 py-1.5 text-xs font-mono text-stone-400 hover:text-red-400 hover:bg-red-950/40 rounded-lg border border-stone-800 hover:border-red-900 transition-colors cursor-pointer"
          >
            Exit
          </button>
        </div>
      </div>

      {/* Rules Modal */}
      {showRules && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-lg w-full p-6 text-stone-100 space-y-4 shadow-2xl shadow-black">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h3 className="font-black tracking-wider text-red-500 flex items-center gap-2 font-mono text-base">
                <ShieldAlert className="w-5 h-5" />
                RULES & ITEM DOSSIER
              </h3>
              <button
                id="btn-close-game-rules"
                onClick={() => setShowRules(false)}
                className="text-stone-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-xs text-stone-300 leading-relaxed font-mono max-h-[70vh] overflow-y-auto pr-1">
              <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 space-y-1.5">
                <div className="font-bold text-stone-200 uppercase tracking-wider text-[11px] mb-1">
                  ⚡ Core Shooting Mechanics:
                </div>
                <div className="text-emerald-400">🎯 Shoot Self + BLANK: <span className="text-stone-300">Keep turn!</span></div>
                <div className="text-red-400">💥 Shoot Self + LIVE: <span className="text-stone-300">Take 1-2 Damage, turn ends.</span></div>
                <div className="text-stone-400">💨 Shoot Opponent + BLANK: <span className="text-stone-300">No damage, turn passes.</span></div>
                <div className="text-red-400">⚡ Shoot Opponent + LIVE: <span className="text-stone-300">Deal 1-2 Damage to target, turn passes.</span></div>
              </div>

              <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 space-y-2">
                <div className="font-bold text-amber-500 uppercase tracking-wider text-[11px]">
                  🎒 Item Inventory & Rules (Max 5 Slots):
                </div>
                <p className="text-[11px] text-stone-400">
                  Items are dealt each round based on player count. Using items does NOT end your turn!
                </p>
                <div className="space-y-1.5 text-[11px]">
                  <div className="text-cyan-300 font-semibold">• 🔍 Magnifying Glass: <span className="text-stone-300">Reveals current shell secretly to you.</span></div>
                  <div className="text-cyan-300 font-semibold">• 📞 Burner Phone: <span className="text-stone-300">Whispers intel about a future shell position.</span></div>
                  <div className="text-emerald-400 font-semibold">• 🚬 Cigarettes: <span className="text-stone-300">Restores +1 Defibrillator charge (up to max 4).</span></div>
                  <div className="text-amber-400 font-semibold">• 🍺 Beer: <span className="text-stone-300">Ejects the current shell without firing.</span></div>
                  <div className="text-red-400 font-semibold">• 🪚 Hand Saw: <span className="text-stone-300">Next LIVE shell deals 2x DAMAGE!</span></div>
                  <div className="text-purple-400 font-semibold">• 🔗 Handcuffs: <span className="text-stone-300">Forces target player to skip their next turn.</span></div>
                  <div className="text-yellow-400 font-semibold">• ⚡ Inverter: <span className="text-stone-300">Flips current shell (Live ⇄ Blank).</span></div>
                </div>
              </div>
            </div>
            <button
              id="btn-dismiss-rules"
              onClick={() => setShowRules(false)}
              className="w-full py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-bold font-mono uppercase tracking-wider cursor-pointer"
            >
              Return to Table
            </button>
          </div>
        </div>
      )}

      {/* Private Intel Banner (Magnifying Glass / Burner Phone) */}
      {privateIntel && (
        <div
          id="private-intel-banner"
          className="relative bg-gradient-to-r from-stone-900 via-cyan-950/80 to-stone-900 border-2 border-cyan-500/80 rounded-2xl p-4 shadow-2xl shadow-cyan-950/80 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-3 z-30"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/40">
              {privateIntel.itemType === "magnifying_glass" ? (
                <Search className="w-6 h-6 animate-pulse" />
              ) : (
                <PhoneCall className="w-6 h-6 animate-bounce" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded bg-cyan-500/30 text-cyan-300 tracking-wider">
                  CONFIDENTIAL INTEL (YOU ONLY)
                </span>
                <span className="text-xs font-mono text-stone-400">{privateIntel.title}</span>
              </div>
              <div className="text-sm sm:text-base font-bold text-stone-100 mt-0.5 flex items-center gap-2">
                <span>{privateIntel.message}</span>
                {privateIntel.shellType && (
                  <span
                    className={`text-xs font-mono font-black px-2 py-0.5 rounded uppercase ${
                      privateIntel.shellType === "live"
                        ? "bg-red-500 text-white shadow-sm shadow-red-500/60"
                        : "bg-stone-300 text-stone-950"
                    }`}
                  >
                    {privateIntel.shellType === "live" ? "🔴 LIVE" : "⚪ BLANK"}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            id="btn-dismiss-intel"
            onClick={onClearIntel}
            className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-xs font-mono uppercase tracking-wider border border-stone-700 cursor-pointer"
          >
            Got It
          </button>
        </div>
      )}

      {/* Action Outcome Banner */}
      {animatingShot && (
        <div
          className={`p-3.5 rounded-2xl border-2 flex items-center justify-between gap-4 animate-in fade-in zoom-in-95 duration-200 shadow-2xl shadow-black z-30 ${
            animatingShot.shellType === "live"
              ? "bg-red-950/95 border-red-500 text-red-100 shadow-red-950/80"
              : "bg-stone-900/95 border-cyan-500/80 text-cyan-100 shadow-cyan-950/80"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl ${
                animatingShot.shellType === "live"
                  ? "bg-red-500/30 text-red-400 border border-red-500/50"
                  : "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
              }`}
            >
              {animatingShot.shellType === "live" ? (
                <Flame className="w-6 h-6 animate-pulse" />
              ) : (
                <Crosshair className="w-6 h-6 animate-spin" />
              )}
            </div>
            <div>
              <div className="font-mono text-[11px] uppercase tracking-widest font-black opacity-80 flex items-center gap-2">
                <span>
                  {animatingShot.shellType === "live"
                    ? animatingShot.isSawedOff
                      ? "💥💥 SAWED-OFF LIVE SHELL (2 DAMAGE)"
                      : "💥 LIVE SHELL DISCHARGED (1 DAMAGE)"
                    : "💨 BLANK ROUND (EMPTY CHAMBER CLICK)"}
                </span>
              </div>
              <div className="text-sm font-bold text-white mt-0.5">{animatingShot.message}</div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Main 3D First-Person POV Stage */}
      <div className="relative w-full h-[520px] sm:h-[580px] lg:h-[620px] rounded-3xl overflow-hidden border border-stone-800/90 shadow-2xl bg-black">
        {/* R3F 3D WebGL Canvas */}
        <GameCanvas3D
          roomState={roomState}
          myPlayerId={myPlayerId}
          selectedTargetId={selectedTargetId}
          pointAtSelf={pointAtSelf}
          isHandcuffMode={cuffModeActive}
          animatingShot={animatingShot}
          shotFiredEffect={shotFiredEffect}
          onSelectTarget={handleSelect3DTarget}
        />

        {/* 2D HUD Overlays on Top of 3D Canvas */}

        {/* Top-Center Turn Banner */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          {roomState.status === "playing" ? (
            <div className="flex flex-col items-center gap-1">
              <div
                className={`px-4 py-1.5 rounded-full text-xs font-mono font-black tracking-widest uppercase border-2 flex items-center gap-2 backdrop-blur-md shadow-2xl ${
                  isMyTurn
                    ? "bg-red-950/90 border-red-500 text-red-300 shadow-red-950/80 animate-pulse"
                    : "bg-stone-950/80 border-stone-800 text-stone-400"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isMyTurn ? "bg-red-500 animate-ping" : "bg-stone-600"
                  }`}
                />
                {isMyTurn
                  ? cuffModeActive
                    ? "🔒 SELECT OPPONENT IN 3D SCENE TO HANDCUFF"
                    : "👉 YOUR FIRST-PERSON TURN"
                  : `${currentTurnPlayer?.name || "Player"}'s Turn`}
              </div>
              <span className="text-[10px] text-stone-400 font-mono drop-shadow-md">
                {isMyTurn
                  ? "Click any opponent in 3D to aim • Use buttons below to shoot"
                  : "Watch the table showdown..."}
              </span>
            </div>
          ) : (
            <div className="px-5 py-2 rounded-2xl bg-red-950/95 border-2 border-red-500 text-red-300 shadow-2xl flex flex-col items-center">
              <div className="text-xs font-mono font-black tracking-wider uppercase">
                ☠️ SHOWDOWN CONCLUDED
              </div>
              <div className="text-sm font-bold text-white mt-0.5">
                {roomState.winner ? `${roomState.winner.name} is the Sole Survivor!` : "No survivors remaining."}
              </div>
            </div>
          )}
        </div>

        {/* Mobile / Compact Chamber indicator in top left */}
        <div className="md:hidden absolute top-4 left-4 z-20 bg-stone-950/85 backdrop-blur-md border border-stone-800 px-2.5 py-1 rounded-xl text-[10px] font-mono flex items-center gap-2">
          <span className="text-red-400 font-bold">{roomState.chamberInfo.liveCount}L</span>
          <span className="text-stone-400 font-bold">{roomState.chamberInfo.blankCount}B</span>
          <span className="text-stone-500 font-medium">({roomState.chamberInfo.remainingShells} left)</span>
        </div>

        {/* Bottom Left: Local Player's Health & Self-Status Meter */}
        {myPlayer && (
          <div className="absolute bottom-4 left-4 z-20 bg-stone-950/90 backdrop-blur-md border border-stone-800 p-3 rounded-2xl shadow-2xl flex flex-col gap-1.5 min-w-[150px]">
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full border border-black/40"
                  style={{ backgroundColor: myPlayer.avatarColor }}
                />
                <span className="font-bold text-white truncate max-w-[90px]">{myPlayer.name}</span>
                <span className="text-[9px] px-1 rounded bg-stone-800 text-stone-400 font-bold">YOU</span>
              </div>
              <span className="text-amber-400 font-black text-[11px]">
                {myPlayer.health} / {myPlayer.maxHealth || 4}
              </span>
            </div>

            {/* Defibrillator Charge Pips */}
            <div className="grid grid-cols-4 gap-1">
              {Array.from({ length: myPlayer.maxHealth || 4 }).map((_, idx) => {
                const hasCharge = idx < myPlayer.health;
                return (
                  <div
                    key={idx}
                    className={`h-4.5 rounded-md flex items-center justify-center text-[9px] transition-all ${
                      hasCharge
                        ? myPlayer.health === 1
                          ? "bg-red-600 text-white shadow-sm shadow-red-600/60 animate-pulse"
                          : "bg-emerald-600 text-white shadow-sm shadow-emerald-600/50"
                        : "bg-stone-900 text-stone-700 border border-stone-800"
                    }`}
                  >
                    <Zap className="w-2.5 h-2.5 fill-current" />
                  </div>
                );
              })}
            </div>

            {myPlayer.isHandcuffed && (
              <div className="flex items-center gap-1 text-[9px] font-mono text-purple-400 font-bold mt-0.5">
                <Lock className="w-2.5 h-2.5" /> Handcuffed (Skip Next)
              </div>
            )}
          </div>
        )}

        {/* Bottom Right / Center: Action Control Buttons (Shoot Self & Shoot Target) */}
        {isMyTurn && (
          <div className="absolute bottom-4 right-4 z-20 flex flex-col sm:flex-row items-end sm:items-center gap-2">
            {/* Shoot Self Action Button */}
            <button
              id="btn-shoot-self"
              onClick={handleShootSelf}
              onMouseEnter={() => setPointAtSelf(true)}
              onMouseLeave={() => setPointAtSelf(false)}
              className={`py-2.5 px-4 rounded-xl font-mono font-black text-xs uppercase tracking-wider border-2 backdrop-blur-md shadow-2xl transition-all cursor-pointer flex items-center gap-2 ${
                pointAtSelf
                  ? "bg-red-600 text-white border-red-400 ring-2 ring-red-500 scale-105"
                  : "bg-stone-900/90 text-stone-200 border-stone-700 hover:border-cyan-500 hover:text-white"
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-cyan-400" />
              <div className="text-left">
                <div>SHOOT SELF</div>
                <div className="text-[9px] font-normal text-stone-400">Blank = Keep Turn</div>
              </div>
            </button>

            {/* Shoot Target Action Button */}
            {selectedTargetPlayer && selectedTargetPlayer.isAlive && (
              <button
                id="btn-shoot-target"
                onClick={handleShootSelectedTarget}
                onMouseEnter={() => setPointAtSelf(false)}
                className={`py-2.5 px-4 rounded-xl font-mono font-black text-xs uppercase tracking-wider border-2 backdrop-blur-md shadow-2xl transition-all cursor-pointer flex items-center gap-2 ${
                  cuffModeActive
                    ? "bg-amber-600 hover:bg-amber-500 text-stone-950 border-amber-400 ring-2 ring-amber-400"
                    : "bg-red-600 hover:bg-red-500 text-white border-red-400 ring-2 ring-red-600"
                }`}
              >
                <Crosshair className="w-4 h-4" />
                <div className="text-left">
                  <div>
                    {cuffModeActive ? `CUFF ${selectedTargetPlayer.name}` : `SHOOT ${selectedTargetPlayer.name}`}
                  </div>
                  <div className="text-[9px] font-normal opacity-90">
                    {cuffModeActive ? "Force turn skip" : `${roomState.isSawedOff ? "2" : "1"} Dmg on Live`}
                  </div>
                </div>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 3. Local Player's Inventory Workbench Tray */}
      {myPlayer && !isSpectator && roomState.status === "playing" && (
        <div className="bg-stone-950 border border-stone-800/90 p-4 sm:p-5 rounded-2xl shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-black uppercase text-stone-300 tracking-wider flex items-center gap-1.5">
                🎒 Your Inventory ({myPlayer.items.length} / 5 Slots)
              </span>
              <span className="text-[10px] font-mono text-stone-500">
                {isMyTurn ? "• Click an item to use before pulling trigger" : "• Usable on your turn"}
              </span>
            </div>

            {cuffModeActive && (
              <button
                onClick={() => setCuffModeActive(false)}
                className="text-xs font-mono text-purple-400 hover:text-purple-300 underline cursor-pointer self-start sm:self-auto"
              >
                Cancel Handcuff Target Selection
              </button>
            )}
          </div>

          {/* Item Slots */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {[0, 1, 2, 3, 4].map((slotIndex) => {
              const item = myPlayer.items[slotIndex];
              const def = item ? ITEM_DEFINITIONS[item] : null;

              if (!item || !def) {
                return (
                  <div
                    key={slotIndex}
                    className="h-22 rounded-2xl border-2 border-dashed border-stone-900 bg-stone-950/40 flex flex-col items-center justify-center gap-1 text-stone-800 font-mono text-[11px]"
                  >
                    <span>Slot {slotIndex + 1}</span>
                    <span className="text-[10px] text-stone-800">Empty</span>
                  </div>
                );
              }

              const isCuffSelected = item === "handcuffs" && cuffModeActive;

              return (
                <div
                  key={slotIndex}
                  onMouseEnter={() => setHoveredItem(item)}
                  onMouseLeave={() => setHoveredItem(null)}
                  onClick={() => {
                    if (isMyTurn) {
                      handleItemClick(item);
                    }
                  }}
                  className={`relative p-3 rounded-2xl border-2 flex flex-col justify-between transition-all ${
                    isCuffSelected
                      ? "bg-purple-950/80 border-purple-500 shadow-xl shadow-purple-950/50 scale-105"
                      : isMyTurn
                      ? "bg-stone-900 hover:bg-stone-800/90 border-stone-700 hover:border-red-500 cursor-pointer shadow-lg hover:scale-102"
                      : "bg-stone-950/80 border-stone-800 text-stone-400 opacity-80 cursor-not-allowed"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="p-1.5 rounded-xl bg-stone-950 border border-stone-800 text-red-400">
                      {getItemIcon(item, "w-4 h-4")}
                    </div>
                    <span
                      className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                        def.category === "information"
                          ? "bg-cyan-950 text-cyan-300 border border-cyan-800"
                          : def.category === "survival"
                          ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                          : def.category === "offensive"
                          ? "bg-red-950 text-red-300 border border-red-800"
                          : def.category === "control"
                          ? "bg-purple-950 text-purple-300 border border-purple-800"
                          : "bg-amber-950 text-amber-300 border border-amber-800"
                      }`}
                    >
                      {def.category}
                    </span>
                  </div>

                  <div className="mt-1.5">
                    <div className="font-bold text-xs text-stone-100 truncate">{def.name}</div>
                    <div className="text-[10px] font-mono text-stone-400 line-clamp-1">{def.shortDesc}</div>
                  </div>

                  {isMyTurn && (
                    <button
                      id={`btn-use-item-${slotIndex}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleItemClick(item);
                      }}
                      className={`w-full mt-2 py-1 px-2 rounded-lg text-[10px] font-mono font-black uppercase tracking-wider transition-colors cursor-pointer ${
                        isCuffSelected
                          ? "bg-purple-600 text-white"
                          : "bg-stone-800 hover:bg-red-600 text-stone-200 hover:text-white"
                      }`}
                    >
                      {isCuffSelected ? "SELECT 3D TARGET" : "USE ITEM"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Item Detailed Tooltip */}
          {hoveredItem && ITEM_DEFINITIONS[hoveredItem] && (
            <div className="mt-3 p-2.5 rounded-xl bg-stone-900/95 border border-stone-700 text-xs font-mono text-stone-300 flex items-center gap-2 shadow-xl animate-in fade-in">
              <Info className="w-4 h-4 text-red-400 shrink-0" />
              <span>
                <strong className="text-white">{ITEM_DEFINITIONS[hoveredItem].name}:</strong>{" "}
                {ITEM_DEFINITIONS[hoveredItem].description}
              </span>
            </div>
          )}
        </div>
      )}

      {/* 4. Game Over / Match Reset Screen */}
      {roomState.status === "game_over" && (
        <div className="bg-stone-950 border border-stone-800 p-6 rounded-2xl text-center space-y-4 max-w-md mx-auto shadow-2xl">
          <div className="text-4xl">👑</div>
          <div>
            <h3 className="text-2xl font-black text-amber-400 font-mono">
              {roomState.winner ? `${roomState.winner.name} WINS!` : "GAME OVER"}
            </h3>
            <p className="text-xs text-stone-400 mt-1 font-mono">
              {roomState.winner ? "Sole survivor of the underground roulette table." : "No players survived the round."}
            </p>
          </div>

          {isHost ? (
            <button
              id="btn-play-again"
              onClick={onPlayAgain}
              className="w-full py-3 px-6 bg-gradient-to-r from-red-600 via-amber-600 to-red-600 hover:from-red-500 hover:to-amber-500 text-white font-black font-mono rounded-xl uppercase tracking-wider transition-all shadow-xl shadow-red-950/80 cursor-pointer flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>START NEXT MATCH (RESET LOBBY)</span>
            </button>
          ) : (
            <div className="text-xs font-mono text-stone-400">
              Waiting for table host to start a new match...
            </div>
          )}
        </div>
      )}

      {/* 5. Terminal Combat Activity Feed (Collapsible / Drawer) */}
      <div className="bg-stone-950 border border-stone-800/90 rounded-2xl p-4 shadow-xl">
        <div
          onClick={() => setShowLogsDrawer(!showLogsDrawer)}
          className="flex items-center justify-between pb-2 border-b border-stone-800 cursor-pointer select-none"
        >
          <span className="text-xs font-mono font-bold uppercase text-stone-400 tracking-wider flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-red-500" />
            Underground Combat Feed ({roomState.logs.length} events)
          </span>
          <div className="flex items-center gap-2 text-stone-500 text-xs font-mono">
            <span>{showLogsDrawer ? "Collapse" : "Expand"}</span>
            {showLogsDrawer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>

        <div
          className={`${
            showLogsDrawer ? "max-h-56" : "max-h-24"
          } overflow-y-auto space-y-1.5 text-xs font-mono scrollbar-thin scrollbar-thumb-stone-800 mt-2.5 pr-1 transition-all`}
        >
          {roomState.logs.length === 0 ? (
            <div className="text-stone-600 italic">No events recorded yet.</div>
          ) : (
            roomState.logs.slice().reverse().map((log) => {
              const timeStr = new Date(log.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              });
              return (
                <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-stone-600 text-[10px] shrink-0 font-mono">{timeStr}</span>
                  <span
                    className={`${
                      log.type === "live"
                        ? "text-red-400 font-bold"
                        : log.type === "blank"
                        ? "text-cyan-300"
                        : log.type === "reload"
                        ? "text-amber-400"
                        : log.type === "item"
                        ? "text-purple-300 font-semibold"
                        : log.type === "victory"
                        ? "text-yellow-400 font-black"
                        : log.type === "elimination"
                        ? "text-red-500 font-black"
                        : "text-stone-300"
                    }`}
                  >
                    {log.text}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

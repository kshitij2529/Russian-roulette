import React, { useState, useEffect } from "react";
import { ActionOutcome, ItemType, Player, PrivateItemResult, PublicRoomState } from "../types";
import { ITEM_DEFINITIONS } from "../utils/itemData";
import { sound } from "../utils/audio";
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
  CheckCircle2,
  Info,
  Radio,
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
  const [cuffModeActive, setCuffModeActive] = useState<boolean>(false);
  const [muted, setMuted] = useState<boolean>(sound.isMuted());
  const [animatingShot, setAnimatingShot] = useState<ActionOutcome | null>(null);
  const [shotFiredEffect, setShotFiredEffect] = useState<"live" | "blank" | null>(null);
  const [showRules, setShowRules] = useState<boolean>(false);
  const [hoveredPlayerId, setHoveredPlayerId] = useState<string | null>(null);
  const [hoveredItem, setHoveredItem] = useState<ItemType | null>(null);

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
        particleCount: 100,
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
  };

  const handleDirectShootTarget = (targetId: string) => {
    if (!isMyTurn) return;
    const target = roomState.players.find((p) => p.id === targetId);
    if (!target || !target.isAlive || target.id === myPlayerId) return;

    if (cuffModeActive) {
      // If player is in handcuff targeting mode
      if (target.isHandcuffed) return;
      onUseItem("handcuffs", targetId);
      setCuffModeActive(false);
      return;
    }

    sound.playRackSlide();
    onAction("shoot_target", targetId);
  };

  const handleItemClick = (itemType: ItemType) => {
    if (!isMyTurn) return;

    if (itemType === "handcuffs") {
      // Toggle handcuff target selection mode
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

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-5 text-stone-100 pb-12 font-sans selection:bg-red-900 selection:text-red-200">
      {/* Top Table Control Bar */}
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
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-red-950/80 text-red-400 border border-red-500 animate-pulse shadow-md shadow-red-900/40">
              <Scissors className="w-3 h-3" /> SAWED-OFF (2X DMG)
            </span>
          )}

          {isSpectator && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-stone-800 text-stone-300 border border-stone-700">
              <Eye className="w-3 h-3 text-red-400" /> Spectating
            </span>
          )}
        </div>

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
            title="Rules"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <button
            id="btn-leave-game"
            onClick={onLeaveRoom}
            className="px-3 py-1.5 text-xs font-mono text-stone-400 hover:text-red-400 hover:bg-red-950/40 rounded-lg border border-stone-800 hover:border-red-900 transition-colors cursor-pointer"
          >
            Exit Table
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
                  Items are dealt each round based on player count (2-3 players: 3 items, 4-5 players: 4 items, 6-8 players: 5 items). Using items does NOT end your turn!
                </p>
                <div className="space-y-1.5 text-[11px]">
                  <div className="text-cyan-300 font-semibold">• 🔍 Magnifying Glass: <span className="text-stone-300">Reveals current shell secretly to you.</span></div>
                  <div className="text-cyan-300 font-semibold">• 📞 Burner Phone: <span className="text-stone-300">Whispers intel about a random future shell.</span></div>
                  <div className="text-emerald-400 font-semibold">• 🚬 Cigarettes: <span className="text-stone-300">Restores +1 Health charge (up to max 4).</span></div>
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

      {/* Private Intel Flash HUD (Magnifying Glass / Burner Phone) */}
      {privateIntel && (
        <div
          id="private-intel-banner"
          className="relative bg-gradient-to-r from-stone-900 via-cyan-950/60 to-stone-900 border-2 border-cyan-500/80 rounded-2xl p-4 shadow-2xl shadow-cyan-950/80 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-3 z-30"
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
          className={`p-4 rounded-2xl border-2 flex items-center justify-between gap-4 animate-in fade-in zoom-in-95 duration-200 shadow-2xl shadow-black z-30 ${
            animatingShot.shellType === "live"
              ? "bg-red-950/95 border-red-500 text-red-100 shadow-red-950/80"
              : "bg-stone-900/95 border-cyan-500/80 text-cyan-100 shadow-cyan-950/80"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-3 rounded-xl ${
                animatingShot.shellType === "live"
                  ? "bg-red-500/30 text-red-400 border border-red-500/50"
                  : "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
              }`}
            >
              {animatingShot.shellType === "live" ? (
                <Flame className="w-7 h-7 animate-pulse" />
              ) : (
                <Crosshair className="w-7 h-7 animate-spin" />
              )}
            </div>
            <div>
              <div className="font-mono text-xs uppercase tracking-widest font-black opacity-80 flex items-center gap-2">
                <span>
                  {animatingShot.shellType === "live"
                    ? animatingShot.isSawedOff
                      ? "💥💥 SAWED-OFF LIVE SHELL (2 DAMAGE)"
                      : "💥 LIVE SHELL DISCHARGED (1 DAMAGE)"
                    : "💨 BLANK ROUND (EMPTY CHAMBER CLICK)"}
                </span>
              </div>
              <div className="text-sm sm:text-base font-bold text-white mt-0.5">{animatingShot.message}</div>
            </div>
          </div>
        </div>
      )}

      {/* Main Underground Table Arena */}
      <div className="relative bg-stone-950 border-2 border-stone-800 rounded-3xl p-5 sm:p-8 shadow-2xl shadow-black overflow-hidden backdrop-blur-md">
        {/* Gritty Table Background / Lighting Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-stone-900/80 via-stone-950 to-black pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(185,28,28,0.08),transparent_70%)] pointer-events-none" />

        {/* Dynamic Shot Flash Overlay */}
        {shotFiredEffect === "live" && (
          <div className="absolute inset-0 bg-red-600/30 mix-blend-screen pointer-events-none animate-ping duration-300" />
        )}
        {shotFiredEffect === "blank" && (
          <div className="absolute inset-0 bg-cyan-600/20 mix-blend-screen pointer-events-none duration-300" />
        )}

        {/* Turn Status Overhead Spotlight Banner */}
        <div className="text-center mb-6 relative z-10">
          {roomState.status === "playing" ? (
            <div className="inline-flex flex-col items-center gap-1.5">
              <div
                className={`px-5 py-1.5 rounded-full text-xs font-mono font-black tracking-widest uppercase border-2 flex items-center gap-2.5 shadow-xl transition-all ${
                  isMyTurn
                    ? "bg-red-950/80 border-red-500 text-red-400 shadow-red-900/40 animate-pulse"
                    : "bg-stone-900 border-stone-800 text-stone-400"
                }`}
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isMyTurn ? "bg-red-500 animate-ping" : "bg-stone-600"
                  }`}
                />
                {isMyTurn
                  ? cuffModeActive
                    ? "🔒 SELECT TARGET TO HANDCUFF"
                    : "👉 YOUR TURN • CHOOSE ACTION OR USE ITEMS"
                  : `${currentTurnPlayer?.name || "Player"}'s Turn`}
              </div>
              <span className="text-[11px] text-stone-400 font-mono">
                {isMyTurn
                  ? cuffModeActive
                    ? "Click on any alive player's seat to lock handcuffs on them"
                    : "Click Shoot Self or click an opponent's card directly at the table to shoot"
                  : "Awaiting active player's move..."}
              </span>
            </div>
          ) : (
            <div className="inline-flex flex-col items-center gap-1">
              <div className="px-5 py-1.5 rounded-full text-xs font-mono font-black uppercase bg-red-950/90 border-2 border-red-500 text-red-300 shadow-lg shadow-red-950/80">
                ☠️ SHOWDOWN CONCLUDED
              </div>
              <div className="text-xl font-black text-stone-100">
                {roomState.winner ? `${roomState.winner.name} is the Sole Survivor!` : "No survivors remaining."}
              </div>
            </div>
          )}
        </div>

        {/* Central Table Centerpiece: Shotgun, Chamber Loadout, and Table Felt */}
        <div className="relative my-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-stone-900/90 via-stone-900/60 to-stone-950 border border-stone-800/90 shadow-2xl shadow-black max-w-2xl mx-auto flex flex-col items-center justify-center">
          {/* Table Surface Felt Texture / Spotlight */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.06),transparent_80%)] rounded-3xl pointer-events-none" />

          {/* Chamber Loadout Pills */}
          <div className="flex items-center justify-between w-full max-w-md bg-stone-950/80 border border-stone-800/90 rounded-2xl px-4 py-2 mb-4 shadow-inner">
            <div className="flex items-center gap-2">
              <Crosshair className="w-3.5 h-3.5 text-red-500" />
              <span className="text-xs font-mono font-bold text-stone-300 uppercase tracking-wider">
                Chamber:
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-4 rounded-xs bg-red-600 border border-red-400 shadow-sm" />
                <span className="text-xs font-mono font-bold text-red-400">
                  {roomState.chamberInfo.liveCount} Live
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-4 rounded-xs bg-stone-400 border border-stone-200 shadow-sm" />
                <span className="text-xs font-mono font-bold text-stone-300">
                  {roomState.chamberInfo.blankCount} Blank
                </span>
              </div>
              <span className="text-[11px] font-mono text-stone-500">
                ({roomState.chamberInfo.remainingShells} left)
              </span>
            </div>
          </div>

          {/* 12-Gauge Shotgun SVG Visualizer */}
          <div className="relative py-2 flex flex-col items-center justify-center">
            {roomState.isSawedOff && (
              <div className="absolute -top-3 px-3 py-0.5 rounded-full text-[10px] font-mono font-black bg-red-600 text-white uppercase tracking-wider shadow-lg shadow-red-600/50 animate-bounce">
                🔥 Barrel Sawed Off (2x DMG)
              </div>
            )}

            <svg
              className={`w-64 sm:w-80 h-auto transition-transform duration-300 ${
                isMyTurn ? "scale-105 filter drop-shadow-[0_0_15px_rgba(239,68,68,0.2)]" : "opacity-85"
              }`}
              viewBox="0 0 220 60"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Wooden Buttstock */}
              <path
                d="M 12 40 L 48 33 L 64 31 L 64 43 L 48 48 L 12 44 Z"
                fill="#542810"
                stroke="#78350f"
                strokeWidth="1.5"
              />
              {/* Receiver */}
              <rect x="64" y="24" width="46" height="20" rx="2" fill="#1c1917" stroke="#44403c" strokeWidth="1.5" />
              <rect x="74" y="29" width="14" height="7" fill="#0c0a09" />
              {/* Trigger guard & Trigger */}
              <path d="M 72 44 Q 78 51 86 44" stroke="#57534e" strokeWidth="1.5" fill="none" />
              <path d="M 78 44 L 80 47" stroke="#a8a29e" strokeWidth="1.5" />
              {/* Wooden Pump Forend */}
              <rect x="115" y="29" width="32" height="13" rx="2" fill="#542810" stroke="#78350f" strokeWidth="1.5" />
              {/* Steel Barrels (Long or Sawed-Off) */}
              {roomState.isSawedOff ? (
                <>
                  <rect x="110" y="27" width="55" height="7" fill="#383533" stroke="#57534e" strokeWidth="1" />
                  <rect x="110" y="34" width="55" height="7" fill="#1c1917" stroke="#44403c" strokeWidth="1" />
                  <rect x="165" y="26" width="3" height="16" rx="1" fill="#ef4444" />
                  {/* Jagged saw edge */}
                  <line x1="165" y1="26" x2="165" y2="42" stroke="#dc2626" strokeWidth="2" strokeDasharray="2 2" />
                </>
              ) : (
                <>
                  <rect x="110" y="27" width="92" height="7" fill="#44403c" stroke="#57534e" strokeWidth="1" />
                  <rect x="110" y="34" width="92" height="7" fill="#292524" stroke="#44403c" strokeWidth="1" />
                  <rect x="202" y="26" width="4" height="16" rx="1" fill="#78716c" />
                  <circle cx="200" cy="25" r="1.5" fill="#f59e0b" />
                </>
              )}
            </svg>
            <span className="text-[10px] font-mono text-stone-500 uppercase tracking-widest mt-1">
              {roomState.isSawedOff ? "Sawed-Off Double Damage Loaded" : "12-Gauge Standard Action"}
            </span>
          </div>

          {/* Quick Shoot Self Button on Table Center Deck */}
          {roomState.status === "playing" && isMyTurn && (
            <div className="w-full mt-4 pt-4 border-t border-stone-800 flex flex-col items-center">
              <button
                id="btn-shoot-self"
                onClick={handleShootSelf}
                className="w-full max-w-sm py-3 px-4 rounded-xl bg-gradient-to-b from-stone-800 to-stone-900 hover:from-stone-700 hover:to-stone-800 border-2 border-stone-700 hover:border-cyan-500 text-stone-100 flex items-center justify-between shadow-xl active:scale-98 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-800/80 text-cyan-400 group-hover:bg-cyan-900 transition-colors">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-mono font-black uppercase tracking-wider text-stone-100 group-hover:text-cyan-300">
                      SHOOT SELF
                    </div>
                    <div className="text-[10px] font-mono text-cyan-400/90">
                      Blank = KEEP TURN • Live = -{roomState.isSawedOff ? "2" : "1"} HP
                    </div>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-cyan-400">PULL ⚡</span>
              </button>
            </div>
          )}
        </div>

        {/* Players Visual Seats Positioned Around the Table */}
        <div className="my-6">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-mono font-bold uppercase text-stone-400 tracking-wider flex items-center gap-1.5">
              <Crosshair className="w-3.5 h-3.5 text-red-500" />
              Players at the Table {isMyTurn && <span className="text-red-400">(Click any opponent to shoot)</span>}
            </span>
            <span className="text-[11px] font-mono text-stone-500">
              {roomState.players.filter((p) => p.isAlive).length} Alive / {roomState.players.length} Total
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {roomState.players.map((player: Player) => {
              const isMe = player.id === myPlayerId;
              const isTurn = player.id === roomState.currentTurnPlayerId;
              const isTargetable = isMyTurn && !isMe && player.isAlive && !player.isSpectator;
              const isHovered = hoveredPlayerId === player.id;

              return (
                <div
                  key={player.id}
                  id={`player-card-${player.id}`}
                  onMouseEnter={() => setHoveredPlayerId(player.id)}
                  onMouseLeave={() => setHoveredPlayerId(null)}
                  onClick={() => {
                    if (isTargetable) {
                      handleDirectShootTarget(player.id);
                    }
                  }}
                  className={`relative p-4 rounded-2xl border-2 transition-all duration-200 flex flex-col justify-between ${
                    isTurn
                      ? "bg-red-950/40 border-red-500 shadow-xl shadow-red-950/50 scale-[1.02]"
                      : isTargetable && (isHovered || cuffModeActive)
                      ? "bg-red-950/60 border-red-400 shadow-xl ring-2 ring-red-500 cursor-pointer scale-[1.02]"
                      : !player.isAlive
                      ? "bg-stone-950/60 border-stone-900 opacity-50"
                      : "bg-stone-900/80 border-stone-800"
                  } ${isTargetable ? "cursor-pointer hover:border-red-500" : ""}`}
                >
                  {/* Turn Badge / Target Marker */}
                  {isTurn && (
                    <span className="absolute -top-2.5 left-4 px-2.5 py-0.5 rounded text-[10px] font-mono font-black bg-red-600 text-white tracking-widest uppercase shadow-md shadow-red-900/50">
                      ACTIVE TURN
                    </span>
                  )}

                  {player.isHandcuffed && (
                    <span className="absolute -top-2.5 right-4 px-2 py-0.5 rounded text-[10px] font-mono font-black bg-purple-600 text-white tracking-wider uppercase flex items-center gap-1 shadow-md">
                      <Lock className="w-2.5 h-2.5" /> CUFFED (SKIP)
                    </span>
                  )}

                  {/* Header info */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center font-mono font-black text-sm shadow-md border border-black/30"
                          style={{ backgroundColor: player.avatarColor, color: "#09090b" }}
                        >
                          {player.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 font-bold text-sm text-stone-100">
                            <span className="truncate max-w-[110px]">{player.name}</span>
                            {isMe && (
                              <span className="text-[9px] bg-red-950 text-red-400 border border-red-800 px-1 py-0.2 rounded font-mono font-black">
                                YOU
                              </span>
                            )}
                            {player.isHost && (
                              <span className="text-amber-400 font-mono text-[11px]" title="Host">
                                👑
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-stone-400 font-mono">
                            {player.shotsFired} Shots Fired
                          </div>
                        </div>
                      </div>

                      {!player.isAlive && (
                        <span className="flex items-center gap-1 text-[11px] font-mono font-black text-red-500 bg-red-950/60 px-2 py-0.5 rounded border border-red-900">
                          <Skull className="w-3 h-3" /> DEAD
                        </span>
                      )}
                    </div>

                    {/* Defibrillator Health Meter (4 Charges) */}
                    <div className="space-y-1.5 bg-stone-950/80 p-2.5 rounded-xl border border-stone-800/80">
                      <div className="flex items-center justify-between text-[10px] font-mono text-stone-400">
                        <span>Charges</span>
                        <span
                          className={`font-black ${
                            player.health <= 1 ? "text-red-400 animate-pulse font-bold" : "text-amber-400"
                          }`}
                        >
                          {player.health} / 4
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-1.5">
                        {[0, 1, 2, 3].map((idx) => {
                          const hasCharge = idx < player.health;
                          return (
                            <div
                              key={idx}
                              className={`h-5 rounded-md flex items-center justify-center transition-all ${
                                hasCharge
                                  ? player.health === 1
                                    ? "bg-red-600 shadow-sm shadow-red-600/60 animate-pulse text-white"
                                    : "bg-amber-500 text-stone-950 shadow-sm"
                                  : "bg-stone-900/90 text-stone-700 border border-stone-800"
                              }`}
                            >
                              <Zap className="w-3 h-3 fill-current" />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Player Item Inventory Overview */}
                    <div className="mt-2.5 pt-2 border-t border-stone-800/60 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-stone-400">Inventory:</span>
                      <div className="flex items-center gap-1">
                        {player.items.length === 0 ? (
                          <span className="text-[10px] font-mono text-stone-600">Empty</span>
                        ) : (
                          player.items.map((it, idx) => (
                            <span
                              key={idx}
                              className="p-1 rounded bg-stone-800 border border-stone-700 text-stone-300 text-[10px]"
                              title={ITEM_DEFINITIONS[it]?.name || it}
                            >
                              {getItemIcon(it, "w-2.5 h-2.5")}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Action Trigger Label */}
                  {isTargetable && (
                    <div className="mt-3 text-center">
                      <div
                        className={`w-full py-1.5 px-2 rounded-lg text-xs font-mono font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                          cuffModeActive
                            ? "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/50"
                            : isHovered
                            ? "bg-red-600 text-white shadow-lg shadow-red-900/80 animate-pulse"
                            : "bg-stone-800 text-red-400 border border-red-900/50"
                        }`}
                      >
                        {cuffModeActive ? (
                          <>
                            <Lock className="w-3 h-3" />
                            <span>CLICK TO CUFF</span>
                          </>
                        ) : (
                          <>
                            <Crosshair className="w-3 h-3" />
                            <span>CLICK TO SHOOT 💥</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Player's Own Inventory Workbench (Bottom Tray) */}
        {myPlayer && !isSpectator && roomState.status === "playing" && (
          <div className="mt-6 pt-5 border-t border-stone-800/90 relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-black uppercase text-stone-300 tracking-wider flex items-center gap-1.5">
                  🎒 Your Inventory ({myPlayer.items.length} / 5 Slots)
                </span>
                <span className="text-[10px] font-mono text-stone-500">
                  {isMyTurn ? "• Click an item to use before shooting" : "• Usable on your turn"}
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

            {/* Item Slot Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {[0, 1, 2, 3, 4].map((slotIndex) => {
                const item = myPlayer.items[slotIndex];
                const def = item ? ITEM_DEFINITIONS[item] : null;

                if (!item || !def) {
                  return (
                    <div
                      key={slotIndex}
                      className="h-24 rounded-2xl border-2 border-dashed border-stone-800/70 bg-stone-950/40 flex flex-col items-center justify-center gap-1 text-stone-700 font-mono text-[11px]"
                    >
                      <span>Slot {slotIndex + 1}</span>
                      <span className="text-[10px] text-stone-700">Empty</span>
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
                      <div className="p-2 rounded-xl bg-stone-950 border border-stone-800 text-red-400">
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

                    <div className="mt-2">
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
                        {isCuffSelected ? "SELECT TARGET" : "USE ITEM"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Hovered Item Detailed Tooltip */}
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

        {/* Game Over Screen */}
        {roomState.status === "game_over" && (
          <div className="pt-6 border-t border-stone-800 text-center space-y-4 max-w-md mx-auto relative z-20">
            <div className="text-5xl animate-bounce">👑</div>
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
      </div>

      {/* Terminal Game Feed / Activity Log */}
      <div className="bg-stone-950 border border-stone-800/90 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-stone-800 pb-2 mb-3">
          <span className="text-xs font-mono font-bold uppercase text-stone-400 tracking-wider flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-red-500" />
            Underground Combat Feed
          </span>
          <span className="text-[10px] font-mono text-stone-600">ENCRYPTED LOG</span>
        </div>

        <div className="max-h-36 overflow-y-auto space-y-1.5 text-xs font-mono scrollbar-thin scrollbar-thumb-stone-800 pr-1">
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

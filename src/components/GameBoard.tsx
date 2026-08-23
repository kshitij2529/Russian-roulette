import React, { useState, useEffect } from "react";
import { ActionOutcome, Player, PublicRoomState } from "../types";
import { sound } from "../utils/audio";
import { Zap, Skull, ShieldAlert, Crosshair, HelpCircle, Volume2, VolumeX, Eye, Flame, RotateCcw } from "lucide-react";
import confetti from "canvas-confetti";

interface GameBoardProps {
  roomState: PublicRoomState;
  myPlayerId: string | null;
  onAction: (action: "shoot_self" | "shoot_target", targetId?: string) => void;
  onPlayAgain: () => void;
  onLeaveRoom: () => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  roomState,
  myPlayerId,
  onAction,
  onPlayAgain,
  onLeaveRoom,
}) => {
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [muted, setMuted] = useState<boolean>(sound.isMuted());
  const [animatingShot, setAnimatingShot] = useState<ActionOutcome | null>(null);
  const [shotFiredEffect, setShotFiredEffect] = useState<"live" | "blank" | null>(null);
  const [showRules, setShowRules] = useState<boolean>(false);

  const isMyTurn = roomState.currentTurnPlayerId === myPlayerId && roomState.status === "playing";
  const myPlayer = roomState.players.find((p) => p.id === myPlayerId);
  const isHost = roomState.hostId === myPlayerId;
  const isSpectator = myPlayer?.isSpectator || !myPlayer?.isAlive;

  // Other alive players for targeting
  const aliveOpponents = roomState.players.filter(
    (p) => p.id !== myPlayerId && p.isAlive && !p.isSpectator
  );

  // Auto select first opponent if none selected
  useEffect(() => {
    if (aliveOpponents.length > 0) {
      if (!selectedTargetId || !aliveOpponents.some((p) => p.id === selectedTargetId)) {
        setSelectedTargetId(aliveOpponents[0].id);
      }
    } else {
      setSelectedTargetId(null);
    }
  }, [aliveOpponents, selectedTargetId]);

  // Audio & Animation on Turn change
  useEffect(() => {
    if (isMyTurn) {
      sound.playTurnStart();
    }
  }, [isMyTurn]);

  // Handle outcome animations and sound triggers
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
      }, 2400);

      return () => clearTimeout(timer);
    }
  }, [roomState.lastOutcome?.id]);

  // Victory Confetti
  useEffect(() => {
    if (roomState.status === "game_over" && roomState.winner) {
      sound.playVictory();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#f59e0b", "#ef4444", "#10b981", "#3b82f6"],
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

  const handleShootTarget = (targetId?: string) => {
    if (!isMyTurn) return;
    const target = targetId || selectedTargetId;
    if (!target) return;
    sound.playRackSlide();
    onAction("shoot_target", target);
  };

  // Find currently active player
  const currentTurnPlayer = roomState.players.find((p) => p.id === roomState.currentTurnPlayerId);

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 text-neutral-100 pb-12">
      {/* Top Game Bar */}
      <div className="flex items-center justify-between bg-neutral-900/80 border border-neutral-800 backdrop-blur-md px-4 sm:px-6 py-3 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold tracking-wider text-amber-500 uppercase">
              ROOM {roomState.code}
            </span>
            <span className="text-xs px-2 py-0.5 rounded font-mono bg-neutral-800 text-neutral-300 border border-neutral-700">
              Round {roomState.roundNumber}
            </span>
          </div>

          {isSpectator && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
              <Eye className="w-3 h-3" /> Spectator Mode
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-sound-toggle"
            onClick={toggleAudio}
            className="p-2 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 rounded-lg transition-colors"
            title={muted ? "Unmute Audio" : "Mute Audio"}
          >
            {muted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
          <button
            id="btn-rules-game"
            onClick={() => setShowRules(true)}
            className="p-2 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 rounded-lg transition-colors"
            title="Rules"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <button
            id="btn-leave-game"
            onClick={onLeaveRoom}
            className="px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-red-400 hover:bg-red-950/30 rounded-lg border border-neutral-800 hover:border-red-900/40 transition-colors"
          >
            Exit Table
          </button>
        </div>
      </div>

      {/* Rules Modal */}
      {showRules && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-6 text-neutral-100 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="font-black tracking-wider text-amber-500 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5" />
                RULES OF ENGAGEMENT
              </h3>
              <button
                id="btn-close-game-rules"
                onClick={() => setShowRules(false)}
                className="text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-xs sm:text-sm text-neutral-300 leading-relaxed font-mono">
              <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 space-y-2">
                <div className="text-emerald-400">🎯 Shoot Self + BLANK: <span className="text-neutral-200">Keep Turn</span></div>
                <div className="text-red-400">💥 Shoot Self + LIVE: <span className="text-neutral-200">1 Damage, Turn Ends</span></div>
                <div className="text-neutral-400">💨 Shoot Other + BLANK: <span className="text-neutral-200">No Damage, Turn Ends</span></div>
                <div className="text-red-400">⚡ Shoot Other + LIVE: <span className="text-neutral-200">1 Damage to Target, Turn Ends</span></div>
              </div>
              <p className="text-xs text-neutral-400">
                Chamber shells are dealt randomly at each round reload. The dealer announces how many Live and Blank shells are inside, but the firing order is confidential.
              </p>
            </div>
            <button
              id="btn-dismiss-rules"
              onClick={() => setShowRules(false)}
              className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-bold uppercase tracking-wider"
            >
              Back to Game
            </button>
          </div>
        </div>
      )}

      {/* Action Outcome Flash Notice */}
      {animatingShot && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between gap-4 animate-in fade-in zoom-in-95 duration-200 shadow-2xl ${
            animatingShot.shellType === "live"
              ? "bg-red-950/80 border-red-500/50 text-red-200"
              : "bg-neutral-900/90 border-cyan-500/50 text-cyan-200"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl ${
                animatingShot.shellType === "live" ? "bg-red-500/20 text-red-400" : "bg-cyan-500/20 text-cyan-400"
              }`}
            >
              {animatingShot.shellType === "live" ? (
                <Flame className="w-6 h-6 animate-pulse" />
              ) : (
                <Crosshair className="w-6 h-6 animate-spin" />
              )}
            </div>
            <div>
              <div className="font-mono text-xs uppercase tracking-wider font-semibold opacity-75">
                {animatingShot.shellType === "live" ? "💥 LIVE SHELL DISCHARGED" : "💨 BLANK ROUND (EMPTY CLICK)"}
              </div>
              <div className="text-sm sm:text-base font-bold text-neutral-100">{animatingShot.message}</div>
            </div>
          </div>
        </div>
      )}

      {/* Main Table Arena */}
      <div className="relative bg-neutral-950/80 border border-neutral-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden backdrop-blur-sm">
        {/* Subtle Table Grid Texture */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293708_1px,transparent_1px),linear-gradient(to_bottom,#1f293708_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

        {/* Dynamic Shot Flash Overlay */}
        {shotFiredEffect === "live" && (
          <div className="absolute inset-0 bg-red-600/20 mix-blend-screen pointer-events-none animate-pulse" />
        )}
        {shotFiredEffect === "blank" && (
          <div className="absolute inset-0 bg-cyan-600/10 mix-blend-screen pointer-events-none" />
        )}

        {/* Turn Status Header Banner */}
        <div className="text-center mb-8 relative z-10">
          {roomState.status === "playing" ? (
            <div className="inline-flex flex-col items-center gap-1.5">
              <div
                className={`px-4 py-1.5 rounded-full text-xs font-mono font-bold tracking-widest uppercase border flex items-center gap-2 ${
                  isMyTurn
                    ? "bg-amber-500/20 border-amber-500/50 text-amber-400 animate-pulse shadow-lg shadow-amber-500/20"
                    : "bg-neutral-900 border-neutral-800 text-neutral-400"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isMyTurn ? "bg-amber-400 animate-ping" : "bg-neutral-500"
                  }`}
                />
                {isMyTurn
                  ? "👉 YOUR TURN TO SHOOT"
                  : `${currentTurnPlayer?.name || "Player"}'s Turn`}
              </div>
              <span className="text-xs text-neutral-500 font-mono">
                {isMyTurn ? "Select Shoot Self or target an opponent below" : "Awaiting opponent's decision..."}
              </span>
            </div>
          ) : (
            <div className="inline-flex flex-col items-center gap-1">
              <div className="px-4 py-1 rounded-full text-xs font-mono font-bold uppercase bg-amber-500/20 border border-amber-500/40 text-amber-300">
                🏆 MATCH CONCLUDED
              </div>
              <div className="text-lg font-bold text-neutral-100">
                {roomState.winner ? `${roomState.winner.name} won the showdown!` : "No survivors remaining."}
              </div>
            </div>
          )}
        </div>

        {/* Chamber Shells Status Card */}
        <div className="max-w-md mx-auto mb-8 bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-3">
            <span className="text-xs font-mono font-bold uppercase text-neutral-400 flex items-center gap-1.5">
              <Crosshair className="w-3.5 h-3.5 text-amber-500" /> Chamber Loadout
            </span>
            <span className="text-xs font-mono text-neutral-400">
              {roomState.chamberInfo.remainingShells} / {roomState.chamberInfo.totalShells} shells left
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            {/* Live Count */}
            <div className="p-2.5 rounded-xl bg-red-950/30 border border-red-900/40 flex items-center justify-between px-3">
              <div className="flex items-center gap-2">
                <div className="w-4 h-7 rounded-sm bg-gradient-to-t from-red-700 to-red-500 border border-red-400 shadow-sm" />
                <span className="text-xs font-mono text-neutral-300 font-medium">Live Shells</span>
              </div>
              <span className="text-lg font-black font-mono text-red-400">
                {roomState.chamberInfo.liveCount}
              </span>
            </div>

            {/* Blank Count */}
            <div className="p-2.5 rounded-xl bg-neutral-800/40 border border-neutral-700/50 flex items-center justify-between px-3">
              <div className="flex items-center gap-2">
                <div className="w-4 h-7 rounded-sm bg-gradient-to-t from-neutral-600 to-neutral-400 border border-neutral-300 shadow-sm" />
                <span className="text-xs font-mono text-neutral-300 font-medium">Blank Shells</span>
              </div>
              <span className="text-lg font-black font-mono text-neutral-300">
                {roomState.chamberInfo.blankCount}
              </span>
            </div>
          </div>
        </div>

        {/* Central Shotgun Table Visualizer */}
        <div className="relative py-6 flex flex-col items-center justify-center">
          <div className="relative w-64 sm:w-80 h-28 bg-neutral-900/60 rounded-3xl border border-neutral-800 flex items-center justify-center shadow-inner overflow-hidden">
            {/* Ambient Red/Green Glow */}
            <div className="absolute inset-0 bg-radial from-amber-500/5 to-transparent pointer-events-none" />

            {/* SVG Shotgun Illustration */}
            <svg
              className={`w-48 sm:w-56 h-auto transition-transform duration-300 ${
                isMyTurn ? "scale-105" : "opacity-80"
              }`}
              viewBox="0 0 200 60"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Wooden Stock */}
              <path
                d="M 10 38 L 45 32 L 60 30 L 60 40 L 45 46 L 10 42 Z"
                fill="#78350f"
                stroke="#92400e"
                strokeWidth="1.5"
              />
              {/* Receiver */}
              <rect x="60" y="24" width="42" height="18" rx="2" fill="#262626" stroke="#404040" strokeWidth="1.5" />
              <rect x="70" y="28" width="12" height="6" fill="#171717" />
              {/* Trigger guard & Trigger */}
              <path d="M 68 42 Q 74 48 80 42" stroke="#525252" strokeWidth="1.5" fill="none" />
              <path d="M 73 42 L 75 45" stroke="#a3a3a3" strokeWidth="1.5" />
              {/* Pump Forend */}
              <rect x="105" y="28" width="30" height="12" rx="2" fill="#78350f" stroke="#92400e" strokeWidth="1" />
              {/* Dual Steel Barrels */}
              <rect x="102" y="26" width="85" height="7" fill="#404040" stroke="#525252" strokeWidth="1" />
              <rect x="102" y="33" width="85" height="7" fill="#262626" stroke="#404040" strokeWidth="1" />
              {/* Muzzle Tip */}
              <rect x="187" y="25" width="4" height="16" rx="1" fill="#737373" />
              {/* Front Bead */}
              <circle cx="185" cy="24" r="1.5" fill="#f59e0b" />
            </svg>
          </div>

          <span className="text-[11px] font-mono text-neutral-500 mt-2 uppercase tracking-wider">
            12-Gauge Sawed-Off Action
          </span>
        </div>

        {/* Players Seats Grid around the Table */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 my-6">
          {roomState.players.map((player: Player) => {
            const isMe = player.id === myPlayerId;
            const isTurn = player.id === roomState.currentTurnPlayerId;
            const isSelected = selectedTargetId === player.id;

            return (
              <div
                key={player.id}
                id={`player-card-${player.id}`}
                onClick={() => {
                  if (isMyTurn && !isMe && player.isAlive && !player.isSpectator) {
                    setSelectedTargetId(player.id);
                  }
                }}
                className={`relative p-4 rounded-2xl border transition-all ${
                  isTurn
                    ? "bg-amber-950/30 border-amber-500 shadow-lg shadow-amber-500/10 scale-[1.02]"
                    : isSelected && isMyTurn
                    ? "bg-red-950/40 border-red-500 shadow-md ring-1 ring-red-500 cursor-pointer"
                    : !player.isAlive
                    ? "bg-neutral-950/40 border-neutral-900 opacity-60"
                    : "bg-neutral-900/70 border-neutral-800"
                } ${isMyTurn && !isMe && player.isAlive ? "cursor-pointer hover:border-red-400/80" : ""}`}
              >
                {/* Active Turn Halo */}
                {isTurn && (
                  <span className="absolute -top-2.5 left-4 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500 text-neutral-950 tracking-wider uppercase">
                    ACTIVE TURN
                  </span>
                )}

                {/* Header */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shadow-md"
                      style={{ backgroundColor: player.avatarColor, color: "#18181b" }}
                    >
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1 font-bold text-sm text-neutral-200">
                        <span className="truncate max-w-[100px]">{player.name}</span>
                        {isMe && <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1 py-0.2 rounded font-mono">YOU</span>}
                      </div>
                      <div className="text-[10px] text-neutral-400 font-mono">
                        {player.shotsFired} Shots Fired
                      </div>
                    </div>
                  </div>

                  {!player.isAlive && (
                    <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-red-500 bg-red-950/40 px-2 py-0.5 rounded border border-red-900/40">
                      <Skull className="w-3 h-3" /> DEAD
                    </span>
                  )}
                </div>

                {/* Health Defibrillator Meter (4 Charges) */}
                <div className="space-y-1.5 bg-neutral-950/60 p-2.5 rounded-xl border border-neutral-800/80">
                  <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
                    <span>Charges</span>
                    <span className={`font-bold ${player.health <= 1 ? "text-red-400 animate-pulse" : "text-amber-400"}`}>
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
                                ? "bg-red-500 shadow-sm shadow-red-500/40 animate-pulse text-neutral-950"
                                : "bg-amber-400 text-neutral-950 shadow-sm"
                              : "bg-neutral-800/60 text-neutral-600 border border-neutral-800"
                          }`}
                        >
                          <Zap className="w-3 h-3 fill-current" />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Target Selected Indicator */}
                {isMyTurn && !isMe && player.isAlive && (
                  <div className="mt-2 text-center">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                        isSelected ? "bg-red-500 text-white font-bold" : "text-neutral-500 hover:text-neutral-300"
                      }`}
                    >
                      {isSelected ? "TARGET LOCKED 🎯" : "Click to Target"}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Action Decision Controls */}
        {roomState.status === "playing" && (
          <div className="pt-6 border-t border-neutral-800/80 relative z-10">
            {isMyTurn ? (
              <div className="space-y-4 max-w-xl mx-auto">
                <div className="text-center">
                  <span className="text-xs font-mono font-bold tracking-wider text-amber-400 uppercase">
                    Choose Your Action
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Shoot Self Button */}
                  <button
                    id="btn-shoot-self"
                    onClick={handleShootSelf}
                    className="p-4 rounded-2xl bg-gradient-to-b from-neutral-800 to-neutral-900 hover:from-neutral-700 hover:to-neutral-800 border border-neutral-700 text-neutral-100 flex flex-col items-center justify-center gap-1.5 shadow-lg active:scale-98 transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-neutral-100 group-hover:text-amber-400">
                      <ShieldAlert className="w-4 h-4 text-cyan-400" />
                      SHOOT SELF
                    </div>
                    <span className="text-[11px] text-cyan-300/80 font-mono">
                      Blank = KEEP TURN • Live = -1 HP
                    </span>
                  </button>

                  {/* Shoot Opponent Button */}
                  <button
                    id="btn-shoot-target"
                    onClick={() => handleShootTarget()}
                    disabled={!selectedTargetId}
                    className={`p-4 rounded-2xl border text-neutral-100 flex flex-col items-center justify-center gap-1.5 shadow-lg transition-all group ${
                      selectedTargetId
                        ? "bg-gradient-to-b from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 border-red-500 cursor-pointer active:scale-98 shadow-red-600/20"
                        : "bg-neutral-900 border-neutral-800 text-neutral-600 cursor-not-allowed"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wider">
                      <Crosshair className="w-4 h-4" />
                      SHOOT {selectedTargetId ? roomState.players.find(p => p.id === selectedTargetId)?.name : "TARGET"}
                    </div>
                    <span className="text-[11px] text-red-200/90 font-mono">
                      Live = -1 HP to Target • Blank = No Effect
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-2 text-neutral-500 text-xs font-mono flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-neutral-600 animate-pulse"></span>
                Waiting for {currentTurnPlayer?.name || "active player"} to pull the trigger...
              </div>
            )}
          </div>
        )}

        {/* Game Over Screen */}
        {roomState.status === "game_over" && (
          <div className="pt-6 border-t border-neutral-800 text-center space-y-4 max-w-md mx-auto">
            <div className="text-4xl">👑</div>
            <div>
              <h3 className="text-2xl font-black text-amber-400">
                {roomState.winner ? `${roomState.winner.name} WINS!` : "GAME OVER"}
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                {roomState.winner ? "Sole survivor of the Russian roulette table." : "No players survived the round."}
              </p>
            </div>

            {isHost ? (
              <button
                id="btn-play-again"
                onClick={onPlayAgain}
                className="w-full py-3 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black rounded-xl uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>PLAY AGAIN (RESET LOBBY)</span>
              </button>
            ) : (
              <div className="text-xs font-mono text-neutral-400">
                Waiting for room host to start a new game...
              </div>
            )}
          </div>
        )}
      </div>

      {/* Terminal Game Feed / Log */}
      <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-3">
          <span className="text-xs font-mono font-semibold uppercase text-neutral-400 tracking-wider">
            Game Action Log
          </span>
          <span className="text-[10px] font-mono text-neutral-600">LIVE FEED</span>
        </div>

        <div className="max-h-36 overflow-y-auto space-y-1.5 text-xs font-mono scrollbar-thin scrollbar-thumb-neutral-800 pr-1">
          {roomState.logs.length === 0 ? (
            <div className="text-neutral-600 italic">No events recorded yet.</div>
          ) : (
            roomState.logs.slice().reverse().map((log) => {
              const timeStr = new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
              return (
                <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-neutral-600 text-[10px] shrink-0">{timeStr}</span>
                  <span
                    className={`${
                      log.type === "live"
                        ? "text-red-400 font-semibold"
                        : log.type === "blank"
                        ? "text-cyan-300"
                        : log.type === "reload"
                        ? "text-amber-400"
                        : log.type === "victory"
                        ? "text-yellow-300 font-bold"
                        : log.type === "elimination"
                        ? "text-red-500 font-bold"
                        : "text-neutral-300"
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

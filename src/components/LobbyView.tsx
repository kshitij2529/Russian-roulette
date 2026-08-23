import React, { useState, useEffect } from "react";
import { Player, PublicRoomState } from "../types";
import { Shield, Play, Copy, Check, Users, HelpCircle, Sparkles, LogOut } from "lucide-react";

interface LobbyViewProps {
  roomState: PublicRoomState | null;
  myPlayerId: string | null;
  onCreateRoom: (name: string, color: string) => void;
  onJoinRoom: (code: string, name: string, color: string) => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
}

const AVATAR_COLORS = [
  "#ef4444", // Red
  "#f59e0b", // Amber
  "#10b981", // Emerald
  "#06b6d4", // Cyan
  "#3b82f6", // Blue
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#e2e8f0", // Silver
];

export const LobbyView: React.FC<LobbyViewProps> = ({
  roomState,
  myPlayerId,
  onCreateRoom,
  onJoinRoom,
  onStartGame,
  onLeaveRoom,
}) => {
  const [name, setName] = useState<string>(() => localStorage.getItem("bs_player_name") || "");
  const [selectedColor, setSelectedColor] = useState<string>(() => AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]);
  const [joinCode, setJoinCode] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [showRules, setShowRules] = useState<boolean>(false);

  // Check URL query parameters for auto-fill room code
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get("room");
    if (roomParam) {
      setJoinCode(roomParam.toUpperCase().slice(0, 4));
    }
  }, []);

  const handleNameChange = (val: string) => {
    setName(val);
    localStorage.setItem("bs_player_name", val);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreateRoom(name.trim(), selectedColor);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !joinCode.trim()) return;
    onJoinRoom(joinCode.trim().toUpperCase(), name.trim(), selectedColor);
  };

  const copyRoomCode = () => {
    if (!roomState?.code) return;
    navigator.clipboard.writeText(roomState.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // If inside a room lobby
  if (roomState && roomState.status === "lobby") {
    const isHost = roomState.hostId === myPlayerId;
    const canStart = isHost && roomState.players.length >= 2;

    return (
      <div className="w-full max-w-2xl mx-auto bg-neutral-900/90 border border-neutral-800 backdrop-blur-md rounded-2xl p-6 sm:p-8 shadow-2xl text-neutral-100">
        {/* Room Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-wider text-amber-500 uppercase">Room Lobby</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {roomState.players.length} / 8 Players
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <h2 className="text-3xl font-black font-mono tracking-widest text-neutral-100">{roomState.code}</h2>
              <button
                id="btn-copy-code"
                onClick={copyRoomCode}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 rounded-md border border-neutral-700 text-neutral-300 transition-colors"
                title="Copy Room Code"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-neutral-400" />}
                <span>{copied ? "Copied!" : "Copy Code"}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              id="btn-rules-lobby"
              onClick={() => setShowRules(true)}
              className="p-2 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition-colors"
              title="Game Rules"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
            <button
              id="btn-leave-lobby"
              onClick={onLeaveRoom}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-950/40 rounded-lg border border-red-900/30 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Leave</span>
            </button>
          </div>
        </div>

        {/* Players Roster */}
        <div className="py-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold tracking-wider text-neutral-400 uppercase flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-500" />
              Connected Players
            </h3>
            <span className="text-xs text-neutral-500 font-mono">Min. 2 players needed</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {roomState.players.map((player: Player) => {
              const isMe = player.id === myPlayerId;
              return (
                <div
                  key={player.id}
                  id={`lobby-player-${player.id}`}
                  className={`flex items-center justify-between p-3.5 rounded-xl border ${
                    isMe
                      ? "bg-amber-950/20 border-amber-500/40"
                      : "bg-neutral-950/60 border-neutral-800/80"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm shadow-md"
                      style={{ backgroundColor: player.avatarColor, color: "#18181b" }}
                    >
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 font-medium text-neutral-200">
                        <span>{player.name}</span>
                        {isMe && <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.2 rounded">YOU</span>}
                      </div>
                      <div className="text-xs text-neutral-400 flex items-center gap-2">
                        <span>4 Charges</span>
                        {player.isHost && (
                          <span className="text-amber-400 font-mono text-[11px] flex items-center gap-0.5">
                            👑 Host
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-emerald-400 font-mono text-[11px]">Ready</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action / Start Game button */}
        <div className="pt-4 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-neutral-400">
            {isHost ? (
              canStart ? (
                <span className="text-emerald-400 font-medium">Ready to deal the chamber! Click Start Game.</span>
              ) : (
                <span className="text-amber-400">Waiting for at least 1 more player to join...</span>
              )
            ) : (
              <span>Waiting for room host to start the game...</span>
            )}
          </div>

          {isHost ? (
            <button
              id="btn-start-game"
              onClick={onStartGame}
              disabled={!canStart}
              className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold tracking-wide transition-all shadow-lg ${
                canStart
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 cursor-pointer shadow-amber-500/20 active:scale-98"
                  : "bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700"
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>START GAME</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 text-xs font-mono text-neutral-500">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
              Awaiting Host
            </div>
          )}
        </div>
      </div>
    );
  }

  // Landing / Create or Join Room screen
  return (
    <div className="w-full max-w-xl mx-auto space-y-6">
      {/* Rules Modal */}
      {showRules && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-6 text-neutral-100 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="font-black tracking-wider text-amber-500 flex items-center gap-2 text-lg">
                <Shield className="w-5 h-5" />
                HOW TO PLAY
              </h3>
              <button
                id="btn-close-rules"
                onClick={() => setShowRules(false)}
                className="text-neutral-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-xs sm:text-sm text-neutral-300 leading-relaxed font-sans">
              <p>
                <strong className="text-neutral-100">1. Health:</strong> Every player enters the table with <span className="text-amber-400 font-bold">4 Health Charges</span>.
              </p>
              <p>
                <strong className="text-neutral-100">2. Shell Count:</strong> Each round, the dealer announces the secret mixture of <span className="text-red-400 font-bold">Live</span> and <span className="text-neutral-400 font-bold">Blank</span> shells. The exact sequence is hidden!
              </p>
              <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 space-y-2 font-mono text-xs">
                <div className="text-neutral-200 font-semibold border-b border-neutral-800 pb-1">Shooting Rules:</div>
                <div className="text-emerald-400">• Shoot Self + Blank ➜ <span className="text-neutral-200">No damage, Turn CONTINUES!</span></div>
                <div className="text-red-400">• Shoot Self + Live ➜ <span className="text-neutral-200">Take 1 damage, Turn ends.</span></div>
                <div className="text-neutral-400">• Shoot Other + Blank ➜ <span className="text-neutral-200">No damage, Turn ends.</span></div>
                <div className="text-red-400">• Shoot Other + Live ➜ <span className="text-neutral-200">Target takes 1 damage, Turn ends.</span></div>
              </div>
              <p>
                <strong className="text-neutral-100">3. Elimination:</strong> Reach 0 charges and you become a spectator. The last player standing wins!
              </p>
            </div>
            <button
              id="btn-got-it"
              onClick={() => setShowRules(false)}
              className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-bold uppercase tracking-wider"
            >
              Understood
            </button>
          </div>
        </div>
      )}

      {/* Main Landing Card */}
      <div className="bg-neutral-900/90 border border-neutral-800 backdrop-blur-md rounded-2xl p-6 sm:p-8 shadow-2xl text-neutral-100 space-y-6">
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            2-8 Players Real-Time Party Game
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-100">
            ENTER THE TABLE
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-sm mx-auto">
            Test your luck and nerve against friends. High-stakes multiplayer roulette.
          </p>
        </div>

        {/* Profile / Nickname Setup */}
        <div className="space-y-3 bg-neutral-950/60 p-4 rounded-xl border border-neutral-800/80">
          <div>
            <label htmlFor="input-player-name" className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
              Player Nickname
            </label>
            <input
              id="input-player-name"
              type="text"
              maxLength={16}
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Enter your alias (e.g., Maverick)"
              className="w-full px-3.5 py-2.5 bg-neutral-900 border border-neutral-700 rounded-xl text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              Avatar Color
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {AVATAR_COLORS.map((col) => (
                <button
                  key={col}
                  id={`color-opt-${col.replace('#', '')}`}
                  type="button"
                  onClick={() => setSelectedColor(col)}
                  className={`w-7 h-7 rounded-lg transition-transform ${
                    selectedColor === col ? "ring-2 ring-white scale-110" : "opacity-75 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: col }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Create or Join Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Create Card */}
          <div className="p-4 bg-neutral-950/60 rounded-xl border border-neutral-800 flex flex-col justify-between space-y-4">
            <div>
              <h3 className="font-bold text-neutral-200 text-sm">Host a New Game</h3>
              <p className="text-xs text-neutral-400 mt-0.5">Generate a room code and invite friends.</p>
            </div>
            <button
              id="btn-create-room"
              onClick={handleCreate}
              disabled={!name.trim()}
              className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                name.trim()
                  ? "bg-amber-500 hover:bg-amber-400 text-neutral-950 cursor-pointer shadow-lg shadow-amber-500/10 active:scale-98"
                  : "bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Create Room</span>
            </button>
          </div>

          {/* Join Card */}
          <div className="p-4 bg-neutral-950/60 rounded-xl border border-neutral-800 flex flex-col justify-between space-y-4">
            <div>
              <h3 className="font-bold text-neutral-200 text-sm">Join Existing Game</h3>
              <p className="text-xs text-neutral-400 mt-0.5">Enter a 4-letter room code.</p>
            </div>
            <div className="space-y-2">
              <input
                id="input-join-code"
                type="text"
                maxLength={4}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ROOM CODE"
                className="w-full text-center tracking-widest uppercase font-mono px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-xl text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-cyan-500 text-sm font-bold"
              />
              <button
                id="btn-join-room"
                onClick={handleJoin}
                disabled={!name.trim() || !joinCode.trim()}
                className={`w-full py-2 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                  name.trim() && joinCode.trim()
                    ? "bg-cyan-600 hover:bg-cyan-500 text-white cursor-pointer shadow-lg shadow-cyan-500/10 active:scale-98"
                    : "bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Join Room</span>
              </button>
            </div>
          </div>
        </div>

        {/* Rules button in footer */}
        <div className="text-center pt-2">
          <button
            id="btn-open-rules-landing"
            onClick={() => setShowRules(true)}
            className="text-xs text-neutral-400 hover:text-amber-400 underline underline-offset-4 transition-colors"
          >
            How does Buckshot Roulette work? View Rules
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from "react";
import { Player, PublicRoomState } from "../types";
import { Shield, Play, Copy, Check, Users, HelpCircle, Flame, LogOut, Radio } from "lucide-react";

interface LobbyViewProps {
  roomState: PublicRoomState | null;
  myPlayerId: string | null;
  onCreateRoom: (name: string, color: string) => void;
  onJoinRoom: (code: string, name: string, color: string) => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
}

const AVATAR_COLORS = [
  "#dc2626", // Crimson Red
  "#ea580c", // Burnt Orange
  "#d97706", // Dark Amber
  "#16a34a", // Toxic Green
  "#0891b2", // Deep Cyan
  "#2563eb", // Midnight Blue
  "#9333ea", // Dark Violet
  "#78716c", // Gunmetal Stone
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
  const [selectedColor, setSelectedColor] = useState<string>(
    () => AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]
  );
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
      <div className="w-full max-w-2xl mx-auto bg-stone-900/95 border-2 border-stone-800 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black text-stone-100 font-sans">
        {/* Room Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-stone-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold tracking-wider text-red-500 uppercase flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 animate-pulse text-red-500" />
                Underground Lobby
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-red-950/80 text-red-400 border border-red-800/60 font-bold">
                {roomState.players.length} / 8 Seats Filled
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <h2 className="text-3xl font-black font-mono tracking-widest text-stone-100">{roomState.code}</h2>
              <button
                id="btn-copy-code"
                onClick={copyRoomCode}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium bg-stone-800 hover:bg-stone-700 active:bg-stone-600 rounded-lg border border-stone-700 text-stone-300 transition-colors cursor-pointer"
                title="Copy Room Code"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-stone-400" />}
                <span>{copied ? "Copied!" : "Copy Code"}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              id="btn-rules-lobby"
              onClick={() => setShowRules(true)}
              className="p-2 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
              title="Game Rules"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
            <button
              id="btn-leave-lobby"
              onClick={onLeaveRoom}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-mono font-medium text-red-400 hover:bg-red-950/60 rounded-lg border border-red-900/60 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Leave</span>
            </button>
          </div>
        </div>

        {/* Players Roster */}
        <div className="py-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-mono font-bold tracking-wider text-stone-400 uppercase flex items-center gap-2">
              <Users className="w-4 h-4 text-red-500" />
              Players Seated at Table
            </h3>
            <span className="text-xs text-stone-500 font-mono">Min. 2 players needed to start</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {roomState.players.map((player: Player) => {
              const isMe = player.id === myPlayerId;
              return (
                <div
                  key={player.id}
                  id={`lobby-player-${player.id}`}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                    isMe
                      ? "bg-red-950/30 border-red-500/50 shadow-md shadow-red-950/40"
                      : "bg-stone-950/80 border-stone-800/80"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-mono font-black text-sm shadow-md border border-black/30"
                      style={{ backgroundColor: player.avatarColor, color: "#09090b" }}
                    >
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-sm text-stone-100">
                        <span>{player.name}</span>
                        {isMe && (
                          <span className="text-[9px] bg-red-950 text-red-400 border border-red-800 px-1 py-0.2 rounded font-mono font-black">
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-stone-400 flex items-center gap-2 font-mono">
                        <span>4 Charges</span>
                        {player.isHost && (
                          <span className="text-amber-400 font-mono text-[11px] flex items-center gap-0.5">
                            👑 Host
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-mono">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-emerald-400 font-bold text-[11px]">Seated</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action / Start Game button */}
        <div className="pt-4 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs font-mono text-stone-400">
            {isHost ? (
              canStart ? (
                <span className="text-emerald-400 font-bold">Ready to deal items & load chamber!</span>
              ) : (
                <span className="text-amber-400">Waiting for at least 1 opponent to take a seat...</span>
              )
            ) : (
              <span>Waiting for table host to start the match...</span>
            )}
          </div>

          {isHost ? (
            <button
              id="btn-start-game"
              onClick={onStartGame}
              disabled={!canStart}
              className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-mono font-black tracking-wider transition-all shadow-xl cursor-pointer ${
                canStart
                  ? "bg-gradient-to-r from-red-600 via-amber-600 to-red-600 hover:from-red-500 hover:to-amber-500 text-white shadow-red-950/80 active:scale-98"
                  : "bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700"
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>DEAL & START MATCH</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 text-xs font-mono text-stone-500">
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
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-lg w-full p-6 text-stone-100 space-y-4 shadow-2xl shadow-black">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h3 className="font-black tracking-wider text-red-500 flex items-center gap-2 font-mono text-base">
                <Shield className="w-5 h-5" />
                HOW TO PLAY & ITEM DOSSIER
              </h3>
              <button
                id="btn-close-rules"
                onClick={() => setShowRules(false)}
                className="text-stone-400 hover:text-white text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-xs text-stone-300 leading-relaxed font-mono max-h-[70vh] overflow-y-auto pr-1">
              <p>
                <strong className="text-stone-100">1. Health:</strong> Every player starts with <span className="text-amber-400 font-bold">4 Defibrillator Charges</span>.
              </p>
              <p>
                <strong className="text-stone-100">2. Secret Chamber:</strong> Each round, the dealer reveals the count of <span className="text-red-400 font-bold">Live</span> and <span className="text-stone-400 font-bold">Blank</span> shells. The exact sequence is hidden!
              </p>
              <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 space-y-1.5 font-mono text-xs">
                <div className="text-stone-200 font-semibold border-b border-stone-800 pb-1">⚡ Shooting Rules:</div>
                <div className="text-emerald-400">• Shoot Self + Blank ➜ <span className="text-stone-200">No damage, Turn CONTINUES!</span></div>
                <div className="text-red-400">• Shoot Self + Live ➜ <span className="text-stone-200">Take 1-2 damage, Turn ends.</span></div>
                <div className="text-stone-400">• Shoot Opponent + Blank ➜ <span className="text-stone-200">No damage, Turn ends.</span></div>
                <div className="text-red-400">• Shoot Opponent + Live ➜ <span className="text-stone-200">Target takes 1-2 damage, Turn ends.</span></div>
              </div>
              <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 space-y-1 text-xs">
                <div className="text-amber-400 font-bold uppercase mb-1">🎒 Item Arsenal (Max 5 Slots):</div>
                <div className="text-stone-300">• 🔍 Magnifying Glass: Inspect current shell secretly.</div>
                <div className="text-stone-300">• 📞 Burner Phone: Receive encrypted info on a future shell.</div>
                <div className="text-stone-300">• 🚬 Cigarettes: Restore +1 Health charge.</div>
                <div className="text-stone-300">• 🍺 Beer: Eject current chamber shell without firing.</div>
                <div className="text-stone-300">• 🪚 Hand Saw: Next LIVE shell deals double (2x) damage!</div>
                <div className="text-stone-300">• 🔗 Handcuffs: Force target player to skip their next turn.</div>
                <div className="text-stone-300">• ⚡ Inverter: Invert current shell polarity (Live ⇄ Blank).</div>
              </div>
            </div>
            <button
              id="btn-got-it"
              onClick={() => setShowRules(false)}
              className="w-full py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-bold font-mono uppercase tracking-wider cursor-pointer"
            >
              Enter the Underground
            </button>
          </div>
        </div>
      )}

      {/* Main Landing Card */}
      <div className="bg-stone-900/95 border-2 border-stone-800 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black text-stone-100 space-y-6">
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-red-950/80 text-red-400 border border-red-800/60 mb-2">
            <Flame className="w-3.5 h-3.5 text-red-500" />
            2-8 Players Real-Time Underground Table
          </div>
          <h2 className="text-2xl sm:text-3xl font-black font-mono tracking-wider text-stone-100">
            ENTER THE TABLE
          </h2>
          <p className="text-xs sm:text-sm text-stone-400 max-w-sm mx-auto font-mono">
            High-stakes tactical multiplayer roulette with custom item inventories.
          </p>
        </div>

        {/* Profile / Nickname Setup */}
        <div className="space-y-3 bg-stone-950/80 p-4 rounded-2xl border border-stone-800/80">
          <div>
            <label htmlFor="input-player-name" className="block text-xs font-mono font-bold text-stone-300 uppercase tracking-wider mb-1.5">
              Player Alias
            </label>
            <input
              id="input-player-name"
              type="text"
              maxLength={16}
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Enter your alias (e.g., Maverick)"
              className="w-full px-3.5 py-2.5 bg-stone-900 border border-stone-700 rounded-xl text-stone-100 placeholder-stone-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 text-sm font-mono font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-bold text-stone-400 uppercase tracking-wider mb-2">
              Avatar Color
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {AVATAR_COLORS.map((col) => (
                <button
                  key={col}
                  id={`color-opt-${col.replace('#', '')}`}
                  type="button"
                  onClick={() => setSelectedColor(col)}
                  className={`w-8 h-8 rounded-xl transition-transform cursor-pointer ${
                    selectedColor === col ? "ring-2 ring-white scale-110 shadow-lg" : "opacity-75 hover:opacity-100"
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
          <div className="p-4 bg-stone-950/80 rounded-2xl border border-stone-800 flex flex-col justify-between space-y-4">
            <div>
              <h3 className="font-mono font-bold text-stone-200 text-sm">Host a Table</h3>
              <p className="text-xs text-stone-400 mt-0.5 font-mono">Create an underground room & deal shells.</p>
            </div>
            <button
              id="btn-create-room"
              onClick={handleCreate}
              disabled={!name.trim()}
              className={`w-full py-2.5 px-4 rounded-xl font-mono font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                name.trim()
                  ? "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-950/80 active:scale-98"
                  : "bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700"
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Create Table</span>
            </button>
          </div>

          {/* Join Card */}
          <div className="p-4 bg-stone-950/80 rounded-2xl border border-stone-800 flex flex-col justify-between space-y-4">
            <div>
              <h3 className="font-mono font-bold text-stone-200 text-sm">Join Table</h3>
              <p className="text-xs text-stone-400 mt-0.5 font-mono">Enter a 4-letter table code.</p>
            </div>
            <div className="space-y-2">
              <input
                id="input-join-code"
                type="text"
                maxLength={4}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ROOM CODE"
                className="w-full text-center tracking-widest uppercase font-mono px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-stone-100 placeholder-stone-600 focus:outline-none focus:border-cyan-500 text-sm font-bold"
              />
              <button
                id="btn-join-room"
                onClick={handleJoin}
                disabled={!name.trim() || !joinCode.trim()}
                className={`w-full py-2 px-4 rounded-xl font-mono font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  name.trim() && joinCode.trim()
                    ? "bg-stone-800 hover:bg-stone-700 text-cyan-400 border border-cyan-500/40 shadow-lg active:scale-98"
                    : "bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Join Table</span>
              </button>
            </div>
          </div>
        </div>

        {/* Rules button in footer */}
        <div className="text-center pt-2">
          <button
            id="btn-open-rules-landing"
            onClick={() => setShowRules(true)}
            className="text-xs font-mono text-stone-400 hover:text-red-400 underline underline-offset-4 transition-colors cursor-pointer"
          >
            How does Buckshot Roulette work? View Rules & Item Dossier
          </button>
        </div>
      </div>
    </div>
  );
};


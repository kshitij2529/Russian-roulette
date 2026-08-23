import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { PublicRoomState } from "./types";
import { LobbyView } from "./components/LobbyView";
import { GameBoard } from "./components/GameBoard";
import { CodeViewerModal } from "./components/CodeViewerModal";
import { sound } from "./utils/audio";
import { Shield, Volume2, VolumeX, Code2, AlertTriangle } from "lucide-react";

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [roomState, setRoomState] = useState<PublicRoomState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCodeViewer, setShowCodeViewer] = useState<boolean>(false);
  const [muted, setMuted] = useState<boolean>(false);

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Connect to current host
    const socketInstance = io({
      transports: ["websocket", "polling"],
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance);

    socketInstance.on("connect", () => {
      setConnected(true);
      setMyPlayerId(socketInstance.id || null);
    });

    socketInstance.on("disconnect", () => {
      setConnected(false);
    });

    socketInstance.on("room:created", ({ playerId }: { roomCode: string; playerId: string }) => {
      setMyPlayerId(playerId);
      setErrorMessage(null);
    });

    socketInstance.on("room:joined", ({ playerId }: { roomCode: string; playerId: string }) => {
      setMyPlayerId(playerId);
      setErrorMessage(null);
    });

    socketInstance.on("room:state", (state: PublicRoomState) => {
      setRoomState(state);
      setErrorMessage(null);
    });

    socketInstance.on("error:message", (data: { message: string }) => {
      setErrorMessage(data.message);
      sound.playDamage();
      setTimeout(() => setErrorMessage(null), 4000);
    });

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const handleCreateRoom = (playerName: string, avatarColor: string) => {
    if (!socket) return;
    socket.emit("room:create", { playerName, avatarColor });
  };

  const handleJoinRoom = (roomCode: string, playerName: string, avatarColor: string) => {
    if (!socket) return;
    socket.emit("room:join", { roomCode, playerName, avatarColor });
  };

  const handleStartGame = () => {
    if (!socket) return;
    socket.emit("room:start");
  };

  const handleGameAction = (action: "shoot_self" | "shoot_target", targetId?: string) => {
    if (!socket) return;
    socket.emit("game:action", { action, targetId });
  };

  const handlePlayAgain = () => {
    if (!socket) return;
    socket.emit("room:play_again");
  };

  const handleLeaveRoom = () => {
    if (socket) {
      socket.disconnect();
      socket.connect();
    }
    setRoomState(null);
    setMyPlayerId(socket?.id || null);
  };

  const toggleSound = () => {
    const next = !muted;
    setMuted(next);
    sound.setMuted(next);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Application Header */}
      <header className="border-b border-neutral-800/80 bg-neutral-950/90 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center font-black text-neutral-950 shadow-md shadow-amber-500/20">
              <Shield className="w-4 h-4 fill-current text-neutral-950" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-wider text-neutral-100 font-mono flex items-center gap-2">
                <span>BUCKSHOT ROULETTE</span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                  MULTIPLAYER
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Connection Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-[11px] font-mono">
              <span
                className={`w-2 h-2 rounded-full ${
                  connected ? "bg-emerald-400" : "bg-red-500 animate-ping"
                }`}
              />
              <span className={connected ? "text-emerald-400" : "text-red-400"}>
                {connected ? "Server Authoritative" : "Connecting..."}
              </span>
            </div>

            {/* Standalone Code Modal Button */}
            <button
              id="btn-open-code-viewer"
              onClick={() => setShowCodeViewer(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-lg border border-neutral-800 transition-colors"
              title="View standalone Node.js Express server.js and client code"
            >
              <Code2 className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden md:inline">Source Code</span>
            </button>

            {/* Audio Mute Toggle */}
            <button
              id="btn-top-sound"
              onClick={toggleSound}
              className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
              title={muted ? "Unmute" : "Mute"}
            >
              {muted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Game Arena / Body */}
      <main className="flex-1 flex flex-col justify-center px-4 py-6 sm:py-10 max-w-6xl w-full mx-auto">
        {/* Error Toast */}
        {errorMessage && (
          <div className="max-w-md mx-auto mb-6 p-3 rounded-xl bg-red-950/90 border border-red-500/60 text-red-200 text-xs sm:text-sm font-medium flex items-center gap-2.5 shadow-xl animate-in fade-in slide-in-from-top-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* View Switcher: Lobby vs Active Game Board */}
        {!roomState || roomState.status === "lobby" ? (
          <LobbyView
            roomState={roomState}
            myPlayerId={myPlayerId}
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            onStartGame={handleStartGame}
            onLeaveRoom={handleLeaveRoom}
          />
        ) : (
          <GameBoard
            roomState={roomState}
            myPlayerId={myPlayerId}
            onAction={handleGameAction}
            onPlayAgain={handlePlayAgain}
            onLeaveRoom={handleLeaveRoom}
          />
        )}
      </main>

      {/* Standalone Code Viewer Modal */}
      {showCodeViewer && (
        <CodeViewerModal onClose={() => setShowCodeViewer(false)} />
      )}

      {/* Footer info */}
      <footer className="py-4 border-t border-neutral-900 text-center text-xs text-neutral-400 font-mono">
        Buckshot Roulette Multiplayer • 2 to 8 Players Real-Time Table • Authoritative Node.js Server
      </footer>
    </div>
  );
}

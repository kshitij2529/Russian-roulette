import React, { useState } from "react";
import { Copy, Check, Code, FileText } from "lucide-react";

interface CodeViewerModalProps {
  onClose: () => void;
}

export const CodeViewerModal: React.FC<CodeViewerModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<"package.json" | "server.js" | "index.html" | "client.js">("server.js");
  const [copied, setCopied] = useState<boolean>(false);

  const files = {
    "package.json": `{
  "name": "buckshot-roulette-multiplayer",
  "version": "1.0.0",
  "description": "Real-time multiplayer Russian roulette party game for 2-8 players",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.21.2",
    "socket.io": "^4.8.1"
  }
}`,

    "server.js": `const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
app.use(express.static(path.join(__dirname, 'public')));

// In-memory room storage
const rooms = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function generateShells(round = 1) {
  const liveCount = Math.floor(Math.random() * 2) + 1; // 1-2 Live
  const blankCount = Math.floor(Math.random() * 2) + 2; // 2-3 Blank
  const shells = [
    ...Array(liveCount).fill('live'),
    ...Array(blankCount).fill('blank')
  ];
  // Shuffle shells
  for (let i = shells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shells[i], shells[j]] = [shells[j], shells[i]];
  }
  return { shells, liveCount, blankCount };
}

function getPublicState(room) {
  return {
    code: room.code,
    hostId: room.hostId,
    status: room.status,
    players: Array.from(room.players.values()),
    currentTurnPlayerId: room.currentTurnPlayerId,
    chamberInfo: { ...room.chamberInfo },
    roundNumber: room.roundNumber,
    winner: room.winner,
    logs: room.logs.slice(-20),
    lastOutcome: room.lastOutcome
  };
}

function getNextAlivePlayer(room, currentId) {
  const alive = room.turnOrder.map(id => room.players.get(id)).filter(p => p && p.isAlive);
  if (alive.length <= 1) return alive[0] ? alive[0].id : null;
  const currIdx = room.turnOrder.indexOf(currentId);
  for (let i = 1; i <= room.turnOrder.length; i++) {
    const nextIdx = (currIdx + i) % room.turnOrder.length;
    const candidate = room.players.get(room.turnOrder[nextIdx]);
    if (candidate && candidate.isAlive) return candidate.id;
  }
  return alive[0].id;
}

function checkWin(room) {
  const alive = Array.from(room.players.values()).filter(p => p.isAlive);
  if (alive.length <= 1) {
    room.status = 'game_over';
    room.winner = alive.length === 1 ? alive[0] : null;
    room.currentTurnPlayerId = null;
    return true;
  }
  return false;
}

function reloadChamber(room) {
  room.roundNumber += 1;
  const load = generateShells(room.roundNumber);
  room.secretChamber = load.shells;
  room.chamberInfo = {
    liveCount: load.liveCount,
    blankCount: load.blankCount,
    totalShells: load.shells.length,
    remainingShells: load.shells.length
  };
  room.logs.push({
    id: Date.now().toString(),
    text: \`🔄 Chamber reloaded: [\${load.liveCount} Live, \${load.blankCount} Blank shells].\`,
    type: 'reload'
  });
}

io.on('connection', (socket) => {
  let currentRoom = null;

  socket.on('room:create', ({ playerName }) => {
    const code = generateRoomCode();
    const player = {
      id: socket.id,
      name: playerName || 'Host',
      health: 4,
      isAlive: true,
      isHost: true
    };
    const room = {
      code,
      hostId: socket.id,
      status: 'lobby',
      players: new Map([[socket.id, player]]),
      turnOrder: [socket.id],
      currentTurnPlayerId: null,
      chamberInfo: { liveCount: 0, blankCount: 0, totalShells: 0, remainingShells: 0 },
      secretChamber: [],
      roundNumber: 1,
      winner: null,
      logs: [{ id: Date.now().toString(), text: \`\${player.name} created Room \${code}\`, type: 'info' }],
      lastOutcome: null
    };
    rooms.set(code, room);
    currentRoom = code;
    socket.join(code);
    socket.emit('room:created', { roomCode: code, playerId: socket.id });
    io.to(code).emit('room:state', getPublicState(room));
  });

  socket.on('room:join', ({ roomCode, playerName }) => {
    const code = (roomCode || '').toUpperCase().trim();
    const room = rooms.get(code);
    if (!room || room.status !== 'lobby') {
      socket.emit('error:msg', 'Room not found or game already in progress.');
      return;
    }
    const player = {
      id: socket.id,
      name: playerName || 'Player',
      health: 4,
      isAlive: true,
      isHost: false
    };
    room.players.set(socket.id, player);
    room.turnOrder.push(socket.id);
    currentRoom = code;
    socket.join(code);
    room.logs.push({ id: Date.now().toString(), text: \`\${player.name} joined the room.\`, type: 'join' });
    socket.emit('room:joined', { roomCode: code, playerId: socket.id });
    io.to(code).emit('room:state', getPublicState(room));
  });

  socket.on('room:start', () => {
    const room = rooms.get(currentRoom);
    if (!room || room.hostId !== socket.id || room.players.size < 2) return;
    room.status = 'playing';
    room.currentTurnPlayerId = room.turnOrder[0];
    reloadChamber(room);
    io.to(currentRoom).emit('room:state', getPublicState(room));
  });

  socket.on('game:action', ({ action, targetId }) => {
    const room = rooms.get(currentRoom);
    if (!room || room.status !== 'playing' || room.currentTurnPlayerId !== socket.id) return;

    if (room.secretChamber.length === 0) reloadChamber(room);
    const shell = room.secretChamber.shift();
    room.chamberInfo.remainingShells = room.secretChamber.length;

    const shooter = room.players.get(socket.id);
    const isSelf = action === 'shoot_self';
    const target = isSelf ? shooter : room.players.get(targetId);
    if (!target || !target.isAlive) return;

    const isLive = shell === 'live';
    const damage = isLive ? 1 : 0;
    let nextId = shooter.id;

    if (isSelf) {
      if (isLive) {
        target.health -= 1;
        if (target.health <= 0) target.isAlive = false;
        nextId = getNextAlivePlayer(room, shooter.id);
      } else {
        // Blank on self = Keep turn!
        nextId = shooter.id;
      }
    } else {
      if (isLive) {
        target.health -= 1;
        if (target.health <= 0) target.isAlive = false;
      }
      nextId = getNextAlivePlayer(room, shooter.id);
    }

    const outcome = {
      action,
      shooterName: shooter.name,
      targetName: target.name,
      shellType: shell,
      damage,
      isSelf,
      message: isLive 
        ? \`💥 BANG! Live shell hit \${target.name} for 1 damage!\` 
        : \`💨 CLICK! Blank round. \${isSelf ? shooter.name + ' keeps turn!' : 'Turn passes.'}\`
    };

    room.lastOutcome = outcome;
    room.logs.push({ id: Date.now().toString(), text: outcome.message, type: isLive ? 'live' : 'blank' });

    if (!checkWin(room)) {
      if (room.secretChamber.length === 0) reloadChamber(room);
      room.currentTurnPlayerId = nextId;
    }

    io.to(currentRoom).emit('room:state', getPublicState(room));
  });

  socket.on('disconnect', () => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    room.players.delete(socket.id);
    room.turnOrder = room.turnOrder.filter(id => id !== socket.id);
    if (room.players.size === 0) {
      rooms.delete(currentRoom);
      return;
    }
    if (room.status === 'playing' && room.currentTurnPlayerId === socket.id) {
      room.currentTurnPlayerId = getNextAlivePlayer(room, null);
      checkWin(room);
    }
    io.to(currentRoom).emit('room:state', getPublicState(room));
  });
});

server.listen(PORT, () => {
  console.log(\`Buckshot Roulette Server running on port \${PORT}\`);
});`,

    "index.html": `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Buckshot Roulette Multiplayer</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="/socket.io/socket.io.js"></script>
</head>
<body class="bg-neutral-950 text-neutral-100 min-h-screen p-4 font-sans antialiased">
  <div class="max-w-4xl mx-auto space-y-6">
    <header class="text-center py-4 border-b border-neutral-800">
      <h1 class="text-3xl font-black text-amber-500 tracking-wider">BUCKSHOT ROULETTE</h1>
      <p class="text-xs text-neutral-400">Multiplayer Russian Roulette (2-8 Players)</p>
    </header>

    <!-- Lobby Screen -->
    <div id="lobby-screen" class="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl max-w-md mx-auto space-y-4">
      <div>
        <label class="block text-xs uppercase font-bold text-neutral-400 mb-1">Nickname</label>
        <input id="player-name" type="text" placeholder="Enter nickname" class="w-full p-2.5 bg-neutral-950 border border-neutral-700 rounded-lg text-white font-medium" />
      </div>
      <button id="btn-create" class="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-lg uppercase">Create Room</button>
      <div class="flex gap-2">
        <input id="room-code-input" type="text" placeholder="Room Code" class="w-full p-2.5 uppercase text-center font-mono font-bold bg-neutral-950 border border-neutral-700 rounded-lg" />
        <button id="btn-join" class="px-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg uppercase">Join</button>
      </div>
    </div>

    <!-- Active Room Container -->
    <div id="game-screen" class="hidden space-y-6">
      <div class="flex justify-between items-center bg-neutral-900 p-4 rounded-xl border border-neutral-800">
        <div>
          <span class="text-xs text-amber-500 font-mono font-bold">ROOM CODE: <span id="display-room-code" class="text-white text-lg"></span></span>
          <div id="chamber-status" class="text-xs text-neutral-400 font-mono mt-1">Loading chamber...</div>
        </div>
        <button id="btn-start-game" class="hidden px-6 py-2.5 bg-amber-500 text-neutral-950 font-bold rounded-lg uppercase">Start Game</button>
      </div>

      <!-- Turn Banner -->
      <div id="turn-banner" class="text-center text-lg font-bold font-mono py-2 px-4 rounded-xl bg-neutral-900 border border-neutral-800"></div>

      <!-- Players List -->
      <div id="players-grid" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3"></div>

      <!-- Action Controls -->
      <div id="action-controls" class="hidden flex gap-4 justify-center">
        <button id="btn-shoot-self" class="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-xl font-bold uppercase">Shoot Self</button>
        <button id="btn-shoot-other" class="px-6 py-3 bg-red-600 hover:bg-red-500 rounded-xl font-bold uppercase">Shoot Target</button>
      </div>

      <!-- Game Logs -->
      <div class="bg-neutral-900 border border-neutral-800 p-4 rounded-xl">
        <h3 class="text-xs font-mono font-bold text-neutral-400 mb-2">EVENT LOG</h3>
        <div id="log-feed" class="max-h-32 overflow-y-auto space-y-1 text-xs font-mono text-neutral-300"></div>
      </div>
    </div>
  </div>
  <script src="/client.js"></script>
</body>
</html>`,

    "client.js": `const socket = io();
let myPlayerId = null;
let currentRoomState = null;
let selectedTargetId = null;

const lobbyScreen = document.getElementById('lobby-screen');
const gameScreen = document.getElementById('game-screen');
const nameInput = document.getElementById('player-name');
const codeInput = document.getElementById('room-code-input');
const btnCreate = document.getElementById('btn-create');
const btnJoin = document.getElementById('btn-join');
const btnStart = document.getElementById('btn-start-game');
const roomCodeDisplay = document.getElementById('display-room-code');
const chamberStatus = document.getElementById('chamber-status');
const turnBanner = document.getElementById('turn-banner');
const playersGrid = document.getElementById('players-grid');
const actionControls = document.getElementById('action-controls');
const btnShootSelf = document.getElementById('btn-shoot-self');
const btnShootOther = document.getElementById('btn-shoot-other');
const logFeed = document.getElementById('log-feed');

btnCreate.onclick = () => {
  const name = nameInput.value.trim() || 'Player';
  socket.emit('room:create', { playerName: name });
};

btnJoin.onclick = () => {
  const name = nameInput.value.trim() || 'Player';
  const code = codeInput.value.trim().toUpperCase();
  if (code) socket.emit('room:join', { roomCode: code, playerName: name });
};

btnStart.onclick = () => socket.emit('room:start');

btnShootSelf.onclick = () => {
  socket.emit('game:action', { action: 'shoot_self' });
};

btnShootOther.onclick = () => {
  if (selectedTargetId) {
    socket.emit('game:action', { action: 'shoot_target', targetId: selectedTargetId });
  } else {
    alert('Please select a target player from the list first!');
  }
};

socket.on('room:created', ({ playerId }) => { myPlayerId = playerId; });
socket.on('room:joined', ({ playerId }) => { myPlayerId = playerId; });
socket.on('error:msg', (msg) => alert(msg));

socket.on('room:state', (state) => {
  currentRoomState = state;
  lobbyScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');

  roomCodeDisplay.textContent = state.code;
  chamberStatus.textContent = \`Chamber: \${state.chamberInfo.liveCount} Live, \${state.chamberInfo.blankCount} Blank (\${state.chamberInfo.remainingShells} shells left)\`;

  const isHost = state.hostId === myPlayerId;
  btnStart.classList.toggle('hidden', !(isHost && state.status === 'lobby' && state.players.length >= 2));

  const isMyTurn = state.status === 'playing' && state.currentTurnPlayerId === myPlayerId;
  actionControls.classList.toggle('hidden', !isMyTurn);

  turnBanner.textContent = state.status === 'playing'
    ? (isMyTurn ? '👉 YOUR TURN TO SHOOT!' : \`Waiting for \${state.players.find(p => p.id === state.currentTurnPlayerId)?.name || 'opponent'}...\`)
    : (state.status === 'game_over' ? \`🏆 Winner: \${state.winner?.name || 'Nobody'}\` : 'In Lobby');

  // Render players
  playersGrid.innerHTML = '';
  state.players.forEach((player) => {
    const isTurn = player.id === state.currentTurnPlayerId;
    const card = document.createElement('div');
    card.className = \`p-4 rounded-xl border \${isTurn ? 'border-amber-500 bg-amber-950/30' : 'border-neutral-800 bg-neutral-900'} \${!player.isAlive ? 'opacity-50' : 'cursor-pointer'}\`;
    card.innerHTML = \`
      <div class="font-bold">\${player.name} \${player.id === myPlayerId ? '(You)' : ''}</div>
      <div class="text-xs font-mono text-amber-400 mt-1">Health: \${'⚡'.repeat(player.health) || 'DEAD'}</div>
    \`;
    if (player.id !== myPlayerId && player.isAlive) {
      card.onclick = () => {
        selectedTargetId = player.id;
        document.querySelectorAll('#players-grid > div').forEach(c => c.classList.remove('ring-2', 'ring-red-500'));
        card.classList.add('ring-2', 'ring-red-500');
      };
    }
    playersGrid.appendChild(card);
  });

  // Render logs
  logFeed.innerHTML = state.logs.slice().reverse().map(l => \`<div>\${l.text}</div>\`).join('');
});`
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(files[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-4xl w-full h-[85vh] flex flex-col shadow-2xl text-neutral-100 overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60">
          <div className="flex items-center gap-2">
            <Code className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="font-bold text-sm text-neutral-100">Standalone Project Files</h3>
              <p className="text-xs text-neutral-400">Complete Node.js / Express / Socket.io vanilla source files</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-copy-standalone-code"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-neutral-800 hover:bg-neutral-700 rounded-lg border border-neutral-700 text-neutral-200 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied!" : "Copy File"}</span>
            </button>
            <button
              id="btn-close-code-modal"
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-neutral-800 bg-neutral-950/40 px-4">
          {(["package.json", "server.js", "index.html", "client.js"] as const).map((tab) => (
            <button
              key={tab}
              id={`tab-file-${tab.replace('.', '-')}`}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-xs font-mono font-medium border-b-2 flex items-center gap-1.5 transition-colors ${
                activeTab === tab
                  ? "border-amber-500 text-amber-400 bg-neutral-900/60"
                  : "border-transparent text-neutral-400 hover:text-neutral-200"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{tab}</span>
            </button>
          ))}
        </div>

        {/* Code Content View */}
        <div className="flex-1 p-4 bg-neutral-950 overflow-auto">
          <pre className="text-xs font-mono text-neutral-300 leading-relaxed whitespace-pre-wrap">
            {files[activeTab]}
          </pre>
        </div>
      </div>
    </div>
  );
};

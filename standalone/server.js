import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// Bind dynamically to process.env.PORT provided by Cloud Run, falling back to 3000
const PORT = process.env.PORT || 3000;
const publicPath = path.join(__dirname, 'public');

// Serve static assets from public/
app.use(express.static(publicPath));

// Health check endpoint for Cloud Run container probes
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Fallback route to serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// In-memory room store
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
  const liveCount = Math.floor(Math.random() * 2) + 1; // 1-2 Live shells
  const blankCount = Math.floor(Math.random() * 2) + 2; // 2-3 Blank shells
  const shells = [
    ...Array(liveCount).fill('live'),
    ...Array(blankCount).fill('blank')
  ];
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
    logs: room.logs.slice(-25),
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
    text: `🔄 Chamber reloaded: [${load.liveCount} Live, ${load.blankCount} Blank shells].`,
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
      logs: [{ id: Date.now().toString(), text: `${player.name} created Room ${code}`, type: 'info' }],
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
      socket.emit('error:msg', 'Room not found or game already started.');
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
    room.logs.push({ id: Date.now().toString(), text: `${player.name} joined the room.`, type: 'join' });
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
        // Blank on self: shooter keeps turn
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
        ? `💥 BANG! Live shell hit ${target.name} for 1 damage!` 
        : `💨 CLICK! Blank round. ${isSelf ? shooter.name + ' keeps turn!' : 'Turn passes.'}`
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

// STRICT REQUIREMENT: MUST listen on 0.0.0.0 and process.env.PORT for Cloud Run
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Buckshot Roulette Server running on http://0.0.0.0:${PORT}`);
});

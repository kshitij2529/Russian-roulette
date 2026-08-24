import express from "express";
import http from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import {
  ActionOutcome,
  GameLogEntry,
  ItemType,
  Player,
  PrivateItemResult,
  PublicRoomState,
  ServerRoom,
  ShellType,
} from "./src/types.js";

// In CommonJS / bundled Node, __dirname and __filename are built-in:
const currentDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();

const PORT = Number(process.env.PORT) || 3000;
const app = express();
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(express.json());

// In-memory room store
const rooms = new Map<string, ServerRoom>();

const ALL_ITEM_TYPES: ItemType[] = [
  "magnifying_glass",
  "burner_phone",
  "cigarettes",
  "beer",
  "handsaw",
  "handcuffs",
  "inverter",
];

// Helper: generate 4-character uppercase room code
function generateRoomCode(): string {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

// Helper: generate random loadout of Live and Blank shells (2 to 8 shells total)
function generateShells(roundNum: number = 1): { shells: ShellType[]; liveCount: number; blankCount: number } {
  let liveCount: number;
  let blankCount: number;

  if (roundNum === 1) {
    // Round 1: 3-5 shells
    liveCount = Math.floor(Math.random() * 2) + 1; // 1-2
    blankCount = Math.floor(Math.random() * 2) + 2; // 2-3
  } else if (roundNum === 2) {
    // Round 2: 4-6 shells
    liveCount = Math.floor(Math.random() * 3) + 2; // 2-4
    blankCount = Math.floor(Math.random() * 3) + 2; // 2-4
  } else {
    // Round 3+: 5-8 shells
    liveCount = Math.floor(Math.random() * 3) + 2; // 2-4
    blankCount = Math.floor(Math.random() * 3) + 2; // 2-4
  }

  // Ensure between 2 and 8 total
  const total = liveCount + blankCount;
  if (total > 8) {
    blankCount = 8 - liveCount;
  }
  if (total < 3) {
    blankCount += 1;
  }

  const shells: ShellType[] = [
    ...Array(liveCount).fill("live"),
    ...Array(blankCount).fill("blank"),
  ];

  // Fisher-Yates shuffle
  for (let i = shells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shells[i], shells[j]] = [shells[j], shells[i]];
  }

  return { shells, liveCount, blankCount };
}

// Helper: Distribute scaled items to alive players based on player count
function distributeItemsToPlayers(room: ServerRoom) {
  const alivePlayers = Array.from(room.players.values()).filter((p) => p.isAlive && !p.isSpectator);
  const totalAlive = alivePlayers.length;
  if (totalAlive === 0) return;

  // Item scaling setup:
  // 2-3 Players: 3 items each
  // 4-5 Players: 4 items each
  // 6-8 Players: 5 items each
  let itemsToGrant = 3;
  if (totalAlive >= 6) {
    itemsToGrant = 5;
  } else if (totalAlive >= 4) {
    itemsToGrant = 4;
  }

  alivePlayers.forEach((player) => {
    // Guaranteed Loadout: 1 Information item, 1 Survival item
    const infoItem: ItemType = Math.random() < 0.5 ? "magnifying_glass" : "burner_phone";
    const survivalItem: ItemType = "cigarettes";

    const newItems: ItemType[] = [infoItem, survivalItem];

    // Remaining slots randomly from full pool
    const remainingSlots = itemsToGrant - 2;
    for (let i = 0; i < remainingSlots; i++) {
      const randomItem = ALL_ITEM_TYPES[Math.floor(Math.random() * ALL_ITEM_TYPES.length)];
      newItems.push(randomItem);
    }

    // Add items up to max 5 items cap per player
    for (const it of newItems) {
      if (player.items.length < 5) {
        player.items.push(it);
      }
    }
  });

  addRoomLog(
    room,
    `📦 Industrial item crates opened! Each alive player received ${itemsToGrant} items (Max 5 held).`,
    "item"
  );
}

// Convert ServerRoom to safe PublicRoomState (omitting secretChamber)
function getPublicRoomState(room: ServerRoom): PublicRoomState {
  return {
    code: room.code,
    hostId: room.hostId,
    status: room.status,
    players: Array.from(room.players.values()),
    turnOrder: room.turnOrder,
    currentTurnIndex: room.currentTurnIndex,
    currentTurnPlayerId: room.currentTurnPlayerId,
    chamberInfo: { ...room.chamberInfo },
    roundNumber: room.roundNumber,
    winner: room.winner,
    logs: room.logs.slice(-30), // Keep last 30 logs
    lastOutcome: room.lastOutcome,
    isSawedOff: room.isSawedOff,
  };
}

function addRoomLog(
  room: ServerRoom,
  text: string,
  type: GameLogEntry["type"] = "info"
) {
  const entry: GameLogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    timestamp: Date.now(),
    text,
    type,
  };
  room.logs.push(entry);
}

function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

// Turn resolution with Handcuffs skipping check
function getNextAlivePlayerId(room: ServerRoom, currentId: string | null): string | null {
  const alivePlayers = room.turnOrder
    .map((id) => room.players.get(id))
    .filter((p): p is Player => !!p && p.isAlive);

  if (alivePlayers.length === 0) return null;
  if (alivePlayers.length === 1) return alivePlayers[0].id;

  if (!currentId) return alivePlayers[0].id;

  const currentIndex = room.turnOrder.indexOf(currentId);
  const totalSlots = room.turnOrder.length;

  for (let offset = 1; offset <= totalSlots * 2; offset++) {
    const checkIndex = (currentIndex + offset) % totalSlots;
    const candidateId = room.turnOrder[checkIndex];
    const candidate = room.players.get(candidateId);
    if (candidate && candidate.isAlive) {
      if (candidate.isHandcuffed) {
        // Handcuff wears off and forces player to skip turn!
        candidate.isHandcuffed = false;
        addRoomLog(
          room,
          `⛓️ ${candidate.name} is trapped in Handcuffs and forced to skip their turn!`,
          "item"
        );
        continue;
      }
      room.currentTurnIndex = checkIndex;
      return candidate.id;
    }
  }

  return alivePlayers[0].id;
}

// Check win condition
function checkGameStatus(room: ServerRoom): boolean {
  const alivePlayers = Array.from(room.players.values()).filter((p) => p.isAlive && !p.isSpectator);

  if (alivePlayers.length <= 1) {
    room.status = "game_over";
    room.winner = alivePlayers.length === 1 ? alivePlayers[0] : null;
    room.currentTurnPlayerId = null;
    room.isSawedOff = false;

    if (room.winner) {
      addRoomLog(room, `🏆 ${room.winner.name} is the sole survivor and wins the underground showdown!`, "victory");
    } else {
      addRoomLog(room, "☠️ All players have fallen. No survivors at the table.", "elimination");
    }
    return true;
  }
  return false;
}

// Reload the shotgun chamber & grant items
function reloadChamber(room: ServerRoom) {
  room.roundNumber += 1;
  room.isSawedOff = false;
  const load = generateShells(room.roundNumber);
  room.secretChamber = load.shells;
  room.chamberInfo = {
    liveCount: load.liveCount,
    blankCount: load.blankCount,
    totalShells: load.shells.length,
    remainingShells: load.shells.length,
  };

  addRoomLog(
    room,
    `🔄 Chamber reloaded for Round ${room.roundNumber}: [${load.liveCount} Live, ${load.blankCount} Blank shells].`,
    "reload"
  );

  // Distribute items for this round
  distributeItemsToPlayers(room);
}

// API Health Check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    activeRooms: rooms.size,
    timestamp: new Date().toISOString(),
  });
});

// Socket.io Game Events
io.on("connection", (socket: Socket) => {
  let currentRoomCode: string | null = null;
  let currentPlayerId: string | null = null;

  // Create Room
  socket.on("room:create", (data: { playerName: string; avatarColor?: string }) => {
    const name = (data.playerName || "Player").trim().slice(0, 16) || "Player";
    const avatarColor = data.avatarColor || "#f59e0b";
    const roomCode = generateRoomCode();
    const playerId = socket.id;

    const hostPlayer: Player = {
      id: playerId,
      socketId: socket.id,
      name,
      avatarColor,
      health: 4,
      maxHealth: 4,
      isAlive: true,
      isHost: true,
      isSpectator: false,
      shotsFired: 0,
      damageTaken: 0,
      items: [],
      isHandcuffed: false,
    };

    const newRoom: ServerRoom = {
      code: roomCode,
      hostId: playerId,
      status: "lobby",
      players: new Map([[playerId, hostPlayer]]),
      turnOrder: [playerId],
      currentTurnIndex: 0,
      currentTurnPlayerId: null,
      chamberInfo: {
        liveCount: 0,
        blankCount: 0,
        totalShells: 0,
        remainingShells: 0,
      },
      secretChamber: [],
      roundNumber: 1,
      winner: null,
      logs: [],
      lastOutcome: null,
      isSawedOff: false,
    };

    rooms.set(roomCode, newRoom);
    currentRoomCode = roomCode;
    currentPlayerId = playerId;

    socket.join(roomCode);
    addRoomLog(newRoom, `${name} entered the underground table (Room ${roomCode}).`, "join");

    socket.emit("room:created", { roomCode, playerId });
    io.to(roomCode).emit("room:state", getPublicRoomState(newRoom));
  });

  // Join Room
  socket.on("room:join", (data: { roomCode: string; playerName: string; avatarColor?: string }) => {
    const code = (data.roomCode || "").toUpperCase().trim();
    const name = (data.playerName || "Player").trim().slice(0, 16) || "Player";
    const avatarColor = data.avatarColor || "#3b82f6";
    const playerId = socket.id;

    const room = rooms.get(code);
    if (!room) {
      socket.emit("error:message", { message: "Room not found. Please check the code." });
      return;
    }

    if (room.players.size >= 8) {
      socket.emit("error:message", { message: "Room is full (max 8 players)." });
      return;
    }

    if (room.status !== "lobby") {
      // Allow spectator join if game is in progress
      const spectatorPlayer: Player = {
        id: playerId,
        socketId: socket.id,
        name: `${name} (Spectator)`,
        avatarColor,
        health: 0,
        maxHealth: 4,
        isAlive: false,
        isHost: false,
        isSpectator: true,
        shotsFired: 0,
        damageTaken: 0,
        items: [],
        isHandcuffed: false,
      };

      room.players.set(playerId, spectatorPlayer);
      currentRoomCode = code;
      currentPlayerId = playerId;
      socket.join(code);

      addRoomLog(room, `${name} is spectating the table.`, "join");
      socket.emit("room:joined", { roomCode: code, playerId });
      io.to(code).emit("room:state", getPublicRoomState(room));
      return;
    }

    const newPlayer: Player = {
      id: playerId,
      socketId: socket.id,
      name,
      avatarColor,
      health: 4,
      maxHealth: 4,
      isAlive: true,
      isHost: room.players.size === 0,
      isSpectator: false,
      shotsFired: 0,
      damageTaken: 0,
      items: [],
      isHandcuffed: false,
    };

    room.players.set(playerId, newPlayer);
    room.turnOrder.push(playerId);
    currentRoomCode = code;
    currentPlayerId = playerId;

    socket.join(code);
    addRoomLog(room, `${name} pulled up a chair to the table.`, "join");

    socket.emit("room:joined", { roomCode: code, playerId });
    io.to(code).emit("room:state", getPublicRoomState(room));
  });

  // Start Game
  socket.on("room:start", () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    if (socket.id !== room.hostId) {
      socket.emit("error:message", { message: "Only the room host can start the game." });
      return;
    }

    const activePlayers = Array.from(room.players.values()).filter((p) => !p.isSpectator);
    if (activePlayers.length < 2) {
      socket.emit("error:message", { message: "At least 2 players are required to start." });
      return;
    }

    // Reset player healths, items, and stats for match
    room.turnOrder = [];
    room.players.forEach((p) => {
      p.health = 4;
      p.maxHealth = 4;
      p.isAlive = true;
      p.isSpectator = false;
      p.shotsFired = 0;
      p.damageTaken = 0;
      p.items = [];
      p.isHandcuffed = false;
      room.turnOrder.push(p.id);
    });

    // Shuffle turn order
    for (let i = room.turnOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [room.turnOrder[i], room.turnOrder[j]] = [room.turnOrder[j], room.turnOrder[i]];
    }

    room.status = "playing";
    room.roundNumber = 0;
    room.winner = null;
    room.lastOutcome = null;
    room.currentTurnIndex = 0;
    room.currentTurnPlayerId = room.turnOrder[0];
    room.isSawedOff = false;

    addRoomLog(room, "⚔️ The showdown begins! Everyone starts with 4 Health Charges.", "info");

    // Load first chamber and deal items
    reloadChamber(room);

    io.to(currentRoomCode).emit("room:state", getPublicRoomState(room));
  });

  // Use Item
  socket.on("game:item_use", (data: { itemType: ItemType; targetId?: string }) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.status !== "playing") return;

    if (socket.id !== room.currentTurnPlayerId) {
      socket.emit("error:message", { message: "You can only use items during your active turn!" });
      return;
    }

    const player = room.players.get(socket.id);
    if (!player || !player.isAlive) {
      socket.emit("error:message", { message: "You are not active in this game." });
      return;
    }

    // Check item ownership
    const itemIndex = player.items.indexOf(data.itemType);
    if (itemIndex === -1) {
      socket.emit("error:message", { message: "You do not have that item in your inventory!" });
      return;
    }

    // Ensure chamber has shells
    if (room.secretChamber.length === 0) {
      reloadChamber(room);
    }

    // Item Action Logic
    switch (data.itemType) {
      case "magnifying_glass": {
        const currentShell = room.secretChamber[0];
        const privateResult: PrivateItemResult = {
          id: `${Date.now()}-mag`,
          itemType: "magnifying_glass",
          title: "CHAMBER INSPECTED",
          message: `The current shell in the chamber is ${currentShell.toUpperCase()}.`,
          shellType: currentShell,
          shellPosition: 1,
        };
        socket.emit("item:private_result", privateResult);
        addRoomLog(room, `🔍 ${player.name} examined the chamber through a Magnifying Glass.`, "item");
        break;
      }

      case "burner_phone": {
        const chamberLen = room.secretChamber.length;
        let targetIndex = 0;
        let pos = 1;

        if (chamberLen > 1) {
          // Choose a future shell randomly (index 1 to chamberLen - 1)
          targetIndex = Math.floor(Math.random() * (chamberLen - 1)) + 1;
          pos = targetIndex + 1;
        }

        const revealedShell = room.secretChamber[targetIndex];
        const suffix = getOrdinalSuffix(pos);
        const privateResult: PrivateItemResult = {
          id: `${Date.now()}-phone`,
          itemType: "burner_phone",
          title: "ENCRYPTED INTEL",
          message:
            chamberLen === 1
              ? `Only 1 shell remains in the chamber: it is ${revealedShell.toUpperCase()}.`
              : `Dealer contact whispers: The ${pos}${suffix} shell in the chamber is ${revealedShell.toUpperCase()}.`,
          shellType: revealedShell,
          shellPosition: pos,
        };
        socket.emit("item:private_result", privateResult);
        addRoomLog(room, `📞 ${player.name} answered an encrypted call on a Burner Phone...`, "item");
        break;
      }

      case "cigarettes": {
        if (player.health >= player.maxHealth) {
          socket.emit("error:message", { message: "Your health is already at max (4 charges)!" });
          return;
        }
        player.health = Math.min(player.maxHealth, player.health + 1);
        addRoomLog(room, `🚬 ${player.name} smoked a Cigarette and recovered +1 Health charge.`, "item");
        break;
      }

      case "beer": {
        const ejectedShell = room.secretChamber.shift()!;
        room.chamberInfo.remainingShells = room.secretChamber.length;
        if (ejectedShell === "live") {
          room.chamberInfo.liveCount = Math.max(0, room.chamberInfo.liveCount - 1);
        } else {
          room.chamberInfo.blankCount = Math.max(0, room.chamberInfo.blankCount - 1);
        }

        addRoomLog(
          room,
          `🍺 ${player.name} downed a cold Beer and racked out a [${ejectedShell.toUpperCase()}] shell onto the table!`,
          "item"
        );

        if (room.secretChamber.length === 0) {
          reloadChamber(room);
        }
        break;
      }

      case "handsaw": {
        if (room.isSawedOff) {
          socket.emit("error:message", { message: "The shotgun barrel is already sawed off!" });
          return;
        }
        room.isSawedOff = true;
        addRoomLog(
          room,
          `🪚 ${player.name} sawed off the shotgun barrel! The next Live shell will deal 2x DAMAGE!`,
          "item"
        );
        break;
      }

      case "handcuffs": {
        if (!data.targetId || data.targetId === player.id) {
          socket.emit("error:message", { message: "You must select another player to handcuff!" });
          return;
        }
        const targetPlayer = room.players.get(data.targetId);
        if (!targetPlayer || !targetPlayer.isAlive || targetPlayer.isSpectator) {
          socket.emit("error:message", { message: "Target player is not valid or already eliminated." });
          return;
        }
        if (targetPlayer.isHandcuffed) {
          socket.emit("error:message", { message: `${targetPlayer.name} is already handcuffed!` });
          return;
        }
        targetPlayer.isHandcuffed = true;
        addRoomLog(
          room,
          `🔗 ${player.name} clamped rusty Handcuffs onto ${targetPlayer.name}! ${targetPlayer.name} will skip their next turn.`,
          "item"
        );
        break;
      }

      case "inverter": {
        const prevShell = room.secretChamber[0];
        const newShell: ShellType = prevShell === "live" ? "blank" : "live";
        room.secretChamber[0] = newShell;

        if (prevShell === "live") {
          room.chamberInfo.liveCount = Math.max(0, room.chamberInfo.liveCount - 1);
          room.chamberInfo.blankCount += 1;
        } else {
          room.chamberInfo.blankCount = Math.max(0, room.chamberInfo.blankCount - 1);
          room.chamberInfo.liveCount += 1;
        }

        addRoomLog(
          room,
          `⚡ ${player.name} triggered the Polarity Inverter! The current chamber shell flipped polarity.`,
          "item"
        );
        break;
      }

      default:
        socket.emit("error:message", { message: "Unknown item type." });
        return;
    }

    // Remove used item from inventory
    player.items.splice(itemIndex, 1);

    // Broadcast item used event for sounds & effects
    io.to(currentRoomCode).emit("item:used", {
      itemType: data.itemType,
      playerId: player.id,
      targetId: data.targetId,
    });

    // Broadcast state update
    io.to(currentRoomCode).emit("room:state", getPublicRoomState(room));
  });

  // Game Action: Shoot Self or Shoot Target
  socket.on("game:action", (data: { action: "shoot_self" | "shoot_target"; targetId?: string }) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.status !== "playing") return;

    // Validate turn
    if (socket.id !== room.currentTurnPlayerId) {
      socket.emit("error:message", { message: "It is not your turn to shoot!" });
      return;
    }

    const shooter = room.players.get(socket.id);
    if (!shooter || !shooter.isAlive) {
      socket.emit("error:message", { message: "You are not active in this game." });
      return;
    }

    // Ensure chamber has shells
    if (room.secretChamber.length === 0) {
      reloadChamber(room);
    }

    const shell = room.secretChamber.shift()!;
    room.chamberInfo.remainingShells = room.secretChamber.length;
    if (shell === "live") {
      room.chamberInfo.liveCount = Math.max(0, room.chamberInfo.liveCount - 1);
    } else {
      room.chamberInfo.blankCount = Math.max(0, room.chamberInfo.blankCount - 1);
    }
    shooter.shotsFired += 1;

    let target: Player | undefined;
    let isSelfShoot = false;

    if (data.action === "shoot_self") {
      isSelfShoot = true;
      target = shooter;
    } else {
      isSelfShoot = false;
      if (!data.targetId || data.targetId === shooter.id) {
        socket.emit("error:message", { message: "Invalid target specified." });
        return;
      }
      target = room.players.get(data.targetId);
      if (!target || !target.isAlive || target.isSpectator) {
        socket.emit("error:message", { message: "Target is already eliminated or not found." });
        return;
      }
    }

    const isLive = shell === "live";
    const wasSawedOff = room.isSawedOff;
    const damage = isLive ? (wasSawedOff ? 2 : 1) : 0;
    
    // Sawed-off effect is consumed upon firing
    room.isSawedOff = false;

    let targetDied = false;
    let nextTurnPlayerId: string;
    let message = "";

    if (isSelfShoot) {
      if (isLive) {
        target.health = Math.max(0, target.health - damage);
        target.damageTaken += damage;
        if (target.health === 0) {
          target.isAlive = false;
          target.isSpectator = true;
          targetDied = true;
        }
        // Live round against self -> turn passes to next alive player
        nextTurnPlayerId = getNextAlivePlayerId(room, shooter.id) || shooter.id;
        message = wasSawedOff
          ? `${shooter.name} pointed the sawed-off shotgun at themself... 💥 BOOM! Sawed-off live shell dealt ${damage} DAMAGE!`
          : `${shooter.name} aimed at themself... 💥 BANG! Live shell discharged. ${shooter.name} took 1 damage.`;
      } else {
        // Blank round against self -> Shooter retains turn!
        nextTurnPlayerId = shooter.id;
        message = `${shooter.name} aimed at themself... 💨 CLICK! It was a blank. ${shooter.name} keeps the turn!`;
      }
    } else {
      // Shooting another player
      if (isLive) {
        target.health = Math.max(0, target.health - damage);
        target.damageTaken += damage;
        if (target.health === 0) {
          target.isAlive = false;
          target.isSpectator = true;
          targetDied = true;
        }
        nextTurnPlayerId = getNextAlivePlayerId(room, shooter.id) || shooter.id;
        message = wasSawedOff
          ? `${shooter.name} fired the SAWED-OFF shotgun into ${target.name}... 💥💥 DEVASTATING BLAST! ${target.name} suffered 2 DAMAGE!`
          : `${shooter.name} aimed at ${target.name}... 💥 BOOM! Live shell hit ${target.name} for 1 damage!`;
      } else {
        nextTurnPlayerId = getNextAlivePlayerId(room, shooter.id) || shooter.id;
        message = `${shooter.name} pulled the trigger on ${target.name}... 💨 CLICK! It was a blank. Turn passes.`;
      }
    }

    if (targetDied) {
      message += ` ☠️ ${target.name} flatlined and was eliminated!`;
      addRoomLog(room, `☠️ ${target.name} ran out of health charges and died.`, "elimination");
    }

    const outcome: ActionOutcome = {
      id: `${Date.now()}-${Math.random()}`,
      action: data.action,
      shooterId: shooter.id,
      shooterName: shooter.name,
      targetId: target.id,
      targetName: target.name,
      shellType: shell,
      damage,
      isSelfShoot,
      message,
      targetDied,
      nextTurnPlayerId,
      isSawedOff: wasSawedOff,
    };

    room.lastOutcome = outcome;
    addRoomLog(room, message, isLive ? "live" : "blank");

    // Check game over
    const isGameOver = checkGameStatus(room);

    if (!isGameOver) {
      // Check if chamber is empty
      if (room.secretChamber.length === 0) {
        reloadChamber(room);
      }
      room.currentTurnPlayerId = nextTurnPlayerId;
    }

    // Broadcast outcome event for animations & sound
    io.to(currentRoomCode).emit("game:outcome", outcome);
    // Broadcast updated state
    io.to(currentRoomCode).emit("room:state", getPublicRoomState(room));
  });

  // Play Again / Reset to Lobby
  socket.on("room:play_again", () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    if (socket.id !== room.hostId) {
      socket.emit("error:message", { message: "Only the host can reset the game." });
      return;
    }

    room.status = "lobby";
    room.winner = null;
    room.lastOutcome = null;
    room.roundNumber = 1;
    room.currentTurnPlayerId = null;
    room.secretChamber = [];
    room.chamberInfo = { liveCount: 0, blankCount: 0, totalShells: 0, remainingShells: 0 };
    room.isSawedOff = false;

    room.players.forEach((p) => {
      p.health = 4;
      p.maxHealth = 4;
      p.isAlive = true;
      p.isSpectator = false;
      p.items = [];
      p.isHandcuffed = false;
    });

    addRoomLog(room, "🔄 Host reset the table back to Lobby. Ready up for a new match!", "info");
    io.to(currentRoomCode).emit("room:state", getPublicRoomState(room));
  });

  // Disconnection handler
  socket.on("disconnect", () => {
    if (!currentRoomCode || !currentPlayerId) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    const leavingPlayer = room.players.get(currentPlayerId);
    const playerName = leavingPlayer ? leavingPlayer.name : "A player";

    room.players.delete(currentPlayerId);
    room.turnOrder = room.turnOrder.filter((id) => id !== currentPlayerId);

    addRoomLog(room, `${playerName} left the table.`, "leave");

    if (room.players.size === 0) {
      // Clean up empty room
      rooms.delete(currentRoomCode);
      return;
    }

    // Reassign host if host left
    if (room.hostId === currentPlayerId) {
      const nextHost = Array.from(room.players.values())[0];
      if (nextHost) {
        room.hostId = nextHost.id;
        nextHost.isHost = true;
        addRoomLog(room, `👑 ${nextHost.name} is now the table host.`, "info");
      }
    }

    // If game was playing and it was their turn, pass turn
    if (room.status === "playing") {
      const isGameOver = checkGameStatus(room);
      if (!isGameOver && room.currentTurnPlayerId === currentPlayerId) {
        const nextId = getNextAlivePlayerId(room, null);
        room.currentTurnPlayerId = nextId;
      }
    }

    io.to(currentRoomCode).emit("room:state", getPublicRoomState(room));
  });
});

// Setup Vite middleware in dev or static files in prod
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`🎮 Buckshot Roulette Server running on http://0.0.0.0:${PORT}`);
  });
}

start();


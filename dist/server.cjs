var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_http = __toESM(require("http"), 1);
var import_socket = require("socket.io");
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var currentDir = typeof __dirname !== "undefined" ? __dirname : process.cwd();
var PORT = Number(process.env.PORT) || 3e3;
var app = (0, import_express.default)();
var server = import_http.default.createServer(app);
var io = new import_socket.Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
app.use(import_express.default.json());
var rooms = /* @__PURE__ */ new Map();
var ALL_ITEM_TYPES = [
  "magnifying_glass",
  "burner_phone",
  "cigarettes",
  "beer",
  "handsaw",
  "handcuffs",
  "inverter"
];
function generateRoomCode() {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return rooms.has(code) ? generateRoomCode() : code;
}
function generateShells(roundNum = 1) {
  let liveCount;
  let blankCount;
  if (roundNum === 1) {
    liveCount = Math.floor(Math.random() * 2) + 1;
    blankCount = Math.floor(Math.random() * 2) + 2;
  } else if (roundNum === 2) {
    liveCount = Math.floor(Math.random() * 3) + 2;
    blankCount = Math.floor(Math.random() * 3) + 2;
  } else {
    liveCount = Math.floor(Math.random() * 3) + 2;
    blankCount = Math.floor(Math.random() * 3) + 2;
  }
  const total = liveCount + blankCount;
  if (total > 8) {
    blankCount = 8 - liveCount;
  }
  if (total < 3) {
    blankCount += 1;
  }
  const shells = [
    ...Array(liveCount).fill("live"),
    ...Array(blankCount).fill("blank")
  ];
  for (let i = shells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shells[i], shells[j]] = [shells[j], shells[i]];
  }
  return { shells, liveCount, blankCount };
}
function distributeItemsToPlayers(room) {
  const alivePlayers = Array.from(room.players.values()).filter((p) => p.isAlive && !p.isSpectator);
  const totalAlive = alivePlayers.length;
  if (totalAlive === 0) return;
  let itemsToGrant = 3;
  if (totalAlive >= 6) {
    itemsToGrant = 5;
  } else if (totalAlive >= 4) {
    itemsToGrant = 4;
  }
  alivePlayers.forEach((player) => {
    const infoItem = Math.random() < 0.5 ? "magnifying_glass" : "burner_phone";
    const survivalItem = "cigarettes";
    const newItems = [infoItem, survivalItem];
    const remainingSlots = itemsToGrant - 2;
    for (let i = 0; i < remainingSlots; i++) {
      const randomItem = ALL_ITEM_TYPES[Math.floor(Math.random() * ALL_ITEM_TYPES.length)];
      newItems.push(randomItem);
    }
    for (const it of newItems) {
      if (player.items.length < 5) {
        player.items.push(it);
      }
    }
  });
  addRoomLog(
    room,
    `\u{1F4E6} Industrial item crates opened! Each alive player received ${itemsToGrant} items (Max 5 held).`,
    "item"
  );
}
function getPublicRoomState(room) {
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
    logs: room.logs.slice(-30),
    // Keep last 30 logs
    lastOutcome: room.lastOutcome,
    isSawedOff: room.isSawedOff
  };
}
function addRoomLog(room, text, type = "info") {
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    timestamp: Date.now(),
    text,
    type
  };
  room.logs.push(entry);
}
function getOrdinalSuffix(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
function getNextAlivePlayerId(room, currentId) {
  const alivePlayers = room.turnOrder.map((id) => room.players.get(id)).filter((p) => !!p && p.isAlive);
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
        candidate.isHandcuffed = false;
        addRoomLog(
          room,
          `\u26D3\uFE0F ${candidate.name} is trapped in Handcuffs and forced to skip their turn!`,
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
function checkGameStatus(room) {
  const alivePlayers = Array.from(room.players.values()).filter((p) => p.isAlive && !p.isSpectator);
  if (alivePlayers.length <= 1) {
    room.status = "game_over";
    room.winner = alivePlayers.length === 1 ? alivePlayers[0] : null;
    room.currentTurnPlayerId = null;
    room.isSawedOff = false;
    if (room.winner) {
      addRoomLog(room, `\u{1F3C6} ${room.winner.name} is the sole survivor and wins the underground showdown!`, "victory");
    } else {
      addRoomLog(room, "\u2620\uFE0F All players have fallen. No survivors at the table.", "elimination");
    }
    return true;
  }
  return false;
}
function reloadChamber(room) {
  room.roundNumber += 1;
  room.isSawedOff = false;
  const load = generateShells(room.roundNumber);
  room.secretChamber = load.shells;
  room.chamberInfo = {
    liveCount: load.liveCount,
    blankCount: load.blankCount,
    totalShells: load.shells.length,
    remainingShells: load.shells.length
  };
  addRoomLog(
    room,
    `\u{1F504} Chamber reloaded for Round ${room.roundNumber}: [${load.liveCount} Live, ${load.blankCount} Blank shells].`,
    "reload"
  );
  distributeItemsToPlayers(room);
}
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    activeRooms: rooms.size,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
io.on("connection", (socket) => {
  let currentRoomCode = null;
  let currentPlayerId = null;
  socket.on("room:create", (data) => {
    const name = (data.playerName || "Player").trim().slice(0, 16) || "Player";
    const avatarColor = data.avatarColor || "#f59e0b";
    const roomCode = generateRoomCode();
    const playerId = socket.id;
    const hostPlayer = {
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
      isHandcuffed: false
    };
    const newRoom = {
      code: roomCode,
      hostId: playerId,
      status: "lobby",
      players: /* @__PURE__ */ new Map([[playerId, hostPlayer]]),
      turnOrder: [playerId],
      currentTurnIndex: 0,
      currentTurnPlayerId: null,
      chamberInfo: {
        liveCount: 0,
        blankCount: 0,
        totalShells: 0,
        remainingShells: 0
      },
      secretChamber: [],
      roundNumber: 1,
      winner: null,
      logs: [],
      lastOutcome: null,
      isSawedOff: false
    };
    rooms.set(roomCode, newRoom);
    currentRoomCode = roomCode;
    currentPlayerId = playerId;
    socket.join(roomCode);
    addRoomLog(newRoom, `${name} entered the underground table (Room ${roomCode}).`, "join");
    socket.emit("room:created", { roomCode, playerId });
    io.to(roomCode).emit("room:state", getPublicRoomState(newRoom));
  });
  socket.on("room:join", (data) => {
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
      const spectatorPlayer = {
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
        isHandcuffed: false
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
    const newPlayer = {
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
      isHandcuffed: false
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
    addRoomLog(room, "\u2694\uFE0F The showdown begins! Everyone starts with 4 Health Charges.", "info");
    reloadChamber(room);
    io.to(currentRoomCode).emit("room:state", getPublicRoomState(room));
  });
  socket.on("game:item_use", (data) => {
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
    const itemIndex = player.items.indexOf(data.itemType);
    if (itemIndex === -1) {
      socket.emit("error:message", { message: "You do not have that item in your inventory!" });
      return;
    }
    if (room.secretChamber.length === 0) {
      reloadChamber(room);
    }
    switch (data.itemType) {
      case "magnifying_glass": {
        const currentShell = room.secretChamber[0];
        const privateResult = {
          id: `${Date.now()}-mag`,
          itemType: "magnifying_glass",
          title: "CHAMBER INSPECTED",
          message: `The current shell in the chamber is ${currentShell.toUpperCase()}.`,
          shellType: currentShell,
          shellPosition: 1
        };
        socket.emit("item:private_result", privateResult);
        addRoomLog(room, `\u{1F50D} ${player.name} examined the chamber through a Magnifying Glass.`, "item");
        break;
      }
      case "burner_phone": {
        const chamberLen = room.secretChamber.length;
        let targetIndex = 0;
        let pos = 1;
        if (chamberLen > 1) {
          targetIndex = Math.floor(Math.random() * (chamberLen - 1)) + 1;
          pos = targetIndex + 1;
        }
        const revealedShell = room.secretChamber[targetIndex];
        const suffix = getOrdinalSuffix(pos);
        const privateResult = {
          id: `${Date.now()}-phone`,
          itemType: "burner_phone",
          title: "ENCRYPTED INTEL",
          message: chamberLen === 1 ? `Only 1 shell remains in the chamber: it is ${revealedShell.toUpperCase()}.` : `Dealer contact whispers: The ${pos}${suffix} shell in the chamber is ${revealedShell.toUpperCase()}.`,
          shellType: revealedShell,
          shellPosition: pos
        };
        socket.emit("item:private_result", privateResult);
        addRoomLog(room, `\u{1F4DE} ${player.name} answered an encrypted call on a Burner Phone...`, "item");
        break;
      }
      case "cigarettes": {
        if (player.health >= player.maxHealth) {
          socket.emit("error:message", { message: "Your health is already at max (4 charges)!" });
          return;
        }
        player.health = Math.min(player.maxHealth, player.health + 1);
        addRoomLog(room, `\u{1F6AC} ${player.name} smoked a Cigarette and recovered +1 Health charge.`, "item");
        break;
      }
      case "beer": {
        const ejectedShell = room.secretChamber.shift();
        room.chamberInfo.remainingShells = room.secretChamber.length;
        if (ejectedShell === "live") {
          room.chamberInfo.liveCount = Math.max(0, room.chamberInfo.liveCount - 1);
        } else {
          room.chamberInfo.blankCount = Math.max(0, room.chamberInfo.blankCount - 1);
        }
        addRoomLog(
          room,
          `\u{1F37A} ${player.name} downed a cold Beer and racked out a [${ejectedShell.toUpperCase()}] shell onto the table!`,
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
          `\u{1FA9A} ${player.name} sawed off the shotgun barrel! The next Live shell will deal 2x DAMAGE!`,
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
          `\u{1F517} ${player.name} clamped rusty Handcuffs onto ${targetPlayer.name}! ${targetPlayer.name} will skip their next turn.`,
          "item"
        );
        break;
      }
      case "inverter": {
        const prevShell = room.secretChamber[0];
        const newShell = prevShell === "live" ? "blank" : "live";
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
          `\u26A1 ${player.name} triggered the Polarity Inverter! The current chamber shell flipped polarity.`,
          "item"
        );
        break;
      }
      default:
        socket.emit("error:message", { message: "Unknown item type." });
        return;
    }
    player.items.splice(itemIndex, 1);
    io.to(currentRoomCode).emit("item:used", {
      itemType: data.itemType,
      playerId: player.id,
      targetId: data.targetId
    });
    io.to(currentRoomCode).emit("room:state", getPublicRoomState(room));
  });
  socket.on("game:action", (data) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.status !== "playing") return;
    if (socket.id !== room.currentTurnPlayerId) {
      socket.emit("error:message", { message: "It is not your turn to shoot!" });
      return;
    }
    const shooter = room.players.get(socket.id);
    if (!shooter || !shooter.isAlive) {
      socket.emit("error:message", { message: "You are not active in this game." });
      return;
    }
    if (room.secretChamber.length === 0) {
      reloadChamber(room);
    }
    const shell = room.secretChamber.shift();
    room.chamberInfo.remainingShells = room.secretChamber.length;
    if (shell === "live") {
      room.chamberInfo.liveCount = Math.max(0, room.chamberInfo.liveCount - 1);
    } else {
      room.chamberInfo.blankCount = Math.max(0, room.chamberInfo.blankCount - 1);
    }
    shooter.shotsFired += 1;
    let target;
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
    const damage = isLive ? wasSawedOff ? 2 : 1 : 0;
    room.isSawedOff = false;
    let targetDied = false;
    let nextTurnPlayerId;
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
        nextTurnPlayerId = getNextAlivePlayerId(room, shooter.id) || shooter.id;
        message = wasSawedOff ? `${shooter.name} pointed the sawed-off shotgun at themself... \u{1F4A5} BOOM! Sawed-off live shell dealt ${damage} DAMAGE!` : `${shooter.name} aimed at themself... \u{1F4A5} BANG! Live shell discharged. ${shooter.name} took 1 damage.`;
      } else {
        nextTurnPlayerId = shooter.id;
        message = `${shooter.name} aimed at themself... \u{1F4A8} CLICK! It was a blank. ${shooter.name} keeps the turn!`;
      }
    } else {
      if (isLive) {
        target.health = Math.max(0, target.health - damage);
        target.damageTaken += damage;
        if (target.health === 0) {
          target.isAlive = false;
          target.isSpectator = true;
          targetDied = true;
        }
        nextTurnPlayerId = getNextAlivePlayerId(room, shooter.id) || shooter.id;
        message = wasSawedOff ? `${shooter.name} fired the SAWED-OFF shotgun into ${target.name}... \u{1F4A5}\u{1F4A5} DEVASTATING BLAST! ${target.name} suffered 2 DAMAGE!` : `${shooter.name} aimed at ${target.name}... \u{1F4A5} BOOM! Live shell hit ${target.name} for 1 damage!`;
      } else {
        nextTurnPlayerId = getNextAlivePlayerId(room, shooter.id) || shooter.id;
        message = `${shooter.name} pulled the trigger on ${target.name}... \u{1F4A8} CLICK! It was a blank. Turn passes.`;
      }
    }
    if (targetDied) {
      message += ` \u2620\uFE0F ${target.name} flatlined and was eliminated!`;
      addRoomLog(room, `\u2620\uFE0F ${target.name} ran out of health charges and died.`, "elimination");
    }
    const outcome = {
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
      isSawedOff: wasSawedOff
    };
    room.lastOutcome = outcome;
    addRoomLog(room, message, isLive ? "live" : "blank");
    const isGameOver = checkGameStatus(room);
    if (!isGameOver) {
      if (room.secretChamber.length === 0) {
        reloadChamber(room);
      }
      room.currentTurnPlayerId = nextTurnPlayerId;
    }
    io.to(currentRoomCode).emit("game:outcome", outcome);
    io.to(currentRoomCode).emit("room:state", getPublicRoomState(room));
  });
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
    addRoomLog(room, "\u{1F504} Host reset the table back to Lobby. Ready up for a new match!", "info");
    io.to(currentRoomCode).emit("room:state", getPublicRoomState(room));
  });
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
      rooms.delete(currentRoomCode);
      return;
    }
    if (room.hostId === currentPlayerId) {
      const nextHost = Array.from(room.players.values())[0];
      if (nextHost) {
        room.hostId = nextHost.id;
        nextHost.isHost = true;
        addRoomLog(room, `\u{1F451} ${nextHost.name} is now the table host.`, "info");
      }
    }
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
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`\u{1F3AE} Buckshot Roulette Server running on http://0.0.0.0:${PORT}`);
  });
}
start();
//# sourceMappingURL=server.cjs.map

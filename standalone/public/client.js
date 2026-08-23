const socket = io();
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
    alert('Please select a target player by clicking their card first!');
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
  chamberStatus.textContent = `Chamber: ${state.chamberInfo.liveCount} Live, ${state.chamberInfo.blankCount} Blank (${state.chamberInfo.remainingShells} shells remaining)`;

  const isHost = state.hostId === myPlayerId;
  btnStart.classList.toggle('hidden', !(isHost && state.status === 'lobby' && state.players.length >= 2));

  const isMyTurn = state.status === 'playing' && state.currentTurnPlayerId === myPlayerId;
  actionControls.classList.toggle('hidden', !isMyTurn);

  turnBanner.textContent = state.status === 'playing'
    ? (isMyTurn ? '👉 YOUR TURN TO SHOOT!' : `Waiting for ${state.players.find(p => p.id === state.currentTurnPlayerId)?.name || 'opponent'}...`)
    : (state.status === 'game_over' ? `🏆 Winner: ${state.winner?.name || 'Nobody'}` : 'Waiting in Lobby for Host to Start');

  // Render players
  playersGrid.innerHTML = '';
  state.players.forEach((player) => {
    const isTurn = player.id === state.currentTurnPlayerId;
    const card = document.createElement('div');
    card.className = `p-4 rounded-xl border transition-all ${isTurn ? 'border-amber-500 bg-amber-950/30 ring-1 ring-amber-500' : 'border-neutral-800 bg-neutral-900'} ${!player.isAlive ? 'opacity-50' : 'cursor-pointer'}`;
    
    let chargesHtml = '';
    for (let i = 0; i < 4; i++) {
      chargesHtml += i < player.health ? '⚡' : '░';
    }

    card.innerHTML = `
      <div class="flex justify-between items-center">
        <span class="font-bold text-sm text-neutral-100">${player.name} ${player.id === myPlayerId ? '<span class="text-amber-400 text-xs">(You)</span>' : ''}</span>
        ${player.isHost ? '<span class="text-xs text-amber-400">👑</span>' : ''}
      </div>
      <div class="text-xs font-mono text-amber-400 mt-2 font-bold">${player.isAlive ? chargesHtml + ' (' + player.health + '/4)' : '☠️ DEAD'}</div>
    `;

    if (player.id !== myPlayerId && player.isAlive) {
      if (selectedTargetId === player.id) {
        card.classList.add('ring-2', 'ring-red-500', 'bg-red-950/20');
      }
      card.onclick = () => {
        selectedTargetId = player.id;
        document.querySelectorAll('#players-grid > div').forEach(c => c.classList.remove('ring-2', 'ring-red-500', 'bg-red-950/20'));
        card.classList.add('ring-2', 'ring-red-500', 'bg-red-950/20');
        btnShootOther.textContent = `Shoot ${player.name}`;
      };
    }
    playersGrid.appendChild(card);
  });

  // Render logs
  logFeed.innerHTML = state.logs.slice().reverse().map(l => `<div class="${l.type === 'live' ? 'text-red-400 font-bold' : (l.type === 'blank' ? 'text-cyan-300' : 'text-neutral-300')}">${l.text}</div>`).join('');
});

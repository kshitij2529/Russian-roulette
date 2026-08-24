export type ShellType = 'live' | 'blank';

export type ItemType =
  | 'magnifying_glass'
  | 'burner_phone'
  | 'cigarettes'
  | 'beer'
  | 'handsaw'
  | 'handcuffs'
  | 'inverter';

export type ItemCategory = 'information' | 'survival' | 'utility' | 'offensive' | 'control' | 'tactical';

export interface ItemDefinition {
  type: ItemType;
  name: string;
  category: ItemCategory;
  description: string;
  shortDesc: string;
  iconName: string;
  requiresTarget?: boolean;
}

export interface Player {
  id: string;
  socketId: string;
  name: string;
  avatarColor: string;
  health: number;
  maxHealth: number;
  isAlive: boolean;
  isHost: boolean;
  isSpectator: boolean;
  shotsFired: number;
  damageTaken: number;
  items: ItemType[];
  isHandcuffed: boolean;
}

export interface ChamberPublicInfo {
  liveCount: number;
  blankCount: number;
  totalShells: number;
  remainingShells: number;
}

export interface GameLogEntry {
  id: string;
  timestamp: number;
  text: string;
  type: 'info' | 'live' | 'blank' | 'reload' | 'elimination' | 'victory' | 'join' | 'leave' | 'item';
}

export interface ActionOutcome {
  id: string;
  action: 'shoot_self' | 'shoot_target';
  shooterId: string;
  shooterName: string;
  targetId: string;
  targetName: string;
  shellType: ShellType;
  damage: number;
  isSelfShoot: boolean;
  message: string;
  targetDied: boolean;
  nextTurnPlayerId: string;
  isSawedOff?: boolean;
}

export interface PrivateItemResult {
  id: string;
  itemType: ItemType;
  title: string;
  message: string;
  shellType?: ShellType;
  shellPosition?: number;
}

export type GameStatus = 'lobby' | 'playing' | 'game_over';

export interface PublicRoomState {
  code: string;
  hostId: string;
  status: GameStatus;
  players: Player[];
  turnOrder: string[];
  currentTurnIndex: number;
  currentTurnPlayerId: string | null;
  chamberInfo: ChamberPublicInfo;
  roundNumber: number;
  winner: Player | null;
  logs: GameLogEntry[];
  lastOutcome: ActionOutcome | null;
  isSawedOff: boolean;
}

export interface ServerRoom {
  code: string;
  hostId: string;
  status: GameStatus;
  players: Map<string, Player>;
  turnOrder: string[];
  currentTurnIndex: number;
  currentTurnPlayerId: string | null;
  chamberInfo: ChamberPublicInfo;
  secretChamber: ShellType[];
  roundNumber: number;
  winner: Player | null;
  logs: GameLogEntry[];
  lastOutcome: ActionOutcome | null;
  isSawedOff: boolean;
}


export enum TileType {
  START = 'START',
  PROPERTY = 'PROPERTY',
  CHANCE = 'CHANCE',
  JAIL = 'JAIL',
  PARKING = 'PARKING', // Free parking / Rest
  TAX = 'TAX',
  CASINO = 'CASINO'
}

export enum PlayerColor {
  RED = 'red',
  BLUE = 'blue',
  GREEN = 'green',
  YELLOW = 'yellow',
  PURPLE = 'purple',
  ORANGE = 'orange',
  PINK = 'pink',
  TEAL = 'teal'
}

export type HexRarity = 'SILVER' | 'GOLD' | 'PRISMATIC';

export interface HexBuff {
  id: string;
  name: string;
  description: string;
  icon: string; // Emoji or Lucide icon name
  rarity: HexRarity;
  effectId: 'RENT_BOOST' | 'TAX_EXEMPT' | 'BUILD_DISCOUNT' | 'DICE_BOOST' | 'SALARY_BOOST' | 'ABSORB_RENT' | 'BANK_INTEREST' | 'JAIL_BREAK' | 'ROBBERY' | 'DOUBLE_BUILD';
}

export interface Tile {
  id: number;
  name: string;
  type: TileType;
  price?: number;     // Purchase price for properties
  rent?: number;      // Base Rent cost
  ownerId?: string | null; // ID of the player who owns it
  color?: string;     // Visual color group for properties
  icon?: React.ReactNode;
  level: number;      // 0 = Land only, 1-5 = Buildings
}

export interface Player {
  id: string;
  name: string;
  color: PlayerColor;
  money: number;
  position: number; 
  isJailed: boolean;
  jailTurns: number; 
  isAI: boolean;
  properties: number[]; 
  riskTolerance?: number;
  avatar?: string;
  
  // Hextech System
  hexBuffs: HexBuff[];
  laps: number; // Count how many times passed start
  triggers: {
    hasStartHex: boolean; // Triggered at game start
    hasFirstLapHex: boolean; // Triggered after completing Lap 1
    hasLowMoneyHex: boolean; // Triggered once when money < 1000
  };
}

export interface LogEntry {
  id: string;
  message: string;
  type: 'info' | 'success' | 'danger' | 'warning';
}

export interface GameState {
  players: Player[];
  tiles: Tile[];
  currentPlayerIndex: number;
  diceValue: number | null;
  isRolling: boolean;
  gameStatus: 'SETUP' | 'PLAYING' | 'GAME_OVER';
  winnerId: string | null;
  turnCount: number;
}

// Network Types
export interface NetMessage {
  type: 'JOIN' | 'SYNC' | 'ACTION' | 'START_GAME';
  payload?: any;
}

export interface NetJoinPayload {
  name: string;
  avatar: string;
}

export interface NetActionPayload {
  action: 'ROLL' | 'BUY' | 'BUILD' | 'SELECT_HEX' | 'SKIP_ACTION';
  data?: any;
}

export interface NetSyncPayload {
  players: Player[];
  tiles: Tile[];
  currentPlayerIndex: number;
  diceValue: number | null;
  isRolling: boolean;
  logs: LogEntry[];
  turnCount: number;
  // Modals state
  modalOpen: boolean;
  pendingAction: any;
  hexModalOpen: boolean;
  availableHexes: HexBuff[];
  triggerReason: string;
  moneyAnims: any[];
}
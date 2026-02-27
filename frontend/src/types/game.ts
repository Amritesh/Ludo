export type Color = 'RED' | 'BLUE' | 'GREEN' | 'YELLOW';
export type GameStatus = 'LOBBY' | 'RUNNING' | 'FINISHED';
export type PlayerKind = 'HUMAN' | 'BOT';
export type TurnPhase = 'NEED_ROLL' | 'NEED_MOVE';
export type TacticalDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

// ─── Dice Bank ────────────────────────────────────────────────────────────────
export type BonusSource = 'BASE' | 'ROLL_6_BONUS' | 'ARROW_BONUS' | 'KILL_BONUS';

export interface DiceBankEntry {
  id: string;
  value: number; // 1–6
  source: BonusSource;
  createdAtSequence: number;
}

// ─── Stack / Combat ──────────────────────────────────────────────────────────
export type StackType =
  | 'EMPTY'
  | 'SINGLE'
  | 'HEAVY_PAIR'
  | 'MULTI_STACK_3'
  | 'MULTI_STACK_4'
  | 'ALLIED_STACK'
  | 'MIXED_ENEMY';

export type LandingResolutionType =
  | 'NORMAL_LAND'
  | 'CAPTURE'
  | 'COEXIST_NO_CAPTURE'
  | 'BLOCKED';

export interface SquareOccupant {
  playerId: string;
  color: Color;
  pieceIndex: number;
}

export interface StackDescriptor {
  type: StackType;
  occupants: SquareOccupant[];
  isInvincible: boolean;
  isPair: boolean;
}

// ─── Tactical Move ────────────────────────────────────────────────────────────
export interface TacticalAction {
  bankDieId: string;
  bankDieValue: number;
  pieceIndex: number;
  isPairMove: boolean;
  pairedPieceIndex?: number;
  targetPosition: number;
  arrowGlide?: { headPosition: number };
}

// ─── Base Types ───────────────────────────────────────────────────────────────
export interface Piece {
  id: number;
  position: number; // -1=yard, 0–51=common, 52–57=home lane, 58=home
  isSafe: boolean;
}

export interface Player {
  id: string;
  kind: PlayerKind;
  color: Color;
  name: string;
  connected: boolean;
  lastSeen: number;
  pieces: Piece[];
  homeCount: number;
  difficulty?: TacticalDifficulty;
}

export interface GameState {
  code: string;
  status: GameStatus;
  createdAt: number;
  updatedAt: number;
  players: Player[];
  viewersCount: number;
  currentTurnPlayerId: string;
  turn: {
    phase: TurnPhase;
    diceValue?: number;
    bank: DiceBankEntry[];
    bankSequence: number;
    turnNonce: string;
    extraTurnChain: number;
    discardEvent?: { reason: string };
  };
  winnerId?: string;
  lastEvent?: GameEvent;
}

// ─── Events ───────────────────────────────────────────────────────────────────
export type GameEventType =
  | 'DICE_ROLL'
  | 'PIECE_MOVED'
  | 'TURN_CHANGED'
  | 'PLAYER_STATUS'
  | 'GAME_FINISHED'
  | 'GAME_STARTED'
  | 'SNAPSHOT'
  | 'BANK_DISCARDED'
  | 'ARROW_GLIDE'
  | 'BONUS_ROLL';

export interface GameEvent {
  type: GameEventType;
  playerId?: string;
  payload: any;
  timestamp: number;
}

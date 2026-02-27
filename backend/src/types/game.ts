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
  | 'MIXED_ENEMY'; // Single sitting on enemy Heavy Pair (coexist, no capture)

export type LandingResolutionType =
  | 'NORMAL_LAND'
  | 'CAPTURE'
  | 'COEXIST_NO_CAPTURE'
  | 'BLOCKED';

export type SquareType =
  | 'HOUSE_YARD'
  | 'OUTER_TRACK_WHITE'
  | 'START_BOX'
  | 'SAFE_RHOMBUS'
  | 'HOME_STRETCH'
  | 'FINAL_TRIANGLE'
  | 'ARROW_OUTER_TAIL'
  | 'ARROW_INNER_TAIL';

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

export interface BonusTrigger {
  type: 'ARROW_OUTER' | 'ARROW_INNER' | 'KILL';
  roll: number;
}

export interface StateTransitionResult {
  newState: GameState;
  bonusTriggers: BonusTrigger[];
  discarded: boolean;
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
  difficulty?: TacticalDifficulty; // Only for BOT players
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
    diceValue?: number; // Most-recent single roll value (UI compat)
    bank: DiceBankEntry[]; // All pending dice values
    bankSequence: number; // Monotonic counter for entry IDs
    turnNonce: string;
    extraTurnChain: number;
    discardEvent?: { reason: string }; // Set when bank was discarded
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

export interface PieceMovedPayload {
  pieceIndex: number;
  from: number;
  to: number;
  path: number[];
  isPairMove: boolean;
  pairedPieceIndex?: number;
  pairedPieceTo?: number;
  cut?: {
    victimId: string;
    victimPieceIndex: number;
  };
  arrowGlide?: {
    from: number;
    to: number;
  };
  bonusRolls: DiceBankEntry[];
  bankDieId: string;
}

export interface DiceRollPayload {
  value: number;
  bank: DiceBankEntry[];
}

export interface TurnChangedPayload {
  playerId: string;
  turnNonce: string;
  phase: TurnPhase;
  bank: DiceBankEntry[];
}

export interface PlayerStatusPayload {
  connected: boolean;
  aiControlling: boolean;
}

export interface SessionData {
  gameCode: string;
  playerId?: string;
  role: 'player' | 'viewer';
  lastSeen: number;
}

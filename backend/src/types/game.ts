export type Color = 'RED' | 'BLUE' | 'GREEN' | 'YELLOW';
export type GameStatus = 'LOBBY' | 'RUNNING' | 'FINISHED';
export type PlayerKind = 'HUMAN' | 'BOT';
export type TurnPhase = 'NEED_ROLL' | 'NEED_MOVE';

export interface Piece {
  id: number;
  position: number; // -1 for yard, 0-51 for common path, 52-57 for home lane, 58 for home
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
    turnNonce: string;
    extraTurnChain: number;
  };
  winnerId?: string;
  lastEvent?: GameEvent;
}

export type GameEventType = 
  | 'DICE_ROLL' 
  | 'PIECE_MOVED' 
  | 'TURN_CHANGED' 
  | 'PLAYER_STATUS' 
  | 'GAME_FINISHED'
  | 'GAME_STARTED'
  | 'SNAPSHOT';

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
  cut?: {
    victimId: string;
    victimPieceIndex: number;
  };
}

export interface DiceRollPayload {
  value: number;
}

export interface TurnChangedPayload {
  playerId: string;
  turnNonce: string;
  phase: TurnPhase;
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

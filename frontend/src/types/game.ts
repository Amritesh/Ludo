export type Color = 'RED' | 'BLUE' | 'GREEN' | 'YELLOW';
export type GameStatus = 'LOBBY' | 'RUNNING' | 'FINISHED';
export type PlayerKind = 'HUMAN' | 'BOT';
export type TurnPhase = 'NEED_ROLL' | 'NEED_MOVE';

export interface Piece {
  id: number;
  position: number;
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
  lastEvent?: any;
}

/**
 * engine.ts — Core Ludo rules engine.
 *
 * This file now exports BOTH the classic functions (unchanged, for backward compat)
 * AND the new tactical variants that power Ludo Tactical Edition.
 *
 * Classic: rollDice / isValidMove / applyMove  (simple single-die flow)
 * Tactical: tacticalRoll / tacticalMove / tacticalIsValid (dice-bank flow)
 */

import { Color, GameState, Piece, Player, TurnPhase, DiceBankEntry } from '../types/game';
import { rollD6 } from './diceBank';
import { applyTacticalMove, applyTacticalRoll } from './moveResolver';
import { getLegalActions, getLegalActionsForBankEntry, isLegalAction, autoPickBankDie } from './moveGenerator';
import { TacticalAction } from '../types/game';

// ─── Re-export board constants ────────────────────────────────────────────────
export {
  BOARD_SIZE,
  HOME_LANE_LENGTH,
  HOME_INDEX,
  START_INDICES,
  HOME_LANE_ENTRY_INDICES,
  SAFE_SQUARES,
  getPiecePath,
} from './boardConfig';

// ─── Classic (legacy) functions — kept for existing tests ─────────────────────

const BOARD_SIZE_LOCAL = 52;
const HOME_INDEX_LOCAL = 58;

const START_INDICES_LOCAL: Record<Color, number> = {
  RED: 0,
  GREEN: 13,
  YELLOW: 26,
  BLUE: 39,
};

const HOME_LANE_ENTRY_INDICES_LOCAL: Record<Color, number> = {
  RED: 51,
  GREEN: 12,
  YELLOW: 25,
  BLUE: 38,
};

export const SAFE_SQUARES_LEGACY = [0, 8, 13, 21, 26, 34, 39, 47];

/**
 * Classic path calculation — unchanged from original.
 */
export function getPiecePathLegacy(
  color: Color,
  startPos: number,
  diceValue: number,
): number[] {
  const path: number[] = [];
  let currentPos = startPos;

  for (let i = 0; i < diceValue; i++) {
    if (currentPos === -1) {
      if (diceValue === 6) {
        currentPos = START_INDICES_LOCAL[color];
        path.push(currentPos);
        return path;
      } else {
        return [];
      }
    } else if (currentPos < BOARD_SIZE_LOCAL) {
      const entryPoint = HOME_LANE_ENTRY_INDICES_LOCAL[color];
      if (currentPos === entryPoint) {
        currentPos = 52;
      } else {
        currentPos = (currentPos + 1) % BOARD_SIZE_LOCAL;
      }
    } else if (currentPos < HOME_INDEX_LOCAL) {
      currentPos++;
    } else {
      return [];
    }

    if (currentPos > HOME_INDEX_LOCAL) return [];
    path.push(currentPos);
  }

  return path;
}

/**
 * Classic move validation — unchanged from original.
 */
export function isValidMove(
  gameState: GameState,
  playerId: string,
  pieceIndex: number,
  diceValue: number,
  forcePhaseCheck = true,
): boolean {
  const player = gameState.players.find(p => p.id === playerId);
  if (!player || gameState.currentTurnPlayerId !== playerId) return false;
  if (forcePhaseCheck && gameState.turn.phase !== 'NEED_MOVE') return false;

  const piece = player.pieces[pieceIndex];
  if (!piece || piece.position === HOME_INDEX_LOCAL) return false;

  if (piece.position === -1) {
    return diceValue === 6;
  }

  const path = getPiecePathLegacy(player.color, piece.position, diceValue);
  return path.length === diceValue && path[path.length - 1] <= HOME_INDEX_LOCAL;
}

/**
 * Classic move application — unchanged from original.
 */
export function applyMove(
  gameState: GameState,
  playerId: string,
  pieceIndex: number,
  diceValue: number,
): GameState {
  const newState = JSON.parse(JSON.stringify(gameState)) as GameState;
  const player = newState.players.find(p => p.id === playerId)!;
  const piece = player.pieces[pieceIndex];

  const path = getPiecePathLegacy(player.color, piece.position, diceValue);
  const targetPos = path[path.length - 1];
  const oldPos = piece.position;

  piece.position = targetPos;
  if (targetPos === HOME_INDEX_LOCAL) {
    player.homeCount++;
  }

  let cutInfo = undefined;

  if (targetPos < BOARD_SIZE_LOCAL && !SAFE_SQUARES_LEGACY.includes(targetPos)) {
    for (const otherPlayer of newState.players) {
      if (otherPlayer.id === playerId) continue;
      for (let i = 0; i < otherPlayer.pieces.length; i++) {
        const otherPiece = otherPlayer.pieces[i];
        if (otherPiece.position === targetPos) {
          otherPiece.position = -1;
          cutInfo = { victimId: otherPlayer.id, victimPieceIndex: i };
          newState.turn.extraTurnChain++;
          break;
        }
      }
      if (cutInfo) break;
    }
  }

  newState.lastEvent = {
    type: 'PIECE_MOVED',
    playerId,
    payload: {
      pieceIndex,
      from: oldPos,
      to: targetPos,
      path,
      cut: cutInfo,
      isPairMove: false,
      bonusRolls: [],
      bankDieId: '',
    },
    timestamp: Date.now(),
  };

  if (player.homeCount === 4) {
    newState.status = 'FINISHED';
    newState.winnerId = playerId;
    newState.lastEvent = {
      type: 'GAME_FINISHED',
      playerId,
      payload: { winnerId: playerId },
      timestamp: Date.now(),
    };
    return newState;
  }

  if (diceValue === 6) {
    newState.turn.phase = 'NEED_ROLL';
  } else if (cutInfo) {
    newState.turn.phase = 'NEED_ROLL';
  } else {
    const currentIndex = newState.players.findIndex(p => p.id === playerId);
    const nextIndex = (currentIndex + 1) % newState.players.length;
    newState.currentTurnPlayerId = newState.players[nextIndex].id;
    newState.turn.phase = 'NEED_ROLL';
    newState.turn.extraTurnChain = 0;
  }

  newState.turn.turnNonce = Math.random().toString(36).substring(7);
  newState.updatedAt = Date.now();

  return newState;
}

/**
 * Classic dice roll — unchanged from original (single die, no bank).
 */
export function rollDice(
  gameState: GameState,
  playerId: string,
): { newState: GameState; roll: number } {
  const newState = JSON.parse(JSON.stringify(gameState)) as GameState;
  if (
    newState.currentTurnPlayerId !== playerId ||
    newState.turn.phase !== 'NEED_ROLL'
  ) {
    throw new Error('Not your turn or wrong phase');
  }

  const roll = Math.floor(Math.random() * 6) + 1;
  newState.turn.diceValue = roll;

  const player = newState.players.find(p => p.id === playerId)!;
  const canMove = player.pieces.some((_, idx) =>
    isValidMove(newState, playerId, idx, roll, false),
  );

  newState.lastEvent = {
    type: 'DICE_ROLL',
    playerId,
    payload: { value: roll, bank: newState.turn.bank ?? [] },
    timestamp: Date.now(),
  };

  if (!canMove) {
    if (roll === 6) {
      newState.turn.phase = 'NEED_ROLL';
    } else {
      const currentIndex = newState.players.findIndex(p => p.id === playerId);
      const nextIndex = (currentIndex + 1) % newState.players.length;
      newState.currentTurnPlayerId = newState.players[nextIndex].id;
      newState.turn.phase = 'NEED_ROLL';
    }
  } else {
    newState.turn.phase = 'NEED_MOVE';
  }

  newState.updatedAt = Date.now();
  return { newState, roll };
}

// ─── Tactical variants (new) ──────────────────────────────────────────────────

/**
 * Tactical roll: uses the dice-bank flow.
 * Returns updated state + all bank entries added.
 */
export function tacticalRoll(
  state: GameState,
  playerId: string,
): { newState: GameState; rollsAdded: DiceBankEntry[] } {
  return applyTacticalRoll(state, playerId, rollD6);
}

/**
 * Tactical move: apply a bank-die-based move.
 * `bankDieId` is optional; if omitted, auto-picks the first valid die for the piece.
 */
export function tacticalMove(
  state: GameState,
  playerId: string,
  pieceIndex: number,
  bankDieId?: string,
  preferPairMove?: boolean,
): { newState: GameState; bonusTriggers: any[]; discarded: boolean } {
  // Auto-pick die if not specified
  const dieId = bankDieId ?? autoPickBankDie(state, playerId, pieceIndex);
  if (!dieId) throw new Error('No valid bank die for this piece');

  const bankEntry = state.turn.bank.find(e => e.id === dieId);
  if (!bankEntry) throw new Error(`Bank die not found: ${dieId}`);

  // Find the action for this die + piece
  const actions = getLegalActionsForBankEntry(state, playerId, bankEntry);
  let action = actions.find(a => a.pieceIndex === pieceIndex && (preferPairMove === undefined || a.isPairMove === preferPairMove));
  
  // Fallback if preference not found
  if (!action) {
      action = actions.find(a => a.pieceIndex === pieceIndex);
  }
  
  if (!action) throw new Error(`No legal move for piece ${pieceIndex} with die ${dieId}`);

  const result = applyTacticalMove(state, playerId, action);
  return result;
}

/**
 * Check if a bank-die + piece combination is legal.
 */
export function tacticalIsValid(
  state: GameState,
  playerId: string,
  pieceIndex: number,
  bankDieId: string,
): boolean {
  return isLegalAction(state, playerId, bankDieId, pieceIndex);
}

/**
 * Get all legal tactical actions for the current player's bank.
 */
export function getTacticalActions(
  state: GameState,
  playerId: string,
): TacticalAction[] {
  return getLegalActions(state, playerId);
}

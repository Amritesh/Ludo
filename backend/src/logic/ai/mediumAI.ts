import { GameState, TacticalAction } from '../../types/game';
import { getLegalActionsForBankEntry } from '../moveGenerator';
import { SAFE_SQUARES, BOARD_SIZE, HOME_INDEX } from '../boardConfig';

/**
 * Medium AI:
 * - scans for kills
 * - understands basic safe-zone protection
 * - prefers arrow bonus opportunities
 * - avoids obvious self-exposure if an alternative exists
 */
export function getMediumMove(state: GameState, playerId: string): TacticalAction | null {
  const player = state.players.find(p => p.id === playerId);
  if (!player || state.turn.bank.length === 0) return null;

  const bankEntry = state.turn.bank[0];
  const actions = getLegalActionsForBankEntry(state, playerId, bankEntry);

  if (actions.length === 0) return null;

  const scoredActions = actions.map(action => ({
    action,
    score: scoreMediumMove(state, playerId, action)
  }));

  scoredActions.sort((a, b) => b.score - a.score);
  return scoredActions[0].action;
}

function scoreMediumMove(state: GameState, playerId: string, action: TacticalAction): number {
  let score = 0;
  const player = state.players.find(p => p.id === playerId)!;
  const targetPos = action.arrowGlide ? action.arrowGlide.headPosition : action.targetPosition;

  // 1. Prefer Kills
  if (targetPos < BOARD_SIZE && !SAFE_SQUARES.includes(targetPos)) {
    for (const otherPlayer of state.players) {
      if (otherPlayer.id === playerId) continue;
      if (otherPlayer.pieces.some(p => p.position === targetPos)) {
        score += 100; // Big bonus for kills
      }
    }
  }

  // 2. Prefer Arrow Bonuses
  if (action.arrowGlide) {
    score += 50;
  }

  // 3. Reaching Home
  if (targetPos === HOME_INDEX) {
    score += 80;
  }

  // 4. Entering Home Lane
  const currentPos = player.pieces[action.pieceIndex].position;
  if (targetPos >= 52 && currentPos < 52) {
    score += 40;
  }

  // 5. Safe Zone Protection
  if (SAFE_SQUARES.includes(targetPos)) {
    score += 30;
  }

  // 6. Basic exposure avoidance (very simple)
  // If landing on a non-safe square, small penalty
  if (targetPos < BOARD_SIZE && !SAFE_SQUARES.includes(targetPos)) {
    score -= 10;
  }

  // 7. Piece progression
  score += targetPos * 0.1;

  return score;
}

import { GameState, TacticalAction } from '../../types/game';
import { getLegalActionsForBankEntry } from '../moveGenerator';

/**
 * Easy AI:
 * - prioritize token closest to start (position -1 or low indices)
 * - spend bank values in rolled order
 * - little strategic foresight
 * - uses first legal move if many options
 */
export function getEasyMove(state: GameState, playerId: string): TacticalAction | null {
  const player = state.players.find(p => p.id === playerId);
  if (!player || state.turn.bank.length === 0) return null;

  // Use the first available die in the bank (rolled order)
  const bankEntry = state.turn.bank[0];
  const actions = getLegalActionsForBankEntry(state, playerId, bankEntry);

  if (actions.length === 0) {
    // This shouldn't happen if getLegalActions was checked before calling AI,
    // but we handle it just in case.
    return null;
  }

  // Prioritize token closest to start
  // Pieces with lower position values are "closer to start" (-1 is closest)
  const sortedActions = [...actions].sort((a, b) => {
    const pieceA = player.pieces[a.pieceIndex];
    const pieceB = player.pieces[b.pieceIndex];
    return pieceA.position - pieceB.position;
  });

  return sortedActions[0];
}

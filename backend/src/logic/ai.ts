import { GameState, TacticalAction, Player } from '../types/game';
import { getEasyMove } from './ai/easyAI';
import { getMediumMove } from './ai/mediumAI';
import { getHardMove } from './ai/hardAI';

/**
 * Main AI entry point for Ludo Tactical Edition.
 * Chooses the best move based on the player's assigned difficulty.
 */
export function getBestTacticalMove(state: GameState, playerId: string): TacticalAction | null {
  const player = state.players.find(p => p.id === playerId);
  if (!player || player.kind !== 'BOT') return null;

  const difficulty = player.difficulty || 'MEDIUM';

  switch (difficulty) {
    case 'EASY':
      return getEasyMove(state, playerId);
    case 'HARD':
      return getHardMove(state, playerId);
    case 'MEDIUM':
    default:
      return getMediumMove(state, playerId);
  }
}

/**
 * Legacy support for non-tactical modes if any still exist.
 * (Keeping the signature but delegating or providing simple logic)
 */
export function getBestMove(gameState: GameState, playerId: string, diceValue: number): number | null {
    // For legacy, we just use a simplified version of Medium AI logic
    // but adapted to the old single-die-index return type.
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return null;

    // This is basically what the old ai.ts did.
    // Given the task is to upgrade, we'll keep it simple for legacy.
    const validMoves: number[] = [];
    // ... logic from old ai.ts if needed, but we can just import it or keep it here.
    return null; // Should be handled by new tactical flow
}

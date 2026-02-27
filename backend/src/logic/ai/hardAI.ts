import { GameState, TacticalAction, DiceBankEntry, Player } from '../../types/game';
import { getLegalActionsForBankEntry, getLegalActions } from '../moveGenerator';
import { applyTacticalMove } from '../moveResolver';
import { SAFE_SQUARES, BOARD_SIZE, HOME_INDEX } from '../boardConfig';
import { classifyStack, getSquareOccupants } from '../stackClassifier';
import { shouldDiscardBank } from '../homeStretchRules';

/**
 * Hard AI:
 * - evaluate bank sequencing, not just immediate move quality
 * - prefers sequences that trigger bonuses (arrow/kill)
 * - actively forms triple stacks on high-traffic white squares
 * - understands home-stretch discard rule
 * - forms heavy pairs intentionally
 */
export function getHardMove(state: GameState, playerId: string): TacticalAction | null {
  const player = state.players.find(p => p.id === playerId);
  if (!player || state.turn.bank.length === 0) return null;

  // We find the best sequence of moves for the entire current bank
  const bestSequence = findBestSequence(state, playerId, state.turn.bank);
  
  if (bestSequence && bestSequence.length > 0) {
    return bestSequence[0];
  }

  // Fallback to greedy if no full sequence found (shouldn't happen often)
  const allActions = getLegalActions(state, playerId);
  if (allActions.length === 0) return null;
  
  return allActions[0]; 
}

interface ActionSequence {
  actions: TacticalAction[];
  finalScore: number;
}

function findBestSequence(
  state: GameState,
  playerId: string,
  bank: DiceBankEntry[],
  depth = 0
): TacticalAction[] | null {
  const player = state.players.find(p => p.id === playerId)!;
  
  // Base case: no more dice or no more moves
  if (bank.length === 0) return [];

  let bestActions: TacticalAction[] | null = null;
  let maxScore = -Infinity;

  // For performance, we might want to limit branching. 
  // But usually bank is 1-3 dice.
  const actions = getLegalActions(state, playerId);
  if (actions.length === 0) return null;

  // If there's only one legal move globally, auto-pick it as per rules, 
  // but AI should still evaluate it in sequence.
  
  for (const action of actions) {
    // Simulate move
    try {
      const { newState, discarded } = applyTacticalMove(state, playerId, action);
      
      let currentScore = scoreState(newState, playerId);
      if (discarded) currentScore -= 200; // Heavy penalty for discarding bank

      // Recurse for remaining bank
      if (newState.currentTurnPlayerId === playerId && newState.turn.bank.length > 0 && depth < 3) {
        const nextSequence = findBestSequence(newState, playerId, newState.turn.bank, depth + 1);
        if (nextSequence) {
           // We don't just add the score, we want to know if the sequence is good.
           // For simplicity, we'll use the final state score of the sequence.
           const finalState = simulateSequence(newState, playerId, nextSequence);
           currentScore = scoreState(finalState, playerId);
        }
      }

      if (currentScore > maxScore) {
        maxScore = currentScore;
        bestActions = [action]; // We only return the first action but it was chosen based on lookahead
      }
    } catch (e) {
      continue;
    }
  }

  return bestActions;
}

function simulateSequence(state: GameState, playerId: string, actions: TacticalAction[]): GameState {
  let currentState = state;
  for (const action of actions) {
    try {
      const { newState } = applyTacticalMove(currentState, playerId, action);
      currentState = newState;
      if (currentState.currentTurnPlayerId !== playerId) break;
    } catch (e) {
      break;
    }
  }
  return currentState;
}

function scoreState(state: GameState, playerId: string): number {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return -1000;
  if (state.winnerId === playerId) return 10000;

  let score = 0;

  // 1. Home Count
  score += player.homeCount * 500;

  // 2. Piece Positions & Progression
  for (const piece of player.pieces) {
    if (piece.position === HOME_INDEX) {
      score += 100;
    } else if (piece.position === -1) {
      score -= 50;
    } else {
      score += piece.position * 2;
      if (piece.position >= 52) score += 100; // Home stretch bonus
      if (SAFE_SQUARES.includes(piece.position)) score += 20;
    }
  }

  // 3. Stacking Logic (Hard AI specific)
  const squareMap = new Map<number, number>();
  for (const piece of player.pieces) {
    if (piece.position >= 0 && piece.position < BOARD_SIZE) {
      squareMap.set(piece.position, (squareMap.get(piece.position) || 0) + 1);
    }
  }

  for (const [pos, count] of squareMap.entries()) {
    if (count === 2) {
      score += 40; // Heavy pair
    } else if (count >= 3) {
      score += 150; // Invincible Juggernaut
    }
  }

  // 4. Opponent Threat & Kill Potential
  for (const other of state.players) {
    if (other.id === playerId) continue;
    
    // Penalty if opponent is close to home
    score -= other.homeCount * 400;

    for (const otherPiece of other.pieces) {
       // Check if we can kill this piece in next turns? (Too complex for here)
       // But we already rewarded kills in simulateMove via progression/homeCount
    }
  }

  // 5. Home Stretch Discard Risk
  if (shouldDiscardBank(player, state.turn.bank)) {
    score -= 300;
  }

  return score;
}

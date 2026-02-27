import { DiceBankEntry, GameState, Player, Piece } from '../types/game';
import { HOME_INDEX, BOARD_SIZE } from './boardConfig';
import { sumBank } from './diceBank';

/**
 * Returns true when ALL of the player's active (non-finished, non-yard) pieces
 * are already inside the home stretch (positions 52–57).
 *
 * If any piece is still on the outer track (0–51) or in the yard (-1),
 * the discard rule does NOT apply.
 */
export function isHomeStretchOnlyState(player: Player): boolean {
  for (const piece of player.pieces) {
    if (piece.position === HOME_INDEX) continue;    // finished
    if (piece.position === -1) continue;             // in yard (not active on track)
    if (piece.position < 52) return false;           // still on outer track
  }
  // All non-yard, non-home pieces are in home stretch (52–57)
  // Make sure there IS at least one active home-stretch piece
  return player.pieces.some(p => p.position >= 52 && p.position < HOME_INDEX);
}

/**
 * Sum of exact steps needed for every unfinished home-stretch piece to reach HOME.
 * Pieces in the yard or already at HOME are excluded.
 */
export function getRequiredExactStepsToVictory(player: Player): number {
  let total = 0;
  for (const piece of player.pieces) {
    if (piece.position >= 52 && piece.position < HOME_INDEX) {
      total += HOME_INDEX - piece.position;
    }
  }
  return total;
}

/**
 * Recursive DFS: can the entire `bank` be legally consumed starting from the
 * given set of home-stretch piece positions?
 *
 * Home-stretch-only move rules:
 *  - A die of value V can be spent on a piece at position P if P + V <= HOME_INDEX.
 *  - No arrows, no kills, no bonus dice in home stretch — simple forward movement only.
 *
 * Memoization key: sorted piece positions + sorted bank values.
 */
export function canConsumeEntireBankInHomeStretch(
  piecesPositions: number[],
  bank: DiceBankEntry[],
  memo: Map<string, boolean> = new Map(),
): boolean {
  if (bank.length === 0) return true; // bank empty → success

  const key = [...piecesPositions].sort().join(',') + '|' + [...bank.map(e => e.value)].sort().join(',');
  if (memo.has(key)) return memo.get(key)!;

  for (let bi = 0; bi < bank.length; bi++) {
    const die = bank[bi];
    const restBank = [...bank.slice(0, bi), ...bank.slice(bi + 1)];

    for (let pi = 0; pi < piecesPositions.length; pi++) {
      const pos = piecesPositions[pi];
      if (pos < 52 || pos >= HOME_INDEX) continue; // not an active home-stretch piece
      const newPos = pos + die.value;
      if (newPos > HOME_INDEX) continue; // would overshoot

      const newPositions = [...piecesPositions];
      newPositions[pi] = newPos === HOME_INDEX ? -999 : newPos; // mark finished pieces
      if (canConsumeEntireBankInHomeStretch(newPositions, restBank, memo)) {
        memo.set(key, true);
        return true;
      }
    }
  }

  memo.set(key, false);
  return false;
}

/**
 * Check whether the strict total-sum discard rule triggers for this player.
 *
 * Returns true (→ discard bank) when ALL of these conditions hold:
 *  1. Player is in home-stretch-only state.
 *  2. There is no valid sequence of moves that consumes the entire bank legally.
 *
 * When the function returns false, the player proceeds normally.
 */
export function shouldDiscardBank(player: Player, bank: DiceBankEntry[]): boolean {
  if (!isHomeStretchOnlyState(player)) return false;
  if (bank.length === 0) return false;

  const positions = player.pieces
    .filter(p => p.position >= 52 && p.position < HOME_INDEX)
    .map(p => p.position);

  if (positions.length === 0) return false;

  return !canConsumeEntireBankInHomeStretch(positions, bank);
}

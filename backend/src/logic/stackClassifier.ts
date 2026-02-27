import { Color, SquareOccupant, StackDescriptor, StackType } from '../types/game';
import { areAllied, isHeavyPairFormationSquare, getSquareType } from './boardConfig';

/**
 * Classify the stack on a given square based on its occupants.
 *
 * Rules:
 *  EMPTY           – no occupants
 *  SINGLE          – one token
 *  HEAVY_PAIR      – exactly 2 same-color tokens on a formation-eligible square
 *  MULTI_STACK_3   – 3 same-color tokens
 *  MULTI_STACK_4   – 4 same-color tokens
 *  ALLIED_STACK    – tokens from two allied colors (invincible)
 *  MIXED_ENEMY     – enemy tokens co-existing (single sitting on enemy heavy pair)
 */
export function classifyStack(
  occupants: SquareOccupant[],
  squarePosition: number,
): StackDescriptor {
  if (occupants.length === 0) {
    return { type: 'EMPTY', occupants: [], isInvincible: false, isPair: false };
  }

  // Group by playerId
  const byPlayer = groupByPlayer(occupants);
  const playerIds = Object.keys(byPlayer);
  const byColor = groupByColor(occupants);
  const colors = Object.keys(byColor) as Color[];

  // ── Single token ──────────────────────────────────────────────────────────
  if (occupants.length === 1) {
    return { type: 'SINGLE', occupants, isInvincible: false, isPair: false };
  }

  // ── All same color ────────────────────────────────────────────────────────
  if (colors.length === 1) {
    const count = occupants.length;
    if (count === 2) {
      const isFormationSquare = isHeavyPairFormationSquare(squarePosition);
      return {
        type: isFormationSquare ? 'HEAVY_PAIR' : 'HEAVY_PAIR',
        occupants,
        isInvincible: false,
        isPair: true,
      };
    }
    if (count === 3) {
      return { type: 'MULTI_STACK_3', occupants, isInvincible: true, isPair: false };
    }
    if (count >= 4) {
      return { type: 'MULTI_STACK_4', occupants, isInvincible: true, isPair: false };
    }
  }

  // ── Two colors present ────────────────────────────────────────────────────
  if (colors.length === 2) {
    const [c1, c2] = colors;
    if (areAllied(c1, c2)) {
      // Allied colors on same square → invincible allied stack
      return { type: 'ALLIED_STACK', occupants, isInvincible: true, isPair: false };
    }

    // Non-allied mixed presence — check for the SINGLE-on-HEAVY_PAIR coexist case
    // Count tokens per color
    const c1Count = byColor[c1].length;
    const c2Count = byColor[c2].length;

    // If one color has 2 (heavy pair) and the other has 1 (single) → MIXED_ENEMY
    if (
      (c1Count === 2 && c2Count === 1) ||
      (c1Count === 1 && c2Count === 2)
    ) {
      return { type: 'MIXED_ENEMY', occupants, isInvincible: false, isPair: false };
    }

    // Any other mixed enemy state — treat as MIXED_ENEMY (edge case)
    return { type: 'MIXED_ENEMY', occupants, isInvincible: false, isPair: false };
  }

  // ── 3+ colors – treat as MIXED_ENEMY ─────────────────────────────────────
  return { type: 'MIXED_ENEMY', occupants, isInvincible: false, isPair: false };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groupByPlayer(
  occupants: SquareOccupant[],
): Record<string, SquareOccupant[]> {
  const result: Record<string, SquareOccupant[]> = {};
  for (const o of occupants) {
    if (!result[o.playerId]) result[o.playerId] = [];
    result[o.playerId].push(o);
  }
  return result;
}

function groupByColor(
  occupants: SquareOccupant[],
): Record<Color, SquareOccupant[]> {
  const result: Record<string, SquareOccupant[]> = {};
  for (const o of occupants) {
    if (!result[o.color]) result[o.color] = [];
    result[o.color].push(o);
  }
  return result as Record<Color, SquareOccupant[]>;
}

/**
 * Build the occupant list for a given square from the full game state's players.
 */
export function getSquareOccupants(
  players: Array<{ id: string; color: Color; pieces: Array<{ id: number; position: number }> }>,
  squarePosition: number,
): SquareOccupant[] {
  const occupants: SquareOccupant[] = [];
  for (const player of players) {
    for (const piece of player.pieces) {
      if (piece.position === squarePosition) {
        occupants.push({
          playerId: player.id,
          color: player.color,
          pieceIndex: piece.id,
        });
      }
    }
  }
  return occupants;
}

/**
 * Returns all pieces of a player that are part of a heavy pair at their current position.
 * The returned tuples are [pieceIndexA, pieceIndexB] per pair.
 */
export function findPairsForPlayer(
  player: { id: string; color: Color; pieces: Array<{ id: number; position: number }> },
  allPlayers: Array<{ id: string; color: Color; pieces: Array<{ id: number; position: number }> }>,
): Array<[number, number]> {
  const pairs: Array<[number, number]> = [];
  const seen = new Set<number>();

  for (let i = 0; i < player.pieces.length; i++) {
    if (seen.has(i)) continue;
    const pos = player.pieces[i].position;
    if (pos < 0 || pos >= 52) continue; // Not on common track

    // Find another piece of same color/player at same position
    for (let j = i + 1; j < player.pieces.length; j++) {
      if (seen.has(j)) continue;
      if (player.pieces[j].position === pos) {
        pairs.push([i, j]);
        seen.add(i);
        seen.add(j);
        break;
      }
    }
  }
  return pairs;
}

/**
 * Given a pieceIndex, find its partner in a heavy pair (if any).
 * Returns the partner's pieceIndex or null.
 */
export function findPairPartner(
  player: { pieces: Array<{ id: number; position: number }> },
  pieceIndex: number,
): number | null {
  const pos = player.pieces[pieceIndex]?.position;
  if (pos === undefined || pos < 0 || pos >= 52) return null;

  for (let i = 0; i < player.pieces.length; i++) {
    if (i === pieceIndex) continue;
    if (player.pieces[i].position === pos) return i;
  }
  return null;
}

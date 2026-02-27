import { Color, SquareType } from '../types/game';

// ─── Board Constants ──────────────────────────────────────────────────────────
export const BOARD_SIZE = 52;
export const HOME_LANE_LENGTH = 6;
export const HOME_INDEX = 58;

export const START_INDICES: Record<Color, number> = {
  RED: 0,
  GREEN: 13,
  YELLOW: 26,
  BLUE: 39,
};

export const HOME_LANE_ENTRY_INDICES: Record<Color, number> = {
  RED: 51,
  GREEN: 12,
  YELLOW: 25,
  BLUE: 38,
};

// Safe squares: start squares (0,13,26,39) + mid-path rhombus squares (8,21,34,47)
export const SAFE_SQUARES = [0, 8, 13, 21, 26, 34, 39, 47];

// Start box squares for each color (where pieces land when coming out of yard)
export const START_BOX_SQUARES: number[] = [0, 13, 26, 39];

// Safe rhombus squares (mid-path safe zones)
export const SAFE_RHOMBUS_SQUARES: number[] = [8, 21, 34, 47];

// ─── Alliance Mapping ─────────────────────────────────────────────────────────
// Diagonal allies: RED↔YELLOW, GREEN↔BLUE (based on corner positions)
export const ALLY_MAP: Record<Color, Color> = {
  RED: 'YELLOW',
  YELLOW: 'RED',
  GREEN: 'BLUE',
  BLUE: 'GREEN',
};

export function areAllied(a: Color, b: Color): boolean {
  return ALLY_MAP[a] === b;
}

// ─── Square Type Classification ──────────────────────────────────────────────

/**
 * Outer arrow tails and heads (4 symmetric arrows, one per side of the board).
 * Tails are on the "elbow" segment of each track leg; heads are ~5 squares ahead.
 * These are not safe squares, so kills at the head ARE possible.
 */
export const OUTER_ARROW_TAILS: Record<number, { head: number }> = {
  4:  { head: 9  }, // Bottom-left leg → left middle
  17: { head: 22 }, // Left-top leg → top-left
  30: { head: 35 }, // Top-right leg → right top
  43: { head: 48 }, // Right-bottom leg → bottom right
};

/**
 * Inner arrow tails: at the "corner" turning points of the outer track.
 * Only tokens whose color matches `eligibleColor` can use the shortcut;
 * other tokens treat it as a normal square.
 * Head is always 52 (first home-lane square) for the eligible color.
 */
export const INNER_ARROW_TAILS: Record<number, { head: number; eligibleColor: Color }> = {
  11: { head: 52, eligibleColor: 'GREEN'  }, // Corner before GREEN entry (12)
  24: { head: 52, eligibleColor: 'YELLOW' }, // Corner before YELLOW entry (25)
  37: { head: 52, eligibleColor: 'BLUE'   }, // Corner before BLUE entry (38)
  50: { head: 52, eligibleColor: 'RED'    }, // Corner before RED entry (51)
};

// ─── Square Type Helper ───────────────────────────────────────────────────────
export function getSquareType(position: number): SquareType {
  if (position === -1) return 'HOUSE_YARD';
  if (position === HOME_INDEX) return 'FINAL_TRIANGLE';
  if (position >= 52 && position < HOME_INDEX) return 'HOME_STRETCH';
  if (position < 0 || position >= BOARD_SIZE) return 'HOUSE_YARD'; // fallback

  if (OUTER_ARROW_TAILS[position] !== undefined) return 'ARROW_OUTER_TAIL';
  if (INNER_ARROW_TAILS[position] !== undefined) return 'ARROW_INNER_TAIL';
  if (START_BOX_SQUARES.includes(position)) return 'START_BOX';
  if (SAFE_RHOMBUS_SQUARES.includes(position)) return 'SAFE_RHOMBUS';
  return 'OUTER_TRACK_WHITE';
}

/**
 * Returns whether a square is "pair-split-safe" — i.e., a heavy pair there
 * is allowed to move as individuals instead of being forced to move together.
 */
export function isPairSplitSafe(position: number): boolean {
  return START_BOX_SQUARES.includes(position) || SAFE_RHOMBUS_SQUARES.includes(position);
}

/**
 * Returns whether a square allows heavy pair FORMATION
 * (any common-track square, including safe squares).
 */
export function isHeavyPairFormationSquare(position: number): boolean {
  return position >= 0 && position < BOARD_SIZE;
}

// ─── Path Calculation ─────────────────────────────────────────────────────────
/**
 * Returns the sequence of positions a piece visits when moving `steps` squares.
 * Returns empty array if the move is not possible.
 */
export function getPiecePath(color: Color, startPos: number, steps: number): number[] {
  const path: number[] = [];
  let cur = startPos;

  for (let i = 0; i < steps; i++) {
    if (cur === -1) {
      if (steps === 6) {
        cur = START_INDICES[color];
        path.push(cur);
        return path;
      }
      return [];
    } else if (cur < BOARD_SIZE) {
      const entry = HOME_LANE_ENTRY_INDICES[color];
      if (cur === entry) {
        cur = 52;
      } else {
        cur = (cur + 1) % BOARD_SIZE;
      }
    } else if (cur < HOME_INDEX) {
      cur++;
    } else {
      return []; // already home
    }

    if (cur > HOME_INDEX) return []; // overshoot
    path.push(cur);
  }

  return path;
}

/**
 * Returns all positions a token of this color occupies on the HOME STRETCH
 * (52–57) that still need movement to reach HOME_INDEX (58).
 */
export function getActiveHomeStretchPositions(pieces: { position: number }[]): number[] {
  return pieces
    .map(p => p.position)
    .filter(pos => pos >= 52 && pos < HOME_INDEX);
}

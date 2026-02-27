import { Color } from '../types/game';
import {
  OUTER_ARROW_TAILS,
  INNER_ARROW_TAILS,
  SAFE_SQUARES,
} from './boardConfig';

export interface ArrowEffect {
  type: 'OUTER' | 'INNER';
  tailPosition: number;
  headPosition: number;
}

/**
 * Check if a token landing at `position` triggers an outer arrow glide.
 * All tokens are eligible for outer arrows.
 * Returns the arrow effect, or null if no outer arrow is at this position.
 */
export function checkOuterArrow(position: number): ArrowEffect | null {
  const arrow = OUTER_ARROW_TAILS[position];
  if (!arrow) return null;
  return { type: 'OUTER', tailPosition: position, headPosition: arrow.head };
}

/**
 * Check if a token landing at `position` triggers an inner arrow glide.
 * Only tokens of the `eligibleColor` are eligible.
 * Non-eligible tokens treat the square as ordinary.
 */
export function checkInnerArrow(
  position: number,
  tokenColor: Color,
): ArrowEffect | null {
  const arrow = INNER_ARROW_TAILS[position];
  if (!arrow) return null;
  if (arrow.eligibleColor !== tokenColor) return null;
  return { type: 'INNER', tailPosition: position, headPosition: arrow.head };
}

/**
 * Determine if a token is eligible for ANY arrow effect after landing at `position`.
 * Eligibility is checked in this order: outer arrow first, then inner.
 */
export function resolveArrowEffect(
  position: number,
  tokenColor: Color,
): ArrowEffect | null {
  const outer = checkOuterArrow(position);
  if (outer) return outer;
  const inner = checkInnerArrow(position, tokenColor);
  return inner;
}

/**
 * Returns true if an arrow head position allows killing
 * (i.e. it is NOT a safe square). Capture at arrow head follows
 * combat matrix rules just like normal landing.
 */
export function arrowHeadAllowsKill(headPosition: number): boolean {
  return !SAFE_SQUARES.includes(headPosition);
}

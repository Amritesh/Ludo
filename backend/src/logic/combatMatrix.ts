import { Color, LandingResolutionType, StackDescriptor, StackType } from '../types/game';
import { SAFE_SQUARES } from './boardConfig';

/**
 * Resolve how an attacker interacts with occupants at the target square.
 *
 * Combat matrix (attacker → defender):
 *   SINGLE   → SINGLE               : CAPTURE
 *   SINGLE   → HEAVY_PAIR           : COEXIST_NO_CAPTURE (attacker "sits on top")
 *   SINGLE   → 3+/ALLIED/INVINCIBLE : BLOCKED
 *   HEAVY_PAIR → SINGLE             : CAPTURE
 *   HEAVY_PAIR → HEAVY_PAIR         : CAPTURE
 *   HEAVY_PAIR → 3+/ALLIED          : BLOCKED
 *   3+/ALLIED  → SINGLE             : CAPTURE
 *   3+/ALLIED  → HEAVY_PAIR         : CAPTURE
 *   3+/ALLIED  → 3+/ALLIED          : BLOCKED
 *
 * Safe-square override: no CAPTURE possible on safe squares.
 * MIXED_ENEMY squares: the attacking single can still land (treated as NORMAL_LAND
 * since the pair already coexists there).
 */
export function resolveLandingInteraction(
  attackerStack: StackDescriptor,
  targetStack: StackDescriptor,
  targetPosition: number,
  attackerColor: Color,
): LandingResolutionType {
  // Empty target: always normal land
  if (targetStack.type === 'EMPTY') return 'NORMAL_LAND';

  // Check if attacker and target share the same color (own pieces) → normal land/stack
  const allSameColor = targetStack.occupants.every(o => o.color === attackerColor);
  if (allSameColor) return 'NORMAL_LAND'; // stacking own pieces

  // Safe square: no capture allowed
  const isSafe = SAFE_SQUARES.includes(targetPosition);
  if (isSafe) return 'NORMAL_LAND'; // co-occupy but can't capture

  // Invincible targets are always BLOCKED
  if (targetStack.isInvincible) return 'BLOCKED';

  const atk = attackerStack.type;
  const def = targetStack.type;

  // BLOCKED: attacker is stopped by multi-stack or allied stack
  if (def === 'MULTI_STACK_3' || def === 'MULTI_STACK_4' || def === 'ALLIED_STACK') {
    return 'BLOCKED';
  }

  // MIXED_ENEMY: a single landing on a square that already has a MIXED_ENEMY
  // coexistence. Allow landing as normal (the pair is still immune).
  if (def === 'MIXED_ENEMY') return 'NORMAL_LAND';

  if (atk === 'SINGLE') {
    if (def === 'SINGLE') return 'CAPTURE';
    if (def === 'HEAVY_PAIR') return 'COEXIST_NO_CAPTURE';
    return 'BLOCKED';
  }

  if (atk === 'HEAVY_PAIR') {
    if (def === 'SINGLE') return 'CAPTURE';
    if (def === 'HEAVY_PAIR') return 'CAPTURE';
    return 'BLOCKED';
  }

  // 3+/ALLIED attacker
  if (
    atk === 'MULTI_STACK_3' ||
    atk === 'MULTI_STACK_4' ||
    atk === 'ALLIED_STACK'
  ) {
    if (def === 'SINGLE') return 'CAPTURE';
    if (def === 'HEAVY_PAIR') return 'CAPTURE';
    return 'BLOCKED';
  }

  return 'NORMAL_LAND';
}

/**
 * Utility: check if a capture is possible at the given position by an attacker.
 */
export function canCapture(
  attackerStack: StackDescriptor,
  targetStack: StackDescriptor,
  targetPosition: number,
  attackerColor: Color,
): boolean {
  const res = resolveLandingInteraction(
    attackerStack, targetStack, targetPosition, attackerColor,
  );
  return res === 'CAPTURE';
}

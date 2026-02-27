import { Color, DiceBankEntry, GameState, Player, TacticalAction } from '../types/game';
import {
  getPiecePath,
  HOME_INDEX,
  BOARD_SIZE,
  isPairSplitSafe,
  SAFE_SQUARES,
  isHeavyPairFormationSquare,
} from './boardConfig';
import { classifyStack, getSquareOccupants, findPairPartner } from './stackClassifier';
import { resolveLandingInteraction } from './combatMatrix';
import { resolveArrowEffect } from './arrowResolver';

// ─── Core move legality ───────────────────────────────────────────────────────

/**
 * Returns all legal TacticalActions the player can take for a specific bank die.
 * Handles: single moves, heavy pair moves, pair-split moves, arrow glides,
 * combat matrix (BLOCKED / COEXIST / CAPTURE / NORMAL).
 */
export function getLegalActionsForBankEntry(
  state: GameState,
  playerId: string,
  bankEntry: DiceBankEntry,
): TacticalAction[] {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return [];

  const actions: TacticalAction[] = [];

  for (let pieceIndex = 0; pieceIndex < player.pieces.length; pieceIndex++) {
    const piece = player.pieces[pieceIndex];
    if (piece.position === HOME_INDEX) continue; // already done

    // ── Pieces in yard ────────────────────────────────────────────────────────
    if (piece.position === -1) {
      if (bankEntry.value === 6) {
        const targetPos = getPiecePath(player.color, -1, 6)[0];
        if (targetPos !== undefined) {
          // Check if start square is blocked by an invincible enemy stack
          const occupants = getSquareOccupants(state.players, targetPos);
          const targetStack = classifyStack(occupants, targetPos);
          const attackerSingleStack = classifyStack(
            [{ playerId, color: player.color, pieceIndex }], targetPos,
          );
          const res = resolveLandingInteraction(attackerSingleStack, targetStack, targetPos, player.color);
          if (res !== 'BLOCKED') {
            actions.push({
              bankDieId: bankEntry.id,
              bankDieValue: bankEntry.value,
              pieceIndex,
              isPairMove: false,
              targetPosition: targetPos,
            });
          }
        }
      }
      continue;
    }

    // ── Pieces on common track (0-51) ─────────────────────────────────────────
    if (piece.position < BOARD_SIZE) {
      const pairPartner = findPairPartner(player, pieceIndex);
      const hasPair = pairPartner !== null;
      const squareIsSplitSafe = isPairSplitSafe(piece.position);

      if (hasPair) {
        // On outer track: must use even dice. On split-safe squares: can also split.
        const isEvenDie = bankEntry.value % 2 === 0;

        // PAIRED move (requires even die)
        if (isEvenDie) {
          const pairMoveSteps = bankEntry.value / 2;
          const path = getPiecePath(player.color, piece.position, pairMoveSteps);
          if (path.length === pairMoveSteps && path[path.length - 1] <= HOME_INDEX) {
            const targetPos = path[path.length - 1];
            const landingPos = resolveArrowEffectForPath(targetPos, player.color);

            // Build attacker stack as HEAVY_PAIR
            const attackerOccupants = [
              { playerId, color: player.color, pieceIndex },
              { playerId, color: player.color, pieceIndex: pairPartner! },
            ];
            const attackerStack = classifyStack(attackerOccupants, targetPos);
            const defenderOccupants = getSquareOccupants(state.players, landingPos);
            const targetStack = classifyStack(defenderOccupants, landingPos);
            const res = resolveLandingInteraction(attackerStack, targetStack, landingPos, player.color);

            if (res !== 'BLOCKED') {
              const arrow = resolveArrowEffect(targetPos, player.color);
              actions.push({
                bankDieId: bankEntry.id,
                bankDieValue: bankEntry.value,
                pieceIndex,
                isPairMove: true,
                pairedPieceIndex: pairPartner!,
                targetPosition: targetPos,
                arrowGlide: arrow ? { headPosition: landingPos } : undefined,
              });
            }
          }
        }

        // INDIVIDUAL move (only at split-safe squares)
        if (squareIsSplitSafe) {
          const path = getPiecePath(player.color, piece.position, bankEntry.value);
          if (path.length === bankEntry.value && path[path.length - 1] <= HOME_INDEX) {
            const targetPos = path[path.length - 1];
            const landingPos = resolveArrowEffectForPath(targetPos, player.color);
            const attackerSingleStack = classifyStack(
              [{ playerId, color: player.color, pieceIndex }], targetPos,
            );
            const defenderOccupants = getSquareOccupants(state.players, landingPos);
            const targetStack = classifyStack(defenderOccupants, landingPos);
            const res = resolveLandingInteraction(attackerSingleStack, targetStack, landingPos, player.color);

            if (res !== 'BLOCKED') {
              const arrow = resolveArrowEffect(targetPos, player.color);
              actions.push({
                bankDieId: bankEntry.id,
                bankDieValue: bankEntry.value,
                pieceIndex,
                isPairMove: false,
                targetPosition: targetPos,
                arrowGlide: arrow ? { headPosition: landingPos } : undefined,
              });
            }
          }
        }
      } else {
        // ── SINGLE token on common track ─────────────────────────────────────
        const path = getPiecePath(player.color, piece.position, bankEntry.value);
        if (path.length === bankEntry.value && path[path.length - 1] <= HOME_INDEX) {
          const targetPos = path[path.length - 1];
          const landingPos = resolveArrowEffectForPath(targetPos, player.color);
          const attackerSingleStack = classifyStack(
            [{ playerId, color: player.color, pieceIndex }], targetPos,
          );
          const defenderOccupants = getSquareOccupants(state.players, landingPos);
          const targetStack = classifyStack(defenderOccupants, landingPos);
          const res = resolveLandingInteraction(attackerSingleStack, targetStack, landingPos, player.color);

          if (res !== 'BLOCKED') {
            const arrow = resolveArrowEffect(targetPos, player.color);
            actions.push({
              bankDieId: bankEntry.id,
              bankDieValue: bankEntry.value,
              pieceIndex,
              isPairMove: false,
              targetPosition: targetPos,
              arrowGlide: arrow ? { headPosition: landingPos } : undefined,
            });
          }
        }
      }
    }

    // ── Pieces in home stretch (52-57) ────────────────────────────────────────
    if (piece.position >= 52 && piece.position < HOME_INDEX) {
      const newPos = piece.position + bankEntry.value;
      if (newPos <= HOME_INDEX) {
        actions.push({
          bankDieId: bankEntry.id,
          bankDieValue: bankEntry.value,
          pieceIndex,
          isPairMove: false,
          targetPosition: newPos,
        });
      }
    }
  }

  return deduplicateActions(actions);
}

/**
 * Returns all legal TacticalActions across all bank entries.
 */
export function getLegalActions(state: GameState, playerId: string): TacticalAction[] {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return [];

  const allActions: TacticalAction[] = [];
  for (const bankEntry of state.turn.bank) {
    const bankActions = getLegalActionsForBankEntry(state, playerId, bankEntry);
    allActions.push(...bankActions);
  }
  return deduplicateActions(allActions);
}

// ─── Helper: Arrow head resolution ───────────────────────────────────────────

/**
 * If the token would land on an arrow tail, return the final landing position (head).
 * Otherwise returns the position unchanged.
 */
function resolveArrowEffectForPath(position: number, color: Color): number {
  const arrow = resolveArrowEffect(position, color);
  return arrow ? arrow.headPosition : position;
}

// ─── Deduplication ────────────────────────────────────────────────────────────
function deduplicateActions(actions: TacticalAction[]): TacticalAction[] {
  const seen = new Set<string>();
  return actions.filter(a => {
    const key = `${a.bankDieId}:${a.pieceIndex}:${a.isPairMove}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Validation helpers ───────────────────────────────────────────────────────

/**
 * Check if a specific (bankDieId, pieceIndex, isPairMove) combination is legal.
 */
export function isLegalAction(
  state: GameState,
  playerId: string,
  bankDieId: string,
  pieceIndex: number,
): boolean {
  const bankEntry = state.turn.bank.find(e => e.id === bankDieId);
  if (!bankEntry) return false;
  const actions = getLegalActionsForBankEntry(state, playerId, bankEntry);
  return actions.some(a => a.pieceIndex === pieceIndex && a.bankDieId === bankDieId);
}

/**
 * Given a pieceIndex, find the best (first valid) bank die to use for this piece.
 * Used when the client doesn't specify bankDieId.
 */
export function autoPickBankDie(
  state: GameState,
  playerId: string,
  pieceIndex: number,
): string | null {
  for (const bankEntry of state.turn.bank) {
    const actions = getLegalActionsForBankEntry(state, playerId, bankEntry);
    if (actions.some(a => a.pieceIndex === pieceIndex)) {
      return bankEntry.id;
    }
  }
  return null;
}

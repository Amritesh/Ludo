import {
  BonusTrigger,
  DiceBankEntry,
  GameState,
  StateTransitionResult,
  TacticalAction,
} from '../types/game';
import {
  HOME_INDEX,
  BOARD_SIZE,
  START_INDICES,
  SAFE_SQUARES,
  getPiecePath,
} from './boardConfig';
import { classifyStack, getSquareOccupants } from './stackClassifier';
import { resolveLandingInteraction } from './combatMatrix';
import { resolveArrowEffect } from './arrowResolver';
import { rollBonusDie, removeDieFromBank } from './diceBank';
import { shouldDiscardBank } from './homeStretchRules';
import { getLegalActions } from './moveGenerator';

/**
 * Apply a tactical action to the game state.
 *
 * This is the authoritative move resolver. It:
 *  1. Removes the spent die from the bank.
 *  2. Moves the piece (and its pair-partner if this is a pair move).
 *  3. Resolves arrow glide effects.
 *  4. Resolves combat at the landing square.
 *  5. Adds bonus rolls to the bank for arrows and kills.
 *  6. Checks if the bank should be discarded (home-stretch-only rule).
 *  7. Transitions phase: NEED_MOVE (bank has entries) or NEED_ROLL (next player).
 */
export function applyTacticalMove(
  state: GameState,
  playerId: string,
  action: TacticalAction,
): StateTransitionResult {
  const newState: GameState = JSON.parse(JSON.stringify(state));
  const player = newState.players.find(p => p.id === playerId)!;
  const piece = player.pieces[action.pieceIndex];
  const bonusTriggers: BonusTrigger[] = [];

  // 1. Remove spent die
  newState.turn.bank = removeDieFromBank(newState.turn.bank, action.bankDieId);
  newState.turn.bankSequence++;

  // 2. Move piece (and pair partner)
  const oldPos = piece.position;
  let targetPos = action.targetPosition;
  piece.position = targetPos;

  if (action.isPairMove && action.pairedPieceIndex !== undefined) {
    player.pieces[action.pairedPieceIndex].position = targetPos;
  }

  // 3. Arrow glide
  let arrowGlide: { from: number; to: number } | undefined;
  const arrowEffect = resolveArrowEffect(targetPos, player.color);
  if (arrowEffect) {
    arrowGlide = { from: targetPos, to: arrowEffect.headPosition };
    piece.position = arrowEffect.headPosition;
    if (action.isPairMove && action.pairedPieceIndex !== undefined) {
      player.pieces[action.pairedPieceIndex].position = arrowEffect.headPosition;
    }
    targetPos = arrowEffect.headPosition;

    // Arrow bonus roll
    const arrowBonus = rollBonusDie('ARROW_BONUS', newState.turn.bankSequence++);
    newState.turn.bank.push(arrowBonus);
    bonusTriggers.push({ type: arrowEffect.type === 'OUTER' ? 'ARROW_OUTER' : 'ARROW_INNER', roll: arrowBonus.value });
  }

  // 4. Combat resolution at final landing position
  let cutInfo: { victimId: string; victimPieceIndex: number } | undefined;

  if (targetPos < BOARD_SIZE && !SAFE_SQUARES.includes(targetPos)) {
    // Build attacker stack (what we are now)
    const attackerOccupantsAtTarget = action.isPairMove
      ? [
          { playerId, color: player.color, pieceIndex: action.pieceIndex },
          { playerId, color: player.color, pieceIndex: action.pairedPieceIndex! },
        ]
      : [{ playerId, color: player.color, pieceIndex: action.pieceIndex }];
    const attackerStack = classifyStack(attackerOccupantsAtTarget, targetPos);

    // Defender: everyone else already there
    const defenderOccupants = getSquareOccupants(newState.players, targetPos).filter(
      o => o.playerId !== playerId,
    );
    const defenderStack = classifyStack(defenderOccupants, targetPos);

    const resolution = resolveLandingInteraction(
      attackerStack, defenderStack, targetPos, player.color,
    );

    if (resolution === 'CAPTURE') {
      // Kill all defender pieces at this position
      for (const otherPlayer of newState.players) {
        if (otherPlayer.id === playerId) continue;
        for (let i = 0; i < otherPlayer.pieces.length; i++) {
          if (otherPlayer.pieces[i].position === targetPos) {
            otherPlayer.pieces[i].position = -1;
            cutInfo = { victimId: otherPlayer.id, victimPieceIndex: i };
          }
        }
      }
      // Kill bonus roll
      const killBonus = rollBonusDie('KILL_BONUS', newState.turn.bankSequence++);
      newState.turn.bank.push(killBonus);
      bonusTriggers.push({ type: 'KILL', roll: killBonus.value });
    }
    // COEXIST_NO_CAPTURE and BLOCKED should already be filtered by moveGenerator
  }

  // 5. Home completion
  if (targetPos === HOME_INDEX) {
    player.homeCount++;
    if (action.isPairMove && action.pairedPieceIndex !== undefined) {
      player.homeCount++; // Both pieces reach home
    }
  }

  // Build last event payload
  newState.lastEvent = {
    type: 'PIECE_MOVED',
    playerId,
    payload: {
      pieceIndex: action.pieceIndex,
      from: oldPos,
      to: targetPos,
      path: getPiecePath(player.color, oldPos, action.bankDieValue),
      isPairMove: action.isPairMove,
      pairedPieceIndex: action.pairedPieceIndex,
      pairedPieceTo: action.isPairMove ? targetPos : undefined,
      cut: cutInfo,
      arrowGlide,
      bonusRolls: newState.turn.bank.slice(-bonusTriggers.length),
      bankDieId: action.bankDieId,
    },
    timestamp: Date.now(),
  };

  // 6. Win condition
  if (player.homeCount === 4) {
    newState.status = 'FINISHED';
    newState.winnerId = playerId;
    newState.lastEvent = {
      type: 'GAME_FINISHED',
      playerId,
      payload: { winnerId: playerId },
      timestamp: Date.now(),
    };
    newState.turn.bank = [];
    newState.turn.turnNonce = newRandNonce();
    newState.updatedAt = Date.now();
    return { newState, bonusTriggers, discarded: false };
  }

  // 7. Home-stretch-only discard check
  let discarded = false;
  if (newState.turn.bank.length > 0) {
    if (shouldDiscardBank(player, newState.turn.bank)) {
      newState.turn.bank = [];
      newState.turn.discardEvent = {
        reason: 'Bank discarded: total sum exceeds exact remaining requirement',
      };
      discarded = true;
      newState.lastEvent = {
        type: 'BANK_DISCARDED',
        playerId,
        payload: { reason: newState.turn.discardEvent.reason },
        timestamp: Date.now(),
      };
    }
  }

  // 8. Check if any legal moves remain for remaining bank
  if (!discarded && newState.turn.bank.length > 0) {
    const remainingActions = getLegalActions(newState, playerId);
    if (remainingActions.length === 0) {
      newState.turn.bank = [];
      discarded = true;
    }
  }

  // 9. Phase transition
  if (newState.turn.bank.length === 0) {
    // End turn: pass to next player
    const idx = newState.players.findIndex(p => p.id === playerId);
    const nextIdx = (idx + 1) % newState.players.length;
    newState.currentTurnPlayerId = newState.players[nextIdx].id;
    newState.turn.phase = 'NEED_ROLL';
    newState.turn.diceValue = undefined;
    newState.turn.discardEvent = undefined;
    newState.turn.extraTurnChain = 0;
  } else {
    newState.turn.phase = 'NEED_MOVE';
  }

  newState.turn.turnNonce = newRandNonce();
  newState.updatedAt = Date.now();

  return { newState, bonusTriggers, discarded };
}

function newRandNonce(): string {
  return Math.random().toString(36).substring(7);
}

/**
 * Apply a tactical roll: add initial die (and any chain 6 bonus) to the bank.
 * Returns new state + the dice values added.
 */
export function applyTacticalRoll(
  state: GameState,
  playerId: string,
  rollFn: () => number,
): { newState: GameState; rollsAdded: DiceBankEntry[] } {
  const newState: GameState = JSON.parse(JSON.stringify(state));
  if (newState.currentTurnPlayerId !== playerId || newState.turn.phase !== 'NEED_ROLL') {
    throw new Error('Not your turn or wrong phase');
  }

  const rollsAdded: DiceBankEntry[] = [];
  let source: 'BASE' | 'ROLL_6_BONUS' = 'BASE';
  let chainCount = 0;
  const MAX_CHAIN = 5;

  let roll = rollFn();
  while (true) {
    const entry: DiceBankEntry = {
      id: `die_${Date.now()}_${++newState.turn.bankSequence}`,
      value: roll,
      source,
      createdAtSequence: newState.turn.bankSequence,
    };
    newState.turn.bank.push(entry);
    rollsAdded.push(entry);
    newState.turn.diceValue = roll; // keep compat display field

    if (roll === 6 && chainCount < MAX_CHAIN) {
      source = 'ROLL_6_BONUS';
      roll = rollFn();
      chainCount++;
    } else {
      break;
    }
  }

  newState.lastEvent = {
    type: 'DICE_ROLL',
    playerId,
    payload: { value: rollsAdded[0].value, bank: newState.turn.bank },
    timestamp: Date.now(),
  };

  // Check if home-stretch discard applies immediately after roll
  const player = newState.players.find(p => p.id === playerId)!;
  if (shouldDiscardBank(player, newState.turn.bank)) {
    newState.turn.bank = [];
    newState.turn.discardEvent = {
      reason: 'Bank discarded: total sum exceeds exact remaining requirement',
    };
    newState.turn.phase = 'NEED_ROLL';
    const idx = newState.players.findIndex(p => p.id === playerId);
    const nextIdx = (idx + 1) % newState.players.length;
    newState.currentTurnPlayerId = newState.players[nextIdx].id;
    newState.turn.turnNonce = newRandNonce();
    newState.updatedAt = Date.now();
    return { newState, rollsAdded };
  }

  // Check if any moves exist
  const actions = getLegalActions(newState, playerId);
  if (actions.length === 0) {
    // No legal moves for any bank die — discard bank and pass turn
    newState.turn.bank = [];
    newState.turn.phase = 'NEED_ROLL';
    const idx = newState.players.findIndex(p => p.id === playerId);
    const nextIdx = (idx + 1) % newState.players.length;
    newState.currentTurnPlayerId = newState.players[nextIdx].id;
    newState.turn.turnNonce = newRandNonce();
    newState.updatedAt = Date.now();
    return { newState, rollsAdded };
  }

  newState.turn.phase = 'NEED_MOVE';
  newState.turn.turnNonce = newRandNonce();
  newState.updatedAt = Date.now();
  return { newState, rollsAdded };
}

import { describe, it, expect } from 'vitest';
import { applyTacticalRoll, applyTacticalMove } from '../moveResolver';
import { getLegalActionsForBankEntry, isLegalAction } from '../moveGenerator';
import { GameState, Player, DiceBankEntry } from '../../types/game';
import { START_INDICES, HOME_INDEX } from '../boardConfig';

function createMockPlayer(id: string, color: any): Player {
  return {
    id,
    kind: 'HUMAN',
    color,
    name: `Player ${id}`,
    connected: true,
    lastSeen: Date.now(),
    pieces: Array(4).fill(null).map((_, i) => ({ id: i, position: -1, isSafe: false })),
    homeCount: 0,
  };
}

function createMockGameState(): GameState {
  const players = [
    createMockPlayer('1', 'RED'),
    createMockPlayer('2', 'GREEN'),
  ];
  return {
    code: 'TEST',
    status: 'RUNNING',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    players,
    viewersCount: 0,
    currentTurnPlayerId: '1',
    turn: {
      phase: 'NEED_ROLL',
      bank: [],
      bankSequence: 0,
      turnNonce: 'nonce1',
      extraTurnChain: 0,
    },
  };
}

describe('Ludo Tactical Edition Rules', () => {
  it('should handle heavy pair movement (even only, half distance)', () => {
    let state = createMockGameState();
    state.players[0].pieces[0].position = 10;
    state.players[0].pieces[1].position = 10; // Heavy Pair
    state.turn.bank = [
      { id: 'd1', value: 4, source: 'BASE', createdAtSequence: 1 },
      { id: 'd2', value: 3, source: 'BASE', createdAtSequence: 2 }
    ];
    state.turn.phase = 'NEED_MOVE';

    // 4 should be valid for pair move (distance 2)
    expect(isLegalAction(state, '1', 'd1', 0)).toBe(true);
    // 3 should be invalid for pair move (unless split-safe, but 10 is not)
    expect(isLegalAction(state, '1', 'd2', 0)).toBe(false);

    const { newState } = applyTacticalMove(state, '1', {
        bankDieId: 'd1',
        bankDieValue: 4,
        pieceIndex: 0,
        isPairMove: true,
        pairedPieceIndex: 1,
        targetPosition: 12
    });
    expect(newState.players[0].pieces[0].position).toBe(12);
    expect(newState.players[0].pieces[1].position).toBe(12);
  });

  it('should trigger arrow glide and bonus roll', () => {
    let state = createMockGameState();
    state.players[0].pieces[0].position = 2;
    state.turn.bank = [
      { id: 'd1', value: 2, source: 'BASE', createdAtSequence: 1 }
    ];
    state.turn.phase = 'NEED_MOVE';

    // Move to 4 (Arrow Tail)
    const { newState, bonusTriggers } = applyTacticalMove(state, '1', {
        bankDieId: 'd1',
        bankDieValue: 2,
        pieceIndex: 0,
        isPairMove: false,
        targetPosition: 4
    });

    // Should have glided to 9
    expect(newState.players[0].pieces[0].position).toBe(9);
    // Should have a bonus roll in bank
    expect(newState.turn.bank.length).toBe(1);
    expect(newState.turn.bank[0].source).toBe('ARROW_BONUS');
    expect(bonusTriggers.some(t => t.type === 'ARROW_OUTER')).toBe(true);
  });

  it('should handle strict total-sum discard rule (home-stretch only)', () => {
    let state = createMockGameState();
    state.players[0].pieces[0].position = 55; // 3 from finish (58)
    state.players[0].pieces[1].position = 58;
    state.players[0].pieces[2].position = 58;
    state.players[0].pieces[3].position = 58;
    state.players[0].homeCount = 3;
    
    state.turn.bank = [
      { id: 'd1', value: 2, source: 'BASE', createdAtSequence: 1 },
      { id: 'd2', value: 2, source: 'BASE', createdAtSequence: 2 }
    ]; // Total = 4, needed = 3. Should discard.
    state.turn.phase = 'NEED_MOVE';

    // We can test this by checking applyTacticalMove or the helper directly.
    // Let's use applyTacticalMove by making a valid move with d1 first.
    const { newState, discarded } = applyTacticalMove(state, '1', {
        bankDieId: 'd1',
        bankDieValue: 2,
        pieceIndex: 0,
        isPairMove: false,
        targetPosition: 57
    });

    // After move, piece is at 57 (1 from finish). Remaining bank is [2].
    // Since 2 > 1, bank should be discarded.
    expect(discarded).toBe(true);
    expect(newState.turn.bank.length).toBe(0);
    expect(newState.turn.phase).toBe('NEED_ROLL');
  });
});

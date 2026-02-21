import { describe, it, expect } from 'vitest';
import { isValidMove, applyMove, rollDice, START_INDICES, HOME_INDEX } from '../engine';
import { GameState, Player } from '../../types/game';

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
      turnNonce: 'nonce1',
      extraTurnChain: 0,
    },
  };
}

describe('Ludo Rules Engine', () => {
  it('should only allow spawning on a 6', () => {
    const state = createMockGameState();
    expect(isValidMove(state, '1', 0, 1, false)).toBe(false);
    expect(isValidMove(state, '1', 0, 6, false)).toBe(true);
  });

  it('should move piece correctly after spawn', () => {
    let state = createMockGameState();
    state.turn.phase = 'NEED_MOVE';
    state.turn.diceValue = 6;
    
    state = applyMove(state, '1', 0, 6);
    expect(state.players[0].pieces[0].position).toBe(START_INDICES.RED);
    expect(state.currentTurnPlayerId).toBe('1'); // Extra turn on 6
    expect(state.turn.phase).toBe('NEED_ROLL');
  });

  it('should move piece correctly along the path', () => {
    let state = createMockGameState();
    state.players[0].pieces[0].position = 0;
    state.turn.phase = 'NEED_MOVE';
    state.turn.diceValue = 3;

    state = applyMove(state, '1', 0, 3);
    expect(state.players[0].pieces[0].position).toBe(3);
    expect(state.currentTurnPlayerId).toBe('2'); // Turn changes
  });

  it('should cut opponent piece and grant extra turn', () => {
    let state = createMockGameState();
    state.players[0].pieces[0].position = 10;
    state.players[1].pieces[0].position = 13; // Target
    state.turn.phase = 'NEED_MOVE';
    state.turn.diceValue = 3;

    state = applyMove(state, '1', 0, 3);
    expect(state.players[1].pieces[0].position).toBe(-1); // Sent to yard
    expect(state.currentTurnPlayerId).toBe('1'); // Extra turn
  });

  it('should not cut on safe squares', () => {
    let state = createMockGameState();
    state.players[0].pieces[0].position = 5;
    state.players[1].pieces[0].position = 8; // Safe square
    state.turn.phase = 'NEED_MOVE';
    state.turn.diceValue = 3;

    state = applyMove(state, '1', 0, 3);
    expect(state.players[1].pieces[0].position).toBe(8); // Still there
    expect(state.currentTurnPlayerId).toBe('2'); // Turn changes
  });

  it('should enter home lane and reach home with exact roll', () => {
    let state = createMockGameState();
    state.players[0].pieces[0].position = 51; // Last common square for RED
    state.turn.phase = 'NEED_MOVE';
    state.turn.diceValue = 1;

    state = applyMove(state, '1', 0, 1);
    expect(state.players[0].pieces[0].position).toBe(52); // Home lane 1

    state.turn.phase = 'NEED_MOVE';
    state.turn.diceValue = 6; // To reach home (52 + 6 = 58)
    state.currentTurnPlayerId = '1';
    
    state = applyMove(state, '1', 0, 6);
    expect(state.players[0].pieces[0].position).toBe(HOME_INDEX);
    expect(state.players[0].homeCount).toBe(1);
  });

  it('should not allow overshooting home', () => {
    let state = createMockGameState();
    state.players[0].pieces[0].position = 57; // Last square before home
    state.turn.phase = 'NEED_MOVE';
    state.turn.diceValue = 2;

    expect(isValidMove(state, '1', 0, 2)).toBe(false);
  });
});

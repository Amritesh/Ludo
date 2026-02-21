import { Color, GameState, Piece, Player, TurnPhase } from '../types/game';

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

export const SAFE_SQUARES = [0, 8, 13, 21, 26, 34, 39, 47];

export function getPiecePath(color: Color, startPos: number, diceValue: number): number[] {
  const path: number[] = [];
  let currentPos = startPos;

  for (let i = 0; i < diceValue; i++) {
    if (currentPos === -1) {
      if (diceValue === 6) {
        currentPos = START_INDICES[color];
        path.push(currentPos);
        return path; // Piece stops at start square when coming out of yard
      } else {
        return []; // Cannot move from yard without a 6
      }
    } else if (currentPos < BOARD_SIZE) {
      // Check if we are at the home lane entry
      const entryPoint = HOME_LANE_ENTRY_INDICES[color];
      if (currentPos === entryPoint) {
        currentPos = 52; // First cell of home lane
      } else {
        currentPos = (currentPos + 1) % BOARD_SIZE;
      }
    } else if (currentPos < HOME_INDEX) {
      currentPos++;
    } else {
      return []; // Already at home, cannot move further
    }

    if (currentPos > HOME_INDEX) return []; // Overshot home
    path.push(currentPos);
  }

  return path;
}

export function isValidMove(gameState: GameState, playerId: string, pieceIndex: number, diceValue: number, forcePhaseCheck = true): boolean {
  const player = gameState.players.find(p => p.id === playerId);
  if (!player || gameState.currentTurnPlayerId !== playerId) return false;
  if (forcePhaseCheck && gameState.turn.phase !== 'NEED_MOVE') return false;

  const piece = player.pieces[pieceIndex];
  if (!piece || piece.position === HOME_INDEX) return false;

  if (piece.position === -1) {
    return diceValue === 6;
  }

  const path = getPiecePath(player.color, piece.position, diceValue);
  return path.length === diceValue && path[path.length - 1] <= HOME_INDEX;
}

export function applyMove(gameState: GameState, playerId: string, pieceIndex: number, diceValue: number): GameState {
  const newState = JSON.parse(JSON.stringify(gameState)) as GameState;
  const player = newState.players.find(p => p.id === playerId)!;
  const piece = player.pieces[pieceIndex];

  const path = getPiecePath(player.color, piece.position, diceValue);
  const targetPos = path[path.length - 1];
  const oldPos = piece.position;
  
  piece.position = targetPos;
  if (targetPos === HOME_INDEX) {
    player.homeCount++;
  }

  let cutInfo = undefined;

  // Check for cutting (only on common path and not on safe squares)
  if (targetPos < BOARD_SIZE && !SAFE_SQUARES.includes(targetPos)) {
    for (const otherPlayer of newState.players) {
      if (otherPlayer.id === playerId) continue;
      for (let i = 0; i < otherPlayer.pieces.length; i++) {
        const otherPiece = otherPlayer.pieces[i];
        if (otherPiece.position === targetPos) {
          // Cut!
          otherPiece.position = -1;
          cutInfo = { victimId: otherPlayer.id, victimPieceIndex: i };
          newState.turn.extraTurnChain++; // Grant extra turn for cut
          break;
        }
      }
      if (cutInfo) break;
    }
  }

  newState.lastEvent = {
    type: 'PIECE_MOVED',
    playerId,
    payload: {
      pieceIndex,
      from: oldPos,
      to: targetPos,
      path,
      cut: cutInfo,
    },
    timestamp: Date.now(),
  };

  // Check if player won
  if (player.homeCount === 4) {
    newState.status = 'FINISHED';
    newState.winnerId = playerId;
    newState.lastEvent = {
      type: 'GAME_FINISHED',
      playerId,
      payload: { winnerId: playerId },
      timestamp: Date.now(),
    };
    return newState;
  }

  // Determine next turn
  if (diceValue === 6) {
    newState.turn.phase = 'NEED_ROLL';
    // extraTurnChain is already incremented if needed or just staying active
  } else if (cutInfo) {
    newState.turn.phase = 'NEED_ROLL';
  } else {
    // Move to next player
    const currentIndex = newState.players.findIndex(p => p.id === playerId);
    const nextIndex = (currentIndex + 1) % newState.players.length;
    newState.currentTurnPlayerId = newState.players[nextIndex].id;
    newState.turn.phase = 'NEED_ROLL';
    newState.turn.extraTurnChain = 0;
  }

  newState.turn.turnNonce = Math.random().toString(36).substring(7);
  newState.updatedAt = Date.now();

  return newState;
}

export function rollDice(gameState: GameState, playerId: string): { newState: GameState, roll: number } {
  const newState = JSON.parse(JSON.stringify(gameState)) as GameState;
  if (newState.currentTurnPlayerId !== playerId || newState.turn.phase !== 'NEED_ROLL') {
    throw new Error('Not your turn or wrong phase');
  }

  const roll = Math.floor(Math.random() * 6) + 1;
  newState.turn.diceValue = roll;
  
  // Check if any moves are possible
  const player = newState.players.find(p => p.id === playerId)!;
  const canMove = player.pieces.some((_, idx) => isValidMove(newState, playerId, idx, roll, false));

  newState.lastEvent = {
    type: 'DICE_ROLL',
    playerId,
    payload: { value: roll },
    timestamp: Date.now(),
  };

  if (!canMove) {
    // If no moves possible, skip to next player (unless it was a 6? No, in Ludo if you roll 6 but can't move, you still get another roll? Actually, if you roll 6 you usually can move something out of yard. If all pieces are home, you wouldn't be in the game.)
    // Standard rule: if no moves possible, turn ends.
    if (roll === 6) {
       // Even if no moves possible (rare/impossible in early/mid game), a 6 usually gives another turn.
       // But wait, if you can't move, you can't move.
       newState.turn.phase = 'NEED_ROLL';
       // We'll give them another roll if it's a 6, but usually they'd have a move.
    } else {
        const currentIndex = newState.players.findIndex(p => p.id === playerId);
        const nextIndex = (currentIndex + 1) % newState.players.length;
        newState.currentTurnPlayerId = newState.players[nextIndex].id;
        newState.turn.phase = 'NEED_ROLL';
    }
  } else {
    newState.turn.phase = 'NEED_MOVE';
  }

  newState.updatedAt = Date.now();
  return { newState, roll };
}

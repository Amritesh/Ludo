import type { GameState, Color, Player, Piece, StackType, StackDescriptor, SquareOccupant } from '../types/game';

/**
 * Client-side mirror of stack classification logic.
 */
export function classifyStack(occupants: SquareOccupant[], position: number): StackType {
  if (occupants.length === 0) return 'EMPTY';
  if (occupants.length === 1) return 'SINGLE';

  const firstColor = occupants[0].color;
  const allSameColor = occupants.every(o => o.color === firstColor);

  if (allSameColor) {
    if (occupants.length === 2) return 'HEAVY_PAIR';
    if (occupants.length === 3) return 'MULTI_STACK_3';
    if (occupants.length === 4) return 'MULTI_STACK_4';
  }

  // Check for allied stack (A+C or B+D)
  const colors = new Set(occupants.map(o => o.color));
  if (colors.size === 2) {
    if ((colors.has('RED') && colors.has('YELLOW')) || (colors.has('GREEN') && colors.has('BLUE'))) {
      return 'ALLIED_STACK';
    }
  }

  return 'MIXED_ENEMY';
}

export function getSquareOccupants(players: Player[], position: number): SquareOccupant[] {
  const occupants: SquareOccupant[] = [];
  for (const player of players) {
    player.pieces.forEach((piece, idx) => {
      if (piece.position === position && position !== -1 && position !== 58) {
        occupants.push({
          playerId: player.id,
          color: player.color,
          pieceIndex: idx,
        });
      }
    });
  }
  return occupants;
}

/**
 * Returns if a piece is currently part of a heavy pair.
 */
export function findPairPartner(player: Player, pieceIndex: number): number | null {
  const piece = player.pieces[pieceIndex];
  if (piece.position === -1 || piece.position === 58) return null;

  for (let i = 0; i < player.pieces.length; i++) {
    if (i === pieceIndex) continue;
    if (player.pieces[i].position === piece.position) {
      return i;
    }
  }
  return null;
}

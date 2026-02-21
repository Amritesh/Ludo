import { GameState, Player, Piece, Color } from '../types/game';
import { isValidMove, getPiecePath, BOARD_SIZE, SAFE_SQUARES, START_INDICES } from './engine';

export function getBestMove(gameState: GameState, playerId: string, diceValue: number): number | null {
  const player = gameState.players.find(p => p.id === playerId);
  if (!player) return null;

  const validMoves: { index: number; score: number }[] = [];

  for (let i = 0; i < player.pieces.length; i++) {
    if (isValidMove(gameState, playerId, i, diceValue, false)) {
      validMoves.push({ index: i, score: calculateScore(gameState, player, i, diceValue) });
    }
  }

  if (validMoves.length === 0) return null;

  // Sort by score descending
  validMoves.sort((a, b) => b.score - a.score);
  return validMoves[0].index;
}

function calculateScore(gameState: GameState, player: Player, pieceIndex: number, diceValue: number): number {
  const piece = player.pieces[pieceIndex];
  const path = getPiecePath(player.color, piece.position, diceValue);
  const targetPos = path[path.length - 1];
  let score = 0;

  // Rule 1: Prefer cut
  if (targetPos < BOARD_SIZE && !SAFE_SQUARES.includes(targetPos)) {
    for (const otherPlayer of gameState.players) {
      if (otherPlayer.id === player.id) continue;
      if (otherPlayer.pieces.some(p => p.position === targetPos)) {
        score += 100; // Big bonus for cutting
      }
    }
  }

  // Rule 2: Prefer spawning on 6
  if (piece.position === -1 && diceValue === 6) {
    score += 50;
  }

  // Rule 3: Prefer reaching home
  if (targetPos === 58) {
    score += 80;
  }

  // Rule 4: Prefer moving into home lane
  if (targetPos >= 52 && piece.position < 52) {
    score += 40;
  }

  // Rule 5: Prefer moving out of danger (if current position is not safe and an opponent is behind)
  if (piece.position < BOARD_SIZE && !SAFE_SQUARES.includes(piece.position)) {
      // Very simplified danger check
      score += 10; 
  }

  // Rule 6: Prefer progressing closest-to-home piece
  score += piece.position * 0.1;

  // Rule 7: Avoid enabling opponent cut (if target is not safe)
  if (targetPos < BOARD_SIZE && !SAFE_SQUARES.includes(targetPos)) {
      // Check if any opponent piece is within 6 squares behind target
      // (Simplified: just a small penalty)
      score -= 5;
  }

  return score;
}

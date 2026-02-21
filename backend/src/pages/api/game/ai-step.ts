import type { NextApiRequest, NextApiResponse } from 'next';
import { getGameState, saveGameState } from '../../../lib/redis';
import { publishGameEvent } from '../../../lib/ably';
import { rollDice, applyMove, isValidMove } from '../../../logic/engine';
import { getBestMove } from '../../../logic/ai';
import { GameState } from '../../../types/game';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { gameCode } = req.body;
  const gameState = (await getGameState(gameCode)) as GameState | null;

  if (!gameState || gameState.status !== 'RUNNING') {
    return res.status(400).json({ error: 'Invalid game state' });
  }

  const currentPlayer = gameState.players.find(p => p.id === gameState.currentTurnPlayerId)!;
  const isBot = currentPlayer.kind === 'BOT';
  const isDisconnected = !currentPlayer.connected && (Date.now() - currentPlayer.lastSeen > 10000);

  if (!isBot && !isDisconnected) {
    return res.status(400).json({ error: 'Not a BOT turn and player is connected' });
  }

  let newState = gameState;

  try {
    if (newState.turn.phase === 'NEED_ROLL') {
      const result = rollDice(newState, currentPlayer.id);
      newState = result.newState;
      await publishGameEvent(gameCode, 'DICE_ROLL', { playerId: currentPlayer.id, value: result.roll });
    } else if (newState.turn.phase === 'NEED_MOVE') {
      const bestPieceIndex = getBestMove(newState, currentPlayer.id, newState.turn.diceValue!);
      if (bestPieceIndex !== null) {
        newState = applyMove(newState, currentPlayer.id, bestPieceIndex, newState.turn.diceValue!);
        await publishGameEvent(gameCode, 'PIECE_MOVED', newState.lastEvent?.payload);
      } else {
        // This shouldn't happen if phase is NEED_MOVE, but just in case
        // Logic in rollDice already handles "no moves possible"
        return res.status(500).json({ error: 'AI found no moves' });
      }
    }

    await saveGameState(newState);

    if (newState.status === 'FINISHED') {
      await publishGameEvent(gameCode, 'GAME_FINISHED', { winnerId: newState.winnerId });
    } else {
      await publishGameEvent(gameCode, 'TURN_CHANGED', {
        playerId: newState.currentTurnPlayerId,
        turnNonce: newState.turn.turnNonce,
        phase: newState.turn.phase,
      });
    }

    res.status(200).json({ ok: true, gameState: newState });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

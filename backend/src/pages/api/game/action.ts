import type { NextApiRequest, NextApiResponse } from 'next';
import { getGameState, saveGameState, getSession } from '../../../lib/redis';
import { publishGameEvent } from '../../../lib/ably';
import { rollDice, applyMove, isValidMove } from '../../../logic/engine';
import { GameState, SessionData } from '../../../types/game';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { gameCode, sessionId, action, payload, turnNonce } = req.body;
  
  const session = (await getSession(sessionId)) as SessionData | null;
  if (!session || session.gameCode !== gameCode || session.role !== 'player') {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const gameState = (await getGameState(gameCode)) as GameState | null;
  if (!gameState) return res.status(404).json({ error: 'Game not found' });

  if (gameState.status !== 'RUNNING') {
    return res.status(400).json({ error: 'Game not running' });
  }

  if (gameState.currentTurnPlayerId !== session.playerId) {
    return res.status(400).json({ error: 'Not your turn' });
  }

  if (gameState.turn.turnNonce !== turnNonce) {
    return res.status(400).json({ error: 'Invalid or stale turn nonce' });
  }

  let newState: GameState;

  try {
    if (action === 'ROLL') {
      const result = rollDice(gameState, session.playerId!);
      newState = result.newState;
      await publishGameEvent(gameCode, 'DICE_ROLL', { playerId: session.playerId, value: result.roll });
    } else if (action === 'MOVE') {
      const { pieceIndex } = payload;
      if (!isValidMove(gameState, session.playerId!, pieceIndex, gameState.turn.diceValue!)) {
        return res.status(400).json({ error: 'Invalid move' });
      }
      newState = applyMove(gameState, session.playerId!, pieceIndex, gameState.turn.diceValue!);
      await publishGameEvent(gameCode, 'PIECE_MOVED', newState.lastEvent?.payload);
    } else {
      return res.status(400).json({ error: 'Unknown action' });
    }

    await saveGameState(newState);

    // Notify turn change or game finish
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

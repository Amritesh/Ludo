import type { NextApiRequest, NextApiResponse } from 'next';
import { getGameState, saveGameState, getSession } from '../../../lib/redis';
import { publishGameEvent } from '../../../lib/ably';
import { tacticalRoll, tacticalMove, tacticalIsValid } from '../../../logic/engine';
import { GameState, SessionData } from '../../../types/game';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  const { gameCode, sessionId, action, payload, turnNonce } = req.body;
  
  const session = (await getSession(sessionId)) as SessionData | null;
  if (!session || session.gameCode !== gameCode || session.role !== 'player') {
    res.status(403).json({ error: 'Unauthorized' });
    return;
  }

  const gameState = (await getGameState(gameCode)) as GameState | null;
  if (!gameState) {
    res.status(404).json({ error: 'Game not found' });
    return;
  }

  if (gameState.status !== 'RUNNING') {
    res.status(400).json({ error: `Game not running (status: ${gameState.status})` });
    return;
  }

  if (gameState.currentTurnPlayerId !== session.playerId) {
    res.status(400).json({ error: `Not your turn (current: ${gameState.currentTurnPlayerId}, you: ${session.playerId})` });
    return;
  }

  if (gameState.turn.turnNonce !== turnNonce) {
    res.status(400).json({ error: `Invalid or stale turn nonce` });
    return;
  }

  let newState: GameState;

  try {
    if (action === 'ROLL') {
      const result = tacticalRoll(gameState, session.playerId!);
      newState = result.newState;
      await publishGameEvent(gameCode, 'DICE_ROLL', newState.lastEvent);
    } else if (action === 'MOVE') {
      const { pieceIndex, bankDieId } = payload;
      
      // Validation is now part of tacticalMove or tacticalIsValid
      if (bankDieId && !tacticalIsValid(gameState, session.playerId!, pieceIndex, bankDieId)) {
        res.status(400).json({ error: 'Invalid tactical move' });
        return;
      }

      const result = tacticalMove(gameState, session.playerId!, pieceIndex, bankDieId);
      newState = result.newState;
      
      await publishGameEvent(gameCode, 'PIECE_MOVED', newState.lastEvent);
      
      if (result.discarded) {
          // If bank was discarded, notify specifically
          await publishGameEvent(gameCode, 'BANK_DISCARDED', { 
              playerId: session.playerId, 
              reason: newState.turn.discardEvent?.reason 
          });
      }
    } else {
      res.status(400).json({ error: 'Unknown action' });
      return;
    }

    await saveGameState(newState);

    // Notify turn change or game finish
    if (newState.status === 'FINISHED') {
       await publishGameEvent(gameCode, 'GAME_FINISHED', newState.lastEvent);
    } else {
       await publishGameEvent(gameCode, 'TURN_CHANGED', {
         playerId: newState.currentTurnPlayerId,
         turnNonce: newState.turn.turnNonce,
         phase: newState.turn.phase,
         bank: newState.turn.bank,
       });
    }

    res.status(200).json({ ok: true, gameState: newState });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

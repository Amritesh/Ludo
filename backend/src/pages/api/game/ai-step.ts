import type { NextApiRequest, NextApiResponse } from 'next';
import { getGameState, saveGameState } from '../../../lib/redis';
import { publishGameEvent } from '../../../lib/ably';
import { tacticalRoll, tacticalMove } from '../../../logic/engine';
import { getBestTacticalMove } from '../../../logic/ai';
import { GameState } from '../../../types/game';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  const { gameCode } = req.body;
  const gameState = (await getGameState(gameCode)) as GameState | null;

  if (!gameState || gameState.status !== 'RUNNING') {
    res.status(400).json({ error: 'Invalid game state' });
    return;
  }

  const currentPlayer = gameState.players.find(p => p.id === gameState.currentTurnPlayerId)!;
  const isBot = currentPlayer.kind === 'BOT';
  const isDisconnected = !currentPlayer.connected && (Date.now() - currentPlayer.lastSeen > 10000);

  if (!isBot && !isDisconnected) {
    res.status(400).json({ error: 'Not a BOT turn and player is connected' });
    return;
  }

  let state = gameState;

  try {
    if (state.turn.phase === 'NEED_ROLL') {
      const result = tacticalRoll(state, currentPlayer.id);
      state = result.newState;
      await publishGameEvent(gameCode, 'DICE_ROLL', state.lastEvent);
    } else if (state.turn.phase === 'NEED_MOVE') {
      const bestAction = getBestTacticalMove(state, currentPlayer.id);
      if (bestAction) {
        const result = tacticalMove(state, currentPlayer.id, bestAction.pieceIndex, bestAction.bankDieId);
        state = result.newState;
        await publishGameEvent(gameCode, 'PIECE_MOVED', state.lastEvent);
        
        if (result.discarded) {
            await publishGameEvent(gameCode, 'BANK_DISCARDED', { 
                playerId: currentPlayer.id, 
                reason: state.turn.discardEvent?.reason 
            });
        }
      } else {
        // If no moves, bank should have been discarded in tacticalMove or tacticalRoll
        // but if we are here and bestAction is null, something is wrong or turn should have passed.
        res.status(200).json({ ok: true, message: 'AI found no moves (turn may have passed)', gameState: state });
        return;
      }
    }

    await saveGameState(state);

    if (state.status === 'FINISHED') {
      await publishGameEvent(gameCode, 'GAME_FINISHED', state.lastEvent);
    } else {
      await publishGameEvent(gameCode, 'TURN_CHANGED', {
        playerId: state.currentTurnPlayerId,
        turnNonce: state.turn.turnNonce,
        phase: state.turn.phase,
        bank: state.turn.bank,
      });
    }

    res.status(200).json({ ok: true, gameState: state });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

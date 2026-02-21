import type { NextApiRequest, NextApiResponse } from 'next';
import { getGameState, saveGameState, getSession } from '../../../lib/redis';
import { publishGameEvent } from '../../../lib/ably';
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

  const { gameCode, sessionId } = req.body;
  const gameState = (await getGameState(gameCode)) as GameState | null;

  if (!gameState) {
    res.status(404).json({ error: 'Game not found' });
    return;
  }

  const creator = gameState.players[0];
  const session = (await getSession(sessionId)) as SessionData | null;

  if (!session || session.playerId !== creator.id) {
    res.status(403).json({ error: 'Only creator can start' });
    return;
  }

  if (gameState.status !== 'LOBBY') {
    res.status(400).json({ error: 'Game already started' });
    return;
  }

  if (gameState.players.length < 2) {
    res.status(400).json({ error: 'Need at least 2 players' });
    return;
  }

  try {
    gameState.status = 'RUNNING';
    gameState.updatedAt = Date.now();
    
    await saveGameState(gameState);
    await publishGameEvent(gameCode, 'GAME_STARTED', gameState);

    res.status(200).json({ ok: true, gameState });
  } catch (err: any) {
    console.error('Start Game error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
}

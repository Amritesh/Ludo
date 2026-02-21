import type { NextApiRequest, NextApiResponse } from 'next';
import { getGameState, saveGameState, getSession } from '../../../lib/redis';
import { publishGameEvent } from '../../../lib/ably';
import { GameState, SessionData } from '../../../types/game';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { gameCode, sessionId } = req.body;
  const gameState = (await getGameState(gameCode)) as GameState | null;

  if (!gameState) return res.status(404).json({ error: 'Game not found' });

  const creator = gameState.players[0];
  const session = (await getSession(sessionId)) as SessionData | null;

  if (!session || session.playerId !== creator.id) {
    return res.status(403).json({ error: 'Only creator can start' });
  }

  if (gameState.status !== 'LOBBY') {
    return res.status(400).json({ error: 'Game already started' });
  }

  if (gameState.players.length < 2) {
    return res.status(400).json({ error: 'Need at least 2 players' });
  }

  gameState.status = 'RUNNING';
  gameState.updatedAt = Date.now();
  
  await saveGameState(gameState);
  await publishGameEvent(gameCode, 'GAME_STARTED', gameState);

  res.status(200).json({ ok: true, gameState });
}

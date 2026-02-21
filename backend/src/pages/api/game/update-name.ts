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

  const { gameCode, sessionId, name } = req.body;

  if (!name || name.trim().length === 0) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }

  if (name.length > 20) {
    res.status(400).json({ error: 'Name too long' });
    return;
  }

  const gameState = (await getGameState(gameCode)) as GameState | null;
  if (!gameState) {
    res.status(404).json({ error: 'Game not found' });
    return;
  }

  const session = (await getSession(sessionId)) as SessionData | null;
  if (!session || session.gameCode !== gameCode || session.role !== 'player') {
    res.status(403).json({ error: 'Unauthorized' });
    return;
  }

  const player = gameState.players.find(p => p.id === session.playerId);
  if (!player) {
    res.status(404).json({ error: 'Player not found' });
    return;
  }

  if (gameState.status !== 'LOBBY') {
    res.status(400).json({ error: 'Cannot change name after game starts' });
    return;
  }

  player.name = name.trim();
  await saveGameState(gameState);
  await publishGameEvent(gameCode, 'SNAPSHOT', gameState);

  res.status(200).json({ ok: true, name: player.name });
}

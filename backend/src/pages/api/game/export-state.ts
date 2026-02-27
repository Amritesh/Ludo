import type { NextApiRequest, NextApiResponse } from 'next';
import { getGameState } from '../../../lib/redis';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { gameCode } = req.query;
  const gameState = await getGameState(gameCode as string);

  if (!gameState) {
    res.status(404).json({ error: 'Game not found' });
    return;
  }

  res.status(200).json(gameState);
}

import type { NextApiRequest, NextApiResponse } from 'next';
import { getGameState } from '../../../lib/redis';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { gameCode } = req.query;
  const gameState = await getGameState(gameCode as string);

  if (!gameState) return res.status(404).json({ error: 'Game not found' });

  res.status(200).json(gameState);
}

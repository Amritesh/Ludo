import type { NextApiRequest, NextApiResponse } from 'next';
import { saveGameState } from '../../../lib/redis';
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

  const { state } = req.body;

  if (!state || !state.code) {
    res.status(400).json({ error: 'Invalid game state' });
    return;
  }

  try {
    await saveGameState(state as GameState);
    res.status(200).json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAblyToken } from '../../../lib/ably';
import { getSession } from '../../../lib/redis';
import { SessionData } from '../../../types/game';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { sessionId } = req.query;

  if (!sessionId) return res.status(400).json({ error: 'Session ID required' });

  const session = (await getSession(sessionId as string)) as SessionData | null;
  if (!session) return res.status(403).json({ error: 'Invalid session' });

  try {
    const tokenRequest = await getAblyToken(session.playerId || sessionId as string);
    res.status(200).json(tokenRequest);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

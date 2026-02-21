import type { NextApiRequest, NextApiResponse } from 'next';
import { getAblyToken } from '../../../lib/ably';
import { getSession } from '../../../lib/redis';
import { SessionData } from '../../../types/game';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { sessionId } = req.query;

  if (!sessionId) {
    res.status(400).json({ error: 'Session ID required' });
    return;
  }

  const session = (await getSession(sessionId as string)) as SessionData | null;
  if (!session) {
    res.status(403).json({ error: 'Invalid session' });
    return;
  }

  try {
    const tokenRequest = await getAblyToken(session.playerId || sessionId as string);
    res.status(200).json(tokenRequest);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

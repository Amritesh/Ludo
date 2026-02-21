import type { NextApiRequest, NextApiResponse } from 'next';
import { getGameState, saveGameState, getSession } from '../../../lib/redis';
import { publishGameEvent } from '../../../lib/ably';
import { GameState, SessionData, Player, Color } from '../../../types/game';
import { nanoid } from 'nanoid';

const COLORS: Color[] = ['RED', 'GREEN', 'YELLOW', 'BLUE'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { gameCode, sessionId } = req.body;
  const gameState = (await getGameState(gameCode)) as GameState | null;

  if (!gameState) return res.status(404).json({ error: 'Game not found' });

  // Only the first player (creator) can add bots
  const creator = gameState.players[0];
  const session = (await getSession(sessionId)) as SessionData | null;

  if (!session || session.playerId !== creator.id) {
    return res.status(403).json({ error: 'Only creator can add bots' });
  }

  if (gameState.players.length >= 4) {
    return res.status(400).json({ error: 'Game full' });
  }

  const usedColors = gameState.players.map(p => p.color);
  const availableColor = COLORS.find(c => !usedColors.includes(c))!;

  const botPlayer: Player = {
    id: `bot-${nanoid(5)}`,
    kind: 'BOT',
    color: availableColor,
    name: `Bot ${gameState.players.length + 1}`,
    connected: true,
    lastSeen: Date.now(),
    pieces: Array(4).fill(null).map((_, i) => ({ id: i, position: -1, isSafe: false })),
    homeCount: 0,
  };

  gameState.players.push(botPlayer);
  await saveGameState(gameState);
  await publishGameEvent(gameCode, 'SNAPSHOT', gameState);

  res.status(200).json({ ok: true, gameState });
}

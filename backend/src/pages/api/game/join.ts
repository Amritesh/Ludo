import type { NextApiRequest, NextApiResponse } from 'next';
import { nanoid } from 'nanoid';
import { getGameState, saveGameState, saveSession, getSession } from '../../../lib/redis';
import { GameState, Player, Color, SessionData } from '../../../types/game';

const COLORS: Color[] = ['RED', 'GREEN', 'YELLOW', 'BLUE'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  const { gameCode, sessionId: existingSessionId } = req.body;
  const gameState = (await getGameState(gameCode)) as GameState | null;

  if (!gameState) {
    res.status(404).json({ error: 'Game not found' });
    return;
  }

  // Reconnection logic
  if (existingSessionId) {
    const session = (await getSession(existingSessionId)) as SessionData | null;
    if (session && session.gameCode === gameCode) {
      const player = gameState.players.find(p => p.id === session.playerId);
      if (player) {
        player.connected = true;
        player.lastSeen = Date.now();
        await saveGameState(gameState);
        res.status(200).json({
          role: 'player',
          playerId: player.id,
          sessionId: existingSessionId,
          gameState,
        });
        return;
      }
    }
  }

  // Join as new player if game is in LOBBY and seats available
  if (gameState.status === 'LOBBY' && gameState.players.length < 4) {
    const sessionId = nanoid(20);
    const playerId = nanoid(10);
    const usedColors = gameState.players.map(p => p.color);
    const availableColor = COLORS.find(c => !usedColors.includes(c))!;

    const newPlayer: Player = {
      id: playerId,
      kind: 'HUMAN',
      color: availableColor,
      name: `Player ${gameState.players.length + 1}`,
      connected: true,
      lastSeen: Date.now(),
      pieces: Array(4).fill(null).map((_, i) => ({ id: i, position: -1, isSafe: false })),
      homeCount: 0,
    };

    gameState.players.push(newPlayer);
    await saveGameState(gameState);
    await saveSession(sessionId, { gameCode, playerId, role: 'player', lastSeen: Date.now() });

    res.status(200).json({
      role: 'player',
      playerId,
      sessionId,
      gameState,
    });
    return;
  }

  // Join as viewer
  gameState.viewersCount++;
  await saveGameState(gameState);
  const viewerSessionId = existingSessionId || nanoid(20);
  await saveSession(viewerSessionId, { gameCode, role: 'viewer', lastSeen: Date.now() });

  res.status(200).json({
    role: 'viewer',
    sessionId: viewerSessionId,
    gameState,
  });
}

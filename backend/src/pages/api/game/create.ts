import type { NextApiRequest, NextApiResponse } from 'next';
import { nanoid } from 'nanoid';
import { redis, saveGameState, saveSession } from '../../../lib/redis';
import { GameState, Player } from '../../../types/game';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  const { seats = 4, allowBots = true } = req.body;
  const gameCode = nanoid(6).toUpperCase();
  const sessionId = nanoid(20);
  const playerId = nanoid(10);

  const creator: Player = {
    id: playerId,
    kind: 'HUMAN',
    color: 'RED',
    name: 'Player 1',
    connected: true,
    lastSeen: Date.now(),
    pieces: Array(4).fill(null).map((_, i) => ({ id: i, position: -1, isSafe: false })),
    homeCount: 0,
  };

  const gameState: GameState = {
    code: gameCode,
    status: 'LOBBY',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    players: [creator],
    viewersCount: 0,
    currentTurnPlayerId: playerId,
    turn: {
      phase: 'NEED_ROLL',
      bank: [],
      bankSequence: 0,
      turnNonce: nanoid(10),
      extraTurnChain: 0,
    },
  };

  try {
    await saveGameState(gameState);
    await saveSession(sessionId, { gameCode, playerId, role: 'player' });

    res.status(200).json({
      gameCode,
      sessionId,
      playerId,
      gameState,
    });
  } catch (error: any) {
    console.error('Error creating game:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}

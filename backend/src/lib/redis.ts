import { Redis } from '@upstash/redis';

const isRedisConfigured = process.env.KV_REST_API_URL && 
                       process.env.KV_REST_API_URL !== 'your_redis_url' &&
                       process.env.KV_REST_API_TOKEN &&
                       process.env.KV_REST_API_TOKEN !== 'your_redis_token';

export const redis = isRedisConfigured 
  ? new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    })
  : null;

if (!isRedisConfigured) {
  console.warn('Redis is not properly configured. Check your environment variables.');
}

export const getGameState = async (code: string) => {
  if (!redis) throw new Error('Redis not configured');
  return await redis.get(`game:${code}`);
};

export const saveGameState = async (state: any) => {
  if (!redis) throw new Error('Redis not configured');
  
  // Game is kept for 2 days if unplayed
  // If finished, we keep it for 1 hour to allow players to see results
  const ttl = state.status === 'FINISHED' ? 3600 : 172800;
  
  await redis.set(`game:${state.code}`, state, { ex: ttl });
};

export const getSession = async (sessionId: string) => {
  if (!redis) throw new Error('Redis not configured');
  return await redis.get(`session:${sessionId}`);
};

export const saveSession = async (sessionId: string, sessionData: any) => {
  if (!redis) throw new Error('Redis not configured');
  // Sessions also expire after 2 days
  await redis.set(`session:${sessionId}`, sessionData, { ex: 172800 });
};

import { Redis } from '@upstash/redis';

const isRedisConfigured = process.env.UPSTASH_REDIS_REST_URL && 
                       process.env.UPSTASH_REDIS_REST_URL !== 'your_redis_url' &&
                       process.env.UPSTASH_REDIS_REST_TOKEN &&
                       process.env.UPSTASH_REDIS_REST_TOKEN !== 'your_redis_token';

export const redis = isRedisConfigured 
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
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
  await redis.set(`game:${state.code}`, state);
};

export const getSession = async (sessionId: string) => {
  if (!redis) throw new Error('Redis not configured');
  return await redis.get(`session:${sessionId}`);
};

export const saveSession = async (sessionId: string, sessionData: any) => {
  if (!redis) throw new Error('Redis not configured');
  await redis.set(`session:${sessionId}`, sessionData);
};

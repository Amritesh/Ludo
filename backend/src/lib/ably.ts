import Ably from 'ably';

if (!process.env.ABLY_API_KEY) {
  console.warn('ABLY_API_KEY is missing');
}

export const ably = new Ably.Rest(process.env.ABLY_API_KEY || 'MISSING:KEY');

export const publishGameEvent = async (gameCode: string, type: string, payload: any) => {
  try {
    const channel = ably.channels.get(`game:${gameCode}`);
    await channel.publish(type, payload);
  } catch (err) {
    console.error(`Failed to publish event ${type} for game ${gameCode}:`, err);
  }
};

export const getAblyToken = async (clientId: string) => {
  return await ably.auth.createTokenRequest({ clientId });
};

import Ably from 'ably';

let ablyRest: Ably.Rest | null = null;

export const getAblyClient = () => {
  if (ablyRest) return ablyRest;

  const key = process.env.ABLY_API_KEY;
  if (!key || key === 'your_ably_key') {
    console.warn('ABLY_API_KEY is missing or using placeholder');
    // We still initialize it to avoid crashing, but it will fail on use
    ablyRest = new Ably.Rest('MISSING:KEY');
  } else {
    ablyRest = new Ably.Rest(key);
  }
  return ablyRest;
};

export const publishGameEvent = async (gameCode: string, type: string, payload: any) => {
  try {
    const client = getAblyClient();
    const channel = client.channels.get(`game:${gameCode}`);
    await channel.publish(type, payload);
  } catch (err) {
    console.error(`Failed to publish event ${type} for game ${gameCode}:`, err);
  }
};

export const getAblyToken = async (clientId: string) => {
  const client = getAblyClient();
  return await client.auth.createTokenRequest({ clientId });
};

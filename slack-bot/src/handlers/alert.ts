import type { App } from '@slack/bolt';
import Redis from 'ioredis';
import { buildAlertBlocks } from '../blocks/alertBlock';

const redis = new Redis(process.env.REDIS_URL ?? 'redis://redis:6379');

function channelFor(alert: { severity: string; region?: string }) {
  if (alert.region) return `logistics-${alert.region.toLowerCase()}`;
  return alert.severity === 'P1' || alert.severity === 'P2' ? 'ops-alerts' : 'ops-events';
}

export function registerAlertHandlers(app: App) {
  app.event('app_mention', async ({ event, client }) => {
    const payload = JSON.parse((event.text.split('```')[1] ?? '{}')) as { id: string; severity: string; region?: string; summary: string };
    const key = `alert:dedup:${payload.id}`;
    const accepted = await redis.set(key, '1', 'EX', 300, 'NX');
    if (!accepted) return;

    await client.chat.postMessage({
      channel: channelFor(payload),
      text: `Incident ${payload.id}: ${payload.summary}`,
      blocks: buildAlertBlocks(payload),
    });
  });
}

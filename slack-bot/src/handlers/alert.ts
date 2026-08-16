import type { App } from '@slack/bolt';
import Redis from 'ioredis';
import { buildAlertBlocks } from '../blocks/alertBlock';

const redis = new Redis(process.env.REDIS_URL ?? 'redis://redis:6379');

function channelFor(alert: { severity: string; region?: string }) {
  if (alert.region) return `logistics-${alert.region.toLowerCase()}`;
  return alert.severity === 'P1' || alert.severity === 'P2' ? 'ops-alerts' : 'ops-events';
}

/**
 * Post an alert to the appropriate Slack channel.
 *
 * Uses a 5-minute Redis dedup key (alert:<incident_id>) so that multiple
 * triggers for the same incident don't spam the channel. Called both from:
 *   - the Bolt app_mention handler (Slack-triggered)
 *   - the /ingest HTTP endpoint (orchestration-api-triggered via forward_to_bot)
 */
export async function handleIngestAlert(
  app: App,
  alert: { incident_id: string; severity: string; region?: string; summary: string },
): Promise<void> {
  const key = `alert:dedup:${alert.incident_id}`;
  const accepted = await redis.set(key, '1', 'EX', 300, 'NX');
  if (!accepted) return; // duplicate — already posted

  const channel = channelFor(alert);
  try {
    await app.client.chat.postMessage({
      channel,
      text: `Incident ${alert.incident_id}: ${alert.summary}`,
      blocks: buildAlertBlocks({
        id: alert.incident_id,
        severity: alert.severity,
        summary: alert.summary,
      }),
    });
  } catch (err) {
    console.error(`[alert] Failed to post to #${channel}:`, err);
  }
}

export function registerAlertHandlers(app: App) {
  app.event('app_mention', async ({ event, client }) => {
    const payload = JSON.parse((event.text.split('```')[1] ?? '{}')) as {
      id: string;
      severity: string;
      region?: string;
      summary: string;
    };
    // Normalise id → incident_id shape for the shared helper
    await handleIngestAlert(app, {
      incident_id: payload.id,
      severity: payload.severity,
      region: payload.region,
      summary: payload.summary,
    });
  });
}

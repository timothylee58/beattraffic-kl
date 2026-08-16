import crypto from 'crypto';
import type { App } from '@slack/bolt';
import Redis from 'ioredis';
import { buildAlertBlocks } from '../blocks/alertBlock';

const redis = new Redis(process.env.REDIS_URL ?? 'redis://redis:6379');

function channelFor(alert: { severity: string; region?: string }) {
  if (alert.region) return `logistics-${alert.region.toLowerCase()}`;
  return alert.severity === 'P1' || alert.severity === 'P2' ? 'ops-alerts' : 'ops-events';
}

/**
 * Derive a stable content fingerprint for deduplication.
 *
 * Using incident_id alone is wrong because orchestration-api generates a
 * fresh UUID for every /webhook/alerts call, so two identical alert payloads
 * would produce different keys and both reach Slack. Instead we fingerprint
 * the content (severity + summary + region) so truly duplicate alerts
 * (same text, different IDs) are suppressed within the 5-minute window.
 */
function fingerprintFor(alert: { severity: string; summary: string; region?: string }): string {
  const raw = `${alert.severity}:${(alert.region ?? '').toLowerCase()}:${alert.summary.toLowerCase()}`;
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16);
}

/**
 * Post an alert to the appropriate Slack channel with Redis-backed dedup.
 *
 * Called from:
 *   - POST /ingest (orchestration-api → slack-bot HTTP ingress)
 *   - app_mention Bolt handler (Slack-triggered, legacy path)
 *
 * Redis failures are caught and logged; on Redis down we post without dedup
 * rather than silently dropping the alert.
 * If chat.postMessage fails, the dedup key is deleted so the alert can be
 * retried on the next delivery attempt.
 */
export async function handleIngestAlert(
  app: App,
  alert: { incident_id: string; severity: string; region?: string; summary: string },
): Promise<void> {
  const fp = fingerprintFor(alert);
  const key = `alert:dedup:${fp}`;

  // Dedup — tolerate Redis being down: log and continue without suppression
  let accepted: string | null = '1';
  try {
    accepted = await redis.set(key, '1', 'EX', 300, 'NX');
  } catch (redisErr) {
    console.error('[alert] Redis dedup check failed (posting without dedup):', redisErr);
    // accepted stays '1' → we'll try to post
  }
  if (accepted === null) return; // duplicate — already posted

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
    // Release the dedup key so the next delivery attempt isn't silently suppressed.
    try {
      await redis.del(key);
    } catch (delErr) {
      console.error('[alert] Could not release dedup key:', delErr);
    }
  }
}

export function registerAlertHandlers(app: App) {
  app.event('app_mention', async ({ event }) => {
    const payload = JSON.parse((event.text.split('```')[1] ?? '{}')) as {
      id: string;
      severity: string;
      region?: string;
      summary: string;
    };
    await handleIngestAlert(app, {
      incident_id: payload.id,
      severity: payload.severity,
      region: payload.region,
      summary: payload.summary,
    });
  });
}

import type { App } from '@slack/bolt';
import { buildQueryModal } from '../blocks/queryBlock';

export function registerCommandHandlers(app: App) {
  app.command('/noc-query', async ({ ack, body, client }) => {
    await ack();
    await client.views.open({ trigger_id: body.trigger_id, view: buildQueryModal() });
  });

  app.command('/noc-status', async ({ ack, respond }) => {
    await ack();
    const response = await fetch(`${process.env.ORCHESTRATION_API_URL}/health/summary`);
    const health = await response.json();
    await respond(`NOC Status: ${health.status} | incidents: ${health.open_incidents}`);
  });
}

import type { App } from '@slack/bolt';
import { buildHomeBlocks } from '../blocks/homeBlock';

export function registerHomeHandlers(app: App) {
  app.event('app_home_opened', async ({ event, client }) => {
    const response = await fetch(`${process.env.ORCHESTRATION_API_URL}/health/summary`);
    const data = await response.json();

    await client.views.publish({
      user_id: event.user,
      view: {
        type: 'home',
        callback_id: 'noc_home',
        blocks: buildHomeBlocks(data),
      },
    });
  });
}

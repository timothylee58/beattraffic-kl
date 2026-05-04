import { App } from '@slack/bolt';
import { registerAlertHandlers } from './handlers/alert';
import { registerHomeHandlers } from './handlers/home';
import { registerCommandHandlers } from './handlers/command';
import { registerActionHandlers } from './handlers/action';

export function createBoltApp() {
  const app = new App({
    signingSecret: process.env.SLACK_SIGNING_SECRET ?? '',
    token: process.env.SLACK_BOT_TOKEN,
    appToken: process.env.SLACK_APP_TOKEN,
    socketMode: true,
  });

  registerAlertHandlers(app);
  registerHomeHandlers(app);
  registerCommandHandlers(app);
  registerActionHandlers(app);

  return app;
}

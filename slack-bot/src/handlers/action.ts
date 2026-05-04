import type { App } from '@slack/bolt';

export function registerActionHandlers(app: App) {
  app.action('p1_ack', async ({ ack, body, client }) => {
    await ack();
    await client.chat.postEphemeral({ channel: body.channel?.id ?? '', user: body.user.id, text: 'P1 acknowledged.' });
  });

  app.action('p1_silence', async ({ ack, body, client }) => {
    await ack();
    await client.chat.postEphemeral({ channel: body.channel?.id ?? '', user: body.user.id, text: 'Alert silenced for 30 minutes.' });
  });

  app.action('p1_escalate', async ({ ack, body, client }) => {
    await ack();
    await client.chat.postEphemeral({ channel: body.channel?.id ?? '', user: body.user.id, text: 'Escalation initiated.' });
  });

  app.view('noc_query_submit', async ({ ack, view, client, body }) => {
    await ack();
    const query = view.state.values.query_input.query_text.value;
    const res = await fetch(`${process.env.ORCHESTRATION_API_URL}/agent/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, user: body.user.id }),
    });
    const data = await res.json();
    await client.chat.postMessage({ channel: body.user.id, text: `Query result: ${data.answer}` });
  });
}

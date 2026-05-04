export function buildQueryModal() {
  return {
    type: 'modal',
    callback_id: 'noc_query_submit',
    title: { type: 'plain_text', text: 'NOC Query' },
    submit: { type: 'plain_text', text: 'Run' },
    close: { type: 'plain_text', text: 'Cancel' },
    blocks: [
      {
        type: 'input',
        block_id: 'query_input',
        label: { type: 'plain_text', text: 'Ask Ops Copilot' },
        element: { type: 'plain_text_input', action_id: 'query_text', multiline: true },
      },
    ],
  };
}

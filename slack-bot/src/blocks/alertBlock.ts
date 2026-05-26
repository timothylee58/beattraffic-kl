export function buildAlertBlocks(alert: { id: string; severity: string; summary: string }) {
  return [
    { type: 'section', text: { type: 'mrkdwn', text: `*${alert.severity}* Incident ${alert.id}\n${alert.summary}` } },
    {
      type: 'actions',
      elements: [
        { type: 'button', text: { type: 'plain_text', text: 'Acknowledge' }, action_id: 'p1_ack', style: 'primary' },
        { type: 'button', text: { type: 'plain_text', text: 'Silence' }, action_id: 'p1_silence' },
        { type: 'button', text: { type: 'plain_text', text: 'Escalate' }, action_id: 'p1_escalate', style: 'danger' },
      ],
    },
  ];
}

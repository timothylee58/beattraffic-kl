export function buildHomeBlocks(health: { status: string; open_incidents: number; regions: Record<string, string> }) {
  const regionLines = Object.entries(health.regions).map(([region, value]) => `• ${region}: ${value}`).join('\n');
  return [
    { type: 'header', text: { type: 'plain_text', text: 'Autonomous Enterprise Operations NOC' } },
    { type: 'section', text: { type: 'mrkdwn', text: `*Status:* ${health.status}\n*Open Incidents:* ${health.open_incidents}` } },
    { type: 'section', text: { type: 'mrkdwn', text: `*Regional Snapshot*\n${regionLines}` } },
  ];
}

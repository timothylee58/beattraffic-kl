import { createClient, type BlinkClient } from '@blinkdotnew/sdk';

function getProjectId(): string {
  const envId = process.env.NEXT_PUBLIC_BLINK_PROJECT_ID;
  if (envId) return envId;
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const match = hostname.match(/^([^.]+)\.sites\.blink\.new$/);
  if (match?.[1]) return match[1];
  return 'demo-project';
}

type Table = ReturnType<BlinkClient['db']['table']>;
type TableName = 'tickets' | 'stations' | 'leaderboard' | 'saved_commutes' | 'delay_reports';

/**
 * The SDK resolves `blink.db.<table>` through a runtime proxy that its types do not describe,
 * so it is declared here: any table name yields the same typed table API as `db.table(name)`.
 */
export const blink = createClient({
  projectId: getProjectId(),
  publishableKey: process.env.NEXT_PUBLIC_BLINK_PUBLISHABLE_KEY as string,
  auth: { mode: 'headless' },
}) as Omit<BlinkClient, 'db'> & { db: BlinkClient['db'] & Record<TableName, Table> };

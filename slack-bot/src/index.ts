import express from 'express';
import { App } from '@slack/bolt';
import { createBoltApp } from './app';

const port = Number(process.env.PORT ?? 3000);
const internalPort = Number(process.env.INTERNAL_PORT ?? 3001);

async function start() {
  const bolt = createBoltApp();

  await bolt.start(port);
  console.log(`[slack-bot] Bolt listening on ${port}`);

  const internal = express();
  internal.get('/healthz', (_req, res) => res.status(200).json({ ok: true }));
  const server = internal.listen(internalPort, () => {
    console.log(`[slack-bot] Internal server listening on ${internalPort}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`[slack-bot] Received ${signal}. Shutting down...`);
    server.close();
    await bolt.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

void start();

import Fastify from 'fastify';
import cors from '@fastify/cors';
import { registerGolem } from './golem.js';

const PORT = Number(process.env['PORT'] ?? 3001);
const HOST = process.env['HOST'] ?? '127.0.0.1';

async function main(): Promise<void> {
  const app = Fastify({ logger: { level: 'info' } });

  await app.register(cors, { origin: true });

  app.get('/healthz', () => ({ status: 'ok', service: 'vistrates-server' }));

  app.get('/', () => ({
    name: 'vistrates-server',
    version: '0.1.0',
    endpoints: ['/healthz', '/collab/:doc (Phase 11)', '/golem (POST)', '/assets/* (Phase 4+)'],
  }));

  await registerGolem(app);

  await app.listen({ port: PORT, host: HOST });
}

main().catch((err: unknown) => {
  console.error('[vistrates-server] failed to start:', err);
  process.exit(1);
});

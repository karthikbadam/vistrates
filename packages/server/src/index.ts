import Fastify from 'fastify';

const PORT = Number(process.env['PORT'] ?? 3001);
const HOST = process.env['HOST'] ?? '127.0.0.1';

async function main(): Promise<void> {
  const app = Fastify({ logger: { level: 'info' } });

  app.get('/healthz', () => ({ status: 'ok', service: 'vistrates-server' }));

  app.get('/', () => ({
    name: 'vistrates-server',
    version: '0.1.0',
    endpoints: ['/healthz', '/collab/* (Phase 11)', '/golem (Phase 10)', '/assets/* (Phase 4+)'],
  }));

  await app.listen({ port: PORT, host: HOST });
}

main().catch((err: unknown) => {
  console.error('[vistrates-server] failed to start:', err);
  process.exit(1);
});

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

interface GolemBody {
  readonly url: string;
  readonly viewportWidth?: number;
  readonly viewportHeight?: number;
  readonly waitMs?: number;
  readonly format?: 'png' | 'pdf';
}

const SNAPSHOT_DIR = join(process.cwd(), 'apps/server/snapshots');

/**
 * POST /golem  →  { ok: true, file: string } | { ok: false, error: string }
 *
 * Renders a vistrate URL headlessly via Playwright and writes the result to
 * `apps/server/snapshots/`. Playwright is an optional dependency — if it's
 * not installed we return 503 with a clear remediation message.
 */
export async function registerGolem(app: FastifyInstance): Promise<void> {
  await mkdir(SNAPSHOT_DIR, { recursive: true });
  app.post('/golem', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body ?? {}) as Partial<GolemBody>;
    const url = typeof body.url === 'string' ? body.url : null;
    if (!url) {
      return reply.code(400).send({ ok: false, error: 'missing { url }' });
    }
    const format = body.format === 'pdf' ? 'pdf' : 'png';
    const width = typeof body.viewportWidth === 'number' ? body.viewportWidth : 1280;
    const height = typeof body.viewportHeight === 'number' ? body.viewportHeight : 720;
    const waitMs = typeof body.waitMs === 'number' ? Math.min(10_000, body.waitMs) : 1500;

    let chromium: typeof import('playwright').chromium | undefined;
    try {
      ({ chromium } = (await import('playwright')) as typeof import('playwright'));
    } catch {
      return reply.code(503).send({
        ok: false,
        error:
          'Playwright not installed. Run `pnpm --filter @vistrates/server exec playwright install chromium` to enable Golem snapshots.',
      });
    }

    const browser = await chromium.launch({ headless: true });
    try {
      const ctx = await browser.newContext({ viewport: { width, height } });
      const page = await ctx.newPage();
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(waitMs);
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const ext = format === 'pdf' ? 'pdf' : 'png';
      const file = join(SNAPSHOT_DIR, `golem-${stamp}.${ext}`);
      if (format === 'pdf') {
        const pdf = await page.pdf({ format: 'Letter' });
        await writeFile(file, pdf);
      } else {
        await page.screenshot({ path: file, fullPage: true });
      }
      return reply.send({ ok: true, file });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.code(500).send({ ok: false, error: message });
    } finally {
      await browser.close();
    }
  });
}

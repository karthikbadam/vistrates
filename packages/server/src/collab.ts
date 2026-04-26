import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import * as Y from 'yjs';

/** WebSocket-shaped peer the y-websocket utils accept. */
type WsPeer = unknown;

const DATA_DIR = join(process.cwd(), 'apps/server/data');

interface YWsUtils {
  setupWSConnection: (
    conn: WsPeer,
    req: { url?: string },
    options?: { docName?: string; gc?: boolean },
  ) => void;
  setPersistence: (p: {
    provider: 'fs';
    bindState: (docName: string, ydoc: Y.Doc) => Promise<void> | void;
    writeState: (docName: string, ydoc: Y.Doc) => Promise<void> | void;
  }) => void;
  getYDoc: (name: string) => Y.Doc;
  docs: Map<string, Y.Doc>;
}

/**
 * Wire `y-websocket` collaborative sync into Fastify.
 *
 *   ws://host:port/collab/<docId>
 *
 * Documents are persisted to `apps/server/data/<docId>.bin` (a single Yjs
 * update binary) on every transaction. Existing files are loaded into the
 * Y.Doc on first connection.
 */
export async function registerCollab(app: FastifyInstance): Promise<void> {
  const websocket = await import('@fastify/websocket');
  const fastifyWebsocket = (websocket as unknown as { default: typeof websocket.default }).default;
  await app.register(fastifyWebsocket);

  await mkdir(DATA_DIR, { recursive: true });

  // y-websocket/bin/utils is a CJS module; import via dynamic import.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const utils = (await import(/* @vite-ignore */ 'y-websocket/bin/utils' as any)) as unknown as YWsUtils;

  utils.setPersistence({
    provider: 'fs',
    bindState: async (docName, ydoc) => {
      const file = join(DATA_DIR, sanitize(docName) + '.bin');
      if (!existsSync(file)) return;
      const buf = await readFile(file);
      Y.applyUpdate(ydoc, new Uint8Array(buf));
      app.log.info(`[collab] loaded ${docName} (${buf.byteLength} bytes)`);
    },
    writeState: async (docName, ydoc) => {
      const update = Y.encodeStateAsUpdate(ydoc);
      const file = join(DATA_DIR, sanitize(docName) + '.bin');
      await writeFile(file, update);
    },
  });

  // Persist on every transaction (debounced by file system writes).
  const docsMap = utils.docs;
  const flush = (docName: string, ydoc: Y.Doc): void => {
    void (async () => {
      const update = Y.encodeStateAsUpdate(ydoc);
      const file = join(DATA_DIR, sanitize(docName) + '.bin');
      await writeFile(file, update);
    })();
  };

  // Patch newly-tracked docs to write on each update transaction.
  const seen = new WeakSet<Y.Doc>();
  setInterval(() => {
    for (const [name, doc] of docsMap.entries()) {
      if (seen.has(doc)) continue;
      seen.add(doc);
      doc.on('update', () => flush(name, doc));
    }
  }, 1000);

  app.get<{ Params: { doc: string } }>('/collab/:doc', { websocket: true }, (sock, req) => {
    const params = req.params;
    const docName = params.doc;
    utils.setupWSConnection(sock as WsPeer, { url: `/${docName}` }, { docName });
  });
}

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 128);
}

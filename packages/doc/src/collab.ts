import type * as Y from 'yjs';
import type { DocStore } from './docStore.js';

export interface CollabSession {
  readonly awareness: unknown;
  destroy(): void;
}

/**
 * Connect a DocStore to a y-websocket server room.
 *
 * Browser-only. Returns the underlying provider's `awareness` object as
 * `unknown` to avoid leaking the y-websocket type surface; UI code that
 * actually uses awareness should narrow at the call site.
 */
export async function connectWebsocket(
  store: DocStore,
  opts: { url: string; room: string },
): Promise<CollabSession> {
  const mod = (await import('y-websocket')) as unknown as {
    WebsocketProvider: new (
      url: string,
      room: string,
      doc: Y.Doc,
    ) => { awareness: unknown; destroy: () => void };
  };
  const provider = new mod.WebsocketProvider(opts.url, opts.room, store.yDoc);
  return {
    awareness: provider.awareness,
    destroy: () => provider.destroy(),
  };
}

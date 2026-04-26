import type * as Y from 'yjs';
import type { DocStore } from './docStore.js';

export interface LocalPersistence {
  /** Resolves once initial state has been loaded from IndexedDB. */
  readonly whenSynced: Promise<void>;
  destroy(): void;
}

/**
 * Attach `y-indexeddb` to a DocStore for local-first persistence.
 *
 * Browser-only. Throws if called in Node — the y-indexeddb module assumes
 * `indexedDB` exists. Servers should not call this.
 */
export async function attachIndexedDB(
  store: DocStore,
  dbName: string,
): Promise<LocalPersistence> {
  if (typeof indexedDB === 'undefined') {
    throw new Error('attachIndexedDB called in non-browser environment');
  }
  const mod = (await import('y-indexeddb')) as unknown as {
    IndexeddbPersistence: new (
      name: string,
      doc: Y.Doc,
    ) => { whenSynced: Promise<void>; destroy: () => void };
  };
  const persistence = new mod.IndexeddbPersistence(dbName, store.yDoc);
  return {
    whenSynced: persistence.whenSynced,
    destroy: () => persistence.destroy(),
  };
}

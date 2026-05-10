import { useState, type JSX } from 'react';
import { DEFAULT_DOC_ID } from '../defaultDoc.js';

const STORAGE_KEYS = ['vistrates.theme'];
const INDEXEDDB_NAMES = [`vistrates-${DEFAULT_DOC_ID}`];

/**
 * Wipe local persistence and reload the page so the demo doc boots fresh.
 * Useful when you've edited paragraphs into a corner and want a clean slate.
 */
export function ResetButton(): JSX.Element {
  const [busy, setBusy] = useState(false);

  const onReset = async (): Promise<void> => {
    if (!window.confirm('Reset local doc + theme + IndexedDB? Page will reload.')) return;
    setBusy(true);
    try {
      for (const k of STORAGE_KEYS) localStorage.removeItem(k);
      for (const name of INDEXEDDB_NAMES) {
        await new Promise<void>((resolve) => {
          const req = indexedDB.deleteDatabase(name);
          req.onsuccess = () => resolve();
          req.onerror = () => resolve();
          req.onblocked = () => resolve();
        });
      }
    } finally {
      window.location.reload();
    }
  };

  return (
    <button
      type="button"
      className="reset-btn"
      title="Wipe local storage + IndexedDB and reload"
      disabled={busy}
      onClick={() => {
        void onReset();
      }}
    >
      Reset
    </button>
  );
}

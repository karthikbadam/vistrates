import { useState, type JSX } from 'react';

const SERVER = import.meta.env.DEV ? 'http://127.0.0.1:3001' : '';

export function GolemSnapshot(): JSX.Element {
  const [status, setStatus] = useState<{ kind: 'idle' | 'running' | 'ok' | 'error'; message?: string }>(
    { kind: 'idle' },
  );

  const onSnapshot = async (): Promise<void> => {
    setStatus({ kind: 'running', message: 'Spawning headless browser…' });
    try {
      const res = await fetch(`${SERVER}/golem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: window.location.href, format: 'png', waitMs: 3000 }),
      });
      const json = (await res.json()) as { ok: boolean; file?: string; error?: string };
      if (json.ok) {
        setStatus({ kind: 'ok', message: `Saved ${json.file ?? '(unknown)'}` });
      } else {
        setStatus({ kind: 'error', message: json.error ?? `HTTP ${res.status}` });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setStatus({ kind: 'error', message });
    }
  };

  return (
    <div className="golem-snapshot">
      <button
        type="button"
        title="Render this page headlessly via Playwright (Golem)"
        disabled={status.kind === 'running'}
        onClick={() => {
          void onSnapshot();
        }}
      >
        {status.kind === 'running' ? '⏳' : '📷'} Snapshot
      </button>
      {status.message && (
        <span className={`golem-status status-${status.kind}`}>{status.message}</span>
      )}
    </div>
  );
}

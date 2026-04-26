import { useRef, useState, type JSX } from 'react';
import { useRuntime } from '../runtimeContext.js';
import { activeDemo } from '../defaultDoc.js';

/**
 * Save the live Y.Doc as a `.vistrate` file (raw `Y.encodeStateAsUpdate`
 * binary), and re-import it later. This preserves Y.Text-level paragraph
 * code edits, paragraph `data` overrides, and any future Yjs-backed state
 * the doc accumulates. Source of truth is the same binary the y-websocket
 * server persists to disk, so files round-trip cleanly across collab + local.
 */
export function FileIO(): JSX.Element {
  const { doc } = useRuntime();
  const [status, setStatus] = useState<{
    kind: 'idle' | 'busy' | 'ok' | 'error';
    message?: string;
  }>({ kind: 'idle' });
  const inputRef = useRef<HTMLInputElement | null>(null);

  const onSave = (): void => {
    setStatus({ kind: 'busy', message: 'Encoding…' });
    try {
      const update = doc.encodeUpdate();
      const blob = new Blob([new Uint8Array(update)], { type: 'application/octet-stream' });
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${activeDemo.id}-${stamp}.vistrate`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setStatus({ kind: 'ok', message: `Saved ${filename}` });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setStatus({ kind: 'error', message });
    }
  };

  const onPickFile = (): void => {
    inputRef.current?.click();
  };

  const onFileChosen = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus({ kind: 'busy', message: `Loading ${file.name}…` });
    try {
      const buf = await file.arrayBuffer();
      const update = new Uint8Array(buf);
      doc.applyUpdate(update);
      // Give y-indexeddb a tick to flush the merged state, then reload so the
      // runtime re-instantiates controllers against the restored doc state.
      setStatus({ kind: 'ok', message: 'Loaded; reloading…' });
      setTimeout(() => window.location.reload(), 600);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setStatus({ kind: 'error', message });
    } finally {
      // Clear the input so the same file can be re-chosen later
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="file-io">
      <button
        type="button"
        title="Download the current Y.Doc as a .vistrate file"
        onClick={onSave}
        disabled={status.kind === 'busy'}
      >
        Save
      </button>
      <button
        type="button"
        title="Load a .vistrate file (merges into the current doc, then reloads)"
        onClick={onPickFile}
        disabled={status.kind === 'busy'}
      >
        Load
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".vistrate,application/octet-stream"
        style={{ display: 'none' }}
        onChange={(e) => {
          void onFileChosen(e);
        }}
      />
      {status.message && <span className={`file-io-status status-${status.kind}`}>{status.message}</span>}
    </div>
  );
}

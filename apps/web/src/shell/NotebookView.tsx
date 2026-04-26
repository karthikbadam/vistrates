import { useEffect, useRef, useState } from 'react';
import { evaluateParagraph } from '@vistrates/runtime';
import { asComponentId } from '@vistrates/types';
import { CodeEditor } from '../editor/codeEditor.js';
import { demoDoc, type DemoParagraphConfig } from '../defaultDoc.js';
import { useRuntime, useTopologyTick } from '../runtimeContext.js';

interface ParagraphCardProps {
  readonly config: DemoParagraphConfig;
}

function ParagraphCard({ config }: ParagraphCardProps): React.JSX.Element {
  const { runtime, evalCtx, hostFor } = useRuntime();
  const [code, setCode] = useState(config.code ?? '');
  const [status, setStatus] = useState<{ kind: 'idle' | 'ok' | 'error'; message?: string }>({
    kind: 'idle',
  });
  const slotRef = useRef<HTMLDivElement | null>(null);

  useTopologyTick();
  const controller = runtime.getController(asComponentId(config.paragraphId));
  const output = controller?.output;

  // Adopt the runtime-owned vis-host into this card's slot for visible
  // (visualization) paragraphs. The host is a singleton owned by the
  // runtime — switching tabs simply moves the same DOM node, so charts
  // keep their state.
  const hasView = config.visible !== false;
  useEffect(() => {
    if (!hasView) return;
    const slot = slotRef.current;
    if (!slot) return;
    const host = hostFor(config.paragraphId);
    if (host.parentElement !== slot) {
      slot.replaceChildren(host);
    }
  }, [hasView, hostFor, config.paragraphId]);

  const onRun = async (): Promise<void> => {
    const result = evaluateParagraph(code, evalCtx);
    if (!result.ok) {
      setStatus({ kind: 'error', message: result.error.message });
      return;
    }
    try {
      if (!runtime.hasDefinition(result.definition.id)) {
        runtime.registerDefinition(result.definition);
      }
      await runtime.hotSwap(asComponentId(config.paragraphId), result.definition);
      setStatus({ kind: 'ok', message: `Ran ${result.definition.name}` });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setStatus({ kind: 'error', message });
    }
  };

  return (
    <article className="paragraph">
      <header>
        <span className="pill">{config.defId}</span>
        <h3>{config.name}</h3>
        <button
          type="button"
          className="run-btn"
          onClick={() => {
            void onRun();
          }}
        >
          ▶ Run
        </button>
      </header>
      <CodeEditor value={code} onChange={setCode} />
      {hasView && (
        <div className="paragraph-output">
          <div className="paragraph-output-label">Output</div>
          <div className="paragraph-output-slot" ref={slotRef} />
        </div>
      )}
      <footer>
        <span className={`status status-${status.kind}`}>
          {status.kind === 'idle' ? '—' : status.message}
        </span>
        <span className="output-summary">
          {output
            ? `${output.kind}${output.kind === 'table' ? ` "${output.tableName}"` : ''}`
            : 'no output'}
        </span>
      </footer>
    </article>
  );
}

export function NotebookView(): React.JSX.Element {
  return (
    <section className="notebook">
      {demoDoc.map((p) => (
        <ParagraphCard key={p.paragraphId} config={p} />
      ))}
    </section>
  );
}

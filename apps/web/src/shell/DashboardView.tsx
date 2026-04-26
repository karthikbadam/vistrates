import { useEffect, useRef } from 'react';
import { demoDoc } from '../defaultDoc.js';
import { useRuntime, useTopologyTick } from '../runtimeContext.js';
import { ErrorBoundary } from './ErrorBoundary.js';
import { DemoCards } from './DemoCards.js';

interface ViewCardProps {
  readonly paragraphId: string;
  readonly name: string;
}

function ViewCard({ paragraphId, name }: ViewCardProps): React.JSX.Element {
  const { hostFor } = useRuntime();
  const slotRef = useRef<HTMLDivElement | null>(null);
  useTopologyTick();

  useEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;
    const host = hostFor(paragraphId);
    // The runtime mounted the visualization into `host`. We slot it into the DOM.
    if (host.parentElement !== slot) {
      slot.replaceChildren(host);
    }
    return () => {
      // Don't detach on unmount — the runtime owns this host across renders.
    };
  }, [hostFor, paragraphId]);

  return (
    <article className="view-card">
      <header>{name}</header>
      <div className="view-slot" ref={slotRef} />
    </article>
  );
}

export function DashboardView(): React.JSX.Element {
  const visible = demoDoc.filter((p) => p.visible !== false);
  return (
    <>
      <DemoCards />
      <section className="dashboard">
        {visible.map((p) => (
          <ErrorBoundary key={p.paragraphId} label={p.name}>
            <ViewCard paragraphId={p.paragraphId} name={p.name} />
          </ErrorBoundary>
        ))}
      </section>
    </>
  );
}

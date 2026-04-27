import { useRef } from 'react';
import { demoDoc } from '../defaultDoc.js';
import { useTopologyTick } from '../runtimeContext.js';
import { ErrorBoundary } from './ErrorBoundary.js';
import { useHostSlot } from './useHostSlot.js';

interface ViewCardProps {
  readonly paragraphId: string;
  readonly name: string;
}

function ViewCard({ paragraphId, name }: ViewCardProps): React.JSX.Element {
  const slotRef = useRef<HTMLDivElement | null>(null);
  useTopologyTick();
  useHostSlot(paragraphId, slotRef);

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
    <section className="dashboard">
      {visible.map((p) => (
        <ErrorBoundary key={p.paragraphId} label={p.name}>
          <ViewCard paragraphId={p.paragraphId} name={p.name} />
        </ErrorBoundary>
      ))}
    </section>
  );
}

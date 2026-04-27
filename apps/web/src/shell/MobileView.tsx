import { useRef, useState, type JSX } from 'react';
import { demoDoc } from '../defaultDoc.js';
import { useTopologyTick } from '../runtimeContext.js';
import { useHostSlot } from './useHostSlot.js';

export function MobileView(): JSX.Element {
  const [idx, setIdx] = useState(0);
  const slotRef = useRef<HTMLDivElement | null>(null);
  useTopologyTick();

  const visible = demoDoc.filter((p) => p.visible !== false);
  const current = visible[idx];
  useHostSlot(current?.paragraphId, slotRef);

  if (!current) return <p>No paragraphs in this doc.</p>;

  return (
    <section className="mobile">
      <div className="mobile-frame">
        <header className="mobile-header">
          <button
            type="button"
            disabled={idx === 0}
            onClick={() => setIdx((n) => Math.max(0, n - 1))}
            aria-label="previous"
          >
            Prev
          </button>
          <span className="title">
            {current.name}
            <span className="counter">
              {idx + 1} / {visible.length}
            </span>
          </span>
          <button
            type="button"
            disabled={idx >= visible.length - 1}
            onClick={() => setIdx((n) => Math.min(visible.length - 1, n + 1))}
            aria-label="next"
          >
            →
          </button>
        </header>
        <div className="mobile-slot" ref={slotRef} />
      </div>
    </section>
  );
}

import { useEffect, useRef, useState, type JSX } from 'react';
import { demoDoc } from '../defaultDoc.js';
import { useTopologyTick } from '../runtimeContext.js';
import { useHostSlot } from './useHostSlot.js';

export function PresentationView(): JSX.Element {
  const [slide, setSlide] = useState(0);
  const slotRef = useRef<HTMLDivElement | null>(null);
  useTopologyTick();

  // The TraLuver-style slide template: a title, the active component view,
  // and a footer with slide counter. Built-in keyboard nav.
  const visible = demoDoc.filter((p) => p.visible !== false);
  const current = visible[slide];
  useHostSlot(current?.paragraphId, slotRef);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        setSlide((n) => Math.min(visible.length - 1, n + 1));
      } else if (e.key === 'ArrowLeft') {
        setSlide((n) => Math.max(0, n - 1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!current) return <p>Empty doc.</p>;

  return (
    <section className="presentation">
      <article className="slide tra-luver">
        <header className="slide-header">
          <h2>{current.name}</h2>
          <p className="slide-meta">{current.defId}</p>
        </header>
        <div className="slide-stage" ref={slotRef} />
        <footer className="slide-footer">
          <button
            type="button"
            disabled={slide === 0}
            onClick={() => setSlide((n) => Math.max(0, n - 1))}
          >
            ←
          </button>
          <span className="slide-counter">
            {slide + 1} / {visible.length}
          </span>
          <button
            type="button"
            disabled={slide === visible.length - 1}
            onClick={() => setSlide((n) => Math.min(visible.length - 1, n + 1))}
          >
            →
          </button>
        </footer>
      </article>
      <p className="muted center">Use ← / → / space to navigate.</p>
    </section>
  );
}

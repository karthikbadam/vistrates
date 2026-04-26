import type { JSX } from 'react';
import { activeDemo, demos, type Demo } from '../defaultDoc.js';

function urlFor(demo: Demo): string {
  const url = new URL(window.location.href);
  url.searchParams.set('demo', demo.id);
  return url.toString();
}

export function DemoCards(): JSX.Element {
  return (
    <section className="demo-cards">
      <header>
        <h2>Demos</h2>
        <p className="muted">
          Switch demos by clicking a card; the page reloads with the new doc. Each demo wires
          source → processing → visualization end-to-end against DuckDB-WASM and a Mosaic
          coordinator.
        </p>
      </header>
      <div className="demo-cards-grid">
        {demos.map((d) => {
          const active = d.id === activeDemo.id;
          return (
            <a
              key={d.id}
              href={urlFor(d)}
              className={`demo-card${active ? ' active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <span className="demo-card-id">?demo={d.id}</span>
              <h3>{d.title}</h3>
              <p>{d.description}</p>
              {active && <span className="demo-card-badge">currently viewing</span>}
            </a>
          );
        })}
      </div>
    </section>
  );
}

import type { JSX } from 'react';
import { demos } from '../defaultDoc.js';

const REPO = 'https://github.com/karthikbadam/vistrates';
const DEFAULT_DEMO = 'exoplanets';

function go(demoId: string): void {
  const url = new URL(window.location.href);
  url.searchParams.set('demo', demoId);
  window.location.href = url.toString();
}

export function Landing(): JSX.Element {
  return (
    <main className="landing">
      <header className="landing-nav">
        <div className="landing-brand">
          <h1>Vistrates</h1>
          <span className="landing-version">2.0</span>
        </div>
        <a href={REPO} target="_blank" rel="noopener noreferrer" className="landing-nav-link">
          GitHub
        </a>
      </header>

      <section className="landing-hero">
        <h2 className="landing-headline">
          Reactive visual analytics,
          <br />
          in your browser.
        </h2>

        <div className="landing-body">
          <p>
            Vistrates is a literate, component-based platform for building visual analytics. Wire
            data sources, transforms, selections and charts as nodes on a dataflow graph — every
            edge is reactive, every change propagates downstream automatically.
          </p>
          <p>
            DuckDB-WASM powers the data layer; Mosaic + Vega-Lite drive visualization; Yjs handles
            persistence and (optional) collab. Everything runs in the browser. No backend required.
          </p>
        </div>

        <div className="landing-ctas">
          <button type="button" className="landing-cta primary" onClick={() => go(DEFAULT_DEMO)}>
            Open the dashboard
          </button>
          <a href={REPO} target="_blank" rel="noopener noreferrer" className="landing-cta outline">
            View source
          </a>
        </div>

        <p className="landing-note">
          v2.0 — modern TypeScript rebuild. The literate runtime + 5-chart linked-selection demo
          are working end-to-end.
        </p>
      </section>

      <section className="landing-demos">
        <header>
          <h3>Demos</h3>
          <p>Each demo boots an end-to-end pipeline — sources, transforms, charts, all reactive.</p>
        </header>
        <div className="landing-demo-grid">
          {demos.map((d) => (
            <a
              key={d.id}
              href={`?demo=${d.id}`}
              className="landing-demo-card"
              onClick={(e) => {
                e.preventDefault();
                go(d.id);
              }}
            >
              <span className="landing-demo-id">demo={d.id}</span>
              <h4>{d.title}</h4>
              <p>{d.description}</p>
              <span className="landing-demo-arrow">Open →</span>
            </a>
          ))}
        </div>
      </section>

      <section className="landing-arch">
        <header>
          <h3>What's inside</h3>
        </header>
        <div className="landing-arch-grid">
          <div>
            <h4>Dataflow runtime</h4>
            <p>
              Components are nodes with typed src/props and a `VisController` lifecycle.
              Outputs (`table` / `clause` / `value` / `selection`) propagate through the graph.
            </p>
          </div>
          <div>
            <h4>Mosaic + DuckDB-WASM</h4>
            <p>
              All tabular data lives in DuckDB-WASM. Mosaic vgplot specs render charts; a shared
              `Selection` node wired into multiple charts gives linked brushing for free.
            </p>
          </div>
          <div>
            <h4>Live coding</h4>
            <p>
              Every paragraph is a CodeMirror editor. Click Run to hot-swap the component
              definition without losing pipeline state.
            </p>
          </div>
          <div>
            <h4>Multi-level views</h4>
            <p>
              The same paragraphs surface as a Notebook, Dashboard, Pipeline DAG, freeform Canvas,
              Presentation slides, and a Mobile single-component view.
            </p>
          </div>
          <div>
            <h4>Yjs-backed doc</h4>
            <p>
              IndexedDB local-first by default. Add `?collab=1` and the Fastify server provides
              y-websocket sync and on-disk persistence.
            </p>
          </div>
          <div>
            <h4>Portable file format</h4>
            <p>
              Save the live Y.Doc as a `.vistrate` binary; load it back on any machine. Same
              format the collab server persists.
            </p>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <p>
          A modern TypeScript rebuild of{' '}
          <a
            href="https://hcil.umd.edu/vistrates/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Vistrates
          </a>{' '}
          (Badam et al., IEEE VIS 2018) — without the Codestrates / Webstrates substrate.
        </p>
        <p>
          MIT — original copyright 2018 Sriram Karthik Badam, Andreas Mathisen, Roman Rädle,
          Clemens Klokmose, Niklas Elmqvist; rebuild 2026.
        </p>
      </footer>
    </main>
  );
}

import type { JSX } from 'react';

export function App(): JSX.Element {
  return (
    <main className="app">
      <header>
        <h1>Vistrates</h1>
        <p className="subtitle">
          Literate, reactive component platform for visual analytics — modern TypeScript rebuild.
        </p>
      </header>
      <section className="phase">
        <h2>Phase 0 scaffold ready</h2>
        <p>
          The legacy Codestrate tree lives under <code>legacy/</code>. The modern app boots from
          this Vite + React 19 + TypeScript scaffold. Subsequent phases land in{' '}
          <code>packages/&#123;types,runtime,doc,data,components,server&#125;</code> and{' '}
          <code>apps/web/src</code>.
        </p>
        <p>
          See <code>docs/PLAN.md</code> and <code>docs/STATUS.md</code> for the modernization plan
          and progress.
        </p>
      </section>
    </main>
  );
}

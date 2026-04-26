import { useState, type JSX } from 'react';
import { RuntimeProvider, useRuntime } from '../runtimeContext.js';
import { NotebookView } from './NotebookView.js';
import { DashboardView } from './DashboardView.js';
import { PipelineView } from './PipelineView.js';
import { MobileView } from './MobileView.js';
import { CanvasView } from './CanvasView.js';
import { PresentationView } from './PresentationView.js';
import { ThemeToggle } from './ThemeToggle.js';
import { GolemSnapshot } from './GolemSnapshot.js';
import { ResetButton } from './ResetButton.js';
import { ErrorBoundary } from './ErrorBoundary.js';
import { DemoPicker } from './DemoPicker.js';
import { FileIO } from './FileIO.js';
import { activeDemo } from '../defaultDoc.js';

type Tab = 'notebook' | 'dashboard' | 'pipeline' | 'canvas' | 'present' | 'mobile';

function BootGate({ children }: { readonly children: JSX.Element }): JSX.Element {
  const { bootStatus } = useRuntime();
  if (bootStatus === 'pending') {
    return (
      <div className="boot">
        <p>Booting Vistrates runtime…</p>
        <p className="muted">Loading DuckDB-WASM, registering components, instantiating demo.</p>
      </div>
    );
  }
  if (typeof bootStatus === 'object') {
    return (
      <div className="boot error">
        <h2>Boot failed</h2>
        <pre>{bootStatus.error}</pre>
      </div>
    );
  }
  return children;
}

function Shell(): JSX.Element {
  const [tab, setTab] = useState<Tab>('dashboard');
  return (
    <main className="app">
      <header className="app-header">
        <div className="brand">
          <h1>Vistrates</h1>
          <span className="brand-sub">{activeDemo.title}</span>
        </div>
        <nav className="tabs">
          {(['dashboard', 'notebook', 'pipeline', 'canvas', 'present', 'mobile'] as const).map((t) => (
            <button
              key={t}
              type="button"
              className={tab === t ? 'active' : ''}
              onClick={() => setTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </nav>
        <div className="header-tools">
          <DemoPicker />
          <FileIO />
          <GolemSnapshot />
          <ResetButton />
          <ThemeToggle />
        </div>
      </header>
      <BootGate>
        {tab === 'dashboard' ? (
          <DashboardView />
        ) : tab === 'notebook' ? (
          <NotebookView />
        ) : tab === 'pipeline' ? (
          <PipelineView />
        ) : tab === 'canvas' ? (
          <CanvasView />
        ) : tab === 'present' ? (
          <PresentationView />
        ) : (
          <MobileView />
        )}
      </BootGate>
    </main>
  );
}

export function App(): JSX.Element {
  return (
    <ErrorBoundary label="Vistrates shell">
      <RuntimeProvider>
        <Shell />
      </RuntimeProvider>
    </ErrorBoundary>
  );
}

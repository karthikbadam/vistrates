import { useState, type JSX } from 'react';
import { RuntimeProvider, useRuntime } from '../runtimeContext.js';
import { NotebookView } from './NotebookView.js';
import { DashboardView } from './DashboardView.js';
import { PipelineView } from './PipelineView.js';
import { MobileView } from './MobileView.js';
import { CanvasView } from './CanvasView.js';
import { PresentationView } from './PresentationView.js';
import { GolemSnapshot } from './GolemSnapshot.js';
import { ResetButton } from './ResetButton.js';
import { ErrorBoundary } from './ErrorBoundary.js';
import { DemoPicker } from './DemoPicker.js';
import { FileIO } from './FileIO.js';
import { Landing } from './Landing.js';
import { activeDemo } from '../defaultDoc.js';

/**
 * URL contract:
 *   /                    → Landing page
 *   /?demo=<id>          → app shell, that demo active
 *   /?demo=<id>&collab=1 → ditto + websocket collab
 *
 * The landing page is the default entry; clicking any demo card navigates
 * to ?demo=<id>, which boots the runtime + the chosen demo.
 */
function shouldShowApp(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).has('demo');
}

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
        <a className="brand" href="./" title="Back to landing">
          <h1>Vistrates</h1>
          <span className="brand-sub">{activeDemo.title}</span>
        </a>
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
      {shouldShowApp() ? (
        <RuntimeProvider>
          <Shell />
        </RuntimeProvider>
      ) : (
        <Landing />
      )}
    </ErrorBoundary>
  );
}

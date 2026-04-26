import { useState, type JSX } from 'react';
import { RuntimeProvider, useRuntime } from '../runtimeContext.js';
import { NotebookView } from './NotebookView.js';
import { DashboardView } from './DashboardView.js';

type Tab = 'notebook' | 'dashboard';

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
        <h1>Vistrates</h1>
        <nav className="tabs">
          <button
            type="button"
            className={tab === 'dashboard' ? 'active' : ''}
            onClick={() => setTab('dashboard')}
          >
            Dashboard
          </button>
          <button
            type="button"
            className={tab === 'notebook' ? 'active' : ''}
            onClick={() => setTab('notebook')}
          >
            Notebook
          </button>
        </nav>
      </header>
      <BootGate>{tab === 'dashboard' ? <DashboardView /> : <NotebookView />}</BootGate>
    </main>
  );
}

export function App(): JSX.Element {
  return (
    <RuntimeProvider>
      <Shell />
    </RuntimeProvider>
  );
}

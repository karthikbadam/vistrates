import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  readonly children: ReactNode;
  readonly fallback?: (error: Error, retry: () => void) => ReactNode;
  readonly label?: string;
}

interface State {
  readonly error: Error | null;
}

/**
 * React ErrorBoundary for view-tile islands. A single component throwing
 * inside its render path doesn't kill the whole dashboard — it shows a
 * compact error card with a Retry button instead.
 *
 * Mirrors the spirit of the original Vistrates VM-level try/catch around
 * init/update/destroy (`legacy/Vistrates/kTKppb2i-Vistrate.csp` lines
 * 455-461) but at the React layer rather than inside the runtime.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[vistrates] ErrorBoundary${this.props.label ? ` (${this.props.label})` : ''}:`, error, info);
  }

  override render(): ReactNode {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, () => this.setState({ error: null }));
      }
      return (
        <div className="error-boundary">
          <strong>Component error{this.props.label ? ` — ${this.props.label}` : ''}</strong>
          <pre>{this.state.error.message}</pre>
          <button type="button" onClick={() => this.setState({ error: null })}>
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

import type { VisView } from '@vistrates/types';

export type ReactRenderer = (node: unknown, host: HTMLElement) => void;
export type ReactUnmounter = (host: HTMLElement) => void;

export interface VisViewOptions {
  readonly mode: 'react' | 'dom';
  readonly host: HTMLElement;
  /** React mode only. The React adapter (Phase 5) wires this up. */
  readonly reactRenderer?: ReactRenderer;
  readonly reactUnmounter?: ReactUnmounter;
}

export class VisViewImpl implements VisView {
  readonly mode: 'react' | 'dom';
  readonly element: HTMLElement;
  #originalParent: ParentNode | null = null;
  #originalNextSibling: Node | null = null;
  readonly #reactRenderer: ReactRenderer | undefined;
  readonly #reactUnmounter: ReactUnmounter | undefined;

  constructor(opts: VisViewOptions) {
    this.mode = opts.mode;
    this.element = opts.host;
    this.#reactRenderer = opts.reactRenderer;
    this.#reactUnmounter = opts.reactUnmounter;
  }

  setHTML(html: string): void {
    if (this.mode !== 'dom') {
      throw new Error('VisView.setHTML is only valid in dom mode');
    }
    this.element.innerHTML = html;
  }

  render(node: unknown): void {
    if (this.mode !== 'react') {
      throw new Error('VisView.render is only valid in react mode');
    }
    if (!this.#reactRenderer) {
      throw new Error('VisView.render: no React renderer attached');
    }
    this.#reactRenderer(node, this.element);
  }

  moveTo(target: HTMLElement, before: Node | null = null): void {
    if (!this.#originalParent) {
      this.#originalParent = this.element.parentNode;
      this.#originalNextSibling = this.element.nextSibling;
    }
    target.insertBefore(this.element, before);
  }

  moveBack(): void {
    if (!this.#originalParent) return;
    this.#originalParent.insertBefore(this.element, this.#originalNextSibling);
    this.#originalParent = null;
    this.#originalNextSibling = null;
  }

  /** Tear down React state if any. Safe to call regardless of mode. */
  unmount(): void {
    if (this.mode === 'react' && this.#reactUnmounter) {
      this.#reactUnmounter(this.element);
    }
    this.element.replaceChildren();
  }
}

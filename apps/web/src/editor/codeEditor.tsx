import { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, lineNumbers } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';
import { typewriterExtension } from './typewriter.js';

/** A CSS-variable-driven CodeMirror theme that follows the page's
 *  --vs-* tokens, so the editor automatically tracks light/dark. */
const cssVarTheme = EditorView.theme({
  '&': {
    color: 'var(--vs-fg)',
    backgroundColor: 'var(--vs-card-2)',
    fontSize: '13px',
  },
  '.cm-content': {
    fontFamily: 'ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, monospace',
    caretColor: 'var(--vs-accent)',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--vs-card-2)',
    color: 'var(--vs-muted)',
    border: 'none',
    borderRight: '1px solid var(--vs-border)',
  },
  '.cm-cursor': { borderLeftColor: 'var(--vs-accent)' },
  '.cm-activeLine': { backgroundColor: 'transparent' },
  '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--vs-fg)' },
  '.cm-selectionBackground, ::selection': { backgroundColor: 'var(--vs-accent-soft) !important' },
  '.cm-line': { padding: '0 8px' },
  '&.cm-focused': { outline: 'none' },
});

interface CodeEditorProps {
  readonly value: string;
  readonly onChange?: (value: string) => void;
  readonly readOnly?: boolean;
}

export function CodeEditor({ value, onChange, readOnly = false }: CodeEditorProps): React.JSX.Element {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!hostRef.current) return;
    const view = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          javascript(),
          cssVarTheme,
          typewriterExtension,
          EditorState.readOnly.of(readOnly),
          EditorView.updateListener.of((u) => {
            if (u.docChanged && onChange) {
              onChange(u.state.doc.toString());
            }
          }),
        ],
      }),
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  // Sync external value changes (e.g. paragraph reset) without recreating the view.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === value) return;
    view.dispatch({ changes: { from: 0, to: current.length, insert: value } });
  }, [value]);

  return <div ref={hostRef} className="cm-host" />;
}

import { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, lineNumbers } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { typewriterExtension } from './typewriter.js';

/** Syntax color palette tuned for the sharp B/W theme. */
const syntaxStyle = HighlightStyle.define([
  { tag: tags.keyword, color: '#dfd0b8' },
  { tag: tags.controlKeyword, color: '#dfd0b8' },
  { tag: tags.definitionKeyword, color: '#dfd0b8' },
  { tag: tags.operatorKeyword, color: '#dfd0b8' },
  { tag: tags.modifier, color: '#dfd0b8' },
  { tag: [tags.string, tags.special(tags.string), tags.regexp], color: '#9ae6b4' },
  { tag: [tags.number, tags.bool, tags.null, tags.atom], color: '#fbb86b' },
  { tag: [tags.lineComment, tags.blockComment, tags.docComment], color: '#666', fontStyle: 'italic' },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: '#82c1ff' },
  { tag: tags.propertyName, color: '#82c1ff' },
  { tag: tags.className, color: '#dfd0b8' },
  { tag: tags.typeName, color: '#dfd0b8' },
  { tag: tags.operator, color: '#888' },
  { tag: tags.bracket, color: '#888' },
  { tag: tags.punctuation, color: '#888' },
  { tag: tags.variableName, color: '#fff' },
  { tag: tags.invalid, color: '#fc8181' },
]);

/** A CSS-variable-driven CodeMirror theme that follows the page's
 *  --vs-* tokens, so the editor automatically tracks light/dark. */
const cssVarTheme = EditorView.theme({
  '&': {
    color: 'var(--vs-fg)',
    backgroundColor: 'var(--vs-bg)',
    fontSize: '12px',
  },
  '.cm-content': {
    fontFamily: 'ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, monospace',
    caretColor: 'var(--vs-accent)',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--vs-bg)',
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
          syntaxHighlighting(syntaxStyle),
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

import { keymap } from '@codemirror/view';
import type { KeyBinding } from '@codemirror/view';

const SNIPPETS: Readonly<Record<string, string>> = {
  vc: `vc = {
  id: 'my-component',
  name: 'My Component',
  version: '0.1.0',
  src: {},
  props: [],
  init() {
    // …
  },
};`,
  mosaic: `return makeMosaicComponent({
  id: 'my-bar',
  name: 'My Bar',
  version: '0.1.0',
  spec: ({ table, selection }) =>
    vg.plot(
      vg.barY(vg.from(table, { filterBy: selection }), { x: 'x', y: vg.count() }),
      vg.width(640),
      vg.height(360),
    ),
});`,
  vega: `return makeVegaLiteComponent({
  id: 'my-vega',
  name: 'My Vega',
  version: '0.1.0',
  spec: () => ({
    mark: 'point',
    encoding: {
      x: { field: 'x', type: 'quantitative' },
      y: { field: 'y', type: 'quantitative' },
    },
  }),
});`,
};

/**
 * CodeMirror 6 keymap that expands a snippet trigger when Tab is pressed
 * immediately after typing the trigger word. E.g. `vc<Tab>` expands to a
 * VisComponentDefinition skeleton.
 *
 * Equivalent of the original Vistrates "Typewriter" package.
 */
export const typewriter: readonly KeyBinding[] = [
  {
    key: 'Tab',
    run: (view) => {
      const { state } = view;
      const sel = state.selection.main;
      if (!sel.empty) return false;
      const line = state.doc.lineAt(sel.head);
      const before = line.text.slice(0, sel.head - line.from);
      const m = /(\b[a-z]+)$/.exec(before);
      if (!m) return false;
      const word = m[1];
      if (!word) return false;
      const expansion = SNIPPETS[word];
      if (!expansion) return false;
      view.dispatch({
        changes: { from: sel.head - word.length, to: sel.head, insert: expansion },
        selection: { anchor: sel.head - word.length + expansion.length },
      });
      return true;
    },
  },
];

export const typewriterExtension = keymap.of(typewriter);

export const SNIPPET_TRIGGERS = Object.keys(SNIPPETS);

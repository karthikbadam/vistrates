import { describe, it, expect } from 'vitest';
import { evaluateParagraph } from '../src/paragraphExec.js';

describe('evaluateParagraph', () => {
  it('parses an assignment-style component', () => {
    const result = evaluateParagraph(`
      vc = {
        id: 'demo',
        name: 'Demo',
        version: '0.1',
        src: {},
        props: [],
      };
    `);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.definition.id).toBe('demo');
      expect(result.definition.name).toBe('Demo');
    }
  });

  it('parses a return-style component', () => {
    const result = evaluateParagraph(`
      return {
        id: 'demo2',
        name: 'Demo 2',
        version: '0.2',
        src: {},
        props: [],
      };
    `);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.definition.id).toBe('demo2');
  });

  it('captures syntax errors as structured failures', () => {
    const r = evaluateParagraph('this is not valid javascript $$$');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toMatch(/Unexpected/);
  });

  it('rejects non-component results', () => {
    const r = evaluateParagraph('return 42;');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toMatch(/VisComponentDefinition/);
  });

  it('passes ctx values into the eval scope', () => {
    const r = evaluateParagraph(
      `
      return {
        id: 'has-greeting',
        name: greeting,
        version: '0.1',
        src: {},
        props: [],
      };
    `,
      { greeting: 'Hello' },
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.definition.name).toBe('Hello');
  });
});

import { describe, it, expect } from 'vitest';
import { DocStore } from '../src/docStore.js';

describe('DocStore', () => {
  it('initializes meta and exposes a snapshot', () => {
    const s = new DocStore();
    s.init({ id: 'demo', title: 'Demo' });
    const snap = s.snapshot();
    expect(snap.id).toBe('demo');
    expect(snap.title).toBe('Demo');
    expect(snap.schemaVersion).toBe(1);
    expect(snap.sections).toEqual([]);
  });

  it('adds sections with paragraphs and reads them back', () => {
    const s = new DocStore();
    s.init({ id: 'd', title: 'T' });
    s.addSection({
      id: 'sec-1',
      name: 'Pipeline',
      paragraphs: [
        {
          id: 'p-loader',
          kind: 'code',
          name: 'CSV Loader',
          code: 'export const loader = "csv";',
          props: { src: 'iris.csv' },
        },
        {
          id: 'p-data',
          kind: 'data',
          data: { table: 'iris', rowCount: 150 },
        },
      ],
    });
    const snap = s.snapshot();
    expect(snap.sections).toHaveLength(1);
    expect(snap.sections[0]?.paragraphs).toHaveLength(2);
    expect(snap.sections[0]?.paragraphs[0]?.code).toContain('csv');
    expect(snap.sections[0]?.paragraphs[1]?.data).toEqual({ table: 'iris', rowCount: 150 });
  });

  it('patches paragraph data and view fields', () => {
    const s = new DocStore();
    s.init({ id: 'd', title: 'T' });
    s.addSection({
      id: 'sec',
      name: 'S',
      paragraphs: [{ id: 'p', kind: 'data', data: { count: 1 } }],
    });
    s.patchParagraphData('sec', 'p', { extra: 'hello' });
    s.patchParagraphView('sec', 'p', { width: 720 });
    const para = s.snapshot().sections[0]?.paragraphs[0];
    expect(para?.data).toEqual({ count: 1, extra: 'hello' });
    expect(para?.view).toEqual({ width: 720 });
  });

  it('replaces code via Y.Text without losing identity', () => {
    const s = new DocStore();
    s.init({ id: 'd', title: 'T' });
    s.addSection({
      id: 'sec',
      name: 'S',
      paragraphs: [{ id: 'p', kind: 'code', code: 'first' }],
    });
    s.setParagraphCode('sec', 'p', 'second');
    expect(s.snapshot().sections[0]?.paragraphs[0]?.code).toBe('second');
  });

  it('syncs state between two stores via encodeUpdate / applyUpdate', () => {
    const a = new DocStore();
    a.init({ id: 'd', title: 'A' });
    a.addSection({
      id: 'sec',
      name: 'S',
      paragraphs: [{ id: 'p', kind: 'code', code: 'console.log(1);' }],
    });

    const b = new DocStore();
    b.applyUpdate(a.encodeUpdate());

    const snap = b.snapshot();
    expect(snap.id).toBe('d');
    expect(snap.title).toBe('A');
    expect(snap.sections[0]?.paragraphs[0]?.code).toBe('console.log(1);');

    // Edit on B and sync back to A
    b.setParagraphCode('sec', 'p', 'console.log(2);');
    a.applyUpdate(b.encodeUpdate());
    expect(a.snapshot().sections[0]?.paragraphs[0]?.code).toBe('console.log(2);');
  });

  it('throws when patching a missing paragraph', () => {
    const s = new DocStore();
    s.init({ id: 'd', title: 'T' });
    expect(() => s.patchParagraphData('nope', 'nope', {})).toThrow();
  });
});

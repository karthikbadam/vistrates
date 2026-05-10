import { describe, it, expect } from 'vitest';
import { evaluateParagraph } from '@vistrates/runtime';
import { Selection } from '@uwdata/mosaic-core';
import {
  builtinComponents,
  makeMosaicComponent,
  makeSemioticComponent,
  makeVegaLiteComponent,
} from '@vistrates/components';
import { demos } from '../src/defaultDoc.js';

/**
 * Stub for `@uwdata/vgplot` — the actual vgplot calls return DOM nodes,
 * but for parse-time validation we only need each name to be callable.
 */
const vgStub = new Proxy({}, { get: () => () => ({}) });

const evalCtx = {
  vg: vgStub,
  Selection,
  makeMosaicComponent,
  makeVegaLiteComponent,
  makeSemioticComponent,
  registry: Object.fromEntries(builtinComponents.map((d) => [d.id, d])),
};

describe('demos', () => {
  it('exposes the expected demos', () => {
    expect(demos.map((d) => d.id)).toEqual(['exoplanets', 'iris', 'cars', 'gps']);
  });

  for (const demo of demos) {
    describe(`demo: ${demo.id}`, () => {
      it('has at least 2 paragraphs', () => {
        expect(demo.paragraphs.length).toBeGreaterThanOrEqual(2);
      });

      it('every paragraph has a stable id, name, and defId', () => {
        for (const p of demo.paragraphs) {
          expect(p.paragraphId).toMatch(/^[a-z0-9-]+$/);
          expect(p.name.length).toBeGreaterThan(0);
          expect(p.defId.length).toBeGreaterThan(0);
        }
      });

      it('every paragraph code block evaluates to a VisComponentDefinition', () => {
        for (const p of demo.paragraphs) {
          if (!p.code) continue;
          const result = evaluateParagraph(p.code, evalCtx);
          if (!result.ok) {
            throw new Error(`${demo.id}/${p.paragraphId}: ${result.error.message}`);
          }
          expect(result.definition.id.length).toBeGreaterThan(0);
        }
      });

      it('src bindings reference paragraphs that actually exist', () => {
        const ids = new Set(demo.paragraphs.map((p) => p.paragraphId));
        for (const p of demo.paragraphs) {
          if (!p.src) continue;
          for (const upstream of Object.values(p.src)) {
            expect(ids.has(upstream)).toBe(true);
          }
        }
      });
    });
  }
});

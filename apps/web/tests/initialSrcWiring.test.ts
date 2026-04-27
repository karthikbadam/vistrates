import { describe, expect, it } from 'vitest';
import { Runtime, VisViewImpl } from '@vistrates/runtime';
import {
  asComponentId,
  type AnyVisComponentDefinition,
  type ComponentOutput,
} from '@vistrates/types';

/**
 * Regression for the linked-selection bug: when a chart's `init()` runs
 * BEFORE its `src` bindings are wired, `this.src.<slot>` resolves to null
 * — so a chart that wants to share a Mosaic Selection with siblings ends
 * up creating its own per-instance Selection, and brushes don't propagate.
 *
 * The fix: `runtime.instantiate({ ..., initialSrc })` must populate
 * bindings BEFORE calling `init`, so upstream outputs (already produced
 * by earlier-instantiated paragraphs) resolve correctly. This test
 * proves that.
 */

const sourceDef: AnyVisComponentDefinition = {
  id: 'sentinel-source',
  name: 'Sentinel Source',
  version: '0.1.0',
  src: {},
  props: [],
  init() {
    this.output = { kind: 'value', value: { tag: 'from-source' } };
  },
};

interface ConsumerCapture {
  sawSrcInInit: ComponentOutput | null;
}

function makeConsumerDef(capture: ConsumerCapture): AnyVisComponentDefinition {
  return {
    id: 'sentinel-consumer',
    name: 'Sentinel Consumer',
    version: '0.1.0',
    src: { upstream: 'value' as const },
    props: [],
    init() {
      const upstream = this.src['upstream'];
      capture.sawSrcInInit = upstream ?? null;
    },
  };
}

describe('initialSrc wiring', () => {
  it('populates `this.src.<slot>` BEFORE `init()` runs (regression: linked selection)', async () => {
    const rt = new Runtime();
    rt.registerDefinition(sourceDef);

    const capture: ConsumerCapture = { sawSrcInInit: null };
    rt.registerDefinition(makeConsumerDef(capture));

    // Source first — must complete init so its output is set.
    await rt.instantiate({
      id: 'src1',
      defId: 'sentinel-source',
      view: new VisViewImpl({ mode: 'dom', host: document.createElement('div') }),
    });
    // Consumer second, with initialSrc wiring it to src1. By the time
    // its init() runs, this.src.upstream should resolve to src1's output.
    await rt.instantiate({
      id: 'cons1',
      defId: 'sentinel-consumer',
      initialSrc: { upstream: 'src1' },
      view: new VisViewImpl({ mode: 'dom', host: document.createElement('div') }),
    });

    expect(capture.sawSrcInInit).not.toBeNull();
    expect(capture.sawSrcInInit?.kind).toBe('value');
    if (capture.sawSrcInInit?.kind === 'value') {
      expect(capture.sawSrcInInit.value).toEqual({ tag: 'from-source' });
    }
  });

  it('still resolves null when initialSrc is omitted (control case)', async () => {
    const rt = new Runtime();
    rt.registerDefinition(sourceDef);
    const capture: ConsumerCapture = { sawSrcInInit: null };
    rt.registerDefinition(makeConsumerDef(capture));

    await rt.instantiate({
      id: 'src1',
      defId: 'sentinel-source',
      view: new VisViewImpl({ mode: 'dom', host: document.createElement('div') }),
    });
    await rt.instantiate({
      id: 'cons1',
      defId: 'sentinel-consumer',
      // no initialSrc — bindSrc would have to be called separately
      view: new VisViewImpl({ mode: 'dom', host: document.createElement('div') }),
    });
    expect(capture.sawSrcInInit).toBeNull();

    // Now bindSrc — proves the post-init binding pathway also works.
    rt.bindSrc(asComponentId('cons1'), 'upstream', asComponentId('src1'));
    const cons = rt.getController(asComponentId('cons1'));
    const src = cons?.src['upstream'];
    expect(src?.kind).toBe('value');
  });
});

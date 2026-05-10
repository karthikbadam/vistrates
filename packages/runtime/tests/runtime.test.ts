import { describe, it, expect } from 'vitest';
import {
  asPredicate,
  asComponentId,
  type AnyVisComponentDefinition,
  type ComponentOutput,
  type InteractionClause,
} from '@vistrates/types';
import { Runtime } from '../src/runtime.js';

const sourceDef: AnyVisComponentDefinition = {
  id: 'src',
  name: 'Source',
  version: '0.1.0',
  src: {},
  props: [],
};

const echoDef: AnyVisComponentDefinition = {
  id: 'echo',
  name: 'Echo',
  version: '0.1.0',
  src: { input: 'value' as const },
  props: [],
  update(source) {
    if (source === undefined) return;
    const upstream = this.src['input'];
    if (upstream === null || upstream === undefined) return;
    if (upstream.kind === 'value') {
      this.output = { kind: 'value', value: upstream.value };
    }
  },
};

describe('Runtime', () => {
  it('registers and instantiates a definition', async () => {
    const rt = new Runtime();
    rt.registerDefinition(sourceDef);
    const ctl = await rt.instantiate({ id: 'src-1', defId: 'src' });
    expect(ctl.id).toBe('src-1');
    expect(ctl.friendlyName).toBe('Source');
    expect(rt.getController(asComponentId('src-1'))).toBe(ctl);
  });

  it('rejects duplicate definitions and duplicate instances', async () => {
    const rt = new Runtime();
    rt.registerDefinition(sourceDef);
    expect(() => rt.registerDefinition(sourceDef)).toThrow();
    await rt.instantiate({ id: 'a', defId: 'src' });
    await expect(rt.instantiate({ id: 'a', defId: 'src' })).rejects.toThrow();
  });

  it('propagates output through wired source → observer', async () => {
    const rt = new Runtime();
    rt.registerDefinition(sourceDef);
    rt.registerDefinition(echoDef);

    const src = await rt.instantiate({ id: 'src-1', defId: 'src' });
    await rt.instantiate({
      id: 'echo-1',
      defId: 'echo',
      initialSrc: { input: 'src-1' },
    });

    src.output = { kind: 'value', value: { foo: 1 } };

    // updates run async via void; allow microtasks to drain
    await new Promise((r) => setTimeout(r, 0));

    const echo = rt.getController(asComponentId('echo-1'));
    expect(echo?.output).toBeDefined();
    if (echo?.output?.kind === 'value') {
      expect(echo.output.value).toEqual({ foo: 1 });
    } else {
      throw new Error('expected value output');
    }
  });

  it('emits topology events on register/output/unregister', async () => {
    const rt = new Runtime();
    rt.registerDefinition(sourceDef);
    const events: string[] = [];
    const unsub = rt.subscribe((e) => events.push(e.kind));

    const ctl = await rt.instantiate({ id: 's', defId: 'src' });
    ctl.output = { kind: 'value', value: 42 };
    rt.destroy(ctl.id);
    unsub();

    expect(events).toEqual(['controllerRegistered', 'outputChanged', 'controllerUnregistered']);
  });

  it('emits clause via emitClause sugar', async () => {
    const rt = new Runtime();
    rt.registerDefinition(sourceDef);
    const ctl = await rt.instantiate({ id: 's', defId: 'src' });
    const clause: InteractionClause = {
      source: 's',
      clients: ['t'],
      predicate: asPredicate("species = 'setosa'"),
      value: { species: 'setosa' },
      schema: { kind: 'point', fields: ['species'] },
    };
    ctl.emitClause(clause);
    expect(ctl.output?.kind).toBe('clause');
    if (ctl.output?.kind === 'clause') {
      expect(ctl.output.clause).toEqual(clause);
    }
  });

  it('topology() reflects nodes and edges', async () => {
    const rt = new Runtime();
    rt.registerDefinition(sourceDef);
    rt.registerDefinition(echoDef);
    await rt.instantiate({ id: 'a', defId: 'src' });
    await rt.instantiate({ id: 'b', defId: 'echo', initialSrc: { input: 'a' } });
    const topo = rt.topology();
    expect(topo.nodes.map((n) => n.id)).toEqual(['a', 'b']);
    expect(topo.edges).toHaveLength(1);
    expect(topo.edges[0]).toMatchObject({ from: 'a', to: 'b', via: 'input' });
  });

  it('hot-swap destroys old, swaps def, runs new init', async () => {
    const rt = new Runtime();
    rt.registerDefinition({ ...sourceDef, id: 'd1' });
    const seen: string[] = [];
    const def1: AnyVisComponentDefinition = {
      id: 'pa',
      name: 'A',
      version: '0.1',
      src: {},
      props: [],
      init() {
        seen.push('init-A');
      },
      destroy() {
        seen.push('destroy-A');
      },
    };
    const def2: AnyVisComponentDefinition = {
      id: 'pb',
      name: 'B',
      version: '0.1',
      src: {},
      props: [],
      init() {
        seen.push('init-B');
      },
      destroy() {
        seen.push('destroy-B');
      },
    };
    rt.registerDefinition(def1);
    rt.registerDefinition(def2);
    await rt.instantiate({ id: 'p', defId: 'pa' });
    await rt.hotSwap(asComponentId('p'), def2);
    expect(seen).toEqual(['init-A', 'destroy-A', 'init-B']);
  });

  it('bindSrc seeds update when upstream already has output', async () => {
    const rt = new Runtime();
    rt.registerDefinition(sourceDef);
    rt.registerDefinition(echoDef);
    const src = await rt.instantiate({ id: 'a', defId: 'src' });
    src.output = { kind: 'value', value: { hello: 'world' } };
    await rt.instantiate({ id: 'b', defId: 'echo' });
    rt.bindSrc(asComponentId('b'), 'input', asComponentId('a'));
    await new Promise((r) => setTimeout(r, 0));
    const downstream = rt.getController(asComponentId('b'));
    const out: ComponentOutput | undefined = downstream?.output;
    expect(out?.kind).toBe('value');
  });
});

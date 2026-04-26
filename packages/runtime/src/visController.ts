import type {
  AnyVisComponentDefinition,
  AnyVisController,
  ComponentConfig,
  ComponentId,
  ComponentOutput,
  InteractionClause,
  JsonValue,
  PropBinding,
  PropsMap,
  SrcKindMap,
  VisView,
} from '@vistrates/types';
import { TopologyBus } from './topology.js';

export interface ControllerOptions {
  readonly id: ComponentId;
  readonly friendlyName: string;
  readonly definition: AnyVisComponentDefinition;
  readonly initialData: JsonValue;
  readonly initialConfig?: ComponentConfig<SrcKindMap, PropsMap>;
  readonly view?: VisView;
  readonly bus: TopologyBus;
  /** Lookup callback so src proxy can resolve the upstream's current output. */
  readonly resolveOutput: (id: ComponentId) => ComponentOutput | undefined;
}

type MutableSrc = Record<string, { src: ComponentId } | null>;
type MutableProps = Record<string, PropBinding | JsonValue | null>;

interface MutableConfig {
  src: MutableSrc;
  props: MutableProps;
  view?: string;
  viewClassNames?: readonly string[];
}

export class VisControllerImpl implements AnyVisController {
  readonly id: ComponentId;
  readonly friendlyName: string;
  readonly view?: VisView;

  data: JsonValue;
  #output: ComponentOutput | undefined;

  #definition: AnyVisComponentDefinition;
  readonly #bus: TopologyBus;
  readonly #resolveOutput: (id: ComponentId) => ComponentOutput | undefined;
  readonly #config: MutableConfig;

  // Public proxies — typed loosely here; the generic surface lives in @vistrates/types.
  readonly config: AnyVisController['config'];
  readonly src: AnyVisController['src'];
  readonly props: AnyVisController['props'];

  constructor(opts: ControllerOptions) {
    this.id = opts.id;
    this.friendlyName = opts.friendlyName;
    if (opts.view !== undefined) this.view = opts.view;
    this.data = opts.initialData;
    this.#definition = opts.definition;
    this.#bus = opts.bus;
    this.#resolveOutput = opts.resolveOutput;

    const initial = opts.initialConfig;
    this.#config = {
      src: { ...((initial?.src as unknown as MutableSrc) ?? {}) },
      props: { ...((initial?.props as unknown as MutableProps) ?? {}) },
    };
    if (initial?.view !== undefined) this.#config.view = initial.view;
    if (initial?.viewClassNames !== undefined) {
      this.#config.viewClassNames = initial.viewClassNames;
    }

    // Seed config.src/props with the declared slot keys so iteration is consistent.
    for (const key of Object.keys(opts.definition.src)) {
      if (!(key in this.#config.src)) this.#config.src[key] = null;
    }
    for (const key of opts.definition.props) {
      if (!(key in this.#config.props)) this.#config.props[key] = null;
    }

    this.config = this.#buildConfigProxy();
    this.src = this.#buildSrcProxy();
    this.props = this.#buildPropsProxy();
  }

  get output(): ComponentOutput | undefined {
    return this.#output;
  }

  set output(value: ComponentOutput | undefined) {
    this.#output = value;
    this.#bus.emit({ kind: 'outputChanged', id: this.id, output: value });
  }

  emitClause(clause: InteractionClause): void {
    this.output = { kind: 'clause', clause };
  }

  addSource(name: string, srcId: ComponentId): void {
    const prev = this.#config.src[name]?.src ?? null;
    this.#config.src[name] = { src: srcId };
    this.#bus.emit({
      kind: 'srcRebound',
      id: this.id,
      srcName: name,
      from: prev,
      to: srcId,
    });
  }

  removeSource(name: string): void {
    const prev = this.#config.src[name]?.src ?? null;
    this.#config.src[name] = null;
    if (prev !== null) {
      this.#bus.emit({
        kind: 'srcRebound',
        id: this.id,
        srcName: name,
        from: prev,
        to: null,
      });
    }
  }

  addProp(prop: string, srcName: string, fieldOnSrc: string): void {
    this.#config.props[prop] = { src: srcName, prop: fieldOnSrc };
  }

  /**
   * Internal: replace the controller's lifecycle methods (used by paragraph
   * hot-swap). Caller is responsible for invoking destroy on the OLD definition
   * and init/update on the new one.
   */
  swapDefinition(definition: AnyVisComponentDefinition): void {
    this.#definition = definition;
  }

  /** Read the bound definition (runtime needs this for executing lifecycle methods). */
  get definition(): AnyVisComponentDefinition {
    return this.#definition;
  }

  // ----- proxies -----

  #buildConfigProxy(): AnyVisController['config'] {
    const cfg = this.#config;
    // Return a stable view object; we read through to live #config on each access.
    return new Proxy({} as AnyVisController['config'], {
      get: (_t, key: string | symbol) => {
        if (key === 'src') return { ...cfg.src };
        if (key === 'props') return { ...cfg.props };
        if (key === 'view') return cfg.view;
        if (key === 'viewClassNames') return cfg.viewClassNames;
        return undefined;
      },
    });
  }

  #buildSrcProxy(): AnyVisController['src'] {
    return new Proxy({} as AnyVisController['src'], {
      get: (_t, key: string | symbol) => {
        if (typeof key !== 'string') return undefined;
        const binding = this.#config.src[key];
        if (!binding) return null;
        return this.#resolveOutput(binding.src) ?? null;
      },
      ownKeys: () => Object.keys(this.#config.src),
      getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
    });
  }

  #buildPropsProxy(): AnyVisController['props'] {
    return new Proxy({} as AnyVisController['props'], {
      get: (_t, key: string | symbol) => {
        if (typeof key !== 'string') return undefined;
        const binding = this.#config.props[key];
        if (binding === null || binding === undefined) {
          // Match original Vistrates behavior: unbound prop returns the prop name string,
          // so user code can use it as a column reference (e.g. d3 accessor).
          return key;
        }
        if (isPropBinding(binding)) {
          const srcBinding = this.#config.src[binding.src];
          if (!srcBinding) return key;
          const upstream = this.#resolveOutput(srcBinding.src);
          if (!upstream) return key;
          if (upstream.kind === 'value') {
            const v = upstream.value;
            if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
              const fromMap = (v as Record<string, JsonValue>)[binding.prop];
              return fromMap === undefined ? key : fromMap;
            }
          }
          return key;
        }
        return binding;
      },
      ownKeys: () => Object.keys(this.#config.props),
      getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
    });
  }
}

function isPropBinding(value: unknown): value is PropBinding {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const obj = value as Record<string, unknown>;
  return typeof obj['src'] === 'string' && typeof obj['prop'] === 'string';
}

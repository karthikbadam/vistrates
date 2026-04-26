import type { JsonValue } from './json.js';
import type { InteractionClause } from './clause.js';

export type ComponentId = string & { readonly __brand: 'ComponentId' };
export const asComponentId = (s: string): ComponentId => s as ComponentId;

export interface TableSchema {
  readonly name: string;
  readonly columns: ReadonlyArray<{ readonly name: string; readonly type: string }>;
  readonly rowCount?: number;
}

export type ComponentOutput =
  | { readonly kind: 'table'; readonly tableName: string; readonly schema: TableSchema }
  | { readonly kind: 'clause'; readonly clause: InteractionClause }
  | { readonly kind: 'value'; readonly value: JsonValue };

export type SrcKindMap = Readonly<Record<string, ComponentOutput['kind']>>;
export type PropsMap = Readonly<Record<string, unknown>>;

/** Resolved upstream output for a typed src slot. */
export type ResolvedSource<K extends ComponentOutput['kind']> = Extract<
  ComponentOutput,
  { kind: K }
>;

export interface SrcBinding {
  readonly src: ComponentId;
  readonly field?: string;
}

export interface PropBinding {
  readonly src: string;
  readonly prop: string;
}

export interface ComponentConfig<TSrc extends SrcKindMap, TProps extends PropsMap> {
  readonly src: { readonly [K in keyof TSrc]: SrcBinding | null };
  readonly props: { readonly [K in keyof TProps]: PropBinding | TProps[K] | null };
  readonly view?: string;
  readonly viewClassNames?: readonly string[];
}

export interface VisView {
  readonly mode: 'react' | 'dom';
  readonly element: HTMLElement;
  setHTML(html: string): void;
  moveTo(target: HTMLElement, before?: Node | null): void;
  moveBack(): void;
  /** React-mode renderer is supplied by the React adapter; runtime keeps it abstract. */
  render(node: unknown): void;
}

/**
 * Strongly-typed component lifecycle context handed to user code.
 *
 * Generics:
 *   TData  – paragraph data state shape (must be JsonValue-compatible)
 *   TSrc   – src slot kinds (e.g. {data: 'table', selection: 'clause'})
 *   TProps – props (mapping prop names → resolved value types)
 */
export interface VisController<
  TData extends JsonValue,
  TSrc extends SrcKindMap,
  TProps extends PropsMap,
> {
  readonly id: ComponentId;
  readonly friendlyName: string;
  data: TData;
  readonly config: ComponentConfig<TSrc, TProps>;
  readonly src: { readonly [K in keyof TSrc]: ResolvedSource<TSrc[K]> | null };
  readonly props: { readonly [K in keyof TProps]: TProps[K] };
  readonly view?: VisView;
  output: ComponentOutput | undefined;
  emitClause(c: InteractionClause): void;
  addSource(name: keyof TSrc & string, src: ComponentId): void;
  removeSource(name: keyof TSrc & string): void;
  addProp(prop: keyof TProps & string, srcName: keyof TSrc & string, fieldOnSrc: string): void;
}

export interface VisComponentDefinition<
  TData extends JsonValue = JsonValue,
  TSrc extends SrcKindMap = Record<string, never>,
  TProps extends PropsMap = Record<string, never>,
> {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description?: string;
  readonly tags?: readonly string[];
  readonly src: TSrc;
  readonly props: ReadonlyArray<keyof TProps & string>;
  readonly defaultData?: TData;
  init?: (this: VisController<TData, TSrc, TProps>) => void | Promise<void>;
  update?: (
    this: VisController<TData, TSrc, TProps>,
    source: string | undefined,
  ) => void | Promise<void>;
  destroy?: (this: VisController<TData, TSrc, TProps>) => void;
}

/** Erased form for registries that hold heterogeneous defs. */
export type AnyVisComponentDefinition = VisComponentDefinition<JsonValue, SrcKindMap, PropsMap>;

export type AnyVisController = VisController<JsonValue, SrcKindMap, PropsMap>;

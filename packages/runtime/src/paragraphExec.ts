import type { AnyVisComponentDefinition } from '@vistrates/types';

/** Curated context handed to live-evaluated paragraph code. */
export type EvalContext = Readonly<Record<string, unknown>>;

export type EvalResult =
  | { readonly ok: true; readonly definition: AnyVisComponentDefinition }
  | {
      readonly ok: false;
      readonly error: { readonly message: string; readonly stack?: string };
    };

/**
 * Evaluate a paragraph's source code against a curated context.
 *
 * The user code is expected to assign to `vc` (or return one) a
 * `VisComponentDefinition`. We support both styles:
 *
 *     vc = { id: 'foo', name: 'Foo', version: '0.1', src: {}, props: [] };
 *     // or
 *     return { id: 'foo', ... };
 *
 * NOTE: in v1, evaluation runs in the caller's realm via `new Function`.
 * Sandboxing (e.g. `quickjs-emscripten`) is a v2 concern. Authors are
 * trusted; do not feed untrusted code through this path.
 */
export function evaluateParagraph(source: string, ctx: EvalContext = {}): EvalResult {
  const ctxKeys = Object.keys(ctx);
  const ctxValues = ctxKeys.map((k) => ctx[k]);
  const wrapper = `'use strict'; let vc; const _result = (function(){ ${source}\n; return typeof vc !== 'undefined' ? vc : undefined; })(); return _result;`;
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const fn = new Function(...ctxKeys, wrapper) as (...args: unknown[]) => unknown;
     
    const result = fn(...ctxValues);
    if (!isVisComponentDefinition(result)) {
      return {
        ok: false,
        error: {
          message:
            'paragraph did not produce a VisComponentDefinition (assign to `vc` or `return` one)',
        },
      };
    }
    return { ok: true, definition: result };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    return { ok: false, error: stack !== undefined ? { message, stack } : { message } };
  }
}

function isVisComponentDefinition(value: unknown): value is AnyVisComponentDefinition {
  if (value === null || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj['id'] === 'string' &&
    typeof obj['name'] === 'string' &&
    typeof obj['version'] === 'string' &&
    typeof obj['src'] === 'object' &&
    obj['src'] !== null &&
    Array.isArray(obj['props'])
  );
}

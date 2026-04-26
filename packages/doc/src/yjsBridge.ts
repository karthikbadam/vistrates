import * as Y from 'yjs';
import type { JsonObject, JsonValue } from '@vistrates/types';

/**
 * Convert a plain JsonObject into a Y.Map<JsonValue>.
 * Nested objects/arrays are stored as plain JSON values inside the Y.Map for v1.
 * (We can promote them to nested Y.Maps later if we need finer-grained CRDT ops.)
 */
export function jsonToYMap(obj: JsonObject): Y.Map<JsonValue> {
  const m = new Y.Map<JsonValue>();
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    m.set(k, v);
  }
  return m;
}

/** Read a Y.Map<JsonValue> back as a plain immutable JsonObject. */
export function yMapToJson(m: Y.Map<JsonValue>): JsonObject {
  const out: Record<string, JsonValue> = {};
  for (const [k, v] of m.entries()) {
    out[k] = v;
  }
  return out;
}

/** Type-narrow a Y.AbstractType to a Y.Map<JsonValue>. Throws if it isn't. */
export function asYMap(value: unknown): Y.Map<JsonValue> {
  if (value instanceof Y.Map) {
    return value as Y.Map<JsonValue>;
  }
  throw new TypeError('expected Y.Map');
}

/** Type-narrow to Y.Array<Y.Map<JsonValue>>. */
export function asYArrayOfYMap(value: unknown): Y.Array<Y.Map<JsonValue>> {
  if (value instanceof Y.Array) {
    return value as Y.Array<Y.Map<JsonValue>>;
  }
  throw new TypeError('expected Y.Array');
}

/** Type-narrow a Y.Map field to Y.Text. */
export function asYText(value: unknown): Y.Text {
  if (value instanceof Y.Text) return value;
  throw new TypeError('expected Y.Text');
}

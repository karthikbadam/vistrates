import type { InteractionClause } from '@vistrates/types';
import type { JsonValue, JsonObject } from '@vistrates/types';

/**
 * Canonicalize a JSON value to a deterministic string form.
 * Object keys are sorted lexicographically. Arrays preserve order.
 * Numbers serialize via JSON.stringify (NaN/Infinity throw, matching JSON spec).
 */
export function canonicalizeJson(value: JsonValue): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new RangeError(`canonicalizeJson: non-finite number ${String(value)}`);
    }
    return JSON.stringify(value);
  }
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalizeJson).join(',') + ']';
  }
  // JsonObject
  const obj = value as JsonObject;
  const keys = Object.keys(obj).sort();
  const parts: string[] = [];
  for (const k of keys) {
    const v = obj[k];
    if (v === undefined) continue;
    parts.push(JSON.stringify(k) + ':' + canonicalizeJson(v));
  }
  return '{' + parts.join(',') + '}';
}

/**
 * Canonicalize a clause to a deterministic string, sorting `clients` alphabetically
 * before serialization so client-list ordering does not affect the hash.
 */
export function canonicalizeClause(c: InteractionClause): string {
  const sortedClients = [...c.clients].sort();
  const obj: JsonValue = {
    clients: sortedClients,
    predicate: c.predicate,
    schema: c.schema as unknown as JsonValue,
    source: c.source,
    value: c.value,
  };
  return canonicalizeJson(obj);
}

/** SHA-256 hex digest using Web Crypto where available, Node `crypto` otherwise. */
export async function sha256Hex(input: string): Promise<string> {
  const cryptoObj: Crypto | undefined =
    typeof globalThis !== 'undefined' && 'crypto' in globalThis
      ? (globalThis as { crypto?: Crypto }).crypto
      : undefined;
  if (cryptoObj?.subtle) {
    const bytes = new TextEncoder().encode(input);
    const buf = await cryptoObj.subtle.digest('SHA-256', bytes);
    return bytesToHex(new Uint8Array(buf));
  }
  // Node fallback (no top-level await; dynamic import keeps browser bundle clean)
  const nodeCrypto = await import('node:crypto');
  return nodeCrypto.createHash('sha256').update(input).digest('hex');
}

function bytesToHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i] ?? 0;
    out += byte.toString(16).padStart(2, '0');
  }
  return out;
}

/** Stable SHA-256 hex hash of a clause. Identical clauses → identical hash. */
export async function hashClause(c: InteractionClause): Promise<string> {
  return sha256Hex(canonicalizeClause(c));
}

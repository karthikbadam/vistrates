import type { AnyVisController, JsonValue } from '@vistrates/types';

/**
 * Read the controller's `data` field, narrowing it to the caller's expected
 * shape. The runtime check enforces "is an object" — the type assertion
 * carries the caller's intent. Returns `Partial<T>` because user docs may
 * not set every field on first run.
 */
export function readDataObject<T>(controller: AnyVisController): Partial<T> {
  const d: JsonValue = controller.data;
  if (d === null || typeof d !== 'object' || Array.isArray(d)) {
    return {};
  }
  return d as unknown as Partial<T>;
}

export function asString(v: JsonValue | undefined): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

export function asNumber(v: JsonValue | undefined): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

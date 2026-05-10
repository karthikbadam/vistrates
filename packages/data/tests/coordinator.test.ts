import { describe, it, expect, beforeEach } from 'vitest';
import { Coordinator, coordinator } from '@uwdata/mosaic-core';
import { getCoordinator, _resetCoordinatorForTesting } from '../src/coordinator.js';

beforeEach(() => {
  _resetCoordinatorForTesting();
  // Replace Mosaic's global with a fresh sentinel so we can prove our
  // getCoordinator() actually swaps it. coordinator(x) sets the singleton
  // when x is truthy; coordinator() with no args returns the current.
  coordinator(new Coordinator());
});

describe('getCoordinator (regression for empty-Mosaic-vgplot bug)', () => {
  it('registers our coordinator as Mosaic`s global default so vgplot can find it', async () => {
    const sentinelBefore = coordinator();
    const ours = await getCoordinator();
    // vgplot calls `coordinator()` (no args) to find its coordinator. If our
    // setup doesn't register, vgplot uses the prior global (with no DB
    // connector wired up by us) and every chart renders blank.
    const fromGlobal = coordinator();
    expect(fromGlobal).toBe(ours);
    expect(fromGlobal).not.toBe(sentinelBefore);
  });

  it('attaches a database connector to the coordinator', async () => {
    const c = await getCoordinator();
    const connector = c.databaseConnector();
    // We don't care about the exact shape — just that *something* is wired.
    expect(connector).toBeDefined();
  });

  it('is idempotent — repeated calls return the same instance', async () => {
    const a = await getCoordinator();
    const b = await getCoordinator();
    expect(b).toBe(a);
  });
});

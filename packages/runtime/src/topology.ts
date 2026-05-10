import type { ComponentId, ComponentOutput } from '@vistrates/types';

export type TopologyEvent =
  | { kind: 'controllerRegistered'; id: ComponentId; defId: string }
  | { kind: 'controllerUnregistered'; id: ComponentId }
  | {
      kind: 'srcRebound';
      id: ComponentId;
      srcName: string;
      from: ComponentId | null;
      to: ComponentId | null;
    }
  | { kind: 'outputChanged'; id: ComponentId; output: ComponentOutput | undefined };

export type TopologyListener = (event: TopologyEvent) => void;

export class TopologyBus {
  readonly #listeners = new Set<TopologyListener>();

  emit(event: TopologyEvent): void {
    for (const fn of this.#listeners) {
      try {
        fn(event);
      } catch (err: unknown) {
        // Swallow listener errors so one bad subscriber doesn't break the bus.
        console.error('[vistrates] topology listener threw:', err);
      }
    }
  }

  subscribe(listener: TopologyListener): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  size(): number {
    return this.#listeners.size;
  }
}

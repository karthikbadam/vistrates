import { useEffect, type RefObject } from 'react';
import { asComponentId } from '@vistrates/types';
import { useRuntime } from '../runtimeContext.js';

/**
 * Adopt the runtime-owned `vis-host` div for `paragraphId` into the slot
 * referenced by `slotRef`. The slot can be the host directly or a wrapper
 * (e.g. `.canvas-content`) — pass a `containerSelector` for the wrapper.
 *
 * After moving the host, asks the runtime to re-run the controller's
 * `update(undefined)` so charts whose host moved (tab switch, mobile
 * page-flip, canvas pan-into-view) repaint into the new container even
 * when dimensions match the previous slot (ResizeObserver wouldn't fire).
 */
export function useHostSlot(
  paragraphId: string | undefined,
  slotRef: RefObject<HTMLElement | null>,
  containerSelector?: string,
): void {
  const { hostFor, runtime } = useRuntime();
  useEffect(() => {
    if (!paragraphId) return;
    const slot = slotRef.current;
    if (!slot) return;
    const target = containerSelector
      ? slot.querySelector<HTMLElement>(containerSelector) ?? slot
      : slot;
    const host = hostFor(paragraphId);
    if (host.parentElement !== target) {
      target.replaceChildren(host);
      void runtime.refresh(asComponentId(paragraphId));
    }
  }, [hostFor, runtime, paragraphId, slotRef, containerSelector]);
}

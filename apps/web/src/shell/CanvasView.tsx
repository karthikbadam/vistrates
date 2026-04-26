import { useEffect, useRef, useState, type JSX } from 'react';
import interact from 'interactjs';
import { marked } from 'marked';
import { demoDoc } from '../defaultDoc.js';
import { useRuntime, useTopologyTick } from '../runtimeContext.js';

interface CanvasObject {
  readonly id: string;
  readonly kind: 'view' | 'note';
  paragraphId?: string;
  markdown?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
}

/** Build the initial layout sized relative to the viewport so the panels
 *  don't dominate small screens. Each visible paragraph gets a panel
 *  ~min(420, 42vw) wide and ~280px tall, packed in a 2-column grid. */
function buildInitialObjects(): CanvasObject[] {
  const vw = typeof window === 'undefined' ? 1200 : window.innerWidth;
  const cols = vw < 720 ? 1 : 2;
  const w = Math.max(280, Math.min(420, Math.round(vw * 0.42)));
  const h = Math.round(w * 0.6);
  const gap = 24;
  const visible = demoDoc.filter((p) => p.visible !== false);
  const tiles: CanvasObject[] = visible.map((p, i) => ({
    id: `view-${p.paragraphId}`,
    kind: 'view' as const,
    paragraphId: p.paragraphId,
    x: 24 + (i % cols) * (w + gap),
    y: 24 + Math.floor(i / cols) * (h + gap),
    w,
    h,
    rotation: 0,
  }));
  tiles.push({
    id: 'note-1',
    kind: 'note',
    markdown:
      '# Canvas\n\nDrag handles to move. Drag the corner to resize. Scroll to pan the world.',
    x: 24 + cols * (w + gap),
    y: 24,
    w: Math.min(260, w * 0.7),
    h: 160,
    rotation: 0,
  });
  return tiles;
}

const initialObjects: CanvasObject[] = buildInitialObjects();

export function CanvasView(): JSX.Element {
  const { hostFor } = useRuntime();
  const [objects, setObjects] = useState<CanvasObject[]>(initialObjects);
  const elementRefs = useRef(new Map<string, HTMLDivElement>());
  useTopologyTick();

  // Mount the runtime's vis-host divs into the corresponding view objects.
  useEffect(() => {
    for (const obj of objects) {
      if (obj.kind !== 'view' || !obj.paragraphId) continue;
      const slot = elementRefs.current.get(obj.id);
      if (!slot) continue;
      const host = hostFor(obj.paragraphId);
      const inner = slot.querySelector('.canvas-content');
      if (inner instanceof HTMLElement && host.parentElement !== inner) {
        inner.replaceChildren(host);
      }
    }
  }, [hostFor, objects]);

  // Wire interactjs once per element appearance.
  useEffect(() => {
    const cleanups: Array<() => void> = [];
    for (const obj of objects) {
      const el = elementRefs.current.get(obj.id);
      if (!el) continue;
      interface InteractMoveEvent {
        readonly target: HTMLElement;
        readonly dx: number;
        readonly dy: number;
      }
      interface InteractResizeEvent {
        readonly target: HTMLElement;
        readonly rect: { readonly width: number; readonly height: number };
      }
      const interactable = interact(el)
        .draggable({
          allowFrom: '.canvas-handle',
          listeners: {
            move(rawEvent: unknown) {
              const event = rawEvent as InteractMoveEvent;
              const target = event.target;
              const x = (parseFloat(target.dataset['x'] ?? '0') || 0) + event.dx;
              const y = (parseFloat(target.dataset['y'] ?? '0') || 0) + event.dy;
              target.style.transform = `translate(${x}px, ${y}px) rotate(${target.dataset['rot'] ?? '0'}deg)`;
              target.dataset['x'] = String(x);
              target.dataset['y'] = String(y);
            },
          },
        })
        .resizable({
          edges: { left: false, right: true, top: false, bottom: true },
          listeners: {
            move(rawEvent: unknown) {
              const event = rawEvent as InteractResizeEvent;
              const target = event.target;
              const w = event.rect.width;
              const h = event.rect.height;
              target.style.width = `${w}px`;
              target.style.height = `${h}px`;
            },
          },
          modifiers: [
            interact.modifiers.restrictSize({ min: { width: 220, height: 160 } }),
          ],
        });
      // Initialize transform from state.
      el.dataset['x'] = String(obj.x);
      el.dataset['y'] = String(obj.y);
      el.dataset['rot'] = String(obj.rotation);
      el.style.transform = `translate(${obj.x}px, ${obj.y}px) rotate(${obj.rotation}deg)`;
      el.style.width = `${obj.w}px`;
      el.style.height = `${obj.h}px`;
      cleanups.push(() => interactable.unset());
    }
    return () => {
      for (const fn of cleanups) fn();
    };
  }, [objects]);

  const updateNote = (id: string, markdown: string): void => {
    setObjects((prev) => prev.map((o) => (o.id === id ? { ...o, markdown } : o)));
  };

  return (
    <section className="canvas-view">
      <div className="canvas-toolbar">
        <button
          type="button"
          onClick={() => {
            const id = `note-${Math.random().toString(36).slice(2, 8)}`;
            setObjects((prev) => [
              ...prev,
              {
                id,
                kind: 'note',
                markdown: '# New note',
                x: 60,
                y: 60,
                w: 240,
                h: 160,
                rotation: 0,
              },
            ]);
          }}
        >
          + Add note
        </button>
        <span className="canvas-hint muted">Scroll to pan · drag handles to move · drag corner to resize</span>
      </div>
      <div className="canvas-viewport">
        <div className="canvas-world">
        {objects.map((obj) => (
          <div
            key={obj.id}
            ref={(el) => {
              if (el) elementRefs.current.set(obj.id, el);
              else elementRefs.current.delete(obj.id);
            }}
            className={`canvas-object canvas-${obj.kind}`}
          >
            <header className="canvas-handle">
              <span>{obj.kind === 'view' ? obj.paragraphId : 'Note'}</span>
            </header>
            {obj.kind === 'view' ? (
              <div className="canvas-content" />
            ) : (
              <NoteBody value={obj.markdown ?? ''} onChange={(v) => updateNote(obj.id, v)} />
            )}
          </div>
        ))}
        </div>
      </div>
    </section>
  );
}

function NoteBody({
  value,
  onChange,
}: {
  readonly value: string;
  readonly onChange: (v: string) => void;
}): JSX.Element {
  const [editing, setEditing] = useState(false);
  const html = typeof value === 'string' ? (marked.parse(value) as string) : '';
  return editing ? (
    <textarea
      className="canvas-note-edit"
      autoFocus
      defaultValue={value}
      onBlur={(e) => {
        onChange(e.currentTarget.value);
        setEditing(false);
      }}
    />
  ) : (
    <div
      className="canvas-note-view"
      onDoubleClick={() => setEditing(true)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

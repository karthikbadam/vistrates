import { useEffect, useMemo, useRef } from 'react';
import dagre from '@dagrejs/dagre';
import type { JSX } from 'react';
import { useRuntime, useTopologyTick } from '../runtimeContext.js';

const NODE_WIDTH = 180;
const NODE_HEIGHT = 56;
const PADDING = 24;

interface LaidOutNode {
  readonly id: string;
  readonly label: string;
  readonly defId: string;
  readonly x: number;
  readonly y: number;
}

interface LaidOutEdge {
  readonly from: string;
  readonly to: string;
  readonly via: string;
  readonly points: ReadonlyArray<{ x: number; y: number }>;
}

interface Layout {
  readonly nodes: readonly LaidOutNode[];
  readonly edges: readonly LaidOutEdge[];
  readonly width: number;
  readonly height: number;
}

export function PipelineView(): JSX.Element {
  const { runtime } = useRuntime();
  useTopologyTick(); // re-render whenever topology changes
  const svgRef = useRef<SVGSVGElement | null>(null);

  const layout = useMemo<Layout>(() => {
    const topo = runtime.topology();
    const g = new dagre.graphlib.Graph<{ label: string; defId: string }>();
    g.setGraph({ rankdir: 'LR', marginx: PADDING, marginy: PADDING });
    g.setDefaultEdgeLabel(() => ({}));

    for (const n of topo.nodes) {
      g.setNode(n.id, {
        label: n.friendlyName,
        defId: n.defId,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      });
    }
    for (const e of topo.edges) {
      g.setEdge(e.from, e.to, { label: e.via });
    }
    dagre.layout(g);

    const nodes: LaidOutNode[] = [];
    for (const id of g.nodes()) {
      const n = g.node(id);
      if (!n) continue;
      const label = (n as { label?: string }).label ?? id;
      const defId = (n as { defId?: string }).defId ?? '';
      nodes.push({ id, label, defId, x: n.x - NODE_WIDTH / 2, y: n.y - NODE_HEIGHT / 2 });
    }
    const edges: LaidOutEdge[] = [];
    for (const e of g.edges()) {
      const edge = g.edge(e);
      if (!edge) continue;
      const points = (edge as { points?: ReadonlyArray<{ x: number; y: number }> }).points ?? [];
      const via = (edge as { label?: string }).label ?? '';
      edges.push({ from: e.v, to: e.w, via, points });
    }
    const graphInfo = g.graph();
    const width = graphInfo?.width ?? 800;
    const height = graphInfo?.height ?? 400;
    return { nodes, edges, width, height };
  }, [runtime]);

  useEffect(() => {
    // No imperative drawing needed — JSX handles it.
  }, [layout]);

  return (
    <section className="pipeline">
      <p className="muted">
        Live dataflow DAG. Nodes are component instances; edges are{' '}
        <code>upstream → downstream</code> via a named src slot.
      </p>
      <div className="pipeline-canvas">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${Math.max(layout.width, 200)} ${Math.max(layout.height, 200)}`}
          width="100%"
          height={Math.max(layout.height, 200)}
          preserveAspectRatio="xMinYMin meet"
        >
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="8"
              markerHeight="8"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--vs-accent)" />
            </marker>
          </defs>
          {layout.edges.map((e, i) => (
            <g key={`e${i}`} className="edge">
              <path d={polyline(e.points)} stroke="var(--vs-accent)" strokeWidth={1.5} fill="none" markerEnd="url(#arrow)" />
              {e.points.length >= 2 && (
                <text
                  x={(e.points[0]!.x + e.points[e.points.length - 1]!.x) / 2}
                  y={(e.points[0]!.y + e.points[e.points.length - 1]!.y) / 2 - 6}
                  textAnchor="middle"
                  fontSize={11}
                  fill="var(--vs-muted)"
                >
                  {e.via}
                </text>
              )}
            </g>
          ))}
          {layout.nodes.map((n) => (
            <g key={n.id} transform={`translate(${n.x}, ${n.y})`} className="node">
              <rect
                width={NODE_WIDTH}
                height={NODE_HEIGHT}
                rx={6}
                ry={6}
                fill="var(--vs-card)"
                stroke="var(--vs-accent)"
                strokeWidth={1}
              />
              <text x={NODE_WIDTH / 2} y={22} textAnchor="middle" fill="var(--vs-fg)" fontSize={13}>
                {n.label}
              </text>
              <text
                x={NODE_WIDTH / 2}
                y={40}
                textAnchor="middle"
                fill="var(--vs-muted)"
                fontSize={10}
                fontFamily="ui-monospace, SFMono-Regular, monospace"
              >
                {n.defId}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </section>
  );
}

function polyline(points: ReadonlyArray<{ x: number; y: number }>): string {
  if (points.length === 0) return '';
  const [head, ...rest] = points;
  if (!head) return '';
  return `M ${head.x},${head.y} ` + rest.map((p) => `L ${p.x},${p.y}`).join(' ');
}

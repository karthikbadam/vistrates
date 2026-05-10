import { useMemo, type JSX } from 'react';
import dagre from '@dagrejs/dagre';
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useRuntime, useTopologyTick } from '../runtimeContext.js';

const NODE_WIDTH = 200;
const NODE_HEIGHT = 70;

interface NodeData extends Record<string, unknown> {
  readonly label: string;
  readonly defId: string;
}

function ComponentNode({ data }: NodeProps<Node<NodeData>>): JSX.Element {
  return (
    <div className="rf-node">
      <Handle type="target" position={Position.Left} />
      <div className="rf-node-label">{data.label}</div>
      <div className="rf-node-defid">{data.defId}</div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const NODE_TYPES = { component: ComponentNode };

export function PipelineView(): JSX.Element {
  const { runtime } = useRuntime();
  useTopologyTick();

  const { nodes, edges } = useMemo<{ nodes: Node<NodeData>[]; edges: Edge[] }>(() => {
    const topo = runtime.topology();

    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'LR', nodesep: 30, ranksep: 80, marginx: 16, marginy: 16 });
    g.setDefaultEdgeLabel(() => ({}));

    for (const n of topo.nodes) {
      g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    }
    for (const e of topo.edges) {
      g.setEdge(e.from, e.to);
    }
    dagre.layout(g);

    const rfNodes: Node<NodeData>[] = topo.nodes.map((n) => {
      const pos = g.node(n.id);
      return {
        id: n.id,
        type: 'component',
        position: { x: pos?.x ? pos.x - NODE_WIDTH / 2 : 0, y: pos?.y ? pos.y - NODE_HEIGHT / 2 : 0 },
        data: { label: n.friendlyName, defId: n.defId },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
    });

    const rfEdges: Edge[] = topo.edges.map((e, i) => ({
      id: `e-${i}-${e.from}-${e.to}-${e.via}`,
      source: e.from,
      target: e.to,
      label: e.via,
      animated: true,
      style: { stroke: 'var(--vs-accent)' },
    }));

    return { nodes: rfNodes, edges: rfEdges };
  }, [runtime]);

  return (
    <section className="pipeline">
      <p className="muted">
        Live dataflow DAG — nodes are component instances, edges are{' '}
        <code>upstream → downstream</code> via a named src slot. Pan/zoom with mouse, drag nodes
        to reposition.
      </p>
      <div className="pipeline-canvas rf-canvas">
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={NODE_TYPES}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
            <Controls />
            <MiniMap pannable zoomable />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
    </section>
  );
}

import React, { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ProductAutomaton } from '../../engine';

interface ProductGraphProps {
  productAutomaton: ProductAutomaton;
}

export const ProductGraph: React.FC<ProductGraphProps> = ({ productAutomaton }) => {
  const { nodes, edges } = useMemo(() => {
    const { states, transitions, startState, offendingSCC } = productAutomaton;
    const offendingStateSet = new Set(offendingSCC?.states || []);

    // Filter to at most 60 most relevant states if product graph is large
    // Prioritize startState, offending SCC states, and direct connections
    let displayStates = states;
    if (states.length > 60) {
      const prioritySet = new Set<string>([startState, ...(offendingSCC?.states || [])]);
      // Add direct neighbors
      for (const t of transitions) {
        if (prioritySet.has(t.from) || prioritySet.has(t.to)) {
          prioritySet.add(t.from);
          prioritySet.add(t.to);
          if (prioritySet.size >= 60) break;
        }
      }
      displayStates = states.filter((s) => prioritySet.has(s.id));
    }

    const displayStateIds = new Set(displayStates.map((s) => s.id));
    const displayTransitions = transitions.filter(
      (t) => displayStateIds.has(t.from) && displayStateIds.has(t.to)
    );

    // Compute topological layers via BFS from startState
    const layers: Record<string, number> = {};
    const visited = new Set<string>([startState]);
    const queue: Array<{ id: string; layer: number }> = [{ id: startState, layer: 0 }];
    layers[startState] = 0;

    while (queue.length > 0) {
      const { id, layer } = queue.shift()!;
      for (const t of displayTransitions) {
        if (t.from === id && !visited.has(t.to)) {
          visited.add(t.to);
          layers[t.to] = layer + 1;
          queue.push({ id: t.to, layer: layer + 1 });
        }
      }
    }

    // Default layer 0 for unvisited components
    displayStates.forEach((s) => {
      if (layers[s.id] === undefined) {
        layers[s.id] = 0;
      }
    });

    const layerBuckets: Record<number, string[]> = {};
    displayStates.forEach((s) => {
      const l = layers[s.id];
      if (!layerBuckets[l]) layerBuckets[l] = [];
      layerBuckets[l].push(s.id);
    });

    const layerKeys = Object.keys(layerBuckets).map(Number).sort((a, b) => a - b);
    const X_SPACING = 200;
    const Y_SPACING = 90;

    const computedNodes: Node[] = [];
    layerKeys.forEach((layerIdx) => {
      const stateIdsInLayer = layerBuckets[layerIdx];
      const count = stateIdsInLayer.length;
      const yOffset = -((count - 1) * Y_SPACING) / 2;

      stateIdsInLayer.forEach((id, rowIdx) => {
        const stateObj = displayStates.find((s) => s.id === id)!;
        const isOffending = offendingStateSet.has(id);
        const isDiagonal = stateObj.isDiagonal;

        // Custom styling based on ambiguity role
        const bgStyle = isOffending
          ? 'bg-rose-950/90 border-rose-500 shadow-rose-500/30'
          : isDiagonal
          ? 'bg-slate-900 border-cyan-500/80 shadow-cyan-500/10'
          : 'bg-purple-950/60 border-purple-500/80 shadow-purple-500/10';

        const labelBadge = isOffending
          ? 'Offending SCC'
          : isDiagonal
          ? 'Diagonal (q, q)'
          : 'Off-Diagonal (p, q)';

        computedNodes.push({
          id,
          position: {
            x: layerIdx * X_SPACING + 40,
            y: rowIdx * Y_SPACING + yOffset + 240,
          },
          data: {
            label: (
              <div
                className={`px-3 py-2 rounded-xl border-2 text-xs font-mono shadow-lg transition-all ${bgStyle}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-white text-[13px]">{id}</span>
                  {stateObj.isStart && (
                    <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] border border-emerald-500/40">
                      Start
                    </span>
                  )}
                  {stateObj.isAccept && (
                    <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[9px] border border-cyan-500/40">
                      Accept
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-300 mt-1 flex items-center gap-1">
                  <span
                    className={`inline-block w-1.5 h-1.5 rounded-full ${
                      isOffending ? 'bg-rose-400 animate-pulse' : isDiagonal ? 'bg-cyan-400' : 'bg-purple-400'
                    }`}
                  />
                  <span>{labelBadge}</span>
                </div>
              </div>
            ),
          },
        });
      });
    });

    const computedEdges: Edge[] = displayTransitions.map((t, idx) => {
      const isOffendingEdge = offendingStateSet.has(t.from) && offendingStateSet.has(t.to);
      return {
        id: `prod_edge_${idx}_${t.from}->${t.to}`,
        source: t.from,
        target: t.to,
        label: t.symbol,
        animated: isOffendingEdge,
        style: {
          stroke: isOffendingEdge ? '#f43f5e' : '#64748b',
          strokeWidth: isOffendingEdge ? 2.5 : 1.2,
        },
        labelStyle: {
          fill: isOffendingEdge ? '#fda4af' : '#94a3b8',
          fontWeight: 600,
          fontSize: 11,
          fontFamily: 'monospace',
        },
        labelBgStyle: {
          fill: '#0f172a',
          fillOpacity: 0.85,
        },
        labelBgPadding: [4, 2],
        labelBgBorderRadius: 4,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isOffendingEdge ? '#f43f5e' : '#64748b',
        },
      };
    });

    return { nodes: computedNodes, edges: computedEdges };
  }, [productAutomaton]);

  return (
    <div className="w-full h-[420px] bg-slate-950 rounded-xl border border-slate-800 overflow-hidden relative">
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-slate-900/90 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
          <span className="text-rose-300 font-semibold">Offending SCC</span>
        </div>
        <span className="text-slate-600">|</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
          <span className="text-cyan-300">Diagonal (q,q)</span>
        </div>
        <span className="text-slate-600">|</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
          <span className="text-purple-300">Off-Diagonal (p,q)</span>
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        minZoom={0.2}
        maxZoom={1.5}
        className="bg-slate-950"
      >
        <Background color="#1e293b" gap={18} size={1} />
        <Controls className="bg-slate-900 border-slate-800 fill-slate-300 stroke-slate-300" />
        <MiniMap
          nodeColor={(n) => {
            if (n.id?.includes('*')) return '#f43f5e';
            const [l, r] = n.id.split(',');
            return l === r ? '#06b6d4' : '#a855f7';
          }}
          className="bg-slate-900 border border-slate-800 rounded-lg"
          maskColor="rgba(15, 23, 42, 0.7)"
        />
      </ReactFlow>
    </div>
  );
};

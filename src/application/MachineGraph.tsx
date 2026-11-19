import { useId } from 'react';
import type { DFA, NFA, SimulationStep } from '../engine/types';

export function MachineGraph({ machine, step, showTrap }: {
  machine: DFA | NFA;
  step?: SimulationStep;
  showTrap: boolean;
}) {
  const arrow = useId();
  const states = machine.states.filter(state => showTrap || !state.isTrap);
  const columns = Math.min(5, states.length);
  const positions = new Map(states.map((state, index) => [
    state.id, { x: 80 + (index % columns) * 168, y: 78 + Math.floor(index / columns) * 112 },
  ]));
  const grouped = new Map<string, { from: string; to: string; symbols: string[] }>();
  for (const edge of machine.transitions) {
    if (!positions.has(edge.from) || !positions.has(edge.to)) continue;
    const key = `${edge.from}->${edge.to}`;
    const existing = grouped.get(key);
    if (existing) existing.symbols.push(edge.symbol);
    else grouped.set(key, { from: edge.from, to: edge.to, symbols: [edge.symbol] });
  }
  const width = columns * 168;
  const height = Math.ceil(states.length / columns) * 112 + 34;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height}
      viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${machine.type} state diagram`}
      fontFamily="monospace">
      <rect width={width} height={height} fill="#101a28" />
      <defs>
        <marker id={arrow} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0 0 L10 5 L0 10 Z" fill="#7acdbb" />
        </marker>
      </defs>
      {[...grouped].map(([key, { from, to, symbols }]) => {
        const a = positions.get(from)!;
        const b = positions.get(to)!;
        const distance = Math.hypot(b.x - a.x, b.y - a.y);
        const dx = distance ? (b.x - a.x) / distance : 0;
        const dy = distance ? (b.y - a.y) / distance : 0;
        const bend = Math.min(44, distance / 6);
        const x = (a.x + b.x) / 2 - dy * bend;
        const y = (a.y + b.y) / 2 + dx * bend;
        const path = from === to
          ? `M ${a.x - 13} ${a.y - 22} C ${a.x - 42} ${a.y - 77}, ${a.x + 42} ${a.y - 77}, ${a.x + 13} ${a.y - 22}`
          : `M ${a.x + dx * 25} ${a.y + dy * 25} Q ${x} ${y}, ${b.x - dx * 27} ${b.y - dy * 27}`;
        const active = step?.activeEdges.includes(key);
        const fullLabel = symbols.map(symbol => symbol === ' ' ? 'space' : symbol).join(', ');
        const label = fullLabel.length > 22 ? `${fullLabel.slice(0, 19)}…` : fullLabel;
        return (
          <g key={key}>
            <title>{from} → {to} on {fullLabel}</title>
            <path d={path} fill="none" stroke={active ? '#f8be72' : '#678c99'} strokeWidth={active ? 3 : 1.3} markerEnd={`url(#${arrow})`} />
            <text x={from === to ? a.x : (a.x + b.x) / 2 - dy * bend / 2}
              y={from === to ? a.y - 59 : (a.y + b.y) / 2 + dx * bend / 2 - 4}
              fill={active ? '#f8be72' : '#cde3eb'} stroke="#101a28" strokeWidth="4" paintOrder="stroke"
              textAnchor="middle" fontSize="11">{label}</text>
          </g>
        );
      })}
      {states.map(state => {
        const { x, y } = positions.get(state.id)!;
        const active = step?.activeStates.includes(state.id);
        return (
          <g key={state.id}>
            <title>{state.id}{state.subLabel ? ` · ${state.subLabel}` : ''}</title>
            {state.isStart && <path d={`M ${x - 53} ${y} H ${x - 27}`} stroke="#7acdbb" markerEnd={`url(#${arrow})`} />}
            <circle cx={x} cy={y} r="25" fill={active ? '#3b3327' : '#192d3b'} stroke={active ? '#f8be72' : '#7acdbb'} strokeWidth={active ? 3 : 1.5} />
            {state.isAccept && <circle cx={x} cy={y} r="21" fill="none" stroke="#7acdbb" />}
            <text x={x} y={y + 4} textAnchor="middle" fontSize="11" fill="#f0f7fa">{state.id}</text>
          </g>
        );
      })}
    </svg>
  );
}

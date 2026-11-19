import { useId } from 'react';
import type { DFA } from '../engine/types';
import { scoreAt, type replayInnings } from './chaseReplay';

export function ChaseDiagram({ machine, replay, full }: { machine: DFA; replay: ReturnType<typeof replayInnings>; full: boolean }) {
  const marker = useId();
  const visible = new Set(replay.path);
  const activeEdges = new Map(replay.path.slice(1).map((to,i) => [replay.path[i]+'>'+to, replay.symbols[i]]));
  for (const edge of machine.transitions) {
    if (edge.to !== 'dead' && (full || replay.path.includes(edge.from))) visible.add(edge.to);
  }
  const columns = new Map<number,string[]>();
  for (const state of visible) {
    const {balls} = scoreAt(state);
    const col = columns.get(balls) ?? [];
    col.push(state);
    columns.set(balls,col);
  }
  const width = Math.max(570, columns.size * 150);
  const height = Math.max(330, 90 + Math.max(...[...columns.values()].map(c => c.length))*54);
  const positions = new Map<string,{x:number;y:number}>();
  for (const [balls,col] of columns) {
    col.sort((a,b)=>scoreAt(b).runs-scoreAt(a).runs);
    col.forEach((id,i)=>positions.set(id,{x:60+balls*(width-120)/Math.max(1,columns.size-1),y:55+(height-80)/(col.length+1)*(i+1)}));
  }
  const edges = machine.transitions.filter(t=>visible.has(t.from) && visible.has(t.to));
  return <div className="chase-map" tabIndex={0} aria-label="Scrollable score-state diagram">
    <svg viewBox={`0 0 ${width} ${height}`} style={{minWidth:width*.77,width:'100%',height:height}} role="img" aria-label={`Score-state diagram. Current state ${replay.state}`}>
      <defs>{['dim','lit'].map(c=><marker key={c} id={marker+c} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10Z" fill={c==='lit'?'#ffc65c':'#496079'}/></marker>)}</defs>
      {[...columns].map(([balls,col])=><text key={balls} x={positions.get(col[0])!.x} y="27" textAnchor="middle" fill="#a9bacc" fontSize="13">Ball {balls}</text>)}
      {edges.sort((a,b)=>Number(activeEdges.has(a.from+'>'+a.to))-Number(activeEdges.has(b.from+'>'+b.to))).map(t=>{
        const a=positions.get(t.from)!, b=positions.get(t.to)!;
        const lit = activeEdges.has(t.from+'>'+t.to);
        const wide = a.x===b.x;
        const path = wide ? `M${a.x+12},${a.y-13} Q${a.x+60},${(a.y+b.y)/2} ${b.x+16},${b.y+12}` :
          `M${a.x+23},${a.y} C${(a.x+b.x)/2},${a.y} ${(a.x+b.x)/2},${b.y} ${b.x-24},${b.y}`;
        return <g key={t.from+t.symbol}><title>{t.from} + {t.symbol} → {t.to}</title><path d={path} fill="none" stroke={lit?'#ffc65c':'#364b64'} opacity={lit?1:.65} strokeWidth={lit?3:1} markerEnd={`url(#${marker}${lit?'lit':'dim'})`}/>{lit && <text x={wide?a.x+39:(a.x+b.x)/2} y={(a.y+b.y)/2-5} textAnchor="middle" fill="#ffd379" stroke="#101b2c" strokeWidth="4" paintOrder="stroke">{t.symbol}</text>}</g>;
      })}
      {machine.states.filter(s=>visible.has(s.id)).map(s=>{
        const pos=positions.get(s.id)!;
        const color=s.id===replay.state?'#ffc65c':s.isAccept?'#51dfbc':s.isTrap?'#f08397':replay.path.includes(s.id)?'#a7aaff':'#798da7';
        return <g key={s.id} transform={`translate(${pos.x} ${pos.y})`}><ellipse rx="24" ry="17" fill="#101c2b" stroke={color} strokeWidth="2"/>{s.isAccept && <ellipse rx="20" ry="13" fill="none" stroke={color}/>}<text textAnchor="middle" y="4" fontSize="11" fill="white">{s.id}</text></g>;
      })}
    </svg>
  </div>;
}

import { useId } from 'react';
import { metro } from './gameModels';

const stations = [
  {id:'q0',x:85,y:104,name:'Outside'},
  {id:'q1',x:290,y:104,name:'In transit'},
  {id:'q2',x:495,y:104,name:'Complete'},
  {id:'q_dead',x:290,y:254,name:'Alarm'},
];
const routes = [
  ['q0','q1','M117 104H255',185,104],
  ['q1','q2','M322 104H460',390,104],
  ['q1','q1','M270 78C223 8 357 8 311 78',290,34],
  ['q0','q_dead','M111 126L260 235',175,174],
  ['q1','q_dead','M290 138V218',290,182],
  ['q2','q_dead','M470 127L320 235',411,174],
  ['q_dead','q_dead','M320 241C416 211 416 290 323 264',398,253],
] as const;

export function MetroDiagram({state,previous,symbol}:{state:string;previous?:string;symbol?:string|null}) {
  const uid=useId();
  return <svg className="mt-map" viewBox="0 0 580 326" role="img" aria-label={`Metro DFA, current state ${state}`}>
    <defs>{['#718497','#6ce3ba','#ff8796','#a7abff'].map((color,i)=><marker key={color} id={uid+i} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10Z" fill={color}/></marker>)}</defs>
    <path d="M17 104H50" stroke="#6ce3ba" strokeWidth="2" markerEnd={`url(#${uid}1)`}/><text x="14" y="90" fill="#84e7c5" fontSize="12">Start</text>
    {routes.map(([from,to,d,x,y])=>{
      const symbols=metro.transitions.filter(t=>t.from===from&&t.to===to).map(t=>t.symbol);
      const active=previous===from&&state===to&&symbols.includes(symbol??'');
      const tone=active?(to==='q_dead'?2:to==='q2'?1:3):0;
      const color=['#718497','#6ce3ba','#ff8796','#a7abff'][tone];
      const label=symbols.join(', ');
      return <g key={from+to}><title>{from} → {to} on {label}</title><path d={d} fill="none" stroke={color} strokeWidth={active?4:1.6} markerEnd={`url(#${uid}${tone})`}/>
        <rect x={x-label.length*4.1-6} y={y-11} width={label.length*8.2+12} height="22" rx="6" fill="#111e2b" stroke={color}/><text x={x} y={y+4.5} textAnchor="middle" fill={active?color:'#d2dce6'} fontSize="13">{label}</text></g>;
    })}
    {stations.map(s=>{
      const color=s.id==='q2'?'#6ce3ba':s.id==='q_dead'?'#ff8796':'#acafff';
      return <g key={s.id}><title>{s.name}{s.id===state?' · current state':''}</title>
        {s.id===state && <circle cx={s.x} cy={s.y} r="37" fill="none" stroke={color} strokeWidth="6" opacity=".24"/>}
        <circle cx={s.x} cy={s.y} r="30" fill={s.id===state?'#223746':'#152333'} stroke={color} strokeWidth={s.id===state?3:1.5}/>
        {s.id==='q2' && <circle cx={s.x} cy={s.y} r="25" fill="none" stroke={color}/>}
        <text x={s.x} y={s.y+5} textAnchor="middle" fill="#f4f8ff" fontSize="15">{s.id}</text>
        <text x={s.x} y={s.y+51} textAnchor="middle" fill={color} fontSize="14">{s.name}</text></g>;
    })}
  </svg>;
}

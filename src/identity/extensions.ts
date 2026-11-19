import { DFA, NFA, EPSILON } from '../engine/types';
import { getEpsilonClosure } from '../engine/subset';
import { Model } from './engine';
export function eliminateEpsilon(nfa:NFA):NFA {
 const transitions:NFA['transitions']=[];const accepting=new Set(nfa.acceptStates);
 const acceptStates=nfa.states.filter(s=>[...getEpsilonClosure([s.id],nfa.transitions)].some(q=>accepting.has(q))).map(s=>s.id);
 for(const s of nfa.states)for(const p of getEpsilonClosure([s.id],nfa.transitions))for(const t of nfa.transitions.filter(t=>t.from===p&&!t.isEpsilon&&t.symbol!==EPSILON))for(const q of getEpsilonClosure([t.to],nfa.transitions))transitions.push({...t,from:s.id,to:q});
 return {...nfa,states:nfa.states.map(s=>({...s,isAccept:acceptStates.includes(s.id)})),acceptStates,transitions};
}
export function rightLinear(dfa:DFA){return dfa.states.map(s=>`${s.id} → ${[...dfa.transitions.filter(t=>t.from===s.id).map(t=>`${JSON.stringify(t.symbol)} ${t.to}`),...(s.isAccept?['ε']:[])].join(' | ')||'∅'}`).join('\n');}
export function mealyToMoore(m:Model){
 const start=`${m.start}/INIT`;const states=[start,...new Set(m.edges.map(e=>`${e.to}/${e.output}`))];
 return {states,initial:start,outputs:Object.fromEntries(states.map(s=>[s,s.slice(s.lastIndexOf('/')+1)])),edges:states.flatMap(s=>m.edges.filter(e=>e.from===s.slice(0,s.lastIndexOf('/'))).map(e=>({from:s,symbol:e.symbol,to:`${e.to}/${e.output}`}))),note:'Ignore the initial INIT output: thereafter each Moore destination output equals the corresponding Mealy edge output.'};
}
export type Grammar=Record<string,string[][]>;
export function simplifyGrammar(g:Grammar,start:string):Grammar{
 const generating=new Set<string>();let changed=true;while(changed){changed=false;for(const [a,rules] of Object.entries(g))if(!generating.has(a)&&rules.some(r=>r.every(s=>!(s in g)||generating.has(s)))){generating.add(a);changed=true;}}
 const reach=new Set([start]);changed=true;while(changed){changed=false;for(const a of [...reach])for(const r of g[a]??[])if(r.every(s=>!(s in g)||generating.has(s)))for(const s of r)if(s in g&&!reach.has(s)){reach.add(s);changed=true;}}
 return Object.fromEntries(Object.entries(g).filter(([a])=>reach.has(a)&&generating.has(a)).map(([a,rs])=>[a,rs.filter(r=>r.every(s=>!(s in g)||generating.has(s)))]));
}
// Scoped, constructive normal forms for {a^n b^n | n>=1}.
export const normalForms={original:'S → a S b | a b',CNF:'S → A C | A B\nC → S B\nA → a\nB → b',GNF:'S → a S B | a B\nB → b',explanation:'CNF replaces terminals in mixed right sides and binarizes aSb. GNF factors the trailing terminal b into B; each production starts with exactly one terminal. These are scoped conversions, not a general-purpose converter.'};
export function boundedPCP(tiles:[string,string][],depth:number){
 if(depth<1||depth>8||tiles.length>4||tiles.some(t=>t.some(s=>!s.length||s.length>8)))throw Error('PCP limit: 4 nonempty tiles, 8 characters, depth 1–8.');
 const q=[{top:'',bottom:'',path:[] as number[]}];for(let i=0;i<q.length;i++){const x=q[i];if(x.path.length&&x.top===x.bottom)return {solution:x.path,word:x.top};if(x.path.length===depth)continue;tiles.forEach(([a,b],j)=>{const top=x.top+a,bottom=x.bottom+b;if(top.startsWith(bottom)||bottom.startsWith(top))q.push({top,bottom,path:[...x.path,j+1]});});}return {solution:null,word:'No match within bound; unbounded result UNKNOWN'};
}

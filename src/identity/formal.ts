import { Model, Policy } from './engine';
export const policySource = 'POLICY ScholarshipAccess {\n  REQUIRE CONSENT;\n  REQUIRE IDENTITY_VERIFIED;\n  REQUIRE SESSION_ACTIVE;\n  ALLOW ACCESS;\n  ALLOW SUBMIT_APPLICATION;\n}';
export interface Tree { label: string; children?: Tree[] }
export function parsePolicy(source: string): {policy: Policy; tree: Tree; left: string[]; right: string[]} {
  if (source.length > 4000) throw Error('Policy limit: 4,000 characters.');
  const tokens = source.match(/[A-Za-z_][A-Za-z_0-9]*|[{};]/g) ?? [];
  if(tokens.join('') !== source.replace(/\s/g,'')) throw Error('Unsupported policy character.');
  let i=0;
  const take = (expected?: string) => { const t=tokens[i++]; if(!t || expected && t!==expected) throw Error(`Token ${i}: expected ${expected ?? 'identifier'}.`);return t;};
  take('POLICY'); const name=take(); if(!/^[A-Za-z_]\w*$/.test(name)) throw Error('Invalid policy name.'); take('{');
  const requires:string[]=[];const allows:string[]=[]; const statements:Tree[]=[];
  while(tokens[i]!=='}') {
    const kind=take(); if(!['REQUIRE','ALLOW'].includes(kind)) throw Error('Expected REQUIRE or ALLOW.');
    const value=take(); const valid=kind==='REQUIRE'?['CONSENT','IDENTITY_VERIFIED','SESSION_ACTIVE']:['ACCESS','SUBMIT_APPLICATION'];
    if(!valid.includes(value)) throw Error(`Unsupported ${kind} symbol: ${value}`);
    take(';'); const list=kind==='REQUIRE'?requires:allows; if(list.includes(value)) throw Error('Duplicate policy clause.');list.push(value);
    statements.push({label:'Statement',children:[{label:kind},{label:value},{label:';'}]});
  }
  take('}'); if(i!==tokens.length) throw Error('Unexpected trailing tokens.');
  let list:Tree={label:'Statements',children:[{label:'ε'}]};
  for(let n=statements.length-1;n>=0;n--) list={label:'Statements',children:[statements[n],list]};
  const tree:Tree={label:'Policy',children:[{label:'POLICY'},{label:'Name',children:[{label:name}]},{label:'{'},list,{label:'}'}]};
  const derive=(right:boolean)=>{let frontier=[tree];const lines=['Policy'];while(frontier.some(t=>t.children)){const indices=frontier.map((t,j)=>t.children?j:-1).filter(j=>j>=0);const j=right?indices[indices.length-1]:indices[0];frontier.splice(j,1,...frontier[j].children!.filter(t=>t.label!=='ε'));lines.push(frontier.map(t=>t.label).join(' '));}return lines;};
  return {policy:{name,requires,allows},tree,left:derive(false),right:derive(true)};
}
export function analyzeModel(m: Model) {
  if(!m || !Array.isArray(m.states) || !Array.isArray(m.edges) || !Array.isArray(m.alphabet) || !Array.isArray(m.accepts) || m.states.length>100 || m.edges.length>3000 || m.alphabet.length>40 || !m.states.every(s=>typeof s==='string' && s.length<80) || !m.alphabet.every(s=>typeof s==='string' && s.length<80) || !m.states.includes(m.start) || m.accepts.some(s=>!m.states.includes(s)) || new Set(m.states).size!==m.states.length || m.edges.some(e=>!m.states.includes(e.from)||!m.states.includes(e.to)||!m.alphabet.includes(e.symbol)||!['ALLOW','DENY','RETRY','LOCK','REQUIRE_VERIFICATION'].includes(e.output))) throw Error('Invalid or oversized finite model.');
  const reachable=new Set([m.start]);const queue=[m.start];
  for(let i=0;i<queue.length;i++) for(const e of m.edges.filter(e=>e.from===queue[i])) if(!reachable.has(e.to)){reachable.add(e.to);queue.push(e.to);}
  const live=new Set(m.accepts);let changed=true;while(changed){changed=false;for(const e of m.edges)if(live.has(e.to)&&!live.has(e.from)){live.add(e.from);changed=true;}}
  const missing:string[]=[];const conflicts:string[]=[];
  for(const s of m.states)for(const a of m.alphabet){const n=m.edges.filter(e=>e.from===s&&e.symbol===a).length;if(!n)missing.push(`${s}/${a}`);if(n>1)conflicts.push(`${s}/${a}`);}
  // Product graph with consent/verification/session monitors. BFS gives shortest event counterexample.
  const q=[{state:m.start,c:false,v:false,s:false,path:[] as string[]}];const seen=new Set<string>();let counterexample:string[]|null=null;
  for(let i=0;i<q.length;i++){
    const x=q[i];const key=JSON.stringify([x.state,x.c,x.v,x.s]);if(seen.has(key))continue;seen.add(key);
    for(const e of m.edges.filter(e=>e.from===x.state)){
      let {c,v,s}=x; const path=[...x.path,`${e.from} —${e.symbol}/${e.output}→ ${e.to}`];
      if(e.output==='ALLOW') {if(e.symbol==='CONSENT')c=true;if(['GOOD','ALTERNATIVE'].includes(e.symbol)){v=true;s=true;}if(['WITHDRAW','LOGOUT'].includes(e.symbol)){c=false;v=false;s=false;}}
      if(e.symbol==='EXPIRE'){s=false;v=false;}
      if((e.symbol==='ACCESS'&&e.output==='ALLOW'||m.accepts.includes(e.to))&&(!c||!v||!s)){counterexample=path;break;}
      q.push({state:e.to,c,v,s,path});
    }
    if(counterexample)break;
  }
  return {unreachable:m.states.filter(s=>!reachable.has(s)),dead:m.states.filter(s=>!live.has(s)),missing,conflicts,unexpectedAccepts:m.accepts.filter(s=>s!=='ACCESS'),completionPossible:[...reachable].some(s=>m.accepts.includes(s)),counterexample,assumptions:'GOOD and ALTERNATIVE are trusted guard outcomes. EXPIRE, LOGOUT and WITHDRAW revoke trust. Only this finite model is checked.'};
}
export function runPDA(source: string, mode: 'empty'|'final'='empty') {
  if(source.length>4000)throw Error('PDA input limit: 4,000 characters.');
  const tokens=source.trim()?source.trim().split(/\s+/):[]; const stack:string[]=['⊥']; const trace=[{input:'ε',stack:[...stack],state:'q'}];let valid=true;
  for(const token of tokens){if(!/^(BEGIN|END)_(SESSION|VERIFICATION)$/.test(token)){valid=false;}else {const [op,type]=token.split('_');if(op==='BEGIN')stack.push(type);else if(stack.at(-1)===type)stack.pop();else valid=false;}trace.push({input:token,stack:[...stack],state:valid?'q':'reject'});if(!valid)break;}
  const accepted=valid&&stack.length===1;
  if(accepted){stack.pop();trace.push({input:'end marker ⊣',stack:[],state:mode==='final'?'accept':'q'});}
  return {accepted,trace};
}
export type TMRule = [string,string,string,string,-1|0|1];
export const tmPrograms: Record<string,{description:string;alphabet:string;rules:TMRule[]}> = {
  increment:{description:'Unary successor: 1ⁿ → 1ⁿ⁺¹',alphabet:'1',rules:[['q0','1','q0','1',1],['q0','_','accept','1',0]]},
  equal:{description:'Recognize aⁿbⁿ (n ≥ 0): mark matching symbols X and Y',alphabet:'ab',rules:[['q0','a','seek','X',1],['q0','Y','check','Y',1],['q0','_','accept','_',0],['seek','a','seek','a',1],['seek','Y','seek','Y',1],['seek','b','back','Y',-1],['back','a','back','a',-1],['back','Y','back','Y',-1],['back','X','q0','X',1],['check','Y','check','Y',1],['check','_','accept','_',0]]},
  loop:{description:'Moves forever on blank cells: bounded run is inconclusive',alphabet:'1',rules:[['q0','1','q0','1',1],['q0','_','q0','_',1]]}
};
export function runTM(program:string,input:string,budget:number){
  const p=tmPrograms[program];if(!p || input.length>80 || [...input].some(c=>!p.alphabet.includes(c)) || !Number.isInteger(budget)||budget<0||budget>500)throw Error('Invalid TM input or budget (0–500).');
  const tape:Record<number,string>={};[...input].forEach((c,i)=>tape[i]=c);let head=0,state='q0';
  const trace=[{head,state,tape:{...tape},rule:'Initial configuration'}];
  for(let i=0;i<budget&&!['accept','reject'].includes(state);i++) {const read=tape[head]??'_';const r=p.rules.find(r=>r[0]===state&&r[1]===read);if(!r)state='reject';else{tape[head]=r[3];state=r[2];head+=r[4];}trace.push({head,state,tape:{...tape},rule:r?`${r[0]},${r[1]} → ${r[2]},${r[3]},${r[4]}`:'No rule → reject'});}
  return {trace,result:state==='accept'?'ACCEPT':state==='reject'?'REJECT':'UNKNOWN — step budget exhausted'};
}

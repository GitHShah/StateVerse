import { DFA } from '../types';
// GNFA elimination: null denotes the empty language; '' denotes epsilon.
export function convertMinDFAToRegex(dfa: DFA): string {
  if (dfa.states.length > 30) return 'Conversion omitted: 30-state display limit';
  type R = string | null;
  const union=(a:R,b:R):R=>a===null?b:b===null?a:a===b?a:a===''?`(${b})?`:b===''?`(${a})?`:`(${a}|${b})`;
  const concat=(...xs:R[]):R=>xs.some(x=>x===null)?null:xs.join('');
  const star=(a:R):R=>a===null||a===''?'':`(${a})*`;
  const ids=dfa.states.map(s=>s.id), start=ids.length, end=start+1, n=end+1;
  const r:R[][]=Array.from({length:n},()=>Array<R>(n).fill(null));
  const literal=(s:string)=>s.replace(/[\\.*+?()|[\]{}^$]/g,'\\$&');
  for(const t of dfa.transitions){const eq=dfa.equivClasses?.find(e=>e.label===t.symbol);const chars=eq?.chars??[t.symbol];if(chars.some(c=>c.length!==1))return 'Conversion requires explicit character alphabet';const label=chars.map(literal).reduce<R>((a,b)=>union(a,b),null);const i=ids.indexOf(t.from),j=ids.indexOf(t.to);r[i][j]=union(r[i][j],label);}
  r[start][ids.indexOf(dfa.startState)]='';for(const a of dfa.acceptStates)r[ids.indexOf(a)][end]='';
  for(let k=0;k<ids.length;k++) {for(let i=0;i<n;i++)if(i!==k)for(let j=0;j<n;j++)if(j!==k){r[i][j]=union(r[i][j],concat(r[i][k],star(r[k][k]),r[k][j]));if((r[i][j]?.length??0)>30000)return 'Conversion omitted: expression size limit';}for(let i=0;i<n;i++){r[i][k]=null;r[k][i]=null;}}
  return r[start][end]??'∅';
}

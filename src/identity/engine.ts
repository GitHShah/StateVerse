export const profiles = [
  { id: 'DEMO-USER-001', name: 'Aarav Sharma', course: 'B.Tech · Year 2' },
  { id: 'DEMO-USER-002', name: 'Meera Rao', course: 'B.Sc · Year 1' },
  { id: 'DEMO-USER-003', name: 'Kabir Das', course: 'B.Tech · Year 3' },
];
export const services = ['Scholarship', 'Bank onboarding', 'Examination', 'Public service'] as const;
export type Service = typeof services[number];
export type Output = 'ALLOW' | 'DENY' | 'RETRY' | 'LOCK' | 'REQUIRE_VERIFICATION';
export const symbols = ['SELECT', 'CONSENT', 'REQUEST', 'GOOD', 'BAD', 'ALTERNATIVE', 'ACCESS', 'WITHDRAW', 'LOGOUT', 'EXPIRE'] as const;
export type Symbol = typeof symbols[number];
export interface Edge { from: string; symbol: string; to: string; output: Output }
export interface Model { states: string[]; alphabet: string[]; start: string; accepts: string[]; edges: Edge[] }
export function identityModel(limit = 3): Model {
  if (!Number.isInteger(limit) || limit < 1 || limit > 5) throw Error('Retry limit must be 1–5.');
  const states = ['START', 'IDENTIFIED', 'CONSENTED', ...Array.from({length:limit}, (_,i)=>`OTP_${i}`), 'VERIFIED', 'ACCESS', 'LOCKED', 'REVOKED', 'LOGGED_OUT', 'EXPIRED'];
  const edges: Edge[] = [];
  for (const from of states) for (const symbol of symbols) {
    let to = from; let output: Output = symbol === 'ACCESS' ? 'REQUIRE_VERIFICATION' : 'DENY';
    if (from === 'START' && symbol === 'SELECT') { to = 'IDENTIFIED'; output = 'ALLOW'; }
    if (from === 'IDENTIFIED' && symbol === 'CONSENT') { to = 'CONSENTED'; output = 'ALLOW'; }
    if (from === 'CONSENTED' && symbol === 'REQUEST') { to = 'OTP_0'; output = 'ALLOW'; }
    if (from === 'CONSENTED' && symbol === 'ALTERNATIVE') { to = 'VERIFIED'; output = 'ALLOW'; }
    if (from.startsWith('OTP_') && symbol === 'GOOD') { to = 'VERIFIED'; output = 'ALLOW'; }
    if (from.startsWith('OTP_') && symbol === 'BAD') { const n = Number(from.slice(4))+1; to = n >= limit ? 'LOCKED' : `OTP_${n}`; output = n >= limit ? 'LOCK' : 'RETRY'; }
    if (['VERIFIED','ACCESS'].includes(from) && symbol === 'ACCESS') { to = 'ACCESS'; output = 'ALLOW'; }
    if (symbol === 'WITHDRAW' && !['START','IDENTIFIED'].includes(from)) { to = 'REVOKED'; output = 'ALLOW'; }
    if (symbol === 'LOGOUT' && from !== 'START') { to = 'LOGGED_OUT'; output = 'ALLOW'; }
    if (symbol === 'EXPIRE' && (from.startsWith('OTP_') || ['VERIFIED','ACCESS'].includes(from))) { to = 'EXPIRED'; output = 'DENY'; }
    edges.push({from, symbol, to, output});
  }
  return {states, alphabet:[...symbols], start:'START', accepts:['ACCESS'], edges};
}
export interface Claim { identity: string; service: Service; status: 'ACCEPTED' | 'REJECTED' | 'PENDING_REVIEW'; income: number; score: number }
export interface ClaimStore { all(): Claim[]; add(claim: Claim): boolean }
export class MemoryClaims implements ClaimStore {
  constructor(private claims: Claim[] = []) {}
  all() { return this.claims.map(c=>({...c})); }
  add(c: Claim) { if(this.claims.some(x=>x.identity===c.identity && x.service===c.service)) return false; this.claims.push({...c}); return true; }
}
export class BrowserClaims implements ClaimStore {
  private key = 'StateVerse.claims.v1';
  all(): Claim[] {
    const raw = localStorage.getItem(this.key);
    if (!raw) return [];
    if (raw.length > 100000) throw Error('Claim storage exceeds demo limit.');
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value) || value.some(c=>!c || !profiles.some(p=>p.id===c.identity) || !services.includes(c.service) || !['ACCEPTED','REJECTED','PENDING_REVIEW'].includes(c.status) || !Number.isFinite(c.income) || !Number.isFinite(c.score))) throw Error('Invalid demo claim storage. Clear demo claims to recover.');
    return value;
  }
  add(c: Claim) { const all = this.all(); if(all.some(x=>x.identity===c.identity && x.service===c.service)) return false; localStorage.setItem(this.key, JSON.stringify([...all,c])); return true; }
  clear() { localStorage.removeItem(this.key); }
}
export interface Policy { name: string; requires: string[]; allows: string[] }
export const defaultPolicy: Policy = {name:'ScholarshipAccess', requires:['CONSENT','IDENTITY_VERIFIED','SESSION_ACTIVE'], allows:['ACCESS','SUBMIT_APPLICATION']};
export interface Event { type: string; value?: string; income?: number; score?: number }
export interface Entry { index: number; event: string; symbol: string; from: string; to: string; output: Output; rule: string; next: string }
export class IdentityEngine {
  state = 'START'; identity = ''; consent = false; sessionUntil = 0;
  otp: {value: string; until: number; used: boolean} | null = null;
  trace: Entry[] = []; model: Model; policy = defaultPolicy;
  method: 'OTP' | 'OFFLINE' = 'OTP'; service: Service = 'Scholarship';
  constructor(public claims: ClaimStore = new MemoryClaims(), public now: ()=>number = Date.now, limit = 3) { this.model = identityModel(limit); }
  dispatch(event: Event): Entry {
    const from = this.state;
    const record = (output: Output, rule: string, symbol = event?.type ?? 'MALFORMED') => {
      const next = this.state === 'START' ? 'Select a synthetic identity.' : ['LOCKED','REVOKED','LOGGED_OUT','EXPIRED'].includes(this.state) ? 'Reset the demo and start a new verification.' : this.state === 'IDENTIFIED' ? 'Review the purpose and grant consent.' : this.state.startsWith('OTP_') ? 'Use the displayed mock OTP before expiry.' : this.state === 'CONSENTED' ? 'Complete the selected verification method.' : 'Open the service or submit synthetic eligibility.';
      const entry = {index:this.trace.length+1,event:event?.type ?? 'MALFORMED',symbol,from,to:this.state,output,rule,next}; this.trace.push(entry); return entry;
    };
    if (!event || typeof event.type !== 'string' || event.type.length > 40 || (event.value !== undefined && (typeof event.value !== 'string' || event.value.length > 80))) return record('DENY','Malformed or oversized event.');
    let symbol = event.type;
    if (event.type === 'SELECT' && !profiles.some(p=>p.id===event.value)) return record('DENY','Only listed synthetic identities are accepted.');
    if (event.type === 'VERIFY') {
      if (!this.otp) return record('DENY','No OTP was issued.');
      if (this.otp.used) return record('DENY','OTP_REPLAY: this token has already been consumed.');
      if (!this.state.startsWith('OTP_')) return record('DENY','OTP verification is not allowed in this state.');
      if (this.now() >= this.otp.until) { this.state='EXPIRED'; return record('DENY','OTP_EXPIRED: expiry guard rejected the token.','EXPIRE'); }
      symbol = event.value === this.otp.value ? 'GOOD' : 'BAD';
    }
    if (['GOOD','BAD','EXPIRE'].includes(event.type)) return record('DENY','Guard-result symbols cannot be submitted as public events.');
    if (event.type === 'REQUEST' && this.method !== 'OTP') return record('DENY','Select the OTP method before starting.');
    if (event.type === 'ALTERNATIVE' && this.method !== 'OFFLINE') return record('DENY','The offline mock credential path was not selected.');
    if (event.type === 'ALTERNATIVE' && event.value !== 'DEMO-OFFLINE-PASS') return record('DENY','Synthetic offline credential mismatch.');
    if (['ACCESS','SUBMIT_APPLICATION'].includes(event.type)) {
      if (!this.consent) return record('DENY','CONSENT_REQUIRED: protected actions require current consent.');
      if (!['VERIFIED','ACCESS'].includes(this.state)) return record('REQUIRE_VERIFICATION','IDENTITY_REQUIRED: complete verification first.');
      if (this.now() >= this.sessionUntil) {this.state='EXPIRED';this.sessionUntil=0;return record('DENY','SESSION_EXPIRED: authenticate again.','EXPIRE');}
      const facts: Record<string,boolean> = {CONSENT:this.consent,IDENTITY_VERIFIED:['VERIFIED','ACCESS'].includes(this.state),SESSION_ACTIVE:this.now()<this.sessionUntil};
      if (!this.policy.allows.includes(event.type) || this.policy.requires.some(r=>!facts[r])) return record('DENY','Compiled policy does not permit this operation.');
    }
    if (event.type === 'SUBMIT_APPLICATION') {
      if (this.state !== 'ACCESS') return record('DENY','Open the service before submitting.');
      const {income,score} = event;
      if (typeof income !== 'number' || !Number.isFinite(income) || income < 0 || income > 10000000 || typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 100) return record('DENY','Eligibility must contain finite income (0–10,000,000) and score (0–100).');
      const status: Claim['status'] = this.service !== 'Scholarship' ? 'PENDING_REVIEW' : income > 250000 || score < 60 ? 'REJECTED' : score < 75 ? 'PENDING_REVIEW' : 'ACCEPTED';
      try { if (!this.claims.add({identity:this.identity,service:this.service,income,score,status})) return record('DENY','DUPLICATE_CLAIM: an application already exists for this identity and service.'); }
      catch { return record('DENY','STORAGE_UNAVAILABLE: claim was not confirmed.'); }
      return record('ALLOW',`${status}: ${this.service === 'Scholarship' ? 'income ≤ 250,000 and score ≥ 60 required; score below 75 needs review.' : 'This service preset requires manual review.'}`);
    }
    const edge = this.model.edges.find(e=>e.from===this.state && e.symbol===symbol);
    if (!edge) return record('DENY','Unknown operation.');
    this.state = edge.to;
    if (edge.output === 'ALLOW') {
      if (symbol === 'SELECT') this.identity=event.value!;
      if (symbol === 'CONSENT') this.consent=true;
      if (symbol === 'REQUEST') this.otp={value:'DEMO-OTP-42',until:this.now()+60000,used:false};
      if (symbol === 'GOOD' || symbol === 'ALTERNATIVE') {if(this.otp)this.otp.used=true;this.sessionUntil=this.now()+300000;}
      if (symbol === 'WITHDRAW' || symbol === 'LOGOUT') {this.sessionUntil=0;this.consent=false;if(this.otp)this.otp.used=true;}
    }
    return record(edge.output, edge.output === 'DENY' ? 'ORDER_REQUIRED: operation is not permitted in this protocol state.' : edge.output === 'LOCK' ? 'RETRY_LIMIT: the configured failure limit was reached.' : edge.output === 'RETRY' ? 'OTP_MISMATCH: failure count advanced; requesting again cannot reset it.' : 'Protocol transition satisfied.',symbol);
  }
}

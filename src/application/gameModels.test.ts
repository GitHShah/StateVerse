import { expect,it } from 'vitest';
import { buildChase, defaultChase, journey } from './gameModels';
import { simulateAutomaton } from '../engine/simulator';
import { compilePattern } from '../engine/compilePattern';
import { replayInnings } from './chaseReplay';

it('compares played paths and leaves trailing deliveries unplayed', () => {
  const machine = buildChase({...defaultChase,sixes:false}).dfa;
  expect(replayInnings(machine,'440')).toMatchObject({won:true,state:'(8,2)',unused:'0'});
  expect(replayInnings(machine,'404').path).toEqual(['(0,0)','(4,1)','(4,2)','(8,3)']);
  expect(replayInnings(machine,'411')).toMatchObject({won:false,done:true,state:'(6,3)'});
  expect(replayInnings(machine,'W6')).toMatchObject({state:'(1,0)',unused:'6'});
});

it('agrees on every playable chase through three balls', () => {
  const cricket = buildChase(defaultChase).dfa;
  const machines = compilePattern('44|[01]44|4[01]4');
  function visit(tape: string, runs: number) {
    for (const machine of [cricket,machines.nfa,machines.dfa,machines.minimal]) {
      expect(simulateAutomaton(machine,tape).isAccepted).toBe(runs >= 8);
    }
    if (runs < 8 && tape.length < 3) {
      for (const shot of [0,1,4]) visit(tape+shot,runs+shot);
    }
  }
  visit('',0);
});

it('scores extras without consuming legal balls and ends at either limit', () => {
  const machines = buildChase({target:8, balls:1});
  for (const machine of [machines.dfa, machines.nfa, machines.minimal]) {
    for (const tape of ['WW6','WWWWWWWW']) expect(simulateAutomaton(machine,tape).isAccepted).toBe(true);
    for (const tape of ['6','6WW','WW0','WW60','WN6']) expect(simulateAutomaton(machine,tape).isAccepted).toBe(false);
  }
  expect(simulateAutomaton(machines.dfa,'WW6').path.at(-1)).toBe('(8,1)');
  expect(simulateAutomaton(buildChase({target:1,balls:4}).dfa,'W').path.at(-1)).toBe('(1,0)');
  expect(buildChase({...defaultChase,sixes:false}).dfa.alphabet).toEqual(['0','1','4','W']);
});

it('locates the first invalid gate action and allows repeated transfers', () => {
  for (const input of ['IO','ITTO']) expect(journey(input).trace.isAccepted).toBe(true);
  for (const [input,index] of [['O',1],['IIO',2],['IOI',3]] as const) expect(journey(input).failure).toBe(index);
  expect(journey('IT').trace.isAccepted).toBe(false);
  expect(journey('IT').failure).toBe(-1);
});

it('preserves nested stars, empty strings and explicit concatenation', () => {
  const machine = compilePattern('((a*)*)·b?').minimal;
  for (const input of ['', 'aaa','aaab','b']) expect(simulateAutomaton(machine,input).isAccepted).toBe(true);
  expect(simulateAutomaton(machine,'ba').isAccepted).toBe(false);
});

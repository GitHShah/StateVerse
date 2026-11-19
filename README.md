# StateVerse

A browser-based Theory of Computation project built with React, TypeScript and React Flow. Use the three-line menu to switch windows.

- **Automata Compiler & Visualizer** compiles ASCII regular expressions to a Thompson ε-NFA, subset DFA and Hopcroft-minimized DFA. Inspect the graph, transition table, postfix expression or AST, play the input tape, batch-test strings and export SVG, JSON or a Python FastAPI matcher.
- **Cricket Run Chase** lets you set a target of 1–60 runs and a limit of 1–12 legal balls. Dots, singles, fours and optional sixes use a ball. A wide adds one run and leaves the legal-ball count unchanged. Play an innings on the pitch, replay a sequence, compare two paths at the same delivery, or open your innings in the compiler.
- **Metro Ticket Challenge** models `IT*O` with a complete four-state DFA. Invalid taps show the first failing step, zero-based character index, previous state and reason.

Both games can open the played string and its rule in the compiler.

## Run locally

```powershell
npm ci
npm run dev -- --host 127.0.0.1 --port 5191
```

Open the local URL printed by Vite. Use `npm test` for the automated checks and `npm run build` for a production build.

The main application runs entirely in the browser. The compiler's optional FastAPI export downloads a standalone matcher module with a POST /match endpoint.

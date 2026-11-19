# StateVerse

A browser-based Theory of Computation project built with React, TypeScript and React Flow. Use the three-line menu to switch windows.

- **Automata Compiler & Visualizer** uses a [shunting-yard parser](https://github.com/GitHShah/StateVerse/blob/ffd4eb2caf4d8966a14c8ef3b5d9f832c5fb65c1/src/engine/parser.ts#L140) to parse ASCII regular expressions. It builds an ε-NFA with [Thompson’s construction](https://github.com/GitHShah/StateVerse/blob/ffd4eb2caf4d8966a14c8ef3b5d9f832c5fb65c1/src/engine/thompson.ts#L15), converts it to a DFA with [subset construction](https://github.com/GitHShah/StateVerse/blob/ffd4eb2caf4d8966a14c8ef3b5d9f832c5fb65c1/src/engine/subset.ts#L170) and reduces the DFA with [Hopcroft’s minimization algorithm](https://github.com/GitHShah/StateVerse/blob/ffd4eb2caf4d8966a14c8ef3b5d9f832c5fb65c1/src/engine/hopcroft.ts#L9). Inspect the graph, transition table, postfix expression or AST, [play the input tape](https://github.com/GitHShah/StateVerse/blob/ffd4eb2caf4d8966a14c8ef3b5d9f832c5fb65c1/src/engine/simulator.ts#L10), batch-test strings and export SVG, JSON or a Python FastAPI matcher.
- **[Cricket Run Chase](https://github.com/GitHShah/StateVerse/blob/ffd4eb2caf4d8966a14c8ef3b5d9f832c5fb65c1/src/application/gameModels.ts#L39)** lets you set a target of 1–60 runs and a limit of 1–12 legal balls. Dots, singles, fours and optional sixes use a ball. A wide adds one run and leaves the legal-ball count unchanged. Play an innings on the pitch, [replay a sequence](https://github.com/GitHShah/StateVerse/blob/ffd4eb2caf4d8966a14c8ef3b5d9f832c5fb65c1/src/application/chaseReplay.ts#L8), compare two paths at the same delivery, or open your innings in the compiler.
- **Metro Ticket Challenge** models `IT*O` with a [complete four-state DFA](https://github.com/GitHShah/StateVerse/blob/ffd4eb2caf4d8966a14c8ef3b5d9f832c5fb65c1/src/application/gameModels.ts#L20). Invalid taps show [the first failing step](https://github.com/GitHShah/StateVerse/blob/ffd4eb2caf4d8966a14c8ef3b5d9f832c5fb65c1/src/application/gameModels.ts#L54), zero-based character index, previous state and reason.

Both games can open the played string and its rule in the compiler.

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FGitHShah%2FStateVerse)

### Option 1: Vercel Dashboard (Zero Config)
1. Go to [Vercel](https://vercel.com) and click **"Add New Project"**.
2. Import the **`GitHShah/StateVerse`** repository.
3. Vercel automatically detects the Vite framework and applies the settings from `vercel.json`:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Click **Deploy**.

### Option 2: Vercel CLI
```bash
npm install -g vercel
vercel
# Follow prompts, then deploy to production:
vercel --prod
```

## Run locally

```powershell
npm ci
npm run dev -- --host 127.0.0.1 --port 5191
```

Open the local URL printed by Vite. Use `npm test` for the automated checks and `npm run build` for a production build.

The main application runs entirely in the browser. The compiler's optional FastAPI export downloads a standalone matcher module with a POST /match endpoint.

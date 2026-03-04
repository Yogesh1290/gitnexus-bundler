# gitnexus-bundler — What It Is and What It Proposes

## What GitNexus Actually Is — Two Distinct Products

[GitNexus](https://github.com/abhigyanpatwari/GitNexus) describes itself as *"the nervous system for agent context."* It is built around two separate products that share the same indexing engine:

**Product 1 — CLI + MCP (primary, recommended):**
The CLI indexes a repo into a KuzuDB knowledge graph, then runs an MCP server that AI agents connect to. Agents get 7 tools: `query`, `context`, `impact`, `detect_changes`, `rename`, `cypher`, `list_repos`. Claude Code, Cursor, and Pi use these tools to never miss a dependency or break a call chain. This is the main product.

**Product 2 — Web UI (secondary, "quick exploration"):**
A fully client-side graph explorer at `gitnexus.vercel.app`. Drop in a ZIP or GitHub repo, get an interactive knowledge graph with AI chat. Runs entirely in the browser via Tree-sitter WASM + KuzuDB WASM. Their README explicitly calls it "great for quick exploration."

**This bundler does not change either product's core functionality.**

---

## Two Use Cases — Both Honest, Different Audiences

---

### Use Case 1 — Primary Pitch: `run_app` MCP Tool (targets CLI + MCP)

> *"GitNexus gives AI agents perfect static understanding. This adds the execution half."*

The CLI + MCP server currently exposes 7 read-only tools. Agents can analyze architecture, trace call chains, assess blast radius — but they cannot run the code they're analyzing.

**The proposed 8th MCP tool: `run_app`**

When a repo has a `gitnexus.json` manifest (indicating it can be bundled), an AI agent can call:

```
run_app({ repo: "my-app" })
```

This triggers the following locally on the developer's machine:
1. `gitnexus-bundler` compiles the repo into a single `.cjs` via esbuild
2. The web UI (running locally via `gitnexus serve`) detects the bundle is ready
3. WebContainer boots the app in a browser tab in under 1 second
4. The developer sees live output, logs, and UI

**Why this is technically valid (no hype):**
- Everything runs locally — no WebContainer sandbox limitations apply (no public IP needed)
- The MCP server is already local; triggering a local CLI from a local server is straightforward
- The loop closes: `query → analyze → impact → run → observe → next edit`

**What the agent can now say:**
> "I analyzed the impact of your change — 7 call chains are affected. I've bundled the app. Want me to boot it in your browser so you can verify the fix before committing?"

**This is real, technically achievable, and directly extends GitNexus's own stated goal:**
*"So AI agents never miss code"* → extended to *"so AI agents never guess behavior."*

---

### Use Case 2 — Secondary: Standalone Marketplace (targets Web UI + zero-install distribution)

> *"Any Node.js tool can be listed and launched with zero install — no connection to the CLI or MCP required."*

This is a completely independent use case that does not depend on GitNexus's MCP or CLI at all. It solves a different problem: open-source Node.js tools have no zero-cost, zero-install way to distribute live demos.

**The workflow:**
1. Developer bundles their Node.js app: `npx gitnexus-bundler build -i server.js -s out`
2. Hosts the `.cjs` on Cloudflare Pages (free)
3. Lists it on the [GitNexus Marketplace](https://github.com/GitNexus-Marketplace/gitnexus-marketplace) via a `registry.json` PR
4. Anyone clicks Launch → app boots in their browser tab in under 1 second

**Who this is for:** Open-source tool authors who want users to try their tool without clone/install friction. End users on corporate laptops, Chromebooks, or school machines where `npm install` is blocked.

**This is already built and operational** as a standalone community project:
- [`gitnexus-bundler`](https://npmjs.com/package/gitnexus-bundler) — npm package, published
- [GitNexus-Marketplace/gitnexus-marketplace](https://github.com/GitNexus-Marketplace/gitnexus-marketplace) — live marketplace frontend (Vercel)
- Five category registries with PR-based submission flow

**Relationship to GitNexus main repo:** Uses the same WebContainer technology and follows the same zero-server spirit, but operates independently. No PR to the main repo is required for this use case to function.

---

## The Problem Both Use Cases Address



Most open-source Node.js tools exist only as raw files on GitHub. Using them requires cloning the repo, installing dependencies, and running a server locally. Most users don't do this. Hosting a persistent live demo costs money — for a free open-source project, that's a blocker.

The specific gap: GitHub Pages handles static HTML. Vercel/Railway handle persistent server apps but cost money. StackBlitz and CodeSandbox open repos as *code editors* for developers. None of them let a non-developer *use* an open-source tool as a regular web application with zero hosting cost.

---

## The Technology Actually Being Used

- **WebContainers** (`@webcontainer/api`) by StackBlitz — this is the engine that runs Node.js in the browser. GitNexus's web UI would embed this.
- **esbuild** — used by the bundler to compile the Node.js app into a single CommonJS `.cjs` file.
- The `.cjs` file includes a VFS extraction script that writes any embedded static frontend assets to the WebContainer virtual filesystem before the server starts.

---

## Where This Works

- Single-user tools: text processors, formatters, converters, CLI tools with a web UI
- Apps that call external APIs (OpenAI, Anthropic, Hugging Face inference) — the Node.js wrapper runs in the browser, the heavy computation happens on the external API's server
- Demos and interactive documentation for libraries and SDKs
- Apps using cloud databases (MongoDB Atlas, Supabase, Neon) for persistence

---

## Hard Limitations — These Cannot Be Engineered Around

These are physical constraints of the WebAssembly sandbox:

- **Multi-user shared state:** Each browser tab is a completely isolated server instance. Two users cannot share data through the WebContainer server. Apps that require multiple users to see each other's data in real time do not fit this model.
- **Persistence:** When the tab closes, the process ends. In-memory data is gone. External cloud databases are required for any meaningful persistence.
- **Native C++ modules:** `bcrypt`, `sqlite3`, `node-sass`, `canvas`, `sharp` — anything compiled with `node-gyp` — will not run. Pure JavaScript alternatives are required.
- **Background processes and webhooks:** The app runs only while the browser tab is open. No external service can send webhook events to the container.
- **Heavy local computation:** Running large language models locally, video encoding, or similar tasks are constrained by browser memory and CPU.

---

## What This Is Not

- Not a modification to GitNexus's core code intelligence, knowledge graph, or MCP functionality
- Not a server or hosting service — all compute runs in the user's browser
- Not affiliated with or endorsed by StackBlitz
- Not yet integrated into the main `abhigyanpatwari/GitNexus` repository — this is a proposed contribution

---

## Real Daily Pains This Solves

These are not invented scenarios. These are situations developers hit without needing to think about them.

### Pain 1 — "I found a useful Node.js tool but I can't install it"

**Exact situation:** Developer on a corporate laptop (IT-locked, no admin rights), student on a school computer, or someone on a Chromebook finds a GitHub repo that solves their problem — a log formatter, a schema generator, a test data seeder. They try `npm install -g` and get `permission denied`. Or Node.js isn't installed at all.

**What they do now:** Give up. Or spend 30+ minutes setting up nvm just to run one tool.

**What this solves:** The tool is listed on the marketplace. They click Launch. It runs in their browser tab inside a real Node.js process. No install. No permissions needed.

---

### Pain 2 — "I need a fake backend API running right now"

**Exact situation:** Frontend developer, backend isn't ready. They need `GET /api/users` to return realistic data so their `fetch()` calls work and the UI can be built. Not a mocked array inside the component — an actual running server that responds to HTTP requests.

**What they do now:** `npm install -g json-server`, write a `db.json`, figure out the route config. Minimum 15 minutes if they haven't done it before. And it only runs on their machine.

**What this solves:** A bundled mock API server tool on the marketplace. Click Launch, define routes in a simple UI, get a real Express server running on `localhost:8080` in the browser in under 30 seconds. Share the marketplace link with any teammate — they run their own isolated instance instantly.

---

### Pain 3 — "I built something useful and nobody tries it because setup is too hard"

**Exact situation:** An open-source developer posts their Node.js tool to Reddit or Twitter. People reply "cool, how do I use it?" They send the GitHub link. Half the people who were interested never try it — `git clone → npm install → node app.js` is too much friction for a tool they've only half-decided to use.

**What they do now:** Accept that most people won't try it. Or pay for hosting (Railway, Heroku) just to run a demo — which costs money for a free open-source project.

**What this solves:** Developer bundles once with `gitnexus-bundler`. Adds a Launch badge to their README. Anyone clicks it, the app runs in their browser. No server cost. No setup. Zero friction for the end user.

---

## Node.js Compatibility in WebContainers — Be Precise

Not all Node.js apps can run in a WebContainer. This is not a tooling limitation — it is a physical constraint of the WebAssembly sandbox. Knowing this upfront saves time.

### ✅ Works well

| Category | Examples |
|----------|---------|
| Pure JavaScript/TypeScript servers | Express, Fastify, Hono, Koa |
| File system operations on virtual FS | `fs`, `path`, `os` (limited) |
| HTTP client calls to external APIs | `fetch`, `axios`, `node-fetch` |
| Pure-JS crypto | `crypto` module (native Node.js, works) |
| In-memory databases | `lowdb`, `nedb`, `better-sqlite3` (JS-only) |
| Build tools (server-side, pre-compiled) | `esbuild`, `babel`, TypeScript compiler — run on your machine at bundle time, not inside the container |
| Template engines | `ejs`, `handlebars`, `pug` |
| AI API wrappers | OpenAI SDK, Anthropic SDK, any HTTP-based AI API |
| Pre-built React/Vue/Svelte frontends | Compile your frontend on your machine first → bundle the static output into the `.cjs` → Express serves it. Works perfectly. |

### ❌ Does not work — no exceptions

| Module / Pattern | Why it fails |
|-----------------|-------------|
| Native C++ addons (`bcrypt`, `sqlite3`, `canvas`, `sharp`, `node-sass`) | Compiled `.node` binaries cannot run in WASM |
| **React Compiler (Meta's new compiler)** | Cannot run inside WebContainer — compile your React app on your machine first, then bundle the output |
| **Next.js / Vite / CRA dev servers** | Running `next dev`, `vite dev`, or `react-scripts start` inside the container fails — JSX/TSX compilation requires native tooling that doesn't run in WASM |
| **Any framework dev server that compiles JSX at runtime** | Cold-start JSX/TSX compilation is too memory-intensive for the WASM sandbox — pre-compile everything before bundling |
| `child_process.exec()` / spawning OS processes | No OS shell in the sandbox |
| Binding to raw TCP sockets (beyond built-in HTTP) | Restricted by browser sandbox |
| WebSocket servers that external clients connect to | The container has no public IP |
| Receiving incoming webhooks | No inbound network access from outside the browser |
| Long-running background jobs (crons, queues) | Process dies when the tab closes |
| Accessing localhost of the host machine | Sandboxed — the container's localhost is isolated |

### ⚠️ Works with caveats

| Pattern | Caveat |
|---------|--------|
| `fs` (file system) | Writes to a virtual FS — files don't persist after tab close |
| `process.env` | No real shell environment — values must be injected at bundle time or set in-app |
| Multi-threading (`worker_threads`) | Available but browser-sandboxed WASM threads have limits |
| Large npm dependencies | Anything with native postinstall scripts will break |

---

## Why This Is Worth an Upstream PR to GitNexus

GitNexus currently answers: *"What does this code do?"*

This proposal adds the answer to: *"Can I run this code right now?"*

These are complementary capabilities on the same object — a GitHub repository. The code graph tells you the architecture. The WebContainer runner lets you interact with it live.

**The integration point is minimal:**
- A "Launch in browser" button appears only on repos that have a `gitnexus.json` manifest (opt-in by the repo owner)
- The WebContainer runner is a separate panel — it does not touch the existing knowledge graph, MCP server, or AI chat functionality
- No changes to the core indexing pipeline

**The value for GitNexus users:**
- GitNexus already attracts developers exploring unfamiliar codebases
- The next natural question after "I understand this repo" is "can I try it"
- Having both in one tool increases the usefulness of opening a repo in GitNexus

**The ask is not a full merge of everything:** The minimum viable integration is the ability to detect `gitnexus.json` in a repo and show a Launch button. The marketplace frontend and bundler CLI can remain separate community projects. The PR to gitnexus-web is scoped to: detect the manifest, render the panel, boot the WebContainer.

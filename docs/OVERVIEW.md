# gitnexus-bundler — Technical Overview

---

## What GitNexus Is

[GitNexus](https://github.com/abhigyanpatwari/GitNexus) is a client-side code intelligence tool. Drop in a GitHub repo or ZIP file, and it builds an interactive knowledge graph of the entire codebase — every dependency, call chain, and execution flow — directly in your browser. No server, no install. It also has a built-in Graph RAG agent you can query to explore the code.

The same intelligence is available as a CLI + MCP server for AI agents like Claude Code and Cursor:
```bash
npx gitnexus analyze   # index the repo into a knowledge graph
gitnexus mcp           # expose graph as MCP tools to your AI agent
```

---

## What gitnexus-bundler Adds

GitNexus currently gives you a deep static understanding of a codebase — what the code is, how it connects, what each function does. The one thing it cannot do is **run the code**.

`gitnexus-bundler` closes that gap. It is a local CLI that compiles any Node.js application into a single `.cjs` file using esbuild. That file can be executed inside a WebContainer — a WASM-based sandbox that runs real Node.js directly in a browser tab.

```bash
npx gitnexus-bundler build -i server.js -f "npm run build" -s out
```

The result: a new **Run** button appears in the GitNexus Web UI for any repo that has a `gitnexus.json` manifest. The user has already explored the code graph — now they can also run the app and interact with it, without leaving the browser, without cloning anything, without installing Node.js.

---

## The User Experience

When a repo contains a pre-built bundle (`gitnexus.json` pointing to a hosted `.cjs` file):

1. User opens the repo in GitNexus Web UI
2. The knowledge graph loads — all call chains, clusters, dependencies visible
3. A **Run** button appears in the UI (repos without a manifest do not show this button)
4. User clicks Run → WebContainer boots the app → **live in under 5 seconds**
5. User can interact with the running app directly in the same browser tab

When a repo has no bundle but still runs with a standard `npm install && node server.js`:

- WebContainer can still attempt to boot it, but setup takes longer (npm install fetches packages live)
- This is best-effort — native C++ modules and dev servers will not work
- Repos with a pre-built bundle always boot faster and more reliably

---

## What Works Best

Certain categories of Node.js repos are a natural fit for this:

| Works great | Examples |
|-------------|---------|
| REST API servers | Express, Fastify, Hono, Koa |
| Mock API servers | Any Express app returning JSON |
| CLI tools with a web UI | Schema generators, formatters, validators |
| AI API wrappers | OpenAI SDK, Anthropic SDK, any HTTP-based API tool |
| Documentation live examples | SDK demos, interactive tutorials |
| Dev utilities | Code linters, test data seeders, schema explorers |

These repos benefit directly: someone browsing the knowledge graph can go from "I understand this code" to "I'm using this tool" in one click.

---

## What Does Not Work

These are constraints of the WebAssembly sandbox, not the bundler:

| Does not work | Reason |
|--------------|--------|
| Native C++ addons (`bcrypt`, `sqlite3`, `sharp`, `canvas`) | Compiled `.node` binaries cannot run in WASM |
| React/Next.js/Vite dev servers (`next dev`, `vite dev`) | JSX/TSX compilation at runtime requires native tooling |
| Receiving webhooks or inbound connections | No public IP — the container is isolated |
| `child_process.exec()` and OS process spawning | No shell in the WASM sandbox |
| Shared state across browser tabs or users | Each tab is a fully isolated server instance |
| Data persistence after tab close | No filesystem persistence — use an external cloud DB |

Frontend assets (React/Vue/Svelte) work when pre-compiled. Build your frontend on your machine, embed the static output into the `.cjs`, and Express serves it normally.

---

## The Value to GitNexus Users

GitNexus attracts developers who want to understand an unfamiliar codebase quickly. The knowledge graph answers "what does this code do and how does it connect?" For repos that have a bundle, the next question — "does it actually work?" — is now also answered in the same session.

This is additive. The graph, the RAG agent, the MCP tools, the indexing pipeline — none of that changes. A `gitnexus.json` manifest is opt-in by the repo owner. Repos without one are unaffected.

---

## Beyond the GitNexus Web UI

The `.cjs` output is not specific to GitNexus. The same file can be run by any platform that embeds `@webcontainer/api`:

- A standalone community marketplace (already built and operational — [GitNexus Marketplace](https://github.com/GitNexus-Marketplace/gitnexus-marketplace))
- Any developer portfolio, tool landing page, or documentation site
- Browser extensions (a "Run on GitHub" button)
- VS Code extensions running apps directly in the editor
- Technical blog posts with embedded live demos

The marketplace is one use case of many. It is not a dependency of the core GitNexus integration.

---

## MCP Agents — A Secondary Use Case

Since GitNexus also has a CLI + MCP product, there is a natural extension: an AI agent that has analyzed the code graph could call a `run_app` MCP tool to boot the app and verify behavior before committing a change. The analysis → execution loop would close without the developer switching context.

This is technically achievable (everything runs locally — no public network required). It involves adding one new MCP tool, detecting `gitnexus.json` in the indexed repo, and rendering WebContainer output in the web UI. No changes to the existing indexing pipeline or tools.

This is a future possibility, not a current implementation.

---

## Current Status

| Component | Status |
|-----------|--------|
| `gitnexus-bundler` CLI | Published on npm — v1.0.2 |
| GitNexus Web UI integration | Proposed — PR not yet submitted |
| Standalone Marketplace | Live at GitNexus Marketplace |
| MCP `run_app` tool | Future proposal |

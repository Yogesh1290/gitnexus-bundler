# gitnexus-bundler — Technical Overview

> This document exists for two audiences: contributors considering a PR to the main GitNexus repo, and developers evaluating the standalone marketplace. Both scenarios are covered separately below.

---

## What GitNexus Is

[GitNexus](https://github.com/abhigyanpatwari/GitNexus) is a code intelligence engine. It indexes any codebase into a knowledge graph — every dependency, call chain, cluster, and execution flow — and exposes that graph through MCP (Model Context Protocol) tools so AI agents never miss a relationship when modifying code.

It ships as two products:

**CLI + MCP** *(primary product)*
Run `npx gitnexus analyze` in any repo. The CLI indexes it into a KuzuDB graph and exposes 7 MCP tools: `query`, `context`, `impact`, `detect_changes`, `rename`, `cypher`, `list_repos`. Claude Code, Cursor, and Pi connect to these locally. This is the main product.

**Web UI** *(secondary, "quick exploration")*
A browser-based graph explorer at [gitnexus.vercel.app](https://gitnexus.vercel.app). Drop in a ZIP or GitHub repo, get an interactive knowledge graph with AI chat. Runs entirely via Tree-sitter WASM + KuzuDB WASM — no server.

`gitnexus-bundler` does not modify either product's core functionality.

---

## What gitnexus-bundler Does

It is a local CLI tool that compiles any Node.js application into a single self-contained `.cjs` file using esbuild. The output includes the Node.js server, all pure-JS dependencies, and any static frontend assets embedded as Base64. The result can be executed inside a WebContainer — a WASM-based sandbox that runs real Node.js in a browser tab with no install and no server.

```bash
npx gitnexus-bundler build -i server.js -f "npm run build" -s out
```

---

## Integration Scenario 1 — `run_app` MCP Tool

*This is the proposed PR to the main GitNexus CLI + MCP codebase.*

GitNexus currently gives agents full static understanding of a codebase. The 7 existing MCP tools cover architecture exploration, blast radius, call chains, and refactoring — but no tool lets an agent trigger execution of the code it analyzed.

The proposed addition is a new MCP tool: `run_app`.

When a repo contains a `gitnexus.json` manifest, an agent can call:

```js
run_app({ repo: "my-app" })
```

This triggers the following on the developer's local machine:

1. `gitnexus-bundler` compiles the repo into a `.cjs` file via esbuild
2. The locally running web UI (`gitnexus serve`) detects the bundle
3. WebContainer boots the compiled app in a browser tab in under 1 second
4. The developer observes live output, logs, and UI

**Why this is locally feasible:**
Everything happens on the developer's machine — the MCP server, the CLI, the browser. There is no public network requirement. A WebContainer running locally can boot the app the same way `localhost:3000` works during development. The MCP tool call triggers a local shell command, which is already how `gitnexus mcp` operates.

**What this closes:** Agents currently say *"I analyzed the impact — here are the affected call chains."* With `run_app` they can follow that with *"I've bundled the app. You can boot it now to verify the behavior before committing."* The analysis → execution loop closes without leaving the browser.

**Scope of the PR:**
- One new MCP tool registered in the server
- Detection of `gitnexus.json` in the indexed repo
- A panel in the web UI to display WebContainer output
- No changes to the indexing pipeline, graph engine, or existing tools

---

## Integration Scenario 2 — Standalone Marketplace

*This is an independent community project. No PR to the main GitNexus repo is required.*

The marketplace is a separate problem: open-source Node.js tools have no zero-cost way to distribute live, runnable demos. GitHub Pages works for static HTML. Vercel/Railway handle persistent servers but cost money. StackBlitz opens repos as dev environments for developers. None of them let a non-developer simply *use* a Node.js tool as an app, with one click.

**The workflow for tool authors:**

1. Build your Node.js app with `npx gitnexus-bundler build -i server.js -s out`
2. Host the `.cjs` on Cloudflare Pages (free tier)
3. Add your entry to the appropriate `registry.json` via a PR
4. Users click Launch → your app boots in their browser tab in under 1 second

**Who this helps on the user side:** Developers on IT-locked corporate laptops, students on school machines, and anyone on a Chromebook where `npm install -g` returns a permission error or Node.js is not installed at all.

**What is already operational:**

| Component | Status |
|-----------|--------|
| [`gitnexus-bundler`](https://npmjs.com/package/gitnexus-bundler) npm package | Published — v1.0.2 |
| [GitNexus Marketplace](https://github.com/GitNexus-Marketplace/gitnexus-marketplace) frontend | Live on Vercel |
| Category registries (ai-tools, dev-tools, productivity, web-apps, utilities) | Open for PR submissions |

---

## WebContainer Compatibility

Not all Node.js apps can run inside a WebContainer. This is a constraint of the WebAssembly sandbox, not a limitation of the bundler.

### ✅ Works

| Category | Examples |
|----------|---------|
| Pure JavaScript/TypeScript servers | Express, Fastify, Hono, Koa |
| External HTTP API calls | `fetch`, `axios`, `node-fetch`, OpenAI SDK, Anthropic SDK |
| In-memory storage | `lowdb`, `nedb`, pure-JS SQLite |
| Pure-JS crypto | Node.js `crypto` module |
| Template engines | `ejs`, `handlebars`, `pug` |
| Pre-built frontend assets | Compile React/Vue/Svelte on your machine → embed the static output in the `.cjs` |

### ❌ Does Not Work

| Pattern | Reason |
|---------|--------|
| Native C++ addons (`bcrypt`, `sqlite3`, `canvas`, `sharp`, `node-sass`) | Compiled `.node` binaries cannot run in WASM |
| React Compiler, Vite dev, Next.js dev, CRA dev servers | JSX/TSX compilation at runtime requires native build tooling |
| `child_process.exec()` / OS process spawning | No shell in the sandbox |
| Raw TCP socket binding | Restricted by browser security model |
| Incoming webhooks from external services | No public IP — WebContainer has no inbound network access |
| Background jobs, cron tasks | Process lifetime is tied to the browser tab |
| Accessing host machine's `localhost` | The container's filesystem and network are isolated from the host |

### ⚠️ Works With Caveats

| Pattern | Caveat |
|---------|--------|
| `fs` (file system) | Writes to a virtual FS — nothing persists after the tab closes |
| `process.env` | No shell environment — inject values at bundle time or expose them via in-app UI |
| `worker_threads` | Available but subject to browser WASM thread limits |
| Large packages with native postinstall scripts | Will fail — ensure all deps are pure JS at bundle time |

---

## Hard Limits

These cannot be worked around regardless of how the app is written:

- **No shared state between users.** Each browser tab runs its own isolated server instance. Two users cannot interact through the container.
- **No persistence across sessions.** When the tab closes, the process ends. Use an external database (Supabase, Neon, MongoDB Atlas) for anything that needs to survive the session.
- **No native modules.** If a dependency installs a `.node` binary, it will not run. Find a pure-JS alternative before bundling.

---

## What This Project Is Not

- Not a modification to GitNexus's core graph engine, indexing pipeline, or MCP protocol
- Not a hosting or server service — all execution happens in the user's browser
- Not affiliated with or endorsed by StackBlitz
- Not yet integrated into the main `abhigyanpatwari/GitNexus` repository — Integration Scenario 1 is a proposed contribution

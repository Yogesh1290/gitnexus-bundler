# gitnexus-bundler — What It Is and What It Proposes

## What GitNexus Actually Is

[GitNexus](https://github.com/abhigyanpatwari/GitNexus) is a code intelligence engine. It indexes any codebase into a knowledge graph — every dependency, call chain, cluster, and execution flow — and exposes that graph through MCP (Model Context Protocol) tools so AI coding agents like Cursor and Claude Code have real architectural awareness of a codebase.

Its web UI (`gitnexus.vercel.app`) is a client-side graph explorer. You drop in a repo or ZIP file and get an interactive visualization with AI chat. No server. Uses Tree-sitter WASM, KuzuDB WASM, and in-browser embeddings.

**This bundler does not change any of that.** It does not modify GitNexus's core code intelligence functionality.

---

## What This Bundler Proposes to Add

GitNexus's web UI currently lets users *explore* and *analyze* a codebase. The bundler proposes extending this with a second capability: *running* a codebase as a live interactive app directly in the browser.

The proposed addition is a marketplace layer inside the GitNexus web UI where open-source Node.js tools and web apps can be launched by any user without installing anything or paying for server hosting.

The workflow being proposed:

1. A developer bundles their Node.js app locally using the `gitnexus-bundler` CLI. This produces a single `.cjs` file using esbuild — the server, all dependencies, and the frontend are compiled into one executable.
2. They host that file on a public URL (Cloudflare Pages, CDN, etc.) and add a `gitnexus.json` manifest to their repo pointing to it.
3. A user visiting the GitNexus marketplace clicks "Launch." The `.cjs` file is downloaded and executed inside the user's browser via WebContainers (StackBlitz's `@webcontainer/api`). A Node.js process starts inside the browser. The app runs.

**This integration is not yet merged into the main GitNexus repo.** This bundler and the associated marketplace UI are being developed as a proposed contribution.

---

## The Problem It Addresses

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

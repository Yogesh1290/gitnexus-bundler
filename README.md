# GitNexus Universal Bundler (`nexus-bundle`)

![NPM Version](https://img.shields.io/npm/v/nexus-bundler) ![License](https://img.shields.io/npm/l/nexus-bundler)

*Tags: `#gitnexus` `#webcontainer` `#serverless` `#nextjs` `#react` `#nodejs` `#bundler`*

A **Command Line Interface (CLI) tool** that compiles any Node.js full-stack repository into a self-contained **GitNexus Cloud Executable** (`.cjs` bundle).

This tool runs **locally on your machine** and produces two output files:
- `gitnexus-bundle.cjs` — your self-contained app executable
- `gitnexus.json` — a manifest pointing to where you host your bundle

> 📚 **[Read the Complete GitNexus Cloud Architecture Guide Here](docs/nexus-guide.md)**

## 🚀 Installation & Usage

### Global Installation
```bash
npm install -g nexus-bundler
# OR if cloning from source:
npm link
```

### Backend-only (Express API)
```bash
npx --yes nexus-bundler@latest build -i src/server.js -o gitnexus-bundle.cjs
```

### Full-Stack (Next.js / React + Node.js)
```bash
npx --yes nexus-bundler@latest build -i server.js -f "npm run build" -s out
```

## CLI Options

| Option | Description | Required |
|--------|-------------|----------|
| `-i, --input <path>` | Entry point file | ✅ Yes |
| `-o, --output <path>` | Output file name (default: `gitnexus-bundle.cjs`) | No |
| `-f, --frontend <cmd>` | Frontend build command to run first | No |
| `-s, --static <dir>` | Frontend static output directory to embed into the bundle | No |

## How It Works

1. **`-f "npm run build"`** — Runs your frontend framework's build step.
2. **Bundle** — Compiles your Node.js entry point into a single CommonJS `.cjs` file using `esbuild`.
3. **`-s out`** — (Optional) Base64-encodes your compiled frontend and embeds it directly into the `.cjs` executable.
4. **Generates `gitnexus.json`** — A manifest so GitNexus Cloud knows how to boot your app.

After bundling, **you choose** how to host and deploy your `gitnexus-bundle.cjs` — upload it to any public file host, a CDN, or your own server.

---

## 🏗️ Architectural Guidelines for GitNexus WebContainers

GitNexus runs a Linux-like OS inside the browser using WebAssembly (WebContainers). This is incredibly powerful but comes with strict physical limitations.

### 1. The Native C++ Barrier (CRITICAL)
Browsers **cannot execute Native C++ binaries**. Any Node.js module relying on `node-gyp` will crash.
- ❌ **DO NOT USE**: `bcrypt`, `node-sass`, `canvas`, `sharp`, `sqlite3`, `puppeteer`
- ✅ **USE INSTEAD**: `bcryptjs`, `sass`, Cloudinary APIs, `pg`

### 2. Database Support
- ❌ Local daemons (`sqlite3` requires C++)
- ✅ Cloud databases: MongoDB Atlas, Supabase, Neon, Firebase

### 3. Frontend Frameworks
Next.js Turbopack uses Rust/WASM bindings that are unsupported in browser containers.

**Best practice:** Use static export (`output: 'export'`) + Express backend + `-s out` flag.

### 4. ESM Constraints
GitNexus bundles must be `.cjs`. The bundler handles this automatically.

### 5. Server Port Binding
Bind to `0.0.0.0` — WebContainer network proxies drop `localhost`/IPv6 connections.

```javascript
app.listen(8080, '0.0.0.0', () => console.log('Ready'));
```

### 6. Iframe Security (Helmet / CSP)
GitNexus renders apps inside an iframe. Disable aggressive CSP headers:

```javascript
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: false,
    frameguard: false
}));
```

### 7. Native TypeScript Support
Powered by `esbuild` — zero configuration needed, TypeScript just works.

```bash
nexus-bundle build -i src/server.ts
```

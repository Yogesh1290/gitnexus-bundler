# GitNexus Universal Bundler (nexus-bundle)

The overarching Command Line Interface (CLI) to compile **any Node.js full-stack repository** into a high-performance, autonomous **GitNexus Cloud Executable**.

GitNexus Universal Bundler enables you to take massive, multi-framework applications (like Next.js + Express) and compress them into a solitary `.cjs` executable payload that boots instantaneously inside the **GitNexus Browser WebContainer OS**.

## 🚀 Installation & Usage

### 1. Global Installation
To use the bundler dynamically across your system, link or install it globally:
```bash
npm install -g nexus-bundle
# OR if cloning from source:
npm link
```

### 2. Standard Usage (Node.js API Only)
If you are only building a backend Express API:
```bash
nexus-bundle build -i src/server.js -o gitnexus-bundle.cjs
```

### 3. Full-Stack Enterprise Usage (Next.js, Vite, React + Node.js)
If you are building a unified full-stack app (e.g., a Next.js static frontend served by a custom Node.js backend), use the Universal SFX (Self-Extracting) command:

```bash
nexus-bundle build -i server.js -f "npm run build" -s out
```

#### What this does:
1. `-f "npm run build"`: Automatically executes your frontend framework's build step.
2. `nexus-bundle`: Compiles your Node.js `server.js` and strips out problematic ESM syntax, enforcing backward-compatible CommonJS.
3. `-s out`: **Virtual File System (VFS) Injection**. The bundler takes your entire compiled frontend directory (e.g., Next.js `out/` or Vite `dist/`), Base64 encodes it, and embeds it directly into the `.cjs` executable script!
4. Generates `gitnexus.json` so GitNexus Cloud knows exactly how to boot your app.
5. Injects a hardened `.github/workflows/gitnexus-release.yml` GitHub Action to automate CI/CD deployments on push.

---

## 🏗️ Architectural Guidelines for GitNexus WebContainers

GitNexus runs an entire Linux-like OS inside the browser using WebAssembly (WebContainers). This is incredibly powerful but comes with strict physical limitations compared to a standard VPS (AWS/Vercel).

**Before using the Universal Bundler, strictly read these architectural rules.**

### 1. The Native C++ Barrier (CRITICAL)
Browsers **cannot execute Native C++ binaries**. Any Node.js module that relies on `node-gyp` or pre-compiled C++ addons will **fatally crash** the WebContainer.
*   ❌ **DO NOT USE**: `bcrypt`, `node-sass`, `canvas`, `sharp`, `sqlite3`, `puppeteer`.
*   ✅ **USE INSTEAD**: `bcryptjs` (pure JS), `sass` (pure JS), Cloudinary APIs, `pg` (pure JS Postgres driver).

*Note: The Universal Bundler automatically attempts to `--external` these modules so they don't break the build compiler, but if your code dynamically "requires" them at runtime, your server will freeze in the browser.*

### 2. Database Support
Because GitNexus runs in the browser, you do not have persistent local database demons running alongside your code.
*   ❌ **Local Databases via Drivers**: `sqlite3` natively requires C++ and will not work.
*   ✅ **Cloud Databases**: Connecting remotely to MongoDB Atlas, Supabase, Neon (PostgreSQL), or Firebase works flawlessly using standard `fetch` or pure-JS drivers.
*   ✅ **In-Memory**: Standard Node.js arrays/objects are fine for mock deployments.

### 3. Frontend Frameworks (React, Next.js, Vue, Svelte)
WebContainers *can* run `vite dev` or `next dev`, but Next.js **Turbopack** relies on Rust/WASM bindings that are fundamentally unsupported in browser containers, causing random crashes. Furthermore, heavy Next.js SSR processes consume massive browser memory.

**The GitNexus Standard:**
The absolute best way to deploy heavy frontend applications to GitNexus is **Static Architecture Separation**:
1. Configure your frontend (Next.js/React) to output static HTML/CSS/JS (`output: 'export'` for Next.js, yielding an `out/` directory).
2. Write a lightweight custom `server.js` (Express) that serves that static `out/` directory and mounts your `/api` routes.
3. Use the Bundler (`-s out`) to compress the frontend directly into the server `.cjs` bundle.

When GitNexus boots the bundle, the `.cjs` executable automatically "unpacks" the UI directory to the browser's virtual hard drive in 2 milliseconds, and the Express server serves it instantly.

### 4. ESM Strict Mode Constraints
Many modern frameworks enforce `"type": "module"` in their `package.json`. GitNexus Cloud remote bundles are strictly engineered to download and execute as `.cjs` files. This is intentional. Native CommonJS execution (`require`) bypasses the strict OS-level loader errors that WebContainers throw when mixing ESModules with dynamically downloaded remote payload bundles.
*   The Universal Bundler handles this automatically. Always rely on the `.cjs` GitNexus Bundle.

### 5. Server Port Binding
Ensure your server binds to `0.0.0.0`. WebContainer Network Proxies frequently drop connections that are arbitrarily bound to `localhost` or IPv6 loopbacks (`::1`).

```javascript
// ✅ CORRECT:
app.listen(8080, '0.0.0.0', () => console.log('Ready'));
```

### 6. Iframe Security Policies (Helmet / Content Security Policy)
GitNexus renders your application OS natively inside an Iframe on the dashboard preview. If your Node.js backend uses aggressive security policies (like `helmet`), it will block GitNexus from rendering the page with a "Refused to Connect" error.

Ensure your server is configured to permit WebContainer iframe embedding:
```javascript
import helmet from 'helmet';

app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: false,
    frameguard: false // CRITICAL: Allows GitNexus iframe display
}));
```

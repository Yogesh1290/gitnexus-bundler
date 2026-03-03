# The GitNexus Cloud Architecture Guide

Building applications for **GitNexus Cloud WebContainers** requires a deep understanding of browser-based OS constraints. While GitNexus can run entire enterprise repositories synchronously in the browser, developers must adapt their architecture to bypass physical WebAssembly (WASM) limitations.

This guide explains the "Why" and "How" of architecting the perfect GitNexus application.

---

## 🏗️ 1. The "Single Payload" SFX Architecture

When GitNexus boots your application in "Instant Load" mode, it analyzes `gitnexus.json` and downloads your `bundleUrl`.

To achieve 1-second Instant Boot speeds, GitNexus **does not** clone your entire repository or run `npm install`. Instead, it downloads a solitary `.cjs` (CommonJS executable) and runs `node gitnexus-bundle.cjs`.

### Why the Universal Bundler Exists
The Universal Bundler (`nexus-bundle`) automatically orchestrates this process for you:
1. It analyzes your `server.js` and physically embeds the Javascript of every single dependency `npm i cors express` into one giant file.
2. **The VFS SFX System:** It Base64 encodes your entire compiled frontend (e.g., `out/index.html`) and prepends a Javascript script onto the `.cjs` executable. Milliseconds prior to your Express server booting, the `.cjs` script rapidly extracts the frontend HTML files onto the GitNexus Virtual Hard Drive, re-materializing your application.

---

## 🛑 2. The Native C++ Barrier

Normal VPS servers (like AWS EC2) run physical Linux kernels. Native Node.js modules seamlessly compile C++ addons using `node-gyp` to interact with the physical disk or kernel drivers.

**GitNexus runs in a Browser sandbox. Browsers DO NOT support C++ Binaries.**

If your Node.js code executes a native C++ module, the WebContainer will freeze or critically crash.
**You must replace all C++ modules with pure JavaScript implementations.**

### ❌ What Will Crash
*   **Databases:** `sqlite3` natively relies on C++ binaries to connect to physical SQLite files on the hard drive.
*   **Authentication:** `bcrypt` natively compiles C++ for hashing speed.
*   **Security/Media:** `node-sass`, `canvas`, `sharp`, `puppeteer`.

### ✅ What Will Work
*   **Databases:** Off-load persistence to remote cloud databases via pure-JS drivers (MongoDB Atlas, Firebase, Supabase Cloud, OR neon-postgres).
*   **Authentication:** `bcryptjs` is the exact same API as `bcrypt` but written entirely in browser-safe JavaScript.
*   **Media:** Offload image processing to Cloudinary API.

---

## ⚡ 3. The WebAssembly (WASM) Fallback Limitations

Massive compilation tools like **Next.js Turbopack** and **esbuild** are written in Rust/Go for speed. When run on a normal terminal, they download a pre-compiled `.exe` or Linux binary.

When you run `npm run dev` inside a WebContainer, these libraries detect the unsupported environment and attempt to fallback to a purely WebAssembly (WASM) compiler.

### The Turbopack `createProject` Error
Because Vercel's WASM port of Turbopack is incomplete, running Next.js `next dev --turbo` inside a WebContainer will immediately trigger:
> `Error: turbo.createProject is not supported by the wasm bindings`

**Solution:** Always revert to the pure-JavaScript Webpack engine inside WebContainers. Remove `--turbo` from your `package.json` scripts.

---

## 🌐 4. Express Server Hardening for GitNexus Cloud

When securing your Express.js server, standard practices can break GitNexus Iframe previews. GitNexus dynamically renders your application in `https://*.local-corp.webcontainer-api.io`.

### 1. Iframe X-Frame-Options
If you use the `helmet` security library, it defaults to injecting `X-Frame-Options: SAMEORIGIN`. This instantly breaks GitNexus and displays a "Refused to Connect" error.

**Fix:**
```javascript
app.use(helmet({
    frameguard: false, // Allows GitNexus Iframe Embedding
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: false,
}));
```

### 2. Network Port Binding
WebContainer proxy networks strictly rely on IPv4 loopbacks. Modern Node.js sometimes silently defaults `app.listen(PORT)` to IPv6 (`::1`). A WebContainer proxy cannot reverse-proxy an IPv6 loopback, leading to a silent hang.

**Fix:** Always force Express to bind to IPv4 `0.0.0.0`:
```javascript
app.listen(PORT, '0.0.0.0', () => {
   console.log('Online');
});
```

---

## 📦 5. ESModules (`"type": "module"`) vs CommonJS

Modern JavaScript uses `import` and `export` (ESM). However, Node.js strict ESM loaders often struggle or fatally crash (`require is not defined in ES module scope`) when executing remote dynamic payloads inside WebContainers (like our `gitnexus-bundle`).

To engineer an impenetrable fail-safe deployment:
1. The Universal Bundler forcibly transpiles your ESM code down to pure `.cjs` (CommonJS).
2. The deployed executable is explicitly named `gitnexus-bundle.cjs`.
3. Due to the `.cjs` extension, the GitNexus WebContainer OS completely bypasses the strict `package.json` `"type": "module"` rules and natively boots the application flawlessly backward-compatible.

---

## 💎 6. Why GitNexus Architecture is Incredibly Powerful

Despite the WebAssembly and Native C++ limitations, adopting the GitNexus deployment philosophy unlocks **massive scale and zero-cost infrastructure**. 

### 1. Zero Server Costs (Client-Side Edge Computing)
Traditional deployments require you to pay AWS, Vercel, or Heroku for CPU time and RAM to run your Node.js servers and Next.js SSR processes.
In GitNexus, **the user's browser IS the server.** The WebContainer OS utilizes the client's local CPU and memory to boot the Express backend and serve the Next.js bundle. You can serve 1,000,000 concurrent users with **zero backend server costs**, because every single user spins up their own isolated server instance locally on their machine!

### 2. Impenetrable Security via Isolation
Because the backend API and frontend UX boot entirely within the user's local browser sandbox, there is no centralized monolith for hackers to DDoS or exploit. 

### 3. Ultimate Developer Experience
By decoupling your architecture into a static frontend + pure JavaScript API backend, your application becomes infinitely portable. It runs flawlessly on a $0 GitNexus deployment, but can instantly be re-hosted on any physical VPS without modification.

---

## 📁 7. Professional Directory Structures

To guarantee perfect compatibility with the `nexus-bundle` Universal CLI, structure your enterprise applications as follows.

### Option A: Next.js Full Stack (Enterprise Standard)
This structure completely separates the heavy React compiler from the lightweight Node.js API, guaranteeing GitNexus compatibility.

\`\`\`text
my-fullstack-app/
├── .github/
│   └── workflows/
│       └── gitnexus-release.yml    # ✨ AUTO-GENERATED: CI/CD Pipeline
├── src/
│   ├── app/                        # Next.js App Router (UI Pages)
│   │   ├── page.tsx
│   │   └── dashboard/page.tsx
│   └── components/                 # React UI Components
├── public/                         # Static images, fonts
├── server.js                       # ⚡ YOUR CUSTOM EXPRESS API BACKEND
├── package.json
├── next.config.ts                  # Must include "output: 'export'"
├── tsconfig.json
├── gitnexus.json                   # ✨ AUTO-GENERATED: Cloud Manifest
└── gitnexus-bundle.cjs             # ✨ AUTO-GENERATED: Executable Payload
\`\`\`

**The GitNexus Setup:**
1. In `next.config.ts`, ensure `output: 'export'` and `distDir: 'out'` are set.
2. In `server.js`, mount `/api` routes AND serve the `out/` directory.
3. Build command:
   \`nexus-bundle build -i server.js -f "npm run build" -s out\`
   *(This generates the `.github` folder, the `.json` manifest, and the `.cjs` executable.)*

---

### Option B: Pure Node.js API (Microservice)
If you are building a headless Express backend or WebSocket server without a heavy frontend.

\`\`\`text
my-node-api/
├── .github/
│   └── workflows/
│       └── gitnexus-release.yml    # ✨ AUTO-GENERATED: CI/CD Pipeline
├── src/
│   ├── controllers/                # Business Logic
│   ├── routes/                     # Express API Routes
│   ├── models/                     # Database Schemas
│   ├── utils/                      # Pure JS Helpers (NO C++ Addons)
│   └── index.js                    # ⚡ EXPRESS ENTRY POINT
├── package.json
├── tsconfig.json                   # (If using TypeScript)
├── gitnexus.json                   # ✨ AUTO-GENERATED: Cloud Manifest
└── gitnexus-bundle.cjs             # ✨ AUTO-GENERATED: Executable Payload
\`\`\`

**The GitNexus Setup:**
1. Build command:
   \`nexus-bundle build -i src/index.js\`
   *(This generates the `.github` folder, the `.json` manifest, and the `.cjs` executable.)*

# The GitNexus Cloud Architecture Guide

Building applications for **GitNexus Cloud WebContainers** requires a deep understanding of browser-based OS constraints. While GitNexus can run entire enterprise repositories synchronously in the browser, developers must adapt their architecture to bypass physical WebAssembly (WASM) limitations.

This guide explains the "Why" and "How" of architecting the perfect GitNexus application.

---

## 🏗️ 1. The "Single Payload" SFX Architecture

When GitNexus boots your application in "Instant Load" mode, it analyzes `gitnexus.json` and downloads your `bundleUrl`.

To achieve 1-second Instant Boot speeds, GitNexus **does not** clone your entire repository or run `npm install`. Instead, it downloads a solitary `.cjs` (CommonJS executable) and runs `node gitnexus-bundle.cjs`.

### Why the Universal Bundler Exists
The Universal Bundler (`nexus-bundle`) automatically orchestrates this process for you:
1. It analyzes your `server.js` and physically embeds the Javascript of every single dependency (`npm i cors express`) into one giant file.
2. **The VFS SFX System:** It Base64 encodes your entire compiled frontend (e.g., `out/index.html`) and prepends a Javascript script onto the `.cjs` executable. Milliseconds prior to your Express server booting, the `.cjs` script rapidly extracts the frontend HTML files onto the GitNexus Virtual Hard Drive, re-materializing your application.

---

## ☁️ 2. Hosting Your Bundle

After running the bundler locally, you get `gitnexus-bundle.cjs`. You must host this file somewhere public so GitNexus can download it via the `bundleUrl` in `gitnexus.json`.

### ✅ Recommended — Cloudflare Pages (Free, Truly Unlimited)

This is the **best and safest** way to host your GitNexus bundles.

| Feature | Value |
|---------|-------|
| Cost | **Free forever** |
| Bandwidth | **Truly unlimited** — no caps, no throttling |
| GitHub dependency | **Zero** |
| Max file size | 25 MB per file |

**Setup (5 minutes):**
```
1. Create a folder:
   gitnexus-cdn/
   ├── index.html      ← just an empty page
   └── your-app.cjs   ← your bundle

2. Go to pages.cloudflare.com
   → Create project → Upload assets (NOT "Connect to Git")
   → Drag & drop the folder → Deploy

3. Your bundle URL: https://your-project.pages.dev/your-app.cjs

4. Update gitnexus.json:
   { "bundleUrl": "https://your-project.pages.dev/your-app.cjs" }
```

**To update your bundle in future:** Go to Cloudflare Pages → Create new deployment → upload new folder. The URL stays the same.

---

### ⚠️ Optional — GitHub Releases (Manual Only)

You can manually upload your `.cjs` to a GitHub Release. Works for early testing but has limits.

> **⚠️ Important constraints:**
> - **1 GB/month** bandwidth on free GitHub accounts (~500 downloads of a 2 MB bundle)
> - Must be **manually** uploaded via the GitHub website — never automated
> - Use **versioned tags** like `v1.0.0` — never a static `latest` tag
> - Switch to Cloudflare Pages before you scale

---

## 🛑 3. The Native C++ Barrier

Normal VPS servers (like AWS EC2) run physical Linux kernels. Native Node.js modules seamlessly compile C++ addons using `node-gyp` to interact with the physical disk or kernel drivers.

**GitNexus runs in a Browser sandbox. Browsers DO NOT support C++ Binaries.**

If your Node.js code executes a native C++ module, the WebContainer will freeze or critically crash.
**You must replace all C++ modules with pure JavaScript implementations.**

### ❌ What Will Crash
*   **Databases:** `sqlite3` natively relies on C++ binaries.
*   **Authentication:** `bcrypt` natively compiles C++ for hashing speed.
*   **Security/Media:** `node-sass`, `canvas`, `sharp`, `puppeteer`.

### ✅ What Will Work
*   **Databases:** MongoDB Atlas, Firebase, Supabase Cloud, Neon (PostgreSQL) — all via pure-JS drivers.
*   **Authentication:** `bcryptjs` — same API as `bcrypt`, pure JavaScript.
*   **Media:** Cloudinary API.

---

## ⚡ 4. The WebAssembly (WASM) Fallback Limitations

Massive compilation tools like **Next.js Turbopack** and **esbuild** are written in Rust/Go for speed. When run on a normal terminal, they download a pre-compiled binary.

When inside a WebContainer, these detect the unsupported environment and attempt to fall back to a purely WebAssembly compiler.

### The Turbopack `createProject` Error
Because Vercel's WASM port of Turbopack is incomplete, running Next.js `next dev --turbo` inside a WebContainer will trigger:
> `Error: turbo.createProject is not supported by the wasm bindings`

**Solution:** Always use the pure-JavaScript Webpack engine inside WebContainers. Remove `--turbo` from your `package.json` scripts.

---

## 🌐 5. Express Server Hardening for GitNexus Cloud

### 1. Iframe X-Frame-Options
If you use the `helmet` security library, it defaults to `X-Frame-Options: SAMEORIGIN`. This breaks GitNexus iframe previews.

**Fix:**
```javascript
app.use(helmet({
    frameguard: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: false,
}));
```

### 2. Network Port Binding
Always force Express to bind to IPv4 `0.0.0.0`:
```javascript
app.listen(PORT, '0.0.0.0', () => {
   console.log('Online');
});
```

---

## 📦 6. ESModules vs CommonJS

GitNexus bundles are strictly `.cjs` files. The Universal Bundler handles ESM → CommonJS transpilation automatically. You never need to configure this manually.

---

## 💎 7. Why GitNexus Architecture is Incredibly Powerful

### Zero Server Costs (Client-Side Edge Computing)
In GitNexus, **the user's browser IS the server.** The WebContainer OS utilizes the client's local CPU and memory to boot the Express backend and serve the bundle. You can serve millions of concurrent users with **zero backend server costs**, because every user spins up their own isolated server instance on their own machine.

### Impenetrable Security via Isolation
Because the backend API and frontend boot entirely within the user's local browser sandbox, there is no centralized monolith for hackers to DDoS or exploit.

### Ultimate Portability
By decoupling into a static frontend + pure JavaScript API backend, your application runs flawlessly on a $0 GitNexus deployment, but can instantly be re-hosted on any physical VPS without modification.

---

## 📁 8. Professional Directory Structures

### Option A: Next.js Full Stack (Enterprise Standard)

```text
my-fullstack-app/
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
└── gitnexus-bundle.cjs             # ✨ LOCAL BUILD OUTPUT (add to .gitignore)
```

**Build command:**
```bash
nexus-bundle build -i server.js -f "npm run build" -s out
```

**Then host `gitnexus-bundle.cjs` on Cloudflare Pages and update `bundleUrl` in `gitnexus.json`.**

---

### Option B: Pure Node.js API (Microservice)

```text
my-node-api/
├── src/
│   ├── controllers/                # Business Logic
│   ├── routes/                     # Express API Routes
│   ├── models/                     # Database Schemas
│   ├── utils/                      # Pure JS Helpers (NO C++ Addons)
│   └── index.js                    # ⚡ EXPRESS ENTRY POINT
├── package.json
├── tsconfig.json
├── gitnexus.json                   # ✨ AUTO-GENERATED: Cloud Manifest
└── gitnexus-bundle.cjs             # ✨ LOCAL BUILD OUTPUT (add to .gitignore)
```

**Build command:**
```bash
nexus-bundle build -i src/index.js
```

---

## 📘 9. Native TypeScript Support (Zero-Config)

Whether you write in **JavaScript** or **TypeScript**, `nexus-bundle` compiles your code flawlessly without requiring you to compile it yourself first.

```bash
nexus-bundle build -i src/server.ts
```

**What happens underneath:**
1. Types are instantly stripped out.
2. The TypeScript is transpiled down to browser-safe CommonJS.
3. No `tsconfig.json` required for the build to succeed.

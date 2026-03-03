# GitNexus Universal Bundler

![NPM Version](https://img.shields.io/npm/v/gitnexus-bundler) ![License](https://img.shields.io/npm/l/gitnexus-bundler)

*Tags: `#gitnexus` `#webcontainer` `#serverless` `#nextjs` `#react` `#nodejs` `#bundler`*

A **Command Line Interface (CLI) tool** that compiles any Node.js full-stack repository into a self-contained **GitNexus Cloud Executable** (`.cjs` bundle).

This tool runs **locally on your machine** and produces two output files:
- `gitnexus-bundle.cjs` — your self-contained app executable
- `gitnexus.json` — a manifest pointing to where you host your bundle

> 📚 **[Read the Complete GitNexus Cloud Architecture Guide Here](docs/nexus-guide.md)**

---

## 🚀 Installation & Usage

### Option A — Use with npx (No install needed) ✅ Recommended
```bash
# Backend only (Express API)
npx gitnexus-bundler build -i src/server.js

# Full-stack (Next.js + Express)
npx gitnexus-bundler build -i server.js -f "npm run build" -s out
```

### Option B — Install globally first
```bash
npm install -g gitnexus-bundler

# Then run from anywhere:
gitnexus-bundle build -i server.js -f "npm run build" -s out
```

> ⚠️ **Note:** If you run `gitnexus-bundle` without installing globally first, use `npx gitnexus-bundler build ...` instead.

---

## CLI Options

| Option | Description | Required |
|--------|-------------|----------|
| `-i, --input <path>` | Entry point file | ✅ Yes |
| `-o, --output <path>` | Output file name (default: `gitnexus-bundle.cjs`) | No |
| `-f, --frontend <cmd>` | Frontend build command to run first | No |
| `-s, --static <dir>` | Frontend static output directory to embed into the bundle | No |

---

## ☁️ Hosting Your Bundle (Recommended)

After bundling, host `gitnexus-bundle.cjs` somewhere public so GitNexus can download it.

### ✅ BEST — Cloudflare Pages (Free, Truly Unlimited)

```
1. Create a folder:
   gitnexus-cdn/
   ├── index.html          ← required (just an empty page)
   └── your-app.cjs        ← your bundle

2. Go to pages.cloudflare.com → Create project → Upload assets
   (Choose "Upload assets" — do NOT connect to GitHub)

3. Drag & drop folder → Deploy
   URL: https://your-project.pages.dev/your-app.cjs

4. Update gitnexus.json:
   { "bundleUrl": "https://your-project.pages.dev/your-app.cjs" }
```

| Feature | Value |
|---------|-------|
| Cost | **Free forever** |
| Bandwidth | **Unlimited** |
| GitHub risk | **Zero** |

---

### ⚠️ OPTIONAL — GitHub Releases (Manual Only)

Upload your `.cjs` manually to a GitHub Release. Works for testing but has limits.

> **⚠️ Limitations:**
> - 1 GB/month bandwidth on free accounts
> - Must be **manually** uploaded — never automated
> - Use versioned tags like `v1.0.0` — **never `latest`**

---

## How It Works

1. Runs your optional frontend build (`-f`)
2. Compiles your Node.js server via `esbuild` into a single `.cjs` file
3. Embeds your static frontend as Base64 inside the bundle (`-s`)
4. Generates `gitnexus.json` with a Cloudflare Pages placeholder URL

---

## 🏗️ Architectural Guidelines

### 1. The Native C++ Barrier (CRITICAL)
- ❌ **DO NOT USE**: `bcrypt`, `node-sass`, `canvas`, `sharp`, `sqlite3`, `puppeteer`
- ✅ **USE INSTEAD**: `bcryptjs`, `sass`, Cloudinary APIs, `pg`

### 2. Database Support
- ❌ Local daemons (require C++)
- ✅ Cloud databases: MongoDB Atlas, Supabase, Neon, Firebase

### 3. Server Port
```javascript
app.listen(8080, '0.0.0.0', () => console.log('Ready'));
```

### 4. Iframe Security (Helmet / CSP)
```javascript
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: false,
    frameguard: false
}));
```

### 5. TypeScript Support
Zero config — just point at your `.ts` file:
```bash
npx gitnexus-bundler build -i src/server.ts
```

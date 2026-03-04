# gitnexus-bundler — Bundling Setup Guide

This guide documents the exact patterns required to bundle any Node.js or React app for GitNexus WebContainer. All patterns here are verified working from real projects.

---

## 1. The Universal serve.js Template

This is the only `serve.js` pattern that works reliably in WebContainer. Copy it exactly.

```js
import express from 'express';
import helmet from 'helmet';
import { join } from 'path';

const app = express();

// Required: disables all security headers that block iframe embedding in GitNexus
app.use(helmet({
  contentSecurityPolicy:     false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false,
  crossOriginOpenerPolicy:   false,
  frameguard:                false,
}));

// Serve your pre-built frontend from a static output folder (e.g. dist/ or out/)
const staticPath = join(process.cwd(), 'dist'); // change 'dist' to your output folder
app.use(express.static(staticPath, { extensions: ['html'] }));

// SPA fallback — MUST use app.use() with no route, NOT app.get('*') or app.get('(.*)')
// Express 5.x path-to-regexp breaks with wildcard routes
app.use((req, res) => {
  res.sendFile(join(staticPath, 'index.html'));
});

// MUST be port 8080 — WebContainer exposes this port to the browser
app.listen(8080, '0.0.0.0', () => {
  console.log('App running at http://localhost:8080');
});
```

### Why these rules matter

| Rule | Reason |
|------|--------|
| `helmet` with all policies `false` | GitNexus loads your app in an iframe — CSP/COOP/COEP headers break iframe embedding |
| `process.cwd()` not `import.meta.url` | `import.meta.url` is ESM-only; gitnexus-bundler outputs CJS where it is empty |
| `app.use()` not `app.get('*')` | Express 5.x + path-to-regexp v8 throws `TypeError: Missing parameter name` for `*` and `(.*)` wildcards |
| Port `8080` not `3000` | WebContainer exposes port 8080 to the outer browser frame |

---

## 2. CSS in WebContainer — Do Not Use CDN Scripts

**Never load CSS via CDN script tags in WebContainer.** External CDN requests for styling frameworks get blocked or silently fail inside the embedded iframe.

```html
<!-- ❌ BROKEN in WebContainer — Tailwind CDN script is blocked -->
<script src="https://cdn.tailwindcss.com"></script>

<!-- ❌ BROKEN — Google Fonts CDN also fails -->
<link href="https://fonts.googleapis.com/css2?family=Inter..." rel="stylesheet">
```

**Instead: compile CSS at build time** and embed it into your static output folder.

### Tailwind CSS v4 Setup (Recommended)

Install:
```bash
npm install -D tailwindcss @tailwindcss/postcss autoprefixer
```

Create `postcss.config.mjs` (must be `.mjs` not `.js`):
```js
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
export default config;
```

Create `index.css`:
```css
@import "tailwindcss";
```

Import in your entry file (`index.tsx` / `main.tsx` / `index.js`):
```ts
import './index.css';
```

> ⚠️ **Do not use `postcss.config.js`** — Vite ESM projects require `.mjs` for the PostCSS config. A `.js` file in an ESM project picks up the wrong format.

> ⚠️ **Do not use `tailwindcss` directly as a plugin** — in Tailwind v4, the PostCSS plugin moved to `@tailwindcss/postcss`. Using `tailwindcss: {}` in your PostCSS config throws an error.

### Fallback: System Fonts

If you don't use Tailwind, ensure fonts don't reference Google Fonts:
```css
body { font-family: system-ui, -apple-system, sans-serif; }
```

---

## 3. Bundling a React SPA (No Server)

A pure React/Vite app with no backend still benefits from bundling — in a raw repo, WebContainer must run `npm install` (30–90s) and `vite dev` (slow, fragile). With bundling, it boots in under 5 seconds.

**Pattern:**
1. Build the frontend: `npm run build` → outputs `dist/`
2. Create `serve.js` (from the template above, pointing at `dist/`)
3. Bundle: `npx gitnexus-bundler build -i serve.js -s dist`

The bundler embeds your `dist/` files directly into the `.cjs` — no npm install, no Vite, no compilation at runtime.

---

## 4. Bundling a Full-Stack App (Next.js / Express + React)

For apps with both a server and a frontend:

```bash
npx gitnexus-bundler build -i server.js -f "npm run build" -s out
```

| Flag | Purpose |
|------|---------|
| `-i server.js` | Your Express entry point |
| `-f "npm run build"` | Frontend build command (runs before bundling) |
| `-s out` | Static output folder to embed (Next.js outputs to `out/`, Vite to `dist/`) |

Your `server.js` must serve the static folder and handle SPA routing — use the template in section 1.

---

## 5. The Build → Bundle → Deploy Flow

```
Step 1: Build
npm run build                          # Compiles frontend → dist/ (or out/)

Step 2: Bundle
npx gitnexus-bundler build -i serve.js -s dist
# Outputs: gitnexus-bundle.cjs + gitnexus.json

Step 3: Prepare CDN folder
mkdir cdn-upload
cp gitnexus-bundle.cjs cdn-upload/your-app.cjs
echo "<html><body></body></html>" > cdn-upload/index.html

Step 4: Host on Cloudflare Pages
# pages.cloudflare.com → Create project → Upload assets (NOT GitHub connect)
# Drag and drop cdn-upload/ folder → Deploy
# URL: https://your-project.pages.dev/your-app.cjs

Step 5: Update gitnexus.json
{ "bundleUrl": "https://your-project.pages.dev/your-app.cjs" }
```

---

## 6. What to Add to .gitignore

```gitignore
# GitNexus bundler output — upload to CDN, never commit
gitnexus-bundle.cjs
cdn-upload/
factchecker-cdn/
```

---

## 7. Common Errors and Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `TypeError: Missing parameter name at index 1: *` | `app.get('*', ...)` — Express 5.x wildcard broken | Use `app.use((req, res) => ...)` with no route |
| `TypeError: Missing parameter name at index 3: (.*)` | `app.get('(.*)', ...)` — also broken in path-to-regexp v8 | Same fix: `app.use()` |
| `import.meta is not available with cjs output` | `import.meta.url` in serve.js | Replace with `process.cwd()` |
| CSS not loading in WebContainer | Tailwind CDN script blocked in iframe | Compile CSS at build time via PostCSS |
| `tailwindcss directly as a PostCSS plugin` error | Tailwind v4 moved plugin to `@tailwindcss/postcss` | Install `@tailwindcss/postcss`, use `.mjs` config |
| `404` on Cloudflare for `.cjs` file | File named wrong or not uploaded | Check `bundleUrl` in `gitnexus.json` matches exact filename |
| App boots but shows unstyled HTML | External font/CSS CDN blocked in WebContainer | Use `system-ui` fonts, compile all CSS into bundle |

---

## 8. Dependencies Checklist

Ensure these are in your project before bundling:

```bash
# Server
npm install express helmet

# CSS (if using Tailwind)
npm install -D tailwindcss @tailwindcss/postcss autoprefixer

# Build tool (if React/Vite)
npm install -D vite @vitejs/plugin-react typescript
```

WebContainer-safe packages: Express, Helmet, CORS, node-fetch, axios, OpenAI SDK, Anthropic SDK, bcryptjs, lowdb, nedb, marked, zod.

Incompatible packages: bcrypt, sqlite3, sharp, canvas, node-sass, puppeteer, nodemon (anything with native `.node` binaries).

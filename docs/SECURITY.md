# Security Policy & Developer Responsibilities

This document applies to **anyone who creates a bundle using `gitnexus-bundler`** and submits it to the GitNexus Marketplace or distributes it publicly.

---

## You Are the Author. You Are Responsible.

When you bundle your app with `gitnexus-bundler`, the resulting `.cjs` file is **your code**. It runs in another person's browser. That person trusts that your bundle does what your README says it does.

**The GitNexus Marketplace maintainers do not audit bundle contents at the binary level.** We check the source repo — not the compiled `.cjs`. This means the responsibility for what your bundle does at runtime lies entirely with you.

---

## What Is Strictly Prohibited

Submitting or distributing a bundle that does any of the following is a permanent ban from the marketplace and may be reported to GitHub, npm, and relevant authorities:

### 🚫 Data collection without explicit consent
- Collecting browser fingerprints, IP addresses, screen data, or any personal information
- Sending user inputs (form data, API keys, file contents) to any third-party server without the user explicitly knowing and consenting
- Embedding telemetry, analytics, or tracking pixels that the user is not informed of

### 🚫 Credential and secret theft
- Capturing API keys, tokens, passwords, or secrets that the user types into your app and transmitting them anywhere
- Logging environment variables or secrets to remote servers
- Storing user credentials in any external service without consent

### 🚫 Malicious code and backdoors
- Embedding code that executes differently than what the source repo shows (i.e., the bundle must faithfully represent the source)
- Time-delayed payloads — code that behaves normally for a period then activates malicious behavior
- Cryptocurrency miners, ransomware components, or denial-of-service scripts
- Code that attempts to escape the WebContainer sandbox

### 🚫 Impersonation and phishing
- Bundles designed to look like official tools (GitHub, Google, Stripe, etc.) but are not
- Login screens that capture credentials and send them to attacker-controlled servers
- Any UI designed to deceive the user about what the app actually does

### 🚫 Illegal content
- Distributing, processing, or facilitating access to content that is illegal in the majority of jurisdictions
- Tools designed to facilitate unauthorized access to systems (hacking tools, scrapers designed to bypass ToS)
- Any code that violates the GitHub Acceptable Use Policy

---

## What You Must Do

### ✅ Your bundle must match your source
The code in your public GitHub repository must be the actual source of your bundle. Users and maintainers must be able to verify what your bundle does by reading your repo.

```bash
# Build from your public source — don't add hidden steps
gitnexus-bundler build -i server.js -s out
```

If your build pipeline has steps that inject code not in your repo, that is a violation.

### ✅ Disclose external API calls
If your app sends any data to an external server (OpenAI, your own backend, analytics, etc.), your README must clearly state:
- What data is sent
- Where it goes
- Why

### ✅ Never handle secrets server-side without user awareness
If your app uses an API key the user provides (e.g., OpenAI key), it must be:
- Used only for the API calls the user explicitly initiates
- Never stored, logged, or transmitted anywhere other than the intended API
- Clearly communicated to the user what happens with their key

### ✅ Keep your bundle reproducible
Your `gitnexus.json` must point to a bundle that can be traced back to a specific commit in your repo. Rotating bundle URLs without updating the source is suspicious and will cause removal.

---

## Marketplace Review Process

All submissions are reviewed manually before listing. Reviewers check:

1. Source repo is public and contains plausible source for the bundled app
2. README describes what the app does and what external services it contacts
3. No obvious red flags in the source (obfuscated code, unexplained `fetch` calls to unknown domains, etc.)

**We do not decompile `.cjs` files for every submission.** Community reporting is our secondary defense. If you see a listed app behaving suspiciously, report it by opening an issue on the marketplace repo.

---

## Disclaimer — No Warranty

> THE GITNEXUS MARKETPLACE AND GITNEXUS-BUNDLER ARE PROVIDED AS-IS. THE MAINTAINERS MAKE NO REPRESENTATIONS OR WARRANTIES ABOUT THE SAFETY, SECURITY, OR FITNESS FOR PURPOSE OF ANY THIRD-PARTY BUNDLE LISTED IN THE MARKETPLACE.
>
> BY RUNNING ANY BUNDLE FROM THE MARKETPLACE, USERS ACCEPT THAT THEY ARE RUNNING THIRD-PARTY CODE IN THEIR BROWSER. THE MARKETPLACE MAINTAINERS ARE NOT LIABLE FOR ANY DAMAGES ARISING FROM THE USE OF THIRD-PARTY BUNDLES.
>
> BUNDLE AUTHORS ARE SOLELY RESPONSIBLE FOR THE CONTENT AND BEHAVIOR OF THEIR BUNDLES.

---

## Reporting a Malicious Bundle

If you discover a bundle that violates this policy:

1. **Do not run it again**
2. Open an issue on [GitNexus-Marketplace/gitnexus-marketplace](https://github.com/GitNexus-Marketplace/gitnexus-marketplace) with the title: `[SECURITY] Malicious bundle report: <app-name>`
3. Describe the behavior you observed
4. The bundle will be removed within 24 hours of a confirmed report

For sensitive disclosures that shouldn't be public, contact the maintainer directly through GitHub.

---

## For Marketplace Maintainers — Red Flags Checklist

When reviewing a PR submission, flag it if:

- [ ] Source repo is private, deleted, or has no meaningful source code
- [ ] `bundleUrl` domain does not match the developer's known accounts
- [ ] README does not describe what external services the app contacts
- [ ] Source contains obfuscated JavaScript (`eval`, `atob`, hex-encoded strings)
- [ ] Source contains `fetch` calls to domains unrelated to the stated app purpose
- [ ] App description is vague ("utility tool", "helper") with no specific feature description
- [ ] Bundle file size is wildly disproportionate to what the source code would suggest

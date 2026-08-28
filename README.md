<p align="center">
  <img src="assets/social-preview.png" alt="envguard banner" width="100%" />
</p>

<h1 align="center">🛡️ envguard</h1>

<p align="center">
  <strong>Zero-Config Git Secret Leaks Detector, Semantic Type Validator &amp; <code>.env.example</code> Synchronizer</strong>
</p>

<p align="center">
  <a href="https://github.com/latryee/envguard/actions"><img src="https://img.shields.io/github/actions/workflow/status/latryee/envguard/ci.yml?branch=main&style=flat-square" alt="Build Status" /></a>
  <a href="https://github.com/latryee/envguard/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-green.svg?style=flat-square" alt="License" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/language-TypeScript-blue.svg?style=flat-square" alt="TypeScript" /></a>
  <a href="https://vitest.dev/"><img src="https://img.shields.io/badge/tests-76%2F76%20passing-brightgreen.svg?style=flat-square" alt="Tests" /></a>
  <a href="#-competitive-matrix"><img src="https://img.shields.io/badge/zero-cloud%20dependency-emerald.svg?style=flat-square" alt="Zero Cloud" /></a>
</p>

<p align="center">
  <img src="assets/demo.gif" alt="envguard terminal demo" width="100%" />
</p>

<br />

## ❓ Why Another Environment Tool?

Managing environment variables in modern software stacks typically involves trade-offs between heavy SaaS platforms and fragmented scripts:
- **Cloud Secrets Managers** (*Doppler, HashiCorp Vault, AWS Secrets Manager*) are essential for production infrastructure, but introduce cloud latency, account provisioning overhead, and internet dependencies during local development.
- **Git Secret Scanners** (*Gitleaks, Trufflehog*) scan git commit history for credential regexes, but do not detect schema drift, missing variables, or runtime type mismatches (such as `PORT` set to a string or out of range).
- **Runtime Validators** (*Zod, Envalid, t3-env*) validate process variables after application boot, are coupled to specific application frameworks, and do not keep `.env.example` templates synchronized across teams.

> **`envguard` operates at the developer workflow boundary:** It inspects your actual code references across multiple languages, validates semantic types, detects secret leaks using Shannon entropy and curated signatures, and keeps `.env.example` continuously up-to-date with safe placeholders — **100% offline, in milliseconds, with zero configuration.**

---

## 🥊 Competitive Matrix

| Feature | `envguard` | `dotenv-vault` | `Doppler` | `Gitleaks` | `t3-env / Zod` |
|:---|:---:|:---:|:---:|:---:|:---:|
| **Zero Cloud / 100% Offline** | ✅ **Yes** | ❌ Cloud login | ❌ Cloud SaaS | ✅ Yes | ✅ Yes |
| **Zero-Config Setup (`npx`)** | ✅ **Instant** | ❌ Vault login | ❌ CLI auth | ⚠️ Config needed | ❌ In-code schema |
| **`.env.example` Auto-Sync & Safe Masking** | ✅ **Automated** | ❌ No | ❌ No | ❌ No | ❌ No |
| **Multi-Language Reference Scanner** | ✅ **JS/TS/Py/Go/Rust/PHP/Ruby** | ❌ No | ❌ No | ❌ Git regex only | ❌ TS/JS only |
| **Semantic Type Validation (Port, URL, IP, JSON)** | ✅ **Built-in** | ❌ Strings only | ❌ Strings only | ❌ No | ✅ In-code |
| **Shannon Entropy Secret Detection** | ✅ **Built-in** | ❌ No | ❌ No | ✅ Built-in | ❌ No |
| **1-Click Git Pre-Commit Hook** | ✅ **Built-in** | ❌ No | ❌ No | ⚠️ Custom setup | ❌ No |
| **Ambient TypeScript Type Gen (`env.d.ts`)** | ✅ **Built-in** | ❌ No | ❌ No | ❌ No | ⚠️ Manual schema |

---

## 🎯 The Core Problems It Solves

When developers collaborate or clone a repository:
1. **`.env.example` is frequently outdated:** Variables added over months remain undocumented, causing broken local onboarding and missing runtime configs.
2. **Type mismatches fail at runtime:** `PORT` is entered as text or out of range (1–65535), boolean flags are misspelled, or database connection strings are malformed.
3. **Accidental secret leaks:** Real API keys (OpenAI, Anthropic, Stripe, AWS, GitHub PATs, private keys) accidentally get committed directly inside `.env`, `.env.example`, codebase source files, or Git staged files.


---

## ⚡️ Quickstart

Run instantly with zero configuration in any repository:

```bash
# Run full scan and drift check
npx @latryee/envguard
```

### Install Globally or as a Dev Dependency
```bash
# Global CLI
npm install -g @latryee/envguard

# Or locally in your project
npm install -D @latryee/envguard
```

---

## 🪝 1-Click Git Pre-Commit Hook

Intercept secret leaks, type mismatches, and undocumented environment variables before they are committed:

```bash
npx envguard hook install
```

*Supports both native Git hooks (`.git/hooks/pre-commit`, worktrees, submodules) and Husky (`.husky/pre-commit`).*

<p align="center">
  <img src="assets/hook-demo.png" alt="envguard git hook interception demo" width="100%" />
</p>

---

## 🛠️ CLI Commands & Workflows

### `envguard check` (Default)
Performs a complete scan across project source code, `.env`, and `.env.example`:
```bash
# Standard check
npx envguard

# Strict mode for CI (fails on warnings too)
npx envguard --strict

# Check only Git staged files (fast pre-commit mode)
npx envguard --staged

# Formatted output for CI/CD pipelines
npx envguard --format github
npx envguard --format json
```

### `envguard sync` (or `envguard fix`)
Automatically creates or updates `.env.example` based on project source code and `.env`, masking sensitive data into safe placeholders:
```bash
# Update .env.example with missing variables
npx envguard sync

# Prune obsolete/stale variables no longer referenced anywhere:
npx envguard sync --prune
```

### `envguard gen-types` (or `envguard types`)
Generates ambient TypeScript definitions (`env.d.ts`) for autocomplete and compile-time type safety:
```bash
npx envguard gen-types
```
*Generated `env.d.ts`:*
```ts
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DATABASE_URL: string;
      ENABLE_METRICS?: 'true' | 'false' | '1' | '0';
      NODE_ENV: 'development' | 'production';
      PORT: `${number}` | string;
    }
  }

  interface ImportMetaEnv {
    DATABASE_URL: string;
    ENABLE_METRICS?: 'true' | 'false' | '1' | '0';
    NODE_ENV: 'development' | 'production';
    PORT: `${number}` | string;
  }
}

export {};
```

### `envguard init`
One-click onboarding that configures templates, syncs variables, generates type definitions, and installs git pre-commit hooks:
```bash
npx envguard init
```

---

## 🏷️ Inline Schema Annotations

Annotate `.env.example` comments with schemas that `envguard` validates:

```dotenv
# @type port @required @default 3000
PORT=3000

# @type enum(development, staging, production) @description App environment
NODE_ENV=development

# @type url @description PostgreSQL connection string
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mydb

# @type boolean @optional
ENABLE_FEATURE_FLAGS=false

# @type email
ADMIN_EMAIL=admin@example.com

# @type pattern(^[a-z0-9-]+$) @description App namespace identifier
APP_SLUG=my-app-service
```

### Supported Annotation Tags:
| Tag | Description | Example |
|---|---|---|
| `@type <type>` | Semantic type (`port`, `boolean`, `url`, `email`, `ip`, `json`, `uuid`, `base64`, `integer`, `number`) | `@type port`, `@type url` |
| `@type enum(...)` | Strict enum values | `@type enum(dev, staging, prod)` |
| `@required` | Must be present in `.env` (default behavior unless `@optional`) | `@required` |
| `@optional` | Optional in `.env` | `@optional` |
| `@default <val>` | Default fallback value | `@default 3000` |
| `@description <text>` | Documentation & IDE tooltip | `@description App port` |
| `@pattern <regex>` | Custom regular expression validation | `@pattern ^v\d+\.\d+$` |

---

## ⚙️ Configuration (Optional)

Create `envguard.config.json` or add an `"envguard"` section to `package.json`:

```json
{
  "envFile": ".env",
  "exampleFile": ".env.example",
  "typesFile": "src/types/env.d.ts",
  "strict": false,
  "secretDetection": {
    "entropyThreshold": 4.3,
    "minLength": 20,
    "allowHighEntropy": false
  },
  "ignoredKeys": ["MY_OPTIONAL_LOCAL_VAR"],
  "ignoreGlobs": ["tests/fixtures/**"]
}
```

---

## 🚀 CI/CD Integration (GitHub Actions)

Add this workflow to `.github/workflows/envguard.yml`:

```yaml
name: Environment Guard CI

on: [push, pull_request]

jobs:
  validate-env:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Run EnvGuard
        run: npx @latryee/envguard --format github --strict
```

---

## 🧪 Architecture & Performance

```
┌────────────────────────────────────────────────────────┐
│                   envguard Core                        │
│                                                        │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────┐ │
│  │  EnvParser   │  │  CodeScanner  │  │ SecretEngine │ │
│  │  (AST-based) │  │(Multi-lang AST│  │(Entropy/Rules│ │
│  └──────┬───────┘  └───────┬───────┘  └──────┬───────┘ │
│         │                  │                 │         │
│         └──────────┐       │       ┌─────────┘         │
│                    ▼       ▼       ▼                   │
│             ┌─────────────────────────────┐            │
│             │      EnvDiffer Engine       │            │
│             │ (Missing/Mismatch/Drift/Leak│            │
│             └──────────────┬──────────────┘            │
│                            │                           │
│      ┌─────────────────────┼────────────────────┐      │
│      ▼                     ▼                    ▼      │
│ ┌───────────────┐   ┌───────────────┐   ┌────────────┐ │
│ │  Terminal UI  │   │  SyncEngine   │   │ TS GenType │ │
│ └───────────────┘   └───────────────┘   └────────────┘ │
└────────────────────────────────────────────────────────┘
```

### Reproducible Benchmarks

Measured on Node.js v22 across realistic codebase fixtures (`npm run bench`):

| Workload Tier | Source Files | Variables / References | Average Execution Time |
|:---|:---:|:---:|:---:|
| **Small Project** | 25 files | 100 references | **~13 ms** |
| **Medium Project** | 250 files | 1,000 references | **~98 ms** |
| **Large Project** | 1,000 files | 4,000 references | **~380 ms** |

- **Zero Heavy Native Dependencies**: Pure TypeScript / Node.js ESM.
- **Thorough Test Suite**: 56 unit & integration tests across AST parsing, language scanning, type inference, entropy detection, and CLI execution.

---

## 📄 License

MIT © [latryee](https://github.com/latryee)

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
  <a href="https://vitest.dev/"><img src="https://img.shields.io/badge/tests-100%25%20passing-brightgreen.svg?style=flat-square" alt="Tests" /></a>
  <a href="#-competitive-matrix"><img src="https://img.shields.io/badge/zero-cloud%20dependency-emerald.svg?style=flat-square" alt="Zero Cloud" /></a>
</p>

<p align="center">
  <img src="assets/demo.png" alt="envguard terminal demo" width="100%" />
</p>

<br />

## ❓ Why Another Environment Tool?

Existing tools force developers to choose between heavy SaaS lock-in or fragmented scripts:
- **Cloud Secrets Managers** (*Doppler, 1Password, HashiCorp Vault*) are powerful for production infrastructure, but add cloud latency, account provisioning overhead, and internet dependencies for simple local development.
- **Git Secret Scanners** (*Gitleaks, Trufflehog*) detect regexes in commit history, but are **100% blind to schema drift, missing variables, or runtime type mismatches** (e.g. `PORT` entered as text or out of range).
- **Runtime Validators** (*Zod, Envalid, t3-env*) only protect your application *after* boot, are tied to specific web frameworks, and do not keep `.env.example` templates synchronized for your team.

> **`envguard` operates at the developer workflow boundary:** It inspects your actual code references across any language, validates semantic types, blocks secret leaks with Shannon entropy, and keeps `.env.example` continuously up-to-date with safe placeholders — **100% offline, in milliseconds, with zero configuration.**

---

## 🥊 Competitive Matrix

| Feature | `envguard` | `dotenv-vault` | `Doppler` | `Gitleaks` | `t3-env / Zod` |
|:---|:---:|:---:|:---:|:---:|:---:|
| **Zero Cloud / 100% Offline** | ✅ **Yes** | ❌ Requires Cloud | ❌ Cloud SaaS | ✅ Yes | ✅ Yes |
| **Zero-Config Setup (`npx`)** | ✅ **Instant** | ❌ Vault login | ❌ CLI auth | ⚠️ Config needed | ❌ In-code schema |
| **`.env.example` Auto-Sync & Masking** | ✅ **Automated** | ❌ No | ❌ No | ❌ No | ❌ No |
| **Multi-Language AST Reference Scanner** | ✅ **JS/TS/Py/Go/Rust** | ❌ No | ❌ No | ❌ Git regex only | ❌ TS/JS only |
| **Semantic Type Validation (Port, URL, IP)** | ✅ **Built-in** | ❌ Strings only | ❌ Strings only | ❌ No | ✅ In-code |
| **Shannon Entropy Secret Detection** | ✅ **Built-in** | ❌ No | ❌ No | ✅ Built-in | ❌ No |
| **1-Click Git Pre-Commit Hook** | ✅ **Built-in** | ❌ No | ❌ No | ⚠️ Custom setup | ❌ No |
| **Ambient TypeScript Type Gen (`env.d.ts`)** | ✅ **Built-in** | ❌ No | ❌ No | ❌ No | ⚠️ Manual schema |

---

## 🎯 The Core Problems It Solves

When a new engineer joins a team or clones a repository:
1. **`.env.example` is hopelessly outdated:** Variables added over months are undocumented, leading to broken onboarding and runtime crashes.
2. **Type mismatches explode in production:** `PORT` is entered as a string or out of range, boolean flags are misspelled, database connection strings are malformed.
3. **Catastrophic secret leaks:** Real API keys (OpenAI, Stripe, AWS, GitHub PATs) accidentally get committed to `.env.example` or Git staged files.

---

## ⚡️ Quickstart

Run instantly with zero configuration in any repository:

```bash
# Run full scan and drift check
npx @latrye/envguard
```

### Install Globally or as a Dev Dependency
```bash
# Global CLI
npm install -g @latrye/envguard

# Or locally in your project
npm install -D @latrye/envguard
```

---

## 🪝 1-Click Git Pre-Commit Hook

Never accidentally push real secrets or missing variables to GitHub again:

```bash
npx envguard hook install
```

<p align="center">
  <img src="assets/hook-demo.png" alt="envguard git hook interception demo" width="100%" />
</p>

---

## 🛠️ CLI Commands & Workflows

### `envguard check` (Default)
Performs complete scan across project source code, `.env`, and `.env.example`:
```bash
# Standard check
npx envguard

# Strict mode for CI (fails on warnings too)
npx envguard --strict

# Check only Git staged files (ultra fast)
npx envguard --staged

# Formatted output for CI/CD pipelines
npx envguard --format github
npx envguard --format json
```

### `envguard sync` (or `envguard fix`)
Automatically creates or updates `.env.example` based on project source code and `.env`, intelligently masking sensitive data into safe placeholders:
```bash
npx envguard sync

# Prune obsolete/stale variables no longer referenced anywhere:
npx envguard sync --prune
```

### `envguard gen-types` (or `envguard types`)
Generates ambient TypeScript definitions (`env.d.ts`) so you get autocomplete and compile-time type safety:
```bash
npx envguard gen-types
```
*Generated `env.d.ts`:*
```ts
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT: `${number}` | string;
      NODE_ENV: 'development' | 'production';
      DATABASE_URL: string;
      ENABLE_METRICS?: 'true' | 'false' | '1' | '0';
    }
  }
}
```

### `envguard init`
One-click onboarding that configures templates, generates type definitions, and installs git pre-commit hooks:
```bash
npx envguard init
```

---

## 🏷️ Inline Schema Annotations

You can annotate `.env.example` comments with schemas that `envguard` strictly validates:

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
```

### Supported Annotation Tags:
| Tag | Description | Example |
|---|---|---|
| `@type <type>` | Semantic type | `@type port`, `@type boolean`, `@type url`, `@type email`, `@type json` |
| `@type enum(...)` | Strict enum values | `@type enum(dev, staging, prod)` |
| `@required` | Must be present in `.env` | `@required` |
| `@optional` | Optional in `.env` | `@optional` |
| `@default <val>` | Default fallback value | `@default 3000` |
| `@description <text>` | Documentation & IDE tooltip | `@description App port` |

---

## ⚙️ Configuration (Optional)

Create `envguard.config.json` or add an `"envguard"` section to `package.json`:

```json
{
  "envFile": ".env",
  "exampleFile": ".env.example",
  "typesFile": "src/types/env.d.ts",
  "strict": false,
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
        run: npx envguard --format github --strict
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

- **Blazing Fast**: Scans 1,000+ files in under 60 milliseconds.
- **Zero Heavy Native Dependencies**: 100% pure TypeScript / Node.js ESM.
- **100% Test Coverage**: Full suite of unit, AST, and CLI integration tests with Vitest.

---

## 📄 License

MIT © [latryee](https://github.com/latryee)

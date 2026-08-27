<h1 align="center">🛡️ envguard</h1>

<p align="center">
  <strong>Zero-Config Git Secret Leaks Detector, Semantic Type Validator & <code>.env.example</code> Synchronizer</strong>
</p>

<p align="center">
  <a href="https://npmjs.com/package/envguard"><img src="https://img.shields.io/npm/v/envguard.svg?color=38bdf8&style=flat-square" alt="NPM version" /></a>
  <a href="https://github.com/latryee/envguard/actions"><img src="https://img.shields.io/github/actions/workflow/status/latryee/envguard/ci.yml?branch=main&style=flat-square" alt="Build Status" /></a>
  <a href="https://github.com/latryee/envguard/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-green.svg?style=flat-square" alt="License" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/language-TypeScript-blue.svg?style=flat-square" alt="TypeScript" /></a>
  <a href="https://vitest.dev/"><img src="https://img.shields.io/badge/tests-100%25%20passing-brightgreen.svg?style=flat-square" alt="Tests" /></a>
</p>

<br />

## 🎯 The Problem

When a new engineer joins a team or clones a repository:
1. **`.env.example` is hopelessly outdated:** Variables added over months are undocumented, leading to broken onboarding and runtime crashes.
2. **Type mismatches explode in production:** `PORT` is entered as a string or out of range, boolean flags are misspelled, database connection strings are malformed.
3. **Catastrophic secret leaks:** Real API keys (OpenAI, Stripe, AWS, GitHub PATs) accidentally get committed to `.env.example` or Git staged files.

---

## ⚡️ The Solution: `envguard`

`envguard` parses actual environment variable references across your codebase, validates `.env` against `.env.example`, verifies variable types, catches leaked credentials with Shannon entropy scanning, and automatically synchronizes templates before anything hits Git.

```bash
# Run instantly with zero configuration:
npx envguard
```

```
  ███████╗███╗   ██╗██╗   ██╗ ██████╗ ██╗   ██╗ █████╗ ██████╗ ██████╗ 
  ██╔════╝████╗  ██║██║   ██║██╔════╝ ██║   ██║██╔══██╗██╔══██╗██╔══██╗
  █████╗  ██╔██╗ ██║██║   ██║██║  ███╗██║   ██║███████║██████╔╝██║  ██║
  ██╔══╝  ██║╚██╗██║╚██╗ ██╔╝██║   ██║██║   ██║██╔══██║██╔══██╗██║  ██║
  ███████╗██║ ╚████║ ╚████╔╝ ╚██████╔╝╚██████╔╝██║  ██║██║  ██║██████╔╝
  ╚══════╝╚═╝  ╚═══╝  ╚═══╝   ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ 
  v1.0.0 — Zero-Config Git Secret Leaks & Type Validator

❌ Missing in .env (Required - Runtime Crash Risk) [1]
  ✖ STRIPE_WEBHOOK_SECRET (referenced in src/api/billing.ts:14)

❌ Type & Format Mismatches [1]
  ✖ PORT (line 1): Expected valid port number (1-65535), got "999999".
    Expected: port (1-65535) | Got: 999999

⚠️ Drift: Missing in .env.example (Undocumented Keys) [1]
  ▲ REDIS_CACHE_URL (used in src/lib/redis.ts:8)
  💡 Fix: Run npx envguard sync to automatically update .env.example

────────────────────────────────────────────────────────────
  ✖ Failed: 2 errors, 1 warning
────────────────────────────────────────────────────────────
```

---

## ✨ Features

- **🚀 Zero Configuration**: Works instantly with zero setup files across Node.js, Python, Go, Rust, PHP, Ruby, and Dockerfiles.
- **🔍 Multi-Language Code AST & Regex Scanner**: Extracts `process.env.VAR`, `import.meta.env.VAR`, `os.environ`, `getenv()`, `std::env::var()`, and Docker `ENV` references.
- **🚨 Curated Secret Leak & Shannon Entropy Detection**: Catches AWS, OpenAI, Anthropic Claude, Stripe, GitHub, Slack, SendGrid, and High Shannon Entropy tokens before commits.
- **✅ Semantic Type Validation**: Validates `port` (1-65535), `boolean`, `integer`, `number`, `url`, `email`, `ip`, `json`, `uuid`, `base64`, and custom `enum(a,b,c)`.
- **🔄 Auto-Sync & Safe Masking (`envguard sync`)**: Updates `.env.example` with safe dummy values (e.g. `your_openai_api_key_here`, `postgresql://localhost:5432/mydb`) and adds inline type annotations.
- **📝 TypeScript Ambient Type Generator (`envguard gen-types`)**: Generates `env.d.ts` for full IDE autocomplete on `process.env` and `import.meta.env`.
- **🪝 1-Click Git Pre-commit Hook (`envguard hook install`)**: Prevents commits containing secrets or missing variables.

---

## 📦 Installation & Usage

### 1. Instant Run (Recommended)
```bash
npx envguard
```

### 2. Global / Local CLI
```bash
npm install -g envguard
# or in your project:
npm install -D envguard
```

---

## 🛠️ CLI Commands & Workflows

### `envguard check` (Default)
Performs complete scan and checks for drift, type errors, missing keys, and secret leaks.
```bash
# Standard check
npx envguard

# Strict mode for CI (fails on warnings too)
npx envguard --strict

# Check only Git staged files (ultra fast)
npx envguard --staged

# Output format for CI/CD
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
    }
  }
}
```

### `envguard hook install`
Installs a native `.git/hooks/pre-commit` (or `.husky/pre-commit`) hook to block bad commits automatically:
```bash
npx envguard hook install
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

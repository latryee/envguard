<p align="center">
  <img src="assets/social-preview.png" alt="envguard banner" width="100%" />
</p>

<h1 align="center">🛡️ envguard</h1>

<p align="center">
  <strong>Zero-Config Git Secret Leaks Detector, Semantic Type Validator, AST Scanner, Client Leak Guard &amp; <code>.env.example</code> Synchronizer</strong>
</p>

<p align="center">
  <a href="https://github.com/latryee/envguard/actions"><img src="https://img.shields.io/github/actions/workflow/status/latryee/envguard/ci.yml?branch=main&style=flat-square" alt="Build Status" /></a>
  <a href="https://github.com/latryee/envguard/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-green.svg?style=flat-square" alt="License" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/language-TypeScript-blue.svg?style=flat-square" alt="TypeScript" /></a>
  <a href="https://vitest.dev/"><img src="https://img.shields.io/badge/tests-139%2F139%20passing-brightgreen.svg?style=flat-square" alt="Tests" /></a>
  <a href="https://github.com/latryee/envguard"><img src="https://img.shields.io/badge/SARIF%202.1.0-Code%20Scanning-blueviolet.svg?style=flat-square" alt="SARIF" /></a>
  <a href="#-competitive-matrix"><img src="https://img.shields.io/badge/zero-cloud%20dependency-emerald.svg?style=flat-square" alt="Zero Cloud" /></a>
</p>

<p align="center">
  <img src="assets/demo.gif" alt="envguard terminal demo" width="100%" />
</p>

<br />

## ❓ Why EnvGuard?

Managing environment variables in modern software stacks usually requires balancing fragmented scripts and heavy SaaS platforms:
- **Cloud Secrets Managers** (*Doppler, HashiCorp Vault, AWS Secrets Manager*) manage runtime secrets for production infrastructure, but introduce cloud latency, billing, and login requirements during local development.
- **Git Secret Scanners** (*Gitleaks, Trufflehog*) scan git history for credentials, but ignore schema drift, missing variables, or runtime type mismatches (such as an invalid port number or malformed database URI).
- **Runtime Validators** (*Zod, Envalid, t3-env*) validate process variables during app boot, are coupled to specific JS/TS runtimes, and cannot keep `.env.example` templates synchronized across developer teams.

> **`envguard` operates at the developer workflow & pre-commit boundary:** It inspects your actual codebase references across languages (using TypeScript Compiler AST and tokenized scanners), detects client-side secret exposure in React/Next.js/Vite bundles, validates semantic types, detects hardcoded secrets with Shannon entropy and curated signatures, scans git history, exports to Kubernetes/Docker/Terraform, and keeps `.env.example` templates continuously up-to-date with safe placeholders — **100% offline, in milliseconds, with zero configuration.**

---

## 🥊 Competitive Matrix

| Feature | `envguard` | `dotenv-linter` | `Doppler` | `Gitleaks` | `t3-env / Zod` |
|:---|:---:|:---:|:---:|:---:|:---:|
| **Zero Cloud / 100% Offline** | ✅ **Yes** | ✅ Yes | ❌ Cloud SaaS | ✅ Yes | ✅ Yes |
| **Zero-Config Setup (`npx`)** | ✅ **Instant** | ⚠️ Binary setup | ❌ CLI auth | ⚠️ Binary setup | ❌ In-code schema |
| **`.env.example` Auto-Sync & Safe Masking** | ✅ **Automated** | ❌ No | ❌ No | ❌ No | ❌ No |
| **Interactive TUI Fix Wizard (`sync -i`)** | ✅ **Built-in** | ❌ No | ❌ No | ❌ No | ❌ No |
| **Client-Side Secret Leak Guard (Next.js/Vite)** | ✅ **Built-in** | ❌ No | ❌ No | ❌ No | ❌ No |
| **Code Reference Scanner** | ✅ **JS/TS (AST) + Py/Go/Rust/PHP/Ruby** | ❌ No | ❌ No | ❌ Regex in git | ❌ TS/JS only |
| **Semantic Type Validation (`port`, `cron`, `duration`, `semver`)** | ✅ **16+ Types** | ❌ Strings only | ❌ Strings only | ❌ No | ✅ In-code |
| **Curated Secret Leaks & Shannon Entropy** | ✅ **Built-in (0–100 Confidence)** | ❌ No | ❌ No | ✅ Built-in | ❌ No |
| **Git History Scanner (`--scan-history`)** | ✅ **Built-in** | ❌ No | ❌ No | ✅ Built-in | ❌ No |
| **Infrastructure Exporter (K8s, Compose, TF, Helm)** | ✅ **Built-in (`export`)** | ❌ No | ⚠️ SaaS only | ❌ No | ❌ No |
| **Vault Provider Bridge (Doppler, Infisical, AWS, Vault)** | ✅ **Built-in (`pull`)** | ❌ No | ⚠️ Proprietary | ❌ No | ❌ No |
| **Monorepo Workspaces Mode (`--workspaces`)** | ✅ **Built-in** | ❌ No | ❌ No | ⚠️ Custom scripts | ❌ Manual |
| **SARIF 2.1.0 GitHub Code Scanning Output** | ✅ **Built-in** | ❌ No | ❌ No | ✅ Built-in | ❌ No |
| **1-Click Git Pre-Commit Hook (Native & Husky)** | ✅ **Built-in** | ❌ No | ❌ No | ⚠️ Custom setup | ❌ No |
| **Ambient TypeScript Type Gen (`env.d.ts`)** | ✅ **Built-in** | ❌ No | ❌ No | ❌ No | ⚠️ Manual schema |

---

## 🔍 Technical Architecture & Parser Transparency

1. **`.env` and `.env.example` Files**: Parsed into a complete, lossless **Abstract Syntax Tree (`EnvFileAst`)** preserving inline comments, multiline quoted values, export prefixes, blank lines, and `@type` schema annotations.
2. **JavaScript & TypeScript (`.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`)**: Parsed via the **TypeScript Compiler API (`ts.createSourceFile`)**. Extracts property accesses (`process.env.X`, `import.meta.env.X`, `Bun.env.X`, `Deno.env.get`), object destructuring (`const { PORT, DB_URL: renamed = 'default' } = process.env`), and eliminates false positives in comments, template literal expressions, and string literals.
3. **Client-Side Secret Exposure Interceptor**: Detects client components in Next.js (`'use client'`, `components/`), Vite (`src/`), Remix, and Astro. Verifies that private backend variables (`DATABASE_URL`, `STRIPE_SECRET_KEY`, `JWT_SECRET`) without public prefixes (`NEXT_PUBLIC_`, `VITE_`) are never referenced in client-side bundles.
4. **Go, Python, Rust, PHP, Ruby, and Dockerfiles**: Scanned using **tokenized, comment-stripping scanners** with language-specific heuristics. This ensures zero heavy native compilation dependencies (`node-gyp`, platform-specific native binaries) while delivering sub-millisecond execution speeds.

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

---

## 🛠️ CLI Commands & Workflows

### `envguard check` (Default Command)
Performs a complete scan across codebase references, `.env`, and `.env.example`:

```bash
# Standard check
npx envguard

# Strict mode for CI (fails on warnings too)
npx envguard --strict

# Check only Git staged files (fast pre-commit mode)
npx envguard --staged

# Paranoid secret detection (surfaces lower-confidence heuristics)
npx envguard --paranoid

# Scan past Git commit history for committed secrets
npx envguard --scan-history

# Scan all packages across monorepo workspaces
npx envguard --workspaces

# Formatted output for CI/CD pipelines
npx envguard --format github
npx envguard --format sarif > envguard.sarif
npx envguard --format pr-comment
npx envguard --format json
```

### `envguard sync` (or `envguard fix`)
Automatically creates or updates `.env.example` based on project source code and `.env`, masking sensitive data into safe, realistic placeholders:

```bash
# Update .env.example with missing variables
npx envguard sync

# Interactive TUI Wizard: choose actions step-by-step
npx envguard sync --interactive

# Prune obsolete/stale variables no longer referenced anywhere
npx envguard sync --prune
```

### `envguard export`
Export environment variables to Kubernetes Secret, Docker Compose, Terraform, Helm, or JSON Schema:

```bash
# Export to Kubernetes Secret YAML
npx envguard export --format k8s-secret --name app-secrets --output k8s-secret.yaml

# Export to Docker Compose environment block
npx envguard export --format docker-compose --service api

# Export to Terraform .tfvars
npx envguard export --format terraform --output terraform.tfvars

# Export to JSON Schema
npx envguard export --format json-schema --output .envguard.schema.json
```

### `envguard pull`
Pull secrets from supported Cloud Secret Managers CLI:

```bash
# Pull from Doppler
npx envguard pull --provider doppler --project my-project --config dev

# Pull from Infisical
npx envguard pull --provider infisical --config staging

# Pull from AWS Secrets Manager
npx envguard pull --provider aws --vault-secret-id arn:aws:secretsmanager:...
```

### `envguard vscode`
Configure VS Code file nesting (`.env.*` grouped under `.env`), schema association, and syntax highlighting recommendations:

```bash
npx envguard vscode
```

### `envguard gen-types` (or `envguard types`)
Generates ambient TypeScript definitions (`env.d.ts`) for autocomplete and compile-time type safety:

```bash
npx envguard gen-types
```

### `envguard init`
One-click onboarding that configures templates, syncs variables, generates type definitions, and installs git pre-commit hooks:

```bash
npx envguard init
```

---

## 🔐 Secret Detection & Confidence Scoring

EnvGuard combines curated signature matching with Shannon entropy analysis and context heuristics. Every finding includes a **Confidence Score (0–100%)**:

### Curated Provider Signatures:
- **AI Providers**: OpenAI (`sk-...`, `sk-proj-...`), Anthropic Claude (`sk-ant-...`), Hugging Face (`hf_...`)
- **Cloud Infrastructure**: AWS Access Keys (`AKIA...`, `ASIA...`) & Secret Keys, Google Cloud Service Account JSON Keys, Azure Storage Keys & Client Secrets
- **Package Registries & VCS**: GitHub Personal Access Tokens (`ghp_...`, `github_pat_...`), GitLab Tokens (`glpat-...`), npm Access Tokens (`npm_...`), PyPI Tokens (`pypi-...`), Docker Hub PATs (`dckr_pat_...`)
- **Payments & Communication**: Stripe (`sk_live_...`, `rk_live_...`), Slack Bot Tokens & Webhooks, SendGrid (`SG...`), Twilio (`SK...`), Resend (`re_...`)
- **Cryptographic Keys**: Unencrypted/Encrypted Private Keys (`-----BEGIN RSA/EC/OPENSSH/PGP PRIVATE KEY-----`)

### Confidence Modes:
- **Default Mode**: Reports high-confidence findings (`>= 80%`) to eliminate noise.
- **Paranoid Mode (`--paranoid`)**: Surfaces medium-confidence findings (`>= 50%`), including standalone high-entropy tokens and heuristic patterns.

### Negative Test Corpus:
Tested against high-entropy non-secrets (Base64 data URIs, UUIDs, Git commit SHA hashes, Webpack bundle hashes, mock JWTs) with a **verified 0% false-positive rate** in CI.

---

## 🏷️ Supported Semantic Types & Annotations

Annotate `.env.example` comments with schemas validated by EnvGuard:

```dotenv
# @type port @required @default 3000
PORT=3000

# @type enum(development, staging, production) @description App environment
NODE_ENV=development

# @type duration @description Redis session timeout
SESSION_TTL=30m

# @type cron @description Nightly cleanup cron
CLEANUP_CRON="0 0 * * *"

# @type semver @description Minimum API client version
MIN_API_VERSION=2.1.0

# @type hostname @description Database host
DB_HOST=db.internal.net

# @type url @description PostgreSQL connection string
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mydb

# @type boolean @optional
ENABLE_FEATURE_FLAGS=false

# @type email
ADMIN_EMAIL=admin@example.com

# @type regex(^[a-z0-9-]+$) @description App namespace identifier
APP_SLUG=my-app-service
```

---

## 🚀 CI/CD Integrations

### GitHub Actions (Composite Action, Step Summary & Code Scanning)

```yaml
name: Security & Environment Check

on: [push, pull_request]

jobs:
  envguard:
    runs-on: ubuntu-latest
    permissions:
      security-events: write # Required for SARIF upload
      contents: read
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # Full history for --scan-history
      
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          
      - name: Run EnvGuard
        uses: latryee/envguard@v1
        with:
          strict: 'true'
          format: 'sarif'
          sarif-file: 'results.sarif'
          
      - name: Upload SARIF to GitHub Code Scanning
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: 'results.sarif'
```

### Husky & lint-staged
```json
{
  "lint-staged": {
    "*": "npx @latryee/envguard --staged --strict"
  }
}
```

---

## 🧪 Performance & Benchmarks

Measured on Node.js v22 across realistic multi-module codebase fixtures (`npm run bench`):

| Workload Tier | Source Files | Variables / References | Average Execution Time |
|:---|:---:|:---:|:---:|
| **Small Project** | 25 files | 100 references | **~16 ms** |
| **Medium Project** | 250 files | 1,000 references | **~115 ms** |
| **Large Project** | 1,000 files | 4,000 references | **~440 ms** |

- **Zero Heavy Native Dependencies**: Pure TypeScript / Node.js ESM.
- **Comprehensive Test Suite**: 139 unit & integration tests across 27 test files covering AST parsing, client leak detection, vault exporters, monorepos, and SARIF generation with enforced coverage thresholds.

---

## 📄 License

MIT © [latryee](https://github.com/latryee)

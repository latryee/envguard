<p align="center">
  <img src="assets/social-preview.png" alt="envguard banner" width="100%" />
</p>

<h1 align="center">🛡️ envguard</h1>

<p align="center">
  <strong>Zero-Config 360° Environment &amp; Secrets Platform: Multi-Language AST Scanner, Git Secret Leaks Detector, Client Leak Guard, AES-256-GCM Encryption, Formatting, Drift Diff &amp; Runtime Loader</strong>
</p>

<p align="center">
  <a href="https://github.com/latryee/envguard/actions"><img src="https://img.shields.io/github/actions/workflow/status/latryee/envguard/ci.yml?branch=main&style=flat-square" alt="Build Status" /></a>
  <a href="https://github.com/latryee/envguard/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-green.svg?style=flat-square" alt="License" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/language-TypeScript-blue.svg?style=flat-square" alt="TypeScript" /></a>
  <a href="https://vitest.dev/"><img src="https://img.shields.io/badge/tests-161%2F161%20passing-brightgreen.svg?style=flat-square" alt="Tests" /></a>
  <a href="https://github.com/latryee/envguard"><img src="https://img.shields.io/badge/coverage-%3E91%25-brightgreen.svg?style=flat-square" alt="Coverage" /></a>
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
- **Git Secret Scanners** (*Gitleaks, Trufflehog*) scan git history for credentials, but ignore schema drift, missing variables, client-side bundle leaks, or runtime type mismatches.
- **Runtime Validators** (*Zod, Envalid, t3-env*) validate process variables during app boot, are coupled to specific JS/TS runtimes, and cannot keep `.env.example` templates synchronized across developer teams.

> **`envguard` is a complete, self-contained 360° environment platform:** It inspects your actual codebase references across languages (using TypeScript Compiler AST and tokenized scanners), prevents client-side secret leakage in React/Next.js/Vite bundles, audits Dockerfiles against `.dockerignore` leaks, validates 16+ semantic types, detects hardcoded secrets with Shannon entropy, encrypts files with AES-256-GCM at rest, visually diffs environment drift, formats `.env` files, exports to Kubernetes/Docker/Terraform, and bootstraps apps at runtime with strict schema validation — **100% offline, in milliseconds, with zero configuration.**

---

## 🥊 Competitive Matrix

| Feature | `envguard` | `dotenv-linter` | `Doppler` | `Gitleaks` | `t3-env / Zod` | `dotenv` |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Zero Cloud / 100% Offline** | ✅ **Yes** | ✅ Yes | ❌ Cloud SaaS | ✅ Yes | ✅ Yes | ✅ Yes |
| **Zero-Config Setup (`npx`)** | ✅ **Instant** | ⚠️ Binary setup | ❌ CLI auth | ⚠️ Binary setup | ❌ In-code schema | ❌ Requires code |
| **`.env.example` Auto-Sync & Safe Masking** | ✅ **Automated** | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No |
| **Interactive TUI Fix Wizard (`sync -i`)** | ✅ **Built-in** | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No |
| **Environment Drift Diff (`diff <f1> <f2>`)** | ✅ **Built-in** | ❌ No | ⚠️ Web UI | ❌ No | ❌ No | ❌ No |
| **Auto-Fix Formatter & Sorter (`fmt`)** | ✅ **Built-in** | ⚠️ Limited | ❌ No | ❌ No | ❌ No | ❌ No |
| **AES-256-GCM Encryption at Rest (`encrypt`)** | ✅ **Built-in** | ❌ No | ⚠️ SaaS only | ❌ No | ❌ No | ❌ No |
| **Runtime Zero-Overhead Loader (`loadEnv`)** | ✅ **Built-in** | ❌ No | ❌ No | ❌ No | ⚠️ Schema only | ✅ Basic only |
| **Client-Side Secret Leak Guard (Next.js/Vite)** | ✅ **Built-in** | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No |
| **Docker & Container Leak Guard (`.dockerignore`)** | ✅ **Built-in** | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No |
| **Multi-Language Reference Scanner** | ✅ **JS/TS (AST) + Py/Go/Rust/PHP/Ruby** | ❌ No | ❌ No | ❌ Regex in git | ❌ TS/JS only | ❌ No |
| **Semantic Type Validation (16+ Types)** | ✅ **Built-in** | ❌ Strings only | ❌ Strings only | ❌ No | ✅ In-code | ❌ No |
| **Curated Secret Leaks (0–100 Confidence)** | ✅ **Built-in** | ❌ No | ❌ No | ✅ Built-in | ❌ No | ❌ No |
| **Git History Scanner (`--scan-history`)** | ✅ **Built-in** | ❌ No | ❌ No | ✅ Built-in | ❌ No | ❌ No |
| **Infrastructure Exporter (K8s, Compose, TF, Helm)** | ✅ **Built-in (`export`)** | ❌ No | ⚠️ SaaS only | ❌ No | ❌ No | ❌ No |
| **Vault Provider Bridge (Doppler, Infisical, AWS, Vault)** | ✅ **Built-in (`pull`)** | ❌ No | ⚠️ Proprietary | ❌ No | ❌ No | ❌ No |
| **Monorepo Workspaces Mode (`--workspaces`)** | ✅ **Built-in** | ❌ No | ❌ No | ⚠️ Custom scripts | ❌ Manual | ❌ No |
| **SARIF 2.1.0 GitHub Code Scanning** | ✅ **Built-in** | ❌ No | ❌ No | ✅ Built-in | ❌ No | ❌ No |
| **1-Click Git Pre-Commit Hook (Native & Husky)** | ✅ **Built-in** | ❌ No | ❌ No | ⚠️ Custom setup | ❌ No | ❌ No |

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

## 🚀 Runtime SDK: Zero-Overhead Loader & Schema Enforcement

Replace `dotenv` with `envguard` for zero-overhead loading, variable expansion, and startup type enforcement:

```ts
import { loadEnv } from '@latryee/envguard';

// Automatically loads .env, expands ${PORT} variables, and validates types against .env.example
loadEnv({ strict: true });
```

### Preload in Node.js Applications:
```bash
node -r @latryee/envguard/register app.js
```

Or in ES Modules:
```ts
import '@latryee/envguard/register';
```

---

## 🛠️ Complete CLI Command Reference

### `envguard check` (Default Command)
Performs a 360° scan across codebase references, `.env`, `.env.example`, client-side bundles, and Docker files:

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

### `envguard diff <file1> <file2>`
Visually compare differences and drift between two environment files without exposing sensitive plaintext secrets:

```bash
# Compare staging vs production environment drift
npx envguard diff .env.staging .env.production

# Unmask values (use with caution)
npx envguard diff .env.staging .env.production --unmask
```

### `envguard fmt`
Auto-format, organize, sort, and normalize quotes across `.env` and `.env.example` files:

```bash
# Format .env and .env.example in place
npx envguard fmt

# Sort variables alphabetically
npx envguard fmt --sort alphabetical

# Group variables by domain prefix (AWS_*, DATABASE_*, REDIS_*)
npx envguard fmt --sort prefix

# Check formatting in CI
npx envguard fmt --check
```

### `envguard encrypt` & `envguard decrypt`
Zero-cloud AES-256-GCM encryption at rest. Safely commit `.env.enc` to Git and decrypt in CI:

```bash
# Encrypt .env into .env.enc (generates a secure 256-bit key)
npx envguard encrypt .env

# Decrypt .env.enc using ENVGUARD_KEY or --key
npx envguard decrypt .env.enc --key <YOUR_KEY>
```

### `envguard sync` (or `envguard fix`)
Automatically synchronizes `.env.example` with project source code and `.env`, masking sensitive values into realistic placeholders:

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

### `envguard completion`
Generate shell autocompletion scripts for Bash, Zsh, Fish, or PowerShell:

```bash
# Zsh completion
envguard completion --shell zsh > ~/.zfunc/_envguard

# Bash completion
envguard completion --shell bash > /etc/bash_completion.d/envguard
```

### `envguard gen-types` (or `envguard types`)
Generates ambient TypeScript definitions (`env.d.ts`) for autocomplete and compile-time type safety:

```bash
npx envguard gen-types
```

### `envguard hook install`
Install 1-click Git pre-commit hook (native `.git/hooks` or Husky):

```bash
npx envguard hook install
```

---

## 🔐 Curated Secret Detection & Confidence Scoring

EnvGuard combines curated signature matching with Shannon entropy analysis and context heuristics. Every finding includes a **Confidence Score (0–100%)**:

### Curated Provider Signatures:
- **AI Providers**: OpenAI (`sk-...`, `sk-proj-...`), Anthropic Claude (`sk-ant-...`), Hugging Face (`hf_...`)
- **Cloud Infrastructure**: AWS Access Keys (`AKIA...`, `ASIA...`) & Secret Keys, Google Cloud Service Account JSON Keys, Azure Storage Keys & Client Secrets
- **Package Registries & VCS**: GitHub Personal Access Tokens (`ghp_...`, `github_pat_...`), GitLab Tokens (`glpat-...`), npm Access Tokens (`npm_...`), PyPI Tokens (`pypi-...`), Docker Hub PATs (`dckr_pat_...`)
- **Payments & Communication**: Stripe (`sk_live_...`, `rk_live_...`), Slack Bot Tokens & Webhooks, SendGrid (`SG...`), Twilio (`SK...`), Resend (`re_...`)
- **Cryptographic Keys**: Unencrypted/Encrypted Private Keys (`-----BEGIN RSA/EC/OPENSSH/PGP PRIVATE KEY-----`)

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

## 🧪 Performance & Benchmarks

Measured on Node.js v22 across realistic multi-module codebase fixtures (`npm run bench`):

| Workload Tier | Source Files | Variables / References | Average Execution Time |
|:---|:---:|:---:|:---:|
| **Small Project** | 25 files | 100 references | **~16 ms** |
| **Medium Project** | 250 files | 1,000 references | **~115 ms** |
| **Large Project** | 1,000 files | 4,000 references | **~440 ms** |

- **Zero Heavy Native Dependencies**: Pure TypeScript / Node.js ESM.
- **Comprehensive Test Suite**: 161 unit & integration tests across 34 test files covering AST parsing, client leak detection, vault exporters, AES encryption, formatters, and monorepos with enforced coverage thresholds.

---

## 📄 License

MIT © [latryee](https://github.com/latryee)

# Changelog

All notable changes to **EnvGuard** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.0] - 2026-08-28

### 🚀 Highlights & New Features

- **Environment Diff & Drift Engine (`envguard diff <file1> <file2>`)**:
  - Visually compares two environment files (e.g. `.env.staging` vs `.env.production`).
  - Identifies unique keys, value differences, and type mismatches with automatic secret masking.
- **Auto-Fix Formatter & Sorter (`envguard fmt`)**:
  - Automatically cleans, reorganizes, and formats `.env` and `.env.example` files.
  - Normalizes quotes (`as-needed`, `always-double`, `always-single`).
  - Supports alphabetical sorting (`--sort alphabetical`) and domain prefix grouping (`--sort prefix` for `AWS_*`, `DATABASE_*`, etc.).
  - Includes `--check` mode for CI pipelines.
- **Zero-Cloud AES-256-GCM Encryption at Rest (`envguard encrypt` & `envguard decrypt`)**:
  - Pure Node.js `node:crypto` implementation with scrypt key derivation and tamper-proof authentication tags.
  - Safely encrypts `.env` to `.env.enc` for secure Git commits and zero-cloud CI/CD deployment.
- **Runtime SDK & Preload Hook (`loadEnv` & `@latryee/envguard/register`)**:
  - Built-in zero-overhead runtime loader replacing `dotenv`.
  - Supports variable expansion (`${PORT}`, `${HOST:-localhost}`) and startup schema validation against `.env.example`.
  - Preloadable via `node -r @latryee/envguard/register app.js` or `import '@latryee/envguard/register'`.
- **Docker & Container Leak Guard (`.dockerignore` Audit)**:
  - Audits `Dockerfile` and `.dockerignore` for accidental `.env` leakage into container image layers.
- **Shell Autocompletion Generator (`envguard completion`)**:
  - Generates autocomplete definitions for Bash, Zsh, Fish, and PowerShell.
- **Test Suite Expansion**:
  - **161 passing tests across 34 test files** with >91% statement coverage and 100% function coverage.

---

## [1.1.0] - 2026-08-28

### 🚀 Highlights & Features

- **Interactive TUI Fix Wizard (`envguard sync --interactive` / `envguard fix -i`)**:
  - Zero-dependency interactive prompter powered by Node.js `readline/promises`.
- **Client-Side Secret Leak Guard (React / Next.js / Vite / Remix / Astro)**:
  - Detects and intercepts private backend secrets referenced in client bundles.
- **Infrastructure & Multi-Format Exporters (`envguard export`)**:
  - Kubernetes Secret YAML, Docker Compose, Terraform, Helm, JSON Schema.
- **Secret Vault Provider Bridge (`envguard pull`)**:
  - Pulls secrets from Doppler, Infisical, AWS Secrets Manager, 1Password, Vault.
- **VS Code & IDE Tooling (`envguard vscode`)**:
  - File nesting, schema association, and syntax highlighting setup.
- **GitHub PR Review Commenter & Step Summary (`--format pr-comment` / `--format summary`)**:
  - Markdown PR comment report writing to `$GITHUB_STEP_SUMMARY`.

---

## [1.0.0] - 2026-08-28

### 🚀 Initial Production Release

- **TypeScript / JavaScript AST Scanner**: TypeScript Compiler API (`ts.createSourceFile`).
- **Multi-Language Reference Scanner**: Tokenized comment-stripping scanners for Go, Python, Rust, PHP, Ruby, and Dockerfiles.
- **Curated Secret Detection & Confidence Scoring (0–100%)**: Curated rules, Shannon entropy, 0.00% False-Positive rate.
- **Git History Scanning (`--scan-history`)**: Scans git commit log diffs.
- **16+ Semantic Types & Schema Validation**.
- **Monorepo Workspace Discovery (`--workspaces`)**.
- **SARIF 2.1.0 GitHub Code Scanning Output (`--format sarif`)**.
- **Official GitHub Action (`action.yml`)**.

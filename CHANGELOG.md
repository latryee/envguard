# Changelog

All notable changes to **EnvGuard** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0] - 2026-08-28

### 🚀 Highlights & New Features

- **Interactive TUI Fix Wizard (`envguard sync --interactive` / `envguard fix -i`)**:
  - Zero-dependency interactive prompter powered by Node.js `readline/promises`.
  - Review environment drift and missing variables step-by-step: choose safe auto-placeholders, custom inputs, mark as optional, or skip.
- **Client-Side Secret Leak Guard (React / Next.js / Vite / Remix / Astro)**:
  - Detects client-side components (`'use client'`, `components/`, Vite `src/` bundles).
  - Intercepts and flags private backend variables (`DATABASE_URL`, `STRIPE_SECRET_KEY`, `JWT_SECRET`) referenced without framework-required public prefixes (`NEXT_PUBLIC_`, `VITE_`, `PUBLIC_`), preventing accidental bundling of secrets into client JavaScript.
- **Infrastructure & Multi-Format Exporters (`envguard export`)**:
  - Export environment variables directly into:
    - Kubernetes Secret YAML (`k8s-secret`)
    - Docker Compose environment block (`docker-compose`)
    - Terraform variables (`terraform` / `.tfvars`)
    - Helm values (`helm`)
    - JSON Schema (`json-schema`)
- **Secret Vault Provider Bridge (`envguard pull`)**:
  - Pull secrets directly from Doppler (`doppler`), Infisical (`infisical`), AWS Secrets Manager (`aws`), 1Password (`1password`), or HashiCorp Vault (`vault`).
- **VS Code & IDE Tooling (`envguard vscode`)**:
  - Automatically configures `.vscode/settings.json` with file nesting (`.env.*` grouped under `.env`), `.envguard.schema.json` schema associations, and dotenv syntax recommendations.
- **GitHub PR Review Commenter & Step Summary (`--format pr-comment` / `--format summary`)**:
  - Generates rich Markdown review comments with collapsible tables, diff indicators, and suggested fix commands.
  - Automatically writes to `$GITHUB_STEP_SUMMARY` in GitHub Actions.
- **Test Suite Expansion**:
  - 139 passing tests across 27 test files with enforced Vitest coverage thresholds (>90% statements, 100% functions).

---

## [1.0.0] - 2026-08-28

### 🚀 Initial Production Release

- **TypeScript / JavaScript AST Scanner**: Powered by the TypeScript Compiler API (`ts.createSourceFile`) for zero-false-positive detection of environment variables.
- **Multi-Language Reference Scanner**: Tokenized comment-stripping scanners for Go, Python, Rust, PHP, Ruby, and Dockerfiles with zero heavy native dependencies (`node-gyp`).
- **Curated Secret Detection & Confidence Scoring**:
  - Signatures for OpenAI, Anthropic Claude, AWS, Google Cloud Service Accounts, Azure Storage & Client Secrets, GitHub, GitLab, Stripe, Slack, SendGrid, Twilio, Resend, npm, PyPI, Docker Hub, and Generic Private Keys.
  - Multi-tier Confidence Scoring (0–100%) with `HIGH`, `MEDIUM`, `LOW` levels and `--paranoid` (`-P`) flag.
  - Verified 0.00% False-Positive rate on negative test corpus.
- **Git History Scanning (`--scan-history`)**: Scans git commit log diffs (`git log -p`) for hardcoded secrets introduced in past commits.
- **16+ Semantic Types & Schema Validation**:
  - Types: `port`, `boolean`, `integer`, `number`, `url`, `email`, `ip`, `json`, `uuid`, `base64`, `enum(...)`, `duration`, `cron`, `semver`, `hostname`, `regex(...)` / `pattern(...)`.
- **Monorepo Workspace Discovery (`--workspaces`)**:
  - Auto-discovers and scans npm, pnpm, yarn, and Turborepo workspace packages.
- **SARIF 2.1.0 GitHub Code Scanning Output (`--format sarif`)**:
  - Direct integration with GitHub Advanced Security and CodeQL workflows.
- **Official GitHub Action (`action.yml`)**:
  - Composite GitHub Action for zero-setup CI/CD pipelines (`uses: latryee/envguard@v1`).

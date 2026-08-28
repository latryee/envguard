# Changelog

All notable changes to **EnvGuard** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-08-28

### 🚀 Highlights & Features

- **TypeScript / JavaScript AST Scanner**: Powered by the TypeScript Compiler API (`ts.createSourceFile`) for zero-false-positive detection of environment variables across PropertyAccess (`process.env.X`, `import.meta.env.X`, `Bun.env.X`, `Deno.env.get`), Object Destructuring with renaming/defaults, and comment filtering.
- **Multi-Language Reference Scanner**: Tokenized comment-stripping scanners for Go, Python, Rust, PHP, Ruby, and Dockerfiles with zero heavy native dependencies (`node-gyp`).
- **Curated Secret Detection & Confidence Scoring**:
  - Signatures for OpenAI, Anthropic Claude, AWS, Google Cloud Service Accounts, Azure Storage & Client Secrets, GitHub, GitLab, Stripe, Slack, SendGrid, Twilio, Resend, npm, PyPI, Docker Hub, and Generic Private Keys.
  - Multi-tier Confidence Scoring (0–100%) with `HIGH`, `MEDIUM`, `LOW` levels and `--paranoid` (`-P`) flag.
  - Verified 0.00% False-Positive rate on negative test corpus.
- **Git History Scanning (`--scan-history`)**: Scans git commit log diffs (`git log -p`) for hardcoded secrets introduced in past commits.
- **16+ Semantic Types & Schema Validation**:
  - Types: `port`, `boolean`, `integer`, `number`, `url`, `email`, `ip`, `json`, `uuid`, `base64`, `enum(...)`, `duration`, `cron`, `semver`, `hostname`, `regex(...)` / `pattern(...)`.
- **Smart Safe Masking & Synchronizer (`envguard sync`)**:
  - Automatically synchronizes `.env.example` with realistic placeholders based on key names and semantic types.
  - Optional `--prune` flag to remove stale, unreferenced variables.
- **Monorepo Workspace Discovery (`--workspaces`)**:
  - Auto-discovers and scans npm, pnpm, yarn, and Turborepo workspace packages.
- **SARIF 2.1.0 GitHub Code Scanning Output (`--format sarif`)**:
  - Direct integration with GitHub Advanced Security and CodeQL workflows.
- **Official GitHub Action (`action.yml`)**:
  - Composite GitHub Action for zero-setup CI/CD pipelines (`uses: latryee/envguard@v1`).
- **1-Click Pre-Commit Hook Engine (`envguard hook install`)**:
  - Automatic detection and installation for Git native hooks (`.git/hooks/pre-commit`, worktrees) and Husky (`.husky/pre-commit`).
- **Ambient TypeScript Type Generator (`envguard gen-types`)**:
  - Generates `env.d.ts` for compile-time autocomplete in `process.env` and `import.meta.env`.

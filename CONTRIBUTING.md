# Contributing to EnvGuard

Thank you for your interest in contributing to **EnvGuard**!

## Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/username/envguard.git
   cd envguard
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run tests:**
   ```bash
   npm test
   ```

4. **Build project:**
   ```bash
   npm run build
   ```

5. **Typecheck:**
   ```bash
   npm run typecheck
   ```

## Pull Request Guidelines

- Ensure all Vitest unit tests pass (`npm test`).
- Ensure no TypeScript compile errors (`npm run typecheck`).
- Add tests for any new parser syntax, regex rules, or CLI commands.
- Keep dependencies minimal and zero-overhead.

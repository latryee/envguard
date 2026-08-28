# Contributing to EnvGuard

Thank you for your interest in contributing to **EnvGuard**!

## Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/latryee/envguard.git
   cd envguard
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run tests & coverage:**
   ```bash
   npm test
   npm run test:coverage
   ```

4. **Build project:**
   ```bash
   npm run build
   ```

5. **Typecheck & Lint:**
   ```bash
   npm run typecheck
   npm run lint
   ```

## Pull Request Guidelines

- Ensure all Vitest unit tests pass (`npm test`).
- Ensure no TypeScript compile or lint errors (`npm run typecheck`).
- Add tests for any new parser syntax, regex rules, or CLI commands.
- Keep dependencies minimal and zero-overhead.

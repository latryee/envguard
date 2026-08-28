# 🛡️ EnvGuard - Zero-Trust Secrets & Environment Linter for VS Code & Cursor

**Real-time secret leaks detection, framework client-leak prevention, Shannon entropy analysis, and `.env.example` drift validation directly in your editor.**

---

## ✨ Features

- 🔍 **Real-Time Secret Leaks Detection**: Flags hardcoded OpenAI, Anthropic, AWS, GitHub, Stripe, and private keys with Shannon Entropy confidence scoring.
- 🚨 **Framework Client-Side Leak Guard**: Flags private variables used in client components (`'use client'`, Vite `src/`, Nuxt `pages/`, Remix `.client.tsx`, SvelteKit) with red squiggles.
- 💡 **Quick Fix Actions**: Rename variables to `NEXT_PUBLIC_*` or `VITE_*` or add missing variables to `.env.example` with a single click.
- 💬 **Rich Hover Information**: Hover over `process.env.VARIABLE` in `.ts`, `.tsx`, `.vue`, `.svelte` to inspect its inferred type, default value, and documentation.
- 📊 **Status Bar Health Monitor**: Always see your environment synchronization and security health at a glance in the status bar.
- ⚡️ **Integrated Commands**:
  - `EnvGuard: Run Environment & Security Check`
  - `EnvGuard: Synchronize .env.example`
  - `EnvGuard: Format & Sort .env File`
  - `EnvGuard: Generate TypeScript Environment Types (env.d.ts)`
  - `EnvGuard: Encrypt .env File (AES-256-GCM)`

---

## ⚙️ Extension Settings

| Setting | Type | Default | Description |
|:---|:---:|:---:|:---|
| `envguard.enable` | `boolean` | `true` | Enable real-time analysis |
| `envguard.strict` | `boolean` | `false` | Treat warnings as blocking errors |
| `envguard.envPath` | `string` | `".env"` | Primary `.env` file path |
| `envguard.examplePath` | `string` | `".env.example"` | Schema template file path |
| `envguard.showStatusBar`| `boolean`| `true` | Show status bar health widget |

---

## 📄 License

MIT © [latrye](https://github.com/latryee/envguard)

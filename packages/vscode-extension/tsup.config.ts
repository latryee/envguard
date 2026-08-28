import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['packages/vscode-extension/src/extension.ts'],
  format: ['cjs'],
  outDir: 'packages/vscode-extension/dist',
  target: 'node18',
  clean: true,
  dts: false,
  sourcemap: true,
  external: ['vscode'],
  noExternal: ['fast-glob', 'picocolors', 'typescript']
});

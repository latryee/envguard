import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: {
      index: 'src/index.ts'
    },
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    sourcemap: true,
    splitting: false,
    minify: false,
    treeshake: true
  },
  {
    entry: {
      cli: 'src/cli/index.ts'
    },
    format: ['esm'],
    dts: false,
    clean: false,
    sourcemap: true,
    splitting: false,
    minify: false,
    banner: {
      js: '#!/usr/bin/env node'
    },
    treeshake: true
  }
]);

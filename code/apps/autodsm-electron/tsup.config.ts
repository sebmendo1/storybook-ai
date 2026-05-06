import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: { index: 'src/main/index.ts' },
    outDir: 'dist/main',
    format: ['cjs'],
    target: 'node22',
    platform: 'node',
    clean: true,
    sourcemap: true,
    external: ['electron'],
  },
  {
    entry: {
      'preview-preload': 'src/preload/preview-preload.ts',
      'manager-preload': 'src/preload/manager-preload.ts',
    },
    outDir: 'dist/preload',
    format: ['cjs'],
    target: 'node22',
    platform: 'node',
    sourcemap: true,
    external: ['electron'],
  },
]);

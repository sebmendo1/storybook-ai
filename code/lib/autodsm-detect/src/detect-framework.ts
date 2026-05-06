import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'pathe';
import type { DetectedFramework } from '@autodsm/shared';

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

const has = (pkg: PackageJson, name: string) =>
  Boolean(pkg.dependencies?.[name] ?? pkg.devDependencies?.[name]);

const hasConfigFile = (repoRoot: string, basenames: string[]) =>
  basenames.some((b) => existsSync(join(repoRoot, b)));

export const detectFramework = async (repoRoot: string): Promise<DetectedFramework> => {
  const pkgPath = join(repoRoot, 'package.json');
  if (!existsSync(pkgPath)) {
    return 'unknown';
  }

  const pkg: PackageJson = JSON.parse(await readFile(pkgPath, 'utf-8'));

  const isNext = has(pkg, 'next');
  const hasReact = has(pkg, 'react');
  const hasVite = has(pkg, 'vite') || hasConfigFile(repoRoot, ['vite.config.ts', 'vite.config.js', 'vite.config.mjs']);
  const hasWebpack = has(pkg, 'webpack') || hasConfigFile(repoRoot, ['webpack.config.ts', 'webpack.config.js', 'webpack.config.cjs']);

  if (isNext) {
    return hasVite ? 'nextjs-vite' : 'nextjs';
  }
  if (hasReact && hasVite) {
    return 'react-vite';
  }
  if (hasReact && hasWebpack) {
    return 'react-webpack5';
  }
  return 'unknown';
};

import { existsSync } from 'node:fs';
import { join } from 'pathe';
import { JsPackageManagerFactory } from 'storybook/internal/common';
import type { DetectedFramework } from '@autodsm/shared';

const hasConfigFile = (repoRoot: string, basenames: string[]): boolean =>
  basenames.some((b) => existsSync(join(repoRoot, b)));

const VITE_CONFIGS = ['vite.config.ts', 'vite.config.js', 'vite.config.mjs', 'vite.config.cts'];
const WEBPACK_CONFIGS = [
  'webpack.config.ts',
  'webpack.config.js',
  'webpack.config.cjs',
  'webpack.config.mjs',
];
const NEXT_CONFIGS = ['next.config.ts', 'next.config.js', 'next.config.mjs', 'next.config.cjs'];

export type FrameworkSignature = {
  framework: DetectedFramework;
  hasReact: boolean;
  hasNext: boolean;
  hasVite: boolean;
  hasWebpack: boolean;
};

export const detectFramework = async (repoRoot: string): Promise<DetectedFramework> => {
  const sig = await detectFrameworkSignature(repoRoot);
  return sig.framework;
};

export const detectFrameworkSignature = async (repoRoot: string): Promise<FrameworkSignature> => {
  const pkgJsonPath = join(repoRoot, 'package.json');
  if (!existsSync(pkgJsonPath)) {
    return {
      framework: 'unknown',
      hasReact: false,
      hasNext: false,
      hasVite: false,
      hasWebpack: false,
    };
  }

  let deps: Record<string, string> = {};
  try {
    const pm = JsPackageManagerFactory.getPackageManager({}, repoRoot);
    deps = pm.getAllDependencies();
  } catch {
    // Repos without a recognizable lockfile still have a package.json;
    // fall back to a direct read so detection works on freshly cloned trees.
    const { readFile } = await import('node:fs/promises');
    const pkg = JSON.parse(await readFile(pkgJsonPath, 'utf-8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
    };
    deps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
  }

  const hasReact = Boolean(deps.react);
  const hasNext = Boolean(deps.next) || hasConfigFile(repoRoot, NEXT_CONFIGS);
  const hasVite = Boolean(deps.vite) || hasConfigFile(repoRoot, VITE_CONFIGS);
  const hasWebpack = Boolean(deps.webpack) || hasConfigFile(repoRoot, WEBPACK_CONFIGS);

  let framework: DetectedFramework = 'unknown';
  if (hasNext) {
    framework = hasVite ? 'nextjs-vite' : 'nextjs';
  } else if (hasReact && hasVite) {
    framework = 'react-vite';
  } else if (hasReact && hasWebpack) {
    framework = 'react-webpack5';
  }

  return { framework, hasReact, hasNext, hasVite, hasWebpack };
};

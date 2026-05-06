import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'pathe';
import type { ToolDescriptor } from './types.ts';

type Input = { name: string };
type Output = { installed: boolean; version?: string; isDev?: boolean };

/**
 * Read-only dep inspection for Sprint 7. The MVP intentionally does NOT
 * mutate package.json or run a package manager — that's a follow-up
 * (`installDep` write path) once the ChangeSet UI surfaces dep diffs and
 * the user explicitly confirms.
 */
export const installDepTool: ToolDescriptor<Input, Output> = {
  name: 'installDep',
  description:
    'Inspect whether a dependency is already installed in the open repo. Read-only; ' +
    'does not mutate package.json or run a package manager.',
  inputSchema: {
    type: 'object',
    required: ['name'],
    properties: { name: { type: 'string', description: 'npm package name' } },
  },
  execute: async (input, ctx) => {
    const pkgPath = join(ctx.repoRoot, 'package.json');
    if (!existsSync(pkgPath)) return { installed: false };
    const pkg = JSON.parse(await readFile(pkgPath, 'utf-8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    if (pkg.dependencies?.[input.name]) {
      return { installed: true, version: pkg.dependencies[input.name], isDev: false };
    }
    if (pkg.devDependencies?.[input.name]) {
      return { installed: true, version: pkg.devDependencies[input.name], isDev: true };
    }
    return { installed: false };
  },
};

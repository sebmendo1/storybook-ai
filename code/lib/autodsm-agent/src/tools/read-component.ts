import { readFile } from 'node:fs/promises';
import { isAbsolute, resolve } from 'pathe';
import type { ToolDescriptor } from './types.ts';

type Input = { path: string };
type Output = { source: string };

export const readComponentTool: ToolDescriptor<Input, Output> = {
  name: 'readComponent',
  description: 'Read the source of a component file by absolute or repo-relative path.',
  inputSchema: {
    type: 'object',
    required: ['path'],
    properties: {
      path: { type: 'string', description: 'File path (absolute or relative to the repo root).' },
    },
  },
  execute: async (input, ctx) => {
    const abs = isAbsolute(input.path) ? input.path : resolve(ctx.repoRoot, input.path);
    if (!abs.startsWith(ctx.repoRoot)) {
      throw new Error(`readComponent refuses paths outside the open repo: ${abs}`);
    }
    const source = await readFile(abs, 'utf-8');
    return { source };
  },
};

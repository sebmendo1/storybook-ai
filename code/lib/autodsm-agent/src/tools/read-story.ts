import { readFile } from 'node:fs/promises';
import { isAbsolute, resolve } from 'pathe';
import type { ToolDescriptor } from './types.ts';

type Input = { path: string };
type Output = { source: string };

export const readStoryTool: ToolDescriptor<Input, Output> = {
  name: 'readStory',
  description: 'Read the source of a CSF story file (existing or AutoDSM-staged).',
  inputSchema: {
    type: 'object',
    required: ['path'],
    properties: { path: { type: 'string' } },
  },
  execute: async (input, ctx) => {
    const abs = isAbsolute(input.path) ? input.path : resolve(ctx.repoRoot, input.path);
    if (!abs.startsWith(ctx.repoRoot)) {
      throw new Error(`readStory refuses paths outside the open repo: ${abs}`);
    }
    const source = await readFile(abs, 'utf-8');
    return { source };
  },
};

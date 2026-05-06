import { existsSync } from 'node:fs';
import { join } from 'pathe';
import { glob } from 'tinyglobby';
import { AUTODSM_GENERATED_STORIES_DIR } from '@autodsm/shared';
import type { ToolDescriptor } from './types.ts';

type Input = Record<string, never>;
type Output = { stagedPaths: string[] };

export const listGeneratedStoriesTool: ToolDescriptor<Input, Output> = {
  name: 'listGeneratedStories',
  description: 'List all CSF story files that AutoDSM has staged for the current repo.',
  inputSchema: { type: 'object', properties: {} },
  execute: async (_input, ctx) => {
    const dir = join(ctx.repoRoot, AUTODSM_GENERATED_STORIES_DIR);
    if (!existsSync(dir)) return { stagedPaths: [] };
    const stagedPaths = await glob(['**/*.stories.{ts,tsx}'], {
      cwd: dir,
      absolute: true,
      onlyFiles: true,
    });
    return { stagedPaths: stagedPaths.sort() };
  },
};

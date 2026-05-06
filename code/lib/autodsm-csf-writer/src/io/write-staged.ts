import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, join } from 'pathe';
import { AUTODSM_GENERATED_STORIES_DIR } from '@autodsm/shared';

export type WriteStagedStoryInput = {
  repoRoot: string;
  componentSourcePath: string;
  componentName: string;
  source: string;
};

export type WriteStagedStoryResult = {
  stagedPath: string;
  relativeFromStaged: string;
};

export const computeStagedPath = (
  repoRoot: string,
  componentSourcePath: string,
  componentName: string
): string => {
  const sourceRel = relative(repoRoot, componentSourcePath);
  const dir = dirname(sourceRel);
  return join(repoRoot, AUTODSM_GENERATED_STORIES_DIR, dir, `${componentName}.stories.tsx`);
};

export const writeStagedStory = async (
  input: WriteStagedStoryInput
): Promise<WriteStagedStoryResult> => {
  const stagedPath = computeStagedPath(
    input.repoRoot,
    input.componentSourcePath,
    input.componentName
  );
  await mkdir(dirname(stagedPath), { recursive: true });
  await writeFile(stagedPath, input.source, 'utf-8');

  const relativeFromStaged = relative(dirname(stagedPath), input.componentSourcePath).replace(
    /\.(tsx|jsx|ts|js|mts|mjs|cts|cjs)$/,
    ''
  );

  return { stagedPath, relativeFromStaged };
};

import { existsSync } from 'node:fs';
import { join } from 'pathe';
import { getInterpretedFile } from 'storybook/internal/common';

export type StorybookDetection = {
  hasExistingStorybook: boolean;
  configDir: string;
  mainPath: string | null;
};

export const detectStorybook = (repoRoot: string): StorybookDetection => {
  const configDir = join(repoRoot, '.storybook');
  if (!existsSync(configDir)) {
    return { hasExistingStorybook: false, configDir, mainPath: null };
  }

  const mainPath = getInterpretedFile(join(configDir, 'main')) ?? null;
  return {
    hasExistingStorybook: Boolean(mainPath),
    configDir,
    mainPath,
  };
};

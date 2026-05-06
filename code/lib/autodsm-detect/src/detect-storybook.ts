import { existsSync } from 'node:fs';
import { join } from 'pathe';

const MAIN_EXTENSIONS = ['ts', 'mts', 'cts', 'js', 'mjs', 'cjs'];

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

  for (const ext of MAIN_EXTENSIONS) {
    const candidate = join(configDir, `main.${ext}`);
    if (existsSync(candidate)) {
      return { hasExistingStorybook: true, configDir, mainPath: candidate };
    }
  }

  return { hasExistingStorybook: false, configDir, mainPath: null };
};

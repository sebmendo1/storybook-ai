import { glob } from 'tinyglobby';
import { join, relative } from 'pathe';

const COMMON_IGNORES = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/.autodsm/**',
  '**/coverage/**',
  '**/storybook-static/**',
  '**/.cache/**',
];

const COMPONENT_PATTERNS = ['**/*.tsx', '**/*.jsx'];

const STORY_PATTERNS = [
  '**/*.stories.tsx',
  '**/*.stories.ts',
  '**/*.stories.jsx',
  '**/*.stories.js',
  '**/*.stories.mdx',
];

const STORY_EXCLUDE = ['**/*.stories.*'];

export const findComponentFiles = async (repoRoot: string): Promise<string[]> => {
  const files = await glob(COMPONENT_PATTERNS, {
    cwd: repoRoot,
    ignore: [...COMMON_IGNORES, ...STORY_EXCLUDE],
    absolute: true,
    onlyFiles: true,
    dot: false,
  });
  return files.sort();
};

export const findStoryFiles = async (repoRoot: string): Promise<string[]> => {
  const files = await glob(STORY_PATTERNS, {
    cwd: repoRoot,
    ignore: COMMON_IGNORES,
    absolute: true,
    onlyFiles: true,
    dot: false,
  });
  return files.sort();
};

export const toRelative = (repoRoot: string, abs: string): string => relative(repoRoot, abs);

export const fromRelative = (repoRoot: string, rel: string): string => join(repoRoot, rel);

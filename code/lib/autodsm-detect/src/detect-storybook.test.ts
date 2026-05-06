import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'pathe';
import { detectStorybook } from './detect-storybook.ts';

describe('detectStorybook', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'autodsm-detect-sb-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('returns hasExistingStorybook=false when .storybook is absent', () => {
    expect(detectStorybook(root)).toEqual({
      hasExistingStorybook: false,
      configDir: join(root, '.storybook'),
      mainPath: null,
    });
  });

  it('returns hasExistingStorybook=false when .storybook exists but main.* is missing', async () => {
    await mkdir(join(root, '.storybook'), { recursive: true });
    expect(detectStorybook(root)).toMatchObject({ hasExistingStorybook: false, mainPath: null });
  });

  it.each(['main.ts', 'main.js', 'main.mjs', 'main.cjs', 'main.tsx'])(
    'detects main.%s',
    async (basename) => {
      await mkdir(join(root, '.storybook'), { recursive: true });
      const mainPath = join(root, '.storybook', basename);
      await writeFile(mainPath, 'export default {};', 'utf-8');
      const result = detectStorybook(root);
      expect(result.hasExistingStorybook).toBe(true);
      expect(result.mainPath).toBe(mainPath);
    }
  );
});

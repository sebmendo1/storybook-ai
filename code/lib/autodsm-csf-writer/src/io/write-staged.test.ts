import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'pathe';
import { computeStagedPath, writeStagedStory } from './write-staged.ts';
import { AUTODSM_GENERATED_STORIES_DIR } from '@autodsm/shared';

describe('writeStagedStory', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'autodsm-stage-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('places staged stories under .autodsm/generated-stories mirroring the source path', () => {
    const path = computeStagedPath(root, join(root, 'src/Button.tsx'), 'Button');
    expect(path).toBe(join(root, AUTODSM_GENERATED_STORIES_DIR, 'src', 'Button.stories.tsx'));
  });

  it('writes the file to disk and creates intermediate directories', async () => {
    const componentSource = join(root, 'src/components/widgets/Button.tsx');
    const result = await writeStagedStory({
      repoRoot: root,
      componentSourcePath: componentSource,
      componentName: 'Button',
      source: '// hello\nexport {};\n',
    });
    expect(result.stagedPath).toContain(
      join(AUTODSM_GENERATED_STORIES_DIR, 'src', 'components', 'widgets', 'Button.stories.tsx')
    );
    expect(await readFile(result.stagedPath, 'utf-8')).toBe('// hello\nexport {};\n');
  });
});

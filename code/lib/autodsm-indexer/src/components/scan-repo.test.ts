import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'pathe';
import { scanRepo } from './scan-repo.ts';

const writeFileEnsure = async (path: string, content: string): Promise<void> => {
  await mkdir(join(path, '..'), { recursive: true });
  await writeFile(path, content, 'utf-8');
};

describe('scanRepo', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'autodsm-scan-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('discovers components, links stories, and skips ignored dirs', async () => {
    await writeFileEnsure(
      join(root, 'src/Button.tsx'),
      `interface P { label: string; }
export const Button = ({ label }: P) => <button>{label}</button>;
`
    );
    await writeFileEnsure(
      join(root, 'src/Card.tsx'),
      `interface P { title: string; }
export const Card = ({ title }: P) => <div>{title}</div>;
`
    );
    await writeFileEnsure(
      join(root, 'src/Button.stories.tsx'),
      `import { Button } from './Button';
export default { component: Button };
export const Primary = { args: { label: 'hi' } };
`
    );
    // Should be ignored:
    await writeFileEnsure(
      join(root, 'node_modules/whatever/index.tsx'),
      `export const X = () => null;`
    );
    await writeFileEnsure(
      join(root, '.autodsm/generated-stories/foo.stories.tsx'),
      `export default {};`
    );

    const result = await scanRepo({ repoRoot: root });

    expect(result.stats.componentFiles).toBe(2);
    expect(result.stats.storyFiles).toBeGreaterThanOrEqual(1);

    const button = result.components.find((c) => c.name === 'Button');
    const card = result.components.find((c) => c.name === 'Card');
    expect(button?.status).toBe('ready');
    expect(button?.storyPaths).toHaveLength(1);
    expect(card?.status).toBe('missing-story');
    expect(card?.storyPaths).toHaveLength(0);
  });

  it('returns empty results for a repo with no .tsx files', async () => {
    const result = await scanRepo({ repoRoot: root });
    expect(result.components).toEqual([]);
    expect(result.stats).toMatchObject({
      componentFiles: 0,
      storyFiles: 0,
      components: 0,
      componentsWithStories: 0,
    });
  });
});

import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'pathe';
import {
  installDepTool,
  listGeneratedStoriesTool,
  readComponentTool,
  readStoryTool,
} from './index.ts';
import { AUTODSM_GENERATED_STORIES_DIR } from '@autodsm/shared';

describe('readComponentTool', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'autodsm-tool-rc-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('reads a component file by repo-relative path', async () => {
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(join(root, 'src/Button.tsx'), `export const Button = () => null;`, 'utf-8');
    const result = await readComponentTool.execute({ path: 'src/Button.tsx' }, { repoRoot: root });
    expect(result.source).toContain('Button');
  });

  it('rejects paths outside the repo', async () => {
    await expect(
      readComponentTool.execute({ path: '/etc/passwd' }, { repoRoot: root })
    ).rejects.toThrow(/outside the open repo/);
  });
});

describe('readStoryTool', () => {
  let root: string;
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'autodsm-tool-rs-'));
  });
  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('reads a CSF story file', async () => {
    await writeFile(join(root, 'X.stories.tsx'), `export default { title: 'X' };`, 'utf-8');
    const r = await readStoryTool.execute({ path: 'X.stories.tsx' }, { repoRoot: root });
    expect(r.source).toContain('X');
  });
});

describe('listGeneratedStoriesTool', () => {
  let root: string;
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'autodsm-tool-lg-'));
  });
  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('returns [] when the staged dir does not exist', async () => {
    const r = await listGeneratedStoriesTool.execute({}, { repoRoot: root });
    expect(r.stagedPaths).toEqual([]);
  });

  it('lists staged stories under .autodsm/generated-stories', async () => {
    const dir = join(root, AUTODSM_GENERATED_STORIES_DIR, 'src');
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'A.stories.tsx'), `export default {};`, 'utf-8');
    await writeFile(join(dir, 'B.stories.tsx'), `export default {};`, 'utf-8');
    const r = await listGeneratedStoriesTool.execute({}, { repoRoot: root });
    expect(r.stagedPaths).toHaveLength(2);
  });
});

describe('installDepTool', () => {
  let root: string;
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'autodsm-tool-id-'));
  });
  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('reports installed: false when package.json is absent', async () => {
    const r = await installDepTool.execute({ name: 'react' }, { repoRoot: root });
    expect(r.installed).toBe(false);
  });

  it('finds a dependency in dependencies', async () => {
    await writeFile(
      join(root, 'package.json'),
      JSON.stringify({ name: 'x', dependencies: { react: '^18' } }),
      'utf-8'
    );
    const r = await installDepTool.execute({ name: 'react' }, { repoRoot: root });
    expect(r).toEqual({ installed: true, version: '^18', isDev: false });
  });

  it('finds a dependency in devDependencies', async () => {
    await writeFile(
      join(root, 'package.json'),
      JSON.stringify({ name: 'x', devDependencies: { vite: '^7' } }),
      'utf-8'
    );
    const r = await installDepTool.execute({ name: 'vite' }, { repoRoot: root });
    expect(r).toEqual({ installed: true, version: '^7', isDev: true });
  });
});

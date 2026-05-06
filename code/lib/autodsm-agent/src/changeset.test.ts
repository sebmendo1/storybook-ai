import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { existsSync } from 'node:fs';
import { join } from 'pathe';
import { listStagedChanges, readStagedChange, rejectStagedChange } from './changeset.ts';
import { AUTODSM_GENERATED_STORIES_DIR } from '@autodsm/shared';

describe('changeset', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'autodsm-cs-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('listStagedChanges returns [] when staged dir is absent', async () => {
    expect(await listStagedChanges(root)).toEqual([]);
  });

  it('listStagedChanges returns mtime-sorted entries', async () => {
    const dir = join(root, AUTODSM_GENERATED_STORIES_DIR);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'A.stories.tsx'), 'a', 'utf-8');
    await new Promise((r) => setTimeout(r, 10));
    await writeFile(join(dir, 'B.stories.tsx'), 'bb', 'utf-8');

    const list = await listStagedChanges(root);
    expect(list).toHaveLength(2);
    expect(list[0]!.relativePath.endsWith('B.stories.tsx')).toBe(true);
    expect(list[0]!.byteSize).toBe(2);
  });

  it('readStagedChange returns file contents', async () => {
    const dir = join(root, AUTODSM_GENERATED_STORIES_DIR);
    await mkdir(dir, { recursive: true });
    const path = join(dir, 'X.stories.tsx');
    await writeFile(path, 'hello', 'utf-8');
    expect(await readStagedChange(path)).toBe('hello');
  });

  it('rejectStagedChange deletes the file', async () => {
    const dir = join(root, AUTODSM_GENERATED_STORIES_DIR);
    await mkdir(dir, { recursive: true });
    const path = join(dir, 'X.stories.tsx');
    await writeFile(path, 'x', 'utf-8');
    await rejectStagedChange(path);
    expect(existsSync(path)).toBe(false);
  });

  it('rejectStagedChange is a no-op for missing files', async () => {
    await expect(rejectStagedChange(join(root, 'nope.stories.tsx'))).resolves.toBeUndefined();
  });
});

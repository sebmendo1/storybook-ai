import { existsSync } from 'node:fs';
import { readFile, stat, unlink } from 'node:fs/promises';
import { join, relative } from 'pathe';
import { glob } from 'tinyglobby';
import { AUTODSM_GENERATED_STORIES_DIR } from '@autodsm/shared';

export type StagedChange = {
  stagedPath: string;
  /** Path relative to repo root, suitable for UI display. */
  relativePath: string;
  /** Source bytes (lazy-readable via getSource). */
  byteSize: number;
  /** mtime in ms. */
  mtimeMs: number;
};

export const listStagedChanges = async (repoRoot: string): Promise<StagedChange[]> => {
  const dir = join(repoRoot, AUTODSM_GENERATED_STORIES_DIR);
  if (!existsSync(dir)) return [];

  const stagedPaths = await glob(['**/*.stories.{ts,tsx}'], {
    cwd: dir,
    absolute: true,
    onlyFiles: true,
  });

  const changes: StagedChange[] = [];
  for (const stagedPath of stagedPaths) {
    try {
      const s = await stat(stagedPath);
      changes.push({
        stagedPath,
        relativePath: relative(repoRoot, stagedPath),
        byteSize: s.size,
        mtimeMs: s.mtimeMs,
      });
    } catch {
      // file vanished between glob and stat — skip
    }
  }

  changes.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return changes;
};

export const readStagedChange = async (stagedPath: string): Promise<string> =>
  readFile(stagedPath, 'utf-8');

export const rejectStagedChange = async (stagedPath: string): Promise<void> => {
  if (!existsSync(stagedPath)) return;
  await unlink(stagedPath);
};

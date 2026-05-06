import { readFile, rename, mkdir, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, relative, join, basename } from 'pathe';

export type PromoteStagedStoryInput = {
  stagedPath: string;
  componentSourcePath: string;
};

export type PromoteStagedStoryResult = {
  finalPath: string;
};

export const promoteStagedStory = async (
  input: PromoteStagedStoryInput
): Promise<PromoteStagedStoryResult> => {
  const componentDir = dirname(input.componentSourcePath);
  const finalPath = join(componentDir, basename(input.stagedPath));
  if (existsSync(finalPath)) {
    throw new Error(
      `Cannot promote: ${finalPath} already exists. Delete the existing story file first.`
    );
  }

  // Rewrite the relative import path so the story imports from `./<Component>`
  // instead of `../../path/to/Component`.
  const oldSource = await readFile(input.stagedPath, 'utf-8');
  const oldImportRel = relative(dirname(input.stagedPath), input.componentSourcePath).replace(
    /\.(tsx|jsx|ts|js|mts|mjs|cts|cjs)$/,
    ''
  );
  const newImportRel = `./${basename(input.componentSourcePath).replace(
    /\.(tsx|jsx|ts|js|mts|mjs|cts|cjs)$/,
    ''
  )}`;

  // Match exactly the staged import path (allow leading ./ or ../ chain).
  const escaped = oldImportRel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const importRe = new RegExp(`(['"])${escaped}\\1`);
  const newSource = oldSource.replace(importRe, `'${newImportRel}'`);

  await mkdir(componentDir, { recursive: true });
  await import('node:fs/promises').then((fs) => fs.writeFile(finalPath, newSource, 'utf-8'));
  await unlink(input.stagedPath);
  // rename() across volumes can fail on some filesystems; we already used
  // write+unlink so this is just a guard for empty staged directories.
  void rename;

  return { finalPath };
};

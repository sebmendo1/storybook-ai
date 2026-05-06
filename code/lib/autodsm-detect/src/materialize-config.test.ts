import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'pathe';
import { materializeConfig, ensureGitignore } from './materialize-config.ts';
import { AUTODSM_STORYBOOK_DIR } from '@autodsm/shared';

describe('materializeConfig', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'autodsm-mat-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('writes main.ts and gitignore on first run', async () => {
    const result = await materializeConfig(root, 'react-vite');
    expect(result.created).toBe(true);
    expect(result.mainPath).toBe(join(root, AUTODSM_STORYBOOK_DIR, 'main.ts'));
    const main = await readFile(result.mainPath, 'utf-8');
    expect(main).toContain("framework: '@storybook/react-vite'");
    expect(main).toContain("addons: ['@autodsm/preset']");
    expect(main).toContain('.autodsm/generated-stories');
    expect(existsSync(join(root, '.gitignore'))).toBe(true);
  });

  it('is idempotent — re-running does not overwrite', async () => {
    const first = await materializeConfig(root, 'react-vite');
    const sentinel = '/* preserve me */';
    await writeFile(first.mainPath, sentinel, 'utf-8');
    const second = await materializeConfig(root, 'react-vite');
    expect(second.created).toBe(false);
    expect(await readFile(second.mainPath, 'utf-8')).toBe(sentinel);
  });

  it.each(['react-vite', 'react-webpack5', 'nextjs', 'nextjs-vite'] as const)(
    'renders correct framework package for %s',
    async (fw) => {
      const result = await materializeConfig(root, fw);
      const main = await readFile(result.mainPath, 'utf-8');
      const expected: Record<typeof fw, string> = {
        'react-vite': '@storybook/react-vite',
        'react-webpack5': '@storybook/react-webpack5',
        nextjs: '@storybook/nextjs',
        'nextjs-vite': '@storybook/nextjs-vite',
      };
      expect(main).toContain(`framework: '${expected[fw]}'`);
    }
  );
});

describe('ensureGitignore', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'autodsm-gi-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('creates .gitignore when missing', async () => {
    await ensureGitignore(root);
    expect(await readFile(join(root, '.gitignore'), 'utf-8')).toBe('.autodsm/\n');
  });

  it('does not duplicate when .autodsm/ is already present', async () => {
    await writeFile(join(root, '.gitignore'), 'node_modules/\n.autodsm/\n', 'utf-8');
    await ensureGitignore(root);
    const after = await readFile(join(root, '.gitignore'), 'utf-8');
    expect(after.match(/\.autodsm\//g)?.length).toBe(1);
  });

  it('treats ".autodsm" (no slash) as already-present and skips', async () => {
    await writeFile(join(root, '.gitignore'), 'node_modules/\n.autodsm\n', 'utf-8');
    await ensureGitignore(root);
    expect(await readFile(join(root, '.gitignore'), 'utf-8')).toBe('node_modules/\n.autodsm\n');
  });

  it('appends with a leading newline when file lacks trailing newline', async () => {
    await writeFile(join(root, '.gitignore'), 'node_modules/', 'utf-8');
    await ensureGitignore(root);
    expect(await readFile(join(root, '.gitignore'), 'utf-8')).toBe('node_modules/\n.autodsm/\n');
  });
});

import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'pathe';
import { detectFramework, detectFrameworkSignature } from './detect-framework.ts';

const writePkg = async (
  root: string,
  deps: Record<string, string>,
  devDeps: Record<string, string> = {}
): Promise<void> => {
  await writeFile(
    join(root, 'package.json'),
    JSON.stringify({ name: 'fixture', dependencies: deps, devDependencies: devDeps }, null, 2),
    'utf-8'
  );
};

describe('detectFramework', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'autodsm-detect-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('returns "unknown" when there is no package.json', async () => {
    expect(await detectFramework(root)).toBe('unknown');
  });

  it('detects react-vite from deps', async () => {
    await writePkg(root, { react: '^18', 'react-dom': '^18' }, { vite: '^7' });
    expect(await detectFramework(root)).toBe('react-vite');
  });

  it('detects react-webpack5 from deps', async () => {
    await writePkg(root, { react: '^18' }, { webpack: '^5' });
    expect(await detectFramework(root)).toBe('react-webpack5');
  });

  it('detects nextjs from deps (no vite)', async () => {
    await writePkg(root, { next: '^15', react: '^18' });
    expect(await detectFramework(root)).toBe('nextjs');
  });

  it('detects nextjs-vite when next + vite are both present', async () => {
    await writePkg(root, { next: '^15', react: '^18' }, { vite: '^7' });
    expect(await detectFramework(root)).toBe('nextjs-vite');
  });

  it('detects vite from a vite.config file even without dep', async () => {
    await writePkg(root, { react: '^18' });
    await writeFile(join(root, 'vite.config.ts'), 'export default {};', 'utf-8');
    expect(await detectFramework(root)).toBe('react-vite');
  });

  it('detects next from a next.config file even without dep', async () => {
    await writePkg(root, { react: '^18' });
    await writeFile(join(root, 'next.config.js'), 'module.exports = {};', 'utf-8');
    expect(await detectFramework(root)).toBe('nextjs');
  });

  it('returns "unknown" for a non-React, non-Next repo', async () => {
    await writePkg(root, { vue: '^3' });
    expect(await detectFramework(root)).toBe('unknown');
  });

  it('exposes the full signature for diagnostics', async () => {
    await writePkg(root, { next: '^15', react: '^18' }, { vite: '^7' });
    const sig = await detectFrameworkSignature(root);
    expect(sig).toMatchObject({
      framework: 'nextjs-vite',
      hasReact: true,
      hasNext: true,
      hasVite: true,
    });
  });

  it('handles a nested workspace package.json without crashing', async () => {
    // No lockfile → JsPackageManagerFactory may throw; fallback to direct read.
    await mkdir(join(root, 'packages/app'), { recursive: true });
    await writePkg(join(root, 'packages/app'), { react: '^18' }, { vite: '^7' });
    expect(await detectFramework(join(root, 'packages/app'))).toBe('react-vite');
  });
});

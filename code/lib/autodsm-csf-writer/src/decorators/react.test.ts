import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'pathe';
import { detectProvider } from './react.ts';

describe('detectProvider', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'autodsm-prov-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('returns null when no providers file exists', async () => {
    expect(await detectProvider(root)).toBeNull();
  });

  it('detects a named export at src/providers.tsx', async () => {
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(
      join(root, 'src/providers.tsx'),
      `import * as React from 'react';
export const Providers = ({ children }: { children: React.ReactNode }) => <>{children}</>;
`,
      'utf-8'
    );
    const result = await detectProvider(root);
    expect(result).not.toBeNull();
    expect(result?.exportName).toBe('Providers');
    expect(result?.isDefault).toBe(false);
    expect(result?.filePath).toBe('src/providers.tsx');
  });

  it('detects a default export at app/providers.tsx', async () => {
    await mkdir(join(root, 'app'), { recursive: true });
    await writeFile(
      join(root, 'app/providers.tsx'),
      `import * as React from 'react';
export default function AppProviders({ children }) { return children; }
`,
      'utf-8'
    );
    const result = await detectProvider(root);
    expect(result?.isDefault).toBe(true);
    expect(result?.exportName).toBe('AppProviders');
  });

  it('prefers src/providers.tsx over app/providers.tsx when both exist', async () => {
    await mkdir(join(root, 'src'), { recursive: true });
    await mkdir(join(root, 'app'), { recursive: true });
    await writeFile(
      join(root, 'src/providers.tsx'),
      `export const SrcProviders = (p) => p.children;`,
      'utf-8'
    );
    await writeFile(
      join(root, 'app/providers.tsx'),
      `export const AppProviders = (p) => p.children;`,
      'utf-8'
    );
    const result = await detectProvider(root);
    expect(result?.exportName).toBe('SrcProviders');
  });
});

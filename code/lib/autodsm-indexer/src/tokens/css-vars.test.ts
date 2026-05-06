import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'pathe';
import { extractCssVars } from './css-vars.ts';

describe('extractCssVars', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'autodsm-css-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('extracts and categorizes CSS custom properties', async () => {
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(
      join(root, 'src/theme.css'),
      `:root {
  --color-primary: #5b3df0;
  --space-1: 4px;
  --space-2: 8px;
  --radius-md: 6px;
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.1);
  --font-size-base: 14px;
  --duration-fast: 120ms;
  --breakpoint-md: 768px;
  --semantic-bg: var(--color-bg);
}
`,
      'utf-8'
    );

    const tokens = await extractCssVars(root);
    const byName = Object.fromEntries(tokens.map((t) => [t.name, t]));
    expect(byName['color-primary']?.category).toBe('color');
    expect(byName['space-1']?.category).toBe('spacing');
    expect(byName['radius-md']?.category).toBe('radius');
    expect(byName['shadow-sm']?.category).toBe('shadow');
    expect(byName['font-size-base']?.category).toBe('typography');
    expect(byName['duration-fast']?.category).toBe('motion');
    expect(byName['breakpoint-md']?.category).toBe('breakpoint');
    expect(byName['semantic-bg']?.category).toBe('semantic');
    expect(tokens.every((t) => t.source === 'css-vars')).toBe(true);
  });

  it('skips ignored directories', async () => {
    await mkdir(join(root, 'node_modules/foo'), { recursive: true });
    await writeFile(join(root, 'node_modules/foo/x.css'), `:root { --leak: red; }`);
    expect(await extractCssVars(root)).toEqual([]);
  });
});

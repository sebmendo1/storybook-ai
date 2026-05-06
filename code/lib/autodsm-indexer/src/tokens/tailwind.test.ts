import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'pathe';
import { extractTailwindTokens } from './tailwind.ts';

describe('extractTailwindTokens', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'autodsm-tw-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('returns [] when no tailwind config is present', async () => {
    expect(await extractTailwindTokens(root)).toEqual([]);
  });

  it('extracts colors, spacing, radius from a static tailwind.config.js', async () => {
    await writeFile(
      join(root, 'tailwind.config.js'),
      `module.exports = {
  theme: {
    colors: {
      'primary': '#5b3df0',
      'accent': '#9b8cff'
    },
    spacing: {
      '1': '4px',
      '2': '8px'
    },
    borderRadius: {
      'sm': '4px',
      'md': '6px'
    }
  }
};`,
      'utf-8'
    );

    const tokens = await extractTailwindTokens(root);
    const names = tokens.map((t) => t.name);
    expect(names).toContain('colors.primary');
    expect(names).toContain('colors.accent');
    expect(names).toContain('spacing.1');
    expect(names).toContain('borderRadius.md');
    const primary = tokens.find((t) => t.name === 'colors.primary');
    expect(primary?.value).toBe('#5b3df0');
    expect(primary?.category).toBe('color');
    expect(tokens.every((t) => t.source === 'tailwind')).toBe(true);
  });
});

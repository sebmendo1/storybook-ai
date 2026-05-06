import { readFile } from 'node:fs/promises';
import { glob } from 'tinyglobby';
import type { TokenCategory, TokenEntry } from '../types.ts';

const DECL_RE = /--([a-z0-9_-]+)\s*:\s*([^;]+);/gi;

const COMMON_IGNORES = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/.autodsm/**',
  '**/coverage/**',
  '**/storybook-static/**',
];

const STYLE_PATTERNS = ['**/*.css', '**/*.scss', '**/*.sass'];

const categorize = (name: string, value: string): TokenCategory => {
  const n = name.toLowerCase();
  const v = value.toLowerCase().trim();
  if (n.includes('color') || /^#|^rgb|^hsl|^oklch|^oklab/.test(v)) return 'color';
  if (n.includes('font') || n.includes('text') || n.includes('typography')) return 'typography';
  if (n.includes('space') || n.includes('spacing') || n.includes('gap')) return 'spacing';
  if (n.includes('radius') || n.includes('rounded')) return 'radius';
  if (n.includes('shadow')) return 'shadow';
  if (n.includes('motion') || n.includes('duration') || n.includes('transition')) return 'motion';
  if (n.includes('breakpoint') || n.includes('screen')) return 'breakpoint';
  return 'semantic';
};

export const extractCssVars = async (repoRoot: string): Promise<TokenEntry[]> => {
  const files = await glob(STYLE_PATTERNS, {
    cwd: repoRoot,
    ignore: COMMON_IGNORES,
    absolute: true,
    onlyFiles: true,
  });

  const seen = new Map<string, TokenEntry>();

  for (const file of files) {
    let src: string;
    try {
      src = await readFile(file, 'utf-8');
    } catch {
      continue;
    }

    for (const match of src.matchAll(DECL_RE)) {
      const name = match[1]!.trim();
      const value = match[2]!.trim();
      if (seen.has(name)) continue;
      seen.set(name, {
        name,
        value,
        category: categorize(name, value),
        source: 'css-vars',
        usedBy: [],
      });
    }
  }

  return Array.from(seen.values());
};

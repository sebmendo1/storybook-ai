import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'pathe';
import type { TokenCategory, TokenEntry } from '../types.ts';

const CONFIG_NAMES = [
  'tailwind.config.ts',
  'tailwind.config.js',
  'tailwind.config.mjs',
  'tailwind.config.cjs',
];

const BLOCK_RE = (key: string) => new RegExp(`${key}\\s*:\\s*\\{([\\s\\S]*?)\\n\\s*\\}`, 'g');

const ENTRY_RE = /['"]?([\w.-]+)['"]?\s*:\s*['"]([^'"\n]+)['"]/g;

const categoryFor = (key: string): TokenCategory => {
  const k = key.toLowerCase();
  if (k.includes('color')) return 'color';
  if (k.includes('font')) return 'typography';
  if (k.includes('spacing') || k === 'gap' || k === 'padding' || k === 'margin') return 'spacing';
  if (k.includes('radius') || k.includes('rounded')) return 'radius';
  if (k.includes('shadow')) return 'shadow';
  if (k.includes('transition') || k.includes('duration') || k.includes('ease')) return 'motion';
  if (k.includes('screen') || k.includes('breakpoint')) return 'breakpoint';
  return 'semantic';
};

const findConfig = (repoRoot: string): string | null => {
  for (const name of CONFIG_NAMES) {
    const candidate = join(repoRoot, name);
    if (existsSync(candidate)) return candidate;
  }
  return null;
};

/**
 * Light-touch parser. We do NOT execute the user's tailwind.config.ts (that
 * would require a JS sandbox and TS support); instead we extract simple
 * `key: 'value'` entries from common theme blocks. This catches the
 * 80% case of static color/spacing/radius palettes. Anything that requires
 * actually running JS (`.extend({ colors: { ... } })`, function-form configs)
 * gets skipped — Sprint 4+ will swap this for a real loader.
 */
export const extractTailwindTokens = async (repoRoot: string): Promise<TokenEntry[]> => {
  const configPath = findConfig(repoRoot);
  if (!configPath) return [];

  let src: string;
  try {
    src = await readFile(configPath, 'utf-8');
  } catch {
    return [];
  }

  const out: TokenEntry[] = [];
  const seen = new Set<string>();
  const blocks = [
    'colors',
    'spacing',
    'borderRadius',
    'fontSize',
    'fontFamily',
    'boxShadow',
    'screens',
  ];

  for (const blockKey of blocks) {
    const blockRe = BLOCK_RE(blockKey);
    for (const block of src.matchAll(blockRe)) {
      const body = block[1]!;
      for (const entry of body.matchAll(ENTRY_RE)) {
        const name = `${blockKey}.${entry[1]!}`;
        if (seen.has(name)) continue;
        seen.add(name);
        out.push({
          name,
          value: entry[2]!,
          category: categoryFor(blockKey),
          source: 'tailwind',
          usedBy: [],
        });
      }
    }
  }

  return out;
};

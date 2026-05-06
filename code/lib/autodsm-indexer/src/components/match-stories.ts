import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'pathe';

const IMPORT_RE = /(?:^|\n)\s*import\s+(?:[\s\S]*?)\s+from\s+['"]([^'"]+)['"];?/g;
const COMPONENT_REL_RE = /^\.{1,2}\//;

const RESOLVE_EXTS = [
  '.tsx',
  '.jsx',
  '.ts',
  '.js',
  '/index.tsx',
  '/index.jsx',
  '/index.ts',
  '/index.js',
];

const tryResolve = async (storyDir: string, importPath: string): Promise<string | null> => {
  const base = resolve(storyDir, importPath);
  const candidates = [base, ...RESOLVE_EXTS.map((e) => `${base}${e}`)];
  for (const c of candidates) {
    try {
      const { stat } = await import('node:fs/promises');
      const s = await stat(c);
      if (s.isFile()) return c;
    } catch {
      // try next
    }
  }
  return null;
};

export type StoryComponentLink = {
  storyPath: string;
  componentPath: string;
};

export const linkStoriesToComponents = async (
  storyPaths: string[]
): Promise<Map<string, string[]>> => {
  const componentToStories = new Map<string, string[]>();

  for (const storyPath of storyPaths) {
    let src: string;
    try {
      src = await readFile(storyPath, 'utf-8');
    } catch {
      continue;
    }
    const storyDir = dirname(storyPath);

    for (const match of src.matchAll(IMPORT_RE)) {
      const importPath = match[1]!;
      if (!COMPONENT_REL_RE.test(importPath)) continue;

      const resolved = await tryResolve(storyDir, importPath);
      if (!resolved) continue;
      // Skip self-referential .stories imports.
      if (/\.stories\.[a-z]+$/.test(resolved)) continue;

      const list = componentToStories.get(resolved) ?? [];
      if (!list.includes(storyPath)) list.push(storyPath);
      componentToStories.set(resolved, list);
    }
  }

  return componentToStories;
};

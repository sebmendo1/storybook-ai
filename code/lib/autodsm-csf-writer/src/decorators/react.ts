import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join, relative } from 'pathe';
import { types as t } from 'storybook/internal/babel';

const CANDIDATE_PROVIDER_PATHS = [
  'src/providers.tsx',
  'src/providers.ts',
  'src/components/providers.tsx',
  'src/app/providers.tsx',
  'app/providers.tsx',
  'app/providers.ts',
  'providers.tsx',
];

const NAME_RE = /export\s+(?:const|function|default(?:\s+function)?)?\s*([A-Z][A-Za-z0-9_]*)\b/;

export type DetectedProvider = {
  /** Relative path (from repo root) to the file exporting the provider. */
  filePath: string;
  /** Exported name to import. */
  exportName: string;
  /** True if it's the default export. */
  isDefault: boolean;
};

export const detectProvider = async (repoRoot: string): Promise<DetectedProvider | null> => {
  for (const candidate of CANDIDATE_PROVIDER_PATHS) {
    const abs = join(repoRoot, candidate);
    if (!existsSync(abs)) continue;

    try {
      const src = await readFile(abs, 'utf-8');
      const isDefault = /export\s+default\s+/.test(src);

      let exportName = 'Providers';
      const namedMatch = src.match(/export\s+(?:const|function|class)\s+([A-Z][A-Za-z0-9_]*)/);
      if (namedMatch) {
        exportName = namedMatch[1]!;
      } else {
        const fallback = src.match(NAME_RE);
        if (fallback) exportName = fallback[1]!;
      }

      return { filePath: candidate, exportName, isDefault };
    } catch {
      continue;
    }
  }
  return null;
};

const stripExt = (filename: string): string =>
  filename.replace(/\.(tsx|jsx|ts|js|mts|mjs|cts|cjs)$/, '');

/**
 * Builds a decorator entry that wraps the story in the detected Provider:
 *
 *   (Story) => <Providers><Story /></Providers>
 */
export const buildProviderDecoratorEntry = (componentName: string): t.ArrowFunctionExpression => {
  const storyParam = t.identifier('Story');
  const wrapper = t.jsxElement(
    t.jsxOpeningElement(t.jsxIdentifier(componentName), []),
    t.jsxClosingElement(t.jsxIdentifier(componentName)),
    [t.jsxElement(t.jsxOpeningElement(t.jsxIdentifier('Story'), [], true), null, [], true)]
  );
  return t.arrowFunctionExpression([storyParam], wrapper);
};

export const buildProviderImport = (
  provider: DetectedProvider,
  stagedPath: string,
  repoRoot: string
): t.ImportDeclaration => {
  const absoluteProviderPath = join(repoRoot, provider.filePath);
  const rel = relative(dirname(stagedPath), absoluteProviderPath);
  const importPath = stripExt(rel.startsWith('.') ? rel : `./${rel}`);

  if (provider.isDefault) {
    return t.importDeclaration(
      [t.importDefaultSpecifier(t.identifier(provider.exportName))],
      t.stringLiteral(importPath)
    );
  }
  return t.importDeclaration(
    [t.importSpecifier(t.identifier(provider.exportName), t.identifier(provider.exportName))],
    t.stringLiteral(importPath)
  );
};

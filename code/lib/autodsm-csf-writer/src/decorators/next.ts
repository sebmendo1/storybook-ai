import { readFile } from 'node:fs/promises';
import { sep } from 'node:path';
import { types as t } from 'storybook/internal/babel';

export type NextRouterMode = 'app' | 'pages';

const APP_IMPORTS = ['next/navigation', 'next/headers', 'next/cache'];
const PAGES_IMPORTS = ['next/router'];

/**
 * Heuristic detection: prefer a path-based signal first (most reliable for
 * Next 13+ apps), then fall back to scanning the component's imports.
 * Defaults to `app` for ambiguous cases since that's the modern default.
 */
export const detectNextRouterMode = async (
  componentSourcePath: string
): Promise<NextRouterMode> => {
  const segments = componentSourcePath.split(sep);
  if (segments.includes('app')) return 'app';
  if (segments.includes('pages')) return 'pages';

  try {
    const src = await readFile(componentSourcePath, 'utf-8');
    if (PAGES_IMPORTS.some((p) => src.includes(`from '${p}'`) || src.includes(`from "${p}"`))) {
      return 'pages';
    }
    if (APP_IMPORTS.some((p) => src.includes(`from '${p}'`) || src.includes(`from "${p}"`))) {
      return 'app';
    }
  } catch {
    // ignore
  }
  return 'app';
};

/**
 * Builds the `parameters: { nextjs: { appDirectory: bool, navigation?: {...} } }`
 * AST fragment that the @storybook/nextjs framework reads to wire mocks.
 */
export const buildNextParameters = (mode: NextRouterMode): t.ObjectProperty => {
  const nextjsObject = t.objectExpression([
    t.objectProperty(t.identifier('appDirectory'), t.booleanLiteral(mode === 'app')),
  ]);
  return t.objectProperty(
    t.identifier('parameters'),
    t.objectExpression([t.objectProperty(t.identifier('nextjs'), nextjsObject)])
  );
};

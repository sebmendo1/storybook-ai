import type { TokenSet } from '../types.ts';
import { extractCssVars } from './css-vars.ts';
import { extractTailwindTokens } from './tailwind.ts';
import { extractThemeObjectTokens } from './theme-objects.ts';

export { extractCssVars } from './css-vars.ts';
export { extractTailwindTokens } from './tailwind.ts';
export { extractThemeObjectTokens } from './theme-objects.ts';

export const extractTokens = async (repoRoot: string): Promise<TokenSet> => {
  const [cssVars, tailwind, theme] = await Promise.all([
    extractCssVars(repoRoot),
    extractTailwindTokens(repoRoot),
    extractThemeObjectTokens(repoRoot),
  ]);
  return { entries: [...cssVars, ...tailwind, ...theme] };
};

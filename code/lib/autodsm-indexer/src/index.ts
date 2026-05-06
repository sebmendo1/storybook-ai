export type {
  DiscoveredComponent,
  TokenSet,
  TokenEntry,
  ComponentStatus,
  TokenCategory,
} from './types.ts';

export { scanRepo, type ScanRepoOptions, type ScanRepoResult } from './components/scan-repo.ts';
export { findComponentFiles, findStoryFiles } from './components/find-files.ts';
export {
  parseComponentFile,
  type ParsedComponent,
  type ParsedProp,
} from './components/parse-component.ts';
export { linkStoriesToComponents } from './components/match-stories.ts';

export {
  extractTokens,
  extractCssVars,
  extractTailwindTokens,
  extractThemeObjectTokens,
} from './tokens/index.ts';

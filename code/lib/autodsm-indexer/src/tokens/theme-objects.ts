import type { TokenEntry } from '../types.ts';

// Theme-object scanning is deferred to a later sprint where we have a real
// TS loader (e.g. evaluating user code in a sandboxed worker). Sprint 3 ships
// a stub returning [] so the public surface is stable.

export const extractThemeObjectTokens = async (_repoRoot: string): Promise<TokenEntry[]> => [];

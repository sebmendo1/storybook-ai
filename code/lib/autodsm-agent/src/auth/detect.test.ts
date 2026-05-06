import { describe, expect, it } from 'vitest';
import { detectAuth, ALL_KINDS } from './detect.ts';
import type { AuthKind } from '@autodsm/shared';

describe('detectAuth', () => {
  it('returns "bedrock" when CLAUDE_CODE_USE_BEDROCK is set', async () => {
    const result = await detectAuth({
      env: { CLAUDE_CODE_USE_BEDROCK: '1' },
      skipClaudeProbe: true,
    });
    expect(result.kind).toBe('bedrock');
  });

  it('returns "vertex" when CLAUDE_CODE_USE_VERTEX is set', async () => {
    const result = await detectAuth({
      env: { CLAUDE_CODE_USE_VERTEX: '1' },
      skipClaudeProbe: true,
    });
    expect(result.kind).toBe('vertex');
  });

  it('returns "api-key" when ANTHROPIC_API_KEY is set and no claude probe succeeds', async () => {
    const result = await detectAuth({
      env: { ANTHROPIC_API_KEY: 'sk-test' },
      skipClaudeProbe: true,
    });
    expect(result.kind).toBe('api-key');
  });

  it('returns "oauth-token" when CLAUDE_CODE_OAUTH_TOKEN is set', async () => {
    const result = await detectAuth({
      env: { CLAUDE_CODE_OAUTH_TOKEN: 't0ken' },
      skipClaudeProbe: true,
    });
    expect(result.kind).toBe('oauth-token');
  });

  it('returns "none" when no env vars are set and probe is skipped', async () => {
    const result = await detectAuth({ env: {}, skipClaudeProbe: true });
    expect(result.kind).toBe('none');
  });

  it('prefers Bedrock over ANTHROPIC_API_KEY when both are set', async () => {
    const result = await detectAuth({
      env: { CLAUDE_CODE_USE_BEDROCK: '1', ANTHROPIC_API_KEY: 'sk-test' },
      skipClaudeProbe: true,
    });
    expect(result.kind).toBe('bedrock');
  });

  it('exports a complete kind list for UI rendering', () => {
    const expected: AuthKind[] = [
      'subscription',
      'api-key',
      'oauth-token',
      'bedrock',
      'vertex',
      'none',
    ];
    expect(ALL_KINDS).toEqual(expected);
  });
});

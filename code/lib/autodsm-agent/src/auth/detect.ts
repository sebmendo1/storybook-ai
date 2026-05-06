import { spawn } from 'node:child_process';
import type { AuthKind, AuthStatus } from '@autodsm/shared';

export type DetectAuthOptions = {
  /** Override `process.env` for testing. */
  env?: NodeJS.ProcessEnv;
  /** Timeout for each `claude` subprocess probe. */
  probeTimeoutMs?: number;
  /** Skip the live `claude` probe (tests can pass a mock). */
  skipClaudeProbe?: boolean;
};

const exec = (
  cmd: string,
  args: string[],
  env: NodeJS.ProcessEnv,
  timeoutMs: number
): Promise<{ code: number; stdout: string; stderr: string }> =>
  new Promise((resolve) => {
    const child = spawn(cmd, args, { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolve({ code: 124, stdout, stderr });
    }, timeoutMs);
    child.stdout.on('data', (b: Buffer) => {
      stdout += b.toString();
    });
    child.stderr.on('data', (b: Buffer) => {
      stderr += b.toString();
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, stdout, stderr });
    });
    child.on('error', () => {
      clearTimeout(timer);
      resolve({ code: 127, stdout, stderr });
    });
  });

export const detectAuth = async (options: DetectAuthOptions = {}): Promise<AuthStatus> => {
  const env = options.env ?? process.env;
  const timeoutMs = options.probeTimeoutMs ?? 4000;

  // Enterprise routing wins outright — Claude Code sends requests through
  // Bedrock/Vertex/Foundry regardless of how the user authenticated locally.
  if (env.CLAUDE_CODE_USE_BEDROCK) {
    return { kind: 'bedrock', readable: 'AWS Bedrock (CLAUDE_CODE_USE_BEDROCK)' };
  }
  if (env.CLAUDE_CODE_USE_VERTEX) {
    return { kind: 'vertex', readable: 'GCP Vertex (CLAUDE_CODE_USE_VERTEX)' };
  }

  // Live probe: prefer the local `claude` CLI's authenticated session so all
  // billing flows through the user's Claude Code plan. We never read
  // ~/.claude/.credentials.json or any subscription OAuth material — that's
  // a TOS violation for third-party apps.
  if (!options.skipClaudeProbe) {
    const version = await exec('claude', ['--version'], env, timeoutMs);
    if (version.code === 0) {
      const versionString = version.stdout.trim() || undefined;
      const status = await exec('claude', ['auth', 'status'], env, timeoutMs);
      if (status.code === 0) {
        return {
          kind: 'subscription',
          readable: 'Claude Code · subscription',
          version: versionString,
        };
      }
    }
  }

  // Env-var fallbacks if the local CLI is unauthenticated or unavailable.
  if (env.ANTHROPIC_API_KEY) {
    return { kind: 'api-key', readable: 'API key (ANTHROPIC_API_KEY)' };
  }
  if (env.CLAUDE_CODE_OAUTH_TOKEN) {
    return { kind: 'oauth-token', readable: 'OAuth token (CLAUDE_CODE_OAUTH_TOKEN)' };
  }

  return { kind: 'none', readable: 'No Claude credentials detected' };
};

export const isAuthAvailable = (status: AuthStatus): boolean => status.kind !== 'none';

export const supportsSubprocess = (status: AuthStatus): boolean =>
  status.kind === 'subscription' || status.kind === 'oauth-token';

export const ALL_KINDS: AuthKind[] = [
  'subscription',
  'api-key',
  'oauth-token',
  'bedrock',
  'vertex',
  'none',
];

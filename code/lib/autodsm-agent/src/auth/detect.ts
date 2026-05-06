import { spawn } from 'node:child_process';
import type { AuthKind, AuthStatus } from '@autodsm/shared';

const env = process.env;

const exec = (cmd: string, args: string[], timeoutMs = 4000): Promise<{ code: number; stdout: string; stderr: string }> =>
  new Promise((resolve) => {
    const child = spawn(cmd, args, { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolve({ code: 124, stdout, stderr });
    }, timeoutMs);
    child.stdout.on('data', (b) => {
      stdout += b.toString();
    });
    child.stderr.on('data', (b) => {
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

export const detectAuth = async (): Promise<AuthStatus> => {
  if (env.CLAUDE_CODE_USE_BEDROCK) {
    return makeStatus('bedrock', 'AWS Bedrock (CLAUDE_CODE_USE_BEDROCK)');
  }
  if (env.CLAUDE_CODE_USE_VERTEX) {
    return makeStatus('vertex', 'GCP Vertex (CLAUDE_CODE_USE_VERTEX)');
  }

  const version = await exec('claude', ['--version']);
  if (version.code === 0) {
    const versionString = version.stdout.trim();
    const status = await exec('claude', ['auth', 'status']);
    if (status.code === 0) {
      return makeStatus('subscription', 'Claude Code · subscription', versionString);
    }
  }

  if (env.ANTHROPIC_API_KEY) {
    return makeStatus('api-key', 'API key (ANTHROPIC_API_KEY)');
  }
  if (env.CLAUDE_CODE_OAUTH_TOKEN) {
    return makeStatus('oauth-token', 'OAuth token (CLAUDE_CODE_OAUTH_TOKEN)');
  }

  return makeStatus('none', 'No Claude credentials detected');
};

const makeStatus = (kind: AuthKind, readable: string, version?: string): AuthStatus => ({
  kind,
  readable,
  version,
});

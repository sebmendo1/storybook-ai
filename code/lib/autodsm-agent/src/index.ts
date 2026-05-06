export {
  detectAuth,
  isAuthAvailable,
  supportsSubprocess,
  ALL_KINDS,
  type DetectAuthOptions,
} from './auth/detect.ts';
export type { AuthStatus, AuthKind } from '@autodsm/shared';

export { StreamJsonParser, type StreamEvent } from './runtime/stream-parser.ts';

export {
  spawnClaude,
  type ClaudeSubprocessOptions,
  type ClaudeSubprocessHandle,
} from './runtime/subprocess.ts';

export {
  callAnthropicApi,
  type ApiFallbackOptions,
  type ApiFallbackHandle,
} from './runtime/api-fallback.ts';

export {
  sessionDir,
  sessionFile,
  newSessionId,
  ensureSessionDir,
  appendEntry,
  readSession,
  listSessions,
  type SessionLogEntry,
} from './sessions.ts';

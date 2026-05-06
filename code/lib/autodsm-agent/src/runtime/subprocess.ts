import { spawn, type ChildProcess } from 'node:child_process';
import { StreamJsonParser, type StreamEvent } from './stream-parser.ts';

export type ClaudeSubprocessOptions = {
  prompt: string;
  /** Working directory for the spawned `claude`. */
  cwd?: string;
  /** Override `process.env`. */
  env?: NodeJS.ProcessEnv;
  /** Override the binary name (testing / Windows shim). */
  binary?: string;
  /** Optional model override; passes `--model <id>` to the CLI. */
  model?: string;
  /** Comma-separated allowed tools (`--allowed-tools`). */
  allowedTools?: string;
};

export type ClaudeSubprocessHandle = {
  /** PID of the child, or undefined if spawn failed. */
  pid: number | undefined;
  /** Async iterator over parsed events. */
  events: AsyncIterable<StreamEvent>;
  /** Send SIGTERM (escalates to SIGKILL after 4s if still alive). */
  abort: () => void;
  /** Resolves when the subprocess exits (cleanly or otherwise). */
  done: Promise<{ code: number | null; signal: NodeJS.Signals | null }>;
};

const DEFAULT_BINARY = 'claude';

export const spawnClaude = (options: ClaudeSubprocessOptions): ClaudeSubprocessHandle => {
  const args = ['-p', '--output-format', 'stream-json', '--input-format', 'stream-json'];
  if (options.model) args.push('--model', options.model);
  if (options.allowedTools) args.push('--allowed-tools', options.allowedTools);

  const child: ChildProcess = spawn(options.binary ?? DEFAULT_BINARY, args, {
    cwd: options.cwd,
    env: options.env ?? process.env,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  const parser = new StreamJsonParser();
  const queue: StreamEvent[] = [];
  let resolveNext: ((value: IteratorResult<StreamEvent>) => void) | null = null;
  let finished = false;

  const pushEvents = (events: StreamEvent[]): void => {
    for (const ev of events) {
      if (resolveNext) {
        resolveNext({ value: ev, done: false });
        resolveNext = null;
      } else {
        queue.push(ev);
      }
    }
  };

  child.stdout?.on('data', (chunk: Buffer) => {
    pushEvents(parser.push(chunk));
  });
  child.stderr?.on('data', (chunk: Buffer) => {
    // Stderr lines are surfaced as error events so the agent panel can show
    // them. We don't try to parse them as JSON.
    const text = chunk.toString('utf-8').trim();
    if (text) pushEvents([{ type: 'error', message: text }]);
  });

  const finish = (): void => {
    if (finished) return;
    finished = true;
    pushEvents(parser.end());
    if (resolveNext) {
      resolveNext({ value: undefined, done: true });
      resolveNext = null;
    }
  };

  const done = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve) => {
    child.on('close', (code, signal) => {
      finish();
      resolve({ code, signal });
    });
    child.on('error', () => {
      finish();
      resolve({ code: 127, signal: null });
    });
  });

  // Send the prompt as a single stream-json envelope and end stdin.
  if (child.stdin) {
    child.stdin.write(`${JSON.stringify({ type: 'user', content: options.prompt })}\n`);
    child.stdin.end();
  }

  const events: AsyncIterable<StreamEvent> = {
    [Symbol.asyncIterator]() {
      return {
        next(): Promise<IteratorResult<StreamEvent>> {
          if (queue.length > 0) {
            return Promise.resolve({ value: queue.shift()!, done: false });
          }
          if (finished) {
            return Promise.resolve({ value: undefined, done: true });
          }
          return new Promise((resolve) => {
            resolveNext = resolve;
          });
        },
      };
    },
  };

  return {
    pid: child.pid,
    events,
    abort: () => {
      if (child.exitCode === null) {
        child.kill('SIGTERM');
        setTimeout(() => {
          if (child.exitCode === null) child.kill('SIGKILL');
        }, 4000);
      }
    },
    done,
  };
};

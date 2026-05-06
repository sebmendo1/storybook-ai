// Child Node process. Booting the dev server here isolates Storybook's
// singletons (risk #1 — buildDevStandalone reuses module cache, presets,
// and process-level handlers) and the importModule cache in loadMainConfig
// (risk #2). Switching repos kills this process and forks a fresh one.

import { readFile } from 'node:fs/promises';
import { join } from 'pathe';

type StartMessage = {
  type: 'start';
  repoRoot: string;
  configDir: string;
  port?: number;
};

type ReadyMessage = {
  type: 'ready';
  port: number;
  address: string;
};

type ErrorMessage = {
  type: 'error';
  message: string;
  stack?: string;
};

type ShutdownMessage = {
  type: 'shutdown';
};

export type WorkerInbound = StartMessage | ShutdownMessage;
export type WorkerOutbound = ReadyMessage | ErrorMessage;

const send = (msg: WorkerOutbound): void => {
  if (typeof process.send !== 'function') return;
  process.send(msg);
};

const start = async ({ repoRoot, configDir, port = 0 }: StartMessage): Promise<void> => {
  try {
    const { buildDevStandalone } = await import('storybook/internal/core-server');
    const packageJson = JSON.parse(
      await readFile(join(repoRoot, 'package.json'), 'utf-8')
    ) as Record<string, unknown>;

    const result = (await buildDevStandalone({
      configDir,
      port,
      host: '127.0.0.1',
      open: false,
      quiet: true,
      ci: true,
      loglevel: 'warn',
      packageJson,
    } as Parameters<typeof buildDevStandalone>[0])) as {
      port: number;
      address?: string;
      networkAddress?: string;
    };

    const address = result.address ?? `http://127.0.0.1:${result.port}/`;
    send({ type: 'ready', port: result.port, address });
  } catch (err) {
    const e = err as Error;
    send({ type: 'error', message: e.message, stack: e.stack });
    process.exit(1);
  }
};

process.on('message', (msg: WorkerInbound) => {
  if (msg.type === 'start') {
    void start(msg);
  } else if (msg.type === 'shutdown') {
    process.exit(0);
  }
});

process.on('uncaughtException', (err) => {
  send({ type: 'error', message: err.message, stack: err.stack });
  process.exit(1);
});

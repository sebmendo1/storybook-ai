import { fork, type ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'pathe';
import type { WorkerInbound, WorkerOutbound } from './storybook-worker.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const WORKER_PATH = join(HERE, 'storybook-worker.cjs');

export type StorybookHostHandle = {
  port: number;
  address: string;
  shutdown: () => Promise<void>;
};

export type StartStorybookHostOptions = {
  repoRoot: string;
  configDir: string;
  port?: number;
};

export const startStorybookHost = ({
  repoRoot,
  configDir,
  port = 0,
}: StartStorybookHostOptions): Promise<StorybookHostHandle> =>
  new Promise((resolve, reject) => {
    let child: ChildProcess;
    try {
      child = fork(WORKER_PATH, [], { stdio: ['ignore', 'inherit', 'inherit', 'ipc'] });
    } catch (err) {
      reject(err);
      return;
    }

    let settled = false;

    const finishOk = (handle: StorybookHostHandle) => {
      if (settled) return;
      settled = true;
      resolve(handle);
    };

    const finishErr = (err: Error) => {
      if (settled) return;
      settled = true;
      child.kill('SIGTERM');
      reject(err);
    };

    child.on('message', (raw: WorkerOutbound) => {
      if (raw.type === 'ready') {
        finishOk({
          port: raw.port,
          address: raw.address,
          shutdown: () => terminate(child),
        });
      } else if (raw.type === 'error') {
        const err = new Error(raw.message);
        if (raw.stack) err.stack = raw.stack;
        finishErr(err);
      }
    });

    child.on('exit', (code) => {
      if (!settled) {
        finishErr(new Error(`Storybook worker exited (code ${code ?? 'null'}) before ready`));
      }
    });

    child.on('error', (err) => {
      finishErr(err);
    });

    const startMsg: WorkerInbound = { type: 'start', repoRoot, configDir, port };
    child.send(startMsg);
  });

export const stopStorybookHost = async (handle: StorybookHostHandle): Promise<void> => {
  await handle.shutdown();
};

const terminate = (child: ChildProcess, timeoutMs = 4000): Promise<void> =>
  new Promise((resolve) => {
    if (!child.connected && child.exitCode !== null) {
      resolve();
      return;
    }
    const onExit = () => resolve();
    child.once('exit', onExit);

    const shutdown: WorkerInbound = { type: 'shutdown' };
    try {
      child.send(shutdown);
    } catch {
      // Worker already gone
    }

    setTimeout(() => {
      if (child.exitCode === null) {
        child.kill('SIGKILL');
      }
    }, timeoutMs);
  });

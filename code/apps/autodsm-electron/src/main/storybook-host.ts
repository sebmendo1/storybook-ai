import { readFile } from 'node:fs/promises';
import { join } from 'pathe';

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

export const startStorybookHost = async ({
  repoRoot,
  configDir,
  port = 0,
}: StartStorybookHostOptions): Promise<StorybookHostHandle> => {
  const { buildDevStandalone } = await import('storybook/internal/core-server');

  const packageJson = JSON.parse(await readFile(join(repoRoot, 'package.json'), 'utf-8')) as Record<string, unknown>;

  const result = await buildDevStandalone({
    configDir,
    port,
    host: '127.0.0.1',
    open: false,
    quiet: true,
    ci: true,
    loglevel: 'warn',
    packageJson,
  } as Parameters<typeof buildDevStandalone>[0]);

  const address = (result as { address?: string }).address ?? `http://127.0.0.1:${(result as { port: number }).port}/`;

  return {
    port: (result as { port: number }).port,
    address,
    shutdown: async () => {
      // Storybook's dev server doesn't expose a clean shutdown handle from
      // buildDevStandalone today (see plan risk #1). We close the Electron
      // process to recycle the server; multi-repo switching requires a
      // child-process strategy in a later sprint.
    },
  };
};

export const stopStorybookHost = async (handle: StorybookHostHandle): Promise<void> => {
  await handle.shutdown();
};

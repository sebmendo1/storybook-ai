// Headless Phase A verification of the Storybook Runtime Bridge.
//
// Boots `buildDevStandalone` against a sandbox repo and prints the resulting
// port + address. Used to validate the M1 contract without an Electron window.
//
//   node scripts/dry-run.ts /abs/path/to/sandbox
//
// Exits 0 on success, prints the story-index entry count, and shuts down.

import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'pathe';
import { detectFramework, detectStorybook, materializeConfig } from '@autodsm/detect';
import type { SupportedFramework } from '@autodsm/shared';

const log = (msg: string) => process.stdout.write(`${msg}\n`);

const main = async () => {
  const repoRoot = process.argv[2];
  if (!repoRoot) {
    process.stderr.write('Usage: node scripts/dry-run.ts <abs-path-to-repo>\n');
    process.exit(1);
  }

  const framework = await detectFramework(repoRoot);
  const detection = detectStorybook(repoRoot);
  log(`framework=${framework} hasExistingStorybook=${detection.hasExistingStorybook}`);

  let configDir = detection.configDir;
  if (!detection.hasExistingStorybook) {
    if (framework === 'unknown') {
      process.stderr.write('Cannot dry-run: unsupported framework.\n');
      process.exit(2);
    }
    const result = await materializeConfig(repoRoot, framework as SupportedFramework);
    configDir = result.configDir;
    log(`materialized ${result.mainPath}`);
  }

  const { buildDevStandalone } = await import('storybook/internal/core-server');
  const packageJson = JSON.parse(await readFile(join(repoRoot, 'package.json'), 'utf-8')) as Record<
    string,
    unknown
  >;

  const result = (await buildDevStandalone({
    configDir,
    port: 0,
    host: '127.0.0.1',
    open: false,
    quiet: true,
    ci: true,
    loglevel: 'warn',
    packageJson,
  } as Parameters<typeof buildDevStandalone>[0])) as {
    port: number;
    address?: string;
  };

  const address = result.address ?? `http://127.0.0.1:${result.port}/`;
  log(`UP port=${result.port} address=${address}`);

  // Validate the index endpoint returns non-empty entries via curl, then exit.
  const curl = spawn('curl', ['-s', `${address}index.json`], {
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  let body = '';
  curl.stdout.on('data', (b) => {
    body += b.toString();
  });
  curl.on('close', () => {
    try {
      const parsed = JSON.parse(body) as { entries?: Record<string, unknown> };
      const count = parsed.entries ? Object.keys(parsed.entries).length : 0;
      log(`index.json entries=${count}`);
      process.exit(count > 0 ? 0 : 3);
    } catch {
      process.stderr.write(`index.json was not valid JSON: ${body.slice(0, 120)}\n`);
      process.exit(4);
    }
  });
};

void main();

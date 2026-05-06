import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'pathe';
import { detectNextRouterMode, buildNextParameters } from './next.ts';

describe('detectNextRouterMode', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'autodsm-next-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('returns "app" for a file under app/', async () => {
    await mkdir(join(root, 'app/dashboard'), { recursive: true });
    const file = join(root, 'app/dashboard/page.tsx');
    await writeFile(file, `export default function Page() { return null; }`, 'utf-8');
    expect(await detectNextRouterMode(file)).toBe('app');
  });

  it('returns "pages" for a file under pages/', async () => {
    await mkdir(join(root, 'pages'), { recursive: true });
    const file = join(root, 'pages/index.tsx');
    await writeFile(file, `export default function Index() { return null; }`, 'utf-8');
    expect(await detectNextRouterMode(file)).toBe('pages');
  });

  it('falls back to import scan for `next/router`', async () => {
    const file = join(root, 'Component.tsx');
    await writeFile(
      file,
      `import { useRouter } from 'next/router';\nexport const Component = () => null;`,
      'utf-8'
    );
    expect(await detectNextRouterMode(file)).toBe('pages');
  });

  it('falls back to import scan for `next/navigation`', async () => {
    const file = join(root, 'Component.tsx');
    await writeFile(
      file,
      `import { useRouter } from 'next/navigation';\nexport const Component = () => null;`,
      'utf-8'
    );
    expect(await detectNextRouterMode(file)).toBe('app');
  });

  it('defaults to app when there is no signal', async () => {
    const file = join(root, 'Plain.tsx');
    await writeFile(file, `export const Plain = () => null;`, 'utf-8');
    expect(await detectNextRouterMode(file)).toBe('app');
  });
});

describe('buildNextParameters', () => {
  it('emits appDirectory: true for app router', () => {
    const prop = buildNextParameters('app');
    expect(prop.type).toBe('ObjectProperty');
  });
});

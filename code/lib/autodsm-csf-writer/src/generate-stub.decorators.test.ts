import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'pathe';
import { loadCsf } from 'storybook/internal/csf-tools';
import { generateStub } from './generate-stub.ts';

describe('generateStub decorator integration', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'autodsm-stub-decor-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('adds parameters.nextjs.appDirectory: true for next framework + app router', async () => {
    await mkdir(join(root, 'app/dashboard'), { recursive: true });
    const componentPath = join(root, 'app/dashboard/Page.tsx');
    await writeFile(
      componentPath,
      `import { useRouter } from 'next/navigation';
import Link from 'next/link';
export const Page = () => {
  const router = useRouter();
  return <Link href="/x">go</Link>;
};
`,
      'utf-8'
    );

    const result = await generateStub({
      repoRoot: root,
      component: { name: 'Page', exportName: 'Page', sourcePath: componentPath },
      framework: 'next',
    });

    expect(result.decoratorsApplied).toContain('nextjs:app');
    const code = await readFile(result.stagedPath, 'utf-8');
    expect(code).toContain('parameters:');
    expect(code).toMatch(/nextjs:\s*\{[\s\S]*appDirectory:\s*true/);

    const parsed = loadCsf(code, {
      fileName: result.stagedPath,
      makeTitle: () => 'app/dashboard/Page',
    }).parse();
    expect(parsed.stories.map((s) => s.name)).toContain('Default');
  });

  it('adds parameters.nextjs.appDirectory: false for next framework + pages router', async () => {
    await mkdir(join(root, 'pages'), { recursive: true });
    const componentPath = join(root, 'pages/index.tsx');
    await writeFile(
      componentPath,
      `import { useRouter } from 'next/router';
export default function Index() { return null; }
export const Index = () => null;
`,
      'utf-8'
    );

    const result = await generateStub({
      repoRoot: root,
      component: { name: 'Index', exportName: 'Index', sourcePath: componentPath },
      framework: 'next',
    });

    expect(result.decoratorsApplied).toContain('nextjs:pages');
    const code = await readFile(result.stagedPath, 'utf-8');
    expect(code).toMatch(/appDirectory:\s*false/);
  });

  it('imports + decorates with detected Providers from src/providers.tsx', async () => {
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(
      join(root, 'src/providers.tsx'),
      `export const Providers = ({ children }) => <>{children}</>;`,
      'utf-8'
    );
    const componentPath = join(root, 'src/Card.tsx');
    await writeFile(
      componentPath,
      `export const Card = ({ title }: { title: string }) => <div>{title}</div>;`,
      'utf-8'
    );

    const result = await generateStub({
      repoRoot: root,
      component: { name: 'Card', exportName: 'Card', sourcePath: componentPath },
      framework: 'react',
    });
    expect(result.decoratorsApplied).toContain('provider:Providers');

    const code = await readFile(result.stagedPath, 'utf-8');
    expect(code).toContain('import { Providers }');
    expect(code).toMatch(/decorators:\s*\[/);
    expect(code).toContain('<Providers>');
    expect(code).toContain('<Story />');
  });

  it('omits decorators array when no provider is detected', async () => {
    const componentPath = join(root, 'Plain.tsx');
    await writeFile(componentPath, `export const Plain = () => null;`, 'utf-8');
    const result = await generateStub({
      repoRoot: root,
      component: { name: 'Plain', exportName: 'Plain', sourcePath: componentPath },
      framework: 'react',
    });
    expect(result.decoratorsApplied).toEqual([]);
    const code = await readFile(result.stagedPath, 'utf-8');
    expect(code).not.toContain('decorators:');
  });
});

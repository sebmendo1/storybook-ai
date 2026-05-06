import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'pathe';
import { loadCsf } from 'storybook/internal/csf-tools';
import { generateStub } from './generate-stub.ts';

describe('generateStub', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'autodsm-stub-'));
    await mkdir(join(root, 'src'), { recursive: true });
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('writes a CSF stub for a simple Button component', async () => {
    const componentPath = join(root, 'src/Button.tsx');
    await writeFile(
      componentPath,
      `interface ButtonProps { label: string; disabled?: boolean; }
export const Button = ({ label, disabled = false }: ButtonProps) =>
  <button disabled={disabled}>{label}</button>;
`,
      'utf-8'
    );

    const result = await generateStub({
      repoRoot: root,
      component: { name: 'Button', exportName: 'Button', sourcePath: componentPath },
      framework: 'react',
    });

    expect(result.stagedPath).toMatch(/\.autodsm\/generated-stories\/src\/Button\.stories\.tsx$/);
    const code = await readFile(result.stagedPath, 'utf-8');
    expect(code).toContain('import { Button }');
    expect(code).toContain('export const Default');
    expect(code).toContain("'autodsm-generated'");

    const parsed = loadCsf(code, {
      fileName: result.stagedPath,
      makeTitle: () => 'Components/Button',
    }).parse();
    expect(parsed.meta?.title).toBe('Components/Button');
    const storyNames = parsed.stories.map((s) => s.name);
    expect(storyNames).toContain('Default');
  });

  it('generates relative import paths back to the component', async () => {
    const componentPath = join(root, 'src/components/Card.tsx');
    await mkdir(join(root, 'src/components'), { recursive: true });
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
    const code = await readFile(result.stagedPath, 'utf-8');
    // Staged path is .autodsm/generated-stories/src/components/Card.stories.tsx,
    // import target is the sibling Card.tsx three levels above (one .. for
    // each of generated-stories/src/components).
    expect(code).toMatch(/from\s+['"](\.\.\/){4,}src\/components\/Card['"]/);
  });
});

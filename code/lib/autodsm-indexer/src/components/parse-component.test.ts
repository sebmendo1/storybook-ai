import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'pathe';
import { parseComponentFile } from './parse-component.ts';

describe('parseComponentFile', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'autodsm-parse-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('parses a simple function component with TS prop interface', async () => {
    const file = join(root, 'Button.tsx');
    await writeFile(
      file,
      `import * as React from 'react';
export interface ButtonProps {
  /** Clickable label */
  label: string;
  disabled?: boolean;
}
export const Button = ({ label, disabled = false }: ButtonProps) => (
  <button disabled={disabled}>{label}</button>
);
export default Button;
`,
      'utf-8'
    );

    const docs = await parseComponentFile(file);
    expect(docs).toHaveLength(1);
    expect(docs[0]!.name).toBe('Button');
    expect(docs[0]!.props.label).toMatchObject({ required: true, description: 'Clickable label' });
    expect(docs[0]!.props.disabled).toMatchObject({ required: false });
  });

  it('returns [] for files with no exported components', async () => {
    const file = join(root, 'utils.tsx');
    await writeFile(file, `export const add = (a: number, b: number) => a + b;\n`, 'utf-8');
    expect(await parseComponentFile(file)).toHaveLength(0);
  });

  it('returns [] for unparseable input rather than throwing', async () => {
    const file = join(root, 'broken.tsx');
    await writeFile(file, `this is not :: valid <typescript>\n`, 'utf-8');
    expect(await parseComponentFile(file)).toEqual([]);
  });
});

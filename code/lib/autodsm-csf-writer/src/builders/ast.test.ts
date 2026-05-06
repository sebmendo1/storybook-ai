import { describe, expect, it } from 'vitest';
import { loadCsf } from 'storybook/internal/csf-tools';
import {
  buildCsfModule,
  generateImports,
  generateMetaFromComponent,
  generateStoryFromVariant,
  printCsfFile,
  type GenerateMetaInput,
} from './ast.ts';

const baseInput = (over?: Partial<GenerateMetaInput>): GenerateMetaInput => ({
  componentName: 'Button',
  componentImportPath: '../../src/Button',
  componentImportKind: 'named',
  title: 'Components/Button',
  framework: 'react',
  parsedProps: {
    label: { type: 'string', required: true, description: 'Button label' },
    disabled: { type: 'boolean', required: false, description: '' },
  },
  ...over,
});

describe('CSF AST builders', () => {
  it('produces a parseable CSF module that loadCsf can re-parse', () => {
    const input = baseInput();
    const file = buildCsfModule([
      ...generateImports(input),
      ...generateMetaFromComponent(input),
      generateStoryFromVariant({ storyName: 'Default', componentName: input.componentName }),
    ]);
    const code = printCsfFile(file);
    expect(code).toContain('import type { Meta, StoryObj }');
    expect(code).toContain("from '@storybook/react'");
    expect(code).toContain('Button');
    expect(code).toContain("title: 'Components/Button'");
    expect(code).toContain('export const Default');

    const parsed = loadCsf(code, {
      fileName: 'fixture.stories.tsx',
      makeTitle: () => 'Components/Button',
    }).parse();
    expect(parsed.meta?.title).toBe('Components/Button');
    const storyNames = parsed.stories.map((s) => s.name);
    expect(storyNames).toContain('Default');
  });

  it('generates default args for required string/number/boolean props', () => {
    const input = baseInput({
      parsedProps: {
        label: { type: 'string', required: true, description: '' },
        count: { type: 'number', required: true, description: '' },
        disabled: { type: 'boolean', required: true, description: '' },
      },
    });
    const file = buildCsfModule([...generateImports(input), ...generateMetaFromComponent(input)]);
    const code = printCsfFile(file);
    expect(code).toContain('args:');
    expect(code).toMatch(/label:\s*['"]Label['"]/);
    expect(code).toContain('count: 0');
    expect(code).toContain('disabled: false');
  });

  it('omits args object when no required props need defaults', () => {
    const input = baseInput({
      parsedProps: {
        optional: { type: 'string', required: false, description: '' },
      },
    });
    const file = buildCsfModule([...generateImports(input), ...generateMetaFromComponent(input)]);
    const code = printCsfFile(file);
    expect(code).not.toContain('args:');
  });

  it('includes argTypes with control inference when description or types match', () => {
    const input = baseInput({
      parsedProps: {
        size: {
          type: "'sm' | 'md' | 'lg'",
          required: false,
          description: 'Button size',
        },
      },
    });
    const file = buildCsfModule([...generateImports(input), ...generateMetaFromComponent(input)]);
    const code = printCsfFile(file);
    expect(code).toContain('argTypes:');
    expect(code).toMatch(/size:\s*\{[\s\S]*control:\s*'select'/);
  });
});

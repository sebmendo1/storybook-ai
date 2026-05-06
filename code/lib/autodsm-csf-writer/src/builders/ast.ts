import { types as t, recast } from 'storybook/internal/babel';
import type { ParsedProp } from '@autodsm/indexer';
import { inferDefaultArgs, type InferredArg } from '../infer/args.ts';

const argToExpression = (arg: InferredArg): t.Expression => {
  if (arg.kind === 'literal') {
    if (typeof arg.value === 'string') return t.stringLiteral(arg.value);
    if (typeof arg.value === 'number') return t.numericLiteral(arg.value);
    if (typeof arg.value === 'boolean') return t.booleanLiteral(arg.value);
  }
  if (arg.kind === 'array') {
    return t.arrayExpression(arg.values.map(argToExpression));
  }
  return t.identifier('undefined');
};

const argsToObjectExpression = (args: Record<string, InferredArg>): t.ObjectExpression =>
  t.objectExpression(
    Object.entries(args).map(([name, arg]) =>
      t.objectProperty(t.identifier(name), argToExpression(arg))
    )
  );

const inferControl = (prop: ParsedProp): string | null => {
  const tStr = (prop.type ?? '').trim();
  if (tStr === 'string') return 'text';
  if (tStr === 'number') return 'number';
  if (tStr === 'boolean') return 'boolean';
  if (/\|/.test(tStr) && /['"]/.test(tStr)) return 'select';
  return null;
};

const argTypesObjectExpression = (props: Record<string, ParsedProp>): t.ObjectExpression => {
  const properties: t.ObjectProperty[] = [];
  for (const [name, prop] of Object.entries(props)) {
    const control = inferControl(prop);
    const entries: t.ObjectProperty[] = [];
    if (control) {
      entries.push(t.objectProperty(t.identifier('control'), t.stringLiteral(control)));
    }
    if (prop.description) {
      entries.push(
        t.objectProperty(t.identifier('description'), t.stringLiteral(prop.description))
      );
    }
    if (entries.length === 0) continue;
    properties.push(t.objectProperty(t.identifier(name), t.objectExpression(entries)));
  }
  return t.objectExpression(properties);
};

export type GenerateMetaInput = {
  componentName: string;
  componentImportPath: string;
  componentImportKind: 'default' | 'named';
  title: string;
  framework: 'react' | 'next';
  parsedProps: Record<string, ParsedProp>;
  /** Optional extra parameters to splice into the meta object literal. */
  extraParameters?: t.ObjectProperty[];
  /** Optional decorators array entries (already-built expression nodes). */
  decorators?: t.Expression[];
};

export const generateImports = (input: GenerateMetaInput): t.Statement[] => {
  const stories: t.Statement[] = [];

  // import type { Meta, StoryObj } from '@storybook/react';
  const sbImport = t.importDeclaration(
    [
      t.importSpecifier(t.identifier('Meta'), t.identifier('Meta')),
      t.importSpecifier(t.identifier('StoryObj'), t.identifier('StoryObj')),
    ],
    t.stringLiteral('@storybook/react')
  );
  sbImport.importKind = 'type';
  stories.push(sbImport);

  const componentImport =
    input.componentImportKind === 'default'
      ? t.importDeclaration(
          [t.importDefaultSpecifier(t.identifier(input.componentName))],
          t.stringLiteral(input.componentImportPath)
        )
      : t.importDeclaration(
          [t.importSpecifier(t.identifier(input.componentName), t.identifier(input.componentName))],
          t.stringLiteral(input.componentImportPath)
        );
  stories.push(componentImport);

  return stories;
};

export const generateMetaFromComponent = (input: GenerateMetaInput): t.Statement[] => {
  const args = inferDefaultArgs(input.parsedProps);
  const argTypes = argTypesObjectExpression(input.parsedProps);

  const metaProperties: t.ObjectProperty[] = [
    t.objectProperty(t.identifier('title'), t.stringLiteral(input.title)),
    t.objectProperty(t.identifier('component'), t.identifier(input.componentName)),
  ];
  if (Object.keys(args).length > 0) {
    metaProperties.push(t.objectProperty(t.identifier('args'), argsToObjectExpression(args)));
  }
  if (argTypes.properties.length > 0) {
    metaProperties.push(t.objectProperty(t.identifier('argTypes'), argTypes));
  }
  if (input.extraParameters && input.extraParameters.length > 0) {
    for (const prop of input.extraParameters) {
      metaProperties.push(prop);
    }
  }
  if (input.decorators && input.decorators.length > 0) {
    metaProperties.push(
      t.objectProperty(t.identifier('decorators'), t.arrayExpression(input.decorators))
    );
  }
  metaProperties.push(
    t.objectProperty(
      t.identifier('tags'),
      t.arrayExpression([t.stringLiteral('autodsm-generated')])
    )
  );

  // const meta: Meta<typeof Component> = { ... };
  const metaTypeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(
      t.identifier('Meta'),
      t.tsTypeParameterInstantiation([t.tsTypeQuery(t.identifier(input.componentName))])
    )
  );
  const metaId = t.identifier('meta');
  metaId.typeAnnotation = metaTypeAnnotation;

  const decl = t.variableDeclaration('const', [
    t.variableDeclarator(metaId, t.objectExpression(metaProperties)),
  ]);

  return [decl, t.exportDefaultDeclaration(t.identifier('meta'))];
};

export type GenerateStoryInput = {
  storyName: string;
  componentName: string;
  args?: Record<string, InferredArg>;
};

export const generateStoryFromVariant = (input: GenerateStoryInput): t.Statement => {
  const storyType = t.tsTypeReference(
    t.identifier('StoryObj'),
    t.tsTypeParameterInstantiation([t.tsTypeQuery(t.identifier(input.componentName))])
  );
  const storyId = t.identifier(input.storyName);
  storyId.typeAnnotation = t.tsTypeAnnotation(storyType);

  const storyProps: t.ObjectProperty[] = [];
  if (input.args && Object.keys(input.args).length > 0) {
    storyProps.push(t.objectProperty(t.identifier('args'), argsToObjectExpression(input.args)));
  }

  const decl = t.variableDeclaration('const', [
    t.variableDeclarator(storyId, t.objectExpression(storyProps)),
  ]);

  return t.exportNamedDeclaration(decl, []);
};

export const buildCsfModule = (statements: t.Statement[]): t.File =>
  t.file(t.program(statements, [], 'module'));

export const printCsfFile = (file: t.File): string => recast.print(file, { quote: 'single' }).code;

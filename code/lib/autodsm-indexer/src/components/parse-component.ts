import { readFile } from 'node:fs/promises';
import { basename } from 'pathe';
import {
  parse,
  builtinHandlers as docgenHandlers,
  builtinResolvers as docgenResolvers,
  ERROR_CODES,
  type Documentation,
} from 'react-docgen';

const handlers = Object.values(docgenHandlers).map((h) => h);
const resolver = new docgenResolvers.FindExportedDefinitionsResolver();

export type ParsedComponent = {
  name: string;
  props: Record<string, ParsedProp>;
};

export type ParsedProp = {
  type?: string;
  required: boolean;
  description: string;
  defaultValue?: string;
};

type DocgenPropDescriptor = {
  tsType?: { name?: string; raw?: string };
  flowType?: { name?: string; raw?: string };
  type?: { name?: string; raw?: string };
  required?: boolean;
  description?: string;
  defaultValue?: { value?: unknown };
};

const stringifyType = (descriptor: DocgenPropDescriptor): string | undefined => {
  const t = descriptor.tsType ?? descriptor.flowType ?? descriptor.type;
  return t?.raw ?? t?.name;
};

const toParsedProps = (doc: Documentation): Record<string, ParsedProp> => {
  const out: Record<string, ParsedProp> = {};
  const props = (doc.props ?? {}) as Record<string, DocgenPropDescriptor>;
  for (const [key, value] of Object.entries(props)) {
    out[key] = {
      type: stringifyType(value),
      required: Boolean(value.required),
      description: value.description ?? '',
      defaultValue:
        typeof value.defaultValue?.value === 'string' ? value.defaultValue.value : undefined,
    };
  }
  return out;
};

const fallbackName = (filename: string): string => {
  const base = basename(filename);
  return base.replace(/\.(tsx|jsx|ts|js|mts|mjs|cts|cjs)$/, '');
};

export const parseComponentFile = async (filename: string): Promise<ParsedComponent[]> => {
  let src: string;
  try {
    src = await readFile(filename, 'utf-8');
  } catch {
    return [];
  }

  let docs: Documentation[];
  try {
    docs = parse(src, { resolver, handlers, filename });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === ERROR_CODES.MISSING_DEFINITION) return [];
    return [];
  }

  return docs.map((doc) => {
    const name = (doc.displayName as string | undefined) ?? fallbackName(filename);
    return { name, props: toParsedProps(doc) };
  });
};

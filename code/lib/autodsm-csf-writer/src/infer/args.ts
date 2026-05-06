import type { ParsedProp } from '@autodsm/indexer';

export type InferredArg =
  | { kind: 'literal'; value: string | number | boolean }
  | { kind: 'jsx'; expression: string }
  | { kind: 'array'; values: InferredArg[] }
  | { kind: 'undefined' };

const STRING_NAMES = new Set(['string']);
const NUMBER_NAMES = new Set(['number']);
const BOOL_NAMES = new Set(['boolean', 'bool']);
const NODE_NAMES = new Set(['ReactNode', 'ReactElement', 'JSX.Element', 'React.ReactNode']);

const isUnion = (typeStr: string): boolean => /\|/.test(typeStr) && !/^\(/.test(typeStr.trim());

const literalsFromUnion = (typeStr: string): string[] | null => {
  const parts = typeStr.split('|').map((s) => s.trim());
  const literals: string[] = [];
  for (const p of parts) {
    const m = p.match(/^['"](.+)['"]$/);
    if (!m) return null;
    literals.push(m[1]!);
  }
  return literals;
};

export const inferArgFor = (propName: string, prop: ParsedProp): InferredArg => {
  if (prop.defaultValue !== undefined) {
    // Default values from react-docgen are stringified source. Trust them
    // for primitives; otherwise leave as undefined and let the user edit.
    const dv = prop.defaultValue.trim();
    if (/^['"].*['"]$/.test(dv)) return { kind: 'literal', value: dv.slice(1, -1) };
    if (dv === 'true' || dv === 'false') return { kind: 'literal', value: dv === 'true' };
    if (/^-?\d+(\.\d+)?$/.test(dv)) return { kind: 'literal', value: Number(dv) };
  }

  const t = (prop.type ?? '').trim();

  if (STRING_NAMES.has(t)) return { kind: 'literal', value: humanize(propName) };
  if (NUMBER_NAMES.has(t)) return { kind: 'literal', value: 0 };
  if (BOOL_NAMES.has(t)) return { kind: 'literal', value: false };
  if (NODE_NAMES.has(t)) return { kind: 'literal', value: humanize(propName) };

  if (t.endsWith('[]')) return { kind: 'array', values: [] };

  if (isUnion(t)) {
    const literals = literalsFromUnion(t);
    if (literals && literals.length > 0) return { kind: 'literal', value: literals[0]! };
  }

  return { kind: 'undefined' };
};

const humanize = (camel: string): string => {
  const spaced = camel.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
  return spaced.length > 40 ? spaced.slice(0, 40) : spaced;
};

export const inferDefaultArgs = (
  props: Record<string, ParsedProp>
): Record<string, InferredArg> => {
  const out: Record<string, InferredArg> = {};
  for (const [name, prop] of Object.entries(props)) {
    if (!prop.required && prop.defaultValue === undefined) continue;
    const inferred = inferArgFor(name, prop);
    if (inferred.kind === 'undefined') continue;
    out[name] = inferred;
  }
  return out;
};

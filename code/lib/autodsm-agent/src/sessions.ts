import { mkdir, appendFile, readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'pathe';
import { AUTODSM_SESSIONS_DIR } from '@autodsm/shared';

export type SessionLogEntry =
  | { type: 'user'; ts: number; text: string }
  | { type: 'assistant_text'; ts: number; text: string }
  | { type: 'tool_use'; ts: number; name: string; input: unknown }
  | { type: 'tool_result'; ts: number; toolUseId?: string; content: unknown }
  | { type: 'error'; ts: number; message: string };

export const sessionDir = (repoRoot: string): string => join(repoRoot, AUTODSM_SESSIONS_DIR);

export const sessionFile = (repoRoot: string, id: string): string =>
  join(sessionDir(repoRoot), `${id}.jsonl`);

export const ensureSessionDir = async (repoRoot: string): Promise<void> => {
  const dir = sessionDir(repoRoot);
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
};

export const newSessionId = (): string => {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const rand = Math.random().toString(36).slice(2, 8);
  return `${ts}-${rand}`;
};

export const appendEntry = async (
  repoRoot: string,
  id: string,
  entry: SessionLogEntry
): Promise<void> => {
  await ensureSessionDir(repoRoot);
  await appendFile(sessionFile(repoRoot, id), `${JSON.stringify(entry)}\n`, 'utf-8');
};

export const readSession = async (repoRoot: string, id: string): Promise<SessionLogEntry[]> => {
  const path = sessionFile(repoRoot, id);
  if (!existsSync(path)) return [];
  const raw = await readFile(path, 'utf-8');
  const out: SessionLogEntry[] = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      out.push(JSON.parse(trimmed) as SessionLogEntry);
    } catch {
      // Tolerate corrupt lines so a bad write doesn't lock the user out.
    }
  }
  return out;
};

export const listSessions = async (repoRoot: string): Promise<string[]> => {
  const dir = sessionDir(repoRoot);
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir);
  return entries
    .filter((f) => f.endsWith('.jsonl'))
    .map((f) => f.replace(/\.jsonl$/, ''))
    .sort();
};

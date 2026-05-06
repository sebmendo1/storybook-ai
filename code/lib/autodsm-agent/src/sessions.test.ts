import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'pathe';
import { appendEntry, listSessions, newSessionId, readSession, sessionFile } from './sessions.ts';

describe('sessions', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'autodsm-sess-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('appends entries as JSONL and reads them back', async () => {
    const id = newSessionId();
    await appendEntry(root, id, { type: 'user', ts: 1, text: 'hello' });
    await appendEntry(root, id, { type: 'assistant_text', ts: 2, text: 'hi' });
    await appendEntry(root, id, { type: 'error', ts: 3, message: 'boom' });

    const entries = await readSession(root, id);
    expect(entries).toHaveLength(3);
    expect(entries[0]).toMatchObject({ type: 'user', text: 'hello' });
    expect(entries[2]).toMatchObject({ type: 'error', message: 'boom' });
  });

  it('returns [] for a missing session file', async () => {
    expect(await readSession(root, 'nonexistent')).toEqual([]);
  });

  it('lists session ids without the .jsonl suffix', async () => {
    const a = newSessionId();
    const b = newSessionId();
    await appendEntry(root, a, { type: 'user', ts: 1, text: 'x' });
    await appendEntry(root, b, { type: 'user', ts: 2, text: 'y' });
    const ids = await listSessions(root);
    expect(ids).toContain(a);
    expect(ids).toContain(b);
    expect(ids.every((id) => !id.endsWith('.jsonl'))).toBe(true);
  });

  it('places session files under .autodsm/sessions/', () => {
    const id = newSessionId();
    expect(sessionFile(root, id)).toBe(join(root, '.autodsm/sessions', `${id}.jsonl`));
  });
});

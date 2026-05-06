import { describe, expect, it } from 'vitest';
import { StreamJsonParser } from './stream-parser.ts';

describe('StreamJsonParser', () => {
  it('emits one event per complete line', () => {
    const p = new StreamJsonParser();
    const events = p.push('{"type":"text","text":"hi"}\n{"type":"text","text":"there"}\n');
    expect(events).toEqual([
      { type: 'text', text: 'hi' },
      { type: 'text', text: 'there' },
    ]);
  });

  it('buffers partial lines until a newline arrives', () => {
    const p = new StreamJsonParser();
    expect(p.push('{"type":"text","text":"par')).toEqual([]);
    expect(p.push('tial"}\n')).toEqual([{ type: 'text', text: 'partial' }]);
  });

  it('parses content_block_delta as a text event', () => {
    const p = new StreamJsonParser();
    expect(
      p.push(`${JSON.stringify({ type: 'content_block_delta', delta: { text: 'streamed' } })}\n`)
    ).toEqual([{ type: 'text', text: 'streamed' }]);
  });

  it('parses tool_use envelopes', () => {
    const p = new StreamJsonParser();
    expect(
      p.push(`${JSON.stringify({ type: 'tool_use', name: 'readComponent', input: { id: 'x' } })}\n`)
    ).toEqual([{ type: 'tool_use', name: 'readComponent', input: { id: 'x' } }]);
  });

  it('emits an error event for unparseable JSON', () => {
    const p = new StreamJsonParser();
    const events = p.push('not json\n');
    expect(events).toHaveLength(1);
    expect(events[0]!.type).toBe('error');
  });

  it('flushes a non-newline-terminated trailing buffer on end()', () => {
    const p = new StreamJsonParser();
    p.push('{"type":"text","text":"trail"}'); // no newline
    expect(p.end()).toEqual([{ type: 'text', text: 'trail' }]);
  });

  it('skips blank lines silently', () => {
    const p = new StreamJsonParser();
    expect(p.push('\n\n{"type":"text","text":"x"}\n\n')).toEqual([{ type: 'text', text: 'x' }]);
  });
});

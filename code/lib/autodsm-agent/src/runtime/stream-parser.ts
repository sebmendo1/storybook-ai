// Parser for `claude -p --output-format stream-json` output.
//
// Each event the CLI emits is a single JSON object on its own line. The CLI
// can emit partial lines if its stdout flush boundary doesn't align with a
// newline, so the parser buffers an incomplete tail and only emits events
// for complete lines.

export type StreamEvent =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; name: string; input: unknown }
  | { type: 'tool_result'; tool_use_id?: string; content: unknown }
  | { type: 'message_start' }
  | { type: 'message_stop' }
  | { type: 'error'; message: string }
  | { type: 'unknown'; raw: unknown };

const classifyJson = (obj: unknown): StreamEvent => {
  if (!obj || typeof obj !== 'object') return { type: 'unknown', raw: obj };
  const r = obj as Record<string, unknown>;

  if (r.type === 'message_start' || r.type === 'message_stop') {
    return { type: r.type } as StreamEvent;
  }

  if (r.type === 'text' && typeof r.text === 'string') {
    return { type: 'text', text: r.text };
  }
  if (r.type === 'content_block_delta' && r.delta && typeof r.delta === 'object') {
    const d = r.delta as Record<string, unknown>;
    if (typeof d.text === 'string') return { type: 'text', text: d.text };
  }

  if (r.type === 'tool_use' && typeof r.name === 'string') {
    return { type: 'tool_use', name: r.name, input: r.input };
  }
  if (r.type === 'tool_result') {
    return {
      type: 'tool_result',
      tool_use_id: typeof r.tool_use_id === 'string' ? r.tool_use_id : undefined,
      content: r.content,
    };
  }

  if (r.type === 'error') {
    const msg = typeof r.message === 'string' ? r.message : JSON.stringify(r);
    return { type: 'error', message: msg };
  }

  return { type: 'unknown', raw: obj };
};

export class StreamJsonParser {
  private buffer = '';

  push(chunk: string | Buffer): StreamEvent[] {
    this.buffer += typeof chunk === 'string' ? chunk : chunk.toString('utf-8');
    const lines = this.buffer.split('\n');
    // Last segment is potentially partial (no trailing \n); keep it for the
    // next push.
    this.buffer = lines.pop() ?? '';

    const events: StreamEvent[] = [];
    for (const raw of lines) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      try {
        events.push(classifyJson(JSON.parse(trimmed)));
      } catch (err) {
        events.push({
          type: 'error',
          message: `parse failed: ${(err as Error).message}: ${trimmed.slice(0, 80)}`,
        });
      }
    }
    return events;
  }

  /** Flush any non-newline-terminated trailing buffer. */
  end(): StreamEvent[] {
    const trailing = this.buffer.trim();
    this.buffer = '';
    if (!trailing) return [];
    try {
      return [classifyJson(JSON.parse(trailing))];
    } catch (err) {
      return [
        {
          type: 'error',
          message: `parse failed at flush: ${(err as Error).message}: ${trailing.slice(0, 80)}`,
        },
      ];
    }
  }
}

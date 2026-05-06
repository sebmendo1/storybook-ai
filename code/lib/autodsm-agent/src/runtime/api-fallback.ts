// Direct Anthropic API fallback for users on `ANTHROPIC_API_KEY` rather
// than a Claude Code subscription. Sprint 6 ships the contract and a stub
// that throws an actionable error; wiring the @anthropic-ai/sdk dependency
// is deferred until we need the path in production.
//
// When implemented this will:
//   - Call client.messages.stream({ model, system, messages, tools })
//   - Translate each event into our StreamEvent shape
//   - Honour stop signals via AbortController
//   - Bill against the Anthropic Console plan, NOT a Claude Code subscription

import type { StreamEvent } from './stream-parser.ts';

export type ApiFallbackOptions = {
  prompt: string;
  apiKey: string;
  model?: string;
};

export type ApiFallbackHandle = {
  events: AsyncIterable<StreamEvent>;
  abort: () => void;
  done: Promise<{ code: number | null }>;
};

export const callAnthropicApi = (_options: ApiFallbackOptions): ApiFallbackHandle => {
  const error: StreamEvent = {
    type: 'error',
    message:
      'API-key fallback is not implemented yet. Authenticate the local `claude` CLI ' +
      '(claude login) to use AutoDSM agentic features.',
  };
  return {
    events: (async function* () {
      yield error;
    })(),
    abort: () => {},
    done: Promise.resolve({ code: 1 }),
  };
};

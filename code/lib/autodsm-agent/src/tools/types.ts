// Tool descriptors advertised to Claude's tool-use protocol. Each tool
// supplies a JSON Schema for its inputs and an executor that runs in the
// Electron main process. The agent harness in Sprint 7+ feeds the
// descriptors into `spawnClaude` via `--allowed-tools` and resolves
// tool_use turns by invoking the matching executor.

export type JsonSchema = Record<string, unknown>;

export type ToolContext = {
  /** Repo the user has open. */
  repoRoot: string;
};

export type ToolExecutor<I = unknown, O = unknown> = (input: I, ctx: ToolContext) => Promise<O>;

export type ToolDescriptor<I = unknown, O = unknown> = {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  execute: ToolExecutor<I, O>;
};

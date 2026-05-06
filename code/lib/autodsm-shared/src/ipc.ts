export const IPC = {
  OPEN_FOLDER: 'autodsm:open-folder',
  PROJECT_OPENED: 'autodsm:project-opened',
  PREVIEW_STARTED: 'autodsm:preview-started',
  PREVIEW_STOPPED: 'autodsm:preview-stopped',
  PREVIEW_ERROR: 'autodsm:preview-error',
  INDEXER_RESULT: 'autodsm:indexer:result',
  INDEXER_REQUEST: 'autodsm:indexer:request',
  GENERATE_STUB: 'autodsm:generate-stub',
  STUB_GENERATED: 'autodsm:stub-generated',
  STUB_ERROR: 'autodsm:stub-error',
  AGENT_QUERY: 'autodsm:agent:query',
  AGENT_ABORT: 'autodsm:agent:abort',
  AGENT_DONE: 'autodsm:agent:done',
  CHANGES_LIST: 'autodsm:changes:list',
  CHANGES_PROMOTE: 'autodsm:changes:promote',
  CHANGES_REJECT: 'autodsm:changes:reject',
  CHANGES_DIFF: 'autodsm:changes:diff',
  CHANNEL_FROM_MANAGER: 'autodsm:channel:from-manager',
  CHANNEL_FROM_PREVIEW: 'autodsm:channel:from-preview',
  AGENT_AUTH_STATUS: 'autodsm:agent:auth-status',
  AGENT_TURN: 'autodsm:agent:turn',
} as const;

export type IpcChannel = (typeof IPC)[keyof typeof IPC];

export type ProjectOpenedPayload = {
  repoRoot: string;
  framework: 'react-vite' | 'react-webpack5' | 'nextjs' | 'nextjs-vite' | 'unknown';
  hasExistingStorybook: boolean;
};

export type PreviewStartedPayload = {
  port: number;
  address: string;
};

export type PreviewErrorPayload = {
  message: string;
  stack?: string;
};

export type GenerateStubRequestPayload = {
  componentId: string;
};

export type StubGeneratedPayload = {
  componentId: string;
  stagedPath: string;
};

export type StubErrorPayload = {
  componentId: string;
  message: string;
};

export type AgentAuthStatusPayload = {
  kind: 'subscription' | 'api-key' | 'oauth-token' | 'bedrock' | 'vertex' | 'none';
  readable: string;
  version?: string;
};

export type AgentQueryPayload = {
  prompt: string;
};

export type AgentTurnPayload =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; name: string; input: unknown }
  | { type: 'tool_result'; toolUseId?: string; content: unknown }
  | { type: 'error'; message: string };

export type AgentDonePayload = {
  code: number | null;
  signal: NodeJS.Signals | null | undefined;
};

export type StagedChangeSummary = {
  stagedPath: string;
  relativePath: string;
  byteSize: number;
  mtimeMs: number;
};

export type ChangesListPayload = {
  changes: StagedChangeSummary[];
};

export type ChangesPromoteRequest = {
  stagedPath: string;
  componentSourcePath: string;
};

export type ChangesPromoteResult = {
  finalPath: string;
};

export type ChangesRejectRequest = {
  stagedPath: string;
};

export type ChangesDiffRequest = {
  stagedPath: string;
};

export type ChangesDiffResult = {
  source: string;
};

export type IndexerResultPayload = {
  components: Array<{
    id: string;
    name: string;
    exportName: string;
    sourcePath: string;
    storyPaths: string[];
    status:
      | 'ready'
      | 'missing-story'
      | 'render-broken'
      | 'missing-provider'
      | 'missing-dependency'
      | 'token-warning'
      | 'needs-review';
  }>;
  tokens: Array<{
    name: string;
    value: string;
    category:
      | 'color'
      | 'typography'
      | 'spacing'
      | 'radius'
      | 'shadow'
      | 'motion'
      | 'breakpoint'
      | 'semantic';
    source: 'css-vars' | 'tailwind' | 'theme-object';
    usedBy: string[];
  }>;
  stats: {
    componentFiles: number;
    storyFiles: number;
    components: number;
    componentsWithStories: number;
    tokens: number;
  };
};

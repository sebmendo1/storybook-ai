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

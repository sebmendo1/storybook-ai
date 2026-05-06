export const IPC = {
  OPEN_FOLDER: 'autodsm:open-folder',
  PROJECT_OPENED: 'autodsm:project-opened',
  PREVIEW_STARTED: 'autodsm:preview-started',
  PREVIEW_STOPPED: 'autodsm:preview-stopped',
  PREVIEW_ERROR: 'autodsm:preview-error',
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

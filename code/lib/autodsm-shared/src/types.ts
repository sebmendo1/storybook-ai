export type SupportedFramework =
  | 'react-vite'
  | 'react-webpack5'
  | 'nextjs'
  | 'nextjs-vite';

export type DetectedFramework = SupportedFramework | 'unknown';

export type ProjectState = {
  repoRoot: string;
  framework: DetectedFramework;
  hasExistingStorybook: boolean;
  storybookConfigDir: string;
};

export type AuthKind =
  | 'subscription'
  | 'api-key'
  | 'oauth-token'
  | 'bedrock'
  | 'vertex'
  | 'none';

export type AuthStatus = {
  kind: AuthKind;
  readable: string;
  version?: string;
};

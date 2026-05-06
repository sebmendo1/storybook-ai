export type ComponentStatus =
  | 'ready'
  | 'missing-story'
  | 'render-broken'
  | 'missing-provider'
  | 'missing-dependency'
  | 'token-warning'
  | 'needs-review';

export type DiscoveredComponent = {
  id: string;
  name: string;
  exportName: string;
  sourcePath: string;
  storyPaths: string[];
  status: ComponentStatus;
};

export type TokenCategory =
  | 'color'
  | 'typography'
  | 'spacing'
  | 'radius'
  | 'shadow'
  | 'motion'
  | 'breakpoint'
  | 'semantic';

export type TokenEntry = {
  name: string;
  value: string;
  category: TokenCategory;
  source: 'css-vars' | 'tailwind' | 'theme-object';
  usedBy: string[];
};

export type TokenSet = {
  entries: TokenEntry[];
};

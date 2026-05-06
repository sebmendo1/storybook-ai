export type GeneratedStoryRequest = {
  componentName: string;
  componentImportPath: string;
  title: string;
  framework: 'react' | 'next';
  argTypes?: Record<string, unknown>;
};

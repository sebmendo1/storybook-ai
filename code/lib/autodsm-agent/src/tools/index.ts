import type { ToolDescriptor } from './types.ts';
import { readComponentTool } from './read-component.ts';
import { readStoryTool } from './read-story.ts';
import { listGeneratedStoriesTool } from './list-generated-stories.ts';
import { installDepTool } from './install-dep.ts';

export type { ToolDescriptor, ToolExecutor, ToolContext, JsonSchema } from './types.ts';
export { readComponentTool, readStoryTool, listGeneratedStoriesTool, installDepTool };

/**
 * Default tool registry handed to the agent harness. Sprint 7 ships read-only
 * + staging-write tools (no source-tree mutations); Sprint 8+ extends with
 * `addProvider`, `addNextMock`, and a write-mode `installDep`.
 */
export const defaultTools: ToolDescriptor[] = [
  readComponentTool as ToolDescriptor,
  readStoryTool as ToolDescriptor,
  listGeneratedStoriesTool as ToolDescriptor,
  installDepTool as ToolDescriptor,
];

export const allowedToolsSpec = (tools: ToolDescriptor[] = defaultTools): string =>
  tools.map((t) => t.name).join(',');

import { relative } from 'pathe';
import type { ComponentStatus, DiscoveredComponent } from '../types.ts';
import { findComponentFiles, findStoryFiles } from './find-files.ts';
import { parseComponentFile, type ParsedComponent } from './parse-component.ts';
import { linkStoriesToComponents } from './match-stories.ts';

export type ScanRepoOptions = {
  repoRoot: string;
  /** Optional concurrency cap when parsing component files. */
  concurrency?: number;
};

export type ScanRepoResult = {
  components: DiscoveredComponent[];
  stats: {
    componentFiles: number;
    storyFiles: number;
    components: number;
    componentsWithStories: number;
  };
};

const componentId = (repoRoot: string, sourcePath: string, exportName: string): string =>
  `${relative(repoRoot, sourcePath)}#${exportName}`;

const statusFor = (parsed: ParsedComponent, hasStory: boolean): ComponentStatus => {
  if (hasStory) return 'ready';
  // Heuristic: a component with required props but no story is harder to render
  // than one with all-optional props. Mark anyway as missing-story; Sprint 4 will
  // upgrade to needs-review once we know whether default args can be inferred.
  void parsed;
  return 'missing-story';
};

const runWithConcurrency = async <I, O>(
  items: I[],
  concurrency: number,
  fn: (item: I) => Promise<O>
): Promise<O[]> => {
  const results: O[] = new Array(items.length);
  let cursor = 0;
  const workers = new Array(Math.min(concurrency, items.length)).fill(0).map(async () => {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await fn(items[idx]!);
    }
  });
  await Promise.all(workers);
  return results;
};

export const scanRepo = async ({
  repoRoot,
  concurrency = 8,
}: ScanRepoOptions): Promise<ScanRepoResult> => {
  const [componentFiles, storyFiles] = await Promise.all([
    findComponentFiles(repoRoot),
    findStoryFiles(repoRoot),
  ]);

  const componentToStories = await linkStoriesToComponents(storyFiles);
  const parsedPerFile = await runWithConcurrency(componentFiles, concurrency, parseComponentFile);

  const components: DiscoveredComponent[] = [];
  let componentsWithStories = 0;

  componentFiles.forEach((sourcePath, i) => {
    const parsedList = parsedPerFile[i] ?? [];
    const storyPaths = componentToStories.get(sourcePath) ?? [];
    const hasStory = storyPaths.length > 0;

    parsedList.forEach((parsed, exportIdx) => {
      const exportName = parsed.name || `Export${exportIdx}`;
      const status = statusFor(parsed, hasStory);
      if (hasStory) componentsWithStories++;
      components.push({
        id: componentId(repoRoot, sourcePath, exportName),
        name: parsed.name,
        exportName,
        sourcePath,
        storyPaths,
        status,
      });
    });
  });

  components.sort((a, b) => a.name.localeCompare(b.name));

  return {
    components,
    stats: {
      componentFiles: componentFiles.length,
      storyFiles: storyFiles.length,
      components: components.length,
      componentsWithStories,
    },
  };
};

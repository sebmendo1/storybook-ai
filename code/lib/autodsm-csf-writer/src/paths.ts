import { join } from 'pathe';
import { AUTODSM_GENERATED_STORIES_DIR } from '@autodsm/shared';

export const stagedStoryPath = (
  repoRoot: string,
  relPathWithinRepo: string,
  componentName: string,
): string =>
  join(repoRoot, AUTODSM_GENERATED_STORIES_DIR, relPathWithinRepo, `${componentName}.stories.tsx`);

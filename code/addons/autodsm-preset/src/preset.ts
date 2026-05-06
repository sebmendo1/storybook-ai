// AutoDSM Storybook preset.
//
// Sprint 1: minimal preset so materialized configs register cleanly.
// Sprint 3: stories from .autodsm/generated-stories are picked up automatically
//   by the default CSF indexer because they match its file-extension regex —
//   adding a competing indexer here would trigger MultipleIndexingError
//   (see code/core/src/core-server/utils/IndexingError.ts). The preset stays
//   minimal until Sprint 5 wires previewAnnotations for token + provider
//   decorators.

export const previewAnnotations = (entry: string[] = []): string[] => entry;

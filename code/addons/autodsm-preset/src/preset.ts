// AutoDSM Storybook preset.
//
// Sprint 1 ships a no-op preset so the Electron host can register `@autodsm/preset`
// in materialized configs without breakage. Sprint 3 (M3) wires
// `experimental_indexers` to scan .autodsm/generated-stories, and Sprint 5 (M5)
// wires `previewAnnotations` for token + provider decorators.

export const previewAnnotations = (entry: string[] = []): string[] => entry;

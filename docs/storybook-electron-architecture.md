# AutoDSM — Storybook → Electron IDE architecture

> ADR. Sprint 1 of the AutoDSM pivot.
> Branch: `claude/review-repo-summary-HPoCE`. Plan: `/root/.claude/plans/create-a-plan-to-velvety-frost.md`.

## Status

Accepted. Sprint 1 (M0 + M1) lands the package layout described below
and a Storybook Runtime Bridge PoC.

## Context

Storybook already owns the canonical model for isolated component states:
CSF stories, args, decorators, the manager↔preview channel, framework
packages, the story index, and portable stories. AutoDSM aims to be
"Storybook if it worked like an IDE and SaaS product" — an Electron
desktop app that opens or clones a repo, auto-detects framework + Storybook
config, generates missing CSF stories for every component, hosts a
Storybook preview inside `WebContentsView`, and runs an agent that fixes
missing stories, providers, dependencies, Next.js mocks, and token wiring.

The pre-Sprint-1 design proposed reinventing the preview runtime. That
duplicated the part of the ecosystem that already works and forfeited
compatibility with users' existing Storybooks. We discarded it.

## Decision

**AutoDSM is a Storybook-native fork.** It depends on the `storybook`
package via the 41 public `exports` subpaths — including
`storybook/internal/core-server`, `storybook/internal/csf-tools`,
`storybook/internal/channels`, `storybook/internal/preview-api`, and
`storybook/internal/types` — and adds new workspace packages alongside
existing Storybook code. We fork an upstream Storybook package only when
no extension/preset path exists.

Generated stories remain valid CSF so users can run plain Storybook
outside AutoDSM. The upstream `next` branch stays trivially mergeable.

### Package layout

| Path | Role |
| --- | --- |
| `code/apps/autodsm-electron` | Electron app shell. Hosts a `WebContentsView` pointing at the user's Storybook preview. |
| `code/lib/autodsm-shared` | IPC channel constants, path constants, project/auth types. |
| `code/lib/autodsm-channels` | `ElectronIPCTransport` implementing Storybook's `ChannelTransport`. |
| `code/lib/autodsm-detect` | Framework detection + `.autodsm/storybook/main.ts` materialization. |
| `code/lib/autodsm-indexer` | Component + token discovery (Sprint 3). |
| `code/lib/autodsm-csf-writer` | CSF3 AST authoring for staged stories (Sprint 4). |
| `code/lib/autodsm-agent` | Auth detection + `claude` CLI subprocess delegation (Sprint 6). |
| `code/addons/autodsm-preset` | Storybook preset auto-injected into materialized configs. |

### Critical upstream dependencies

| Concern | Symbol | Source |
| --- | --- | --- |
| Boot dev server | `buildDevStandalone` | `code/core/src/core-server/build-dev.ts` |
| Story index | `StoryIndexGenerator`, `Indexer` | `code/core/src/core-server/utils/StoryIndexGenerator.ts` |
| CSF parse / print | `loadCsf`, `printCsf`, `babelParse` | `code/core/src/csf-tools/` |
| Channel transport | `Channel`, `ChannelTransport`, `createBrowserChannel` | `code/core/src/channels/` |
| Manager mount | `renderStorybookUI`, `Provider` | `code/core/src/manager/` |
| Headless story validation | `composeStory`, `composeStories` | `code/core/src/preview-api/modules/store/csf/portable-stories.ts` |
| Main config loader | `loadMainConfig`, `getInterpretedFile` | `code/core/src/common/utils/load-main-config.ts` |
| Next.js mocks | navigation/router/link/headers/cache/images mocks | `code/frameworks/nextjs/src/export-mocks/` |

## Consequences

### Positive

- **Compatibility moat.** Users keep working `.storybook/` configs and
  continue to ship plain Storybook outside AutoDSM.
- **Cheaper engineering.** We add eight new packages instead of forking
  the manager, builders, and framework packages.
- **Mergeable upstream.** Almost no diffs against `next`.
- **Testable in isolation.** `composeStories()` from
  `storybook/internal/preview-api` lets us validate generated CSF in Node
  without an Electron window.

### Negative / accepted risks

1. **`buildDevStandalone` reuses singletons** (global cache, presets,
   process-level handlers). Switching repos in one Electron process may
   leak — Sprint 2's DoD validates this; if it leaks we move to a
   child-process strategy.
2. **`loadMainConfig` is file-based.** No in-memory config support; we
   materialize `.autodsm/storybook/main.ts` on disk.
3. **Native `.ts` execution in Electron main.** Repo Node is 22.22.1;
   Electron ≤30 ships Node 20. We pin Electron ≥35 (Node 22) and ship a
   `tsup` build step for the main process bundle.
4. **CSF round-trip mixing.** `printCsf` only works on `CsfFile`
   instances from `loadCsf`. Fresh authoring uses `recast.print`
   directly. The `@autodsm/csf-writer` package owns this distinction.
5. **Claude CLI flag drift.** `claude -p`, `--output-format stream-json`,
   and `claude auth status` are stable enough to plan against, but
   Anthropic revises the CLI surface across versions. Sprint 6 pins a
   minimum CLI version and surfaces an "upgrade Claude Code" prompt.

## Authentication & billing

All agentic calls bill against the user's existing Claude Code
subscription via subprocess delegation to the local `claude` CLI.
**AutoDSM must never** extract OAuth tokens from
`~/.claude/.credentials.json`, the macOS Keychain entry, or any other
subscription-bound source — Anthropic's TOS (enforced January 2026)
prohibits this. Tools that violated it (OpenClaw, OpenCode, Roo Code,
Goose) were blocked.

Auth precedence, probed at startup:

1. Local `claude` CLI authenticated to a Pro / Max / Team subscription.
2. `ANTHROPIC_API_KEY` env var (direct API; falls back to
   `@anthropic-ai/sdk`).
3. `CLAUDE_CODE_OAUTH_TOKEN` (long-lived, `claude setup-token`; CI/headless).
4. `CLAUDE_CODE_USE_BEDROCK` / `_USE_VERTEX` / `_USE_FOUNDRY` (enterprise
   routing; passed through unchanged).

When none are present, the Agent panel is disabled with a one-click
"Set up Claude" CTA.

## Sprint 1 scope (this commit)

- Eight packages scaffolded; `code/apps/*` added to root workspaces.
- `@autodsm/electron` boots a `BrowserWindow` with a placeholder sidebar
  and a `WebContentsView` for the preview.
- `@autodsm/electron` calls `buildDevStandalone` from
  `storybook/internal/core-server` against the user-picked repo's
  `.storybook/` directory (or a materialized `.autodsm/storybook/`).
- `@autodsm/detect` ships `detectFramework`, `detectStorybook`, and
  `materializeConfig` (writes `.autodsm/storybook/main.ts` for the four
  MVP framework variants and appends `.autodsm/` to `.gitignore`).
- `@autodsm/agent` ships `detectAuth` (MVP — runs `claude --version` and
  `claude auth status`, recognizes API-key / OAuth-token / Bedrock /
  Vertex env-var fallbacks).

Subsequent sprints (M2–M7) wire the indexer panel, CSF writer, Next.js
mock auto-wiring, ElectronIPCTransport, agent runtime, ChangeSet UI, and
onboarding polish per `/root/.claude/plans/create-a-plan-to-velvety-frost.md`.

## Verification — Sprint 1 PoC

### Phase A — headless dry run (no Electron)

```bash
node -e "import('storybook/internal/core-server').then(m => \
  m.buildDevStandalone({ \
    configDir: '<abs-sandbox>/.storybook', port: 0, host: '127.0.0.1', \
    open: false, ci: true, quiet: true, \
    packageJson: require('<abs-sandbox>/package.json') \
  }).then(({port, address}) => console.log('UP', port, address)))"
```

`curl http://127.0.0.1:<port>/index.json` must return a story-index JSON
with non-empty `entries`.

### Phase B — Electron run

```bash
yarn workspace @autodsm/electron dev
```

1. Window opens with the AutoDSM placeholder sidebar.
2. Click **Open Folder**, pick `../storybook-sandboxes/react-vite-default-ts`.
3. Status badge shows the loaded project + framework.
4. Preview pane on the right loads the running Storybook preview.
5. Quit the app → no orphan child on the dev-server port
   (`lsof -i :<port>` returns nothing).

Pass criteria:

- Cold start to first paint < 6 s.
- Preview renders the actual button (not the Storybook error overlay).
- Re-opening with `nextjs/default-ts` works without any code change.

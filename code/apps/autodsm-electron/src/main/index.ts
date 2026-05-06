import { app, BrowserWindow, WebContentsView, ipcMain, dialog } from 'electron';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'pathe';
import { detectFramework, detectStorybook, materializeConfig } from '@autodsm/detect';
import { extractTokens, scanRepo, type DiscoveredComponent } from '@autodsm/indexer';
import { generateStub } from '@autodsm/csf-writer';
import {
  IPC,
  type GenerateStubRequestPayload,
  type IndexerResultPayload,
  type ProjectOpenedPayload,
  type StubErrorPayload,
  type StubGeneratedPayload,
  type SupportedFramework,
} from '@autodsm/shared';
import {
  startStorybookHost,
  stopStorybookHost,
  type StorybookHostHandle,
} from './storybook-host.ts';

const HERE = dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;
let previewView: WebContentsView | null = null;
let host: StorybookHostHandle | null = null;
let activeRepoRoot: string | null = null;
let activeFramework: SupportedFramework | 'unknown' = 'unknown';
let lastComponents: DiscoveredComponent[] = [];

const SIDEBAR_WIDTH = 320;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'AutoDSM',
    backgroundColor: '#0f0f12',
    webPreferences: {
      preload: join(HERE, '..', 'preload', 'manager-preload.cjs'),
      contextIsolation: true,
      sandbox: false,
    },
  });

  // Sprint 1 ships a placeholder manager; the real renderer (manager-api +
  // panels) lands in Sprint 3+. For now we show an empty-state HTML page on
  // the left and leave the right side to the WebContentsView preview.
  mainWindow.loadFile(join(HERE, '..', '..', 'static', 'placeholder.html'));

  previewView = new WebContentsView({
    webPreferences: {
      preload: join(HERE, '..', 'preload', 'preview-preload.cjs'),
      contextIsolation: true,
      sandbox: false,
    },
  });
  mainWindow.contentView.addChildView(previewView);
  layoutPreview();

  mainWindow.on('resize', layoutPreview);
};

const layoutPreview = () => {
  if (!mainWindow || !previewView) return;
  const { width, height } = mainWindow.getContentBounds();
  previewView.setBounds({
    x: SIDEBAR_WIDTH,
    y: 0,
    width: Math.max(0, width - SIDEBAR_WIDTH),
    height,
  });
};

const openFolderAndBoot = async () => {
  if (!mainWindow) return;
  const picked = await dialog.showOpenDialog(mainWindow, {
    title: 'Open repo',
    properties: ['openDirectory'],
  });
  if (picked.canceled || picked.filePaths.length === 0) return;

  const repoRoot = picked.filePaths[0]!;
  await bootRepo(repoRoot);
};

const bootRepo = async (repoRoot: string) => {
  if (host) {
    await stopStorybookHost(host);
    host = null;
  }
  activeRepoRoot = repoRoot;

  const framework = await detectFramework(repoRoot);
  activeFramework = framework;
  const detection = detectStorybook(repoRoot);

  let configDir = detection.configDir;
  if (!detection.hasExistingStorybook) {
    if (framework === 'unknown') {
      mainWindow?.webContents.send(IPC.PREVIEW_ERROR, {
        message: `AutoDSM could not detect a supported framework in ${repoRoot}.`,
      });
      return;
    }
    const materialized = await materializeConfig(repoRoot, framework as SupportedFramework);
    configDir = materialized.configDir;
  }

  const projectPayload: ProjectOpenedPayload = {
    repoRoot,
    framework,
    hasExistingStorybook: detection.hasExistingStorybook,
  };
  mainWindow?.webContents.send(IPC.PROJECT_OPENED, projectPayload);

  // Kick the indexer + preview boot in parallel — both are slow, neither
  // depends on the other.
  void runIndexer(repoRoot);

  try {
    host = await startStorybookHost({ repoRoot, configDir });
    previewView?.webContents.loadURL(host.address);
    mainWindow?.webContents.send(IPC.PREVIEW_STARTED, {
      port: host.port,
      address: host.address,
    });
  } catch (err) {
    const error = err as Error;
    mainWindow?.webContents.send(IPC.PREVIEW_ERROR, {
      message: error.message,
      stack: error.stack,
    });
  }
};

const runIndexer = async (repoRoot: string): Promise<void> => {
  try {
    const [scan, tokens] = await Promise.all([scanRepo({ repoRoot }), extractTokens(repoRoot)]);
    lastComponents = scan.components;
    const payload: IndexerResultPayload = {
      components: scan.components.map((c) => ({
        id: c.id,
        name: c.name,
        exportName: c.exportName,
        sourcePath: c.sourcePath,
        storyPaths: c.storyPaths,
        status: c.status,
      })),
      tokens: tokens.entries.map((t) => ({
        name: t.name,
        value: t.value,
        category: t.category,
        source: t.source,
        usedBy: t.usedBy,
      })),
      stats: {
        componentFiles: scan.stats.componentFiles,
        storyFiles: scan.stats.storyFiles,
        components: scan.stats.components,
        componentsWithStories: scan.stats.componentsWithStories,
        tokens: tokens.entries.length,
      },
    };
    mainWindow?.webContents.send(IPC.INDEXER_RESULT, payload);
  } catch (err) {
    // Indexer failures shouldn't block preview boot; log and continue.
    const e = err as Error;
    mainWindow?.webContents.send(IPC.INDEXER_RESULT, {
      components: [],
      tokens: [],
      stats: {
        componentFiles: 0,
        storyFiles: 0,
        components: 0,
        componentsWithStories: 0,
        tokens: 0,
      },
      error: e.message,
    });
  }
};

ipcMain.handle(IPC.OPEN_FOLDER, openFolderAndBoot);

ipcMain.handle(IPC.GENERATE_STUB, async (_event, raw: GenerateStubRequestPayload) => {
  if (!activeRepoRoot) return;
  const component = lastComponents.find((c) => c.id === raw.componentId);
  if (!component) {
    const err: StubErrorPayload = {
      componentId: raw.componentId,
      message: 'Component not found in last indexer run.',
    };
    mainWindow?.webContents.send(IPC.STUB_ERROR, err);
    return;
  }

  try {
    const framework: 'react' | 'next' = activeFramework.startsWith('next') ? 'next' : 'react';
    const result = await generateStub({ repoRoot: activeRepoRoot, component, framework });
    const ok: StubGeneratedPayload = {
      componentId: raw.componentId,
      stagedPath: result.stagedPath,
    };
    mainWindow?.webContents.send(IPC.STUB_GENERATED, ok);

    // Re-run the indexer so the renderer's component list reflects the new
    // story coverage. Storybook's own dev server picks up the file via its
    // glob watcher so the preview will refresh on its own.
    void runIndexer(activeRepoRoot);
  } catch (err) {
    const e = err as Error;
    const errPayload: StubErrorPayload = {
      componentId: raw.componentId,
      message: e.message,
    };
    mainWindow?.webContents.send(IPC.STUB_ERROR, errPayload);
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', async () => {
  if (host) {
    await stopStorybookHost(host);
    host = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

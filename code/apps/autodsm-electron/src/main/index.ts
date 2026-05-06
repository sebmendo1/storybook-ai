import { app, BrowserWindow, WebContentsView, ipcMain, dialog } from 'electron';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'pathe';
import { detectFramework, detectStorybook, materializeConfig } from '@autodsm/detect';
import { IPC, type ProjectOpenedPayload, type SupportedFramework } from '@autodsm/shared';
import { startStorybookHost, stopStorybookHost, type StorybookHostHandle } from './storybook-host.ts';

const HERE = dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;
let previewView: WebContentsView | null = null;
let host: StorybookHostHandle | null = null;

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

  const framework = await detectFramework(repoRoot);
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

ipcMain.handle(IPC.OPEN_FOLDER, openFolderAndBoot);

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

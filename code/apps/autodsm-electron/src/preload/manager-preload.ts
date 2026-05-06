import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '@autodsm/shared/ipc';

const api = {
  openFolder: () => ipcRenderer.invoke(IPC.OPEN_FOLDER),
  onProjectOpened: (cb: (payload: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: unknown) => cb(payload);
    ipcRenderer.on(IPC.PROJECT_OPENED, listener);
    return () => ipcRenderer.removeListener(IPC.PROJECT_OPENED, listener);
  },
  onPreviewStarted: (cb: (payload: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: unknown) => cb(payload);
    ipcRenderer.on(IPC.PREVIEW_STARTED, listener);
    return () => ipcRenderer.removeListener(IPC.PREVIEW_STARTED, listener);
  },
  onPreviewError: (cb: (payload: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: unknown) => cb(payload);
    ipcRenderer.on(IPC.PREVIEW_ERROR, listener);
    return () => ipcRenderer.removeListener(IPC.PREVIEW_ERROR, listener);
  },
  onIndexerResult: (cb: (payload: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: unknown) => cb(payload);
    ipcRenderer.on(IPC.INDEXER_RESULT, listener);
    return () => ipcRenderer.removeListener(IPC.INDEXER_RESULT, listener);
  },
  generateStub: (componentId: string) => ipcRenderer.invoke(IPC.GENERATE_STUB, { componentId }),
  onStubGenerated: (cb: (payload: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: unknown) => cb(payload);
    ipcRenderer.on(IPC.STUB_GENERATED, listener);
    return () => ipcRenderer.removeListener(IPC.STUB_GENERATED, listener);
  },
  onStubError: (cb: (payload: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: unknown) => cb(payload);
    ipcRenderer.on(IPC.STUB_ERROR, listener);
    return () => ipcRenderer.removeListener(IPC.STUB_ERROR, listener);
  },
};

contextBridge.exposeInMainWorld('autodsm', api);

declare global {
  interface Window {
    autodsm: typeof api;
  }
}

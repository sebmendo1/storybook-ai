// AutoDSM <-> Storybook channel bridge.
//
// Storybook ships a `Channel` class with a pluggable `ChannelTransport`
// interface (see code/core/src/channels/types.ts). The default transports
// are `PostMessageTransport` (manager↔preview iframe) and
// `WebsocketTransport` (server↔preview). Inside Electron the manager and
// preview live in two separate webContents instances, so we route the
// channel envelope through Electron IPC.
//
// Sprint 6 lands the renderer-side transport contract that
// `createBrowserChannel({ extraTransports: [...] })` expects, plus a small
// bridge contract on the main side. Sprint 7 wires the preview iframe via a
// preload script that translates the iframe's postMessage events to/from
// IPC.

import type { ChannelTransport, ChannelHandler, ChannelEvent } from 'storybook/internal/channels';
import { IPC } from '@autodsm/shared/ipc';

export type ElectronIPCTransport = ChannelTransport;

type RendererBridge = {
  send: (channel: string, payload: unknown) => void;
  on: (channel: string, listener: (payload: unknown) => void) => () => void;
};

/**
 * Implementation that runs in the manager renderer (BrowserWindow). Use it
 * inside the manager's renderer entry:
 *
 *   const transport = createRendererTransport({
 *     send: (c, p) => window.autodsm.ipcSend(c, p),
 *     on: (c, fn) => window.autodsm.ipcOn(c, fn),
 *   });
 *   const channel = createBrowserChannel({ page: 'manager', extraTransports: [transport] });
 */
export const createRendererTransport = (bridge: RendererBridge): ChannelTransport => {
  let handler: ChannelHandler | null = null;
  bridge.on(IPC.CHANNEL_FROM_PREVIEW, (payload) => {
    if (handler) handler(payload as ChannelEvent);
  });

  return {
    setHandler: (h) => {
      handler = h;
    },
    send: (event) => {
      bridge.send(IPC.CHANNEL_FROM_MANAGER, event);
    },
  };
};

export type MainBridge = {
  /** Forward a manager-originated event into the preview's webContents. */
  forwardToPreview: (payload: unknown) => void;
  /** Subscribe to events arriving from the preview side. */
  onFromPreview: (listener: (payload: unknown) => void) => () => void;
  /** Subscribe to events arriving from the manager renderer. */
  onFromManager: (listener: (payload: unknown) => void) => () => void;
  /** Forward a preview-originated event into the manager's webContents. */
  forwardToManager: (payload: unknown) => void;
};

/**
 * Identity wrapper that documents the contract main-process code should
 * implement. The Electron main process owns the actual ipcMain hookups; this
 * helper just narrows the surface so the channels package stays Electron-
 * agnostic and can be unit-tested in Node.
 */
export const createMainBridge = (bridge: MainBridge): MainBridge => bridge;

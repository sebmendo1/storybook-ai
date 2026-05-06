import type { ChannelTransport, ChannelHandler } from 'storybook/internal/channels';
import { IPC } from '@autodsm/shared/ipc';

export type ElectronIPCTransport = ChannelTransport;

type RendererBridge = {
  send: (channel: string, payload: unknown) => void;
  on: (channel: string, listener: (payload: unknown) => void) => () => void;
};

export const createRendererTransport = (bridge: RendererBridge): ChannelTransport => {
  let handler: ChannelHandler | null = null;
  bridge.on(IPC.CHANNEL_FROM_PREVIEW, (payload) => {
    handler?.(payload as Parameters<ChannelHandler>[0]);
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

type MainBridge = {
  forwardToPreview: (payload: unknown) => void;
  onFromPreview: (listener: (payload: unknown) => void) => () => void;
  onFromManager: (listener: (payload: unknown) => void) => () => void;
  forwardToManager: (payload: unknown) => void;
};

export const createMainTransport = (bridge: MainBridge): MainBridge => bridge;

import { IPC_CHANNELS } from '../../types/ipc'

export { IPC_CHANNELS }

export const CHANNELS = IPC_CHANNELS

export const ALLOWED_CHANNELS = new Set<string>(Object.values(CHANNELS))

export function isValidChannel(channel: string): boolean {
  return ALLOWED_CHANNELS.has(channel)
}
import { ipcMain } from 'electron'
import { CHANNELS } from './channels'
import { backend } from '../backend-client'
import { assertConfigKeyAllowed } from './guards'

export function registerConfigHandlers() {
  ipcMain.handle(CHANNELS.CONFIG_GET, async (_event, key: string, directory?: string) => {
    assertConfigKeyAllowed(key)
    return await backend.config.get(key, directory)
  })

  ipcMain.handle(CHANNELS.CONFIG_SET, async (_event, key: string, value: unknown, directory?: string) => {
    assertConfigKeyAllowed(key)
    await backend.config.set(key, value, directory)
    return true
  })

  ipcMain.handle(CHANNELS.CONFIG_MODELS, async (_event, directory?: string) => {
    return await backend.config.models(directory)
  })

  ipcMain.handle(CHANNELS.CONSOLE_GET, async (_event, directory?: string) => {
    return await backend.console.get(directory)
  })

  ipcMain.handle(CHANNELS.PROVIDER_AUTH_METHODS, async (_event, directory?: string) => {
    return await backend.provider.authMethods(directory)
  })

  ipcMain.handle(CHANNELS.PROVIDER_AUTHORIZE, async (_event, providerID: string, method: number, inputs?: Record<string, string>, directory?: string) => {
    return await backend.provider.authorize(providerID, method, inputs, directory)
  })

  ipcMain.handle(CHANNELS.PROVIDER_AUTH_CALLBACK, async (_event, providerID: string, method: number, code?: string, directory?: string) => {
    return await backend.provider.authCallback(providerID, method, code, directory)
  })

  ipcMain.handle(CHANNELS.PROVIDER_ADD, async (_event, config: { name: string; apiKey: string; baseUrl?: string }, directory?: string) => {
    try {
      return await backend.provider.add(config, directory)
    } catch (err) {
      console.error('[ConfigHandler] provider add error:', err)
      return { success: false, error: 'Failed to add provider' }
    }
  })

  ipcMain.handle(CHANNELS.PROVIDER_UPDATE, async (_event, providerId: string, config: { apiKey?: string; baseUrl?: string }, directory?: string) => {
    try {
      return await backend.provider.update(providerId, config, directory)
    } catch (err) {
      console.error('[ConfigHandler] provider update error:', err)
      return { success: false, error: 'Failed to update provider' }
    }
  })

  ipcMain.handle(CHANNELS.PROVIDER_DELETE, async (_event, providerId: string, directory?: string) => {
    try {
      return await backend.provider.delete(providerId, directory)
    } catch (err) {
      console.error('[ConfigHandler] provider delete error:', err)
      return { success: false, error: 'Failed to delete provider' }
    }
  })

  ipcMain.handle(CHANNELS.PROVIDER_TEST, async (_event, providerIdOrConfig: string | { name: string; apiKey: string; baseUrl?: string }, directory?: string) => {
    try {
      return await backend.provider.test(providerIdOrConfig, directory)
    } catch (err) {
      console.error('[ConfigHandler] provider test error:', err)
      return { success: false, error: 'Failed to test provider' }
    }
  })

  ipcMain.handle(CHANNELS.PROVIDER_REFRESH_MODELS, async (_event, providerId: string, directory?: string) => {
    try {
      return await backend.provider.refreshModels(providerId, directory)
    } catch (err) {
      console.error('[ConfigHandler] provider refresh models error:', err)
      return { success: false, error: 'Failed to refresh models' }
    }
  })
}
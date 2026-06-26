import { ipcMain } from 'electron'
import { CHANNELS } from './channels'
import { getMainWindow } from '../window'

export function registerWindowHandlers() {
  ipcMain.handle(CHANNELS.WINDOW_SET_TITLE_BAR_OVERLAY, async (_event, options: { color: string; symbolColor: string }) => {
    const win = getMainWindow()
    if (win && !win.isDestroyed()) {
      win.setTitleBarOverlay({
        color: options.color,
        symbolColor: options.symbolColor,
        height: 48,
      })
    }
    return true
  })
}
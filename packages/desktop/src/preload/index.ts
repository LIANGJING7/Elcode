import { contextBridge } from 'electron'
import { desktopAPI } from './api'

contextBridge.exposeInMainWorld('desktop', desktopAPI)

declare global {
  interface Window {
    desktop: typeof desktopAPI
  }
}
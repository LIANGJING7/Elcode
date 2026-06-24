import type { DesktopAPI } from '../preload/api'

declare global {
  interface Window {
    desktop: DesktopAPI
  }
}

export {}
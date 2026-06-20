import { defineConfig, external } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'
import path from 'path'

export default defineConfig({
  main: {
    plugins: [external()],
    resolve: {
      alias: {
        '@opencode': path.resolve(__dirname, '../../src')
      }
    }
  },
  preload: {
    plugins: [external()]
  },
  renderer: {
    plugins: [react()],
    css: {
      postcss: {
        plugins: [tailwindcss(), autoprefixer()]
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src/renderer')
      }
    }
  }
})
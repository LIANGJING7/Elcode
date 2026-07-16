import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    electron([
      {
        entry: 'src/main/index.ts',
        vite: {
          build: {
            outDir: 'dist/main',
            rollupOptions: {
              external: ['electron']
            }
          }
        }
      },
      {
        entry: 'src/main/backend-launcher.ts',
        vite: {
          build: {
            outDir: 'dist/main',
            rollupOptions: {
              external: ['electron', '@model-agent/core/server']
            }
          }
        }
      }
      // Note: the preload bundle is intentionally NOT built through this
      // plugin. vite-plugin-electron's dev watch emits two passes for each
      // entry — first an ESM `__commonJS`-wrapped bundle, then a shorter
      // clean CJS lib bundle — and writes the second without truncating the
      // file, so the ESM tail (`export default require_index();` plus stray
      // fragments) is left dangling after the new CJS body. The resulting
      // `.cjs` fails to parse under Electron, so
      // `contextBridge.exposeInMainWorld` never runs and `window.desktop`
      // is `undefined`. Building preload as a separate one-shot
      // `vite build --lib` (scripts `build:preload` / `predev`) avoids the
      // watch double-write and always produces a clean single-line CJS.
      // Run `npm run build:preload` after editing preload source.
    ])
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/renderer')
    }
  },
  build: {
    outDir: 'dist/renderer',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        loading: path.resolve(__dirname, 'src/renderer/loading.html'),
        error: path.resolve(__dirname, 'src/renderer/error.html')
      }
    }
  },
  test: {
    environment: 'jsdom',
    include: ['src/renderer/__tests__/**/*.test.ts'],
    globals: true
  }
})
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron'
import path from 'path'

export default defineConfig({
  plugins: [
    vue(),
    electron([
      {
        entry: 'src/main/index.ts',
        vite: {
          build: {
            outDir: 'dist/main',
            rollupOptions: {
              external: ['electron', 'drizzle-orm']
            }
          }
        }
      },
      {
        entry: 'src/preload/index.ts',
        vite: {
          build: {
            outDir: 'dist/preload'
          }
        }
      }
    ])
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/renderer'),
      '@model-agent/core': path.resolve(__dirname, '../../src'),
      '@model-agent/session': path.resolve(__dirname, '../../src/session'),
      '@model-agent/storage': path.resolve(__dirname, '../../src/storage')
    }
  },
  build: {
    outDir: 'dist/renderer'
  },
  test: {
    environment: 'jsdom',
    include: ['src/renderer/__tests__/**/*.test.ts'],
    globals: true
  }
})
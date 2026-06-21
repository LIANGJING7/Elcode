import { defineConfig, external } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'
import path from 'path'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        external: [
          'electron',
          /^@\/.*/,
          /^@opencode\/.*/
        ]
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '../../src'),
        '@opencode': path.resolve(__dirname, '../../src')
      }
    }
  },
  preload: {
    build: {
      rollupOptions: {
        external: ['electron']
      }
    }
  },
  renderer: {
    build: {
      rollupOptions: {
        external: []
      }
    },
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
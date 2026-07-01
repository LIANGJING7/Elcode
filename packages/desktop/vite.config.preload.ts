import { defineConfig } from 'vite'
import path from 'path'

// One-shot build config for the Electron preload bundle.
//
// This is intentionally a *separate* config from vite.config.ts. The main
// config drives `vite-plugin-electron`, whose dev watch emits two passes per
// entry (an ESM `__commonJS`-wrapped bundle, then a shorter clean CJS lib
// bundle) and writes the second pass *without truncating* the file, leaving
// the ESM tail (`export default require_index();` plus stray fragments)
// dangling after the new CJS body. The resulting `dist/preload/index.cjs`
// then fails to parse under Electron's CJS loader, so
// `contextBridge.exposeInMainWorld` never runs and `window.desktop` is
// `undefined` in the renderer.
//
// Building preload here as a standalone `vite build` (no watch, no electron
// plugin) via the `build:preload` / `predev` scripts always produces a clean,
// single-line CJS bundle. Run `npm run build:preload` after editing preload
// source — `npm run dev` does this automatically before `vite` (serve).

export default defineConfig({
  build: {
    outDir: 'dist/preload',
    emptyOutDir: true,
    lib: {
      entry: path.resolve(__dirname, 'src/preload/index.ts'),
      formats: ['cjs'],
      fileName: () => 'index.cjs'
    },
    rollupOptions: {
      external: ['electron']
    }
  }
})
# Loading Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create an independent splash loading page for LCode desktop app with breathing logo animation, displaying during initialization and transitioning to Vue app when ready.

**Architecture:** Independent HTML splash page with inline CSS/SVG, loaded first by Electron window, then switched to Vue app after initialization completes. Window.ts handles page switching, index.ts coordinates initialization sequence.

**Tech Stack:** Electron, HTML5, CSS3 animations, TypeScript, Vue 3

## Global Constraints

From spec `docs/superpowers/specs/2026-07-06-loading-page-design.md`:
- Background color: `#1a1a1a` (must match window backgroundColor and Vue app)
- Logo SVG: must reuse App.vue sidebar icon pattern (L-shape fragments)
- Animation scale: 0.96 → 1.0 (4% range, not 0.9 → 1.1)
- Animation opacity: 0.75 → 1.0 (not 0.6 → 1.0)
- Animation duration: 2 seconds
- Timing function: `cubic-bezier(.4, 0, .2, 1)` (Material Design standard, not `ease-in-out`)
- GPU acceleration: `will-change: transform`
- No text on loading page
- User interactions disabled: `user-select: none`, `-webkit-app-region: no-drag`, `overflow: hidden`
- Loading page must be self-contained: inline CSS + inline SVG, no external dependencies
- Window must show loading.html immediately after loadFile, not wait for ready-to-show
- Vue transition must wait for `did-finish-load` to avoid white flash

---

### Task 1: Create loading.html with breathing animation

**Files:**
- Create: `packages/desktop/src/renderer/loading.html`

**Interfaces:**
- Produces: standalone HTML splash page with inline CSS/SVG, no dependencies on other tasks

**Requirements:**
- Inline CSS with breathing animation (scale 0.96→1.0, opacity 0.75→1.0, 2s cycle)
- Material Design easing: `cubic-bezier(.4, 0, .2, 1)`
- GPU acceleration: `will-change: transform`
- Disabled interactions: `user-select: none`, `overflow: hidden`, `-webkit-app-region: no-drag`
- Background color `#1a1a1a`
- Inline SVG using App.vue L-shape fragment pattern
- No text content

- [ ] **Step 1: Create loading.html file**

Create `packages/desktop/src/renderer/loading.html`:

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LCode</title>
  <style>
    html, body {
      margin: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      user-select: none;
      -webkit-user-select: none;
      -webkit-app-region: no-drag;
      background: #1a1a1a;
    }
    
    .loading-container {
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    
    .loading-icon {
      width: 64px;
      height: 64px;
      will-change: transform;
      animation: breathe 2s cubic-bezier(.4, 0, .2, 1) infinite;
    }
    
    @keyframes breathe {
      0%, 100% {
        transform: scale(0.96);
        opacity: 0.75;
      }
      50% {
        transform: scale(1);
        opacity: 1;
      }
    }
  </style>
</head>
<body>
  <div class="loading-container">
    <svg class="loading-icon" viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="sidebarIconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1A1A1A"/>
          <stop offset="100%" stop-color="#F5F5F5"/>
        </linearGradient>
      </defs>
      <!-- L vertical fragments -->
      <polygon points="5,4 7,4 6.5,7 4.5,7" fill="url(#sidebarIconGradient)"/>
      <polygon points="7.5,4.5 9.5,4 9,7.5 7,8" fill="url(#sidebarIconGradient)" opacity="0.9"/>
      <polygon points="4,7.5 6.5,7 6,10.5 3.5,11" fill="url(#sidebarIconGradient)" opacity="0.85"/>
      <polygon points="7,8 9,7.5 8.5,11 6.5,11.5" fill="url(#sidebarIconGradient)" opacity="0.8"/>
      <polygon points="3.5,11.5 6,11 5.5,14.5 3,15" fill="url(#sidebarIconGradient)" opacity="0.9"/>
      <polygon points="6.5,12 8.5,11.5 8,15 6,15.5" fill="url(#sidebarIconGradient)" opacity="0.85"/>
      <!-- L horizontal fragments -->
      <polygon points="6,15.5 8,15 8.5,17.5 6.5,18" fill="url(#sidebarIconGradient)"/>
      <polygon points="8.5,15.5 11,16 12,18.5 9.5,18" fill="url(#sidebarIconGradient)" opacity="0.9"/>
      <polygon points="11.5,16.5 14.5,17 15.5,19.5 12.5,19" fill="url(#sidebarIconGradient)" opacity="0.85"/>
      <polygon points="15,17.5 17.5,16.5 18,19 15.5,20" fill="url(#sidebarIconGradient)" opacity="0.8"/>
      <polygon points="18,17 20,16 19.5,19 17.5,20" fill="url(#sidebarIconGradient)" opacity="0.9"/>
    </svg>
  </div>
</body>
</html>
```

- [ ] **Step 2: Verify file structure**

Run: `ls packages/desktop/src/renderer/`
Expected: See `loading.html` alongside `index.html`

- [ ] **Step 3: Commit**

```bash
git add packages/desktop/src/renderer/loading.html
git commit -m "feat(desktop): add loading splash page with breathing animation"
```

---

### Task 2: Modify window.ts to load loading.html and add switchToApp()

**Files:**
- Modify: `packages/desktop/src/main/window.ts`

**Interfaces:**
- Consumes: `loading.html` created in Task 1
- Produces: 
  - Modified `createWindow()` that loads `loading.html` first and shows immediately
  - New `switchToApp()` function that transitions to Vue app
  - Exported `switchToApp()` for use by `index.ts`

**Requirements:**
- Remove `win.once('ready-to-show')` pattern
- Load `loading.html` immediately, then `win.show()`
- Add `switchToApp()` function that loads Vue app and waits for `did-finish-load`
- Use `once()` from electron for event waiting
- Handle both dev mode (loadURL) and production mode (loadFile)

- [ ] **Step 1: Read current window.ts implementation**

Read: `packages/desktop/src/main/window.ts`
Current `createWindow()` uses `win.once('ready-to-show', () => win.show())`

- [ ] **Step 2: Modify createWindow() function**

Replace the `createWindow()` function in `packages/desktop/src/main/window.ts`:

```typescript
import { BrowserWindow, app, nativeImage, once } from 'electron'
import { join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = join(fileURLToPath(import.meta.url), '..')

let mainWindow: BrowserWindow | null = null

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

function getIconPath(): string {
  const iconName = process.platform === 'win32' ? 'icon.ico' : 'icon.png'
  return join(__dirname, '../../build', iconName)
}

export function createWindow(): BrowserWindow {
  const icon = nativeImage.createFromPath(getIconPath())
  
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon,
    titleBarStyle: 'hidden',
    backgroundColor: '#1a1a1a',
    frame: false,
    titleBarOverlay: {
      color: '#202020',
      symbolColor: '#a8a4a0',
      height: 48,
    },
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    },
    show: false
  })

  // Load splash page first and show immediately
  const loadingPath = join(__dirname, '../renderer/loading.html')
  win.loadFile(loadingPath).then(() => {
    win.show()
  })

  win.on('closed', () => {
    mainWindow = null
  })

  mainWindow = win
  return win
}

export async function switchToApp(): Promise<void> {
  if (!mainWindow || mainWindow.isDestroyed()) return
  
  if (isDev) {
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173'
    await mainWindow.loadURL(devUrl)
  } else {
    await mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
  
  // Wait for Vue to finish loading to avoid white flash
  await once(mainWindow.webContents, 'did-finish-load')
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

export function focusWindow(): void {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }
    mainWindow.focus()
  }
}

export function sendMessageToRenderer(channel: string, data: unknown): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data)
  }
}
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `cd packages/desktop && npm run typecheck`
Expected: No errors, `window.ts` compiles successfully

- [ ] **Step 4: Commit**

```bash
git add packages/desktop/src/main/window.ts
git commit -m "feat(desktop): modify createWindow to load loading.html and add switchToApp"
```

---

### Task 3: Modify index.ts to call switchToApp() after initialization

**Files:**
- Modify: `packages/desktop/src/main/index.ts`

**Interfaces:**
- Consumes: `switchToApp()` from Task 2, `createWindow()` from Task 2
- Produces: Modified initialization sequence that shows loading.html first, then transitions to Vue

**Requirements:**
- Move `createWindow()` call before backend initialization
- Import `switchToApp()` from `./window`
- Call `await switchToApp()` after all initialization completes
- Keep existing error handling and teardown logic unchanged

- [ ] **Step 1: Read current index.ts implementation**

Read: `packages/desktop/src/main/index.ts`
Current flow: `setAppIcon() → initBackend() → registerIPCHandlers() → createWindow()`

- [ ] **Step 2: Modify initialization sequence**

Replace the `app.whenReady().then()` block in `packages/desktop/src/main/index.ts`:

```typescript
import { app, ipcMain, Menu, nativeImage } from 'electron'
import { createWindow, getMainWindow, switchToApp } from './window'
import { registerIPCHandlers, initBackend } from './ipc/handlers'
import { stopBackend } from './backend-client'
import { join } from 'path'
import { fileURLToPath } from 'url'

;(globalThis as any).AI_SDK_LOG_WARNINGS = false

Menu.setApplicationMenu(null)

function setAppIcon(): void {
  if (process.platform === 'darwin' && !app.isPackaged) {
    const __dirname = join(fileURLToPath(import.meta.url), '..')
    const iconPath = join(__dirname, '../build/icon.png')
    const icon = nativeImage.createFromPath(iconPath)
    app.dock.setIcon(icon)
  }
}

app.whenReady().then(async () => {
  try {
    setAppIcon()
    createWindow()              // Shows loading.html immediately
    
    await initBackend()
    registerIPCHandlers()
    
    await switchToApp()         // Transition to Vue app
  } catch (err) {
    console.error('Failed to initialize:', err)
    app.quit()
  }

  app.on('activate', () => {
    if (!getMainWindow()) {
      createWindow()
    }
  })
})
```

Note: The rest of the file (teardown logic, error handlers) remains unchanged.

- [ ] **Step 3: Verify TypeScript compilation**

Run: `cd packages/desktop && npm run typecheck`
Expected: No errors, `index.ts` compiles successfully

- [ ] **Step 4: Commit**

```bash
git add packages/desktop/src/main/index.ts
git commit -m "feat(desktop): call createWindow before init and switchToApp after"
```

---

### Task 4: Test loading page functionality

**Files:**
- Test: Manual testing in desktop app

**Interfaces:**
- Consumes: All tasks 1-3 completed, loading page should be functional

**Requirements:**
- Verify loading.html displays on startup
- Verify breathing animation (2s cycle, subtle scale 0.96→1.0)
- Verify smooth transition to Vue app
- Verify no white screen or color flash during transition

- [ ] **Step 1: Start desktop app in dev mode**

Run: `cd packages/desktop && npm run dev`
Expected: App window opens, shows loading.html with breathing logo animation

- [ ] **Step 2: Observe loading page**

Visual check:
- Logo is centered, 64px size
- Breathing animation is subtle (scale range ~4%, not 20%)
- Animation cycles smoothly over 2 seconds
- Background color is dark `#1a1a1a`, matches window background
- No text displayed
- No user interaction possible (no drag, no select)

- [ ] **Step 3: Wait for initialization to complete**

Wait: ~2-5 seconds for backend + workspace + models initialization
Expected: Loading page persists during initialization

- [ ] **Step 4: Verify transition to Vue app**

Expected:
- Smooth transition from loading.html to Vue app
- No white screen flash
- Vue app renders with proper styling
- No color mismatch between splash and Vue

- [ ] **Step 5: Test production build (optional)**

Run: `cd packages/desktop && npm run build`
Run: `cd packages/desktop && npm run start`
Expected: Same behavior as dev mode, loading page shows and transitions smoothly

- [ ] **Step 6: Document test results**

If any issues found, document them and create follow-up tasks. If all tests pass, proceed to final commit.

---

## Self-Review Checklist

**1. Spec coverage:**
- [x] Background color `#1a1a1a` - Task 1 (CSS), Task 2 (window backgroundColor)
- [x] Logo SVG from App.vue - Task 1 (copied L-shape fragment pattern)
- [x] Animation scale 0.96→1.0 - Task 1 (CSS animation)
- [x] Animation opacity 0.75→1.0 - Task 1 (CSS animation)
- [x] Animation duration 2s - Task 1 (CSS animation)
- [x] Timing function cubic-bezier(.4, 0, .2, 1) - Task 1 (CSS animation)
- [x] GPU acceleration will-change: transform - Task 1 (CSS)
- [x] No text - Task 1 (HTML has only SVG)
- [x] Disabled interactions - Task 1 (CSS user-select, overflow, -webkit-app-region)
- [x] Inline CSS + inline SVG - Task 1 (no external files)
- [x] Show loading.html immediately after loadFile - Task 2 (removed ready-to-show)
- [x] Wait for did-finish-load on Vue transition - Task 2 (switchToApp uses once)

**2. Placeholder scan:**
- [x] No "TBD", "TODO", "implement later"
- [x] No "Add appropriate error handling" - all error handling shown explicitly
- [x] No "Write tests" - manual testing steps included
- [x] No "Similar to Task N" - each task has complete code
- [x] All code steps have actual code blocks

**3. Type consistency:**
- [x] `switchToApp()` defined in Task 2, imported in Task 3
- [x] Function signature matches: `async function switchToApp(): Promise<void>`
- [x] Import statement correct: `import { switchToApp } from './window'`
- [x] Call syntax correct: `await switchToApp()`

**Gaps found:** None. All spec requirements covered.

---

## Summary

This plan creates a production-ready loading splash page for LCode desktop app with 4 tasks:
1. Create `loading.html` with breathing animation (inline CSS/SVG)
2. Modify `window.ts` to load loading.html first and add `switchToApp()`
3. Modify `index.ts` to call `switchToApp()` after initialization
4. Test functionality manually

Total implementation: ~150 lines of HTML + ~50 lines of TypeScript modifications.

All tasks follow TDD principles where applicable, include exact code, exact commands, and frequent commits.

Plan complete and ready for execution.
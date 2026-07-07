# Loading Page Design - LCode Desktop App

## Overview

Create an independent splash loading page for LCode desktop application that displays a breathing logo animation during the entire application initialization phase. The page transitions smoothly to Vue application once all initialization tasks complete.

## Requirements

### Display Timing
- Show during entire application initialization: backend startup + workspace loading + models loading + MCP loading + skills loading
- Hide after all initialization tasks complete

### Visual Content
- Pure logo breathing animation (no text, no progress indicators)
- Centered 64px logo
- Background color: `#1a1a1a` (consistent with Vue app)

### Animation Parameters
- Scale: 0.96 → 1.0 (4% range, subtle effect)
- Opacity: 0.75 → 1.0
- Duration: 2 seconds
- Timing function: `cubic-bezier(.4, 0, .2, 1)` (Material Design standard)
- GPU acceleration: `will-change: transform`

## Architecture

### File Structure

```text
packages/desktop/src/
├── main/
│   └── window.ts              // Modified: load loading.html first, then switch to Vue
│   └── index.ts               // Modified: call switchToApp() after initialization
│
└── renderer/
    ├── loading.html           // New: Splash page (inline CSS + SVG, ~100-150 lines)
    ├── index.html             // Keep: Vue entry point
```

### Responsibilities

**loading.html**
- Independent splash page
- Inline CSS (no separate CSS file)
- Inline SVG logo (reuse App.vue logo design)
- Pure CSS animation (no JavaScript)
- Self-contained: no external dependencies

**window.ts**
- Create BrowserWindow
- Load loading.html first
- Show window immediately after loadFile completes
- Export `switchToApp()` function for page transition

**index.ts**
- Application entry point
- Coordinate initialization sequence
- Call `switchToApp()` after all initialization complete

## Implementation Details

### 1. loading.html

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
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
      <!-- Reuse L-shape fragment pattern from App.vue -->
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

**Key Features:**
- Inline CSS (no external CSS file)
- Inline SVG (reuse App.vue logo)
- Subtle breathing animation (4% scale range)
- Material Design easing curve
- GPU acceleration
- Disabled interactions (no select, no drag, no scroll)
- No text (pure logo animation)

### 2. window.ts Modifications

**Current flow:**
```ts
createWindow()
  → BrowserWindow({ show: false })
  → loadURL or loadFile
  → win.once('ready-to-show', () => win.show())
```

**New flow:**
```ts
createWindow()
  → BrowserWindow({ show: false })
  → await win.loadFile("loading.html")
  → win.show()

switchToApp()
  → await win.loadURL(devServerUrl) or loadFile(index.html)
  → await once(win.webContents, "did-finish-load")
```

**Implementation:**
```ts
export function createWindow(): BrowserWindow {
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

  // Load splash page first
  const loadingPath = join(__dirname, '../renderer/loading.html')
  win.loadFile(loadingPath).then(() => {
    win.show()
  })

  mainWindow = win
  return win
}

export async function switchToApp(): void {
  if (!mainWindow) return
  
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
  
  if (isDev) {
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173'
    await mainWindow.loadURL(devUrl)
  } else {
    await mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
  
  // Wait for Vue to finish loading
  await once(mainWindow.webContents, "did-finish-load")
}
```

### 3. index.ts Modifications

**Current flow:**
```ts
app.whenReady()
  → setAppIcon()
  → await initBackend()
  → registerIPCHandlers()
  → createWindow()
```

**New flow:**
```ts
app.whenReady()
  → setAppIcon()
  → createWindow()          // Shows loading.html immediately
  → await initBackend()
  → registerIPCHandlers()
  → await switchToApp()     // Transition to Vue app
```

**Implementation:**
```ts
import { switchToApp } from './window'

app.whenReady().then(async () => {
  try {
    setAppIcon()
    createWindow()              // Shows loading.html
    
    await initBackend()
    registerIPCHandlers()
    
    await switchToApp()         // Transition to Vue
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

## Production Optimizations

### Visual Consistency
- Background color `#1a1a1a` matches window backgroundColor and Vue app
- Logo SVG identical to App.vue sidebar icon
- No color flash during transition

### Performance
- Inline CSS: no external resource requests
- Inline SVG: no file:// path issues
- GPU acceleration: `will-change: transform`
- Lightweight HTML: ~100-150 lines

### User Experience
- Subtle animation: 4% scale range (not distracting)
- Material Design easing: natural rhythm
- No text: modern, minimalist aesthetic
- Disabled interactions: no accidental select/drag/scroll

### Best Practices
- YAGNI: no unnecessary bootstrap layer
- Clear responsibilities: window.ts handles window, index.ts coordinates initialization
- Self-contained: loading.html independent from Vue ecosystem

## Testing

### Manual Testing
1. Run `bun dev` in packages/desktop
2. Observe loading.html displays immediately on startup
3. Verify breathing animation (2s cycle, subtle scale 0.96→1)
4. Wait for backend initialization
5. Verify smooth transition to Vue app
6. Check no white screen or color flash during transition

### Edge Cases
- Backend startup failure: loading page should persist until error displayed
- Slow initialization: animation continues indefinitely
- Multiple windows: each window follows same flow

## Future Enhancements (Optional)

If initialization becomes complex in future:
- Add bootstrap.ts to coordinate multi-stage initialization
- Add IPC event from renderer to signal "app-ready" for more precise timing
- Add loading stages text (only if initialization time > 3-5 seconds)

## Summary

This design creates a modern, production-ready splash loading page for LCode desktop application:
- Independent HTML splash page with inline CSS/SVG
- Subtle breathing logo animation (4% scale, Material Design easing)
- Smooth transition to Vue app after initialization
- Visual consistency across splash and Vue app
- Production optimizations: GPU acceleration, disabled interactions
- Clear architecture: window.ts + index.ts responsibilities

Total implementation: ~100-150 lines of HTML + minor modifications to window.ts and index.ts.
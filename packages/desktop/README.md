# OpenCode Desktop

A native desktop application for OpenCode, built with Electron and React.

## Features

- **Chat Interface**: Real-time messaging with markdown rendering and code syntax highlighting
- **Session Management**: Create, browse, and switch between conversation sessions
- **File Operations**: Browse workspace files and view file contents
- **Model Selection**: Choose between available AI models
- **Streaming Responses**: Real-time message streaming with partial content display

## Development

### Prerequisites

- [Bun](https://bun.sh) >= 1.0
- Node.js >= 18 (for Electron compatibility)

### Install Dependencies

```bash
bun install
```

### Run Development Server

```bash
bun run dev
```

This starts Electron with hot-reload enabled for the renderer process.

## Build

### Build for Current Platform

```bash
bun run build
```

### Preview Production Build

```bash
bun run preview
```

### Distribute (Packaged Application)

Requires additional electron-builder setup. The build command compiles the application, but distribution packaging may need further configuration.

## Architecture

OpenCode Desktop follows Electron's standard multi-process architecture:

### Main Process (`src/main/`)

- Entry point that creates the browser window
- Manages WebSocket connection to the OpenCode server
- Handles IPC communication with the renderer
- Controls application lifecycle

### Renderer Process (`src/renderer/`)

React-based UI with the following structure:

- `App.tsx`: Root component with window state management
- `components/`: UI components (ChatView, Sidebar, TitleBar, etc.)
- `hooks/`: Custom hooks for WebSocket, messages, and sessions
- `api/`: WebSocket client and protocol definitions

### Preload Script (`src/preload/`)

Exposes safe IPC methods to the renderer via contextBridge.

## WebSocket Protocol

The desktop app communicates with the OpenCode server via WebSocket:

### Message Types

| Type | Description |
|------|-------------|
| `WSRequest` | Client request with route and payload |
| `WSResponse` | Server response with success/error |
| `WSStreamEvent` | Streaming events for message updates |

### Routes

| Route | Description |
|-------|-------------|
| `session/list` | Get all sessions |
| `session/create` | Create new session |
| `session/get` | Get session details |
| `message/list` | Get session messages |
| `message/send` | Send new message |
| `file/list` | List workspace files |
| `file/read` | Read file contents |
| `model/list` | Get available models |

See `src/renderer/api/protocol.ts` for full type definitions.

## Configuration

### TypeScript

Type checking configured with separate configs for main and renderer processes:

- `tsconfig.json`: Renderer process (React)
- `tsconfig.node.json`: Main process (Electron Node.js)

### Tailwind CSS

Styling uses Tailwind CSS with the config in `tailwind.config.js`.

### Electron Vite

Build tooling provided by electron-vite, configured in `electron.vite.config.ts`.

## Project Structure

```
packages/desktop/
├── src/
│   ├── main/           # Electron main process
│   │   ├── index.ts    # Window creation & lifecycle
│   │   └── server.ts   # WebSocket connection
│   ├── preload/        # Context bridge for IPC
│   │   └── index.ts    # Exposed API methods
│   └── renderer/       # React UI
│       ├── main.tsx    # Entry point
│       ├── App.tsx     # Root component
│       ├── api/        # WebSocket client
│       ├── components/ # UI components
│       └── hooks/      # React hooks
├── electron.vite.config.ts
├── package.json
├── tsconfig.json
├── tsconfig.node.json
└── tailwind.config.js
```

## License

Private package, part of the OpenCode project.
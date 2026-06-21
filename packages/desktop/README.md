# Model Agent Desktop

Electron desktop application for Model Agent with Codex Desktop-inspired UI.

## Development

```bash
bun install
bun dev
```

## Build

```bash
bun run build
bun run package
```

## Architecture

- **Main Process**: Electron entry, IPC handlers, backend integration
- **Preload**: Context bridge for secure IPC
- **Renderer**: Vue 3 + Pinia + Tailwind CSS

## Key Components

- `Sidebar.vue` - Conversation navigation
- `ChatTimeline.vue` - Message display
- `Composer.vue` - Input area
- `stores/session.ts` - Session state management

## Testing

```bash
bun test           # Unit tests (vitest)
bun test:watch     # Watch mode
```

## Project Structure

```
src/
├── main/           # Electron main process
│   ├── index.ts    # Entry point
│   ├── window.ts   # Window management
│   ├── security.ts # Security utilities
│   └── ipc/        # IPC handlers
├── preload/        # Preload scripts
│   ├── index.ts    # Context bridge setup
│   └── api.ts      # Desktop API interface
├── renderer/       # Vue frontend
│   ├── main.ts     # Vue app entry
│   ├── App.vue     # Root component
│   ├── components/ # UI components
│   ├── stores/     # Pinia stores
│   └── utils/      # Helper utilities
└── types/          # TypeScript types
    └ ipc.ts        # IPC interfaces
```
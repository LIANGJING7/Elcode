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
- `components/settings/SettingsMcp.vue` - MCP server configuration UI

## MCP Configuration

MCP (Model Context Protocol) servers are configured globally via `~/.config/lcode/lcode.jsonc`.

### Configuration Structure

```jsonc
{
  "$schema": "https://raw.githubusercontent.com/anomalyco/opencode/main/packages/desktop/src/main/schemas/lcode.schema.json",
  "mcp": {
    "my-server": {
      "type": "local",           // or "remote"
      "enabled": true,
      "command": ["npx", "-y", "my-mcp-server"],  // for local
      "environment": { "API_KEY": "..." }
    },
    "remote-server": {
      "type": "remote",
      "enabled": true,
      "url": "https://api.example.com/mcp"
    }
  }
}
```

### IPC Channels

- `lcode:config:read` - Read global config
- `lcode:config:patch` - Patch config with JSONPath edits
- `lcode:mcp-server:add` - Add MCP server
- `lcode:mcp-server:update` - Update MCP server
- `lcode:mcp-server:delete` - Delete MCP server

### API Usage (Renderer)

```typescript
// Read global config
const result = await window.desktop.lcode.config.read()

// Add MCP server
await window.desktop.lcode.mcpServer.add('server-name', {
  type: 'local',
  command: ['npx', '-y', 'my-server'],
  enabled: true
})

// Update server
await window.desktop.lcode.mcpServer.update('server-name', {
  enabled: false
})

// Delete server
await window.desktop.lcode.mcpServer.delete('server-name')
```

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
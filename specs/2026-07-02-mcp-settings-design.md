# MCP Settings Page Design Specification

**Date**: 2026-07-02
**Author**: Design Team
**Status**: Draft - Pending Review

---

## Overview

This document specifies the redesign of the MCP (Model Context Protocol) Settings page for the desktop application. The goal is to create a comprehensive UI that fully supports the official OpenCode MCP configuration format (`lcode.jsonc`) while providing an enhanced desktop experience.

---

## 1. Overall Layout

The page adopts a two-panel layout consistent with `SettingsModels.vue`:

```
┌─────────────────────────────────────────────────────────────┐
│ MCP Servers                                     [+ Add] [Reload]
├──────────────────┬──────────────────────────────────────────┤
│                  │                                          │
│ Server List      │ Server Detail                            │
│ (fixed width)    │ (flexible width)                         │
│                  │                                          │
│                  │ Multiple Sections                        │
│                  │                                          │
└──────────────────┴──────────────────────────────────────────┘
```

**Header Section**:
- Title: "MCP Servers"
- Actions: `+ Add Server` | `Reload`

---

## 2. Left Panel: Server List

### 2.1 List Item Design

Each server item displays:

```
┌─────────────────────────────────┐
│ Github                   [开关] │
│ Connected • HTTP               │
└─────────────────────────────────┘
```

**Components**:
- **Name**: Server unique identifier (line 1)
- **Status + Transport**: e.g., "Connected • HTTP" (line 2)
- **Enabled Toggle**: Quick enable/disable switch (right side)

### 2.2 Status Indicators

| Status | Color | Display Text |
|--------|-------|--------------|
| Connected | Green | Connected |
| Disabled | Gray | Disabled |
| Auth Required | Yellow | Auth Required |
| Auth Failed | Yellow | Auth Failed |
| Connection Failed | Red | Connection Failed |
| Testing | Blue | Testing... |

### 2.3 Bottom Actions

- `Open lcode.jsonc`: Opens the configuration file in external editor

### 2.4 Empty State

```
暂无MCP服务器
点击"Add Server"添加第一个服务器
```

---

## 3. Right Panel: Server Detail

The detail panel contains multiple sections in order:

### 3.1 Basic Section

```
Basic
─────────────────────────────
Name
[ Github                     ]

Transport
○ Command (stdio)
○ HTTP (StreamableHTTP)
○ SSE (Server-Sent Events)

Enabled
☑ Enable this MCP Server
```

**Fields**:
- `Name`: Editable server identifier (unique)
- `Transport`: Radio selection (Command/HTTP/SSE)
- `Enabled`: Checkbox to enable/disable server

---

### 3.2 Configuration Section

Configuration fields dynamically switch based on Transport type.

#### Command Transport

```
Configuration
─────────────────────────────

Command
[ npx                         ]

Arguments
┌─────────────────────────────┐
│ -y                      [×] │
│ @modelcontextprotocol...[×] │
│ ~/Desktop               [×] │
│ + Add Argument              │
└─────────────────────────────┘

Working Directory
[ ./ ]  (Optional)

Environment Variables
┌─────────────────────────────┐
│ Name          Value         │
│ API_KEY       ********      │
│ HOME          /Users/...    │
│ + Add Variable              │
└─────────────────────────────┘

▼ Advanced
    Timeout (预留)
    Restart Policy (预留)
    Auto Start (预留)
```

**Key Design Points**:
- `Arguments`: Array list format (one line per argument), supports add/delete/reorder
- `Environment Variables`: Two-column table (Name | Value), sensitive values hidden by default
- `Advanced`: Collapsible section for extended fields

#### HTTP/SSE Transport

```
Configuration
─────────────────────────────

URL
[ https://example.com/mcp     ]

Headers
┌─────────────────────────────┐
│ Name          Value         │
│ Authorization Bearer xxx    │
│ x-api-key     xxxxxx        │
│ + Add Header                │
└─────────────────────────────┘

▼ Advanced
    Timeout (ms)
    [ 5000 ]

    OAuth Config
    ○ Auto OAuth (default)
    ○ Pre-registered Client
      Client ID: [        ]
      Client Secret: [        ]
      Scope: [        ]
    ○ Disable OAuth

─────────────────────────────
☑ Enable this MCP Server
```

**Key Design Points**:
- `Headers`: Two-column table (Name | Value), Authorization values hidden
- `Timeout`: Only appears in HTTP/SSE Advanced section
- `OAuth Config`: Three options in Advanced section

---

### 3.3 Authentication Section

**Display Condition**: `transport !== "command"` (always shown for HTTP/SSE)

#### Authentication State Model

```typescript
interface AuthenticationState {
  state: 
    | "disabled"      // oauth: false
    | "required"      // not authenticated
    | "opening"       // opening browser
    | "waiting"       // waiting for OAuth callback
    | "authenticated" // authenticated
    | "failed"        // authentication failed
  account?: string
  expiresAt?: string
  authorizationUrl?: string
  error?: string
}
```

#### State Flow

```
Required → Opening → Waiting → Authenticated
                ↑                    ↓
            Failed ←── Token Expired
                ↓
            Reconnect → Authenticated
```

#### UI States

**Disabled** (`oauth: false`):
```
Authentication
─────────────────────────────

OAuth Disabled
Using custom headers for authentication.
```

**Required**:
```
Authentication
─────────────────────────────

Status ○ Authentication Required

This server requires OAuth authentication.

[ Login with OAuth ]
```

**Opening**:
```
Authentication
─────────────────────────────

Status ◌ Opening browser...

Launching your default browser.

Authorization URL
https://...                    [ Copy ]

(Shown after 3 seconds)
[ Open Browser Again ]
```

**Waiting**:
```
Authentication
─────────────────────────────

Status ◌ Waiting for authentication...

Complete authorization in your browser.

[ Cancel ]
```

**Authenticated**:
```
Authentication
─────────────────────────────

Status ● Authenticated

Account        john@example.com
Expires        2026-07-15 18:30

[ Reconnect ]  [ Logout ]
```

**Failed**:
```
Authentication
─────────────────────────────

Status ○ Authentication Failed

Reason         Token expired

[ Reconnect ]
```

---

### 3.4 Connection Section

```
Connection
─────────────────────────────

Status          ● Connected
Latency         42 ms
Last Error      None

[Test Connection]
```

**Fields**:
- `Status`: Current connection state
- `Latency`: Response time in milliseconds
- `Last Error`: Most recent error message

**Action**:
- `Test Connection`: Validate current configuration before saving

#### Connection State Machine

```typescript
type ConnectionState =
  | 'not_configured'  // Gray
  | 'disabled'        // Gray
  | 'not_tested'      // Gray
  | 'testing'         // Blue (animated)
  | 'connected'       // Green
  | 'auth_required'   // Yellow
  | 'auth_failed'     // Yellow
  | 'connection_failed' // Red
```

---

### 3.5 Actions Section

```
Actions
─────────────────────────────

[ Save ]           [ Delete Server ]
```

**Design Principles**:
- `Save`: Primary button (highlighted)
- `Delete Server`: Danger button (de-emphasized, red text or secondary style)

---

### 3.6 Advanced Section

Collapsible panels for advanced information:

```
Advanced
▶ Capabilities
▶ Tools
▶ Resources
▶ Prompts
▶ Runtime
▶ Metadata
▶ Logs
▶ JSON Preview
```

#### Capabilities Panel

```
Capabilities
─────────────────────────────
✓ tools
✓ prompts
✓ resources
✓ roots
✓ logging
✕ sampling
✓ completion
```

**Design**: Dynamically iterate over `server.capabilities`, no hardcoded fields.

#### Tools Panel

```
Tools (12)
─────────────────────────────
[ Search...                  ]

filesystem_read
Read files
─────────────────────────────
filesystem_write
Write files
─────────────────────────────
git_commit
Commit changes
```

**Features**:
- Search input for filtering
- Each tool shows name + description (if available)
- Future: Disable individual tools

#### Runtime Panel

```
Runtime
─────────────────────────────
Connected       Yes
Transport       HTTP
Latency         42 ms
Protocol        2025-06-18
Reconnect Count 3
Last Connected  09:21:43
Session ID      xxxxxxx
Last Error      None
```

**Data Source**: All from MCP runtime, not configuration file.

#### Metadata Panel

```
Metadata
─────────────────────────────
Name            GitHub MCP
Version         1.3.2
Protocol        2025-06-18
Vendor          GitHub
```

**Purpose**: Describes the server itself, separate from runtime connection state.

#### Logs Panel

```
Logs
─────────────────────────────
09:31 Connected
09:31 Initialize
09:31 ListTools
09:32 ListResources
09:33 Error

[ Copy Logs ]  [ Clear ]
```

**Features**:
- Scrollable area, keeps last 100-200 entries
- Copy and Clear buttons

#### JSON Preview Panel

```
JSON Preview
─────────────────────────────
{Monaco Editor ReadOnly}

[ Copy ]  [ Format ]
```

**Design**:
- Uses Monaco Editor in read-only mode
- Shows current configuration as JSON
- Copy and Format buttons
- No direct editing to avoid sync issues

---

## 4. Add Server Wizard

Multi-step wizard instead of single dialog.

### Step 1: Transport Selection

```
Add MCP Server - Step 1

Choose the transport type:

○ Command (stdio)
  Run a local process

○ HTTP (StreamableHTTP)
  Connect to remote server

○ SSE (Server-Sent Events)
  Connect via SSE

                [Cancel]  [Next →]
```

### Step 2a: Command Configuration

```
Add MCP Server - Step 2

Command
[ npx                         ]

Arguments
┌─────────────────────────────┐
│ -y                      [×] │
│ + Add Argument              │
└─────────────────────────────┘

Name (auto-generated or custom)
[ filesystem                  ]

                [← Back]  [Add Server]
```

### Step 2b: HTTP/SSE Configuration

```
Add MCP Server - Step 2

URL
[ https://mcp.example.com/mcp ]

Name
[ my-mcp-server               ]

                [← Back]  [Add Server]
```

**Post-Add Actions**:
1. Generate configuration and write to `lcode.jsonc`
2. Attempt connection
3. If OAuth required, prompt authentication

---

## 5. Additional Features

### 5.1 Configuration Validation

- Real-time validation of command/url format
- Environment variable name validation
- URL parseability check

### 5.2 JSONC Bidirectional Sync

- UI changes → auto-update `lcode.jsonc`
- External file changes → hot reload UI
- Uses `jsonc-parser` to preserve comments and formatting

### 5.3 Official Template Library (Optional)

```
Popular MCP Servers
─────────────────────────────
• Filesystem
• GitHub
• Postgres
• Playwright
• Puppeteer

[Use Template]
```

### 5.4 Sensitive Information Protection

- Environment variable values: default `****`
- Headers Authorization: default hidden
- Show/Copy buttons to reveal full values

---

## 6. Data Models

### 6.1 Configuration Model (lcode.jsonc)

```typescript
interface McpServerConfig {
  name: string
  type: 'local' | 'remote'  // maps to Command/HTTP

  // Command type
  command?: string
  args?: string[]
  cwd?: string
  environment?: Record<string, string>

  // HTTP/SSE type
  url?: string
  headers?: Record<string, string>
  oauth?: {
    clientId?: string
    clientSecret?: string
    scope?: string
  } | false

  // Common
  enabled?: boolean
  timeout?: number
}
```

### 6.2 Runtime State Model (from API)

```typescript
interface McpRuntimeState {
  connection: ConnectionState
  latency?: number
  protocolVersion?: string
  sessionId?: string
  reconnectCount?: number
  lastConnected?: string
  lastError?: string

  authentication: AuthenticationState
  capabilities: Record<string, boolean>
  tools: ToolInfo[]
  resources?: ResourceInfo[]
  prompts?: PromptInfo[]
}

interface ToolInfo {
  name: string
  description?: string
}

interface AuthenticationState {
  state: 'disabled' | 'required' | 'opening' | 'waiting' | 'authenticated' | 'failed'
  account?: string
  expiresAt?: string
  authorizationUrl?: string
  error?: string
}
```

**Key Principle**: Configuration and runtime state are separate. Configuration is stored in `lcode.jsonc`, runtime state is fetched from API and not persisted.

---

## 7. Component Structure

```
SettingsMcp.vue (main page)
├── McpServerList.vue (left panel)
│   └── McpServerItem.vue (list item)
│
├── McpServerDetail.vue (right panel container)
│   ├── sections/
│   │   ├── BasicSection.vue
│   │   ├── ConfigSection.vue
│   │   │   ├── CommandConfig.vue
│   │   │   └── HttpConfig.vue
│   │   ├── AuthSection.vue
│   │   ├── ConnectionSection.vue
│   │   ├── ActionsSection.vue
│   │   └── AdvancedSection.vue
│   │       ├── CapabilitiesPanel.vue
│   │       ├── ToolsPanel.vue
│   │       ├── ResourcesPanel.vue
│   │       ├── PromptsPanel.vue
│   │       ├── RuntimePanel.vue
│   │       ├── MetadataPanel.vue
│   │       ├── LogsPanel.vue
│   │       └── JsonPreviewPanel.vue
│   │
│   └── dialogs/
│   │       ├── AddServerWizard.vue
│   │       ├── EnvVarEditor.vue
│   │       ├── HeaderEditor.vue
│   │       └── DeleteConfirmDialog.vue
│
└── composables/
    ├── useMcpConfig.ts (configuration management)
    ├── useMcpRuntime.ts (runtime state)
    ├── useMcpAuth.ts (authentication flow)
    └── useMcpConnection.ts (connection testing)
```

---

## 8. API Requirements

### 8.1 Required Backend Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/mcp` | GET | Get all server status |
| `/mcp` | POST | Add new server |
| `/mcp/:name` | PUT | Update server config |
| `/mcp/:name` | DELETE | Delete server |
| `/mcp/:name/connect` | POST | Connect server |
| `/mcp/:name/disconnect` | POST | Disconnect server |
| `/mcp/:name/test` | POST | Test connection |
| `/mcp/:name/auth/start` | POST | Start OAuth flow |
| `/mcp/:name/auth/callback` | POST | Complete OAuth |
| `/mcp/:name/auth/status` | GET | Get auth status |
| `/mcp/:name/auth/logout` | POST | Remove auth |
| `/mcp/:name/tools` | GET | List tools |
| `/mcp/:name/capabilities` | GET | Get capabilities |

### 8.2 Required IPC Channels

```typescript
IPC_CHANNELS = {
  MCP_STATUS: 'mcp:status',
  MCP_ADD: 'mcp:add',
  MCP_UPDATE: 'mcp:update',
  MCP_DELETE: 'mcp:delete',
  MCP_CONNECT: 'mcp:connect',
  MCP_DISCONNECT: 'mcp:disconnect',
  MCP_TEST: 'mcp:test',
  MCP_AUTH_START: 'mcp:auth:start',
  MCP_AUTH_CALLBACK: 'mcp:auth:callback',
  MCP_AUTH_STATUS: 'mcp:auth:status',
  MCP_AUTH_LOGOUT: 'mcp:auth:logout',
  MCP_TOOLS: 'mcp:tools',
  MCP_CAPABILITIES: 'mcp:capabilities',
  MCP_RUNTIME: 'mcp:runtime',
}
```

---

## 9. Implementation Notes

### 9.1 JSONC Handling

Use `jsonc-parser` for reading/writing `lcode.jsonc`:
- Preserve comments and formatting
- Support trailing commas
- Handle parse errors gracefully

### 9.2 Hot Reload

Watch `lcode.jsonc` for external changes:
- Use `chokidar` or Node.js `fs.watch`
- Debounce changes to avoid rapid reloads
- Show notification when config updated externally

### 9.3 OAuth Flow

1. User clicks "Login with OAuth"
2. Backend starts OAuth, returns authorization URL
3. Desktop opens browser with URL
4. User authorizes in browser
5. Callback received, backend completes OAuth
6. Frontend polls or subscribes to auth status changes

### 9.4 Error Handling

- Connection errors: Display in Connection section
- Auth errors: Display in Authentication section
- Config errors: Inline validation messages
- Unexpected errors: Toast notification

---

## 10. Success Criteria

1. All official MCP configuration fields are supported
2. UI matches SettingsModels page style
3. OAuth flow works end-to-end
4. JSONC sync is bidirectional
5. Configuration validation prevents invalid configs
6. Runtime state updates in real-time
7. Add Server Wizard guides users successfully

---

## 11. Future Enhancements

- Tool-level enable/disable
- Server templates library
- Drag-and-drop argument reordering
- Multiple server groups/folders
- Server health dashboard
- Export/import configuration
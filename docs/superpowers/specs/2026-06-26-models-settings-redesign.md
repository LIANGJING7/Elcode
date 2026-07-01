# Models Settings Page Redesign

**Date:** 2026-06-26  
**Status:** Design Approved

## Overview

Redesign the Models settings page to support full CRUD operations for AI providers, with improved UX for managing providers and their models.

## Requirements

1. **Add Providers** - UI form to add new AI providers with API keys
2. **Manage Providers** - Edit, delete, test connection, refresh models
3. **View Models** - Grouped display with search and filtering
4. **Default Model Selection** - Grouped select for better model discovery

## Design

### Component Architecture

```
SettingsModels.vue (Container)
├── ProviderCard.vue (per provider)
│   ├── APIKeyDisplay (masked with show/hide/copy)
│   ├── ModelsList (collapsible with search)
│   └── ActionButtons (Edit, Test, Refresh Models, Delete)
├── AddProviderModal.vue
├── EditProviderModal.vue
└── GroupedModelSelect.vue (for default model selector)
```

### Component Responsibilities

**SettingsModels.vue**
- Container component coordinating child components
- State: providers list, loading states, error messages
- Calls modelsStore methods for data operations
- Renders default model selector and provider cards

**ProviderCard.vue**
- Display single provider information
- Props: provider object
- Events: edit, test, refresh-models, delete
- State: models list expanded/collapsed, refresh/test loading state

**AddProviderModal.vue**
- Form for adding new provider
- Props: isOpen
- Events: save, cancel
- Form fields: Provider Name (required), API Key (required), Base URL (optional)

**EditProviderModal.vue**
- Form for editing existing provider
- Props: isOpen, provider (to edit)
- Events: save, cancel
- Pre-populated with current values

**GroupedModelSelect.vue**
- Grouped dropdown for model selection
- Groups models by provider
- Supports search/filter
- Similar to existing ModelSelector but for settings context

### Data Flow

```
User Action → SettingsModels.vue
           ↓
     modelsStore methods
           ↓
     IPC calls → main process
           ↓
     backend-client → core HTTP API
           ↓
     Update providers state
           ↓
     Reactive UI update
```

### State Management (modelsStore)

**New State:**
- `saving: boolean` - Loading state during save
- `deleting: boolean` - Loading state during delete
- `refreshing: Set<string>` - Provider IDs currently refreshing models

**New Methods:**
```typescript
async function addProvider(config: {
  name: string
  apiKey: string
  baseUrl?: string
}): Promise<void>

async function updateProvider(providerId: string, config: {
  apiKey?: string
  baseUrl?: string
}): Promise<void>

async function deleteProvider(providerId: string): Promise<void>

async function testProvider(providerId: string): Promise<{
  success: boolean
  modelCount?: number
  error?: string
}>

async function refreshModels(providerId: string): Promise<void>
```

### UI Layout

```
┌─────────────────────────────────────────────────────┐
│ Models                                              │
│                                                     │
│ [Default Model: ▼ Grouped Select...]                │
│                                                     │
│ ────────────────────────────────────────────────── │
│                                                     │
│ Providers                          [+ Add Provider] │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ ▼ OpenAI (126)                  ● Connected      │ │
│ │ ─────────────────────────────────────────────── │ │
│ │ API Key: ●●●●●●●●●●●●  [👁] [📋]                │ │
│ │ Base URL: https://api.openai.com/v1             │ │
│ │                                                 │ │
│ │ Models (126)                  [▼ View Models]   │ │
│ │                                                 │ │
│ │              [Edit][Test][Refresh Models][Delete]│ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ ▼ Anthropic (12)                ● Connected     │ │
│ │ ─────────────────────────────────────────────── │ │
│ │ API Key: ●●●●●●●●●●●●  [👁] [📋]                │ │
│ │                                                 │ │
│ │ Models (12)                   [▼ View Models]    │ │
│ │                                                 │ │
│ │              [Edit][Test][Refresh Models][Delete]│ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ ▼ Azure (0)                    ○ Disconnected   │ │
│ │ ─────────────────────────────────────────────── │ │
│ │ API Key: ●●●●●●●●●●●●  [👁] [📋]                │ │
│ │ Base URL: https://xxx.openai.azure.com          │ │
│ │                                                 │ │
│ │ Failed to fetch models                          │ │
│ │                                                 │ │
│ │              [Edit][Test][Refresh Models][Delete]│ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Key UI Improvements

**1. Grouped Model Selector**
- Default model selector uses grouped dropdown
- Models grouped by provider (e.g., "OpenAI > GPT-4")
- Easier to navigate when many models exist
- Supports search/filter

**2. API Key Security**
- Always masked by default: `●●●●●●●●●●●●`
- Show/Hide toggle button [👁]
- Copy to clipboard button [📋]
- Never expose full key in plain text

**3. Provider Header with Status**
- Format: `▼ OpenAI (126)` or `▶ OpenAI (0)`
- Shows model count at a glance
- Connection status indicator: `● Connected` / `○ Disconnected`

**4. Action Buttons with Clear Responsibilities**
- **Edit** - Modify provider configuration
- **Test** - Validate API key and connection
- **Refresh Models** - Re-fetch model list from provider
- **Delete** - Remove provider configuration

**5. Models List with Search**
- Default collapsed: `Models (126) [▼ View Models]`
- Expand to show search box and model list
- Search filters models in real-time
- Scroll for long lists (max ~20 visible items)

### Interaction Flows

**Add Provider:**
1. Click "+ Add Provider" → Open AddProviderModal
2. Fill form (Name*, API Key*, Base URL)
3. Click "Save" → Validate → Save → Auto test connection → Fetch models → Close modal → Show new card
4. If save succeeds but test fails → Show card with error state

**Edit Provider:**
1. Click "Edit" → Open EditProviderModal with pre-filled values
2. Modify fields
3. Click "Save" → Validate → Update → Close modal → Card info updated

**Test Connection:**
1. Click "Test" → Button shows loading spinner
2. Call test API → Show result notification
3. Success: "Connection successful - {count} models found"
4. Failure: "Connection failed: {error message}"

**Refresh Models:**
1. Click "Refresh Models" → Button shows loading spinner
2. Fetch models → Update list → Show notification if changed
3. If no change → Silent update
4. If failure → Show error notification

**Delete Provider:**
1. Click "Delete" → Show confirmation dialog
2. Confirm → Delete → Remove card from list
3. Cancel → Close dialog, no action

### Error Handling

**Form Validation:**
- Empty API Key → "API Key is required"
- Empty Provider Name → "Provider Name is required"
- Duplicate Provider Name → "Provider '{name}' already exists"
- Save failure → Show error notification, keep modal open

**Connection Test Errors:**
- 401 Unauthorized → "Invalid API Key"
- Network error → "Failed to connect to {baseUrl}"
- Other errors → "Connection failed: {error message}"

**Refresh Models Errors:**
- Failure → Show error notification, card shows error state
- Success with no changes → Silent or minimal notification

**Delete Errors:**
- Show error notification if delete fails

### Edge Cases

**First-time Use (No Providers):**
```
No providers configured yet.
Click "Add Provider" to get started.
```

**Loading States:**
- Initial load → "Loading providers..."
- Save provider → Button shows spinner, form disabled
- Test connection → Test button shows spinner
- Refresh models → Refresh button shows spinner

**Empty Model List:**
- Connected but no models → "No models available"
- No search matches → "No models match your search"

**Concurrent Operations:**
- Prevent duplicate clicks during operations
- Disable Delete button while Edit modal is open

### API Design

**New IPC Channels:**

**1. config:addProvider**
```typescript
// Request
{
  name: string       // Provider name (e.g., "OpenAI")
  apiKey: string     // API key
  baseUrl?: string   // Optional base URL override
}

// Response
{
  success: boolean
  provider?: ProviderInfo
  error?: string
}
```

**2. config:updateProvider**
```typescript
// Request
{
  providerId: string    // Provider identifier
  apiKey?: string       // New API key (optional)
  baseUrl?: string      // New base URL (optional)
}

// Response
{
  success: boolean
  provider?: ProviderInfo
  error?: string
}
```

**3. config:deleteProvider**
```typescript
// Request
{
  providerId: string
}

// Response
{
  success: boolean
  error?: string
}
```

**4. config:testProvider**
```typescript
// Request
{
  providerId: string    // Test existing provider
  // OR for testing before save:
  name?: string
  apiKey?: string
  baseUrl?: string
}

// Response
{
  success: boolean
  modelCount?: number
  error?: string
}
```

**5. config:refreshModels**
```typescript
// Request
{
  providerId: string
}

// Response
{
  success: boolean
  models?: ProviderModel[]
  changed?: boolean    // Whether the list changed from cache
  error?: string
}
```

**Backend API Mapping:**
- `POST /api/providers` - Add provider
- `PATCH /api/providers/:id` - Update provider
- `DELETE /api/providers/:id` - Delete provider
- `POST /api/providers/:id/test` - Test connection
- `POST /api/providers/:id/refresh-models` - Refresh models

## Implementation Notes

1. **Security**: API keys must be stored securely (electron safeStorage or system keychain)
2. **Performance**: Model lists should be cached; only fetch when explicitly requested
3. **Accessibility**: All interactive elements must have proper ARIA labels and keyboard navigation
4. **Responsive**: Design should work on different screen sizes (though desktop-focused)
5. **Internationalization**: All user-facing strings should be extractable for i18n

## Success Criteria

- [ ] User can add a new provider via UI form
- [ ] User can edit existing provider configuration
- [ ] User can delete a provider with confirmation
- [ ] User can test provider connection
- [ ] User can refresh model list for a provider
- [ ] Default model selector shows grouped models by provider
- [ ] API keys are properly masked in the UI
- [ ] All error states are handled gracefully
- [ ] Loading states provide clear feedback
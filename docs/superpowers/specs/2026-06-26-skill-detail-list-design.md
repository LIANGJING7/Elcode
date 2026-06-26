# Skill Detail List & Editor Design

**Date**: 2026-06-26  
**Status**: Approved  

## Overview

Design for the Skill detail list view with integrated editing functionality in the Model Agent Desktop application.

## Use Cases (Priority Order)

1. **管理配置** (Configuration Management) - View details, edit, create skills
2. **查阅参考** (Reference Lookup) - Understand available skills and their functions  
3. **执行调用** (Execution) - Trigger skill slash commands

## UI Layout

### Dynamic Two-Panel Layout

**Default State**: Single-panel list view (full width), detail panel collapsed

**Expanded State**: 
- Left panel: Skill list (40% width)
- Right panel: Detail panel (60% width)

**Interaction Flow**:
- Click skill card → detail panel expands, shows skill content
- Click selected card again → detail panel collapses
- Click close button (×) → detail panel collapses

### Empty List State

When `skills.length === 0`:
- List area is blank (no placeholder content)
- Only "Create Skill" button at bottom

## List Panel Components

### SkillCard Content

**Display**:
- Basic info: name, description (truncated to 100 characters), slash indicator
- Selected state: accent border or highlighted background

**No action buttons** (actions are in detail panel)

### SkillList.vue

- Container for skill cards
- Bottom: CreateSkillButton

## Detail Panel Components

### Dual Mode Architecture

**View Mode**: Markdown-rendered content display  
**Edit Mode**: Monaco Editor for editing Markdown source

### PanelHeader.vue

**Top Toolbar Layout**:
```
┌──────────────────────────────────────────────────────────┐
│  skill-name              [View ✓] [Edit] [× Close]        │
└──────────────────────────────────────────────────────────┘
```

**View Mode**:
- Title: skill.name or first heading from Markdown
- View button: highlighted (current mode)
- Edit button: normal state (click to switch)
- Close button: collapses panel

**Edit Mode**:
- Title: filename from skill.location (e.g., customize-opencode.md)
- View button: normal state (click to switch)
- Edit button: highlighted (current mode)
- Close button: shows unsaved changes warning if applicable

### View Mode

**MarkdownRenderer.vue**:
- Uses `marked` + `DOMPurify` for safe rendering
- Typography styles for headings, paragraphs, code blocks
- Displays skill.content

**PanelActions.vue**:
- Edit button → switch to Edit mode
- Copy button → copy skill.content to clipboard

### Edit Mode

**Monaco Editor Configuration**:
```typescript
{
  language: 'markdown',
  lineNumbers: 'on',
  wordWrap: 'on',
  minimap: { enabled: false },
  fontSize: 14,
  scrollBeyondLastLine: false,
  automaticLayout: true,
}
```

**PanelActions.vue**:
- Cancel button → restore original content, switch to View mode
- Save button → write to file, reload list, switch to View mode

### Save Flow

1. Click Save button
2. Write editContent to skill.location via IPC
3. Reload skill list via skillStore.load()
4. Update selectedSkill with new data
5. Switch to View mode
6. Show success toast

### Cancel Flow

1. Click Cancel button
2. If hasUnsavedChanges → show confirmation dialog
3. If confirmed → restore original content, switch to View mode
4. Clear hasUnsavedChanges flag

### Close Panel with Unsaved Changes

1. Click close button (×) in Edit mode
2. If hasUnsavedChanges → show confirmation dialog
3. If confirmed → collapse panel, reset to View mode
4. Clear state

## Component Structure

```
SkillView.vue (parent, manages list and panel state)
├── SkillList.vue (list container)
│   ├── SkillCard.vue (individual card)
│   └── CreateSkillButton.vue (create button)
└── SkillDetailPanel.vue (detail panel, manages View/Edit mode)
    ├── PanelHeader.vue (top toolbar)
    ├── MarkdownRenderer.vue (View mode content)
    ├── MonacoEditor.vue (Edit mode editor)
    └── PanelActions.vue (bottom action bar)
```

## State Management

### SkillView.vue Local State

```typescript
const selectedSkill = ref<SkillInfo | null>(null)
const panelOpen = ref(false)
const skills = ref<SkillInfo[]>([])  // from skillStore
const loading = ref(false)
const error = ref<string | null>(null)
```

### SkillDetailPanel.vue Local State

```typescript
const mode = ref<'view' | 'edit'>('view')
const editContent = ref('')
const hasUnsavedChanges = ref(false)
const saving = ref(false)
```

## Special Cases

### Loading State

- Show skeleton loader or "Loading skills..." text
- Detail panel hidden

### Load Failure

- Show error message
- Provide Retry button

### Empty Skill Content

- Display "No content available"

### File Operation Errors

- Toast notification with error message

## Technical Choices

- **Markdown rendering**: marked + DOMPurify
- **Editor**: Monaco Editor (basic config)
- **File operations**: Electron IPC (file:write)
- **State**: Vue ref + skillStore (Pinia)
- **User feedback**: Lightweight toast notifications

## Interaction Flow Diagram

```
Enter Skills View
  → Click Skills nav button
  → SkillView.onMounted → skillStore.load()
  → Show list (or empty + Create button)

Browse & View
  → Click skill card → panelOpen=true, selectedSkill=skill
  → Detail panel expands, shows content
  → Click other card → selectedSkill updates
  → Click selected card → panelOpen=false
  → Click close (×) → panelOpen=false

Edit Mode
  → Click Edit button → mode='edit', editContent=skill.content
  → Monaco Editor shown
  → Edit content → hasUnsavedChanges=true
  → Click Save → write file → reload → mode='view'
  → Click Cancel → restore content → mode='view'

Actions
  → Edit → open Monaco Editor
  → Copy → clipboard.writeText(skill.content)
  → Create → createSession → switch to Chat view
```

## Key Design Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Layout | Dynamic two-panel | User request: no display until clicked |
| Editor | Monaco Editor | VSCode-like editing experience |
| Save | Manual save button | User control over when to save |
| Mode switch | View/Edit buttons in toolbar | Clear mode indication |
| Empty list | Blank + Create button | Minimalist design |
| Enable/disable | Not supported | Keep simple, defer to future |

## Implementation Notes

- Monaco Editor needs proper integration with Vue (use vue-monaco-editor or custom wrapper)
- Ensure DOMPurify sanitizes all rendered HTML for security
- Toast notifications should auto-dismiss (success: 1-2s, error: 3s or manual)
- Consider keyboard shortcuts (Ctrl+S save, Escape cancel/close)
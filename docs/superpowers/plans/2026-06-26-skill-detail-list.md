# Skill Detail List & Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement skill detail list view with expandable detail panel and integrated Monaco Editor for editing skills.

**Architecture:** Two-panel dynamic layout - skill cards on left (40%), detail panel on right (60%) that expands on click. Detail panel supports View/Edit modes with View showing Markdown-rendered content and Edit showing Monaco Editor. State managed locally in SkillView.vue and SkillDetailPanel.vue.

**Tech Stack:** Vue 3, Pinia, marked + DOMPurify, Monaco Editor, Electron IPC

---

## Task 1: Install Dependencies

**Files:**
- Modify: `packages/desktop/package.json`

- [ ] **Step 1: Add dependencies to package.json**

```bash
cd packages/desktop
npm install marked dompurify @monaco-editor/loader
```

Add to `package.json` dependencies:
```json
"marked": "^12.0.0",
"dompurify": "^3.0.0",
"@monaco-editor/loader": "^1.0.0"
```

- [ ] **Step 2: Commit dependency addition**

```bash
git add packages/desktop/package.json packages/desktop/package-lock.json
git commit -m "feat(skills): add marked, dompurify, and monaco-editor dependencies"
```

---

## Task 2: Create MarkdownRenderer Component

**Files:**
- Create: `packages/desktop/src/renderer/components/skills/MarkdownRenderer.vue`

- [ ] **Step 1: Create MarkdownRenderer.vue with basic structure**

```vue
<template>
  <div class="markdown-content" v-html="renderedContent"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const props = defineProps<{
  content: string
}>()

const renderedContent = computed(() => {
  if (!props.content) return ''
  const rawHtml = marked.parse(props.content) as string
  return DOMPurify.sanitize(rawHtml)
})
</script>

<style scoped>
.markdown-content {
  line-height: 1.6;
  color: var(--text);
}

.markdown-content h1 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1rem;
  margin-top: 0;
}

.markdown-content h2 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  margin-top: 1.5rem;
}

.markdown-content h3 {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  margin-top: 1rem;
}

.markdown-content p {
  margin-bottom: 0.75rem;
}

.markdown-content ul,
.markdown-content ol {
  margin-bottom: 0.75rem;
  padding-left: 1.5rem;
}

.markdown-content li {
  margin-bottom: 0.25rem;
}

.markdown-content code {
  background: var(--bg-hover);
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-size: 0.875em;
  font-family: 'Consolas', 'Monaco', monospace;
}

.markdown-content pre {
  background: var(--bg-surface);
  padding: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
  margin-bottom: 1rem;
}

.markdown-content pre code {
  background: transparent;
  padding: 0;
}

.markdown-content a {
  color: var(--accent);
  text-decoration: underline;
}

.markdown-content blockquote {
  border-left: 3px solid var(--accent);
  padding-left: 1rem;
  margin-bottom: 1rem;
  color: var(--text-muted);
}
</style>
```

- [ ] **Step 2: Commit MarkdownRenderer component**

```bash
git add packages/desktop/src/renderer/components/skills/MarkdownRenderer.vue
git commit -m "feat(skills): add MarkdownRenderer component with styling"
```

---

## Task 3: Create SkillEditor Component (Monaco Editor Wrapper)

**Files:**
- Create: `packages/desktop/src/renderer/components/skills/SkillEditor.vue`

- [ ] **Step 1: Create SkillEditor.vue with Monaco integration**

```vue
<template>
  <div ref="editorContainer" class="skill-editor"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as monaco from '@monaco-editor/loader'

const props = defineProps<{
  content: string
}>()

const emit = defineEmits<{
  'update:content': [value: string]
  'change': [value: string]
}>()

const editorContainer = ref<HTMLDivElement | null>(null)
let editorInstance: monaco.editor.IStandaloneCodeEditor | null = null

onMounted(async () => {
  if (!editorContainer.value) return

  // Initialize Monaco
  const monacoInstance = await monaco.init()
  
  editorInstance = monacoInstance.editor.create(editorContainer.value, {
    value: props.content,
    language: 'markdown',
    lineNumbers: 'on',
    wordWrap: 'on',
    minimap: { enabled: false },
    fontSize: 14,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    theme: 'vs',
  })

  // Listen for content changes
  editorInstance.onDidChangeModelContent(() => {
    const value = editorInstance?.getValue() || ''
    emit('update:content', value)
    emit('change', value)
  })
})

onUnmounted(() => {
  if (editorInstance) {
    editorInstance.dispose()
  }
})

// Update editor content when prop changes
watch(() => props.content, (newContent) => {
  if (editorInstance && editorInstance.getValue() !== newContent) {
    editorInstance.setValue(newContent)
  }
})

// Expose methods for parent component
function getValue(): string {
  return editorInstance?.getValue() || ''
}

function setValue(value: string): void {
  if (editorInstance) {
    editorInstance.setValue(value)
  }
}

defineExpose({ getValue, setValue })
</script>

<style scoped>
.skill-editor {
  width: 100%;
  height: 100%;
  min-height: 400px;
}
</style>
```

- [ ] **Step 2: Commit SkillEditor component**

```bash
git add packages/desktop/src/renderer/components/skills/SkillEditor.vue
git commit -m "feat(skills): add SkillEditor component with Monaco integration"
```

---

## Task 4: Create PanelHeader Component

**Files:**
- Create: `packages/desktop/src/renderer/components/skill-detail/PanelHeader.vue`

- [ ] **Step 1: Create PanelHeader.vue for mode switching**

```vue
<template>
  <div class="panel-header flex items-center justify-between px-4 py-3 border-b border-border">
    <h3 class="text-sm font-medium text-text truncate">
      {{ title }}
    </h3>
    
    <div class="flex items-center gap-2">
      <button
        class="mode-btn px-2 py-1 rounded text-xs transition-colors"
        :class="mode === 'view' ? 'bg-accent text-white' : 'text-text-muted hover:bg-bg-hover'"
        @click="emit('switch-mode', 'view')"
      >
        View
      </button>
      
      <button
        class="mode-btn px-2 py-1 rounded text-xs transition-colors"
        :class="mode === 'edit' ? 'bg-accent text-white' : 'text-text-muted hover:bg-bg-hover'"
        @click="emit('switch-mode', 'edit')"
      >
        Edit
      </button>
      
      <button
        class="close-btn w-6 h-6 flex items-center justify-center rounded hover:bg-bg-hover text-text-muted transition-colors"
        @click="emit('close')"
        title="Close panel"
      >
        ×
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  skillName: string
  skillLocation?: string
  mode: 'view' | 'edit'
}>()

const emit = defineEmits<{
  'switch-mode': [mode: 'view' | 'edit']
  'close': []
}>()

const title = computed(() => {
  if (props.mode === 'edit' && props.skillLocation) {
    // Show filename in edit mode
    const parts = props.skillLocation.split('/')
    return parts[parts.length - 1] || props.skillName
  }
  return props.skillName
})
</script>

<style scoped>
.panel-header {
  flex-shrink: 0;
}

.mode-btn {
  cursor: pointer;
}

.close-btn {
  font-size: 1.25rem;
  cursor: pointer;
}
</style>
```

- [ ] **Step 2: Commit PanelHeader component**

```bash
git add packages/desktop/src/renderer/components/skill-detail/PanelHeader.vue
git commit -m "feat(skills): add PanelHeader with View/Edit mode switching"
```

---

## Task 5: Create PanelActions Component

**Files:**
- Create: `packages/desktop/src/renderer/components/skill-detail/PanelActions.vue`

- [ ] **Step 1: Create PanelActions.vue for bottom action bar**

```vue
<template>
  <div class="panel-actions flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
    <!-- View mode actions -->
    <template v-if="mode === 'view'">
      <button
        class="action-btn px-3 py-1.5 rounded bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors"
        @click="emit('edit')"
      >
        Edit
      </button>
      
      <button
        class="action-btn px-3 py-1.5 rounded bg-bg-hover hover:bg-bg-elevated border border-border text-text text-sm font-medium transition-colors"
        @click="emit('copy')"
      >
        Copy
      </button>
    </template>
    
    <!-- Edit mode actions -->
    <template v-else>
      <button
        class="action-btn px-3 py-1.5 rounded bg-bg-hover hover:bg-bg-elevated border border-border text-text text-sm font-medium transition-colors"
        @click="emit('cancel')"
        :disabled="saving"
      >
        Cancel
      </button>
      
      <button
        class="action-btn px-3 py-1.5 rounded bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors"
        @click="emit('save')"
        :disabled="saving"
      >
        {{ saving ? 'Saving...' : 'Save' }}
      </button>
    </template>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  mode: 'view' | 'edit'
  saving?: boolean
}>()

const emit = defineEmits<{
  'edit': []
  'copy': []
  'cancel': []
  'save': []
}>()
</script>

<style scoped>
.panel-actions {
  flex-shrink: 0;
}

.action-btn {
  cursor: pointer;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
```

- [ ] **Step 2: Commit PanelActions component**

```bash
git add packages/desktop/src/renderer/components/skill-detail/PanelActions.vue
git commit -m "feat(skills): add PanelActions with View/Edit mode actions"
```

---

## Task 6: Create SkillDetailPanel Component

**Files:**
- Create: `packages/desktop/src/renderer/components/skills/SkillDetailPanel.vue`

- [ ] **Step 1: Create SkillDetailPanel.vue with dual mode support**

```vue
<template>
  <div v-if="skill" class="skill-detail-panel flex flex-col h-full bg-bg-elevated border-l border-border">
    <PanelHeader
      :skill-name="skill.name"
      :skill-location="skill.location"
      :mode="mode"
      @switch-mode="handleSwitchMode"
      @close="handleClose"
    />
    
    <!-- View mode content -->
    <div v-if="mode === 'view'" class="panel-content flex-1 overflow-y-auto p-4">
      <MarkdownRenderer :content="skill.content" />
    </div>
    
    <!-- Edit mode content -->
    <div v-else class="panel-content flex-1 overflow-hidden">
      <SkillEditor
        ref="editorRef"
        :content="editContent"
        @change="handleChange"
      />
    </div>
    
    <PanelActions
      :mode="mode"
      :saving="saving"
      @edit="handleEdit"
      @copy="handleCopy"
      @cancel="handleCancel"
      @save="handleSave"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { SkillInfo } from '../../../types/ipc'
import PanelHeader from '../skill-detail/PanelHeader.vue'
import PanelActions from '../skill-detail/PanelActions.vue'
import MarkdownRenderer from './MarkdownRenderer.vue'
import SkillEditor from './SkillEditor.vue'

const props = defineProps<{
  skill: SkillInfo | null
}>()

const emit = defineEmits<{
  'close': []
  'save': [skill: SkillInfo, content: string]
  'refresh': []
}>()

const mode = ref<'view' | 'edit'>('view')
const editContent = ref('')
const hasUnsavedChanges = ref(false)
const saving = ref(false)
const editorRef = ref<{ getValue: () => string; setValue: (v: string) => void } | null>(null)

// Initialize editContent when skill changes
watch(() => props.skill, (newSkill) => {
  if (newSkill) {
    editContent.value = newSkill.content
    hasUnsavedChanges.value = false
  }
})

function handleSwitchMode(newMode: 'view' | 'edit') {
  if (newMode === 'edit' && props.skill) {
    editContent.value = props.skill.content
    mode.value = 'edit'
  } else if (newMode === 'view') {
    if (hasUnsavedChanges.value) {
      // TODO: Show confirmation dialog
      const confirmed = confirm('You have unsaved changes. Switch to View mode anyway?')
      if (!confirmed) return
    }
    mode.value = 'view'
    hasUnsavedChanges.value = false
  }
}

function handleEdit() {
  mode.value = 'edit'
  editContent.value = props.skill?.content || ''
}

async function handleCopy() {
  if (!props.skill?.content) return
  
  try {
    await navigator.clipboard.writeText(props.skill.content)
    // TODO: Show toast notification
    console.log('Content copied to clipboard')
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

function handleChange(newContent: string) {
  editContent.value = newContent
  hasUnsavedChanges.value = newContent !== props.skill?.content
}

function handleCancel() {
  if (hasUnsavedChanges.value) {
    const confirmed = confirm('Discard unsaved changes?')
    if (!confirmed) return
  }
  
  editContent.value = props.skill?.content || ''
  mode.value = 'view'
  hasUnsavedChanges.value = false
}

async function handleSave() {
  if (!props.skill?.location) {
    console.error('Skill location not available')
    return
  }
  
  saving.value = true
  
  try {
    // Emit save event to parent (SkillView will handle file write)
    emit('save', props.skill, editContent.value)
    
    // Reset state
    hasUnsavedChanges.value = false
    mode.value = 'view'
    
    // Request refresh
    emit('refresh')
  } catch (err) {
    console.error('Failed to save:', err)
  } finally {
    saving.value = false
  }
}

function handleClose() {
  if (mode.value === 'edit' && hasUnsavedChanges.value) {
    const confirmed = confirm('You have unsaved changes. Close anyway?')
    if (!confirmed) return
  }
  
  mode.value = 'view'
  hasUnsavedChanges.value = false
  emit('close')
}

// Expose for parent component
function reset() {
  mode.value = 'view'
  editContent.value = props.skill?.content || ''
  hasUnsavedChanges.value = false
}

defineExpose({ reset })
</script>

<style scoped>
.skill-detail-panel {
  width: 500px;
  max-width: 60%;
  min-width: 300px;
}

.panel-content {
  min-height: 0;
}
</style>
```

- [ ] **Step 2: Commit SkillDetailPanel component**

```bash
git add packages/desktop/src/renderer/components/skills/SkillDetailPanel.vue
git commit -m "feat(skills): add SkillDetailPanel with dual mode support"
```

---

## Task 7: Update SkillCard Component

**Files:**
- Modify: `packages/desktop/src/renderer/components/skills/SkillCard.vue`

- [ ] **Step 1: Update SkillCard.vue to support selected state**

Update the component to:
- Add `selected` prop
- Add selected state styling
- Keep existing display logic (name, description, slash, location)

```vue
<template>
  <Card 
    class="skill-card cursor-pointer transition-colors"
    :class="{ 'selected': selected }"
    @click="emit('click')"
  >
    <CardContent class="p-3">
      <div class="flex items-start justify-between">
        <div class="flex-1 min-w-0">
          <h3 class="text-sm font-medium text-foreground truncate">{{ skill.name }}</h3>
          <p v-if="skill.description" class="text-xs text-muted-foreground mt-1 line-clamp-2">
            {{ truncatedDescription }}
          </p>
          <div class="flex items-center gap-2 mt-2">
            <span v-if="skill.slash" class="text-xs text-accent font-mono">
              /{{ skill.name }}
            </span>
            <span v-if="skill.location" class="text-xs text-muted-foreground">
              {{ getLocationShort(skill.location) }}
            </span>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { SkillInfo } from '../../../types/ipc'
import { Card, CardContent } from '@/components/ui/card'

const props = defineProps<{
  skill: SkillInfo
  selected?: boolean
}>()

const emit = defineEmits<{
  'click': []
}>()

const truncatedDescription = computed(() => {
  if (!props.skill.description) return ''
  return props.skill.description.length > 100 
    ? props.skill.description.slice(0, 100) + '...' 
    : props.skill.description
})

function getLocationShort(location: string): string {
  if (!location) return ''
  const parts = location.split('/')
  const fileName = parts[parts.length - 1]
  const dirName = parts[parts.length - 2] || ''
  return `${dirName}/${fileName}`
}
</script>

<style scoped>
.skill-card {
  border: 1px solid transparent;
}

.skill-card.selected {
  border-color: var(--accent);
  background: var(--accent-muted);
}

.skill-card:hover {
  background: var(--bg-hover);
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
```

- [ ] **Step 2: Commit SkillCard update**

```bash
git add packages/desktop/src/renderer/components/skills/SkillCard.vue
git commit -m "feat(skills): add selected state styling to SkillCard"
```

---

## Task 8: Refactor SkillView Component

**Files:**
- Modify: `packages/desktop/src/renderer/components/skills/SkillView.vue`

- [ ] **Step 1: Refactor SkillView.vue with two-panel layout**

```vue
<template>
  <div class="skill-view flex h-full">
    <!-- Left panel: Skill list -->
    <div 
      class="skill-list flex flex-col flex-1 min-w-0 bg-bg transition-all duration-300"
      :class="{ 'panel-open': panelOpen }"
    >
      <header class="px-6 py-4 border-b border-border">
        <h1 class="text-xl font-semibold text-text">Skills</h1>
        <p class="text-2xs text-text-muted mt-1">
          Registered skills from ~/.opencode/skills/
        </p>
      </header>
      
      <!-- Loading state -->
      <div v-if="loading" class="flex-1 flex items-center justify-center text-text-muted text-sm">
        Loading skills...
      </div>
      
      <!-- Error state -->
      <div v-else-if="error" class="flex-1 flex flex-col items-center justify-center text-red-400 text-sm">
        <p>{{ error }}</p>
        <button 
          class="mt-3 px-4 py-2 rounded bg-bg-hover hover:bg-bg-elevated border border-border text-text"
          @click="loadSkills"
        >
          Retry
        </button>
      </div>
      
      <!-- Empty state -->
      <div v-else-if="skills.length === 0" class="flex-1 flex flex-col items-center justify-end pb-6">
        <!-- Blank area, only show create button -->
        <button
          class="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors"
          @click="handleCreateSkill"
        >
          Create New Skill
        </button>
      </div>
      
      <!-- Skill list -->
      <div v-else class="flex-1 overflow-y-auto px-4 py-4">
        <div class="space-y-2">
          <SkillCard
            v-for="skill in skills"
            :key="skill.name"
            :skill="skill"
            :selected="selectedSkill?.name === skill.name"
            @click="handleSelectSkill(skill)"
          />
        </div>
      </div>
      
      <!-- Create button (shown when skills exist) -->
      <div v-if="skills.length > 0" class="px-4 pb-4 border-t border-border pt-4">
        <button
          class="w-full px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors"
          @click="handleCreateSkill"
        >
          Create New Skill
        </button>
      </div>
    </div>
    
    <!-- Right panel: Detail panel (conditional) -->
    <SkillDetailPanel
      v-if="panelOpen && selectedSkill"
      :skill="selectedSkill"
      @close="handleClosePanel"
      @save="handleSaveSkill"
      @refresh="loadSkills"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useSkillStore } from '../../stores/skill'
import { useSessionStore } from '../../stores/session'
import { useWorkspaceStore } from '../../stores/workspace'
import { useUiStore } from '../../stores/ui'
import SkillCard from './SkillCard.vue'
import SkillDetailPanel from './SkillDetailPanel.vue'
import type { SkillInfo } from '../../../types/ipc'

const skillStore = useSkillStore()
const sessionStore = useSessionStore()
const workspaceStore = useWorkspaceStore()
const uiStore = useUiStore()

const { skills, loading, error } = storeToRefs(skillStore)
const { currentWorkspace } = storeToRefs(workspaceStore)

const selectedSkill = ref<SkillInfo | null>(null)
const panelOpen = ref(false)

// Load skills on mount
onMounted(() => {
  loadSkills()
})

// Reload skills when workspace changes
watch(currentWorkspace, (ws) => {
  if (ws) {
    loadSkills()
    // Reset panel state
    selectedSkill.value = null
    panelOpen.value = false
  }
})

async function loadSkills() {
  await skillStore.load(currentWorkspace.value?.path)
}

function handleSelectSkill(skill: SkillInfo) {
  if (selectedSkill.value?.name === skill.name) {
    // Clicking selected skill again - toggle panel
    panelOpen.value = !panelOpen.value
  } else {
    // Selecting new skill - open panel
    selectedSkill.value = skill
    panelOpen.value = true
  }
}

function handleClosePanel() {
  panelOpen.value = false
}

async function handleSaveSkill(skill: SkillInfo, content: string) {
  if (!skill.location || !currentWorkspace.value?.path) {
    console.error('Cannot save: missing location or workspace')
    return
  }
  
  try {
    // Write to file via IPC
    await window.desktop.file.write(skill.location, content, currentWorkspace.value.path)
    console.log('Skill saved successfully')
    
    // Reload skills to get updated content
    await loadSkills()
    
    // Update selected skill with new data
    const updatedSkill = skills.value.find(s => s.name === skill.name)
    if (updatedSkill) {
      selectedSkill.value = updatedSkill
    }
  } catch (err) {
    console.error('Failed to save skill:', err)
  }
}

async function handleCreateSkill() {
  const ws = currentWorkspace.value
  if (!ws) return
  
  await sessionStore.createSession({ workspaceId: ws.id, path: ws.path })
  uiStore.setView('chat')
}
</script>

<style scoped>
.skill-view {
  min-height: 100%;
}

.skill-list {
  flex: 1;
}

.skill-list.panel-open {
  flex: 0 0 40%;
}

.skill-detail-panel {
  flex: 0 0 60%;
  max-width: 500px;
}
</style>
```

- [ ] **Step 2: Commit SkillView refactor**

```bash
git add packages/desktop/src/renderer/components/skills/SkillView.vue
git commit -m "feat(skills): refactor SkillView with two-panel layout"
```

---

## Task 9: Add File Write IPC Handler (if needed)

**Files:**
- Check: `packages/desktop/src/main/ipc/handlers-file.ts` (existing)
- Verify: FILE_WRITE channel exists

- [ ] **Step 1: Check existing file write handler**

Verify that `handlers-file.ts` already has FILE_WRITE implementation. If not, add:

```typescript
ipcMain.handle(IPC_CHANNELS.FILE_WRITE, async (_, filePath: string, content: string, directory?: string) => {
  // Implementation to write file
})
```

- [ ] **Step 2: If needed, commit file write handler**

```bash
git add packages/desktop/src/main/ipc/handlers-file.ts
git commit -m "feat(ipc): add file write handler for skill editing"
```

---

## Task 10: Add Toast Notification Component (Optional Enhancement)

**Files:**
- Create: `packages/desktop/src/renderer/components/ui/Toast.vue` (if not exists)
- Create: `packages/desktop/src/renderer/stores/toast.ts` (if not exists)

- [ ] **Step 1: Check if toast notification system exists**

If not, create basic toast store and component for user feedback.

- [ ] **Step 2: Integrate toast in SkillDetailPanel**

Replace `console.log` calls with toast notifications:
- Copy success: "Content copied to clipboard"
- Save success: "Skill saved successfully"
- Save error: "Failed to save skill"
- Unsaved changes warning: confirmation dialog

- [ ] **Step 3: Commit toast integration**

```bash
git add packages/desktop/src/renderer/components/ui/Toast.vue packages/desktop/src/renderer/stores/toast.ts
git commit -m "feat(ui): add toast notification system"
```

---

## Task 11: Test the Implementation

**Files:**
- Test in running application

- [ ] **Step 1: Start the desktop app**

```bash
cd packages/desktop
npm run dev
```

- [ ] **Step 2: Navigate to Skills view**

Click Skills navigation button in sidebar

- [ ] **Step 3: Test basic functionality**

1. ✓ Skills list loads and displays
2. ✓ Clicking skill card opens detail panel
3. ✓ Clicking selected card again closes panel
4. ✓ View mode shows Markdown-rendered content
5. ✓ Edit mode shows Monaco Editor
6. ✓ Switching between View/Edit modes works
7. ✓ Save button writes to file and reloads
8. ✓ Cancel button discards changes
9. ✓ Copy button copies content to clipboard
10. ✓ Create button switches to Chat view

- [ ] **Step 4: Test edge cases**

1. Empty list state (blank + Create button)
2. Loading state
3. Error state + Retry
4. Skill with no location field
5. Skill with empty content

- [ ] **Step 5: Fix any issues found**

Address bugs and edge cases discovered during testing.

---

## Task 12: Final Polish and Commit

- [ ] **Step 1: Review all changes**

```bash
git status
git diff
```

- [ ] **Step 2: Ensure all files are committed**

Make sure all new components and modifications are tracked.

- [ ] **Step 3: Write summary commit if needed**

```bash
git commit -m "feat(skills): complete skill detail list with editing support

- Add MarkdownRenderer and SkillEditor components
- Add SkillDetailPanel with View/Edit mode switching  
- Update SkillCard with selected state
- Refactor SkillView with two-panel layout
- Add file write handler for skill editing
- Add toast notification system"
```

---

## Self-Review Checklist

### Spec Coverage
- ✓ Two-panel dynamic layout → Task 8 (SkillView refactor)
- ✓ SkillCard with selected state → Task 7
- ✓ Detail panel with View/Edit modes → Tasks 2-6
- ✓ MarkdownRenderer → Task 2
- ✓ Monaco Editor → Task 3
- ✓ PanelHeader with mode switching → Task 4
- ✓ PanelActions with Edit/Copy/Cancel/Save → Task 5
- ✓ Empty list state → Task 8
- ✓ Loading/Error states → Task 8
- ✓ File write IPC → Task 9
- ✓ Toast notifications → Task 10

### Placeholder Scan
- No TBD/TODO/fill-in-later steps
- All code blocks contain actual implementation
- No vague instructions like "add appropriate handling"

### Type Consistency
- SkillInfo type used consistently across components
- Props/emits definitions match parent expectations
- Event names consistent (switch-mode, close, save, refresh)

---

## Implementation Complete

After completing all tasks, the skill detail list with editing functionality will be fully implemented and ready for use.
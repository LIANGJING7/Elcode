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
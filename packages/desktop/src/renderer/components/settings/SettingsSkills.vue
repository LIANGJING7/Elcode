<template>
  <div class="settings-section flex h-full">
    <!-- Left panel: Skill list -->
    <div 
      class="skill-list flex flex-col flex-1 min-w-0 bg-bg transition-all duration-300"
      :class="{ 'panel-open': panelOpen }"
    >
      <h2 class="text-lg font-medium text-text px-4 py-3 border-b border-border">Skills</h2>

      <!-- Search input -->
      <div class="px-4 py-2 border-b border-border">
        <div class="relative">
          <SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <Input
            v-model="searchQuery"
            type="text"
            placeholder="Search skills..."
            class="pl-9"
          />
        </div>
      </div>

      <div v-if="loading" class="text-text-muted text-center py-8">
        Loading skills...
      </div>

      <div v-else-if="error" class="text-red-400 text-center py-8">
        {{ error }}
      </div>

      <div v-else-if="filteredSkills.length === 0 && searchQuery" class="text-text-muted text-center py-8">
        <p>No skills match your search</p>
        <p class="text-2xs mt-2">Try a different search term</p>
      </div>

      <div v-else-if="skills.length === 0" class="text-text-muted text-center py-8">
        <p>No skills configured</p>
        <p class="text-2xs mt-2">Skills are specialized capabilities that extend the agent's functionality.</p>
      </div>

      <div v-else class="flex-1 overflow-y-auto px-4 py-3">
        <div class="space-y-2">
          <SkillCard
            v-for="skill in filteredSkills"
            :key="skill.location"
            :skill="skill"
            :selected="selectedSkill?.location === skill.location"
            @click="handleSelectSkill(skill)"
          />
        </div>
      </div>

      <div class="px-4 py-3 border-t border-border">
        <button
          class="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors"
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
import { ref, onMounted, watch, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useSkillStore } from '../../stores/skill'
import { useSessionStore } from '../../stores/session'
import { useWorkspaceStore } from '../../stores/workspace'
import { useUiStore } from '../../stores/ui'
import SkillCard from '../skills/SkillCard.vue'
import SkillDetailPanel from '../skills/SkillDetailPanel.vue'
import { Input } from '@/components/ui/input'
import { SearchIcon } from 'lucide-vue-next'
import type { SkillInfo } from '../../../types/ipc'

const skillStore = useSkillStore()
const sessionStore = useSessionStore()
const workspaceStore = useWorkspaceStore()
const uiStore = useUiStore()

const { skills, loading, error } = storeToRefs(skillStore)
const { currentWorkspace } = storeToRefs(workspaceStore)

const selectedSkill = ref<SkillInfo | null>(null)
const panelOpen = ref(false)
const searchQuery = ref('')

// Filter skills by search query (name only)
const filteredSkills = computed(() => {
  if (!searchQuery.value.trim()) {
    return skills.value
  }
  const query = searchQuery.value.toLowerCase().trim()
  return skills.value.filter(skill => 
    skill.name.toLowerCase().includes(query)
  )
})

onMounted(() => {
  loadSkills()
})

watch(currentWorkspace, (ws) => {
  if (ws) {
    loadSkills()
    // Reset panel state
    selectedSkill.value = null
    panelOpen.value = false
    searchQuery.value = ''
  }
})

async function loadSkills() {
  await skillStore.load(currentWorkspace.value?.path)
}

function handleSelectSkill(skill: SkillInfo) {
  if (selectedSkill.value?.location === skill.location) {
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
  console.log('Saving skill:', skill.name, 'location:', skill.location)
  
  if (!skill.location) {
    console.error('Cannot save: missing location')
    return
  }
  
  // Check for built-in/embedded skills
  // - '<built-in>' - legacy marker
  // - '/builtin/...' - embedded skills from plugins
  if (skill.location === '<built-in>' || skill.location.startsWith('/builtin/')) {
    console.error('Cannot save built-in skills')
    // TODO: Show toast notification
    alert('Built-in skills cannot be modified')
    return
  }
  
  try {
    // Write to skill file via dedicated skill IPC
    await window.desktop.skill.write(skill.location, content)
    console.log('Skill saved successfully')
    
    // Core caches skill content and doesn't reload after file changes.
    // We need to manually update the skill in the store with the saved content.
    // Find and update the skill in the local store
    const skillIndex = skills.value.findIndex(s => s.location === skill.location)
    if (skillIndex !== -1) {
      // Update the skill content directly in the store
      skills.value[skillIndex] = {
        ...skills.value[skillIndex],
        content: content  // Update with the saved content
      }
      
      // Update selected skill to reflect the changes
      selectedSkill.value = skills.value[skillIndex]
    }
    
    // Optionally: try to reload from backend (may still return cached data)
    // await loadSkills()
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
.settings-section {
  min-height: 100%;
}

.skill-list {
  flex: 1;
  min-width: 280px;
}

.skill-list.panel-open {
  flex: 0 0 280px;
}

.skill-detail-panel {
  flex: 1;
  min-width: 0;
}
</style>
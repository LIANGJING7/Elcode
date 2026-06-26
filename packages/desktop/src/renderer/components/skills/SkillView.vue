<template>
  <div class="skill-view p-6">
    <div class="max-w-2xl mx-auto">
      <header class="mb-6">
        <h1 class="text-xl font-semibold text-text">Skills</h1>
        <p class="text-2xs text-text-muted mt-1">
          Registered skills from ~/.opencode/skills/
        </p>
      </header>

      <div v-if="loading" class="text-text-muted text-center py-8">
        Loading skills...
      </div>

      <div v-else-if="error" class="text-red-400 text-center py-8">
        {{ error }}
      </div>

      <div v-else-if="skills.length === 0" class="text-text-muted text-center py-8">
        No skills registered
      </div>

      <div v-else class="space-y-3">
        <SkillCard
          v-for="skill in skills"
          :key="skill.name"
          :skill="skill"
        />
      </div>

      <!-- Create skill button (degraded: creates chat with skill-creator prompt) -->
      <div class="mt-6 pt-6 border-t border-border">
        <button
          class="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors"
          @click="handleCreateSkill"
        >
          Create New Skill
        </button>
        <p class="text-2xs text-text-muted mt-2">
          Opens a chat session with skill-creator prompt
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useSkillStore } from '../../stores/skill'
import { useSessionStore } from '../../stores/session'
import { useWorkspaceStore } from '../../stores/workspace'
import { useUiStore } from '../../stores/ui'
import SkillCard from './SkillCard.vue'

const skillStore = useSkillStore()
const sessionStore = useSessionStore()
const workspaceStore = useWorkspaceStore()
const uiStore = useUiStore()

const { skills, loading, error } = storeToRefs(skillStore)
const { currentWorkspace } = storeToRefs(workspaceStore)

onMounted(() => {
  skillStore.load(currentWorkspace.value?.path)
})

// Degraded create skill: create session with skill-creator prompt
async function handleCreateSkill() {
  const ws = currentWorkspace.value
  if (!ws) return

  await sessionStore.createSession({ workspaceId: ws.id, path: ws.path })
  uiStore.setView('chat')
  // Note: Pre-filling skill-creator prompt would require Composer integration
  // This is left for future enhancement
}
</script>

<style scoped>
.skill-view {
  min-height: 100%;
}
</style>
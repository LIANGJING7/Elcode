<template>
  <div class="skill-card p-4 rounded-lg bg-bg-surface border border-border hover:border-border-light transition-colors">
    <div class="flex items-start justify-between">
      <div class="flex-1 min-w-0">
        <h3 class="text-sm font-medium text-text truncate">{{ skill.name }}</h3>
        <p v-if="skill.description" class="text-2xs text-text-muted mt-1 line-clamp-2">
          {{ skill.description }}
        </p>
        <div class="flex items-center gap-2 mt-2">
          <span v-if="skill.slash" class="text-2xs text-accent font-mono">
            /{{ skill.name }}
          </span>
          <span class="text-2xs text-text-muted">
            {{ getLocationShort(skill.location) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SkillInfo } from '../../../types/ipc'

const props = defineProps<{
  skill: SkillInfo
}>()

// Shorten location path for display
function getLocationShort(location: string): string {
  const parts = location.split('/')
  const fileName = parts[parts.length - 1]
  const dirName = parts[parts.length - 2] || ''
  return `${dirName}/${fileName}`
}
</script>

<style scoped>
.skill-card {
  cursor: default;
}
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
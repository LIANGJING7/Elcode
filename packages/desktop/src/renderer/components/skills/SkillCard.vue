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
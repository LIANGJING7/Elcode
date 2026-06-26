<template>
  <span
    class="status-badge px-1.5 py-0.5 rounded text-2xs font-medium"
    :class="badgeClass"
  >
    {{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  status: 'connected' | 'disabled' | 'failed' | 'needs_auth' | 'needs_client_registration'
}>()

const label = computed(() => {
  switch (props.status) {
    case 'connected': return 'Connected'
    case 'disabled': return 'Disabled'
    case 'failed': return 'Failed'
    case 'needs_auth': return 'Auth Required'
    case 'needs_client_registration': return 'Setup Required'
    default: return props.status
  }
})

const badgeClass = computed(() => {
  switch (props.status) {
    case 'connected': return 'bg-green-500/20 text-green-400'
    case 'disabled': return 'bg-text-muted/20 text-text-muted'
    case 'failed': return 'bg-red-500/20 text-red-400'
    case 'needs_auth': return 'bg-amber-500/20 text-amber-400'
    case 'needs_client_registration': return 'bg-amber-500/20 text-amber-400'
    default: return 'bg-text-muted/20 text-text-muted'
  }
})
</script>

<style scoped>
.status-badge {
  display: inline-flex;
}
</style>
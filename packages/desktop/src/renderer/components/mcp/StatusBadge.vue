<template>
  <Badge :variant="badgeVariant">
    {{ label }}
  </Badge>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Badge } from '@/components/ui/badge'

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

const badgeVariant = computed(() => {
  switch (props.status) {
    case 'connected': return 'success'
    case 'disabled': return 'secondary'
    case 'failed': return 'destructive'
    case 'needs_auth': return 'warning'
    case 'needs_client_registration': return 'warning'
    default: return 'secondary'
  }
})
</script>
<template>
  <Card class="hover:border-border-muted transition-colors">
    <CardContent class="p-4">
      <div class="flex items-center justify-between">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <h3 class="text-sm font-medium text-foreground truncate">{{ name }}</h3>
            <StatusBadge :status="status.status" />
          </div>
          <p v-if="status.error" class="text-xs text-destructive mt-1 truncate">
            {{ status.error }}
          </p>
        </div>

        <div class="flex items-center gap-2">
          <Button
            v-if="status.status === 'disconnected' || status.status === 'disabled' || status.status === 'failed'"
            size="sm"
            @click="$emit('connect')"
          >
            Connect
          </Button>
          <Button
            v-if="status.status === 'connected'"
            variant="outline"
            size="sm"
            @click="$emit('disconnect')"
          >
            Disconnect
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import type { MCPStatus } from '../../../types/ipc'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import StatusBadge from './StatusBadge.vue'

const props = defineProps<{
  name: string
  status: MCPStatus
}>()

defineEmits<{
  connect: []
  disconnect: []
}>()
</script>
<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { Label as LabelPrimitive } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <LabelPrimitive
    data-slot="label"
    :class="cn('text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70 group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-70', props.class)"
  >
    <slot />
  </LabelPrimitive>
</template>
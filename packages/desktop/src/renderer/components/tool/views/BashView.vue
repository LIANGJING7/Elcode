<script setup lang="ts">
/**
 * BashView — renders a BashViewModel.
 *
 * Layout: command line ($ cmd) + scrollable stdout + status bar
 * (exit code + duration + truncated/timed-out badges).
 */
import { computed } from 'vue'
import type { BashViewModel } from '../../../tool/rules/bash'
import { formatDuration } from '../../../stores/streaming/types'

const props = defineProps<{ vm: BashViewModel }>()

const exitOk = computed(() => props.vm.exitCode === 0)
const durationText = computed(() =>
  props.vm.duration != null ? formatDuration(props.vm.duration) : null,
)
</script>

<template>
  <div class="bash-view text-xs">
    <!-- Command line -->
    <div class="bg-code-bg rounded px-2 py-1 mb-1 font-mono text-text-secondary">
      <span class="text-accent">$</span> {{ vm.command }}
    </div>

    <!-- Stdout -->
    <pre
      v-if="vm.stdout"
      class="bg-code-bg p-2 rounded overflow-x-auto font-mono leading-relaxed max-h-64 text-text-primary"
    >{{ vm.stdout }}</pre>

    <!-- Stderr (if present) -->
    <pre
      v-if="vm.stderr"
      class="bg-code-bg p-2 rounded overflow-x-auto font-mono leading-relaxed mt-1 text-error max-h-32"
    >{{ vm.stderr }}</pre>

    <!-- Status bar -->
    <div class="flex items-center gap-3 mt-1 text-text-muted">
      <span v-if="vm.exitCode != null" :class="exitOk ? 'text-success' : 'text-error'">
        {{ exitOk ? '✓' : '✗' }} exit {{ vm.exitCode }}
      </span>
      <span v-if="durationText">{{ durationText }}</span>
      <span v-if="vm.timedOut" class="text-warning">timed out</span>
      <span v-if="vm.truncated" class="text-warning">output truncated</span>
    </div>
  </div>
</template>

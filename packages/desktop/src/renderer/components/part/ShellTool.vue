<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ToolCall } from '../../../types/ipc'

const props = defineProps<{ tool: ToolCall }>()

const collapsed = ref(true)

const command = computed(() => {
  const cmd = props.tool.args.command as string
    ?? props.tool.args.cmd as string
    ?? ''
  return cmd
})

const workdir = computed(() => {
  const wd = props.tool.args.workdir as string ?? ''
  return wd
})

const stdout = computed(() => {
  console.log('[ShellTool] Computing stdout for tool:', props.tool.name)
  console.log('[ShellTool] props.tool.output:', props.tool.output)
  console.log('[ShellTool] props.tool.output?.content:', props.tool.output?.content)
  
  const content = props.tool.output?.content
  if (content && Array.isArray(content)) {
    console.log('[ShellTool] content is array, length:', content.length)
    console.log('[ShellTool] content items:', content.map(c => c.type))
    return content
      .filter((c): c is { type: 'text'; text: string } =>
        typeof c === 'object' && c !== null && c.type === 'text' && typeof c.text === 'string')
      .map(c => c.text)
      .join('\n')
  }
  const result = props.tool.output?.result
  if (typeof result === 'string') return result
  if (typeof result === 'object' && result !== null) {
    const r = result as Record<string, unknown>
    return (r.output as string) || (r.stdout as string) || ''
  }
  return ''
})

const stderr = computed(() => {
  const result = props.tool.output?.result
  if (typeof result === 'object' && result !== null) {
    return (result as Record<string, unknown>).stderr as string ?? null
  }
  return null
})

const displayOutput = computed(() => {
  let out = stdout.value
  if (stderr.value) {
    out += (out ? '\n' : '') + stderr.value
  }
  return out
})

function toggle() {
  collapsed.value = !collapsed.value
}
</script>

<template>
  <div class="shell-block rounded border border-border my-2 overflow-hidden" :class="{ 'border-error/40': tool.status === 'error' }">
    <div
      class="shell-header flex items-center justify-between px-3 py-1.5 border-b border-border bg-bg-surface/50 cursor-pointer select-none"
      @click="toggle"
    >
      <div class="flex items-center gap-2">
        <svg
          class="w-3 h-3 text-text-muted transition-transform duration-150"
          :class="{ 'rotate-90': !collapsed }"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
        <span class="text-xs text-text-muted font-mono tracking-wide">bash</span>
      </div>
      <span v-if="tool.status === 'running'" class="flex items-center gap-1 text-xs text-text-muted">
        <span class="animate-pulse text-warning">●</span>
      </span>
    </div>

    <div v-if="!collapsed" class="shell-body">
      <div class="shell-prompt-line px-3 pt-2 pb-1 text-xs font-mono flex items-start gap-2">
        <span class="shell-prompt-symbol shrink-0 select-none">$</span>
        <span class="shell-command-text break-all">{{ command }}</span>
        <span v-if="workdir" class="shell-workdir text-text-muted shrink-0 ml-auto">{{ workdir }}</span>
      </div>

      <div v-if="displayOutput" class="shell-output px-3 pb-2">
        <pre class="text-xs font-mono m-0 whitespace-pre-wrap break-all text-text-secondary leading-relaxed">{{ displayOutput }}</pre>
      </div>
      <div v-else-if="tool.status === 'running'" class="px-3 pb-2">
        <span class="text-xs text-text-muted animate-pulse">...</span>
      </div>
    </div>

    <div v-if="tool.error" class="shell-error border-t border-error/30 px-3 py-1.5 bg-error/5">
      <span class="text-xs text-error font-mono">{{ tool.error }}</span>
    </div>
  </div>
</template>

<style scoped>
.shell-prompt-symbol {
  color: #6ee7b7;
  font-weight: 700;
}

.shell-command-text {
  color: #e2e8f0;
}

.shell-workdir {
  font-size: 10px;
}

.shell-output pre {
  max-height: 360px;
  overflow-y: auto;
}

.animate-pulse {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
</style>

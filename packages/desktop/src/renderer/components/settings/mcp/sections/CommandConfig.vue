<template>
  <div class="space-y-4">
    <h4 class="text-sm font-medium text-text">命令配置</h4>

    <div>
      <label class="text-xs text-text-muted block mb-1.5">命令</label>
      <input
        v-model="localConfig.command"
        type="text"
        class="w-full px-3 py-2 bg-bg-surface border border-border rounded-lg text-sm text-text outline-none focus:border-accent"
        placeholder="npx"
      />
    </div>

    <div>
      <label class="text-xs text-text-muted block mb-1.5">参数</label>
      <div class="border border-border rounded-lg divide-y divide-border">
        <div
          v-for="(arg, index) in localConfig.args"
          :key="index"
          class="flex items-center justify-between px-3 py-2"
        >
          <input
            v-model="localConfig.args[index]"
            type="text"
            class="flex-1 bg-transparent text-sm text-text outline-none"
            placeholder="-y"
          />
          <button
            class="w-6 h-6 flex items-center justify-center rounded hover:bg-bg-hover text-text-muted"
            @click="removeArg(index)"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <button
          class="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:text-text transition-colors"
          @click="addArg"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <span>添加参数</span>
        </button>
      </div>
    </div>

    <div>
      <label class="text-xs text-text-muted block mb-1.5">工作目录 (可选)</label>
      <input
        v-model="localConfig.cwd"
        type="text"
        class="w-full px-3 py-2 bg-bg-surface border border-border rounded-lg text-sm text-text outline-none focus:border-accent"
        placeholder="./"
      />
    </div>

    <div>
      <label class="text-xs text-text-muted block mb-1.5">环境变量</label>
      <div class="border border-border rounded-lg">
        <div class="grid grid-cols-2 gap-px bg-border">
          <div class="px-3 py-1.5 bg-bg-surface text-xs text-text-muted">名称</div>
          <div class="px-3 py-1.5 bg-bg-surface text-xs text-text-muted">值</div>
        </div>
        <div
          v-for="[key, value] in envEntries"
          :key="key"
          class="grid grid-cols-2 gap-px bg-border divide-x divide-border"
        >
          <input
            :value="key"
            type="text"
            class="px-3 py-2 bg-bg-surface text-sm text-text outline-none"
            @input="updateEnvKey(key, ($event.target as HTMLInputElement).value)"
          />
          <div class="flex items-center gap-1 px-3 py-2 bg-bg-surface">
            <input
              :value="showEnvValues[key] ? value : '****'"
              type="text"
              class="flex-1 text-sm text-text outline-none"
              :readonly="!showEnvValues[key]"
              @input="updateEnvValue(key, ($event.target as HTMLInputElement).value)"
            />
            <button
              class="w-5 h-5 flex items-center justify-center rounded text-text-muted hover:text-text"
              @click="toggleEnvValue(key)"
            >
              <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
          </div>
        </div>
        <button
          class="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:text-text border-t border-border"
          @click="addEnvVar"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <span>添加变量</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, watch } from 'vue'
import type { McpConfig } from '../../../../../types/ipc'

const props = defineProps<{
  config: McpConfig
}>()

const emit = defineEmits<{
  update: [config: McpConfig]
}>()

const localConfig = reactive({
  command: props.config.command || '',
  args: (props.config.args ? [...props.config.args] : []) as string[],
  cwd: props.config.cwd || '',
  environment: (props.config.environment ? { ...props.config.environment } : {}) as Record<string, string>
})

const showEnvValues = reactive<Record<string, boolean>>({})

const envEntries = computed(() => Object.entries(localConfig.environment || {}))

watch(localConfig, (value) => {
  emit('update', { ...props.config, ...value } as McpConfig)
}, { deep: true })

function addArg() {
  localConfig.args?.push('')
}

function removeArg(index: number) {
  localConfig.args?.splice(index, 1)
}

function addEnvVar() {
  if (!localConfig.environment) localConfig.environment = {}
  localConfig.environment[`VAR_${Object.keys(localConfig.environment).length}`] = ''
}

function updateEnvKey(oldKey: string, newKey: string) {
  if (!localConfig.environment) return
  const value = localConfig.environment[oldKey]
  delete localConfig.environment[oldKey]
  localConfig.environment[newKey] = value
}

function updateEnvValue(key: string, value: string) {
  if (!localConfig.environment) return
  localConfig.environment[key] = value
}

function toggleEnvValue(key: string) {
  showEnvValues[key] = !showEnvValues[key]
}
</script>
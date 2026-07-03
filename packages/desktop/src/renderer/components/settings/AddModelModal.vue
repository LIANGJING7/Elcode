<template>
  <div v-if="isOpen" class="modal-overlay fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="modal-content bg-bg-elevated border border-border rounded-lg shadow-xl w-full max-w-lg p-4 max-h-[80vh] overflow-y-auto">
      <div class="modal-header flex items-center justify-between mb-4">
        <h3 class="text-sm font-medium text-text">添加模型 - {{ providerName }}</h3>
        <button class="close-btn w-6 h-6 flex items-center justify-center text-text-muted hover:text-text cursor-pointer rounded hover:bg-bg-hover" @click="$emit('close')">×</button>
      </div>

      <form @submit.prevent="handleSubmit" class="modal-form">
        <!-- Model ID -->
        <div class="form-group mb-3">
          <label class="form-label text-xs text-text-muted mb-1 block">模型ID *</label>
          <input v-model="form.modelId" type="text" placeholder="例如: gpt-5-custom" class="form-input w-full px-3 py-2 bg-bg border border-border rounded text-sm text-text focus:border-border-light focus:outline-none" required />
          <div class="text-xs text-text-muted mt-1">完整格式为 {{ providerId }}/{{ form.modelId || 'model-id' }}</div>
          <div v-if="errors.modelId" class="error-text text-xs text-red-400 mt-1">{{ errors.modelId }}</div>
        </div>

        <!-- Display Name -->
        <div class="form-group mb-3">
          <label class="form-label text-xs text-text-muted mb-1 block">显示名称</label>
          <input v-model="form.name" type="text" placeholder="例如: GPT-5 Custom" class="form-input w-full px-3 py-2 bg-bg border border-border rounded text-sm text-text focus:border-border-light focus:outline-none" />
        </div>

        <!-- Advanced Options -->
        <div v-if="availableFields.length > 0" class="border-t border-border pt-3 mt-3">
          <div class="flex items-center gap-2 cursor-pointer text-xs text-text-muted hover:text-text mb-3" @click="advancedExpanded = !advancedExpanded">
            <span class="transition-transform" :class="advancedExpanded ? 'rotate-90' : ''">▼</span>
            <span>高级选项</span>
          </div>

          <div v-show="advancedExpanded" class="space-y-3">
            <template v-for="field in availableFields" :key="field.key">
              <!-- Select -->
              <div v-if="field.type === 'select'" class="form-group">
                <label class="form-label text-xs text-text-muted mb-1 block flex items-center gap-1">{{ field.label }} <span v-if="field.description" class="text-text-muted/60" :title="field.description">ⓘ</span></label>
                <select v-model="formValues[field.key]" class="form-input w-full px-3 py-2 bg-bg border border-border rounded text-sm text-text focus:border-border-light focus:outline-none">
                  <option value="">默认</option>
                  <option v-for="opt in field.options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </div>

              <!-- Number -->
              <div v-else-if="field.type === 'number'" class="form-group">
                <label class="form-label text-xs text-text-muted mb-1 block flex items-center gap-1">{{ field.label }} <span v-if="field.description" class="text-text-muted/60" :title="field.description">ⓘ</span></label>
                <input v-model.number="formValues[field.key]" type="number" placeholder="例如: 16000" class="form-input w-full px-3 py-2 bg-bg border border-border rounded text-sm text-text focus:border-border-light focus:outline-none" min="0" />
              </div>

              <!-- List -->
              <div v-else-if="field.type === 'list'" class="form-group">
                <label class="form-label text-xs text-text-muted mb-1 block flex items-center gap-1">{{ field.label }} <span v-if="field.description" class="text-text-muted/60" :title="field.description">ⓘ</span></label>
                <div class="flex gap-2 mb-2">
                  <input v-model="listInput[field.key]" type="text" :placeholder="field.itemPlaceholder" class="form-input flex-1 px-3 py-2 bg-bg border border-border rounded text-sm text-text focus:border-border-light focus:outline-none" />
                  <button type="button" class="px-3 py-2 text-xs bg-bg border border-border hover:border-border-light rounded text-text cursor-pointer" @click="addListItem(field.key)">+ Add</button>
                </div>
                <div v-if="(formValues[field.key] as string[])?.length" class="space-y-1">
                  <div v-for="(item, idx) in formValues[field.key]" :key="idx" class="flex items-center gap-2 px-3 py-2 bg-bg rounded text-sm text-text">
                    <span class="flex-1 truncate">{{ item }}</span>
                    <button type="button" class="text-text-muted hover:text-red-400 cursor-pointer" @click="removeListItem(field.key, idx)">×</button>
                  </div>
                </div>
              </div>

              <!-- Group -->
              <div v-else-if="field.type === 'group'" class="form-group border border-border rounded p-3">
                <label class="form-label text-xs font-medium text-text mb-3 block flex items-center gap-1">{{ field.label }} <span v-if="field.description" class="text-text-muted/60" :title="field.description">ⓘ</span></label>
                <div class="space-y-3">
                  <template v-for="child in field.children" :key="child.key">
                    <div v-if="child.type === 'select'">
                      <label class="form-label text-xs text-text-muted mb-1 block">{{ child.label }}</label>
                      <select v-model="formValues[child.key]" class="form-input w-full px-3 py-2 bg-bg border border-border rounded text-sm text-text focus:border-border-light focus:outline-none">
                        <option value="">默认</option>
                        <option v-for="opt in child.options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                      </select>
                    </div>
                    <div v-else-if="child.type === 'number'">
                      <label class="form-label text-xs text-text-muted mb-1 block flex items-center gap-1">{{ child.label }} <span v-if="child.description" class="text-text-muted/60" :title="child.description">ⓘ</span></label>
                      <input v-model.number="formValues[child.key]" type="number" placeholder="例如: 16000" class="form-input w-full px-3 py-2 bg-bg border border-border rounded text-sm text-text focus:border-border-light focus:outline-none" min="0" />
                    </div>
                  </template>
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- Unknown Provider -->
        <div v-else class="border-t border-border pt-3 mt-3">
          <p class="text-xs text-text-muted">当前供应商未声明支持的 SDK 类型，因此无法显示对应的高级模型选项。</p>
          <p class="text-xs text-text-muted mt-1">将仅保存模型 ID 和显示名称。</p>
        </div>

        <!-- Actions -->
        <div class="form-actions flex gap-2 justify-end mt-4">
          <button type="button" class="cancel-btn px-4 py-2 text-xs bg-bg border border-border hover:border-border-light rounded text-text cursor-pointer" @click="$emit('close')">取消</button>
          <button type="submit" class="submit-btn px-4 py-2 text-xs bg-accent hover:bg-accent-light rounded text-white cursor-pointer" :disabled="saving || !form.modelId.trim()">{{ saving ? '添加中...' : '添加模型' }}</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useModelsStore } from '../../stores/models'
import { OPTIONS_BY_NPM, type OptionField, type AddModelPayload } from '../../types/model-options'

const props = defineProps<{ isOpen: boolean; providerId: string; providerName?: string; directory?: string }>()
const emit = defineEmits<{ success: [providerId: string, modelId: string]; close: [] }>()

const modelsStore = useModelsStore()
const form = ref({ modelId: '', name: '' })
const formValues = ref<Record<string, unknown>>({})
const listInput = ref<Record<string, string>>({})
const advancedExpanded = ref(true)
const errors = ref({ modelId: '' })

const saving = computed(() => modelsStore.saving)
const providerName = computed(() => props.providerName || props.providerId.charAt(0).toUpperCase() + props.providerId.slice(1).replace(/-/g, ' '))
const providerNpm = computed(() => modelsStore.providers.find(p => p.id === props.providerId)?.npm || '')
const availableFields = computed<OptionField[]>(() => OPTIONS_BY_NPM[providerNpm.value] || [])

function resetForm() {
  form.value = { modelId: '', name: '' }
  formValues.value = {}
  listInput.value = {}
  errors.value = { modelId: '' }
}

function addListItem(key: string) {
  const value = listInput.value[key]?.trim()
  if (!value) return
  const list = (formValues.value[key] as string[] || [])
  if (!list.includes(value)) formValues.value[key] = [...list, value]
  listInput.value[key] = ''
}

function removeListItem(key: string, idx: number) {
  formValues.value[key] = (formValues.value[key] as string[] || []).filter((_, i) => i !== idx)
}

function validateForm(): boolean {
  errors.value = { modelId: '' }
  if (!form.value.modelId.trim()) { errors.value.modelId = '模型ID不能为空'; return false }
  if (!/^[a-zA-Z0-9\-_\/.]+$/.test(form.value.modelId.trim())) { errors.value.modelId = '模型ID只能包含字母、数字、-、_、/ 和 .'; return false }
  const provider = modelsStore.providers.find(p => p.id === props.providerId)
  if (provider?.models?.[form.value.modelId.trim()]) { errors.value.modelId = `模型 '${form.value.modelId}' 已存在`; return false }
  return true
}

function buildOptions(): AddModelPayload['options'] {
  const options: AddModelPayload['options'] = {}
  if (formValues.value['reasoningEffort']) options.reasoningEffort = formValues.value['reasoningEffort'] as AddModelPayload['options']['reasoningEffort']
  if (formValues.value['textVerbosity']) options.textVerbosity = formValues.value['textVerbosity'] as AddModelPayload['options']['textVerbosity']
  if (formValues.value['reasoningSummary']) options.reasoningSummary = formValues.value['reasoningSummary'] as AddModelPayload['options']['reasoningSummary']
  if ((formValues.value['include'] as string[])?.length) options.include = formValues.value['include'] as string[]
  const thinkingType = formValues.value['thinking.type']
  const thinkingBudget = formValues.value['thinking.budgetTokens']
  if (thinkingType || thinkingBudget) {
    options.thinking = {}
    if (thinkingType) options.thinking.type = thinkingType as 'enabled' | 'disabled'
    if (thinkingBudget) options.thinking.budgetTokens = thinkingBudget as number
  }
  return Object.keys(options).length > 0 ? options : undefined
}

async function handleSubmit() {
  if (!validateForm()) return
  const payload: AddModelPayload = { modelId: form.value.modelId.trim(), name: form.value.name.trim() || undefined, options: buildOptions() }
  console.log('[AddModelModal] handleSubmit:', { providerId: props.providerId, payload })
  const result = await modelsStore.addModel(props.providerId, payload, props.directory)
  console.log('[AddModelModal] addModel result:', result)
  if (result.success) { emit('success', props.providerId, payload.modelId); resetForm() }
  else { errors.value.modelId = result.error || '添加失败' }
}

watch(() => props.isOpen, (newVal) => { if (newVal) resetForm() })
</script>

<style scoped>
button:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
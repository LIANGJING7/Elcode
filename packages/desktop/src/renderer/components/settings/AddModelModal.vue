<template>
  <div v-if="isOpen" class="modal-overlay fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="modal-content bg-bg-elevated border border-border rounded-lg shadow-xl w-full max-w-md p-4">
      <div class="modal-header flex items-center justify-between mb-4">
        <h3 class="text-sm font-medium text-text">添加模型 - {{ providerName }}</h3>
        <button
          class="close-btn w-6 h-6 flex items-center justify-center text-text-muted hover:text-text cursor-pointer rounded hover:bg-bg-hover"
          @click="$emit('close')"
        >
          ×
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="modal-form">
        <!-- Model ID -->
        <div class="form-group mb-3">
          <label class="form-label text-xs text-text-muted mb-1 block">模型ID *</label>
          <input
            v-model="form.modelId"
            type="text"
            placeholder="例如: claude-custom"
            class="form-input w-full px-3 py-2 bg-bg border border-border rounded text-sm text-text focus:border-border-light focus:outline-none"
            required
          />
          <div class="text-xs text-text-muted mt-1">
            模型ID用于配置，完整格式为 {{ providerId }}/{{ form.modelId || 'model-id' }}
          </div>
          <div v-if="errors.modelId" class="error-text text-xs text-red-400 mt-1">{{ errors.modelId }}</div>
        </div>

        <!-- Display Name -->
        <div class="form-group mb-3">
          <label class="form-label text-xs text-text-muted mb-1 block">显示名称</label>
          <input
            v-model="form.name"
            type="text"
            placeholder="例如: My Custom Claude"
            class="form-input w-full px-3 py-2 bg-bg border border-border rounded text-sm text-text focus:border-border-light focus:outline-none"
          />
        </div>

        <!-- Context Limit -->
        <div class="form-group mb-3">
          <label class="form-label text-xs text-text-muted mb-1 block">上下文限制 (Token)</label>
          <input
            v-model.number="form.limitContext"
            type="number"
            placeholder="例如: 200000"
            class="form-input w-full px-3 py-2 bg-bg border border-border rounded text-sm text-text focus:border-border-light focus:outline-none"
            min="0"
          />
        </div>

        <!-- Output Limit -->
        <div class="form-group mb-3">
          <label class="form-label text-xs text-text-muted mb-1 block">输出限制 (Token)</label>
          <input
            v-model.number="form.limitOutput"
            type="number"
            placeholder="例如: 65536"
            class="form-input w-full px-3 py-2 bg-bg border border-border rounded text-sm text-text focus:border-border-light focus:outline-none"
            min="0"
          />
        </div>

        <!-- Form actions -->
        <div class="form-actions flex gap-2 justify-end mt-4">
          <button
            type="button"
            class="cancel-btn px-4 py-2 text-xs bg-bg border border-border hover:border-border-light rounded text-text cursor-pointer transition-all duration-fast"
            @click="$emit('close')"
          >
            取消
          </button>
          <button
            type="submit"
            class="submit-btn px-4 py-2 text-xs bg-accent hover:bg-accent-light rounded text-white cursor-pointer transition-all duration-fast"
            :disabled="saving || !form.modelId.trim()"
          >
            {{ saving ? '添加中...' : '添加模型' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useModelsStore, type AddModelPayload } from '../../stores/models'

const props = defineProps<{
  isOpen: boolean
  providerId: string
  providerName?: string
  directory?: string
}>()

const emit = defineEmits<{
  success: [providerId: string, modelId: string]
  close: []
}>()

const modelsStore = useModelsStore()

const form = ref({
  modelId: '',
  name: '',
  limitContext: undefined as number | undefined,
  limitOutput: undefined as number | undefined,
})

const errors = ref({
  modelId: '',
})

const saving = computed(() => modelsStore.saving)

const providerName = computed(() => {
  if (props.providerName) return props.providerName
  const id = props.providerId
  return id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, ' ')
})

function resetForm() {
  form.value = { modelId: '', name: '', limitContext: undefined, limitOutput: undefined }
  errors.value = { modelId: '' }
}

function validateForm(): boolean {
  errors.value = { modelId: '' }

  if (!form.value.modelId.trim()) {
    errors.value.modelId = '模型ID不能为空'
    return false
  }

  // 检查模型ID格式（只允许字母、数字、-、_、/）
  const validPattern = /^[a-zA-Z0-9\-_\/]+$/
  if (!validPattern.test(form.value.modelId.trim())) {
    errors.value.modelId = '模型ID只能包含字母、数字、-、_ 和 /'
    return false
  }

  // 检查是否已存在
  const provider = modelsStore.providers.find(p => p.id === props.providerId)
  if (provider?.models?.[form.value.modelId.trim()]) {
    errors.value.modelId = `模型 '${form.value.modelId}' 已存在`
    return false
  }

  return true
}

async function handleSubmit() {
  if (!validateForm()) return

  const payload: AddModelPayload = {
    modelId: form.value.modelId.trim(),
    name: form.value.name.trim() || undefined,
    limitContext: form.value.limitContext,
    limitOutput: form.value.limitOutput,
  }

  const result = await modelsStore.addModel(props.providerId, payload, props.directory)
  
  if (result.success) {
    emit('success', props.providerId, payload.modelId)
    resetForm()
  } else {
    errors.value.modelId = result.error || '添加失败'
  }
}

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    resetForm()
  }
})
</script>

<style scoped>
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
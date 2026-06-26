<template>
  <div v-if="isOpen" class="modal-overlay fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="modal-content bg-bg-elevated border border-border rounded-lg shadow-xl w-full max-w-md p-4">
      <div class="modal-header flex items-center justify-between mb-4">
        <h3 class="text-sm font-medium text-text">Add Provider</h3>
        <button
          class="close-btn text-text-muted hover:text-text cursor-pointer"
          @click="$emit('cancel')"
        >
          ×
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="modal-form">
        <!-- Provider Name -->
        <div class="form-group mb-3">
          <label class="form-label text-xs text-text-muted mb-1 block">Provider Name *</label>
          <input
            v-model="form.name"
            type="text"
            placeholder="e.g., OpenAI"
            class="form-input w-full px-3 py-2 bg-bg border border-border rounded text-sm text-text focus:border-border-light focus:outline-none"
            required
          />
          <div v-if="errors.name" class="error-text text-xs text-red-400 mt-1">{{ errors.name }}</div>
        </div>

        <!-- API Key -->
        <div class="form-group mb-3">
          <label class="form-label text-xs text-text-muted mb-1 block">API Key *</label>
          <div class="api-key-input flex items-center gap-2">
            <input
              v-model="form.apiKey"
              :type="showApiKey ? 'text' : 'password'"
              placeholder="Enter your API key"
              class="form-input flex-1 px-3 py-2 bg-bg border border-border rounded text-sm text-text focus:border-border-light focus:outline-none"
              required
            />
            <button
              type="button"
              class="toggle-btn px-2 py-1 text-xs text-text-muted hover:text-text cursor-pointer"
              @click="showApiKey = !showApiKey"
            >
              {{ showApiKey ? '👁 Hide' : '👁 Show' }}
            </button>
          </div>
          <div v-if="errors.apiKey" class="error-text text-xs text-red-400 mt-1">{{ errors.apiKey }}</div>
        </div>

        <!-- Base URL (optional) -->
        <div class="form-group mb-4">
          <label class="form-label text-xs text-text-muted mb-1 block">Base URL (optional)</label>
          <input
            v-model="form.baseUrl"
            type="text"
            placeholder="e.g., https://api.openai.com/v1"
            class="form-input w-full px-3 py-2 bg-bg border border-border rounded text-sm text-text focus:border-border-light focus:outline-none"
          />
          <div v-if="errors.baseUrl" class="error-text text-xs text-red-400 mt-1">{{ errors.baseUrl }}</div>
        </div>

        <!-- Form actions -->
        <div class="form-actions flex gap-2 justify-end">
          <button
            type="button"
            class="cancel-btn px-4 py-2 text-xs bg-bg border border-border hover:border-border-light rounded text-text cursor-pointer transition-all duration-fast"
            @click="$emit('cancel')"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="submit-btn px-4 py-2 text-xs bg-accent hover:bg-accent-light rounded text-white cursor-pointer transition-all duration-fast"
            :disabled="saving"
          >
            {{ saving ? 'Saving...' : 'Save' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  isOpen: boolean
  saving?: boolean
  existingProviders?: string[]
}>()

const emit = defineEmits<{
  save: [config: { name: string; apiKey: string; baseUrl?: string }]
  cancel: []
}>()

const form = ref({
  name: '',
  apiKey: '',
  baseUrl: ''
})

const errors = ref({
  name: '',
  apiKey: '',
  baseUrl: ''
})

const showApiKey = ref(false)

function resetForm() {
  form.value = { name: '', apiKey: '', baseUrl: '' }
  errors.value = { name: '', apiKey: '', baseUrl: '' }
  showApiKey.value = false
}

function validateForm(): boolean {
  errors.value = { name: '', apiKey: '', baseUrl: '' }

  if (!form.value.name.trim()) {
    errors.value.name = 'Provider name is required'
    return false
  }

  if (props.existingProviders?.includes(form.value.name.trim())) {
    errors.value.name = `Provider '${form.value.name}' already exists`
    return false
  }

  if (!form.value.apiKey.trim()) {
    errors.value.apiKey = 'API key is required'
    return false
  }

  if (form.value.baseUrl && !form.value.baseUrl.startsWith('http')) {
    errors.value.baseUrl = 'Base URL must start with http:// or https://'
    return false
  }

  return true
}

function handleSubmit() {
  if (!validateForm()) return

  emit('save', {
    name: form.value.name.trim(),
    apiKey: form.value.apiKey.trim(),
    baseUrl: form.value.baseUrl?.trim() || undefined
  })
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
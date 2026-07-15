<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useQuestionStore } from '@/stores/question'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { QuestionInfo, QuestionOption } from '@/stores/streaming/types'

const questionStore = useQuestionStore()

const tab = ref<number | 'confirm'>(0)
const answers = ref<string[][]>([])
const customInput = ref('')
const editingCustom = ref(false)
const submitting = ref(false)

const current = computed(() => questionStore.current)

const isMulti = computed(() => {
  return current.value && current.value.questions.length > 1
})

const currentQuestion = computed(() => {
  if (!current.value) return null
  if (isMulti.value && typeof tab.value === 'number') {
    return current.value.questions[tab.value] ?? null
  }
  return current.value.questions[0] ?? null
})

const currentTabIndex = computed(() => {
  return isMulti.value && typeof tab.value === 'number' ? tab.value : 0
})

const allowCustom = computed(() => {
  return currentQuestion.value?.custom !== false
})

watch(current, (newVal) => {
  if (newVal) {
    tab.value = 0
    answers.value = newVal.questions.map(() => [])
    customInput.value = ''
    editingCustom.value = false
    submitting.value = false
  }
})

function handleOptionClick(q: QuestionInfo, option: QuestionOption, qIndex: number) {
  if (q.multiple) {
    const cur = answers.value[qIndex] ?? []
    const idx = cur.indexOf(option.label)
    if (idx === -1) {
      answers.value[qIndex] = [...cur, option.label]
    } else {
      answers.value[qIndex] = cur.filter((_, i) => i !== idx)
    }
  } else {
    answers.value[qIndex] = [option.label]
    editingCustom.value = false
    customInput.value = ''

    if (!isMulti.value) {
      submitAnswer()
    } else {
      tab.value = Math.min((tab.value as number) + 1, current.value!.questions.length)
    }
  }
}

function isSelected(qIndex: number, option: QuestionOption): boolean {
  return answers.value[qIndex]?.includes(option.label) ?? false
}

function selectCustom() {
  if (!allowCustom.value) return
  editingCustom.value = true
}

function saveCustom() {
  const qIndex = currentTabIndex.value
  const value = customInput.value.trim()
  if (!value) {
    editingCustom.value = false
    return
  }
  const q = currentQuestion.value
  if (!q) return
  if (q.multiple) {
    const cur = answers.value[qIndex] ?? []
    answers.value[qIndex] = [...cur, value]
  } else {
    answers.value[qIndex] = [value]
    if (!isMulti.value && current.value) {
      submitAnswer()
      return
    }
    tab.value = Math.min((tab.value as number) + 1, current.value!.questions.length)
  }
  editingCustom.value = false
}

async function submitAnswer() {
  if (!current.value || submitting.value) return
  submitting.value = true
  try {
    await questionStore.reply(answers.value)
  } finally {
    submitting.value = false
  }
}

async function handleReject() {
  if (!current.value || submitting.value) return
  submitting.value = true
  try {
    await questionStore.reject()
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div v-if="current" class="pt-0 pb-6 mx-6">
    <div class="max-w-chat-max mx-auto">
      <div class="question-panel bg-bg-elevated border border-border rounded-lg shadow-lg">

        <!-- Tabs for multi-question -->
        <div v-if="isMulti" class="question-tabs border-b border-border">
          <div class="tabs-header flex items-center gap-1 px-2 py-1 overflow-x-auto">
            <button
              v-for="(q, i) in current.questions"
              :key="i"
              :class="cn(
                'tab-trigger px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap',
                tab === i ? 'bg-bg-hover text-text' : 'text-text-muted hover:text-text'
              )"
              @click="tab = i"
            >
              {{ q.header }}
              <span v-if="answers[i]?.length" class="ml-1 text-accent">✓</span>
            </button>
            <button
              :class="cn(
                'tab-trigger px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap',
                tab === 'confirm' ? 'bg-accent text-white' : 'text-text-muted hover:text-text'
              )"
              @click="tab = 'confirm'"
            >
              Confirm
            </button>
          </div>
        </div>

        <!-- Confirm page -->
        <div v-if="tab === 'confirm' && isMulti" class="confirm-page p-4">
          <h3 class="text-lg font-semibold text-text mb-4">Review Answers</h3>
          <div class="space-y-3">
            <div
              v-for="(q, i) in current.questions"
              :key="i"
              class="answer-review p-3 bg-bg rounded border border-border/50"
            >
              <div class="text-xs text-text-muted mb-1">{{ q.header }}</div>
              <div class="text-sm text-text">{{ answers[i]?.join(', ') || 'Not answered' }}</div>
            </div>
          </div>
        </div>

        <!-- Question content -->
        <div v-else-if="currentQuestion" class="question-content p-4">
          <h3 class="question-text text-lg font-medium text-text mb-4">
            {{ currentQuestion.question }}
          </h3>

          <div v-if="currentQuestion.multiple" class="multiple-hint text-xs text-text-muted mb-3">
            Select all that apply
          </div>

          <div class="options space-y-2">
            <button
              v-for="(option, oi) in currentQuestion.options"
              :key="oi"
              :class="cn(
                'option-btn w-full text-left px-4 py-3 rounded-lg border transition-all',
                isSelected(currentTabIndex, option)
                  ? 'bg-accent/10 border-accent text-text'
                  : 'bg-bg border-border hover:border-border-light hover:bg-bg-hover text-text'
              )"
              :disabled="submitting"
              @click="handleOptionClick(currentQuestion!, option, currentTabIndex)"
            >
              <div class="flex items-center gap-2">
                <span :class="cn(
                  'w-4 h-4 rounded border flex items-center justify-center text-xs',
                  isSelected(currentTabIndex, option) ? 'border-accent bg-accent text-white' : 'border-border-muted'
                )">
                  {{ currentQuestion.multiple ? (isSelected(currentTabIndex, option) ? '✓' : '') : (oi + 1) }}
                </span>
                <span class="font-medium">{{ option.label }}</span>
              </div>
              <div v-if="option.description" class="text-sm text-text-muted mt-1 ml-6">
                {{ option.description }}
              </div>
            </button>

            <!-- Custom answer option -->
            <div v-if="allowCustom" class="custom-option">
              <button
                v-if="!editingCustom"
                :class="cn(
                  'option-btn w-full text-left px-4 py-3 rounded-lg border transition-all bg-bg border-border hover:border-border-light hover:bg-bg-hover text-text'
                )"
                :disabled="submitting"
                @click="selectCustom"
              >
                <div class="flex items-center gap-2">
                  <span class="w-4 h-4 rounded border border-border-muted flex items-center justify-center text-xs">
                    {{ currentQuestion?.options.length + 1 }}
                  </span>
                  <span class="font-medium">Type your own answer</span>
                </div>
              </button>

              <div v-else class="custom-input-wrapper px-4 py-3 border border-border rounded-lg bg-bg">
                <input
                  v-model="customInput"
                  type="text"
                  class="w-full bg-transparent border-none outline-none text-text placeholder-text-muted"
                  placeholder="Type your answer..."
                  autofocus
                  @keyup.enter="saveCustom"
                  @keyup.escape="editingCustom = false"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Actions - always show Dismiss -->
        <div class="actions flex items-center justify-end gap-2 p-4 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            :disabled="submitting"
            @click="handleReject"
          >
            Dismiss
          </Button>
          <Button
            v-if="isMulti"
            variant="default"
            size="sm"
            :disabled="submitting"
            @click="submitAnswer"
          >
            {{ submitting ? 'Submitting...' : 'Submit' }}
          </Button>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useQuestionStore } from '@/stores/question'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { QuestionOption } from '@/stores/streaming/types'

const questionStore = useQuestionStore()

const tab = ref(0)
const answers = ref<string[][]>([])
const customText = ref<string[]>([])
const selected = ref(0)
const editing = ref(false)
const submitting = ref(false)

const current = computed(() => questionStore.current)

const isSingle = computed(() => {
  if (!current.value) return true
  return current.value.questions.length === 1
    && !current.value.questions[0]?.multiple
})

const isConfirm = computed(() => {
  if (!current.value) return false
  return !isSingle.value && tab.value === current.value.questions.length
})

const currentQuestion = computed(() => {
  if (!current.value || isConfirm.value) return null
  return current.value.questions[tab.value] ?? null
})

const allowCustom = computed(() => {
  return currentQuestion.value?.custom !== false
})

const currentAnswers = computed(() => {
  return answers.value[tab.value] ?? []
})

const customValue = computed(() => {
  return customText.value[tab.value] ?? ''
})

// is "Type your own answer" highlighted
const isOther = computed(() => {
  if (!currentQuestion.value || !allowCustom.value) return false
  return selected.value === currentQuestion.value.options.length
})

const isPicked = computed(() => {
  const val = customValue.value
  return val && currentAnswers.value.includes(val)
})

// Set answers for a specific tab (creates new array for Vue reactivity)
function setAnswers(idx: number, list: string[]) {
  const a = [...answers.value]
  a[idx] = list
  answers.value = a
}

function setCustom(idx: number, text: string) {
  const c = [...customText.value]
  c[idx] = text
  customText.value = c
}

watch(current, (newVal) => {
  if (newVal) {
    tab.value = 0
    answers.value = newVal.questions.map(() => [])
    customText.value = newVal.questions.map(() => '')
    selected.value = 0
    editing.value = false
    submitting.value = false
  }
})

function toggleOption(label: string) {
  const cur = [...currentAnswers.value]
  const idx = cur.indexOf(label)
  if (idx === -1) {
    setAnswers(tab.value, [...cur, label])
  } else {
    setAnswers(tab.value, cur.filter((_, i) => i !== idx))
  }
}

function pickOption(label: string, asCustom = false) {
  setAnswers(tab.value, [label])
  if (asCustom) {
    setCustom(tab.value, label)
  }
  editing.value = false
  if (isSingle.value) {
    submitAnswer()
  } else {
    tab.value = tab.value + 1
  }
}

function choose(index: number) {
  const q = currentQuestion.value
  if (!q) return

  // "Type your own answer"
  if (allowCustom.value && index === q.options.length) {
    if (!q.multiple) {
      editing.value = true
      return
    }
    if (isPicked.value) {
      toggleOption(customValue.value)
      return
    }
    editing.value = true
    return
  }

  const option = q.options[index]
  if (!option) return

  if (q.multiple) {
    toggleOption(option.label)
  } else {
    pickOption(option.label)
  }
}

function saveCustom() {
  const val = customValue.value.trim()
  const q = currentQuestion.value
  if (!q) return

  if (!val) {
    const prev = customText.value[tab.value]
    if (prev) {
      setCustom(tab.value, '')
      setAnswers(tab.value, currentAnswers.value.filter(v => v !== prev))
    }
    editing.value = false
    return
  }

  if (q.multiple) {
    const prev = customText.value[tab.value]
    const cur = [...currentAnswers.value]
    if (prev) {
      const idx = cur.indexOf(prev)
      if (idx !== -1) cur.splice(idx, 1)
    }
    if (!cur.includes(val)) cur.push(val)
    setCustom(tab.value, val)
    setAnswers(tab.value, cur)
    editing.value = false
    return
  }

  pickOption(val, true)
}

function cancelCustom() {
  editing.value = false
}

async function submitAnswer() {
  if (!current.value || submitting.value) return
  submitting.value = true
  try {
    const all = current.value.questions.map((_, i) => answers.value[i] ?? [])
    await questionStore.reply(all)
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
        <div v-if="!isSingle" class="question-tabs border-b border-border">
          <div class="flex items-center gap-1 px-2 py-1 overflow-x-auto">
            <button
              v-for="(q, i) in current.questions"
              :key="i"
              :class="cn(
                'px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap',
                tab === i ? 'bg-bg-hover text-text' : 'text-text-muted hover:text-text'
              )"
              @click="tab = i"
            >
              {{ q.header }}
              <span v-if="answers[i]?.length" class="ml-1 text-success">✓</span>
            </button>
            <button
              :class="cn(
                'px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap',
                isConfirm ? 'bg-accent text-white' : 'text-text-muted hover:text-text'
              )"
              @click="tab = current.questions.length"
            >
              Confirm
            </button>
          </div>
        </div>

        <!-- Confirm page -->
        <div v-if="isConfirm" class="p-4">
          <h3 class="text-base font-semibold text-text mb-3">Review</h3>
          <div class="space-y-2">
            <div
              v-for="(q, i) in current.questions"
              :key="i"
              class="p-3 bg-bg rounded border border-border/50"
            >
              <div class="text-xs text-text-muted mb-1">{{ q.header }}:</div>
              <div :class="answers[i]?.length ? 'text-sm text-text' : 'text-sm text-error'">
                {{ answers[i]?.join(', ') || '(not answered)' }}
              </div>
            </div>
          </div>
        </div>

        <!-- Question content -->
        <div v-else-if="currentQuestion" class="p-4">
          <h3 class="text-sm text-text mb-4">
            {{ currentQuestion.question }}
            <span v-if="currentQuestion.multiple" class="text-xs text-text-muted">(select all that apply)</span>
          </h3>

          <div class="space-y-1.5">
            <!-- Options -->
            <div
              v-for="(option, oi) in currentQuestion.options"
              :key="oi"
              :class="cn(
                'w-full text-left px-3 py-2.5 rounded-lg border transition-colors cursor-pointer',
                selected === oi && !editing ? 'border-border-light bg-bg-hover' : 'border-transparent',
                currentAnswers.includes(option.label) ? 'border-accent bg-accent/10' : ''
              )"
              @mouseenter="selected = oi"
              @click="choose(oi)"
            >
              <div class="flex items-center gap-2.5">
                <span :class="cn(
                  'w-4 h-4 rounded-full border flex items-center justify-center text-xs shrink-0',
                  currentAnswers.includes(option.label) ? 'border-accent bg-accent text-white' : 'border-muted'
                )">
                  {{ currentAnswers.includes(option.label) ? '✓' : '' }}
                </span>
                <div>
                  <span class="font-medium text-text text-sm">{{ option.label }}</span>
                  <p v-if="option.description" class="text-xs text-text-muted mt-0.5">{{ option.description }}</p>
                </div>
              </div>
            </div>

            <!-- Custom answer option -->
            <template v-if="allowCustom">
              <!-- Not editing: show "Type your own answer" row -->
              <div
                v-if="!editing"
                :class="cn(
                  'w-full text-left px-3 py-2.5 rounded-lg border transition-colors cursor-pointer',
                  isOther ? 'border-border-light bg-bg-hover' : 'border-transparent',
                  isPicked ? 'border-accent bg-accent/10' : ''
                )"
                @mouseenter="selected = currentQuestion.options.length"
                @click="choose(currentQuestion.options.length)"
              >
                <div class="flex items-center gap-2.5">
                  <span :class="cn(
                    'w-4 h-4 rounded-full border flex items-center justify-center text-xs shrink-0',
                    isPicked ? 'border-accent bg-accent text-white' : 'border-muted'
                  )">
                    {{ isPicked ? '✓' : '' }}
                  </span>
                  <span class="text-sm text-text">Type your own answer</span>
                </div>
                <!-- Show saved custom value below -->
                <div v-if="currentAnswers.includes('') === false && customValue && !currentQuestion.multiple" class="ml-[26px] mt-1">
                  <span class="text-xs text-text-muted">{{ customValue }}</span>
                </div>
              </div>

              <!-- Editing mode: show text input -->
              <div
                v-if="editing"
                class="ml-[26px] px-3 py-2.5 border border-accent rounded-lg bg-bg-hover"
              >
                <input
                  v-model="customText[tab]"
                  type="text"
                  class="w-full bg-transparent border-none outline-none text-sm text-text placeholder-text-muted"
                  :placeholder="'Type your answer...'"
                  autofocus
                  @keyup.enter="saveCustom"
                  @keyup.escape="cancelCustom"
                />
                <div class="flex items-center justify-between mt-1.5">
                  <span class="text-xs text-text-muted">Enter to save, Esc to cancel</span>
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-end gap-2 p-3 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            :disabled="submitting"
            @click="handleReject"
          >
            Dismiss
          </Button>
          <Button
            v-if="!isSingle && isConfirm"
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

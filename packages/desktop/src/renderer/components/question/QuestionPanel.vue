<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useQuestionStore } from '@/stores/question'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { QuestionInfo, QuestionOption } from '@/stores/streaming/types'

const questionStore = useQuestionStore()

const tab = ref<number | 'confirm'>(0)
const answers = ref<Map<number, string[]>>(new Map())
const selected = ref<Set<string>>(new Set())
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

const currentAnswers = computed(() => {
  if (!current.value) return []
  return current.value.questions.map((q, i) => answers.value.get(i) ?? [])
})

const hasAllAnswers = computed(() => {
  if (!current.value) return false
  return current.value.questions.every((_, i) => {
    const ans = answers.value.get(i)
    return ans && ans.length > 0
  })
})

watch(current, (newVal) => {
  if (newVal) {
    tab.value = 0
    answers.value = new Map()
    selected.value = new Set()
    submitting.value = false
  }
})

function handleOptionClick(q: QuestionInfo, option: QuestionOption, qIndex: number) {
  const key = `${qIndex}:${option.label}`
  
  if (q.multiple) {
    if (selected.value.has(key)) {
      selected.value.delete(key)
      const currentAns = answers.value.get(qIndex) ?? []
      answers.value.set(qIndex, currentAns.filter(a => a !== option.label))
    } else {
      selected.value.add(key)
      const currentAns = answers.value.get(qIndex) ?? []
      answers.value.set(qIndex, [...currentAns, option.label])
    }
  } else {
    selected.value.forEach(k => {
      if (k.startsWith(`${qIndex}:`)) selected.value.delete(k)
    })
    selected.value.add(key)
    answers.value.set(qIndex, [option.label])
  }
  
  if (!isMulti.value && current.value) {
    submitAnswer()
  }
}

function isSelected(qIndex: number, option: QuestionOption): boolean {
  return selected.value.has(`${qIndex}:${option.label}`)
}

async function submitAnswer() {
  if (!current.value || submitting.value) return
  
  submitting.value = true
  try {
    const answerArray = currentAnswers.value
    await questionStore.reply(answerArray)
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
        </button>
        <button
          :class="cn(
            'tab-trigger px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
            tab === 'confirm' ? 'bg-accent/20 text-accent' : 'text-text-muted hover:text-text'
          )"
          :disabled="!hasAllAnswers"
          @click="tab = 'confirm'"
        >
          Confirm
        </button>
      </div>
    </div>
    
    <div v-if="tab === 'confirm' && isMulti" class="confirm-page p-4">
      <h3 class="text-lg font-semibold text-text mb-4">Review Answers</h3>
      <div class="space-y-3">
        <div
          v-for="(q, i) in current.questions"
          :key="i"
          class="answer-review p-3 bg-bg rounded border border-border/50"
        >
          <div class="text-xs text-text-muted mb-1">{{ q.header }}</div>
          <div class="text-sm text-text">{{ currentAnswers[i].join(', ') || 'Not answered' }}</div>
        </div>
      </div>
    </div>
    
    <div v-else-if="currentQuestion" class="question-content p-4">
      <h3 class="question-text text-lg font-medium text-text mb-4">
        {{ currentQuestion.question }}
      </h3>
      
      <div v-if="currentQuestion.multiple" class="multiple-hint text-xs text-text-muted mb-3">
        Select multiple options
      </div>
      
      <div class="options space-y-2">
        <button
          v-for="(option, oi) in currentQuestion.options"
          :key="oi"
          :class="cn(
            'option-btn w-full text-left px-4 py-3 rounded-lg border transition-all',
            isSelected(isMulti && typeof tab === 'number' ? tab : 0, option)
              ? 'bg-accent/10 border-accent text-text'
              : 'bg-bg border-border hover:border-border-light hover:bg-bg-hover text-text'
          )"
          @click="handleOptionClick(currentQuestion!, option, isMulti && typeof tab === 'number' ? tab : 0)"
        >
          <div class="option-label font-medium">{{ option.label }}</div>
          <div v-if="option.description" class="option-desc text-sm text-text-muted mt-0.5">
            {{ option.description }}
          </div>
        </button>
      </div>
    </div>
    
    <div v-if="isMulti && tab === 'confirm'" class="actions flex items-center justify-end gap-2 p-4 border-t border-border">
      <Button
        variant="outline"
        size="sm"
        :disabled="submitting"
        @click="handleReject"
      >
        Dismiss
      </Button>
      <Button
        variant="default"
        size="sm"
        :disabled="submitting || !hasAllAnswers"
        @click="submitAnswer"
      >
        {{ submitting ? 'Submitting...' : 'Submit' }}
      </Button>
    </div>
    
    <div v-else-if="!isMulti" class="actions flex items-center justify-end gap-2 p-4 border-t border-border">
      <Button
        variant="outline"
        size="sm"
        :disabled="submitting"
        @click="handleReject"
      >
        Dismiss
      </Button>
    </div>
      </div>
    </div>
  </div>
</template>
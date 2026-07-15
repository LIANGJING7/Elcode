<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, toRaw } from 'vue'
import { useQuestionStore } from '@/stores/question'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { QuestionInfo, QuestionOption } from '@/stores/streaming/types'

const questionStore = useQuestionStore()

const tab = ref<number | 'confirm'>(0)
const answers = ref<Map<number, string[]>>(new Map())
const submitting = ref(false)
const focusedIndex = ref(-1)

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

const hasCurrentAnswer = computed(() => {
  if (!current.value) return false
  const qIndex = isMulti.value && typeof tab.value === 'number' ? tab.value : 0
  const ans = answers.value.get(qIndex)
  return ans && ans.length > 0
})

watch(current, (newVal) => {
  if (newVal) {
    tab.value = 0
    answers.value = new Map()
    submitting.value = false
    focusedIndex.value = -1
  }
})

watch(tab, () => {
  focusedIndex.value = -1
})

function goToNext() {
  if (!current.value) return
  if (!isMulti.value) {
    if (hasCurrentAnswer.value) submitAnswer()
    return
  }
  if (typeof tab.value === 'number') {
    if (tab.value < current.value.questions.length - 1) {
      tab.value++
    } else {
      tab.value = 'confirm'
    }
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (!current.value) return
  
  if (e.key === 'ArrowLeft' && isMulti.value) {
    e.preventDefault()
    if (tab.value === 'confirm') {
      tab.value = current.value.questions.length - 1
    } else if (typeof tab.value === 'number' && tab.value > 0) {
      tab.value--
    }
    return
  }
  
  if (e.key === 'ArrowRight' && isMulti.value) {
    e.preventDefault()
    if (typeof tab.value === 'number') {
      if (tab.value < current.value.questions.length - 1) {
        tab.value++
      } else if (hasAllAnswers.value) {
        tab.value = 'confirm'
      }
    }
    return
  }
  
  if (tab.value === 'confirm') {
    if (e.key === 'Enter' && hasAllAnswers.value && !submitting.value) {
      submitAnswer()
    }
    return
  }
  
  if (!currentQuestion.value) return
  
  const options = currentQuestion.value.options
  const qIndex = isMulti.value && typeof tab.value === 'number' ? tab.value : 0
  
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (focusedIndex.value < 0) {
      focusedIndex.value = 0
    } else if (focusedIndex.value < options.length - 1) {
      focusedIndex.value++
    }
    if (!currentQuestion.value.multiple) {
      selectOption(currentQuestion.value, options[focusedIndex.value], qIndex)
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (focusedIndex.value < 0) {
      focusedIndex.value = 0
    } else if (focusedIndex.value > 0) {
      focusedIndex.value--
    }
    if (!currentQuestion.value.multiple) {
      selectOption(currentQuestion.value, options[focusedIndex.value], qIndex)
    }
  } else if (e.key === ' ' && currentQuestion.value.multiple && focusedIndex.value >= 0) {
    e.preventDefault()
    selectOption(currentQuestion.value, options[focusedIndex.value], qIndex)
  } else if (e.key === 'Enter' && hasCurrentAnswer.value && !submitting.value) {
    goToNext()
  }
}

function selectOption(q: QuestionInfo, option: QuestionOption, qIndex: number) {
  const currentAns = answers.value.get(qIndex) ?? []
  
  if (q.multiple) {
    if (currentAns.includes(option.label)) {
      answers.value.set(qIndex, currentAns.filter(a => a !== option.label))
    } else {
      answers.value.set(qIndex, [...currentAns, option.label])
    }
  } else {
    answers.value.set(qIndex, [option.label])
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

function handleOptionClick(q: QuestionInfo, option: QuestionOption, qIndex: number, index: number) {
  selectOption(q, option, qIndex)
}

function isSelected(qIndex: number, option: QuestionOption): boolean {
  const ans = answers.value.get(qIndex)
  return ans ? ans.includes(option.label) : false
}

async function submitAnswer() {
  if (!current.value || submitting.value) return
  
  submitting.value = true
  try {
    const answerArray = currentAnswers.value.map(arr => toRaw(arr))
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

function handleBlur(e: MouseEvent) {
  (e.target as HTMLElement).blur()
}
</script>

<template>
  <div v-if="current" class="question-panel bg-bg-elevated border border-border rounded-lg shadow-lg">
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
        可选择多个选项
      </div>
      
      <div class="options space-y-2">
        <button
          v-for="(option, oi) in currentQuestion.options"
          :key="oi"
          :class="cn(
            'option-btn w-full text-left px-4 py-3 rounded-lg border transition-all',
            isSelected(isMulti && typeof tab === 'number' ? tab : 0, option)
              ? 'bg-accent/10 border-accent text-text'
              : focusedIndex >= 0 && focusedIndex === oi
                ? 'bg-bg-hover border-border-light text-text'
                : 'bg-bg border-border hover:border-border-light hover:bg-bg-hover text-text'
          )"
          @click="handleOptionClick(currentQuestion!, option, isMulti && typeof tab === 'number' ? tab : 0, oi)"
        >
          <div class="option-label font-medium">{{ option.label }}</div>
          <div v-if="option.description" class="option-desc text-sm text-text-muted mt-0.5">
            {{ option.description }}
          </div>
        </button>
      </div>
    </div>
    
    <div class="actions flex items-center justify-between gap-2 p-4 border-t border-border">
      <Button
        variant="outline"
        size="sm"
        :disabled="submitting"
        @click="handleReject"
      >
        忽略
      </Button>
      <Button
        variant="default"
        size="sm"
        :disabled="submitting || !hasCurrentAnswer"
        @click="goToNext"
      >
        {{ submitting ? '提交中...' : (tab === 'confirm' || hasAllAnswers ? '提交' : '下一步') }}
      </Button>
    </div>
  </div>
</template>
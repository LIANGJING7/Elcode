import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useSessionStore } from './session'
import type { QuestionRequest } from './streaming/types'

export const useQuestionStore = defineStore('question', () => {
  const requests = ref<Map<string, QuestionRequest>>(new Map())
  const sessionStore = useSessionStore()
  
  const current = computed(() => {
    const sessionID = sessionStore.currentSessionId
    return sessionID ? requests.value.get(sessionID) ?? null : null
  })
  
  const hasPending = computed(() => current.value !== null)
  
  function addQuestion(request: QuestionRequest) {
    requests.value.set(request.sessionID, request)
  }
  
  function removeQuestion(sessionID: string, requestID: string) {
    const existing = requests.value.get(sessionID)
    if (existing?.id === requestID) {
      requests.value.delete(sessionID)
    }
  }
  
  async function reply(answers: string[][]) {
    const question = current.value
    if (!question) return
    await window.desktop.session.questionReply(question.id, answers)
    requests.value.delete(question.sessionID)
  }
  
  async function reject() {
    const question = current.value
    if (!question) return
    await window.desktop.session.questionReject(question.id)
    requests.value.delete(question.sessionID)
  }
  
  return {
    requests,
    current,
    hasPending,
    addQuestion,
    removeQuestion,
    reply,
    reject
  }
})
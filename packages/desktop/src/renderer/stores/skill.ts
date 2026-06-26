import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { SkillInfo } from '../../types/ipc'

/**
 * Skill store - Phase 5
 * Core provides only skill list endpoint; no create/update/toggle.
 * Desktop UI can only view skills; enable/disable is UI soft-block only.
 */
export const useSkillStore = defineStore('skill', () => {
  const skills = ref<SkillInfo[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function load(directory?: string) {
    loading.value = true
    error.value = null
    try {
      const list = await window.desktop.skill.list(directory)
      skills.value = list
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load skills'
      skills.value = []
    } finally {
      loading.value = false
    }
  }

  function clear() {
    skills.value = []
    error.value = null
  }

  return {
    skills,
    loading,
    error,
    load,
    clear
  }
})
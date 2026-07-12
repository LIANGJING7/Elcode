import { onMounted, onUnmounted } from 'vue'
import { useUiStore } from '../stores/ui'
import { useSessionStore } from '../stores/session'
import { useStreamingStore } from '../stores/streaming'

// 跨平台修饰键: Ctrl(Win/Linux) 与 Cmd(Mac) 都视为同一修饰键,
// 这样在桌面 Electron 应用里双侧键均能触发同一快捷键, 单测也无需 mock 平台。
const mod = (e: KeyboardEvent) => e.ctrlKey || e.metaKey

export function useGlobalShortcuts() {
  const ui = useUiStore()
  const session = useSessionStore()
  const streamingStore = useStreamingStore()

  const onKey = (e: KeyboardEvent) => {
    // Ctrl/Cmd+B — 切侧栏
    if (mod(e) && (e.key === 'b' || e.key === 'B')) {
      e.preventDefault()
      ui.toggleSidebar()
      return
    }

    // Esc — 中断流式生成
    if (e.key === 'Escape') {
      // 有活跃流 → 中断
      if (streamingStore.isCurrentStreaming.value) {
        e.preventDefault()
        console.log('[DEBUG useGlobalShortcuts] Esc pressed, calling interrupt')
        if (session.currentSessionId) {
          session.interrupt(session.currentSessionId)
        }
        return
      }
    }
  }

  onMounted(() => document.addEventListener('keydown', onKey))
  onUnmounted(() => document.removeEventListener('keydown', onKey))
}
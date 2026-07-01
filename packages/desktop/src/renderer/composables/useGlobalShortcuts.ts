import { onMounted, onUnmounted } from 'vue'
import { useUiStore } from '../stores/ui'

// Note: streamStore would need repo injection from main.ts (Task 3.7).
// For now, import conditionally to avoid breaking tests.
let useStreamStore: (() => { activeRun: { value: string | null }; interrupt: () => Promise<void> }) | null = null
try {
  // Dynamic import would fail in tests; use conditional require pattern
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  useStreamStore = require('../stores/stream').useStreamStore
} catch {
  // Tests don't need stream interrupt
}

// 跨平台修饰键: Ctrl(Win/Linux) 与 Cmd(Mac) 都视为同一修饰键,
// 这样在桌面 Electron 应用里双侧键均能触发同一快捷键, 单测也无需 mock 平台。
const mod = (e: KeyboardEvent) => e.ctrlKey || e.metaKey

export function useGlobalShortcuts() {
  const ui = useUiStore()
  const stream = useStreamStore?.()

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
      if (stream?.activeRun?.value) {
        e.preventDefault()
        stream.interrupt()
        return
      }
    }
  }

  onMounted(() => document.addEventListener('keydown', onKey))
  onUnmounted(() => document.removeEventListener('keydown', onKey))
}